import { readFileSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import validator from "gltf-validator";
const root = fileURLToPath(new URL("../", import.meta.url));
const publicRoot = `${root}public/character/v0.10/`;
const manifest = JSON.parse(readFileSync(`${publicRoot}manifest.json`));
for (const [key, outfit] of Object.entries(manifest.outfits)) {
  const bytes = readFileSync(`${publicRoot}${outfit.model}`);
  assert(bytes.length < 6 * 1024 * 1024, `${key}: delivery budget exceeded`);
  const jsonLength = bytes.readUInt32LE(12);
  const jsonText = bytes.subarray(20, 20 + jsonLength).toString();
  const json = JSON.parse(jsonText);
  assert(
    !/\/Users\/|local-only|\.blend|thingy-character/.test(jsonText),
    `${key}: private export metadata`,
  );
  assert.deepEqual(
    json.animations.map((a) => a.name).sort(),
    Object.keys(manifest.poses).sort(),
  );
  assert.equal(json.skins[0].joints.length, 40, `${key}: shared skeleton`);
  assert(
    json.materials.some((m) => m.name === "Thingy_Beacon"),
    `${key}: switchable beacon`,
  );
  if (key === "workshop") {
    assert(
      json.nodes.some(
        (n) => n.name === "Thingy_workshop" && n.mesh !== undefined,
      ),
    );
    assert(
      json.nodes.some(
        (n) => n.name === "Thingy_Laptop" && n.mesh !== undefined,
      ),
    );
  }
  const result = await validator.validateBytes(new Uint8Array(bytes), {
    maxIssues: 100,
  });
  assert.equal(
    result.issues.numErrors,
    0,
    `${key}: ${JSON.stringify(result.issues.messages.filter((m) => m.severity === 0))}`,
  );
  const rawPath = `${root}local-only/bakes/${key}/${key}.glb`;
  if (existsSync(rawPath)) {
    const source = await validator.validateBytes(
      new Uint8Array(readFileSync(rawPath)),
      { maxIssues: 100 },
    );
    assert.equal(
      source.issues.numErrors,
      0,
      `${key}: invalid uncompressed source geometry`,
    );
  }
  for (const path of [
    outfit.poster,
    ...Object.values(outfit.stills || {}).flatMap((p) => Object.values(p)),
  ]) {
    assert(statSync(`${publicRoot}${path}`).size > 100, path);
  }
  console.log(
    `${key}: ${(bytes.length / 1e6).toFixed(2)} MB, 40 joints, four clips, valid GLB, reviewed metadata`,
  );
}
