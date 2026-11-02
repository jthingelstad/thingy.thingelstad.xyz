"""Strip renderer metadata and make alpha-preserving web thumbnails."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'public/character/v0.10/poses'
for path in root.glob('*.png'):
    with Image.open(path) as source:
        rgba = source.convert('RGBA')
        image = Image.frombytes('RGBA', rgba.size, rgba.tobytes())
    image.save(path, optimize=True)
    image.save(path.with_suffix('.webp'), quality=90, method=6)
    with Image.open(path) as clean:
        assert not clean.info
        assert clean.tobytes() == image.tobytes()
    print('Prepared', path.name)
