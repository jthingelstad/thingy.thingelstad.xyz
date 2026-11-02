// Checks the built site (dist/) after npm run build.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { mime } from "./delivery-plan.mjs";

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(name)));
    else out.push(name);
  }
  return out;
}
const files = await walk("dist");
for (const file of files)
  assert.ok(mime[path.extname(file)], `No MIME type for ${file}`);
const read = (name) => fs.readFile(path.join("dist", name), "utf8");

// Analytics only in the deploy build (THINGY_TINYLYTICS=true).
if (process.env.THINGY_TINYLYTICS !== "true")
  for (const file of files.filter((f) => /\.(html|js)$/.test(f)))
    assert.ok(
      !(await fs.readFile(file, "utf8")).includes("tinylytics.app"),
      `Analytics in a non-production build: ${file}`,
    );
assert.ok(
  !(await read("embed/index.html")).includes("tinylytics.app"),
  "The embed frame never counts hits",
);

assert.match(await read("404.html"), /name="robots" content="noindex"/);
assert.match(await read("embed/index.html"), /name="robots" content="noindex"/);
assert.match(
  await read("robots.txt"),
  /^Sitemap: https:\/\/thingy\.thingelstad\.xyz\/sitemap\.xml$/m,
);
const sitemap = await read("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert.deepEqual(locs, [
  "https://thingy.thingelstad.xyz/",
  "https://thingy.thingelstad.xyz/examples/workshop.html",
]);
for (const loc of locs) {
  const page = loc.endsWith("/")
    ? "index.html"
    : new URL(loc).pathname.slice(1);
  assert.match(
    (await read(page)).replace(/\s+/g, " "),
    new RegExp(`<link rel="canonical" href="${loc}"`),
    `canonical for ${loc}`,
  );
}
const llms = await read("llms.txt");
assert.match(
  llms,
  /^# .+\n\n> .+/,
  "llms.txt opens with a title and a summary",
);
console.log(`Site OK: ${files.length} files, ${locs.length} sitemap URLs`);
