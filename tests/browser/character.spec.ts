import { test, expect, type Page } from "@playwright/test";
import { createServer } from "node:http";

/** On a phone one group of controls is open at a time: open the one a step needs. */
async function open(page: Page, tab: string): Promise<void> {
  const button = page.locator(`[data-sheet-tab="${tab}"]`);
  if (!(await button.isVisible())) return;
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
}

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
  await open(page, "outfit");
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
  // Present is the laptop's, and it comes with that one pose.
  await expect(character).toHaveAttribute("tool", "laptop");
  await expect(page.locator('[data-pose="thinking"]')).toHaveCount(0);
  await open(page, "tool");
  await page.locator('[data-tool="none"]').click();
  await open(page, "pose");
  await page.locator('[data-pose="thinking"]').click();
  await expect(character).toHaveAttribute("pose", "thinking");
  await open(page, "more");
  await page.locator("#light").check();
  await expect(character).toHaveAttribute("light", "on");
  await open(page, "pose");
  await page.locator('[data-pose="hello"]').click();
  await open(page, "more");
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

test("the v0.14 Librarian shows his faces, leaves the wheel alone, and reports a tap but not a turn", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !/GL Driver Message.*GPU stall due to ReadPixels/.test(message.text())
    )
      errors.push(message.text());
  });
  await page.route("**/__v014", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><title>v0.14</title></head><body style="height:3000px;margin:0">
        <thingy-character id="librarian" outfit="librarian" version="v0.14" pose="present" face="original" zoom="off" view-label="Thingy, to turn" style="display:block;width:420px;height:420px"></thingy-character>
        <script type="module" src="/thingy.js"></script></body></html>`,
    }),
  );
  await page.goto("/__v014");
  const character = page.locator("#librarian");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  const canvas = character.locator("canvas");
  await expect(canvas).toHaveAttribute("aria-label", "Thingy, to turn");
  await page.evaluate(() => {
    (window as unknown as { taps: number }).taps = 0;
    document.addEventListener("thingy-tap", () => {
      (window as unknown as { taps: number }).taps += 1;
    });
  });
  const taps = () =>
    page.evaluate(() => (window as unknown as { taps: number }).taps);
  const shot = () => character.screenshot();
  const original = await shot();

  await character.evaluate((el) => el.setAttribute("face", "oops"));
  await page.waitForTimeout(200);
  const oops = await shot();
  expect(oops.equals(original)).toBe(false);
  await character.evaluate((el) => el.setAttribute("face", "original"));

  const box = await canvas.boundingBox();
  if (!box) throw new Error("The canvas has no bounds");
  const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.click(middle.x, middle.y);
  expect(await taps()).toBe(1);
  await canvas.press("Enter");
  expect(await taps()).toBe(2);

  await page.mouse.move(middle.x, middle.y);
  await page.mouse.down();
  await page.mouse.move(middle.x + 80, middle.y, { steps: 4 });
  await page.mouse.up();
  expect(await taps()).toBe(2);

  // Out and back again is still a turn.
  await page.mouse.move(middle.x, middle.y);
  await page.mouse.down();
  await page.mouse.move(middle.x + 80, middle.y);
  await page.mouse.move(middle.x, middle.y);
  await page.mouse.up();
  expect(await taps()).toBe(2);

  await page.mouse.wheel(0, 300);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
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

test("the studio offers every face and, for the builder, every tool", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const character = page.locator("#main-thingy");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await expect(character).toHaveAttribute("version", "v0.14");
  // The stage reaches up behind the header, and must not take its links.
  await page.locator(".site-header .ask").click({ trial: true });
  const shot = async () => {
    await page.waitForTimeout(250);
    return character.screenshot();
  };

  // Faces change the picture without loading anything, and "off" is never offered.
  await expect(page.locator("[data-face]")).toHaveCount(11);
  await expect(page.locator('[data-face="off"]')).toHaveCount(0);
  const original = await shot();
  await open(page, "face");
  await page.locator('[data-face="curious"]').click();
  await expect(character).toHaveAttribute("face", "curious");
  await expect(page.locator("#face-note")).toContainText("turning over");
  expect(original.equals(await shot())).toBe(false);
  expect(page.url()).toContain("face=curious");

  // No tools outside the workshop; the face stays through a change of clothes.
  await expect(page.locator("#tools")).toBeHidden();
  await expect(page.locator('[data-sheet-tab="tool"]')).toBeHidden();
  await open(page, "outfit");
  await page
    .getByRole("radio", { name: "Workshop Builder", exact: true })
    .check();
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await open(page, "tool");
  await expect(page.locator("#tools")).toBeVisible();
  await expect(character).toHaveAttribute("face", "curious");

  // Each tool is its own picture, with its own poses, and a tool pose holds still.
  const seen: Buffer[] = [await shot()];
  for (const tool of ["screwdriver", "hammer", "drill"]) {
    await open(page, "tool");
    await page.locator(`[data-tool="${tool}"]`).click();
    await expect(character).toHaveAttribute("tool", tool);
    // The first tool starts at Carry; after that the pose stays through a swap.
    await expect(character).toHaveAttribute(
      "pose",
      tool === "screwdriver" ? "carry" : "work",
    );
    await expect(page.locator("[data-pose]")).toHaveCount(3);
    await expect(page.locator("#play")).toBeDisabled();
    await open(page, "pose");
    for (const kind of ["carry", "show", "work"]) {
      await page.locator(`[data-pose="${kind}"]`).click();
      const picture = await shot();
      for (const earlier of seen) expect(picture.equals(earlier)).toBe(false);
      seen.push(picture);
    }
  }
  expect(page.url()).toContain("tool=drill");
  expect(page.url()).toContain("pose=work");

  // Leaving the workshop puts the tool down, and an address brings him back.
  await open(page, "outfit");
  await page.getByRole("radio", { name: "Librarian", exact: true }).check();
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await expect(character).toHaveAttribute("tool", "none");
  await expect(character).toHaveAttribute("pose", "present");
  await page.goto("/?outfit=workshop&tool=hammer&pose=show&face=proud");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await expect(page.locator('[data-tool="hammer"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-face="proud"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("/?face=off");
  await expect(character).toHaveAttribute("face", "original");
  // On a phone the open group closes again, leaving him the whole stage.
  const faceTab = page.locator('[data-sheet-tab="face"]');
  if (await faceTab.isVisible()) {
    await faceTab.click();
    await expect(page.locator("#controls")).toHaveAttribute("data-tab", "none");
    await expect(page.locator("#faces")).toBeHidden();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
