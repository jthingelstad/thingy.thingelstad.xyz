import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../../persona/THINGY.md", import.meta.url),
  "utf8",
);

test("the persona page renders the persona and serves it as Markdown", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/persona/");
  await expect(page).toHaveTitle("Who Thingy is — Thingy");
  await expect(page.locator("h1")).toHaveText("Who Thingy is.");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText(
    "Who he is",
  );
  const headings = [...source.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  await expect(page.locator(".persona-copy h2")).toHaveText(headings);
  for (const link of await page.locator(".persona-contents ol a").all()) {
    const id = (await link.getAttribute("href"))!.slice(1);
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  }
  const markdown = await page.request.get("/persona.md");
  expect(markdown.ok()).toBe(true);
  expect(await markdown.text()).toBe(source);
  for (const image of await page.locator("main img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({
    path: `/tmp/thingy-persona-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("every page's header fits: no link overlaps the brand or another link", async ({
  page,
}) => {
  for (const path of ["/", "/persona/", "/print/"]) {
    await page.goto(path);
    const problems = await page.evaluate(() => {
      const box = (el: Element) => el.getBoundingClientRect();
      const hit = (a: DOMRect, b: DOMRect) =>
        !(
          a.right <= b.left ||
          b.right <= a.left ||
          a.bottom <= b.top ||
          b.bottom <= a.top
        );
      const boxes = [
        { name: "brand", rect: box(document.querySelector(".brand")!) },
        ...[...document.querySelectorAll<HTMLElement>(".site-header nav a")]
          .filter((link) => link.offsetParent)
          .map((link) => ({ name: link.textContent!.trim(), rect: box(link) })),
      ];
      const found: string[] = [];
      for (let i = 0; i < boxes.length; i++) {
        if (i && boxes[i].rect.height > 30)
          found.push(`${boxes[i].name} wraps`);
        for (let j = i + 1; j < boxes.length; j++)
          if (hit(boxes[i].rect, boxes[j].rect))
            found.push(`${boxes[i].name} / ${boxes[j].name}`);
      }
      return found;
    });
    expect(problems, path).toEqual([]);
  }
});

test("the front page links to the persona page", async ({ page }) => {
  await page.goto("/");
  await page.locator('nav a[href="/persona/"]').click();
  await expect(page).toHaveURL(/\/persona\/$/);
});
