# Thingy Kit

Everything needed to bring Thingy into a project, behind one link:
**https://thingy.thingelstad.xyz/kit/**. Send it to a person, or give it to an
agent:

> Read https://thingy.thingelstad.xyz/kit.md and bring Thingy into this project.

This site is the source of Thingy. His persona, his model, his faces and his
code are published here, and every place he appears takes him from here. When
he changes here, a project that follows these addresses changes with him.

## What is in the kit

| Part             | What it is                                                                                                                 | Where                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| His persona      | Who he is, how he talks, and what he never does. The authority on him                                                      | [persona.md](https://thingy.thingelstad.xyz/persona.md), or [as a page](https://thingy.thingelstad.xyz/persona/) |
| His model        | Rigged glTF 2.0, in four scenes, with faces and accessories                                                                | [character/latest/](https://thingy.thingelstad.xyz/character/latest/manifest.json), described by its manifest    |
| His pictures     | Transparent stills, with no code to run                                                                                    | `https://thingy.thingelstad.xyz/character/latest/poses/<name>.webp`                                              |
| A frame          | An iframe with him in it, with no code to run                                                                              | `https://thingy.thingelstad.xyz/embed/`                                                                          |
| A component      | The `<thingy-character>` web component, for any framework                                                                  | `https://thingy.thingelstad.xyz/thingy.js`                                                                       |
| His voice        | The one spoken voice he has                                                                                                | [How he sounds](https://thingy.thingelstad.xyz/persona/#how-he-sounds), in the persona                           |
| What he knows    | Jamie's published work, through the Librarian MCP server                                                                   | [Connect your AI](https://thingy.thingelstad.com/connect/) on Ask Thingy                                         |
| A model to print | A 180 mm figure, as 3MF and zipped STL                                                                                     | [Print Thingy](https://thingy.thingelstad.xyz/print/)                                                            |
| His illustration | The original drawing, in the librarian's jacket. The authority on how he looks. A 220 KB PNG, for `og:image` and app icons | `https://thingy.thingelstad.xyz/thingy-original.png`                                                             |

To try him without writing anything, use [the stage](https://thingy.thingelstad.xyz/).
Choose a scene and turn him, then **Bring him along** gives you the code, a picture
or a link for exactly what you see.

## Start with his job

Thingy is the same character everywhere, and each place gives him a job. The job
picks the scene and how much of his personality comes through. The jobs he has
today are in [Where he works](https://thingy.thingelstad.xyz/persona/#where-he-works):

| Job                           | Scene                  | Use `scene=`                               |
| ----------------------------- | ---------------------- | ------------------------------------------ |
| Librarian                     | Library                | `library`                                  |
| Builder and record keeper     | Workshop               | `workshop`, with `accessories` for the job |
| Host of Supporting Membership | Concert                | `concert`                                  |
| Narrator of the audio edition | None, he is only heard |                                            |

`outdoors` is a scene with no job yet.

If the project clearly fits one of those, use it, and keep to what the job says:
builder and record keeper means the record of what Jamie has built. If you aren't
sure it fits, ask Jamie. A new job is Jamie's to give, so ask Jamie what he does
there before inventing a role, and add it to the persona first.

Each surface has its own register in the persona, and a new project has none until
Jamie gives it one. Until then, borrow the nearest and write down that you did, as
[docs/THINGY.md](https://github.com/jthingelstad/thingelstad.xyz/blob/main/docs/THINGY.md)
does for Things I've Built. Settle whose name a page's entries carry at the same
time, because he never writes as Jamie. That file settles it for its site.

## Give him words

Whichever model writes as Thingy follows the persona. An agent writing pages or
code for a project reads all of
[persona.md](https://thingy.thingelstad.xyz/persona.md) first. It is about 17 KB,
and it is meant to be read whole.

- **A prompt that runs on every turn can carry less.** Ask Thingy's chat keeps a
  condensed identity for its model. Take it from the persona and say so in the file,
  so the persona wins when they differ. Never fork him, and never add to him there.
- **Your surface adds mechanics, not character.** Citations, lengths and formats
  belong to your project. Who he is does not.
- **Facts have owners.** He reads a figure from where it lives and never states
  one from memory. The persona names each owner.

The lines that matter most, all from the persona, which wins if these ever differ:

- He is never Jamie. He never writes as Jamie, and his words never pass as Jamie's.
- He has his own name, byline or box, and his own face, so a reader can always
  tell it is him.
- He invents nothing: no fact, figure, date, quotation, citation or feeling.
- He is he/him, says "I" when talking with someone, and says plainly that he is
  an AI agent Jamie built when it matters.
- He answers from Jamie's published work, and declines the rest in character.

To speak, he uses OpenAI `tts-1-hd` with the voice `nova`, for his own words only.
The persona has the current voice and the hand-offs.

To answer from the archive, connect the
[Librarian MCP server](https://thingy.thingelstad.com/connect/) at
`https://librarian.thingelstad.com/mcp`. Its
[reference](https://thingy.thingelstad.com/connect/reference/) lists every tool.
Readers sign in with an active Weekly Thing subscription. An agent can also use
[Ask Thingy's llms.txt](https://thingy.thingelstad.com/llms.txt).

## Show him

| You want                                  | Use           | It costs                                               |
| ----------------------------------------- | ------------- | ------------------------------------------------------ |
| A picture on a page                       | A still       | Under 60 KB, and no JavaScript                         |
| Him on a page, turnable by whoever visits | The frame     | A model of about 2 MB, loaded inside the frame         |
| Him inside an app, reacting to it         | The component | `thingy.js` at about 820 KB, and a model of about 2 MB |
| Him in your own 3D scene                  | The model     | A model of about 2 MB, and your own renderer           |

Each of these follows the newest Thingy as written here. See
[Follow him or keep him](#follow-him-or-keep-him) to hold one still instead.

### A still

```html
<img
  src="https://thingy.thingelstad.xyz/character/latest/poses/workshop-hello.webp"
  alt="Thingy in the Workshop, waving hello"
  width="240"
  height="240"
/>
```

The name is `<scene>-<pose>.webp`, 1000 px square and transparent, with a tool or a
face in it where the still has one: `workshop-hammer-show.webp`,
`library-rest-delighted.webp`.

- **Every scene has `present`.** Outdoors and Concert have only that, named by
  `poster` in the manifest, and they show the accessories the scene gives him. In
  `workshop-present` he holds the laptop.
- **The Library's stills also have faces, and the Workshop's have tools and two
  faces for his job there:** `workshop-present-proud` and
  `workshop-thinking-curious`. `stills` for each scene in the
  [manifest](https://thingy.thingelstad.xyz/character/latest/manifest.json) lists
  them. A still shows the `original` face unless its name gives another.
- **For anything with no still,** use the frame or the component, which draw any
  scene, pose, accessory and face. **Download picture** on the stage also draws one, but
  that copy is yours to host and no longer follows `latest`.
- **Your policy and your background.** A strict content security policy needs the
  host in `img-src`. He is made for a light page: on a very dark one, his legs and
  shadow sink into it.
- **If this site is ever down,** the page loses the picture, so give it `alt` text
  or an empty `alt` that the page can stand without.

### The frame

```html
<iframe
  src="https://thingy.thingelstad.xyz/embed/?version=latest&scene=workshop&accessories=hammer&pose=show&face=proud&light=off&motion=off"
  title="Thingy in the Workshop"
  width="360"
  height="400"
  loading="lazy"
  style="border:0;background:transparent"
></iframe>
```

It is transparent, with no controls around him, and runs nothing on your page, so
a strict content security policy needs only the host in `frame-src`. It takes
`version`, `scene`, `accessories`, `pose`, `face`, `light`, `motion` and `view`.
Anything `version` doesn't recognize means the newest model. `view=<round>,<up>,<zoom>`
starts him at an angle, in degrees around him, degrees down from straight above, and
zoom, as `view=60,80,1.2`.

### The component

```html
<script type="module" src="https://thingy.thingelstad.xyz/thingy.js"></script>
<thingy-character
  version="latest"
  scene="library"
  pose="hello"
  face="idle"
  light="off"
  motion="off"
  style="display:block;width:320px;height:380px"
></thingy-character>
```

It works in plain HTML or any framework. Change an attribute and he changes.

| Attribute     | Values                                                                       |
| ------------- | ---------------------------------------------------------------------------- |
| `version`     | `latest` or `v0.16`, with the `v`. Anything else is the newest               |
| `scene`       | `library`, `outdoors`, `workshop`, `concert`                                 |
| `pose`        | See [poses](#poses). Without one he stands in `present`, so set it           |
| `face`        | See [faces](#faces)                                                          |
| `accessories` | See [accessories](#accessories). A comma list, or `none`                     |
| `light`       | `on` or `off`. The antenna is lit when he is live, answering now or speaking |
| `motion`      | `on` or `off`. It obeys reduced motion even when `on`                        |
| `blink`       | `on` blinks the faces that can, never under reduced motion                   |
| `life`        | `on` gives him small movements of his own. See [below](#small-movements)     |
| `view`        | The angle he starts at, written as the frame's `view` is                     |
| `zoom`        | `off` leaves the mouse wheel to the page                                     |
| `poster`      | An image to show until the model is ready                                    |
| `view-label`  | The canvas's accessible name                                                 |
| `asset-base`  | Another directory to load the models from, when hosting the files yourself   |

- **Events:** `thingy-ready`, `thingy-change`, `thingy-view` as he turns,
  `thingy-tap` on a press that barely moves, and `thingy-fallback` when he falls
  back to a still because 3D could not start.
- **Methods:** `resetView()`, `hop({ height, direction, turns })` to jump and spin,
  and `picture(size)`, which resolves to a square transparent PNG of him in his
  pose at this angle. With `life` on it leaves out his small movements and shows
  his eyes open.
- **Properties:** `view` reads where he is now, `moves` says whether the pose has
  motion to play, `alive` says whether small movements are running,
  `strained` says he stopped them because the machine could not keep up (a
  `thingy-strained` event says so too), and
  `lifeSettings` reads or sets how much he does them.
- **Content security policy:** the host needs to be in `script-src` and
  `connect-src`, with `'wasm-unsafe-eval'` in `script-src` for the Meshopt decoder,
  and `blob:` in `connect-src` and `img-src` for the textures.

### Small movements

`life="on"` lets him move a little on his own between poses. He breathes, blinks,
looks toward the pointer and glances around, and his antenna swings when he turns.
A new pose blends in instead of jumping, and his eyes close across a change of
face. It is off unless you ask for it.

It stops when he is off screen and never runs under reduced motion. It adds a
little work for as long as he is on screen, so use it where he is the point of the
page. The frame leaves it out, and Ask Thingy has none.

### A still that becomes him

For a page that should stay light, show a still first and bring him in when the
page is up. Skip the 3D for `Save-Data` or when WebGL 2 is missing, and the still
stays if anything fails. Ask Thingy's front page does this, in
[thingy-3d.ts](https://github.com/jthingelstad/thingy.thingelstad.com/blob/main/web/src/shared/thingy-3d.ts).

```html
<div style="position:relative;width:240px;height:240px">
  <img
    id="thingy-still"
    src="https://thingy.thingelstad.xyz/character/latest/poses/library-hello.webp"
    alt="Thingy, waving"
    width="240"
    height="240"
  />
</div>
<script type="module">
  const still = document.querySelector("#thingy-still");
  const saving = navigator.connection?.saveData === true;
  const canDraw = !!document.createElement("canvas").getContext("webgl2");
  const later = window.requestIdleCallback ?? setTimeout;
  if (!saving && canDraw) {
    later(async () => {
      await import("https://thingy.thingelstad.xyz/thingy.js");
      const thingy = document.createElement("thingy-character");
      thingy.setAttribute("version", "latest");
      thingy.setAttribute("scene", "library");
      thingy.setAttribute("pose", "hello");
      thingy.setAttribute("zoom", "off");
      thingy.setAttribute("poster", still.src);
      thingy.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
      thingy.addEventListener("thingy-ready", () => {
        still.style.visibility = "hidden";
      });
      thingy.addEventListener("thingy-fallback", () => {
        thingy.remove();
        still.style.visibility = "";
      });
      still.after(thingy);
    });
  }
</script>
```

### The model

Load `https://thingy.thingelstad.xyz/character/latest/<scene>.glb` with
[Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader) and its Meshopt
decoder. Files are served with `Access-Control-Allow-Origin: *`. They are glTF 2.0
in meters, +Y up and +Z forward, with Meshopt compression and WebP textures, on a
shared rig of 40 joints. From v0.16 the Workshop has one more, for the laptop.

- **Poses** are animation clips named for the pose, at 24 fps. The manifest gives
  each pose's `stillFrame`, the frame to hold for a still pose.
- **Accessories** are skinned nodes named `Thingy_Accessory_<id>`, with tool clips
  named `<tool>-<pose>`. Show the ones he has and hide the rest. An accessory's
  `absentNode` in the manifest takes its place when it comes off: without headphones,
  `Thingy_Accessory_ears` gives him his ears.
- **The face** is one cell of an atlas on the node `Thingy_Screen`: material
  `Thingy_Face`, emissive map, 4 columns by 5 rows. The manifest gives each face's
  `cell`, and a `blink` cell for the faces that can blink. `faces.webp` is the same
  atlas, small, for a page offering the faces.
- **The antenna** is the material `Thingy_Beacon`.

## Poses, faces and accessories

### Poses

`hello`, `present`, `thinking` and `rest`, in every scene. On a page where people
can turn him, `hello` makes the better first pose, since the `present` hand can
read as a rude gesture from the side.

### Faces

| Face          | What it means                                               |
| ------------- | ----------------------------------------------------------- |
| `original`    | The illustration's wink                                     |
| `idle`        | He is ready and listening                                   |
| `thinking`    | He is at work                                               |
| `found-it`    | He found something real, not merely that an answer finished |
| `oops`        | Something went wrong on his side                            |
| `delighted`   | A connection found                                          |
| `curious`     | A question he is turning over                               |
| `proud`       | Showing something Jamie built                               |
| `eager`       | Making the case for membership                              |
| `sympathetic` | A hard subject                                              |
| `sheepish`    | He got something wrong and is fixing it                     |

A face means what it says here, so show `found-it` only when he found something.
There is also `off`, which is never shown to a reader.

### Accessories

What he can have with him depends on the scene. A scene gives him what it gives him
unless you say otherwise, so leave `accessories` off for that. Otherwise name what
he has, separated by commas, or say `none`.

| Scene      | Accessories                      | With none | Unless told otherwise |
| ---------- | -------------------------------- | --------- | --------------------- |
| `library`  | None                             |           |                       |
| `outdoors` | `backpack`                       | Off       | `backpack`            |
| `workshop` | `screwdriver`, `hammer`, `drill` | Empty     | Empty hands           |
| `workshop` | `laptop`                         | Empty     | `laptop` in `present` |
| `concert`  | `headphones`                     | Off       | `headphones`          |

Some accessories keep to the poses they were made for:

| In the Workshop                  | Poses                       |
| -------------------------------- | --------------------------- |
| `screwdriver`, `hammer`, `drill` | `carry`, `show`, `work`     |
| `laptop`                         | `present`, `work`           |
| `none`                           | `hello`, `thinking`, `rest` |

`carry` holds the tool at his side, `show` holds it in front of him, and `work` is
using it. The laptop's `present` turns its screen to you, and its `work` to him. With no `accessories`, a pose only a tool has brings that tool, so `present` in
the Workshop holds the laptop. Asking for a pose the accessory does not have moves
him to its first pose. Tool poses are single frames, so `motion` has nothing to play.
An accessory a scene doesn't have is ignored. To read what he ended up with, use the
`accessories` property or the `thingy-change` event.

The manifest describes each scene's `slots`, so a page can offer whatever a new scene
brings without changing. A slot holds one accessory at a time.

## Follow him or keep him

| You want                  | Use                                     | Changes                                       |
| ------------------------- | --------------------------------------- | --------------------------------------------- |
| The newest Thingy, always | `version="latest"`, `character/latest/` | When this site does, within five minutes      |
| One Thingy, for good      | `version="v0.16"`, `character/v0.16/`   | Never                                         |
| His persona               | `persona.md`                            | When Jamie approves a change, within a minute |

Use `latest` unless a page needs one model forever.

Change him here, and this is how it reaches a project:

- **On its own:** the model, the stills, the component and the frame, for anything
  following `latest`. Nothing to do.
- **By hand:** words a project keeps of its own, such as a condensed prompt or a
  page in his voice. Each change to the persona opens an
  [issue](https://github.com/jthingelstad/thingy.thingelstad.xyz/issues) for Jamie,
  listing what to reread, drawn from
  [surfaces.json](https://thingy.thingelstad.xyz/kit/surfaces.json).

Tell Jamie about a new project, so it can join `surfaces.json` with every still it
names. A new model cannot ship without those stills, because this site's own checks
fail first.

What this site keeps to:

- Published addresses stay. A numbered version's files are never replaced, and an
  incompatible change gets a new version. The component draws v0.15 on. The older
  files, v0.10 and v0.14, stay published for anything loading them itself, with the
  outfit names they were made with.
- Pose, scene and face names stay.
- `character/latest/` holds what the newest version holds, at the same names.
- `https://thingy.thingelstad.xyz/revision.json` gives the commit and the time of
  the current build, for a project that wants to notice a change.

## Where he works now

Two sites to read as examples:

- **Ask Thingy** ([code](https://github.com/jthingelstad/thingy.thingelstad.com))
  follows `latest` with the component on its front page and a still on every other
  page. The rules it keeps are in its
  [AGENTS.md](https://github.com/jthingelstad/thingy.thingelstad.com/blob/main/AGENTS.md).
- **Things I've Built** ([code](https://github.com/jthingelstad/thingelstad.xyz))
  follows `latest` with stills alone, and keeps its job, scene and register in
  [docs/THINGY.md](https://github.com/jthingelstad/thingelstad.xyz/blob/main/docs/THINGY.md),
  a good pattern for a new project to copy.

## Terms

Everything here is licensed
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/): the persona, this
kit, the model, the faces, the stills, the print files and the code. Use him, change
him and share him, credit Jamie, and don't use him commercially. The whole licence
is in [LICENSE](https://github.com/jthingelstad/thingy.thingelstad.xyz/blob/main/LICENSE).

[![CC BY-NC 4.0](https://thingy.thingelstad.xyz/shared/cc/by-nc.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

Credit him like this, linked where you can:

> [Thingy](https://thingy.thingelstad.xyz/) by [Jamie Thingelstad](https://www.thingelstad.com/), [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/)

The code that Bring Thingy along gives you already carries that line. For a use the
licence doesn't cover, ask [Jamie](https://www.thingelstad.com/).

Jamie has supported Creative Commons for years. His blog and the Weekly Thing carry
its licences too, and the first donation from Weekly Thing Supporting Memberships
went to it. In [his words](https://weekly.thingelstad.com/archive/318/): "Copyright
law can strangle creativity and culture. Creative Commons is doing good work to
enable an alternative path."

A few things here have licences of their own, which
[NOTICE.md](https://github.com/jthingelstad/thingy.thingelstad.xyz/blob/main/NOTICE.md)
lists: the Inter fonts, Three.js inside the component, and the Creative Commons
marks.

## For agents

- [`llms.txt`](https://thingy.thingelstad.xyz/llms.txt) indexes this site.
- This page is [`kit.md`](https://thingy.thingelstad.xyz/kit.md), and it holds all
  of the kit but the persona. Read
  [`persona.md`](https://thingy.thingelstad.xyz/persona.md) before writing anything
  in his voice.
- [`manifest.json`](https://thingy.thingelstad.xyz/character/latest/manifest.json)
  is the machine-readable list of scenes, poses, faces, accessories and stills. Trust it
  over this page if they ever differ.
