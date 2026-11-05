// The v0.17 stills: the model itself in the component, from its default camera, so
// a still and the first frame are the same picture. Name the scenes to capture, or
// none for the three new scenes: the older scenes look as they did, so their
// stills are v0.16's files, unchanged. Name
// scene/clip to capture one still and touch no other, the way to add a still to a
// published version, whose files are never replaced. Each still shows what its
// scene gives him. Needs a running preview (npm run preview -- --port 4399).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = process.env.THINGY_PREVIEW || "http://127.0.0.1:4399";
const directory = `${root}public/character/v0.17`;
const manifest = JSON.parse(readFileSync(`${directory}/manifest.json`, "utf8"));
const names = process.argv.slice(2);
const wanted = names.length ? names : ["kitchen", "winter", "cabin"];
// A still's clip is a pose, <pose>-<face> or <tool>-<pose>.
const shot = (scene, clip) => {
  const [first, second] = clip.split("-");
  if (!second) return { scene, clip, pose: first };
  if (first in manifest.poses)
    return { scene, clip, pose: first, face: second };
  return { scene, clip, pose: second, tool: first };
};
const shots = wanted.flatMap((name) => {
  const [scene, one] = name.split("/");
  if (one) {
    if (!manifest.scenes[scene]?.stills?.[one])
      throw new Error(`${name} is not in the manifest`);
    return [shot(scene, one)];
  }
  if (scene !== "workshop")
    return [{ scene, clip: "present", pose: "present" }];
  return Object.keys(manifest.scenes.workshop.stills).map((clip) =>
    shot("workshop", clip),
  );
});
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu"],
});
for (const { scene, clip, pose, tool, face = "original" } of shots) {
  const page = await browser.newPage({
    viewport: { width: 500, height: 500 },
    deviceScaleFactor: 2,
  });
  await page.route(`${base}/__poster`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body style="margin:0;background:transparent">
        <thingy-character scene="${scene}" version="v0.17" pose="${pose}" ${tool ? `accessories="${tool}"` : ""} face="${face}" zoom="off" style="width:500px;height:500px"></thingy-character>
        <script type="module" src="/thingy.js"></script></body></html>`,
    }),
  );
  await page.goto(`${base}/__poster`);
  await page.waitForSelector("thingy-character[data-ready]", {
    timeout: 60000,
  });
  await page.waitForTimeout(800);
  const png = await page.screenshot({ omitBackground: true });
  await page.close();
  // sharp writes no metadata unless asked.
  await sharp(png)
    .webp({ quality: 88, alphaQuality: 90, effort: 6 })
    .toFile(`${directory}/poses/${scene}-${clip}.webp`);
}
await browser.close();
