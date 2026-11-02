import { test, expect } from "@playwright/test";

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
  const before = await character.screenshot();
  await page.waitForTimeout(600);
  const after = await character.screenshot();
  expect(before.equals(after)).toBe(false);
  await page.locator("#play").click();
  await expect(character).toHaveAttribute("motion", "off");
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
