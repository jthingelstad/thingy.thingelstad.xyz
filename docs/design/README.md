# Character home design

The built-in image generation tool produced `character-home-concept.png` from
the approved v0.10 librarian render as a character reference. The prompt asked
for a complete character viewer and reuse section: paper background, Inter and
Inter Tight, a large open turntable, green scene and pose controls, a switchable
antenna, and a Workshop Builder embed/image chooser. The illustration was a
design reference; the live character is the Blender-derived mesh.

The design system uses paper `#faf8f2`, ink `#171b1d`, green `#214f38`, soft green
`#eaf0e6`, and fine neutral rules. Content stays open rather than nested in cards.
The header pairs the character home with Ask Thingy. The primary screen is
Thingy with the controls around him (see "The studio" below), including what you
can take away. A final row shows the four builder poses.

The copy above the fold follows the concept. Intentional differences are the
approved 3D character in place of the concept’s interpretation, a default Present
pose and light off, an additional concrete four-pose integration example, and
responsive placement of the controls. Pose images are real transparent
renders; the code and controls remain native HTML. A soft contact shadow replaces
a rectangular shadow receiver that showed a visible cutoff in the first pass.

The comparison checks cover header proportions, type hierarchy, paper/green
palette, open studio layout, the controls and selected states, the reuse section,
and the phone sheet. UI verification uses the in-app browser plus the
project’s isolated Playwright suite. The Playwright MCP profile was already busy;
the in-app browser was available and used for live inspection instead.

The final lighting pass uses neutral tone mapping and a soft contact shadow.
Raster self-shadows produced speckling on the thin clothing layers, so they are
disabled in the viewer. The offline pose images retain the Blender material and
lighting finish. The browser uses a lighter PBR atlas and environment lighting.

## The studio

The first rail could not hold eleven faces and five tools without running past the
fold, and it kept Thingy small. A Claude Design run compared a floating panel, a
dock and controls around him, and Jamie chose controls around him above 1000 px,
with a sheet on the phone (2026-11-04). The next day Jamie moved every width to the
sheet, then moved desktop back the same day: "on desktop I think the more expansive
controls were better and left the page more usable… easier to discover" (2026-11-05).

So there are two layouts. Up to 1000 px he stands above a sheet of five tabs at the foot
of the stage, each tab showing what is chosen now: Scene, Accessories (where the scene
has any), Pose, Face, More. One group opens at a time, and tapping the open tab closes it.
Scene and accessories float over him in lists of two columns, and a choice of one closes
the list. Above 1000 px every control is out and nothing opens: scene and accessory lists
with Shuffle in the left rail, poses in front of him, and faces, switches, playback and
Bring him along in the right rail. The lists stay open there, rather than the dropdowns
of the first version, so another choice is one click away.

Figure size follows the height of the canvas, because the camera is orthographic and does
not fit width. On the sheet that height is capped at 112vw, which keeps the widest tool
poses inside a phone's screen. Above 1000 px it comes from the window alone, so a scene
with more accessories can lengthen the rail without changing him, and the stage reaches
up behind the header, which sits above it to keep its links.

Shuffle rides on top of the sheet, and sits beside the word Scene on the wide layout, so
it is always in reach. It picks another scene, then what each of its slots holds, a pose those allow, a face a
reader may choose and the antenna light, in `shuffled()` in `src/config.ts`. It leaves
little movements, playback and the angle alone. The line under the title follows the
scene, one line each in `SCENE_LINES`, then "Always Thingy."

## Bring him along

The first reuse section had its own character and pose pickers, and only ever
showed stills, though its code was live 3D. A second Claude Design run compared a
card, the rail and a section below the stage, and Jamie chose the rail, with a sheet
on the phone (2026-11-04). On the sheet it opens from Bring him at the top of the
stage: Live, Picture and Link, each with one button. In the rail the three buttons are
always out. What stands on the stage is what you take, so there are no pickers of its own.

Copied embeds say `version=latest` so they follow the newest model, and start at the
angle you turned him. Which pose someone picks and how they turn him is theirs: Jamie
asked that nothing manage the `present` pose here. The picture is drawn from the stage
in the browser, because a still for every combination would be some 275 files.

The stage shrinks when the Bring him sheet is open, so all of him stays in view while
you choose.

## Loading

The stage shows no picture while the model loads (`reveal="ready"`), only the ground ring
and "Getting Thingy ready…". The still is framed differently from the model, so showing it
first made him jump in size when the model arrived (Jamie, 2026-11-05). Once his first
frame is painted he fades in and settles from 96% to full size, growing from the ground
ring so his feet stay put. Under reduced motion he simply appears. It still appears
if 3D can't start or the model can't load. Other hosts keep the still by default, and it
now fits its frame (`object-fit: contain`) rather than filling a wide one.
