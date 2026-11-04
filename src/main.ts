import "./style.css";
import "./element";
import {
  ALL_POSES,
  FACES,
  FACE_ATLAS,
  FACE_CHOICES,
  OUTFITS,
  POSES,
  TOOLS,
  anyPose,
  hasTools,
  iframeCode,
  stageOf,
  outfit,
  pose,
  posterPath,
  embedURL,
  type AnyPose,
  type CharacterState,
  type Tool,
  type Version,
} from "./config";
import { icon } from "./icons";

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
for (const node of document.querySelectorAll<HTMLElement>("[data-icon]"))
  node.innerHTML = icon(node.dataset.icon!);
const params = new URLSearchParams(location.search);
/** The studio shows the newest model, the one with faces and tools. */
const MODEL: Version = "v0.14";
const firstOutfit = outfit(params.get("outfit"));
const first = stageOf(
  firstOutfit,
  MODEL,
  params.get("tool"),
  params.get("pose"),
);
const state: Omit<CharacterState, "pose"> & {
  pose: AnyPose;
  tool: Tool;
  face: string;
} = {
  outfit: firstOutfit,
  pose: first.pose,
  tool: first.tool,
  // A face must be one a reader may choose, whatever the address says.
  face: Object.hasOwn(FACE_CHOICES, params.get("face") ?? "")
    ? params.get("face")!
    : "original",
  light: params.get("light") === "on",
  motion: false,
};
const reuse: CharacterState = {
  outfit: "workshop",
  pose: "present",
  light: false,
  motion: false,
};
const character = $<HTMLElementTagNameMap["thingy-character"]>("#main-thingy");
$("#outfit-options").innerHTML = Object.entries(OUTFITS)
  .map(
    ([id, item]) =>
      `<label class="outfit-option"><input type="radio" name="outfit" value="${id}" ${id === state.outfit ? "checked" : ""}><span>${item.label}</span></label>`,
  )
  .join("");
$("#tool-options").innerHTML = Object.entries(TOOLS)
  .map(
    ([id, item]) =>
      `<button class="tool-option" data-tool="${id}" aria-pressed="false">${icon(id)}<span>${item.label}</span></button>`,
  )
  .join("");
$("#face-options").innerHTML = Object.entries(FACE_CHOICES)
  .map(([id, item]) => {
    const { cell } = FACES[id];
    const { columns, rows } = FACE_ATLAS;
    const x = ((cell % columns) / (columns - 1)) * 100;
    const y = (Math.floor(cell / columns) / (rows - 1)) * 100;
    return `<button class="face-option" data-face="${id}" aria-pressed="false" aria-label="${item.label}" title="${item.label}"><span style="background-position:${x}% ${y}%"></span></button>`;
  })
  .join("");

