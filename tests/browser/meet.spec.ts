import { test, expect, type Page } from "@playwright/test";

/*
 * The home page says who he is, under the stage: his jobs, each with a still and a
 * link to where he does it. It is in the page source, so it reads with scripts off.
 */
const JOBS = [
  [
    "Librarian",
    "Ask Thingy",
    "https://thingy.thingelstad.com/?ref=character-jobs",
  ],
  [
    "Builder and record keeper",
    "Things I’ve Built",
    "https://thingelstad.xyz/?ref=character-jobs",
  ],
  [
    "Host",
    "The Members page",
    "https://weekly.thingelstad.com/members/?ref=character-jobs",
  ],
  [
    "Narrator",
    "The Weekly Thing, audio",
    "https://weekly.thingelstad.com/podcast/?ref=character-jobs",
  ],
] as const;

async function expectIntroduction(page: Page): Promise<void> {
  const meet = page.locator("section.meet");
  await meet.scrollIntoViewIfNeeded();
  await expect(meet.getByRole("heading", { level: 2 })).toHaveText(
    "Who he is.",
  );
  await expect(meet.locator(".meet-lede")).toHaveText(
    "Jamie’s agent sidekick. He has read everything Jamie has published, and each place he works gives him a job.",
  );
  const rows = meet.locator(".meet-jobs > li");
  await expect(rows).toHaveCount(4);
  for (const [index, [job, label, href]] of JOBS.entries()) {
    const row = rows.nth(index);
    await expect(row.getByRole("heading", { level: 3 })).toHaveText(job);
    const link = row.getByRole("link");
    await expect(link).toHaveText(label);
    await expect(link).toHaveAttribute("href", href);
    const still = row.locator("img");
    await expect(still).toBeVisible();
    await expect(still).toHaveAttribute("alt", /^Thingy /);
    await expect
      .poll(() => still.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(1000);
  }
  await expect(
    meet.getByRole("link", { name: "Who Thingy is" }),
  ).toHaveAttribute("href", "/persona/");
  // Nothing in it is wider than the page.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("the home page says who he is, under the stage", async ({ page }) => {
  await page.goto("/?life=off");
  await expect(page.locator("#main-thingy")).toHaveAttribute("data-ready", "", {
    timeout: 30000,
  });
  await expectIntroduction(page);
  // The site's external-link mark is drawn into each job's link.
  await expect(
    page.locator(".meet-jobs [data-icon='external'] svg"),
  ).toHaveCount(4);
  // Each link shows where focus is.
  const first = page.locator(".meet-jobs a").first();
  await first.focus();
  expect(await first.evaluate((a) => getComputedStyle(a).outlineStyle)).toBe(
    "solid",
  );
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the introduction is in the page, readable as it is", async ({
    page,
  }) => {
    await page.goto("/");
    await expectIntroduction(page);
  });
});

test("the hint says only what works with the pointer in hand", async ({
  page,
}, info) => {
  await page.goto("/?life=off");
  await expect(page.locator("#main-thingy")).toHaveAttribute("data-ready", "", {
    timeout: 30000,
  });
  const hint = page.locator(".introduction .hint");
  await expect(hint).toBeVisible();
  await expect(hint).toContainText("Tap to talk");
  await expect(hint).toContainText("Drag to turn");
  const zoom = page.locator(".hint .hint-zoom");
  if (info.project.name === "phone") {
    // A finger's scroll moves the page, not him.
    await expect(zoom).toBeHidden();
    // The stage starts below it, so it never runs across his antenna, and the
    // sheet and his words stay at his feet, whichever panel is open.
    for (const tab of ["none", "scene", "face", "bring"]) {
      await page.evaluate((t) => {
        document.querySelector<HTMLElement>("#controls")!.dataset.tab = t;
      }, tab);
      const [hintBox, stage, sheet] = await Promise.all([
        hint.boundingBox(),
        page.locator(".turntable").boundingBox(),
        page.locator("#controls").boundingBox(),
      ]);
      expect(hintBox!.y + hintBox!.height).toBeLessThanOrEqual(stage!.y + 0.5);
      expect(hintBox!.y + hintBox!.height).toBeLessThan(sheet!.y);
    }
  } else {
    await expect(zoom).toBeVisible();
    await expect(hint).toContainText("Scroll to zoom");
  }
});

test("his question to Ask Thingy, and the nav's link, say they came from here", async ({
  page,
}) => {
  await page.goto("/?life=off");
  const character = page.locator("#main-thingy");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  await expect(page.locator(".site-header .ask")).toHaveAttribute(
    "href",
    "https://thingy.thingelstad.com/?ref=character-nav",
  );
  await character.evaluate((el) =>
    el.dispatchEvent(new CustomEvent("thingy-tap", { bubbles: true })),
  );
  const ask = page.locator("#speech-ask");
  await expect(ask).toBeVisible();
  const url = new URL((await ask.getAttribute("href"))!);
  expect(url.origin + url.pathname).toBe(
    "https://thingy.thingelstad.com/chat/",
  );
  expect(url.searchParams.get("prompt")).toBeTruthy();
  expect(url.searchParams.get("ref")).toBe("character-speech");
  for (const link of await page.locator("footer a").all()) {
    const href = (await link.getAttribute("href"))!;
    if (/thingy\.thingelstad\.com|thingelstad\.xyz\/things/.test(href))
      expect(new URL(href).searchParams.get("ref")).toBe("character-footer");
  }
});
