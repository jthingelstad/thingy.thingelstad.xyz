# Thingy’s character home

The interactive character companion to [Ask Thingy](https://thingy.thingelstad.com/).
It lives at **https://thingy.thingelstad.xyz/**. This repository builds the static
site and publishes it to AWS from `main` (see [Hosting](#hosting)).

The viewer loads real, skinned GLB meshes derived from the approved v0.10 Blender
master. It supports four outfits, four poses, orbit and keyboard camera controls,
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
Install the matching Chromium once with `npx playwright install chromium`.

## Bring Thingy into another project

### A quiet companion: an image

Use a transparent WebP at the size needed on the page. PNG versions are available
for downloads. Images need no renderer, JavaScript, or animation loop.

```html
<img
  src="https://thingy.thingelstad.xyz/character/v0.10/poses/workshop-thinking.webp"
  alt="Thingy, the Workshop Builder, thinking through a build"
  width="240"
  height="240"
/>
```

Workshop Builder has `hello`, `present`, `thinking`, and `rest` images. The
presenting pose has the laptop; the other three do not. The interactive pose
clips and images share the names in [the manifest](public/character/v0.10/manifest.json).
The integration examples at `/examples/workshop.html` show all four together.

Things I’ve Built uses smaller vendored copies of these images: hello on its
index, present on About, thinking on Search, and rest on its 404 page. That lets
the site use Thingy before this new hostname is published, and keeps ordinary
pages light.

### A character you can turn around: an iframe

```html
<iframe
  src="https://thingy.thingelstad.xyz/embed/?outfit=workshop&pose=present&light=off&motion=off"
  title="Thingy, Workshop Builder"
  width="360"
  height="400"
  loading="lazy"
  style="border:0;background:transparent"
></iframe>
```

The frame has a transparent background and no surrounding controls. Drag to
rotate; use the scroll wheel to zoom. The canvas also supports left/right arrows,
plus/minus, and Home. Motion defaults off and obeys reduced motion even when the
URL asks for it. The full character home has the wardrobe and pose controls.

### A component inside an application

```html
<script type="module" src="https://thingy.thingelstad.xyz/thingy.js"></script>
<thingy-character
  outfit="workshop"
  pose="thinking"
  light="off"
  motion="off"
  style="width:320px;height:380px"
></thingy-character>
```

This custom element works with plain HTML, Eleventy, React, or another framework.
Change the attributes to change the character. It emits `thingy-ready`,
`thingy-change`, and `thingy-fallback` events and exposes `resetView()`. An optional
`asset-base` attribute changes the delivery directory when self-hosting the files.
The default is the `character/` directory beside `thingy.js`.

The iframe is the simplest integration when the consuming site has a strict
content security policy. A native component needs its host allowed for module
and asset fetches, and Meshopt’s WebAssembly decoder needs the appropriate CSP
permission. Model files are standard glTF 2.0 and can also be loaded directly with
[Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader).

## Stable asset addresses

`public/character/v0.10/manifest.json` is the delivery contract. Outfit IDs are
`librarian`, `trail`, `workshop`, and `concert`. Pose IDs are `hello`, `present`,
`thinking`, and `rest`. `light` and `motion` accept `on` or `off`.

Each outfit loads separately, about 2–3 MB. The shared rig has 40 joints. Meshopt
compresses geometry and animation; WebP compresses the PBR texture atlas. The
laptop remains a separate skinned node so the runtime can hide it in other poses.
The beacon keeps a separately named material. A future incompatible revision
gets a new directory instead of replacing these addresses.

## Rebuild the derivatives

The editable master is in the separate character-art repository, never in the
public tree here. Blender 4.5 LTS and Python with Pillow are needed to rebuild
assets; they are not needed to build or serve the site from committed assets.

```sh
THINGY_BLENDER=blender
for character_outfit in librarian trail workshop concert; do
  "$THINGY_BLENDER" --background \
    ../thingelstad.com/thingy-character/source/Thingy-wardrobe-v0.10.blend \
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
its real decoder, every outfit, and animated poses.

## The print model

[/print/](print/index.html) offers a 180 mm one-colour print of Thingy, made for
a Bambu Lab P2S and licensed CC BY-NC 4.0 (Jamie, November 3, 2026). The
character-art repository builds it (`source/export_print_v013.py` there, from the
v0.13 master); this site only publishes it. `public/print/v0.13/` holds the 3MF as
built, the STL zipped beside a short read-me, web stills and a manifest with each
file's size and SHA-256:

```sh
uv run --python 3.12 --with pillow python tools/prepare_print.py ../thingelstad.com/thingy-character
```

The zip has fixed timestamps, so the same inputs give the same bytes, and
`validate-assets.mjs` checks every download against the manifest and a 25 MB
budget. Like the character, a published print version keeps its address; a new
print gets a new directory. Print files are cached for a day.

## Hosting

S3 and CloudFront in Jamie's AWS account (999153317627, us-east-1), defined in
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
| Bucket        | `thingy-xyz-site-web-999153317627`                |
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
- Caching (`tools/delivery-plan.mjs`): hashed `assets/` a year, immutable;
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
home page, the integration examples and the print page, each with the date of the last commit
that changed it (`tools/write-site-files.mjs`), never the build time. `/embed/`
and the 404 page carry `noindex`. `llms.txt` describes the asset contract for
agents. Google covers the site through the `sc-domain:thingelstad.xyz` property;
Bing tracks it as its own site. projects-sysadmin's `scripts/search-consoles`
reconciles both.

## Analytics

Tinylytics site 3849 (`iJwbo9BJKkpgx7a9sZo1`), in the thingelstad.com group. The
script is injected only when the deploy job builds with `THINGY_TINYLYTICS=true`,
and loads only on thingy.thingelstad.xyz. It is Tinylytics' shared script,
`https://tinylytics.app/js/script.js` with `data-site="iJwbo9BJKkpgx7a9sZo1"`
and no query parameters; options live in the site's Tinylytics settings. Local, preview and test builds carry no
reference to tinylytics.app; `tools/validate-site.mjs` fails if one does. The
`/embed/` frame and `thingy.js` never count: they sit inside other sites' pages.

The character illustration and model belong to Jamie Thingelstad. Blender source
files remain in the private character repository. Shared Inter fonts retain
their OFL license files under `public/shared/fonts/`.
