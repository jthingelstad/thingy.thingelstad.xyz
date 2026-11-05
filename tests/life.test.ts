import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addStrain,
  gaze,
  poseEase,
  softLimit,
  STRAIN_LIMIT,
} from "../src/life";

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

test("only a machine that stays slow makes him stand still", () => {
  const run = (draws: number[]) => draws.reduce(addStrain, 0);
  const seconds = (length: number, draw: number) =>
    Array.from({ length }, () => draw);
  // A phone at 26 frames a second, the slowest real device measured so far.
  assert.equal(run(seconds(600, 1 / 26)), 0);
  // Compiling a shader can take seconds, and is one long draw.
  assert.ok(run([8]) < STRAIN_LIMIT);
  assert.ok(run([...seconds(2, 8), ...seconds(90, 1 / 60)]) === 0);
  assert.ok(run(seconds(20, 0.115)) >= STRAIN_LIMIT, "9 frames a second");
  assert.ok(run(seconds(3, 1.4)) >= STRAIN_LIMIT, "under 1 frame a second");
});
