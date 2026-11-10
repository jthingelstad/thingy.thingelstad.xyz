import { test, expect, type Page } from "@playwright/test";

/**
 * Before his code runs, the component is an unknown element and its still a plain
 * 1000 px image. The page has to size it, or he spills over the next section and, on
 * a phone, widens the page.
 */
type Box = { x: number; y: number; width: number; height: number };

async function boxes(page: Page, still: string, stage: string) {
  return page.evaluate(
    ([still, stage]) => {
      const box = (selector: string) => {
        const { x, y, width, height } = document
          .querySelector(selector)!
          .getBoundingClientRect();
        return { x, y, width, height };
      };
      return {
        still: box(still),
        stage: box(stage),
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth,
      };
    },
    [still, stage],
  );
}

function expectInside(inner: Box, outer: Box): void {
  expect(inner.width).toBeGreaterThan(0);
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - 0.5);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - 0.5);
  expect(inner.x + inner.width).toBeLessThanOrEqual(
    outer.x + outer.width + 0.5,
  );
  expect(inner.y + inner.height).toBeLessThanOrEqual(
    outer.y + outer.height + 0.5,
  );
}

const still = "#main-thingy > img";
const opacity = (page: Page) =>
  page.locator(still).evaluate((el) => getComputedStyle(el).opacity);

test("while his code is on its way the still fits the stage and shows nothing", async ({
  page,
}) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/assets/*.js", async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/?life=off", { waitUntil: "commit" });
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(still)).toHaveJSProperty("complete", true);
  expect(
    await page.evaluate(() => !!customElements.get("thingy-character")),
  ).toBe(false);
  const early = await boxes(page, still, ".turntable");
  expectInside(early.still, early.stage);
  expect(early.scrollWidth).toBeLessThanOrEqual(early.innerWidth);
  // No big Thingy while loading: he fades in when the model is ready.
  expect(await opacity(page)).toBe("0");
  release();
  await expect(page.locator("#main-thingy")).toHaveAttribute("data-ready", "", {
    timeout: 30000,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    await page.evaluate(() => innerWidth),
  );
});

test("if his code never comes, the still appears by itself, sized to the stage", async ({
  page,
}) => {
  await page.route("**/assets/*.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(still)).toHaveJSProperty("complete", true);
  expect(await opacity(page)).toBe("0");
  await expect.poll(() => opacity(page), { timeout: 15000 }).toBe("1");
  const late = await boxes(page, still, ".turntable");
  expectInside(late.still, late.stage);
  expect(late.scrollWidth).toBeLessThanOrEqual(late.innerWidth);
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("he is his still, inside the stage, above the next section, with no dead controls", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(still)).toBeVisible();
    await expect(page.locator(still)).toHaveJSProperty("complete", true);
    expect(await opacity(page)).toBe("1");
    const quiet = await boxes(page, still, ".turntable");
    expectInside(quiet.still, quiet.stage);
    expect(quiet.scrollWidth).toBeLessThanOrEqual(quiet.innerWidth);
    const next = await page.locator("section.meet").boundingBox();
    expect(quiet.stage.y + quiet.stage.height).toBeLessThanOrEqual(next!.y);
    for (const selector of [
      "#controls",
      "#bring-toggle",
      "#shuffle",
      ".introduction .hint",
    ])
      await expect(page.locator(selector)).toBeHidden();
    await expect(page.locator("h1")).toHaveText("Meet Thingy.");
    await expect(page.locator("#meet-title")).toBeVisible();
    await expect(page.getByRole("link", { name: "Thingy Kit" })).toBeVisible();
  });

  test("the integration example shows its still in the component's box", async ({
    page,
  }) => {
    await page.goto("/examples/workshop.html");
    const live = await boxes(
      page,
      ".live thingy-character > img",
      ".live thingy-character",
    );
    expectInside(live.still, live.stage);
    expect(live.stage.height).toBe(420);
    expect(live.scrollWidth).toBeLessThanOrEqual(live.innerWidth);
  });
});
