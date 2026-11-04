// The v0.14 stills: the model itself in the component, from its default camera, so
// a still and the first frame are the same picture. `present` is the published
// poster; `hello` stands in on Ask Thingy's front page; the pose-face pairs are the
// other pages there. An existing file is kept, so a published still never changes
// by accident; delete it to make it again. Needs a running preview
// (npm run preview -- --port 4399).
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const base = process.env.THINGY_PREVIEW || "http://127.0.0.1:4399";
const browser = await chromium.launch({
  args: ["--use-angle=metal", "--enable-gpu"],
});
const stills = [
  ["present", "original"],
  ["hello", "original"],
  ["thinking", "original"],
  ["rest", "original"],
  ["hello", "idle"],
  ["present", "idle"],
  ["present", "proud"],
  ["rest", "delighted"],
  ["rest", "idle"],
  ["thinking", "curious"],
];
for (const [pose, face] of stills) {
  const name = face === "original" ? pose : `${pose}-${face}`;
  const file = `${root}public/character/v0.14/poses/librarian-${name}.webp`;
  if (existsSync(file)) continue;
  const page = await browser.newPage({
    viewport: { width: 500, height: 500 },
    deviceScaleFactor: 2,
  });
  await page.route(`${base}/__poster`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html><body style="margin:0;background:transparent">
        <thingy-character outfit="librarian" version="v0.14" pose="${pose}" face="${face}" zoom="off" style="width:500px;height:500px"></thingy-character>
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
    .toFile(file);
}
await browser.close();
