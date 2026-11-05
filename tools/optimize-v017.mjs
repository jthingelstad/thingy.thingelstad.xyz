// The delivery GLB for v0.17, from the raw export of tools/export_character_v017.py.
// Name the scenes to make, or none for every scene with a raw export.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = `${root}public/character/v0.17`;
const COPYRIGHT =
  "Thingy by Jamie Thingelstad, CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/";

/** Say the licence in the file's JSON, leaving every other byte as it was. */
function withLicence(bytes) {
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString());
  json.asset.copyright = COPYRIGHT;
  // Material names aren't all ASCII, so the padding counts bytes.
  const text = Buffer.from(JSON.stringify(json));
  const chunk = Buffer.concat([
    text,
    Buffer.alloc((4 - (text.length % 4)) % 4, " "),
  ]);
  const rest = bytes.subarray(20 + length);
  const head = Buffer.alloc(20);
  bytes.copy(head, 0, 0, 20);
  head.writeUInt32LE(20 + chunk.length + rest.length, 8);
  head.writeUInt32LE(chunk.length, 12);
  return Buffer.concat([head, chunk, rest]);
}

const all = [
  "library",
  "outdoors",
  "workshop",
  "concert",
  "kitchen",
  "winter",
  "cabin",
];
const named = process.argv.slice(2);
const wanted = named.length
  ? named
  : all.filter((s) =>
      existsSync(`${root}local-only/bakes/v0.17/${s}/${s}.glb`),
    );
for (const scene of wanted) {
  const input = `${root}local-only/bakes/v0.17/${scene}/${scene}.glb`;
  if (!existsSync(input)) throw new Error(`no raw export at ${input}`);
  execFileSync(
    `${root}node_modules/.bin/gltf-transform`,
    [
      "optimize",
      input,
      `${out}/${scene}.glb`,
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
    `${out}/${scene}.glb`,
    withLicence(readFileSync(`${out}/${scene}.glb`)),
  );
}
