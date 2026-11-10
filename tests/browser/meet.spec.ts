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
  } else {
    await expect(zoom).toBeVisible();
    await expect(hint).toContainText("Scroll to zoom");
  }
});

test("on a phone or tablet the hint clears him, and he keeps his size", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "below the rails only");
  await page.goto("/?life=off");
  const character = page.locator("#main-thingy");
  await expect(character).toHaveAttribute("data-ready", "", { timeout: 30000 });
  const hint = page.locator(".introduction .hint");
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [900, 1200],
  ]) {
    await page.setViewportSize({ width, height });
    // The hint takes no room from the stage: on a phone it starts where it did
    // before there was a hint.
    if (width <= 640)
      expect(
        await page
          .locator(".studio")
          .evaluate((el) =>
            getComputedStyle(el).getPropertyValue("--stage-top"),
          ),
      ).toBe("64px");
    // His words show at his feet.
    await character.evaluate((el) =>
      el.dispatchEvent(new CustomEvent("thingy-tap", { bubbles: true })),
    );
    for (const tab of ["none", "scene", "accessories", "face", "bring"]) {
      await page.evaluate((t) => {
        document.querySelector<HTMLElement>("#controls")!.dataset.tab = t;
        scrollTo(0, 0);
      }, tab);
      await page.waitForTimeout(500);
      const where = `${width}px, ${tab}`;
      await expect(hint, where).toBeVisible();
      const box = (await hint.boundingBox())!;
      // Nothing it could run into: Bring him, the line beside it, the sheet,
      // his words.
      const others = await page.evaluate(() => {
        const title = document.createRange();
        title.selectNodeContents(
          document.querySelector(".introduction p:not(.hint)")!,
        );
        return [
          title.getBoundingClientRect(),
          ...[".bring-toggle", "#controls", "#speech"].map((selector) =>
            document.querySelector(selector)!.getBoundingClientRect(),
          ),
        ].map(({ x, y, width, height }) => ({ x, y, width, height }));
      });
      for (const other of others)
        if (other.width && other.height)
          expect(
            box.x + box.width <= other.x ||
              other.x + other.width <= box.x ||
              box.y + box.height <= other.y ||
              other.y + other.height <= box.y,
            `${where}: the hint overlaps ${JSON.stringify(other)}`,
          ).toBe(true);
      // And none of him is there, with a few pixels of air: the hint's corner of
      // the page looks the same with him drawn and not.
      const clip = {
        x: Math.max(0, box.x - 4),
        y: Math.max(0, box.y - 4),
        width: box.width + 8,
        height: box.height + 8,
      };
      const drawn = await page.screenshot({ clip });
      const hidden = await page.addStyleTag({
        content: "#main-thingy, #main-thingy * { opacity: 0 !important; }",
      });
      const without = await page.screenshot({ clip });
      await hidden.evaluate((style) => style.remove());
      expect(drawn.equals(without), `${where}: the hint runs into him`).toBe(
        true,
      );
    }
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
