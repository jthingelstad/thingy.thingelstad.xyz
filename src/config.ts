export const VERSION = "v0.10";
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
export type Outfit = keyof typeof OUTFITS;
export type Pose = keyof typeof POSES;
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
export function embedURL(
  state: CharacterState,
  origin = "https://thingy.thingelstad.xyz",
): string {
  const url = new URL("/embed/", origin);
  url.search = new URLSearchParams({
    outfit: state.outfit,
    pose: state.pose,
    light: state.light ? "on" : "off",
    motion: state.motion ? "on" : "off",
  }).toString();
  return url.href;
}
export function iframeCode(state: CharacterState): string {
  return `<iframe src="${embedURL(state)}" title="Thingy, ${OUTFITS[state.outfit].label}" width="360" height="400" loading="lazy" style="border:0;background:transparent"></iframe>`;
}
export function posterPath(
  key: Outfit,
  selected: Pose = "present",
  base = "/character/",
): string {
  return `${base}${VERSION}/poses/${key}-${key === "workshop" ? selected : "present"}.webp`;
}
