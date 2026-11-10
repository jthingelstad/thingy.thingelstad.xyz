// Composes the share images pages name as og:image: 1200 x 630, opaque, on the
// site's paper, with the newest still of the scene and pose each page shows,
// centred and whole from antenna to feet. No words: chat apps put the page's
// title beside it. Uses the Playwright Chromium already installed for the
// browser tests. Each file is named for its page and the model it was drawn from
// (share/home-v0.17.png), because chat apps keep an og:image by its address for
// a long time: a new model gets a new address, and the tool points the page's
// og:image and twitter:image at it. Earlier files stay, for links already shared.
//   node tools/render-share-images.mjs
import { chromium } from "@playwright/test";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { newestCharacterVersion } from "./delivery-plan.mjs";

const PAPER = "#faf8f2";
const [WIDTH, HEIGHT] = [1200, 630];
/** How much of the image's height he stands in, shadow and all. */
const FILL = 0.84;

/** Each page's image, named for the page, the still it is made from, and the page. */
const SHARE_IMAGES = {
  home: ["library-present", "index.html"],
  persona: ["library-present", "persona/index.html"],
  kit: ["workshop-present", "kit/index.html"],
  "examples-workshop": ["workshop-present", "examples/workshop.html"],
};

const version = newestCharacterVersion(await readdir("public/character"));
await mkdir("public/share", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });
  for (const [name, [still, source]] of Object.entries(SHARE_IMAGES)) {
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
    const file = `share/${name}-${version}.png`;
    await writeFile(`public/${file}`, png);
    // Point the page's og:image and twitter:image at the new file.
    const html = await readFile(source, "utf8");
    const pointed = html.replace(
      new RegExp(`/share/${name}(-v[0-9.]+)?\\.png`, "g"),
      `/${file}`,
    );
    if (!pointed.includes(`/${file}`))
      throw new Error(`${source} names no /share/${name} image`);
    await writeFile(source, pointed);
    console.log(`public/${file}: ${still}, ${png.length} bytes; ${source}`);
  }
} finally {
  await browser.close();
}
