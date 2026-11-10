import "./style.css";
import "./element";
import {
  ALL_POSES,
  FACES,
  FACE_ATLAS,
  FACE_CHOICES,
  HOME_VIEW,
  LATEST,
  MODEL_WEIGHT,
  SCENES,
  SCENE_LINES,
  accessoriesIn,
  accessoriesValue,
  anyPose,
  iframeCode,
  parseView,
  posesFor,
  posterPath,
  scene,
  shuffled,
  stageOf,
  type AnyPose,
  type CharacterState,
  type Slot,
} from "./config";
import { icon } from "./icons";
import { SCENE_VOICE, askAddress, recording } from "./voice";

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
for (const node of document.querySelectorAll<HTMLElement>("[data-icon]"))
  node.innerHTML = icon(node.dataset.icon!);
const params = new URLSearchParams(location.search);
const firstScene = scene(params.get("scene"));
const first = stageOf(
  firstScene,
  params.get("accessories"),
  params.get("pose"),
);
const state: Omit<CharacterState, "pose"> & {
  pose: AnyPose;
  accessories: string[];
  face: string;
  life: boolean;
} = {
  scene: firstScene,
  pose: first.pose,
  accessories: first.accessories,
  // A face must be one a reader may choose, whatever the address says.
  face: Object.hasOwn(FACE_CHOICES, params.get("face") ?? "")
    ? params.get("face")!
    : "original",
  light: params.get("light") === "on",
  motion: false,
  // He is alive here unless someone has turned it off.
  life: params.get("life") !== "off",
};
const character = $<HTMLElementTagNameMap["thingy-character"]>("#main-thingy");
// A shared link brings the angle with it. Set before the element starts.
if (parseView(params.get("view")))
  character.setAttribute("view", params.get("view")!);
const TICK =
  '<svg class="choice-tick" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4.500 4.500L19 7"/></svg>';
/** He stands in the scene's clothes on its poster, so it makes his portrait. */
const scenePortrait = (id: string): string =>
  posterPath(id as keyof typeof SCENES, "present");
$("#scene-options").innerHTML = Object.entries(SCENES)
  .map(
    ([id, item]) =>
      `<label class="scene-option"><input type="radio" name="scene" value="${id}" ${id === state.scene ? "checked" : ""}><img class="scene-thumb" src="${scenePortrait(id)}" alt="" width="40" height="40" loading="lazy"><span>${item.label}</span>${TICK}</label>`,
  )
  .join("");
const slotsHere = (): readonly Slot[] => SCENES[state.scene].slots;
/** A slot with one thing in it is on or off; a slot with several is a choice. */
function accessoryButtons(slot: Slot): string {
  const button = (id: string, label: string) =>
    `<button type="button" class="accessory-option" data-slot="${slot.id}" data-accessory="${id}" aria-pressed="false">${icon(id || "none")}<span>${label}</span>${TICK}</button>`;
  return `<div class="choice-group">${[
    ...(slot.empty ? [button("", slot.empty.label)] : []),
    ...slot.options.map((option) => button(option.id, option.label)),
  ].join("")}</div>`;
}
function syncAccessories(): void {
  const options = $("#accessory-options");
  if (options.dataset.scene !== state.scene) {
    options.innerHTML = slotsHere().map(accessoryButtons).join("");
    options.dataset.scene = state.scene;
  }
  for (const button of options.querySelectorAll<HTMLElement>(
    "[data-accessory]",
  )) {
    const id = button.dataset.accessory!;
    const slot = slotsHere().find((item) => item.id === button.dataset.slot)!;
    const heldHere = slot.options.some((o) => state.accessories.includes(o.id));
    button.setAttribute(
      "aria-pressed",
      String(id ? state.accessories.includes(id) : !heldHere),
    );
  }
}
$("#face-options").innerHTML = Object.entries(FACE_CHOICES)
  .map(([id, item]) => {
    const { cell } = FACES[id];
    const { columns, rows } = FACE_ATLAS;
    const x = ((cell % columns) / (columns - 1)) * 100;
    const y = (Math.floor(cell / columns) / (rows - 1)) * 100;
    return `<button class="face-option" data-face="${id}" aria-pressed="false" aria-label="${item.label}" title="${item.label}"><span style="background-position:${x}% ${y}%"></span></button>`;
  })
  .join("");

