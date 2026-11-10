import type { SceneKey } from "./config";
import { VOICE_FILES } from "./voice-files";

/**
 * What Thingy says in each scene on his home, written for it (persona/THINGY.md,
 * How he sounds) and recorded once in his voice. Nothing here is generated at
 * run time: each line is a recording in `public/voice/`, named by WT Builder's
 * piece key for the words it says (`voice-files.ts`, written by
 * `tools/render-voice.ts`), so a changed line without a new recording fails the
 * tests. `say` is what the synthesizer read, when it differs from the words
 * shown.
 *
 * The lines state nothing that goes out of date (no counts, no nonprofit by
 * name) and nothing Jamie has not published: being along adds no facts. Each
 * scene ends on a question for Ask Thingy whose answer is in the archive,
 * checked when it was written.
 */
export const VOICE = { model: "tts-1-hd", voice: "nova", speed: 1 } as const;

export interface Line {
  text: string;
  say?: string;
}
export interface SceneVoice {
  lines: readonly [Line, Line, Line];
  ask: string;
}

export const SCENE_VOICE: Record<SceneKey, SceneVoice> = {
  library: {
    lines: [
      {
        text: "Every Weekly Thing is on these shelves, back to the first one in May 2017. The blog goes back further.",
      },
      {
        text: "I keep the card catalog. The words on the shelves are Jamie’s, and I quote them exactly.",
      },
      {
        text: "Give me a topic and I’ll show you when Jamie first wrote about it, and when he came back to it.",
      },
    ],
    ask: "What was in the first Weekly Thing?",
  },
  workshop: {
    lines: [
      {
        text: "Everything on this bench has its own page on Things I’ve Built, with when it started and how it’s going.",
      },
      {
        text: "Active or retired is Jamie’s call. I write down what he decides.",
      },
      {
        text: "Sawdust is optional in here. Dates and sources are not.",
      },
    ],
    ask: "Why is Jamie’s shower a game of Tetris?",
  },
  concert: {
    lines: [
      {
        text: "This is a benefit show. Supporting Members give through the newsletter, and every dollar goes to this year’s nonprofit.",
      },
      {
        text: "When Jamie and his family go to a show, I’m along, headphones on.",
      },
      {
        text: "I can’t carry a tune. I can find the concerts Jamie has written about.",
      },
    ],
    ask: "Which bands has Jamie seen live?",
  },
  outdoors: {
    lines: [
      {
        text: "Daypack on. Wherever the trail goes, I’m along.",
      },
      {
        text: "Out here I leave the telling to Jamie. When he writes up a hike, I file it.",
      },
      {
        text: "Trail maps are his department. Finding the old trip reports is mine.",
      },
    ],
    ask: "Where has Jamie gone hiking?",
  },
  kitchen: {
    lines: [
      {
        text: "Apron on. I can’t taste a thing, so I stick to what Jamie wrote about it.",
      },
      {
        text: "Grill’s going. I’m on tongs and trivia.",
      },
      {
        text: "Jamie has written about his morning coffee for more than a decade. I’ve read every cup.",
      },
    ],
    ask: "How does Jamie make his morning coffee?",
  },
  winter: {
    lines: [
      {
        text: "Mittens on. Short days in Minnesota are good for long reads.",
      },
      {
        text: "Snow outside. The archive stays open.",
      },
      {
        text: "Jamie, in WT279: “I don’t mind the cold of winter but I do miss the sun.”",
        say: "Jamie, in Weekly Thing 279: “I don’t mind the cold of winter but I do miss the sun.”",
      },
    ],
    ask: "How does Jamie feel about Minnesota winters?",
  },
  cabin: {
    lines: [
      {
        text: "Flannel on. If the family’s at the cabin, so am I.",
      },
      {
        text: "The lake gets the daylight. The archive can wait until dark.",
      },
      {
        text: "I leave the swimming to the family. I’ll be by the fire with the archive.",
      },
    ],
    ask: "What does Jamie’s family do at the cabin?",
  },
};

/** The words the synthesizer read for a line. */
export const spoken = (line: Line): string => line.say ?? line.text;

/** Its recording, or none if it has not been recorded. */
export function recording(line: Line): string | undefined {
  const file = VOICE_FILES[spoken(line)];
  return file ? `/voice/${file}` : undefined;
}

/** Ask Thingy with the question in the box. The reader sends it. */
export function askAddress(question: string): string {
  return `https://thingy.thingelstad.com/chat/?prompt=${encodeURIComponent(question)}&ref=character-speech`;
}
