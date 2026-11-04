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
  // Four outfits on the larger stage take longer than the default under CI's
  // software rendering.
  test.setTimeout(180000);
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

test("version latest loads the newest model, and hop jumps, spins and lands where he began", async ({
  page,
}) => {
  const models: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".glb")) models.push(request.url());
  });
  await page.route("**/__hop", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><title>hop</title></head><body style="margin:0;padding-top:200px">
        <thingy-character id="librarian" outfit="librarian" version="latest" pose="hello" zoom="off" style="display:block;width:420px;height:420px"></thingy-character>
        <script type="module" src="/thingy.js"></script></body></html>`,
    }),
  );
  await page.goto("/__hop");
  const character = page.locator("#librarian");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  expect(models).toEqual([expect.stringContaining("/character/v0.14/")]);
  await page.waitForTimeout(300);
  const before = await character.screenshot();

  const peak = await character.evaluate(async (el) => {
    (el as HTMLElement & { hop(o: object): void }).hop({
      height: 100,
      direction: -1,
    });
    // Frames are far apart under software rendering, so sample until he lands
    // and only hold the height he must never pass.
    let highest = 0;
    const end = performance.now() + 15000;
    while (performance.now() < end) {
      await new Promise(requestAnimationFrame);
      const { translate } = (el as HTMLElement).style;
      if (!translate && highest) break;
      highest = Math.max(highest, -parseFloat(translate.split(" ")[1] || "0"));
    }
    return { highest, landed: (el as HTMLElement).style.translate === "" };
  });
  expect(peak.highest).toBeGreaterThan(0);
  expect(peak.highest).toBeLessThanOrEqual(100);
  expect(peak.landed).toBe(true);
  await page.waitForTimeout(300);
  expect((await character.screenshot()).equals(before)).toBe(true);
});

test("a hop that carries him out of view still lands", async ({ page }) => {
  await page.route("**/__hop-away", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><title>hop away</title></head><body style="margin:0">
        <thingy-character id="librarian" outfit="librarian" version="latest" pose="hello" zoom="off" style="display:block;width:160px;height:160px"></thingy-character>
        <script type="module" src="/thingy.js"></script></body></html>`,
    }),
  );
  await page.goto("/__hop-away");
  const character = page.locator("#librarian");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await character.evaluate((el) =>
    (el as HTMLElement & { hop(o: object): void }).hop({ height: 240 }),
  );
  await expect
    .poll(() => character.evaluate((el) => (el as HTMLElement).style.translate))
    .not.toBe("");
  await expect
    .poll(
      () => character.evaluate((el) => (el as HTMLElement).style.translate),
      { timeout: 5000 },
    )
    .toBe("");
});