/** The sheet's tabs say what is chosen. */
function syncSheet(): void {
  const controls = $("#controls");
  const hasAccessories = slotsHere().length > 0;
  if (!hasAccessories && controls.dataset.tab === "accessories")
    controls.dataset.tab = "scene";
  for (const tab of document.querySelectorAll<HTMLElement>("[data-sheet-tab]"))
    tab.setAttribute(
      "aria-expanded",
      String(tab.dataset.sheetTab === controls.dataset.tab),
    );
  $('[data-sheet-tab="accessories"]').hidden = !hasAccessories;
  $("#tab-scene").textContent = SCENES[state.scene].label;
  $("#scene-line").textContent = SCENE_LINES[state.scene];
  const held = accessoriesIn(state.scene).filter((item) =>
    state.accessories.includes(item.id),
  );
  $("#tab-accessories").textContent = held.length
    ? held.length > 1
      ? `${held.length} on`
      : held[0]!.label
    : slotsHere().find((slot) => slot.empty)
      ? "None"
      : "Off";
  $("#tab-pose").textContent = ALL_POSES[state.pose].label;
  $("#tab-face").textContent = FACE_CHOICES[state.face]!.label;
}
/** The angle he has been turned to, unless it is where he starts. */
function turnedTo(): string | undefined {
  const view = character.view;
  return view && view !== HOME_VIEW ? view : undefined;
}
/** This page, set up as he stands now. */
function studioAddress(): string {
  const url = new URL(location.href);
  url.hash = "";
  url.searchParams.set("scene", state.scene);
  url.searchParams.set("pose", state.pose);
  const standard = stageOf(state.scene, null, state.pose).accessories;
  if (state.accessories.join() === standard.join())
    url.searchParams.delete("accessories");
  else url.searchParams.set("accessories", accessoriesValue(state.accessories));
  if (state.face === "original") url.searchParams.delete("face");
  else url.searchParams.set("face", state.face);
  if (state.light) url.searchParams.set("light", "on");
  else url.searchParams.delete("light");
  if (state.life) url.searchParams.delete("life");
  else url.searchParams.set("life", "off");
  const view = turnedTo();
  if (view) url.searchParams.set("view", view);
  else url.searchParams.delete("view");
  return url.href;
}
function embedCode(): string {
  return iframeCode({ ...state, version: LATEST, view: turnedTo() });
}
/** The code and the link are always what stands on the stage right now. */
function syncTaken(): void {
  $("#embed-code").textContent = embedCode();
  $("#link-code").textContent = studioAddress();
}
const IDLE_WORDS = {
  "#copy-label": "Copy embed",
  "#download-label": "Download picture",
  "#copy-link-label": "Copy link",
};
/** He has changed, so "copied" and "saved" no longer describe him. */
function syncBring(): void {
  syncTaken();
  const bits: string[] = [SCENES[state.scene].label];
  for (const item of accessoriesIn(state.scene))
    if (state.accessories.includes(item.id))
      bits.push(item.label.toLowerCase());
  bits.push(ALL_POSES[state.pose].label, FACE_CHOICES[state.face]!.label);
  $("#bring-summary").textContent = `${bits.join(", ")}.`;
  for (const node of document.querySelectorAll(".bring-weight"))
    node.textContent = MODEL_WEIGHT[state.scene];
  for (const [selector, words] of Object.entries(IDLE_WORDS))
    $(selector).textContent = words;
  for (const way of document.querySelectorAll<HTMLElement>(".way"))
    delete way.dataset.shown;
}
function syncCharacter(): void {
  for (const [name, value] of Object.entries(state))
    character.setAttribute(
      name,
      Array.isArray(value)
        ? accessoriesValue(value)
        : typeof value === "boolean"
          ? value
            ? "on"
            : "off"
          : value,
    );
  syncLight();
  const offered = posesFor(state.scene, state.accessories);
  const options = $("#pose-options");
  if (options.dataset.offered !== offered.join())
    options.innerHTML = offered
      .map(
        (id) =>
          `<button class="pose-option" data-pose="${id}" aria-pressed="false">${icon(id)}<span>${ALL_POSES[id].label}</span></button>`,
      )
      .join("");
  options.dataset.offered = offered.join();
  for (const button of document.querySelectorAll<HTMLElement>("[data-pose]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.pose === state.pose),
    );
  for (const radio of document.querySelectorAll<HTMLInputElement>(
    'input[name="scene"]',
  ))
    radio.checked = radio.value === state.scene;
  $("#accessories").hidden = !slotsHere().length;
  syncAccessories();
  syncSheet();
  for (const button of document.querySelectorAll<HTMLElement>("[data-face]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.face === state.face),
    );
  const chosen = FACE_CHOICES[state.face];
  $("#face-note").innerHTML =
    `<strong>${chosen.label}.</strong> ${chosen.note}`;
  $("#light-label").textContent = state.light ? "Light on" : "Light off";
  $<HTMLInputElement>("#light").checked = state.light;
  // Reduced motion wins, and the switch says so rather than promising otherwise.
  const moving = state.life && !reduced.matches && !character.strained;
  $("#life-label").textContent = moving ? "Moving" : "Still";
  // Only worth saying aloud when the switch is on and he isn't moving.
  $("#life-label").classList.toggle("sr-only", moving || !state.life);
  // The switch keeps what was asked for; the label says what he is doing.
  $<HTMLInputElement>("#life").checked = state.life && !reduced.matches;
  $("#play-label").textContent = state.motion ? "Pause" : "Play";
  $("#play [data-icon]").innerHTML = icon(state.motion ? "pause" : "play");
  $("#play").setAttribute("aria-pressed", String(state.motion));
  history.replaceState(null, "", studioAddress() + location.hash);
  syncBring();
}
$("#sheet-tabs").addEventListener("click", (event) => {
  const tab = (event.target as Element).closest<HTMLElement>(
    "[data-sheet-tab]",
  );
  if (tab) {
    toggleSheet(tab.dataset.sheetTab!);
  }
});
function toggleSheet(tab: string): void {
  const controls = $("#controls");
  controls.dataset.tab = controls.dataset.tab === tab ? "none" : tab;
  syncSheet();
}
$("#bring-toggle").addEventListener("click", () => toggleSheet("bring"));

/**
 * On the sheet a choice of one closes the list, so he comes back into view, and a switch
 * leaves it. Above that width every control is always out, so there is nothing to close.
 */
const sheetLayout = matchMedia("(max-width: 1000px)");
function chosen(): void {
  if (!sheetLayout.matches) return;
  const controls = $("#controls");
  const tab = controls.dataset.tab;
  controls.dataset.tab = "none";
  syncSheet();
  $(`[data-sheet-tab="${tab}"]`).focus({ preventScroll: true });
}
document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    (event.target as Element).closest?.("#controls") &&
    $("#controls").dataset.tab !== "none"
  )
    chosen();
});
// Arrow keys walk the radios without closing the panel, so he can be looked at in each.
$("#scene-options").addEventListener("click", (event) => {
  if (
    (event as MouseEvent).detail > 0 &&
    (event.target as Element).matches("input")
  )
    chosen();
});
$("#scene-options").addEventListener("keydown", (event) => {
  if (event.key === "Enter") chosen();
});
$("#scene-options").addEventListener("change", (event) => {
  state.scene = scene((event.target as HTMLInputElement).value);
  // He arrives with what the scene gives him.
  const now = stageOf(state.scene, null, state.pose);
  state.pose = now.pose;
  state.accessories = now.accessories;
  syncCharacter();
  speak();
});
$("#accessory-options").addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>(
    "[data-accessory]",
  );
  if (!button) return;
  const id = button.dataset.accessory!;
  const slot = slotsHere().find((item) => item.id === button.dataset.slot)!;
  const others = state.accessories.filter(
    (held) => !slot.options.some((option) => option.id === held),
  );
  // One thing a slot holds is a switch; of several, the one chosen replaces the last.
  const on = !slot.empty && state.accessories.includes(id);
  const now = stageOf(
    state.scene,
    accessoriesValue(id && !on ? [...others, id] : others),
    state.pose,
  );
  state.accessories = now.accessories;
  state.pose = now.pose;
  syncCharacter();
  if (slot.empty || slot.options.length > 1) chosen();
});
$("#face-options").addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>("[data-face]");
  if (button) {
    state.face = button.dataset.face!;
    syncCharacter();
  }
});
$("#pose-options").addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>("[data-pose]");
  if (button) {
    state.pose = anyPose(button.dataset.pose);
    syncCharacter();
  }
});
$("#shuffle").addEventListener("click", () => {
  const was = state.scene;
  Object.assign(state, shuffled(state.scene));
  syncCharacter();
  if (state.scene !== was) speak();
});
$("#light").addEventListener("change", () => {
  state.light = $<HTMLInputElement>("#light").checked;
  syncCharacter();
});
$("#life").addEventListener("change", () => {
  state.life = $<HTMLInputElement>("#life").checked;
  syncCharacter();
});
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
function syncMotionPreference(): void {
  $("#motion-note").hidden = !reduced.matches;
  $<HTMLInputElement>("#life").disabled = reduced.matches;
  syncCharacter();
  syncPlay();
  if (reduced.matches) {
    state.motion = false;
    syncCharacter();
  }
}
/** A tool pose is a single frame, so there is nothing to play. */
function syncPlay(): void {
  const play = $<HTMLButtonElement>("#play");
  play.disabled = reduced.matches || !character.moves;
  play.title = character.moves ? "" : "This pose holds still";
  if (
    !character.moves &&
    state.motion &&
    character.hasAttribute("data-ready")
  ) {
    state.motion = false;
    syncCharacter();
  }
}
character.addEventListener("thingy-change", syncPlay);
character.addEventListener("thingy-strained", () => {
  $("#life-label").textContent = "Still";
});
reduced.addEventListener("change", syncMotionPreference);
$("#play").addEventListener("click", () => {
  state.motion = !state.motion;
  syncCharacter();
});
$("#reset").addEventListener("click", () => {
  character.resetView();
  syncBring();
});

