import assert from "node:assert/strict";
import { test } from "node:test";
import { gaze, poseEase, softLimit } from "../src/life";

test("a pose change starts and ends exactly on its poses", () => {
  for (const settle of [0, 0.5, 1.6]) {
    assert.equal(poseEase(0, settle), 0);
    assert.equal(poseEase(1, settle), 1);
  }
});

test("settling goes past the pose, and no settling never does", () => {
  const samples = (settle: number) =>
    Array.from({ length: 101 }, (_, index) => poseEase(index / 100, settle));
  assert.ok(Math.max(...samples(1)) > 1);
  assert.ok(Math.max(...samples(0)) <= 1);
});

test("a turn never reaches past its limit, and no limit means no turn", () => {
  assert.ok(Math.abs(softLimit(10, 0.4)) <= 0.4);
  assert.equal(softLimit(1, 0), 0);
  assert.equal(softLimit(0, 0.4), 0);
});

test("he looks where he can see, and gives up behind himself", () => {
  const ahead = gaze(0, 0, 1);
  assert.equal(ahead.yaw, 0);
  assert.equal(ahead.attention, 1);
  assert.ok(gaze(1, 0, 0.2).yaw > 0, "his left is positive");
  assert.ok(gaze(0, 1, 1).pitch > 0, "up is positive");
  assert.equal(gaze(0, 0, -1).attention, 0);
});
