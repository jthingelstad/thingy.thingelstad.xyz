# Character home design

The built-in image generation tool produced `character-home-concept.png` from
the approved v0.10 librarian render as a character reference. The prompt asked
for a complete character viewer and reuse section: paper background, Inter and
Inter Tight, a large open turntable, green outfit/pose controls, a switchable
antenna, and a Workshop Builder embed/image chooser. The illustration was a
design reference; the live character is the Blender-derived mesh.

The design system uses paper `#faf8f2`, ink `#171b1d`, green `#214f38`, soft green
`#eaf0e6`, and fine neutral rules. Content stays open rather than nested in cards.
The header pairs the character home with Ask Thingy. The primary screen is
Thingy with the controls around him (see "The studio" below). The reuse section provides a character selection, pose previews, code, copy action,
and transparent image download. A final row shows the four builder poses.

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

The rail could not hold eleven faces and five tools without running past the
fold, and it kept Thingy small. A Claude Design run compared a floating panel, a
dock and controls around him, and Jamie chose the last, with a phone sheet
(2026-11-04).

There is no panel. Above 1000 px the intro, outfits and tools stand on the left,
faces, the note, antenna light, Play and Reset on the right, and pose tiles and the
hint at his feet. The stage fills the studio and reaches up behind the header, so
the header sits above it to keep its links. Figure size follows the height of the
canvas, because the camera is orthographic and does not fit width.

At 1000 px and below the controls become a sheet of five tabs, each showing what is
chosen now: Outfit, Hand (Workshop only), Pose, Face, More. One group opens at a
time, and tapping the open tab closes it. The figure's height is capped at 112vw,
which keeps the widest tool poses inside a phone's screen. The intro line and the
drag hint are left out of the sheet layout.
