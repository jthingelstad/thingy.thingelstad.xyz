import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { newestCharacterVersion } from "../tools/delivery-plan.mjs";
import {
  outfit,
  pose,
  embedURL,
  iframeCode,
  face,
  faceOffset,
  FACE_ATLAS,
  FACES,
  modelVersion,
  OUTFITS,
  POSES,
  posterPath,
  VERSIONS,
} from "../src/config";

test("untrusted embed parameters are limited to supported characters and poses", () => {
  for (const input of [
    null,
    "",
    "__proto__",
    "<script>alert(1)</script>",
    "WORKSHOP",
  ]) {
    assert.equal(outfit(input), "librarian");
    assert.equal(pose(input), "present");
  }
});
test("the site and external consumers agree on the versioned asset contract", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../public/character/v0.10/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(Object.keys(OUTFITS), Object.keys(manifest.outfits));
  assert.deepEqual(Object.keys(POSES), Object.keys(manifest.poses));
  for (const [name, value] of Object.entries(POSES)) {
    assert.equal(value.frame, manifest.poses[name].stillFrame);
    assert.equal(
      posterPath("workshop", name as keyof typeof POSES),
      `/character/v0.10/${manifest.outfits.workshop.stills[name].webp}`,
    );
  }
});
test("each model version publishes what the component asks of it", () => {
  for (const [version, outfits] of Object.entries(VERSIONS)) {
    const manifest = JSON.parse(
      readFileSync(
        new URL(
          `../public/character/${version}/manifest.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    assert.deepEqual([...outfits], Object.keys(manifest.outfits));
    for (const key of outfits)
      assert.equal(
        posterPath(key, "present", "/character/", version as "v0.10"),
        `/character/${version}/${manifest.outfits[key].poster}`,
      );
  }
});
test("the component's newest model is the newest published directory", () => {
  assert.equal(
    Object.keys(VERSIONS).at(-1),
    newestCharacterVersion(
      readdirSync(new URL("../public/character/", import.meta.url)),
    ),
  );
});
test("a version an outfit lacks falls back, and nothing untrusted reaches a path", () => {
  assert.equal(modelVersion("v0.14", "librarian"), "v0.14");
  assert.equal(modelVersion("v0.14", "trail"), "v0.10");
  assert.equal(modelVersion(null, "librarian"), "v0.10");
  assert.equal(modelVersion("latest", "librarian"), "v0.14");
  assert.equal(modelVersion("latest", "trail"), "v0.10");
  for (const input of ["../v0.14", "__proto__", "v9"])
    assert.equal(modelVersion(input, "librarian"), "v0.10");
});
test("the faces match the published atlas, and a face picks its own cell", () => {
  const manifest = JSON.parse(
    readFileSync(
      new URL("../public/character/v0.14/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  assert.deepEqual(FACES, manifest.faces);
  assert.equal(FACE_ATLAS.columns, manifest.faceAtlas.columns);
  assert.equal(FACE_ATLAS.rows, manifest.faceAtlas.rows);
  assert.deepEqual(faceOffset(0), [0, 0]);
  assert.deepEqual(faceOffset(5), [0.25, 0.2]);
  assert.deepEqual(faceOffset(16), [0, 0.8]);
  assert.equal(face("sheepish"), "sheepish");
  for (const input of [null, "", "__proto__", "blink"])
    assert.equal(face(input), "original");
});
test("an embedded character keeps outfit, pose, beacon and motion independent", () => {
  const state = {
    outfit: "workshop",
    pose: "thinking",
    light: true,
    motion: false,
  } as const;
  const url = new URL(embedURL(state));
  assert.equal(url.origin, "https://thingy.thingelstad.xyz");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    outfit: "workshop",
    pose: "thinking",
    light: "on",
    motion: "off",
  });
  assert(iframeCode(state).includes('title="Thingy, Workshop Builder"'));
});
