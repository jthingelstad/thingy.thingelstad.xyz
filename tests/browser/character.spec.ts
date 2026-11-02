import { test, expect } from "@playwright/test";
import { createServer } from "node:http";

test("outfits, poses, playback, light and keyboard camera work on a real WebGL character", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !/GL Driver Message.*GPU stall due to ReadPixels/.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto("/");
  // Keep browser-driven scrolling deterministic while WebGL motion remains on.
  await page.addStyleTag({
    content: "html { scroll-behavior: auto !important; }",
  });
  const character = page.locator("#main-thingy");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await expect(page).toHaveTitle("Thingy — The character");
  await expect(page.locator("h1")).toHaveText("Meet Thingy.");
  await page.screenshot({
    path: `/tmp/thingy-home-${info.project.name}.png`,
    fullPage: true,
  });
  for (const name of [
    "Trail companion",
    "Workshop Builder",
    "Concert companion",
    "Librarian",
  ]) {
    await page.getByRole("radio", { name, exact: true }).check();
    await expect(character).toHaveAttribute("data-ready", "", {
      timeout: 30000,
    });
  }
  await page
    .getByRole("radio", { name: "Workshop Builder", exact: true })
    .check();
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await page.locator('[data-pose="thinking"]').click();
  await expect(character).toHaveAttribute("pose", "thinking");
  await page.locator("#light").check();
  await expect(character).toHaveAttribute("light", "on");
  await page.locator('[data-pose="hello"]').click();
  await page.locator("#play").click();
  await expect(character).toHaveAttribute("motion", "on");
  await page.waitForTimeout(350);
  await page.locator("#play").click();
  await expect(character).toHaveAttribute("motion", "off");
  const capture = async () => {
    await character.evaluate((el) =>
      el.scrollIntoView({ behavior: "instant", block: "center" }),
    );
    const bounds = await character.boundingBox();
    if (!bounds) throw new Error("The character has no visible bounds");
    return page.screenshot({ clip: bounds });
  };
  const before = await capture();
  await page.locator("#play").click();
  await page.waitForTimeout(1200);
  await page.locator("#play").click();
  await expect(character).toHaveAttribute("motion", "off");
  const after = await capture();
  expect(before.equals(after)).toBe(false);
  await page.waitForTimeout(350);
  expect(after.equals(await capture())).toBe(true);
  const canvas = character.locator("canvas");
  await canvas.press("ArrowLeft");
  await canvas.press("+");
  await page.locator("#reset").click();
  await page.screenshot({
    path: `/tmp/thingy-workshop-${info.project.name}.png`,
    fullPage: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("pose images, copied embed, download, and transparent iframe share the same choice", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-write", "clipboard-read"]);
  await page.goto("/");
  await page.locator('#reuse-poses [data-reuse-pose="thinking"]').click();
  await expect(page.locator("#reuse-preview")).toHaveAttribute(
    "src",
    "/character/v0.10/poses/workshop-thinking.webp",
  );
  await page.locator("#copy").click();
  await expect(page.locator("#copy-label")).toHaveText("Copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("outfit=workshop&pose=thinking");
  const download = page.waitForEvent("download");
  await page.locator("#download").click();
  expect((await download).suggestedFilename()).toBe("workshop-thinking.png");
  await page.locator("#example-link").click();
  await expect(page.locator("thingy-character")).toHaveAttribute(
    "data-ready",
    "",
    { timeout: 30000 },
  );
  await expect(page.locator("thingy-character")).toHaveAttribute(
    "outfit",
    "workshop",
  );
  await expect(page.locator("thingy-character")).toHaveAttribute(
    "pose",
    "thinking",
  );
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");
});

test("reduced motion stays still and a missing 3D asset leaves a useful pose image", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?outfit=workshop&pose=hello");
  await expect(page.locator("#play")).toBeDisabled();
  await expect(page.locator("#main-thingy")).toHaveAttribute("motion", "off");
  await page.route("**/*.glb", (route) => route.abort());
  await page.reload();
  await expect(page.locator("#main-thingy").locator(".status")).toHaveText(
    /could not load/,
  );
  const image = page
    .locator("#main-thingy")
    .locator("img")
    .filter({ visible: true });
  await expect(image).toHaveJSProperty("complete", true);
  expect(
    await image.evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBeGreaterThan(0);
});

test("the standalone component finds its assets when used by another origin", async ({
  page,
}) => {
  const server = createServer((_request, response) => {
    response.setHeader("Content-Type", "text/html");
    response.end(`<!doctype html><html lang="en"><head><title>A consuming project</title></head><body>
      <thingy-character id="consumer" outfit="workshop" pose="thinking" style="width:320px;height:380px"></thingy-character>
      <script type="module" src="http://127.0.0.1:4322/thingy.js"></script></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing consumer address");
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.locator("#consumer")).toHaveAttribute("data-ready", "", {
      timeout: 30000,
    });
    expect(
      await page
        .locator("#consumer")
        .evaluate((el: HTMLElement & { assetBase: string }) => el.assetBase),
    ).toBe("http://127.0.0.1:4322/character/");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
