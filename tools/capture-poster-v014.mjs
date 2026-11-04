// The v0.14 stills: the model itself in the component, from its default camera, so
// a still and the first frame are the same picture. Name the outfits to capture, or
// none for all but the published Librarian's, whose `stills` are Ask Thingy's pages:
// a pose, or a pose and a face. Needs a running preview (npm run preview -- --port 4399).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = process.env.THINGY_PREVIEW || "http://127.0.0.1:4399";
const manifest = JSON.parse(
  readFileSync(`${root}public/character/v0.14/manifest.json`, "utf8"),
);
const names = process.argv.slice(2);
const wanted = names.length ? names : ["trail", "workshop", "concert"];
const shots = wanted.flatMap((outfit) => {
  if (outfit === "librarian")
    return Object.keys(manifest.outfits.librarian.stills).map((clip) => {
      const [pose, face] = clip.split("-");
      return { outfit, clip, pose, face };
    });
  if (outfit !== "workshop")
    return [{ outfit, clip: "present", pose: "present" }];
  return Object.keys(manifest.outfits.workshop.stills).map((clip) => {
    const [tool, pose] = clip.includes("-") ? clip.split("-") : [null, clip];
    return { outfit, clip, pose, tool };
  });
});
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu"],
});
for (const { outfit, clip, pose, tool, face = "original" } of shots) {
  const page = await browser.newPage({
    viewport: { width: 500, height: 500 },
    deviceScaleFactor: 2,
  });
  await page.route(`${base}/__poster`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body style="margin:0;background:transparent">
        <thingy-character outfit="${outfit}" version="v0.14" pose="${pose}" ${tool ? `tool="${tool}"` : ""} face="${face}" zoom="off" style="width:500px;height:500px"></thingy-character>
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
    .toFile(`${root}public/character/v0.14/poses/${outfit}-${clip}.webp`);
}
await browser.close();
