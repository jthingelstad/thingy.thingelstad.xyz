import * as THREE from "three";
import "../../src/element";
import { LIFE_DEFAULTS, type LifeSettings } from "../../src/life";
import {
  ALL_POSES,
  FACE_CHOICES,
  SCENES,
  SCENE_KEYS,
  posesFor,
  accessories,
  type SceneKey,
} from "../../src/config";

// three's bitmap loader fetches a blob: URL, which a locked-down frame can refuse.
// Reading it as an image needs nothing the frame refuses, and gives the same bitmap.
THREE.ImageBitmapLoader.prototype.load = function (
  this: THREE.ImageBitmapLoader,
  url: string,
  onLoad?: (bitmap: ImageBitmap) => void,
  _progress?: unknown,
  onError?: (error: unknown) => void,
) {
  const image = new Image();
  image.onload = () =>
    createImageBitmap(image, {
      ...(this.options as ImageBitmapOptions),
      colorSpaceConversion: "none",
    }).then((bitmap) => onLoad?.(bitmap), onError);
  image.onerror = (error) => onError?.(error);
  image.src = url;
} as never;

type Control = {
  key: keyof LifeSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  show: (value: number) => string;
};
const seconds = (value: number) => `${value.toFixed(value < 10 ? 2 : 1)} s`;
const plain = (value: number) => value.toFixed(2);
const GROUPS: { title: string; controls: Control[] }[] = [
  {
    title: "His face",
    controls: [
      {
        key: "blinkEvery",
        label: "A blink every",
        min: 1.5,
        max: 12,
        step: 0.1,
        show: (v) => `${v.toFixed(1)} s`,
      },
      {
        key: "doubleBlink",
        label: "How often he blinks twice",
        min: 0,
        max: 0.6,
        step: 0.01,
        show: (v) => `${Math.round(v * 100)}%`,
      },
      {
        key: "faceChange",
        label: "Eyes shut between expressions",
        min: 0,
        max: 300,
        step: 5,
        show: (v) => (v ? `${v} ms` : "swap at once"),
      },
      {
        key: "reaction",
        label: "How much his head reacts",
        min: 0,
        max: 2,
        step: 0.05,
        show: plain,
      },
    ],
  },
  {
    title: "Between poses",
    controls: [
      {
        key: "blend",
        label: "Time to change pose",
        min: 0,
        max: 1.5,
        step: 0.01,
        show: (v) => (v ? seconds(v) : "snap"),
      },
      {
        key: "settle",
        label: "How far past he goes",
        min: 0,
        max: 1.6,
        step: 0.05,
        show: plain,
      },
    ],
  },
  {
    title: "Breathing",
    controls: [
      {
        key: "breath",
        label: "How much he breathes",
        min: 0,
        max: 3,
        step: 0.05,
        show: plain,
      },
      {
        key: "breathsPerMinute",
        label: "Breaths a minute",
        min: 6,
        max: 30,
        step: 1,
        show: (v) => `${v}`,
      },
    ],
  },
  {
    title: "Looking",
    controls: [
      {
        key: "look",
        label: "How far he turns",
        min: 0,
        max: 45,
        step: 1,
        show: (v) => `${v}°`,
      },
      {
        key: "lookSpeed",
        label: "How quickly he turns",
        min: 1,
        max: 14,
        step: 0.1,
        show: (v) => v.toFixed(1),
      },
      {
        key: "glance",
        label: "Glances when left alone",
        min: 0,
        max: 20,
        step: 1,
        show: (v) => (v ? `${v}°` : "none"),
      },
    ],
  },
  {
    title: "Antenna",
    controls: [
      {
        key: "antenna",
        label: "How far it swings",
        min: 0,
        max: 3,
        step: 0.05,
        show: plain,
      },
      {
        key: "antennaBounce",
        label: "Bounces a second",
        min: 1,
        max: 8,
        step: 0.1,
        show: (v) => v.toFixed(1),
      },
      {
        key: "antennaDamping",
        label: "How quickly it stops",
        min: 0.04,
        max: 0.6,
        step: 0.01,
        show: plain,
      },
    ],
  },
];

const thingy = document.querySelector("thingy-character")!;
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
let settings: LifeSettings = { ...LIFE_DEFAULTS };

const STORE = "thingy-life";
const remember = () => {
  try {
    localStorage.setItem(STORE, JSON.stringify(settings));
  } catch {
    // A private window keeps nothing, and the page works without it.
  }
};
const recalled = (): Partial<LifeSettings> => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}");
  } catch {
    return {};
  }
};

function merge(from: Record<string, unknown>): void {
  for (const key of Object.keys(LIFE_DEFAULTS) as (keyof LifeSettings)[])
    if (typeof from[key] === "number" && Number.isFinite(from[key]))
      settings[key] = from[key];
}

function drawSliders(): void {
  const holder = $("groups");
  holder.style.cssText = "display:grid;gap:22px";
  holder.replaceChildren(
    ...GROUPS.map((group) => {
      const box = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = group.title;
      box.append(legend);
      for (const control of group.controls) {
        const row = document.createElement("div");
        row.className = "slider";
        const id = `life-${control.key}`;
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = control.label;
        const output = document.createElement("output");
        output.htmlFor = id;
        output.textContent = control.show(settings[control.key]);
        const input = document.createElement("input");
        input.id = id;
        input.type = "range";
        input.min = String(control.min);
        input.max = String(control.max);
        input.step = String(control.step);
        input.value = String(settings[control.key]);
        input.addEventListener("input", () => {
          settings[control.key] = Number(input.value);
          output.textContent = control.show(settings[control.key]);
          thingy.lifeSettings = settings;
          remember();
        });
        row.append(label, output, input);
        box.append(row);
      }
      return box;
    }),
  );
}

