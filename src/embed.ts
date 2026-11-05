import "./element";
import { FACE_CHOICES, anyPose, scene } from "./config";
const params = new URLSearchParams(location.search);
const character = document.createElement("thingy-character");
character.setAttribute("asset-base", "/character/");
character.setAttribute("scene", scene(params.get("scene")));
character.setAttribute("pose", anyPose(params.get("pose")));
character.setAttribute("light", params.get("light") === "on" ? "on" : "off");
character.setAttribute("motion", params.get("motion") === "on" ? "on" : "off");
for (const name of ["version", "accessories", "view"]) {
  const value = params.get(name);
  if (value) character.setAttribute(name, value);
}
// A reader is never shown a face the viewer does not offer.
const face = params.get("face");
if (face && Object.hasOwn(FACE_CHOICES, face))
  character.setAttribute("face", face);
document.body.append(character);
