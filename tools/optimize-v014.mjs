// The delivery GLB for v0.14, from the raw export of tools/export_character_v014.py.
import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const input = `${root}local-only/bakes/v0.14/librarian/librarian.glb`;
if (!existsSync(input)) throw new Error(`no raw export at ${input}`);
mkdirSync(`${root}public/character/v0.14/poses`, { recursive: true });
execFileSync(
  `${root}node_modules/.bin/gltf-transform`,
  [
    "optimize",
    input,
    `${root}public/character/v0.14/librarian.glb`,
    "--compress",
    "meshopt",
    "--texture-compress",
    "webp",
    "--texture-size",
    "2048",
    "--simplify",
    "false",
    "--flatten",
    "false",
    "--join",
    "false",
    "--palette",
    "false",
  ],
  { stdio: "inherit" },
);
