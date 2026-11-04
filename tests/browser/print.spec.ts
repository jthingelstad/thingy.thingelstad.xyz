import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(
    new URL("../../public/print/v0.13/manifest.json", import.meta.url),
    "utf8",
  ),
);

test("the print page offers both files, shows every view and fits a phone", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/print/");
  await expect(page).toHaveTitle("Print Thingy — Thingy");
  await expect(page.locator("h1")).toHaveText("Print Thingy.");
  await expect(page.locator('nav a[aria-current="page"]')).toHaveText(
    "Print Thingy",
  );
  for (const [name, file] of Object.entries(manifest.files) as [
    string,
    { bytes: number },
  ][]) {
    const link = page.locator(`a[download][href="/print/v0.13/${name}"]`);
    await expect(link).toBeVisible();
    const response = await page.request.get(`/print/v0.13/${name}`);
    expect(response.ok()).toBe(true);
    expect((await response.body()).length).toBe(file.bytes);
  }
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
    path: `/tmp/thingy-print-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("the front page links to the print page", async ({ page }) => {
  await page.goto("/");
  // In the header, or in the footer on the narrowest phones.
  await page.locator('a[href="/print/"]:visible').first().click();
  await expect(page).toHaveURL(/\/print\/$/);
});
