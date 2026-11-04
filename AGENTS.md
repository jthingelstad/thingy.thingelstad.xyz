# Thingy's character home

An independent static character viewer for `thingy.thingelstad.xyz`, paired with
the librarian at `https://thingy.thingelstad.com/`. Read the parent project guide.

- Use Node 24, TypeScript, Vite, and Three.js. This is a reusable web component,
  so consumers do not need a particular application framework.
- The approved Blender master lives in the sibling character-art repository:
  `../thingelstad.com/thingy-character/source/Thingy-wardrobe-v0.10.blend`, and
  `-v0.14.blend` for the newer Librarian. Never overwrite them. Export scripts
  operate in memory and write derivatives here.
- `persona/THINGY.md` is Thingy's persona and the authority for him on every
  surface (approved by Jamie, November 3, 2026). Edit it only on Jamie's word;
  `/persona/` and `/persona.md` are built from it.
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
  side, reads as a rude gesture. Check any page that lets people rotate him from every angle.
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
