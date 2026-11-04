// The delivery GLBs for v0.14, from the raw exports of tools/export_character_v014.py.
// Name the outfits to make; the published Librarian is only remade on purpose.
import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const outfits = process.argv.slice(2);
if (!outfits.length) throw new Error("name the outfits to optimize");
mkdirSync(`${root}public/character/v0.14/poses`, { recursive: true });
for (const key of outfits) {
  const input = `${root}local-only/bakes/v0.14/${key}/${key}.glb`;
  if (!existsSync(input)) throw new Error(`no raw export at ${input}`);
  execFileSync(
    `${root}node_modules/.bin/gltf-transform`,
    [
      "optimize",
      input,
      `${root}public/character/v0.14/${key}.glb`,
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
}
