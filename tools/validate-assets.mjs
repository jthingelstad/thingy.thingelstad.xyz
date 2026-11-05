import { readFileSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import validator from "gltf-validator";
const root = fileURLToPath(new URL("../", import.meta.url));
for (const version of ["v0.10", "v0.14", "v0.15", "v0.16", "v0.17"]) {
  const publicRoot = `${root}public/character/${version}/`;
  const manifest = JSON.parse(readFileSync(`${publicRoot}manifest.json`));
  if (manifest.faceSheet)
    assert(statSync(`${publicRoot}${manifest.faceSheet}`).size > 100);
  for (const [key, outfit] of Object.entries(
    manifest.scenes ?? manifest.outfits,
  )) {
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
      [...Object.keys(manifest.poses), ...(outfit.toolClips ?? [])].sort(),
    );
    if (manifest.license) {
      assert.equal(manifest.license.name, "CC BY-NC 4.0", "manifest licence");
      assert.match(json.asset.copyright, /CC BY-NC 4\.0/, `${key}: licence`);
    }
    // Each accessory is its own mesh, so a page can show or hide it.
    for (const slot of outfit.slots ?? [])
      for (const option of slot.options)
        for (const name of [option.node, option.absentNode].filter(Boolean))
          assert(
            json.nodes.some((n) => n.name === name && n.mesh !== undefined),
            `${key}: ${name}`,
          );
    if (outfit.toolClips && manifest.tools) {
      // Each tool is its own mesh, so a page can show one at a time.
      for (const tool of Object.values(manifest.tools).filter((t) => t.node))
        assert(
          json.nodes.some((n) => n.name === tool.node && n.mesh !== undefined),
          `${key}: ${tool.node}`,
        );
    }
    // From v0.16 the Workshop's laptop has a bone of its own, to turn in his hand, and
    // Concert is exported from the same rig.
    const joints =
      version === "v0.17" ||
      (version === "v0.16" && ["workshop", "concert"].includes(key))
        ? 41
        : 40;
    assert.equal(
      json.skins[0].joints.length,
      joints,
      `${key}: shared skeleton`,
    );
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
      `${version} ${key}: ${(bytes.length / 1e6).toFixed(2)} MB, ${json.skins[0].joints.length} joints, ${json.animations.length} clips, valid GLB, reviewed metadata`,
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
