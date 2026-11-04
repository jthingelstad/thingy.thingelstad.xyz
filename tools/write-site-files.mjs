// After the Vite builds: write dist/sitemap.xml, dist/revision.json and
// dist/persona.md, the persona as agents read it.
//
// Each sitemap URL's lastmod is the last commit that touched the files the
// page is made from, never the build time (search-consoles rule, 2026-10-28).
// CI checks out full history so these dates are true.
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";

const ORIGIN = "https://thingy.thingelstad.xyz";
export const PAGES = [
  {
    path: "/",
    sources: [
      "index.html",
      "src/main.ts",
      "src/config.ts",
      "src/style.css",
      "public/character",
    ],
  },
  {
    path: "/examples/workshop.html",
    sources: ["examples/workshop.html", "public/character"],
  },
  {
    path: "/persona/",
    sources: [
      "persona/index.html",
      "persona/THINGY.md",
      "src/markdown.ts",
      "src/style.css",
    ],
  },
  {
    path: "/print/",
    sources: ["print/index.html", "src/style.css", "public/print"],
  },
];

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const lastCommit = (paths) =>
  git("log", "-1", "--format=%cI", "--", ...paths) ||
  git("log", "-1", "--format=%cI");

const urls = PAGES.map(
  (page) =>
    `  <url>\n    <loc>${ORIGIN}${page.path}</loc>\n    <lastmod>${lastCommit(page.sources)}</lastmod>\n  </url>`,
);
await fs.writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
);
await fs.copyFile("persona/THINGY.md", "dist/persona.md");
await fs.writeFile(
  "dist/revision.json",
  JSON.stringify({
    commit: process.env.GITHUB_SHA || git("rev-parse", "HEAD"),
    builtAt: new Date().toISOString(),
  }) + "\n",
);
