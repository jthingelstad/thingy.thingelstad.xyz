export const VERSION = "v0.10";
/** Every published model, oldest first. An outfit a version lacks stays on VERSION. */
export const VERSIONS = {
  "v0.10": ["librarian", "trail", "workshop", "concert"],
  "v0.14": ["librarian", "trail", "workshop", "concert"],
} as const;
export type Version = keyof typeof VERSIONS;
/** `version="latest"` asks for the newest model that outfit has. */
export const LATEST = "latest";
export const OUTFITS = {
  librarian: {
    label: "Librarian",
    description:
      "Navy wool, an orange bow tie, and a pocket full of useful things.",
  },
  trail: {
    label: "Trail companion",
    description: "A forest-green shell, a daypack, and room for another route.",
  },
  workshop: {
    label: "Workshop Builder",
    description: "Canvas, rolled sleeves, and something to show you.",
  },
  concert: {
    label: "Concert companion",
    description: "Headphones on. Listening closely.",
  },
} as const;
export const POSES = {
  hello: { label: "Hello", frame: 49 },
  present: { label: "Present", frame: 1 },
  thinking: { label: "Thinking", frame: 37 },
  rest: { label: "At rest", frame: 1 },
} as const;
/**
 * The screen faces of models that have one (v0.14 on), by atlas cell. `blink`
 * is the same face with its eyes shut; a face without one never blinks.
 */
export const FACE_ATLAS = { columns: 4, rows: 5 } as const;
export const FACES: Record<string, { cell: number; blink?: number }> = {
  original: { cell: 0, blink: 5 },
  idle: { cell: 1, blink: 6 },
  thinking: { cell: 2 },
  "found-it": { cell: 3 },
  oops: { cell: 4 },
  off: { cell: 7 },
  delighted: { cell: 8 },
  curious: { cell: 9, blink: 14 },
  proud: { cell: 10 },
  eager: { cell: 11, blink: 15 },
  sympathetic: { cell: 12, blink: 16 },
  sheepish: { cell: 13 },
};
/**
 * The faces a person may choose, in the order they are offered, with what each is
 * for (persona/THINGY.md). `off` is a real cell, but it is never shown to a reader.
 */
export const FACE_CHOICES: Record<string, { label: string; note: string }> = {
  original: { label: "Original", note: "The illustration’s wink." },
  idle: { label: "Idle", note: "Ready and listening." },
  thinking: { label: "Thinking", note: "At work." },
  "found-it": { label: "Found it", note: "He found something real." },
  delighted: { label: "Delighted", note: "A connection found." },
  curious: { label: "Curious", note: "A question he is turning over." },
  proud: { label: "Proud", note: "Showing something Jamie built." },
  eager: { label: "Eager", note: "Making the case for membership." },
  sympathetic: { label: "Sympathetic", note: "A hard subject." },
  sheepish: {
    label: "Sheepish",
    note: "He got something wrong and is fixing it.",
  },
  oops: { label: "Oops", note: "Something went wrong on his side." },
};
/** The poses a hand tool is made for: its grip is solved for these and no others. */
export const TOOL_POSES = {
  carry: { label: "Carry", frame: 1 },
  show: { label: "Show", frame: 1 },
  work: { label: "Work", frame: 1 },
} as const;
const HAND_TOOL_POSES = ["carry", "show", "work"] as const;
export const TOOLS = {
  none: { label: "Empty hands", poses: ["hello", "thinking", "rest"] },
  screwdriver: { label: "Screwdriver", poses: HAND_TOOL_POSES },
  hammer: { label: "Hammer", poses: HAND_TOOL_POSES },
  drill: { label: "Drill", poses: HAND_TOOL_POSES },
  laptop: { label: "Laptop", poses: ["present"] },
} as const;
export type Outfit = keyof typeof OUTFITS;
export type Pose = keyof typeof POSES;
export type ToolPose = keyof typeof TOOL_POSES;
export type AnyPose = Pose | ToolPose;
export type Tool = keyof typeof TOOLS;
export const ALL_POSES = { ...POSES, ...TOOL_POSES } as const;
export type CharacterState = {
  outfit: Outfit;
  pose: Pose;
  light: boolean;
  motion: boolean;
};
export function outfit(value: string | null | undefined): Outfit {
  return value && Object.hasOwn(OUTFITS, value)
    ? (value as Outfit)
    : "librarian";
}
export function pose(value: string | null | undefined): Pose {
  return value && Object.hasOwn(POSES, value) ? (value as Pose) : "present";
}
/** Anything a pose attribute may say, for a model that may have tools. */
export function anyPose(value: string | null | undefined): AnyPose {
  return value && Object.hasOwn(ALL_POSES, value)
    ? (value as AnyPose)
    : "present";
}
export function tool(value: string | null | undefined): Tool {
  return value && Object.hasOwn(TOOLS, value) ? (value as Tool) : "none";
}
/** Only the v0.14 Workshop Builder has tools he can change in the browser. */
export function hasTools(key: Outfit, version: Version): boolean {
  return key === "workshop" && version !== "v0.10";
}
/**
 * What he is actually doing, given what was asked. A tool has its own poses, so
 * asking for another moves to the tool's first. With no tool named, `present` is
 * the laptop, as it always has been on the Workshop Builder.
 */