function chip(
  label: string,
  pressed: boolean,
  press: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-pressed", String(pressed));
  button.addEventListener("click", press);
  return button;
}

function fill(id: string, chips: HTMLButtonElement[]): void {
  const row = $(id);
  const title = row.querySelector("b")!;
  row.replaceChildren(title, ...chips);
}

function drawDeck(): void {
  const scene = thingy.scene;
  fill(
    "scenes",
    SCENE_KEYS.map((key) =>
      chip(SCENES[key].label, key === scene, () => {
        thingy.removeAttribute("accessories");
        thingy.setAttribute("scene", key satisfies SceneKey);
        drawDeck();
      }),
    ),
  );
  fill(
    "poses",
    posesFor(scene, accessories(scene, thingy.getAttribute("accessories"))).map(
      (pose) =>
        chip(ALL_POSES[pose].label, pose === thingy.pose, () => {
          thingy.setAttribute("pose", pose);
          drawDeck();
        }),
    ),
  );
  fill(
    "faces",
    Object.entries(FACE_CHOICES).map(([key, choice]) =>
      chip(choice.label, key === thingy.getAttribute("face"), () => {
        thingy.setAttribute("face", key);
        drawDeck();
      }),
    ),
  );
  fill("switches", [
    chip("Life on", thingy.getAttribute("life") === "on", () => {
      thingy.setAttribute(
        "life",
        thingy.getAttribute("life") === "on" ? "off" : "on",
      );
      drawDeck();
    }),
    chip("Pose's own motion", thingy.getAttribute("motion") === "on", () => {
      thingy.setAttribute(
        "motion",
        thingy.getAttribute("motion") === "on" ? "off" : "on",
      );
      drawDeck();
    }),
  ]);
}

// Claude reads what is saved here. It is one person's private page, so a plain
// shared document is enough. Outside the viewer there is no store at all.
type Doc = {
  get(): Promise<{
    exists: boolean;
    data(): Record<string, unknown> | undefined;
  }>;
  set(data: Record<string, unknown>): Promise<void>;
};
type Store = { doc(path: string): Doc };
const claude = (
  globalThis as { claude?: { use(name: string): Promise<unknown> } }
).claude;
const store: Promise<Store | null> = claude?.use
  ? (claude.use("db") as Promise<Store | null>).catch(() => null)
  : Promise.resolve(null);

const said = (text: string) => {
  $("said").textContent = text;
};

function values(): string {
  return JSON.stringify(settings);
}

$("copy").addEventListener("click", () => {
  void navigator.clipboard
    ?.writeText(values())
    .then(() => said("Copied. Paste them to Claude."))
    .catch(() => said(values()));
});
$("reset").addEventListener("click", () => {
  settings = { ...LIFE_DEFAULTS };
  thingy.lifeSettings = settings;
  remember();
  drawSliders();
  said("Back to where Claude started.");
});
$("save").addEventListener("click", async () => {
  const db = await store;
  if (!db) {
    said(`There is no store here. Paste this to Claude: ${values()}`);
    return;
  }
  const note = $<HTMLTextAreaElement>("note").value.trim();
  const saved = { ...settings, note, savedAt: new Date().toISOString() };
  try {
    await db.doc("tuning/current").set(saved);
    await db.doc(`tuning/${Date.now()}`).set(saved);
    said("Saved. Tell Claude when you're done, and it can read these.");
  } catch (error) {
    said(`That didn't save (${String(error)}). Use Copy values instead.`);
  }
});

// Whether he loaded in this viewer, which Claude cannot see any other way.
async function report(state: Record<string, unknown>): Promise<void> {
  const db = await store;
  await db
    ?.doc("status/latest")
    .set({ ...state, at: new Date().toISOString(), agent: navigator.userAgent })
    .catch(() => undefined);
}

function complain(text: string): void {
  let box = document.querySelector<HTMLElement>(".problem");
  if (!box) {
    box = document.createElement("p");
    box.className = "problem";
    box.setAttribute("role", "status");
    document.querySelector(".stage")!.prepend(box);
  }
  box.textContent = text;
}

thingy.addEventListener("thingy-ready", (event) => {
  document.querySelector(".problem")?.remove();
  void report({
    ready: true,
    scene: (event as CustomEvent).detail.scene,
    alive: thingy.alive,
  });
  drawDeck();
});
thingy.addEventListener("thingy-fallback", () => {
  complain("Thingy's 3D model didn't load in this viewer.");
  void report({ ready: false, scene: thingy.scene });
});
window.addEventListener("error", (event) => {
  void report({ ready: false, error: String(event.message) });
});

const assetBase = new URLSearchParams(location.search).get("assets");
thingy.setAttribute(
  "asset-base",
  assetBase ?? new URL("character/", document.baseURI).href,
);
thingy.setAttribute(
  "poster",
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
);

merge(recalled());
void store.then(async (db) => {
  const saved = await db
    ?.doc("tuning/current")
    .get()
    .catch(() => null);
  if (!saved?.exists) return;
  const { note } = saved.data() ?? {};
  merge(saved.data() ?? {});
  thingy.lifeSettings = settings;
  if (typeof note === "string") $<HTMLTextAreaElement>("note").value = note;
  drawSliders();
});
thingy.lifeSettings = settings;
drawSliders();
drawDeck();
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const showReduced = () => {
  $("reduced").hidden = !reduced.matches;
};
reduced.addEventListener("change", showReduced);
showReduced();