test("hop stays still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/__still", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="en"><head><title>still</title></head><body style="margin:0">
        <thingy-character id="librarian" outfit="librarian" version="latest" pose="hello" zoom="off" style="display:block;width:420px;height:420px"></thingy-character>
        <script type="module" src="/thingy.js"></script></body></html>`,
    }),
  );
  await page.goto("/__still");
  const character = page.locator("#librarian");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  const moved = await character.evaluate(async (el) => {
    (el as HTMLElement & { hop(o: object): void }).hop({ height: 100 });
    await new Promise((done) => setTimeout(done, 200));
    return (el as HTMLElement).style.translate;
  });
  expect(moved).toBe("");
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

test("what stands on the stage is what you copy, save and link", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await context.grantPermissions(["clipboard-write", "clipboard-read"]);
  await page.goto("/?outfit=workshop&tool=hammer&pose=work&face=proud");
  const character = page.locator("#main-thingy");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await open(page, "bring");
  // No pickers of its own: the section has only these three things to do.
  await expect(page.locator("#bring-along select")).toHaveCount(0);

  // A real drag turns him, and the code follows. A phone swipe across him is
  // the page's to scroll, so the drag belongs to the desktop run.
  if (info.project.name === "desktop") {
    const box = (await character.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 180, y, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator("#embed-code")).toContainText("&view=");
    // The address carries the angle too, without waiting for him to settle.
    await expect.poll(() => page.url()).toContain("view=");
  }

  // Set to an exact angle, so the addresses below can be read exactly.
  await page.evaluate(() =>
    document.querySelector("#main-thingy")!.setAttribute("view", "60,80,1"),
  );
  await expect
    .poll(() =>
      page
        .locator("#main-thingy")
        .evaluate((el) => (el as never as { view: string }).view),
    )
    .toBe("60,80,1");

  await page.locator("#copy").click();
  await expect(page.locator("#copy-label")).toHaveText("Embed copied");
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(
    "/embed/?version=latest&outfit=workshop&tool=hammer&pose=work&face=proud&light=off&motion=off&view=60%2C80%2C1",
  );

  // Changing him changes what is taken, and the words forget the last copy.
  await open(page, "face");
  await page.locator('[data-face="eager"]').click();
  await open(page, "bring");
  await expect(page.locator("#copy-label")).toHaveText("Copy embed");
  await expect(page.locator("#embed-code")).toContainText("face=eager");

  // The picture comes from the stage: square, a real PNG, transparent corners.
  if (info.project.name === "phone")
    await page.locator('#bring-ways [data-way="picture"]').click();
  const download = page.waitForEvent("download");
  await page.locator("#download").click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe(
    "thingy-workshop-hammer-work-eager.png",
  );
  const facts = await page.evaluate(async () => {
    const blob = await (
      document.querySelector("#main-thingy") as never as {
        picture(): Promise<Blob>;
      }
    ).picture();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d")!;
    context.drawImage(bitmap, 0, 0);
    const middle = context.getImageData(
      bitmap.width / 2,
      bitmap.height / 2,
      1,
      1,
    );
    return {
      type: blob.type,
      width: bitmap.width,
      height: bitmap.height,
      corner: context.getImageData(0, 0, 1, 1).data[3],
      middle: middle.data[3],
    };
  });
  expect(facts).toEqual({
    type: "image/png",
    width: 1000,
    height: 1000,
    corner: 0,
    middle: 255,
  });
  // The stage is back as it was.
  await expect(character).toHaveAttribute("data-ready", "");

  // The link opens this page set up the same way, at the same angle.
  if (info.project.name === "phone")
    await page.locator('#bring-ways [data-way="link"]').click();
  await page.locator("#copy-link").click();
  await expect(page.locator("#copy-link-label")).toHaveText("Link copied");
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("face=eager");
  expect(link).toContain("view=60%2C80%2C1");
  await page.goto(link);
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await expect(character).toHaveAttribute("face", "eager");
  expect(
    await character.evaluate((el) => (el as never as { view: string }).view),
  ).toBe("60,80,1");

  // An address can ask for the section, and the sheet opens for it.
  await page.goto("/#bring-along");
  await expect(page.locator("#copy")).toBeVisible();
});

test("the embed follows latest with the face, tool and angle it was given, on a transparent page", async ({
  page,
}) => {
  await page.goto(
    "/embed/?version=latest&outfit=workshop&tool=drill&pose=show&face=curious&light=on&motion=off&view=-40,70,1.2",
  );
  const character = page.locator("thingy-character");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  const facts = await character.evaluate((el) => {
    const thingy = el as never as {
      version: string;
      tool: string;
      pose: string;
      view: string;
    };
    return {
      version: thingy.version,
      tool: thingy.tool,
      pose: thingy.pose,
      view: thingy.view,
    };
  });
  expect(facts).toEqual({
    version: "v0.14",
    tool: "drill",
    pose: "show",
    view: "-40,70,1.2",
  });
  await expect(character).toHaveAttribute("face", "curious");
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");
  // A published address that names none of this still gets v0.10, as it was.
  await page.goto("/embed/?outfit=workshop&pose=thinking");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  expect(
    await character.evaluate(
      (el) => (el as never as { version: string }).version,
    ),
  ).toBe("v0.10");
  // `off` is never shown to a reader, whatever the address says.
  await page.goto("/embed/?version=latest&outfit=librarian&face=off");
  await expect(character).not.toHaveAttribute("face", "off");
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
