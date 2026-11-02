import "./style.css";
import "./element";
import {
  OUTFITS,
  POSES,
  iframeCode,
  outfit,
  pose,
  posterPath,
  embedURL,
  type CharacterState,
} from "./config";
import { icon } from "./icons";

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T =>
  document.querySelector<T>(selector)!;
for (const node of document.querySelectorAll<HTMLElement>("[data-icon]"))
  node.innerHTML = icon(node.dataset.icon!);
const params = new URLSearchParams(location.search);
const state: CharacterState = {
  outfit: outfit(params.get("outfit")),
  pose: pose(params.get("pose")),
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
$("#pose-options").innerHTML = Object.entries(POSES)
  .map(
    ([id, item]) =>
      `<button class="pose-option" data-pose="${id}" aria-pressed="${id === state.pose}">${icon(id)}<span>${item.label}</span></button>`,
  )
  .join("");

function syncCharacter(): void {
  for (const [name, value] of Object.entries(state))
    character.setAttribute(
      name,
      typeof value === "boolean" ? (value ? "on" : "off") : value,
    );
  for (const button of document.querySelectorAll<HTMLElement>("[data-pose]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.pose === state.pose),
    );
  $("#light-label").textContent = state.light ? "Light on" : "Light off";
  $<HTMLInputElement>("#light").checked = state.light;
  $("#play-label").textContent = state.motion ? "Pause" : "Play";
  $("#play [data-icon]").innerHTML = icon(state.motion ? "pause" : "play");
  $("#play").setAttribute("aria-pressed", String(state.motion));
  const url = new URL(location.href);
  url.searchParams.set("outfit", state.outfit);
  url.searchParams.set("pose", state.pose);
  if (state.light) url.searchParams.set("light", "on");
  else url.searchParams.delete("light");
  history.replaceState(null, "", url);
}
$("#outfit-options").addEventListener("change", (event) => {
  state.outfit = outfit((event.target as HTMLInputElement).value);
  syncCharacter();
});
$("#pose-options").addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>("[data-pose]");
  if (button) {
    state.pose = pose(button.dataset.pose);
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
  $<HTMLButtonElement>("#play").disabled = reduced.matches;
  if (reduced.matches) {
    state.motion = false;
    syncCharacter();
  }
}
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