/*
 * His voice. Each scene has three lines written for it and recorded once
 * (src/voice.ts). Picking a scene or tapping him shows the next one, in turn,
 * so a line comes round again only after the other two. The words are always
 * shown; he is heard only once a reader turns the sound on, and his antenna is
 * lit while he speaks (persona/THINGY.md, How he looks).
 */
const voice = new Audio();
voice.preload = "none";
let sound = false;
let speaking = false;
const heard: Partial<Record<keyof typeof SCENES, number>> = {};
let line:
  (typeof SCENE_VOICE)[keyof typeof SCENES]["lines"][number] | undefined;
function syncLight(): void {
  character.setAttribute("light", state.light || speaking ? "on" : "off");
}
function syncSound(): void {
  $<HTMLInputElement>("#sound").checked = sound;
  $("#sound-label").textContent = sound ? "Sound on" : "Sound off";
  const button = $("#speech-sound");
  button.setAttribute("aria-pressed", String(sound));
  button.title = sound ? "Sound on" : "Sound off";
  button.innerHTML = icon(sound ? "sound-on" : "sound-off");
}
/**
 * On a phone, a panel that shrinks the stage hides his words, which would cover
 * him, and he never speaks without his words in view.
 */
const shown = (): boolean => $("#speech").getClientRects().length > 0;
/** Tapping him, or turning him up, brings him back into view first. */
function inView(): void {
  if (sheetLayout.matches && $("#controls").dataset.tab !== "none") chosen();
}
function play(): void {
  voice.pause();
  const file = line && recording(line);
  if (!sound || !file || !shown()) return;
  voice.src = file;
  voice.play().catch(() => {
    // Refused or failed: the words are still there to read.
  });
}
/** The next line for the scene he is in. */
function speak(): void {
  const scene = SCENE_VOICE[state.scene];
  const turn = heard[state.scene] ?? 0;
  heard[state.scene] = turn + 1;
  line = scene.lines[turn % scene.lines.length];
  $("#speech-line").textContent = line.text;
  $("#speech-question").textContent = scene.ask;
  $<HTMLAnchorElement>("#speech-ask").href = askAddress(scene.ask);
  $("#speech").hidden = false;
  play();
}
function quiet(): void {
  voice.pause();
  $("#speech").hidden = true;
  line = undefined;
}
function setSound(on: boolean): void {
  sound = on;
  syncSound();
  // Turning him up says the line on show, or a new one; turning him down stops him.
  if (on) line ? play() : speak();
  else voice.pause();
}
voice.addEventListener("playing", () => {
  speaking = true;
  syncLight();
});
for (const done of ["pause", "ended", "error"])
  voice.addEventListener(done, () => {
    speaking = false;
    syncLight();
  });
