// Renders the two icons browsers ask for by name from public/favicon.svg, which
// stays the primary icon: apple-touch-icon.png (180 px, opaque, since iOS fills
// transparency with black) and favicon.ico (32 px, a PNG in an ICO container).
// Uses the Playwright Chromium already installed for the browser tests.
//   node tools/render-icons.mjs
import { chromium } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

const PAPER = "#faf8f2";
const svg = await readFile("public/favicon.svg", "utf8");

/** The SVG filling a `size` px square on `ground`, seen through `viewBox`. */
async function render(page, size, viewBox, ground) {
  await page.setViewportSize({ width: size, height: size });
  const drawing = svg.replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);
  await page.setContent(
    `<!doctype html><style>html,body{margin:0;background:${ground}}
     svg{display:block;width:${size}px;height:${size}px}</style>${drawing}`,
  );
  return page.screenshot({ omitBackground: ground === "transparent" });
}

// The mark (antenna ball to base) spans x 10 to 38 and y 3 to 42 of the 48-unit
// drawing. For the touch icon, centre it in a square two-thirds of which it fills
// top to bottom, so a sixth of the icon is clear above and below it.
const [left, right, top, bottom] = [10, 38, 3, 42];
const side = ((bottom - top) * 3) / 2;
const touchView = [
  (left + right) / 2 - side / 2,
  (top + bottom) / 2 - side / 2,
  side,
  side,
].join(" ");

/** One PNG in an ICO container: a 6-byte header and one 16-byte directory entry. */
function ico(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(1, 4); // one image
  header.writeUInt8(size % 256, 6); // width (0 means 256)
  header.writeUInt8(size % 256, 7); // height
  header.writeUInt8(0, 8); // no palette
  header.writeUInt8(0, 9); // reserved
  header.writeUInt16LE(1, 10); // colour planes
  header.writeUInt16LE(32, 12); // bits per pixel
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // the PNG starts after this header
  return Buffer.concat([header, png]);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  // The drawing's own rounded square is the same paper as the ground, so only
  // the mark shows.
  await writeFile(
    "public/apple-touch-icon.png",
    await render(page, 180, touchView, PAPER),
  );
  // The favicon is the drawing as it is, rounded square and all.
  await writeFile(
    "public/favicon.ico",
    ico(await render(page, 32, "0 0 48 48", "transparent"), 32),
  );
} finally {
  await browser.close();
}
console.log("Wrote public/apple-touch-icon.png and public/favicon.ico");
