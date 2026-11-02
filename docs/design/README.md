# Character home design

The built-in image generation tool produced `character-home-concept.png` from
the approved v0.10 librarian render as a character reference. The prompt asked
for a complete character viewer and reuse section: paper background, Inter and
Inter Tight, a large open turntable, green outfit/pose controls, a switchable
antenna, and a Workshop Builder embed/image chooser. The illustration was a
design reference; the live character is the Blender-derived mesh.

The design system uses paper `#faf8f2`, ink `#171b1d`, green `#214f38`, soft green
`#eaf0e6`, and fine neutral rules. Content stays open rather than nested in cards.
The header pairs the character home with Ask Thingy. The primary screen is a
turntable and control rail; on phones the controls follow the character. The
reuse section provides a character selection, pose previews, code, copy action,
and transparent image download. A final row shows the four builder poses.

The copy above the fold follows the concept. Intentional differences are the
approved 3D character in place of the concept’s interpretation, a default Present
pose and light off, an additional concrete four-pose integration example, and
responsive placement when the rail cannot fit. Pose images are real transparent
renders; the code and controls remain native HTML. A soft contact shadow replaces
a rectangular shadow receiver that showed a visible cutoff in the first pass.

The comparison checks cover header proportions, type hierarchy, paper/green
palette, open studio layout, the control rail and selected states, the reuse
section, and phone stacking. UI verification uses the in-app browser plus the
project’s isolated Playwright suite. The Playwright MCP profile was already busy;
the in-app browser was available and used for live inspection instead.

The final lighting pass uses neutral tone mapping and a soft contact shadow.
Raster self-shadows produced speckling on the thin clothing layers, so they are
disabled in the viewer. The offline pose images retain the Blender material and
lighting finish. The browser uses a lighter PBR atlas and environment lighting.
