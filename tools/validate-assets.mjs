import { readFileSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import validator from "gltf-validator";
const root = fileURLToPath(new URL("../", import.meta.url));
for (const version of ["v0.10", "v0.14"]) {
  const publicRoot = `${root}public/character/${version}/`;
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
    if (manifest.faceAtlas) {
      // The screen is lit by one cell of the atlas, and the file names which.
      const face = json.materials.find(
        (m) => m.name === manifest.faceAtlas.material,
      );
      const transform =
        face?.emissiveTexture?.extensions?.KHR_texture_transform;
      assert(transform, `${key}: the face has no atlas cell`);
      assert.deepEqual(
        transform.scale.map((value) => Math.round(1 / value)),
        [manifest.faceAtlas.columns, manifest.faceAtlas.rows],
        `${key}: the face atlas layout`,
      );
      assert(
        json.nodes.some(
          (n) => n.name === "Thingy_Screen" && n.mesh !== undefined,
        ),
        `${key}: a separate screen`,
      );
    }
    if (version === "v0.10" && key === "workshop") {
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
    const rawPath =
      version === "v0.10"
        ? `${root}local-only/bakes/${key}/${key}.glb`
        : `${root}local-only/bakes/${version}/${key}/${key}.glb`;
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
      `${version} ${key}: ${(bytes.length / 1e6).toFixed(2)} MB, 40 joints, four clips, valid GLB, reviewed metadata`,
    );
  }
}

// Print files: each one matches the size and SHA-256 in its manifest, stays
// inside a download budget, and the 3MF and ZIP are real archives.
const { createHash } = await import("node:crypto");
const printRoot = `${root}public/print/v0.13/`;
const print = JSON.parse(readFileSync(`${printRoot}manifest.json`));
assert.equal(print.license.name, "CC BY-NC 4.0", "print licence");
assert.equal(print.solid.components, 1, "print: one solid");
assert.equal(print.solid.nonmanifold_edges, 0, "print: watertight");
for (const [name, file] of Object.entries(print.files)) {
  const bytes = readFileSync(`${printRoot}${name}`);
  assert.equal(bytes.length, file.bytes, `${name}: size`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    file.sha256,
    `${name}: checksum`,
  );
  assert(bytes.length < 25 * 1024 * 1024, `${name}: download budget exceeded`);
  assert.equal(bytes.subarray(0, 2).toString(), "PK", `${name}: archive`);
  assert(!bytes.includes("/Users/"), `${name}: private path`);
}
for (const still of Object.values(print.stills))
  for (const path of [still.webp, still.png].filter(Boolean))
    assert(statSync(`${printRoot}${path}`).size > 100, path);
console.log(
  `print v0.13: ${Object.keys(print.files).length} downloads match the manifest`,
);
