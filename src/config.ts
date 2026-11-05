/** Every model the component can draw, oldest first. Older files stay published. */
export const VERSIONS = ["v0.15", "v0.16", "v0.17"] as const;
export type Version = (typeof VERSIONS)[number];
/** `version="latest"`, or no version at all, asks for the newest model. */
export const LATEST = "latest";
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
  check: { label: "Check", frame: 1 },
  hold: { label: "Hold up", frame: 1 },
  read: { label: "Read", frame: 1 },
  sip: { label: "Sip", frame: 1 },
  speak: { label: "Speak", frame: 1 },
  throw: { label: "Throw", frame: 1 },
} as const;
const HAND_TOOL_POSES = ["carry", "show", "work"] as const;
const EMPTY_HANDS = { label: "Empty hands" };
const MUG = { id: "mug", label: "Mug", poses: ["carry", "sip"] } as const;
const BATON = {
  id: "baton",
  label: "Kubb baton",
  poses: ["carry", "throw"],
} as const;
export type Pose = keyof typeof POSES;
export type ToolPose = keyof typeof TOOL_POSES;
export type AnyPose = Pose | ToolPose;
export const ALL_POSES = { ...POSES, ...TOOL_POSES } as const;
/**
 * One thing he can have with him. The model has a mesh for it, named
 * Thingy_Accessory_<id>. `poses` keeps it to the poses it was made for, and
 * `absent` names the mesh that takes its place when it comes off.
 */
export type Accessory = {
  id: string;
  label: string;
  poses?: readonly AnyPose[];
  absent?: string;
  /** Held in both hands, so his arms can't drift apart while he has it. */
  steady?: boolean;
};
/**
 * A place for accessories, of which he has one at a time. With `empty` he can
 * have none of them, and the page offers that as a choice. With no `empty` and one
 * accessory, the page offers it as on or off. `standard` is what he has unless
 * told otherwise.
 */
export type Slot = {
  id: string;
  options: readonly Accessory[];
  empty?: { label: string; poses?: readonly AnyPose[] };
  standard?: string;
};
/**
 * Where he is, what he is wearing there, and what he can have with him. To add a
 * scene, add it here and publish a model with its name: the page and the embed
 * offer whatever this says.
 */
