# Thingy's character home

The source of Thingy's character, published as the static site
`thingy.thingelstad.xyz`: his persona, his model and the code to show him. Other
projects take him from here, starting with the librarian at
`https://thingy.thingelstad.com/`. Read the parent project guide.

- Use Node 24, TypeScript, Vite, and Three.js. This is a reusable web component,
  so consumers do not need a particular application framework.
- The approved Blender master lives in the sibling character-art repository:
  `../thingelstad.com/thingy-character/source/Thingy-wardrobe-v0.10.blend`, and
  `-v0.14.blend` for the newer Librarian. Never overwrite them. Export scripts
  operate in memory and write derivatives here.
- `persona/THINGY.md` is Thingy's persona and the authority for him on every
  surface (approved by Jamie, November 3, 2026). Edit it only on Jamie's word;
  `/persona/` and `/persona.md` are built from it.
- `kit/KIT.md` is the Thingy Kit, the one link to send anyone bringing him into a
  project, published as `/kit/` and `/kit.md`. Anything a consumer can use (an
  attribute, event, method, outfit, pose, face, tool or address) goes in it, and
  `llms.txt` stays an index that leads to it. It repeats persona lines but never
  defines him: `persona/THINGY.md` wins. `kit/surfaces.json` lists every place he
  appears: the stills each names, which a new model must publish, and the text each
  keeps, which a change to the persona opens as an issue to reread.
- `public/print/v0.13/` is published the same way: make it with
  `tools/prepare_print.py` from the character-art repository's print build,
  never by hand, and give a new print its own directory.
- `public/character/v0.10/` and `v0.14/` are the versioned delivery contract.
  Preserve published addresses and pose names. Add a new version for future
  incompatible changes. `thingy.thingelstad.com` loads the component with
  `version="latest"` and every page's still from `character/latest/` (2026-11-04),
  so `thingy.js` and those files are live for another site. A new version must
  publish every still that site names (`stills` in the manifest) or its pages lose
  a picture. The front page uses `hello` because the `present` hand, turned to his
  side, reads as a rude gesture. Check any page that lets people rotate him from
  every angle. Never remake `v0.14/librarian.glb` by accident: the other three
  outfits were exported later, by the same script. The viewer never offers the
  `off` face (the persona says it is never shown to a reader).
- Keep Blender masters, raw bakes, logs, caches, secrets, and machine paths out of
  public assets. Never read `.env*`. Inspect export metadata before publication.
- Respect reduced motion, provide still-image fallback, and dispose WebGL resources.
- Development and local previews are authorized. Hosting is `infra/` (README,
  Hosting): `main` deploys itself after the checks pass. Change infrastructure
  only through `npm run infra:plan` and `infra:apply` as `cloud-engineer`, never
  in ordinary edits. The site stack owns this hostname's DNS records. Its
  distribution uses the shared `edge` web ACL (projects-sysadmin `edge-waf`
  stack; rules count only until tuned).
- Run `npm run check` and the relevant browser checks. No live analytics in QA:
  Tinylytics is injected only by the deploy build (`THINGY_TINYLYTICS=true`).

## Browser tests

Run them only when a change needs them, on this Mac or in CI (Jamie, 2026-11-04).
A change needs them when it touches the stage, the component, the embed or a page's
layout at phone width. Use `gh workflow run check.yml --ref <branch>`, and say on
the pull request that they ran. Everything else in `npm run check` runs every time.
