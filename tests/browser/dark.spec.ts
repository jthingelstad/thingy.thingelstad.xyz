import { test, expect, type Page } from "@playwright/test";

/**
 * Dark follows the system and nothing else: no switch, no stored choice, no class on
 * the page. The embed stays transparent in both, because it sits in other sites'
 * iframes, and a printed page stays ink on the light ground.
 */
const pages = [
  "/",
  "/persona/",
  "/kit/",
  "/print/",
  "/404.html",
  "/examples/workshop.html",
];
const embed = "/embed/?scene=workshop&pose=hello";
const colours = {
  light: { ground: "rgb(250, 248, 242)", ink: "rgb(23, 27, 29)" },
  dark: { ground: "rgb(28, 25, 20)", ink: "rgb(246, 238, 220)" },
};

// The page's ground is the first background that is not transparent, body first.
function read(page: Page) {
  return page.evaluate(() => {
    const clear = "rgba(0, 0, 0, 0)";
    const body = getComputedStyle(document.body);
    const root = getComputedStyle(document.documentElement);
    return {
      ground:
        body.backgroundColor !== clear
          ? body.backgroundColor
          : root.backgroundColor,
      ink: body.color,
      scheme: root.colorScheme,
    };
  });
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} colour scheme`, () => {
    test.use({ colorScheme: scheme });

    test("every page has its ground and ink", async ({ page }) => {
      for (const path of pages) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        const seen = await read(page);
        expect(seen.ground, path).toBe(colours[scheme].ground);
        expect(seen.ink, path).toBe(colours[scheme].ink);
        expect(seen.scheme, path).toBe(scheme === "dark" ? "dark" : "normal");
        const themes = await page
          .locator('meta[name="theme-color"]')
          .evaluateAll((metas) =>
            metas
              .filter(
                (m) =>
                  !(m as HTMLMetaElement).media ||
                  matchMedia((m as HTMLMetaElement).media).matches,
              )
              .map((m) => (m as HTMLMetaElement).content),
          );
        if (themes.length)
          expect(themes, path).toEqual([
            scheme === "dark" ? "#1c1914" : "#faf8f2",
          ]);
      }
    });

    test("the embed has no ground of its own", async ({ page }) => {
      await page.goto(embed, { waitUntil: "domcontentloaded" });
      expect(await read(page)).toEqual({
        ground: "rgba(0, 0, 0, 0)",
        ink: "rgb(0, 0, 0)",
        scheme: "normal",
      });
      await expect(page.locator('meta[name="color-scheme"]')).toHaveCount(0);
      // In a dark page's iframe the stripes behind it still show through its corner.
      const frame = new URL(embed, page.url()).href;
      await page.setContent(
        `<body style="margin:0;background:repeating-linear-gradient(45deg,#101010 0 10px,#303050 10px 20px)"><iframe src="${frame}" style="border:0;width:300px;height:300px"></iframe></body>`,
      );
      await page.frameLocator("iframe").locator("body").waitFor();
      const corner = await page.screenshot({
        clip: { x: 0, y: 0, width: 40, height: 40 },
      });
      const stripes = await page.evaluate(
        async (png) => {
          const image = await createImageBitmap(
            new Blob([new Uint8Array(png)], { type: "image/png" }),
          );
          const canvas = new OffscreenCanvas(image.width, image.height);
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          const data = context.getImageData(
            0,
            0,
            image.width,
            image.height,
          ).data;
          const seen = new Set<string>();
          for (let i = 0; i < data.length; i += 4)
            seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
          return seen.size;
        },
        [...corner],
      );
      expect(stripes).toBeGreaterThan(1);
    });
  });
}

test.describe("dark colour scheme", () => {
  test.use({ colorScheme: "dark" });

  test("there is no switch: no stored choice, no class, no control", async ({
    page,
  }) => {
    for (const path of [...pages, embed]) {
      await page.goto(path);
      const found = await page.evaluate(() => {
        const stored = [localStorage, sessionStorage].flatMap((store) =>
          Object.keys(store),
        );
        const root = document.documentElement;
        const controls = [
          ...document.querySelectorAll(
            "button, input, select, [role='switch'], a",
          ),
        ]
          .map((el) =>
            [el.textContent, el.getAttribute("aria-label"), el.id].join(" "),
          )
          .filter((name) =>
            /\b(dark|theme|appearance|colou?r scheme)\b/i.test(name),
          );
        return {
          stored: stored.filter((key) =>
            /dark|theme|scheme|appearance/i.test(key),
          ),
          rootClass: root.className,
          rootData: Object.keys(root.dataset),
          controls,
        };
      });
      expect(found, path).toEqual({
        stored: [],
        rootClass: "",
        rootData: [],
        controls: [],
      });
    }
  });

  test("a printed page stays ink on the light ground", async ({ page }) => {
    await page.emulateMedia({ media: "print", colorScheme: "dark" });
    for (const path of pages) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const seen = await read(page);
      expect(seen.ground, path).toBe(colours.light.ground);
      expect(seen.ink, path).toBe(colours.light.ink);
    }
  });
});
