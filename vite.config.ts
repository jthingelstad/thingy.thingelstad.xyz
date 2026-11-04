import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import { inline, renderMarkdown, slug } from "./src/markdown";

// Tinylytics, in the production deploy build only. The deploy job builds with
// THINGY_TINYLYTICS=true; every other build (dev, preview, tests, a plain
// npm run build) carries no reference to tinylytics.app, and the contract
// test fails if one does. Even the deploy build loads the script only on
// thingy.thingelstad.xyz. The /embed/ frame never counts: it lives inside
// other sites' pages, and their own analytics already see those visits.
// One shared script for every Tinylytics site, keyed by data-site, with no
// query parameters; options live in the site's Tinylytics settings.
const TINYLYTICS = "https://tinylytics.app/js/script.js";
const TINYLYTICS_SITE = "iJwbo9BJKkpgx7a9sZo1";
function tinylytics(enabled: boolean): Plugin {
  return {
    name: "thingy-tinylytics",
    transformIndexHtml(html, context) {
      if (!enabled || context.path.startsWith("/embed/")) return html;
      return [
        {
          tag: "script",
          injectTo: "body",
          children: `if (location.hostname === "thingy.thingelstad.xyz") { const s = document.createElement("script"); s.defer = true; s.src = "${TINYLYTICS}"; s.dataset.site = "${TINYLYTICS_SITE}"; document.body.append(s); }`,
        },
      ];
    },
  };
}

// The persona page renders persona/THINGY.md at build time, so the page and
// /persona.md (written by tools/write-site-files.mjs) are the same text.
function persona(): Plugin {
  return {
    name: "thingy-persona",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (!html.includes("<!-- persona -->")) return html;
        const source = readFileSync("persona/THINGY.md", "utf8");
        const contents = [...source.matchAll(/^## (.+)$/gm)]
          .map((m) => `<li><a href="#${slug(m[1])}">${inline(m[1])}</a></li>`)
          .join("");
        return html
          .replace("<!-- persona-contents -->", contents)
          .replace(
            "<!-- persona -->",
            renderMarkdown(source, { skipTitle: true }),
          );
      },
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    persona(),
    tinylytics(command === "build" && process.env.THINGY_TINYLYTICS === "true"),
  ],
  build: {
    rollupOptions: {
      input: [
        "index.html",
        "404.html",
        "embed/index.html",
        "examples/workshop.html",
        "print/index.html",
        "persona/index.html",
      ],
    },
  },
  server: { host: "127.0.0.1", port: 4321, strictPort: true },
}));