export type Scene = {
  label: string;
  /** Has a still for each pose. Any other scene's only still is `present`. */
  posedStills?: boolean;
  /** The first model with this scene. An older model has only what it was made with. */
  since?: Version;
  slots: readonly Slot[];
};
export const SCENES = {
  library: {
    label: "Library",
    posedStills: true,
    slots: [
      {
        id: "hand",
        empty: EMPTY_HANDS,
        options: [
          { id: "book", label: "Book", poses: ["read", "show"], steady: true },
          MUG,
        ],
      },
    ],
  },
  outdoors: {
    label: "Outdoors",
    slots: [
      {
        id: "pack",
        standard: "backpack",
        options: [{ id: "backpack", label: "Backpack" }],
      },
      {
        id: "head",
        options: [{ id: "helmet", label: "Bike helmet" }],
      },
      {
        id: "neck",
        options: [{ id: "camera", label: "Camera" }],
      },
      {
        id: "hand",
        options: [BATON],
      },
    ],
  },
  workshop: {
    label: "Workshop",
    posedStills: true,
    slots: [
      {
        id: "hand",
        empty: {
          label: "Empty hands",
          poses: ["hello", "thinking", "rest"],
        },
        options: [
          { id: "screwdriver", label: "Screwdriver", poses: HAND_TOOL_POSES },
          { id: "hammer", label: "Hammer", poses: HAND_TOOL_POSES },
          { id: "drill", label: "Drill", poses: HAND_TOOL_POSES },
          { id: "laptop", label: "Laptop", poses: ["present", "work"] },
          {
            id: "plate",
            label: "3D Printing",
            poses: ["carry", "show"],
            steady: true,
          },
          MUG,
          { id: "candle", label: "Candle", poses: ["carry", "show"] },
        ],
      },
    ],
  },
  concert: {
    label: "Concert",
    slots: [
      {
        id: "ears",
        standard: "headphones",
        options: [{ id: "headphones", label: "Headphones", absent: "ears" }],
      },
      {
        id: "neck",
        options: [{ id: "scarf", label: "Scarf" }],
      },
      {
        id: "hand",
        empty: EMPTY_HANDS,
        options: [
          { id: "phone", label: "iPhone", poses: ["check", "hold"] },
          { id: "mic", label: "Microphone", poses: ["speak", "hold"] },
        ],
      },
    ],
  },
  kitchen: {
    label: "Kitchen",
    since: "v0.17",
    slots: [
      {
        id: "hand",
        empty: EMPTY_HANDS,
        options: [
          { id: "tongs", label: "Tongs", poses: ["carry", "work"] },
          { id: "whisk", label: "Whisk", poses: ["carry", "work"] },
          MUG,
        ],
      },
      {
        id: "grill",
        options: [{ id: "grill", label: "Grill" }],
      },
    ],
  },
  winter: {
    label: "Winter",
    since: "v0.17",
    slots: [
      {
        id: "neck",
        standard: "scarf",
        options: [{ id: "scarf", label: "Scarf" }],
      },
      {
        id: "head",
        options: [{ id: "hat", label: "Stocking hat" }],
      },
    ],
  },
  cabin: {
    label: "Cabin",
    since: "v0.17",
    slots: [
      {
        id: "hand",
        empty: EMPTY_HANDS,
        options: [BATON, MUG],
      },
    ],
  },
} as const satisfies Record<string, Scene>;
export type SceneKey = keyof typeof SCENES;
export const SCENE_KEYS = Object.keys(SCENES) as SceneKey[];
export type CharacterState = {
  scene: SceneKey;
  pose: Pose;
  light: boolean;
  motion: boolean;
};
export function scene(
  value: string | null | undefined,
  version: Version = VERSIONS.at(-1)!,
): SceneKey {
  if (!value || !Object.hasOwn(SCENES, value)) return "library";
  const since = (SCENES[value as SceneKey] as Scene).since;
  return since && VERSIONS.indexOf(version) < VERSIONS.indexOf(since)
    ? "library"
    : (value as SceneKey);
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
const slotsOf = (key: SceneKey): readonly Slot[] => SCENES[key].slots;
/** Every accessory a scene has, with the slot it goes in. */
export function accessoriesIn(key: SceneKey): (Accessory & { slot: Slot })[] {
  return slotsOf(key).flatMap((slot) =>
    slot.options.map((option) => ({ ...option, slot })),
  );
}
/**
 * What an `accessories` value asks for in this scene: a comma list, or `none`.
 * Anything a scene doesn't have is dropped, and a slot keeps its first. With
 * no value at all he has what the scene gives him.
 */
export function accessories(
  key: SceneKey,
  value: string | null | undefined,
): string[] {
  if (value == null)
    return slotsOf(key).flatMap((slot) =>
      slot.standard ? [slot.standard] : [],
    );
  const asked = value.split(",").map((word) => word.trim());
  return slotsOf(key).flatMap((slot) => {
    const held = slot.options.find((option) => asked.includes(option.id));
    return held ? [held.id] : [];
  });
}
/** An `accessories` value: never empty, because no value means something else. */
export function accessoriesValue(held: readonly string[]): string {
  return held.length ? held.join(",") : "none";
}
/**
 * What he is actually doing, given what was asked. An accessory can have its own
 * poses, so asking for another moves to its first. With no accessory named, `present`
 * in the Workshop brings the laptop, the one thing he presents with.
 */
export function stageOf(
  key: SceneKey,
  wantedAccessories: string | null | undefined,
  wantedPose: string | null | undefined,
): { accessories: string[]; pose: AnyPose; clip: string; frame: number } {
  const asked = anyPose(wantedPose);
  let held = accessories(key, wantedAccessories);
  if (wantedAccessories == null && !posesFor(key, held).includes(asked)) {
    const fits = accessoriesIn(key).find((item) => item.poses?.includes(asked));
    // It goes in its own slot, and whatever else he has stays on.
    if (fits)
      held = slotsOf(key).flatMap((slot) => {
        if (slot === fits.slot) return [fits.id];
        return held.filter((id) => slot.options.some((o) => o.id === id));
      });
  }
  const offered = posesFor(key, held);
  const chosen = offered.includes(asked) ? asked : offered[0]!;
  const tool = accessoriesIn(key).find(
    (item) => held.includes(item.id) && item.poses,
  );
  return {
    accessories: held,
    pose: chosen,
    clip: chosen in TOOL_POSES ? `${tool!.id}-${chosen}` : chosen,
    frame: ALL_POSES[chosen].frame,
  };
}
/** The poses a page may offer, given what he has with him. */
export function posesFor(key: SceneKey, held: readonly string[]): AnyPose[] {
  const limited = accessoriesIn(key).find(
    (item) => held.includes(item.id) && item.poses,
  );
  if (limited) return [...limited.poses!];
  const empty = slotsOf(key).find(
    (slot) =>
      slot.empty?.poses && !slot.options.some((o) => held.includes(o.id)),
  );
  return [...(empty?.empty?.poses ?? (Object.keys(POSES) as Pose[]))];
}
/** The accessory meshes to show, by name, given what he has with him. */
export function shownNodes(key: SceneKey, held: readonly string[]): string[] {
  return accessoriesIn(key).flatMap((item) =>
    held.includes(item.id)
      ? [`Thingy_Accessory_${item.id}`]
      : item.absent
        ? [`Thingy_Accessory_${item.absent}`]
        : [],
  );
}
export function face(value: string | null | undefined): string {
  return value && Object.hasOwn(FACES, value) ? value : "original";
}
/** glTF texture space starts at the atlas's top left. */
export function faceOffset(cell: number): [number, number] {
  const { columns, rows } = FACE_ATLAS;
  return [(cell % columns) / columns, Math.floor(cell / columns) / rows];
}
export function modelVersion(value: string | null | undefined): Version {
  return (VERSIONS as readonly string[]).includes(value ?? "")
    ? (value as Version)
    : VERSIONS.at(-1)!;
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
/** What an embed can say. */
export type EmbedState = Omit<CharacterState, "pose"> & {
  pose: AnyPose;
  version?: string;
  accessories?: readonly string[];
  face?: string;
  view?: string;
};
/** The published size of each scene on the newest model, as a page offers it. */
export const MODEL_WEIGHT: Record<SceneKey, string> = {
  library: "2.6 MB",
  outdoors: "2.4 MB",
  workshop: "3.0 MB",
  concert: "2.5 MB",
  kitchen: "2.3 MB",
  winter: "2.2 MB",
  cabin: "2.1 MB",
};
export function embedURL(
  state: EmbedState,
  origin = "https://thingy.thingelstad.xyz",
): string {
  const url = new URL("/embed/", origin);
  const search = new URLSearchParams();
  if (state.version) search.set("version", state.version);
  search.set("scene", state.scene);
  // The scene's own accessories need no saying, unless it is a pose that brings them.
  if (
    state.accessories &&
    state.accessories.join() !==
      stageOf(state.scene, null, state.pose).accessories.join()
  )
    search.set("accessories", accessoriesValue(state.accessories));
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
  return `<iframe src="${embedURL(state)}" title="Thingy, ${SCENES[state.scene].label}" width="360" height="400" loading="lazy" style="border:0;background:transparent"></iframe>\n${CREDIT}`;
}
/** Stills newer than the first model that drew Scenes. An older model has `present`. */
const STILL_SINCE: Record<string, Version> = {
  "laptop-work": "v0.16",
  "plate-carry": "v0.16",
  "plate-show": "v0.16",
  "mug-carry": "v0.17",
  "mug-sip": "v0.17",
  "book-read": "v0.17",
  "book-show": "v0.17",
  "candle-carry": "v0.17",
  "candle-show": "v0.17",
};
export function posterPath(
  key: SceneKey,
  selected: AnyPose = "present",
  base = "/character/",
  version: Version = VERSIONS.at(-1)!,
  held?: string | null,
): string {
  const scene: Scene = SCENES[key];
  const { clip } = stageOf(key, held, selected);
  const since = STILL_SINCE[clip];
  const hasStill =
    scene.posedStills &&
    (!since || VERSIONS.indexOf(version) >= VERSIONS.indexOf(since));
  return `${base}${version}/poses/${key}-${hasStill ? clip : "present"}.webp`;
}
