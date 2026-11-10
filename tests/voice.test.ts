import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { SCENES } from "../src/config";
import {
  SCENE_VOICE,
  VOICE,
  askAddress,
  recording,
  spoken,
} from "../src/voice";
import { VOICE_FILES } from "../src/voice-files";

const lines = Object.values(SCENE_VOICE).flatMap((scene) => scene.lines);

test("every scene has three lines and a question for Ask Thingy", () => {
  assert.deepEqual(Object.keys(SCENE_VOICE).sort(), Object.keys(SCENES).sort());
  for (const [id, scene] of Object.entries(SCENE_VOICE)) {
    assert.equal(scene.lines.length, 3, id);
    assert.match(scene.ask, /^[A-Z].*\?$/, id);
  }
  // A line repeated becomes a tic (persona, How he sounds on the page).
  assert.equal(new Set(lines.map((line) => line.text)).size, lines.length);
});

test("each line is short, and says nothing he does not say", () => {
  // persona/THINGY.md, Words he does not use, and no economic frame.
  const never =
    /fascinating|remarkable|deep cut|happy to help|feel free|let me know|would you like|level up|don.t miss|hustle|side project|startup|monetize|growth|amazing|incredible|best/i;
  for (const text of [
    ...lines.map((line) => line.text),
    ...Object.values(SCENE_VOICE).map((scene) => scene.ask),
  ]) {
    assert.ok(text.length <= 120, `too long to say in passing: ${text}`);
    assert.doesNotMatch(text, never, text);
    assert.doesNotMatch(text, /[!]|#\d/, text);
  }
});

test("what is shown is what is said, with WT Builder's one respelling", () => {
  // Spoken, "WT279" is the issue's name (WT Builder, speakable()).
  for (const line of lines)
    assert.equal(
      spoken(line),
      line.text.replace(/\bWT(\d{1,4})\b/g, "Weekly Thing $1"),
      line.text,
    );
});

test("every line has its own recording, named by WT Builder's piece key", () => {
  // WT Builder's pieceKey(): what is said, by whom, how.
  const key = (text: string) =>
    createHash("sha256")
      .update(`${VOICE.model}|${VOICE.voice}|${VOICE.speed}|${text}`)
      .digest("hex")
      .slice(0, 32);
  const files = readdirSync("public/voice").filter(
    (name) => name !== ".DS_Store",
  );
  for (const line of lines) {
    const file = `${key(spoken(line))}.mp3`;
    assert.equal(
      VOICE_FILES[spoken(line)],
      file,
      `not recorded since it changed (tools/render-voice.ts): ${line.text}`,
    );
    assert.equal(recording(line), `/voice/${file}`);
    assert.ok(files.includes(file), file);
    const bytes = readFileSync(`public/voice/${file}`);
    // An MP3 opens with an ID3 tag or a frame sync.
    assert.ok(
      bytes.subarray(0, 3).toString() === "ID3" ||
        (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0),
      `${file} is not an MP3`,
    );
    assert.ok(bytes.length < 200 * 1024, `${file}: over the size of a line`);
  }
  assert.deepEqual(
    files.sort(),
    [...new Set(Object.values(VOICE_FILES))].sort(),
    "a recording no line uses",
  );
  assert.equal(Object.keys(VOICE_FILES).length, lines.length);
});

test("a question opens Ask Thingy with the words in the box", () => {
  const url = new URL(askAddress("What does Jamie’s family do at the cabin?"));
  assert.equal(url.origin, "https://thingy.thingelstad.com");
  assert.equal(url.pathname, "/chat/");
  assert.equal(
    url.searchParams.get("prompt"),
    "What does Jamie’s family do at the cabin?",
  );
  // Ask Thingy's analytics see which of Jamie's sites sent the reader.
  assert.equal(url.searchParams.get("ref"), "character-speech");
});