export function stageOf(
  key: Outfit,
  version: Version,
  wantedTool: string | null | undefined,
  wantedPose: string | null | undefined,
): { tool: Tool; pose: AnyPose; clip: string; frame: number } {
  const asked = anyPose(wantedPose);
  if (!hasTools(key, version)) {
    const still = Object.hasOwn(POSES, asked) ? (asked as Pose) : "present";
    return {
      tool: "none",
      pose: still,
      clip: still,
      frame: POSES[still].frame,
    };
  }
  const held =
    wantedTool == null && asked === "present" ? "laptop" : tool(wantedTool);
  const poses: readonly AnyPose[] = TOOLS[held].poses;
  const chosen = poses.includes(asked) ? asked : poses[0];
  return {
    tool: held,
    pose: chosen,
    clip: chosen in TOOL_POSES ? `${held}-${chosen}` : chosen,
    frame: ALL_POSES[chosen].frame,
  };
}
export function face(value: string | null | undefined): string {
  return value && Object.hasOwn(FACES, value) ? value : "original";
}
/** glTF texture space starts at the atlas's top left. */
export function faceOffset(cell: number): [number, number] {
  const { columns, rows } = FACE_ATLAS;
  return [(cell % columns) / columns, Math.floor(cell / columns) / rows];
}
export function modelVersion(
  value: string | null | undefined,
  key: Outfit,
): Version {
  if (value === LATEST)
    return (Object.keys(VERSIONS) as Version[])
      .filter((version) =>
        (VERSIONS[version] as readonly string[]).includes(key),
      )
      .at(-1) as Version;
  return value &&
    Object.hasOwn(VERSIONS, value) &&
    (VERSIONS[value as Version] as readonly string[]).includes(key)
    ? (value as Version)
    : VERSION;
}
/** Where the camera stands: degrees round him, degrees from straight above, zoom. */
export type View = { azimuth: number; polar: number; zoom: number };
export const VIEW_LIMITS = {
  polar: [32.4, 113.4],
  zoom: [0.65, 2.4],
} as const;
const clamp = (value: number, [low, high]: readonly [number, number]): number =>
  Math.min(Math.max(value, low), high);
/** A view as an address writes it, short enough to read: `40,83,1.2`. */
export function viewValue({ azimuth, polar, zoom }: View): string {
  const round = Math.round(azimuth);
  const turned = ((((round + 180) % 360) + 360) % 360) - 180;
  return `${turned},${Math.round(polar)},${Number(zoom.toFixed(2))}`;
}
/** Addresses are untrusted: anything else means no view, and limits always hold. */
export function parseView(value: string | null | undefined): View | null {
  const match =
    /^(-?\d{1,3}(?:\.\d+)?),(\d{1,3}(?:\.\d+)?),(\d(?:\.\d+)?)$/.exec(
      value ?? "",
    );
  if (!match) return null;
  return {
    azimuth: Number(match[1]),
    polar: clamp(Number(match[2]), VIEW_LIMITS.polar),
    zoom: clamp(Number(match[3]), VIEW_LIMITS.zoom),
  };
}
/** Where he stands until someone turns him. */
export const HOME_CAMERA = {
  position: [3.5, 3, 12],
  target: [0, 1.38, 0],
} as const;
export const HOME_VIEW = viewValue({
  azimuth:
    (Math.atan2(HOME_CAMERA.position[0], HOME_CAMERA.position[2]) * 180) /
    Math.PI,
  polar:
    (Math.atan2(
      Math.hypot(HOME_CAMERA.position[0], HOME_CAMERA.position[2]),
      HOME_CAMERA.position[1] - HOME_CAMERA.target[1],
    ) *
      180) /
    Math.PI,
  zoom: 1,
});
/** What an embed can say. With no `version` it stays v0.10, as it always has. */
export type EmbedState = Omit<CharacterState, "pose"> & {
  pose: AnyPose;
  version?: string;
  tool?: Tool;
  face?: string;
  view?: string;
};
/** The published size of each outfit on the newest model, as a page offers it. */
export const MODEL_WEIGHT: Record<Outfit, string> = {
  librarian: "2.5 MB",
  trail: "1.7 MB",
  workshop: "2.1 MB",
  concert: "1.8 MB",
};
export function embedURL(
  state: EmbedState,
  origin = "https://thingy.thingelstad.xyz",
): string {
  const url = new URL("/embed/", origin);
  const search = new URLSearchParams();
  if (state.version) search.set("version", state.version);
  search.set("outfit", state.outfit);
  if (state.tool && state.tool !== "none") search.set("tool", state.tool);
  search.set("pose", state.pose);
  if (state.face && state.face !== "original") search.set("face", state.face);
  search.set("light", state.light ? "on" : "off");
  search.set("motion", state.motion ? "on" : "off");
  if (state.view && state.view !== HOME_VIEW) search.set("view", state.view);
  url.search = search.toString();
  return url.href;
}
// The licence asks for credit, so the code a page takes carries it.
const CREDIT = `<p><small><a href="https://thingy.thingelstad.xyz/">Thingy</a> by <a href="https://www.thingelstad.com/">Jamie Thingelstad</a>, <a rel="license" href="https://creativecommons.org/licenses/by-nc/4.0/">CC BY-NC 4.0</a></small></p>`;
export function iframeCode(state: EmbedState): string {
  return `<iframe src="${embedURL(state)}" title="Thingy, ${OUTFITS[state.outfit].label}" width="360" height="400" loading="lazy" style="border:0;background:transparent"></iframe>\n${CREDIT}`;
}
export function posterPath(
  key: Outfit,
  selected: AnyPose = "present",
  base = "/character/",
  version: Version = VERSION,
  held?: string | null,
): string {
  const { clip } = stageOf(key, version, held, selected);
  return `${base}${version}/poses/${key}-${key === "workshop" ? clip : "present"}.webp`;
}
