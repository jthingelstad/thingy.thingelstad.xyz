# Thingy’s character home

The source of Thingy, Jamie's agent sidekick: his persona, his 3D model, his faces
and accessories, and the code to show him. Every place he appears, starting with
[Ask Thingy](https://thingy.thingelstad.com/), takes him from here. It lives at
**https://thingy.thingelstad.xyz/**. This repository builds the static site and
publishes it to AWS from `main` (see [Hosting](#hosting)).

The viewer loads real, skinned GLB meshes derived from the approved Blender
master. It supports four scenes with their accessories, four poses, orbit and keyboard camera controls,
an antenna-light switch, and opt-in animation. Reduced-motion preferences keep
the poses still. A transparent render remains available if WebGL or model loading
fails. The only third-party request is Tinylytics page counting, in the published
build only (see [Analytics](#analytics)).

## Run it

Use Node 24 (`.nvmrc`).

```sh
npm ci
npm run dev
```

The development address is `http://127.0.0.1:4321`. `npm run build` produces
`dist/`; `npm run preview` serves it. `npm run check` checks TypeScript, the
delivery contract, the production build, GLB validation and asset budgets.
`npm run test:browser` exercises desktop and phone views in isolated Chromium.
It takes minutes on CI, so it runs only when a change needs it, with
`gh workflow run check.yml --ref <branch>`. The other checks run on every pull
request and on `main`, and a merge is live in about two minutes.
Install the matching Chromium once with `npx playwright install chromium`.

## Bring Thingy into another project

[**Thingy Kit**](https://thingy.thingelstad.xyz/kit/) is the one link to send, to a
person or an agent: his persona, the stills, the iframe, the web component with
every attribute, event and method, the model's structure, and how to follow the
newest Thingy or keep one for good. [`kit/KIT.md`](kit/KIT.md) is its one source,
published as `/kit/` and `/kit.md`, and `llms.txt` opens with it. The contract tests
fail if it stops naming a scene, pose, face, accessory, attribute or event, and the
site check fails if it or `llms.txt` names a file that was not built.

[`kit/surfaces.json`](kit/surfaces.json) lists every place he appears. A new model
must publish every still named there, or the contract tests fail. A change to the
persona opens an issue listing the words each surface keeps of its own to reread
(`tools/persona-rollout.mjs`). That workflow has not run yet, since the persona has
not changed since it was added.

Things I've Built uses smaller vendored copies of the stills: hello on its index,
present on About, thinking on Search, and rest on its 404 page.

## Stable asset addresses

`public/character/v0.17/manifest.json` is the delivery contract. Scene IDs are
`library`, `outdoors`, `workshop`, `concert`, `kitchen`, `winter`, and `cabin`. Pose IDs are `hello`, `present`,
`thinking`, and `rest`. `light` and `motion` accept `on` or `off`.

Each scene loads separately, about 2–3 MB. The shared rig has 40 joints. Meshopt
compresses geometry and animation; WebP compresses the PBR texture atlas. Each
accessory is a separate skinned node, `Thingy_Accessory_<id>`, so the runtime can
show or hide it. The beacon keeps a separately named material. A future incompatible revision
gets a new directory instead of replacing these addresses.

**The newest model has one address that never changes:**
`https://thingy.thingelstad.xyz/character/latest/` is a copy of the newest version's
directory, made at build time: `latest/<scene>.glb`, `latest/manifest.json` and
`latest/poses/<scene>-<pose>.webp`. It is cached for five minutes, not a day, and
holds what the newest version holds. Use it to follow the model; use a numbered
directory to keep one picture for good.

The screen is a separate skinned node,
`Thingy_Screen`, lit by one cell of an atlas: material `Thingy_Face`, emissive map,
4 columns by 5 rows. `faces.webp` is that atlas, small, for a page offering the
faces. The Workshop's tools have clips named `<tool>-<pose>`. The Library's `stills`
add the pose-face pairs Ask Thingy's pages show, such as
`library-rest-delighted.webp`.

**To add a scene:** add it to `SCENES` in `src/config.ts`, with its slots of
accessories, and to the manifest, and publish its model and `present` still. The
stage, the frame and the component offer whatever `SCENES` says; nothing else
changes. The contract tests hold the two together.

`v0.10` and `v0.14` keep their files, under the outfit names they were made with, but
the component only draws the versions in `VERSIONS`.

## Rebuild v0.17

v0.17 adds things to have with him (book, mug, microphone, baton, camera, helmet, scarf,
candle, tongs, whisk, grill) and three scenes (Kitchen, Winter, Cabin). The things are
plain parts outside the atlas, so the four older scenes reuse their bakes: copy v0.16's
`workshop` and `concert`, v0.15's `outdoors` and v0.14's `librarian` as `library` into
`local-only/bakes/v0.17/`, and run the export with `--reuse-bakes`. The new scenes bake
in full, one at a time; three at once runs Metal out of memory.

```sh
blender --background \
  ../thingy-character/source/Thingy-wardrobe-v0.17.blend \
  --python-exit-code 1 --python tools/export_character_v017.py -- --scene kitchen
node tools/optimize-v017.mjs kitchen
node tools/capture-poster-v017.mjs kitchen
```

## Rebuild the v0.16 Workshop

v0.16 changes the Workshop and Concert. In the Workshop, `show` sits in front of him,
the screwdriver has a new `work`, the laptop has a `work` whose new bone turns it in
his hand, and a build plate carries a small Thingy made from the delivery body itself.
In Concert he has an iPhone, to `check` or `hold` up. Its screen is a phone-width capture of the Thingy Model page on Things I've built, kept with the master. The plate and phone are plain
parts outside the atlas, so this reuses v0.15's bakes: copy
`local-only/bakes/v0.15/workshop` and `concert` to `local-only/bakes/v0.16/`, then run
the export once with `--scene workshop` and once with `--scene concert`:

```sh
blender --background \
  ../thingy-character/source/Thingy-wardrobe-v0.16.blend \
  --python-exit-code 1 --python tools/export_character_v016.py -- --scene workshop --reuse-bakes
node tools/optimize-v016.mjs
node tools/capture-poster-v016.mjs workshop/drill-show workshop/hammer-show \
  workshop/screwdriver-show workshop/screwdriver-work workshop/laptop-work \
  workshop/plate-carry workshop/plate-show
```

## Rebuild the v0.15 models

Blender 5.2 LTS, from the character-art repository's master:

```sh
blender --background \
  ../thingy-character/source/Thingy-wardrobe-v0.15.blend \
  --python-exit-code 1 --python tools/export_character_v015.py -- --scene workshop
node tools/optimize-v015.mjs workshop
```

It never saves the master. It bakes the full master on to a lighter body, so the
cloth reaches the browser as colour and normal maps, and takes the faces from the
master's atlas. Add `--reuse-bakes` after `--scene` to change the grade, materials or
actions in about 30 seconds instead of baking again for 15 minutes; the UV layout
repeats, so the saved maps still fit. `--reference-only` renders the master from the
component's camera, to compare a grade against. The stills in `poses/` are captures
of each model in the component from its default camera, so each matches its first
frame; `node tools/capture-poster-v015.mjs [scene ...]` makes them from a running
preview. Ask Thingy's pages load the Library's from `character/latest/`, so they
follow the model on their own. The Library has not changed since v0.14:
`node tools/optimize-v015.mjs library` takes the v0.14 file, with its name and
licence corrected and every other byte the same, and its stills are the same files.

## Rebuild the derivatives

The editable master is in the separate character-art repository, never in the
public tree here. Blender 4.5 LTS and Python with Pillow are needed to rebuild
assets; they are not needed to build or serve the site from committed assets.

```sh
THINGY_BLENDER=blender
for character_outfit in librarian trail workshop concert; do
  "$THINGY_BLENDER" --background \
    ../thingy-character/source/Thingy-wardrobe-v0.10.blend \
    --python-exit-code 1 --python tools/export_character.py -- \
    --outfit="$character_outfit"
done
npm run assets:prepare
```

The script never saves the master. It reduces dense delivery geometry, preserves
the original printed UVs, bakes color, roughness and normal maps into an atlas,
keeps the rig and four clips, and renders transparent poses. The new thinking
gesture is built in memory from the same skeleton. Raw bakes stay in ignored
`local-only/`. `prepare_stills.py` removes render metadata while preserving PNG
pixels. [glTF Transform](https://gltf-transform.dev/cli) compresses the GLBs.

The validator checks the delivered file structure and metadata, and checks the
uncompressed geometry too when local bakes are present. Khronos’s validator
reports Meshopt as an unsupported extension; browser tests separately exercise
its real decoder, every scene, and animated poses.

## Who Thingy is

[`persona/THINGY.md`](persona/THINGY.md) is Thingy's persona, approved by Jamie
on November 3, 2026: the authority for who he is, how he talks, where he works,
how he looks and how he sounds, wherever he appears. Change him there first,
then the surfaces (Ask Thingy, the Weekly Thing, Things I've built).
[`docs/persona-review-2026-11.md`](docs/persona-review-2026-11.md) records how it
was made.

The site publishes it twice from that one file: [/persona/](persona/index.html),
rendered at build time by a small Markdown renderer (`src/markdown.ts`, which
knows only what the file uses), and `/persona.md`, the file as is, for agents.
`validate-site.mjs` fails if either drifts from the source.

## His voice

Each scene has three lines he says, and a question for Ask Thingy, in
[`src/voice.ts`](src/voice.ts). Picking a scene or tapping him shows the next
line under him. Sound is off until the reader turns it on, from the More panel
or the speaker in the caption, so no recording loads before then. The antenna
lights while he speaks.

The lines were written for the home and recorded once, in the voice WT Builder
gives him everywhere (`nova`, `tts-1-hd`). Each recording in `public/voice/` is
named by WT Builder's piece key for the words it says, so a line changed without
a new recording fails `npm test`. To record, with a WT Builder checkout beside
this one (its own settings hold the key; nothing secret passes through here):

```sh
node --import tsx tools/render-voice.ts ../wt-builder
```

It records only lines that have no recording yet, hears each one back with the
transcriber, retries one that is silent or drops its last sentence, deletes
recordings no line uses, and rewrites `src/voice-files.ts`. If WT Builder's voice
changes, change `VOICE` to match and run it again: every line is recorded anew.

## The print model

[/print/](print/index.html) offers a 180 mm one-colour print of Thingy, made for
a Bambu Lab P2S. The
character-art repository builds it (`source/export_print_v013.py` there, from the
v0.13 master); this site only publishes it. `public/print/v0.13/` holds the 3MF as
built, the STL zipped beside a short read-me, web stills and a manifest with each
file's size and SHA-256:

```sh
uv run --python 3.12 --with pillow python tools/prepare_print.py ../thingy-character
```

The zip has fixed timestamps, so the same inputs give the same bytes, and
`validate-assets.mjs` checks every download against the manifest and a 25 MB
budget. Like the character, a published print version keeps its address; a new
print gets a new directory. Print files are cached for a day.

## Hosting

S3 and CloudFront in Jamie's AWS account (`<account>`, us-east-1), defined in
`infra/` and created with the `cloud-engineer` identity:

- **`thingy-xyz-site`** (`infra/site.json`): the private, versioned bucket; the
  certificate, validated through its own record in the thingelstad.xyz Route 53
  zone; the distribution; the A and AAAA alias records for the hostname; the
  viewer-request function (`/x/` serves `/x/index.html`, `/x` redirects to `/x/`);
  the access log `/thingy-xyz/web-access` (14 days, no client IP, no query string);
  no CloudWatch alarm (the 5xx alarm was retired 2026-11-03); and the
  CNAME Bing Webmaster Tools verifies the site by. This stack owns the site's DNS
  names: they are not in projects-sysadmin's zone stack.
- **`thingy-xyz-delivery`** (`infra/delivery.json`): the GitHub OIDC role the
  deploy job assumes. It trusts `main` of this repository only and can write
  objects and invalidate the distribution, nothing else.

`infra/deployment.json` records the live identifiers (created November 1, 2026):

| Resource      | Identifier                                        |
| ------------- | ------------------------------------------------- |
| Bucket        | `thingy-xyz-site-web-<account>`                   |
| Distribution  | `EUJA70DJHWN4` (`d36jfrqu1wwoe0.cloudfront.net`)  |
| Certificate   | `566cf451-ef24-4bfc-a180-b95b535b5b9a`            |
| Deploy role   | `thingy-xyz-delivery-DeploymentRole-fNa3LY9EijLE` |
| Access log    | `/thingy-xyz/web-access`                          |
| Tinylytics    | site 3849, in the thingelstad.com group           |
| Repo variable | `AWS_DEPLOY_ROLE_ARN`, the deploy role's ARN      |

Change infrastructure with
`npm run infra:plan` (prints the change sets) and `npm run infra:apply`, never
through the delivery role.

Every push to `main` that passes the checks deploys: the `Deploy` job builds with
analytics on, uploads `dist/` (assets before pages; nothing is ever deleted, so
older character versions and hashed bundles stay published), invalidates the
distribution, and compares the live bytes of `/`, `/embed/`, `/thingy.js` and
`/revision.json` with the build and checks a real 404.

What the edge promises, each held by `tests/delivery.test.ts`:

- No `X-Frame-Options`: `/embed/` is framed on other sites by design.
- `Access-Control-Allow-Origin: *` and `Cross-Origin-Resource-Policy: cross-origin`
  on every response, so other sites can load `thingy.js` and the character files.
- Missing paths return a real 404 with `404.html`, never an SPA fallback.
- Caching (`tools/delivery-plan.mjs`): hashed `assets/` and `voice/` a year,
  immutable;
  `thingy.js` and each `manifest.json` five minutes; other character files a day;
  pages, `llms.txt` and the sitemap revalidate every minute at the edge.
- Files are stored as built; CloudFront compresses per request.

### Launch verification, November 1, 2026

The first deploy (`a1240b4`, 42 files) was checked against the live site:

- All 42 published files match a deploy-equivalent build byte for byte (only
  `revision.json`'s `builtAt` differs), each with its expected `Content-Type`,
  `Access-Control-Allow-Origin: *`, `Cross-Origin-Resource-Policy: cross-origin`
  and no `X-Frame-Options`. Brotli is served on request.
- `/embed` redirects to `/embed/` keeping its query; `/no-such-page/` and a missing
  character file return 404 with the shelf page.
- In Chromium, every outfit in every pose (16 combinations) reached `data-ready`
  through `/embed/?outfit=…&pose=…` with no errors and no request to another
  host; the home page's wardrobe loaded all four outfits; and a page on another
  origin rendered both `<thingy-character>` from `thingy.js` and the iframe.
- The home page requests the Tinylytics script for this site; `/embed/` requests
  nothing outside this host.
- DNS answers from 1.1.1.1 and 9.9.9.9 (A and AAAA); the access log records
  requests without client IP or query string (the 5xx alarm it then checked was retired 2026-11-03).
- The sitemap is submitted to Google (through `sc-domain:thingelstad.xyz`) and
  Bing (verified site), and Tinylytics watches uptime.

## Search and machine-readable files

`robots.txt` allows everything and names `sitemap.xml`. The sitemap lists the
home page, the integration examples, the persona page and the print page, each with the date of the last commit
that changed it (`tools/write-site-files.mjs`), never the build time. `/embed/`
and the 404 page carry `noindex`. `llms.txt` describes the asset contract for
agents and names `/persona.md`. Google covers the site through the `sc-domain:thingelstad.xyz` property;
Bing tracks it as its own site. projects-sysadmin's `scripts/search-consoles`
reconciles both.

`favicon.svg` is the icon every page names first. `favicon.ico` and
`apple-touch-icon.png`, which browsers ask for by name, are drawn from it with
`node tools/render-icons.mjs`; run it again after changing the SVG.

## Analytics

Tinylytics site 3849 (`iJwbo9BJKkpgx7a9sZo1`), in the thingelstad.com group. The
script is injected only when the deploy job builds with `THINGY_TINYLYTICS=true`,
and loads only on thingy.thingelstad.xyz. It is Tinylytics' shared script,
`https://tinylytics.app/js/script.js` with `data-site="iJwbo9BJKkpgx7a9sZo1"`
and no query parameters; options live in the site's Tinylytics settings. Local, preview and test builds carry no
reference to tinylytics.app; `tools/validate-site.mjs` fails if one does. The
`/embed/` frame and `thingy.js` never count: they sit inside other sites' pages.

## Licence

[![CC BY-NC 4.0](public/shared/cc/by-nc.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

Thingy and everything in this repository are by Jamie Thingelstad and licensed
[CC BY-NC 4.0](LICENSE): the persona, the kit, the model, the stills, the print
files and the code. [NOTICE.md](NOTICE.md) lists the few parts with licences of
their own. Every page says so in its footer with the Creative Commons markup, and
`tools/validate-site.mjs` fails a page that doesn't. The Blender masters stay in a
separate private repository.
