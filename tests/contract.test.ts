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
  FACE_CHOICES,
  stageOf,
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
  assert.equal(modelVersion("v0.14", "trail"), "v0.14");
  assert.equal(modelVersion("v0.14", "unknown" as "trail"), "v0.10");
  assert.equal(modelVersion(null, "librarian"), "v0.10");
  assert.equal(modelVersion("latest", "librarian"), "v0.14");
  assert.equal(modelVersion("latest", "trail"), "v0.14");
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
test("a person is never offered the screen turned off, and every offered face exists", () => {
  assert(!Object.hasOwn(FACE_CHOICES, "off"));
  for (const id of Object.keys(FACE_CHOICES)) assert(Object.hasOwn(FACES, id));
});
test("each tool keeps to the poses it was made for", () => {
  const at = (held: string | null, asked: string | null) =>
    stageOf("workshop", "v0.14", held, asked);
  assert.equal(at("hammer", "work").clip, "hammer-work");
  // A pose the tool has no grip for moves to the tool's first.
  assert.equal(at("hammer", "hello").clip, "hammer-carry");
  assert.equal(at("laptop", "work").clip, "present");
  assert.equal(at("none", "carry").clip, "hello");
  // An old address keeps its laptop, and asking for empty hands really is empty.
  assert.deepEqual(at(null, "present").tool, "laptop");
  assert.deepEqual(at("none", "present").tool, "none");
  for (const input of ["__proto__", "<script>", "WRENCH"])
    assert.equal(at(input, "hello").tool, "none");
});
test("tools stay where the model has them, and old hosts see what they always did", () => {
  for (const key of ["librarian", "trail", "concert"] as const) {
    const now = stageOf(key, "v0.14", "hammer", "work");
    assert.equal(now.tool, "none");
    assert.equal(now.clip, "present");
  }
  const old = stageOf("workshop", "v0.10", "hammer", "work");
  assert.equal(old.tool, "none");
  assert.equal(old.clip, "present");
  assert.equal(
    posterPath("workshop", "work", "/character/", "v0.14", "drill"),
    "/character/v0.14/poses/workshop-drill-work.webp",
  );
  assert.equal(
    posterPath("librarian", "hello", "/character/", "v0.14"),
    "/character/v0.14/poses/librarian-present.webp",
  );
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
