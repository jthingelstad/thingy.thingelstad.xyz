/**
 * Record Thingy's scene lines (src/voice.ts) in his voice, once.
 *
 *   node --import tsx tools/render-voice.ts <path to wt-builder>
 *
 * WT Builder speaks for him everywhere, so this borrows its speaker rather than
 * keeping a second one: its synthesizer call and key, its piece key (the file
 * name), its pronunciations and its transcriber. Its own settings load its
 * credentials; nothing secret passes through here or is printed.
 *
 * Only lines without a recording are spoken, so a run costs a fraction of a
 * cent per new line. The synthesizer sometimes returns silence or drops a final
 * sentence, so each recording is heard back before it is kept: it must have
 * sound in it and end on the line's own last words, or it is spoken again.
 * Recordings no line uses any more are deleted. Writes public/voice/ and
 * src/voice-files.ts.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { SCENE_VOICE, VOICE, spoken } from "../src/voice";

const builder = process.argv[2];
if (
  !builder ||
  !existsSync(join(builder, "src/server/integrations/audio.ts"))
) {
  console.error(
    "usage: node --import tsx tools/render-voice.ts <path to wt-builder>",
  );
  process.exit(2);
}
const from = (path: string) => import(resolve(builder, path));
const audio = await from("src/server/integrations/audio.ts");
const { pronounce } = await from("src/shared/render/speech.ts");
const { transcribe } = await from("src/server/podcast/transcribe.ts");

// His voice is WT Builder's to change; this file only records in it.
for (const [name, ours, theirs] of [
  ["model", VOICE.model, audio.TTS_MODEL],
  ["voice", VOICE.voice, audio.THINGY_VOICE],
  ["speed", VOICE.speed, audio.TTS_SPEED],
] as const)
  if (ours !== theirs) {
    console.error(
      `src/voice.ts says ${name} ${ours}; WT Builder says ${theirs}`,
    );
    process.exit(1);
  }

const out = "public/voice";
mkdirSync(out, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "thingy-voice-"));
const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
// ffmpeg reports the peak on stderr, and exits 0.
const peakDb = (path: string): number => {
  const report = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-i",
      path,
      "-af",
      "volumedetect",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  ).stderr;
  return Number(/max_volume:\s*(-?[\d.]+) dB/.exec(report)?.[1] ?? -Infinity);
};
const seconds = (path: string): number =>
  Number(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        path,
      ],
      { encoding: "utf8" },
    ),
  );

const files: Record<string, string> = {};
try {
  for (const [scene, { lines }] of Object.entries(SCENE_VOICE))
    for (const line of lines) {
      const text = pronounce(spoken(line));
      const file = `${audio.pieceKey(text, audio.THINGY_VOICE)}.mp3`;
      files[spoken(line)] = file;
      if (existsSync(join(out, file))) {
        console.log(`kept   ${scene}  ${file}`);
        continue;
      }
      for (let attempt = 1; ; attempt += 1) {
        const mp3: Buffer = await audio.speak(text, {
          voice: audio.THINGY_VOICE,
          speed: audio.TTS_SPEED,
        });
        const trial = join(work, file);
        writeFileSync(trial, mp3);
        const length = seconds(trial);
        const heard = await transcribe(trial, length);
        // The last sentence is what the synthesizer drops, so most of its words
        // must be heard at the end. Most, not all: the transcriber spells a
        // homophone its own way ("long reads" comes back "long reeds").
        const last = words(text.split(/(?<=[.!?”])\s+/).at(-1)!);
        const tail = new Set(words(heard).slice(-last.length - 2));
        const found = last.filter((word) => tail.has(word)).length;
        const whole =
          peakDb(trial) > audio.SILENT_DB && found >= last.length * 0.75;
        console.log(
          `${whole ? "made  " : "again "} ${scene}  ${file}  ${length.toFixed(1)} s  ${(mp3.length / 1024).toFixed(0)} KB\n         said:  ${text}\n         heard: ${heard.trim()}`,
        );
        if (whole) {
          writeFileSync(join(out, file), mp3);
          break;
        }
        if (attempt === 3)
          throw new Error(`three tries and no whole recording of: ${text}`);
      }
    }
} finally {
  rmSync(work, { recursive: true, force: true });
}

const used = new Set(Object.values(files));
for (const name of readdirSync(out))
  if (!used.has(name)) {
    rmSync(join(out, name));
    console.log(`removed ${name}`);
  }
writeFileSync(
  "src/voice-files.ts",
  `// Written by tools/render-voice.ts: each line's words, as the synthesizer read
// them, and its recording in public/voice/. Do not edit by hand.
export const VOICE_FILES: Record<string, string> = ${JSON.stringify(files, null, 2)};
`,
);
console.log(`${used.size} recordings in ${out}`);
