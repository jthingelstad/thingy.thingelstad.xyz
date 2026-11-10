// Composes the share images pages name as og:image: 1200 x 630, opaque, on the
// site's paper, with the newest still of the scene and pose each page shows,
// centred and whole from antenna to feet. No words: chat apps put the page's
// title beside it. Uses the Playwright Chromium already installed for the
// browser tests.
//   node tools/render-share-images.mjs
import { chromium } from "@playwright/test";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { newestCharacterVersion } from "./delivery-plan.mjs";

const PAPER = "#faf8f2";
const [WIDTH, HEIGHT] = [1200, 630];
/** How much of the image's height he stands in, shadow and all. */
const FILL = 0.84;

/** Each page's image, named for the page, and the still it is made from. */
const SHARE_IMAGES = {
  home: "library-present",
  persona: "library-present",
  kit: "workshop-present",
  "examples-workshop": "workshop-present",
};

const version = newestCharacterVersion(await readdir("public/character"));
await mkdir("public/share", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  for (const [name, still] of Object.entries(SHARE_IMAGES)) {
    const webp = await readFile(
      `public/character/${version}/poses/${still}.webp`,
    );
    await page.setContent(
      `<!doctype html><style>html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:${PAPER}}
       img{position:absolute;display:block}</style>
       <img src="data:image/webp;base64,${webp.toString("base64")}">`,
    );
    // Find him in the transparent still (anything more than faintly there),
    // then scale and place that box, not the square around it.
    await page.evaluate(
      async ({ WIDTH, HEIGHT, FILL }) => {
        const img = document.querySelector("img");
        await img.decode();
        const { naturalWidth: w, naturalHeight: h } = img;
        const canvas = new OffscreenCanvas(w, h);
        const context = canvas.getContext("2d");
        context.drawImage(img, 0, 0);
        const alpha = context.getImageData(0, 0, w, h).data;
        let [left, top, right, bottom] = [w, h, 0, 0];
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++)
            if (alpha[(y * w + x) * 4 + 3] > 8) {
              left = Math.min(left, x);
              right = Math.max(right, x + 1);
              top = Math.min(top, y);
              bottom = Math.max(bottom, y + 1);
            }
        const scale = (HEIGHT * FILL) / (bottom - top);
        img.style.width = `${w * scale}px`;
        img.style.height = `${h * scale}px`;
        img.style.left = `${WIDTH / 2 - ((left + right) / 2) * scale}px`;
        img.style.top = `${HEIGHT / 2 - ((top + bottom) / 2) * scale}px`;
      },
      { WIDTH, HEIGHT, FILL },
    );
    const png = await page.screenshot({ type: "png" });
    await writeFile(`public/share/${name}.png`, png);
    console.log(`public/share/${name}.png: ${still}, ${png.length} bytes`);
  }
} finally {
  await browser.close();
}
