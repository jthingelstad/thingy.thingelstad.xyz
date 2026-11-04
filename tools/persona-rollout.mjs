// When persona/THINGY.md changes on main, a workflow opens an issue from this
// checklist: a persona change reaches a surface only when someone takes it there.
import fs from "node:fs";
import { pathToFileURL } from "node:url";

export function rolloutIssue(surfaces, commit) {
  const lines = [
    `The persona changed in ${commit}. Models, stills and the component follow on their own, but these surfaces keep words of their own, and each needs reading against the new persona.`,
    "",
    `- [What changed](https://github.com/jthingelstad/thingy.thingelstad.xyz/commit/${commit})`,
    "- [The persona](https://thingy.thingelstad.xyz/persona.md)",
    "",
    "Change only what the new persona contradicts or adds, and give each repository its own pull request. An agent can take this issue as it stands.",
    "",
  ];
  for (const surface of surfaces) {
    if (!surface.keeps.length) continue;
    lines.push(`## ${surface.name} (${surface.repo})`, "");
    for (const kept of surface.keeps) lines.push(`- [ ] ${kept}`);
    lines.push("");
  }
  return lines.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { surfaces } = JSON.parse(fs.readFileSync("kit/surfaces.json", "utf8"));
  process.stdout.write(rolloutIssue(surfaces, process.argv[2]));
}