function posesOnOffer(): readonly AnyPose[] {
  return hasTools(state.outfit, MODEL)
    ? TOOLS[state.tool].poses
    : (Object.keys(POSES) as AnyPose[]);
}
/** The sheet's tabs say what is chosen; only the phone and tablet layouts show them. */
function syncSheet(): void {
  const controls = $("#controls");
  const toolsOn = hasTools(state.outfit, MODEL);
  if (!toolsOn && controls.dataset.tab === "tool")
    controls.dataset.tab = "outfit";
  for (const tab of document.querySelectorAll<HTMLElement>("[data-sheet-tab]"))
    tab.setAttribute(
      "aria-expanded",
      String(tab.dataset.sheetTab === controls.dataset.tab),
    );
  $('[data-sheet-tab="tool"]').hidden = !toolsOn;
  $("#tab-outfit").textContent = OUTFITS[state.outfit].label.split(" ")[0]!;
  $("#tab-tool").textContent = TOOLS[state.tool].label.split(" ")[0]!;
  $("#tab-pose").textContent = ALL_POSES[state.pose].label;
  $("#tab-face").textContent = FACE_CHOICES[state.face]!.label;
}
function syncCharacter(): void {
  for (const [name, value] of Object.entries(state))
    character.setAttribute(
      name,
      typeof value === "boolean" ? (value ? "on" : "off") : value,
    );
  const offered = posesOnOffer();
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
  $("#tools").hidden = !hasTools(state.outfit, MODEL);
  syncSheet();
  for (const button of document.querySelectorAll<HTMLElement>("[data-tool]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.tool === state.tool),
    );
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
  $("#play-label").textContent = state.motion ? "Pause" : "Play";
  $("#play [data-icon]").innerHTML = icon(state.motion ? "pause" : "play");
  $("#play").setAttribute("aria-pressed", String(state.motion));
  const url = new URL(location.href);
  url.searchParams.set("outfit", state.outfit);
  url.searchParams.set("pose", state.pose);
  if (state.tool === "none") url.searchParams.delete("tool");
  else url.searchParams.set("tool", state.tool);
  if (state.face === "original") url.searchParams.delete("face");
  else url.searchParams.set("face", state.face);
  if (state.light) url.searchParams.set("light", "on");
  else url.searchParams.delete("light");
  history.replaceState(null, "", url);
}
$("#sheet-tabs").addEventListener("click", (event) => {
  const tab = (event.target as Element).closest<HTMLElement>(
    "[data-sheet-tab]",
  );
  if (tab) {
    const controls = $("#controls");
    controls.dataset.tab =
      controls.dataset.tab === tab.dataset.sheetTab
        ? "none"
        : tab.dataset.sheetTab;
    syncSheet();
  }
});
$("#outfit-options").addEventListener("change", (event) => {
  state.outfit = outfit((event.target as HTMLInputElement).value);
  const now = stageOf(state.outfit, MODEL, null, state.pose);
  state.pose = now.pose;
  state.tool = now.tool;
  syncCharacter();
});
$("#tool-options").addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>("[data-tool]");
  if (button) {
    const now = stageOf(state.outfit, MODEL, button.dataset.tool, state.pose);
    state.tool = now.tool;
    state.pose = now.pose;
    syncCharacter();
  }
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
$("#light").addEventListener("change", () => {
  state.light = $<HTMLInputElement>("#light").checked;
  syncCharacter();
});
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
function syncMotionPreference(): void {
  $("#motion-note").hidden = !reduced.matches;
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
reduced.addEventListener("change", syncMotionPreference);
$("#play").addEventListener("click", () => {
  state.motion = !state.motion;
  syncCharacter();
});
$("#reset").addEventListener("click", () => character.resetView());
syncCharacter();
syncMotionPreference();

$("#reuse-outfit").innerHTML = Object.entries(OUTFITS)
  .map(
    ([id, item]) =>
      `<option value="${id}" ${id === "workshop" ? "selected" : ""}>${item.label}</option>`,
  )
  .join("");
function syncReuse(): void {
  const selected = reuse.outfit;
  const options =
    selected === "workshop"
      ? Object.entries(POSES)
      : [["present", POSES.present] as const];
  $("#reuse-poses").innerHTML = options
    .map(
      ([id, item]) =>
        `<button class="preview-option" data-reuse-pose="${id}" aria-label="${item.label}" aria-pressed="${id === reuse.pose}"><img src="${posterPath(selected, pose(id))}" alt="" width="90" height="90" loading="lazy"></button>`,
    )
    .join("");
  $<HTMLImageElement>("#reuse-preview").src = posterPath(selected, reuse.pose);
  $<HTMLImageElement>("#reuse-preview").alt =
    `Thingy, ${OUTFITS[selected].label}, ${POSES[reuse.pose].label}`;
  $("#reuse-description").textContent = OUTFITS[selected].description;
  $("#embed-code").textContent = iframeCode(reuse);
  $<HTMLAnchorElement>("#download").href = posterPath(
    selected,
    reuse.pose,
  ).replace(".webp", ".png");
  $<HTMLAnchorElement>("#example-link").href = embedURL(reuse, location.origin);
  $("#copy-label").textContent = "Copy embed";
}
$("#reuse-outfit").addEventListener("change", () => {
  reuse.outfit = outfit($<HTMLSelectElement>("#reuse-outfit").value);
  reuse.pose = "present";
  syncReuse();
});
$("#reuse-poses").addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>(
    "[data-reuse-pose]",
  );
  if (button) {
    reuse.pose = pose(button.dataset.reusePose);
    syncReuse();
  }
});
$("#copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(iframeCode(reuse));
    $("#copy-label").textContent = "Copied";
  } catch {
    $("#copy-label").textContent = "Select the code above to copy";
  }
});
syncReuse();
$("#builder-lineup").innerHTML = (
  ["hello", "present", "thinking", "rest"] as const
)
  .map(
    (id) =>
      `<figure><img src="${posterPath("workshop", id)}" alt="Workshop Builder, ${POSES[id].label}" width="240" height="240" loading="lazy"><figcaption>${POSES[id].label}</figcaption></figure>`,
  )
  .join("");
