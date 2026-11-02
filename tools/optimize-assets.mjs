import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
for (const outfit of ["librarian", "trail", "workshop", "concert"]) {
  const input = `${root}local-only/bakes/${outfit}/${outfit}.glb`;
  if (!existsSync(input)) continue;
  // The first export had an off beacon, indistinguishable from the surface
  // material to a glTF deduplicator. Keep its authored runtime control intact.
  const bytes = readFileSync(input);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const beacon = json.materials.find(
    (material) => material.name === "Thingy_Beacon",
  );
  if (!beacon) throw new Error(`${outfit}: missing beacon material`);
  beacon.emissiveFactor = [1, 0.23, 0.02];
  const serialized = JSON.stringify(json);
  const jsonBytes = Buffer.from(
    serialized.padEnd(Math.ceil(Buffer.byteLength(serialized) / 4) * 4),
  );
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBytes.length);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const bin = bytes.subarray(20 + jsonLength);
  const header = Buffer.from(bytes.subarray(0, 12));
  header.writeUInt32LE(12 + 8 + jsonBytes.length + bin.length, 8);
  const runtime = `${root}local-only/bakes/${outfit}/${outfit}-runtime.glb`;
  writeFileSync(runtime, Buffer.concat([header, jsonHeader, jsonBytes, bin]));
  execFileSync(
    `${root}node_modules/.bin/gltf-transform`,
    [
      "optimize",
      runtime,
      `${root}public/character/v0.10/${outfit}.glb`,
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
    ],
    { stdio: "inherit" },
  );
}
