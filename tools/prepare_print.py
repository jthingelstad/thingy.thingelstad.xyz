"""Publish a print version of Thingy from the character-art repository.

Reads the 3MF, STL and stills that thingy-character's print build made, and
writes public/print/<version>/: the 3MF as built, the STL in a zip beside a
short read-me, web stills without renderer metadata, and a manifest with
sizes and SHA-256 sums. The zip has fixed timestamps, so the same inputs
always give the same bytes.

uv run --python 3.12 --with pillow python tools/prepare_print.py [CHARACTER_REPO]
"""
import hashlib, json, subprocess, sys, zipfile
from pathlib import Path
from PIL import Image

VERSION = 'v0.13'
NAME = f'Thingy-librarian-180mm-{VERSION}'
SITE = Path(__file__).resolve().parents[1]
ART = Path(sys.argv[1]) if len(sys.argv) > 1 else SITE.parent / 'thingelstad.com' / 'thingy-character'
OUT = SITE / 'public' / 'print' / VERSION
OUT.mkdir(parents=True, exist_ok=True)

report = json.loads((ART / 'exports/print' / VERSION / 'geometry-report.json').read_text())
stl = (ART / 'exports/print' / VERSION / f'{NAME}.stl').read_bytes()
three_mf = (ART / 'exports/print' / VERSION / f'{NAME}.3mf').read_bytes()
assert stl[:80].startswith(b'Thingy v0.13 by Jamie Thingelstad. CC BY-NC 4.0.'), 'STL header'
assert three_mf[:2] == b'PK' and len(stl) == report['stl_bytes'], 'inputs match the build report'
assert report['components'] == 1 and report['nonmanifold_edges'] == 0, 'one watertight solid'

SETTINGS = {
    'printer': 'Bambu Lab P2S, 0.4 mm nozzle',
    'filament': 'Bambu PLA Basic, one colour',
    'process': '0.16mm High Quality @BBL P2S',
    'supports': 'On: tree (auto), organic style, from the plate and on the model',
    'infill': '12%',
    'walls': 3,
    'brim': 'Outer, 5 mm',
    'orientation': 'Upright on his base, as the file comes',
}
dims = report['dimensions_mm']
README = f"""Thingy, librarian, 180 mm ({VERSION})

Thingy in the pose of the original illustration, in his librarian coat and
with his original face, as one solid for printing in one colour. He stands
on his own oval base, {dims[0]:.0f} x {dims[1]:.0f} x {dims[2]:.0f} mm.

Made for a Bambu Lab P2S with a 0.4 mm nozzle:
""" + ''.join(f'  {k.capitalize()}: {v}\n' for k, v in SETTINGS.items()) + f"""
He has not been test-printed yet. Expect to check supports under the coat
hem and the head.

Thingy is by Jamie Thingelstad. This print model is licensed CC BY-NC 4.0:
print it, share it and change it, with credit, for non-commercial use.
https://creativecommons.org/licenses/by-nc/4.0/

https://thingy.thingelstad.xyz/print/
"""

files = {}
def keep(name, data):
    (OUT / name).write_bytes(data)
    files[name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

keep(f'{NAME}.3mf', three_mf)
zpath = OUT / f'{NAME}-stl.zip'
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for arcname, data in ((f'{NAME}.stl', stl), ('README.txt', README.encode())):
        info = zipfile.ZipInfo(arcname, date_time=(2026, 11, 3, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED; info.external_attr = 0o644 << 16
        z.writestr(info, data, compresslevel=9)
keep(zpath.name, zpath.read_bytes())

# Web stills: transparent WebP, no renderer text chunks. The front view also
# goes out as a PNG for link previews.
STILLS = {'front': 1000, 'three-quarter': 640, 'side': 640, 'back': 640, 'face': 1200}
stills = {}
for view, width in STILLS.items():
    with Image.open(ART / 'renders' / f'print-{VERSION}' / f'{view}.png') as source:
        rgba = source.convert('RGBA')
    image = Image.frombytes('RGBA', rgba.size, rgba.tobytes())
    image = image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
    path = OUT / f'{view}.webp'
    image.save(path, quality=86, method=6)
    stills[view] = {'webp': path.name, 'width': image.width, 'height': image.height}
    if view == 'front':
        og = image.resize((800, round(image.height * 800 / image.width)), Image.LANCZOS)
        og.save(OUT / 'front.png', optimize=True)
        with Image.open(OUT / 'front.png') as clean: assert not clean.info
        stills[view]['png'] = 'front.png'

manifest = {
    'name': f'Thingy, librarian, 180 mm ({VERSION})',
    'page': 'https://thingy.thingelstad.xyz/print/',
    'from': f'thingy-character {VERSION}, pose "Thingy v06 · Original", librarian outfit, original face',
    'license': {'name': 'CC BY-NC 4.0', 'url': 'https://creativecommons.org/licenses/by-nc/4.0/',
                'credit': 'Thingy by Jamie Thingelstad'},
    'test_printed': False,
    'solid': {'height_mm': report['height_mm'], 'dimensions_mm': dims, 'volume_cm3': report['volume_cm3'],
              'triangles': report['triangles'], 'components': report['components'],
              'nonmanifold_edges': report['nonmanifold_edges'], 'base_mm': report['base_mm']},
    'settings': SETTINGS,
    'files': files,
    'stills': stills,
}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
# The repository's format check runs Prettier over JSON too.
subprocess.run(['npx', 'prettier', '--write', str(OUT / 'manifest.json')], cwd=SITE, check=True, capture_output=True)
for name, f in files.items(): print(f'{name}: {f["bytes"] / 1e6:.1f} MB')
print('Prepared', OUT.relative_to(SITE))
