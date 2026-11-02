import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  outfit,
  pose,
  embedURL,
  iframeCode,
  OUTFITS,
  POSES,
  posterPath,
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