// A panel opening, or a window narrowing to the sheet, can hide his words: he stops.
const hush = (): void => {
  if (!shown()) voice.pause();
};
new MutationObserver(hush).observe($("#controls"), {
  attributes: true,
  attributeFilter: ["data-tab"],
});
sheetLayout.addEventListener("change", hush);
character.addEventListener("thingy-tap", () => {
  inView();
  speak();
});
$("#sound").addEventListener("change", () => {
  const on = $<HTMLInputElement>("#sound").checked;
  if (on) inView();
  setSound(on);
});
$("#speech-sound").addEventListener("click", () => setSound(!sound));
$("#speech-close").addEventListener("click", quiet);
$("#speech").addEventListener("keydown", (event) => {
  if (event.key === "Escape") quiet();
});
syncSound();

syncCharacter();
syncMotionPreference();

// Turning him changes what is taken. The code follows at once; the address
// follows every 300 ms at most, because browsers limit how often it may change.
// It doesn't wait for him to stop: on a slow machine he coasts for many seconds.
let addressDue = 0;
character.addEventListener("thingy-view", () => {
  syncTaken();
  if (addressDue) return;
  addressDue = window.setTimeout(() => {
    addressDue = 0;
    history.replaceState(null, "", studioAddress() + location.hash);
  }, 300);
});
// He coasts for a moment after a drag, so a press is what marks a new turn.
for (const start of ["pointerdown", "wheel", "keydown"])
  character.addEventListener(start, syncBring, { passive: true });
