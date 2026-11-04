import "./element";
import { FACE_CHOICES, anyPose, outfit } from "./config";
const params = new URLSearchParams(location.search);
const character = document.createElement("thingy-character");
character.setAttribute("asset-base", "/character/");
character.setAttribute("outfit", outfit(params.get("outfit")));
character.setAttribute("pose", anyPose(params.get("pose")));
character.setAttribute("light", params.get("light") === "on" ? "on" : "off");
character.setAttribute("motion", params.get("motion") === "on" ? "on" : "off");
// With none of these an address means what it always has: v0.10, as he was.
for (const name of ["version", "tool", "view"]) {
  const value = params.get(name);
  if (value) character.setAttribute(name, value);
}
// A reader is never shown a face the viewer does not offer.
const face = params.get("face");
if (face && Object.hasOwn(FACE_CHOICES, face))
  character.setAttribute("face", face);
document.body.append(character);
