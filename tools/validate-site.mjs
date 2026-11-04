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
// Nor does thingy.js, or any other script: it runs inside other sites' pages.
for (const file of files.filter((f) => f.endsWith(".js")))
  assert.ok(
    !(await fs.readFile(file, "utf8")).includes("tinylytics.app"),
    `Analytics in a script: ${file}`,
  );
// The deploy build loads Tinylytics' shared script, keyed by data-site, once.
if (process.env.THINGY_TINYLYTICS === "true") {
  const home = await read("index.html");
  assert.equal(
    home.split("tinylytics.app").length - 1,
    1,
    "index.html names tinylytics.app once",
  );
  assert.ok(
    home.includes(
      's.src = "https://tinylytics.app/js/script.js"; s.dataset.site = "iJwbo9BJKkpgx7a9sZo1";',
    ),
    "index.html loads the shared Tinylytics script for this site",
  );
}

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
  "https://thingy.thingelstad.xyz/persona/",
  "https://thingy.thingelstad.xyz/print/",
]);
for (const loc of locs) {
  const pathname = new URL(loc).pathname.slice(1);
  const page = loc.endsWith("/") ? `${pathname}index.html` : pathname;
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
// The persona page and /persona.md are the same file, rendered and as is.
const persona = await fs.readFile("persona/THINGY.md", "utf8");
assert.equal(
  await read("persona.md"),
  persona,
  "persona.md is persona/THINGY.md",
);
const personaPage = await read("persona/index.html");
assert.ok(!personaPage.includes("<!-- persona"), "persona page is rendered");
for (const [, heading] of persona.matchAll(/^#{2,3} (.+)$/gm))
  assert.ok(
    personaPage.includes(
      `>${heading.replace(/`([^`]+)`/g, "<code>$1</code>")}</h`,
    ),
    `persona page has the heading ${heading}`,
  );
assert.ok(
  !/\*\*|\]\(/.test(personaPage.replace(/<[^>]+>/g, "")),
  "no Markdown left in the persona page text",
);
assert.match(
  llms,
  /https:\/\/thingy\.thingelstad\.xyz\/persona\.md/,
  "llms.txt names persona.md",
);
console.log(`Site OK: ${files.length} files, ${locs.length} sitemap URLs`);