/** An address may arrive asking for this section, which the sheet keeps closed. */
function showBringIfAsked(): void {
  if (sheetLayout.matches && location.hash === "#bring-along") {
    $("#controls").dataset.tab = "bring";
    syncSheet();
  }
}
addEventListener("hashchange", showBringIfAsked);
showBringIfAsked();
$("#bring-ways").addEventListener("click", (event) => {
  const button = (event.target as Element).closest("button");
  if (!button) return;
  $("#bring-along").dataset.way = button.dataset.way;
  for (const item of $("#bring-ways").children)
    item.setAttribute("aria-pressed", String(item === button));
});
async function copy(
  text: string,
  button: HTMLElement,
  words: string,
): Promise<void> {
  const label = button.querySelector("b")!;
  const way = button.closest<HTMLElement>(".way")!;
  try {
    await navigator.clipboard.writeText(text);
    label.textContent = words;
  } catch {
    label.textContent = "Select the text to copy";
    way.dataset.shown = "";
  }
}
$("#copy").addEventListener("click", async () => {
  // What was copied stays readable beside the button.
  $("#copy").closest<HTMLElement>(".way")!.dataset.shown = "";
  await copy(embedCode(), $("#copy"), "Embed copied");
});
$("#copy-link").addEventListener("click", () =>
  copy(studioAddress(), $("#copy-link"), "Link copied"),
);
$("#download").addEventListener("click", async () => {
  const label = $("#download-label");
  try {
    const picture = await character.picture();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(picture);
    const name = [
      state.scene,
      ...state.accessories,
      state.pose,
      state.face,
    ].filter((word) => word !== "original");
    link.download = `thingy-${name.join("-")}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
    label.textContent = "Picture saved";
  } catch {
    label.textContent = "The picture needs the 3D view";
  }
});
