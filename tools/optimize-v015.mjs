// The delivery GLBs for v0.15, from the raw exports of tools/export_character_v015.py.
// Name the scenes to make. The Library is v0.14's Librarian, the same file with
// its name and licence corrected: it has not changed, so it is not remade.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = `${root}public/character/v0.15`;
const COPYRIGHT =
  "Thingy by Jamie Thingelstad, CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/";

/** Say the licence in the file's JSON, leaving every other byte as it was. */
function withLicence(bytes) {
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString());
  json.asset.copyright = COPYRIGHT;
  let text = JSON.stringify(json);
  text += " ".repeat((4 - (text.length % 4)) % 4);
  const chunk = Buffer.from(text);
  const rest = bytes.subarray(20 + length);
  const head = Buffer.alloc(20);
  bytes.copy(head, 0, 0, 20);
  head.writeUInt32LE(20 + chunk.length + rest.length, 8);
  head.writeUInt32LE(chunk.length, 12);
  return Buffer.concat([head, chunk, rest]);
}

const scenes = process.argv.slice(2);
if (!scenes.length) throw new Error("name the scenes to optimize");
mkdirSync(`${out}/poses`, { recursive: true });
for (const key of scenes) {
  if (key === "library") {
    writeFileSync(
      `${out}/library.glb`,
      withLicence(readFileSync(`${root}public/character/v0.14/librarian.glb`)),
    );
    continue;
  }
  const input = `${root}local-only/bakes/v0.15/${key}/${key}.glb`;
  if (!existsSync(input)) throw new Error(`no raw export at ${input}`);
  execFileSync(
    `${root}node_modules/.bin/gltf-transform`,
    [
      "optimize",
      input,
      `${out}/${key}.glb`,
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
  writeFileSync(
    `${out}/${key}.glb`,
    withLicence(readFileSync(`${out}/${key}.glb`)),
  );
}
