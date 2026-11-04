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

// The persona and kit pages render their Markdown at build time, so each page
// and its .md address (written by tools/write-site-files.mjs) are the same text.
function markdownPages(): Plugin {
  const pages = { persona: "persona/THINGY.md", kit: "kit/KIT.md" };
  return {
    name: "thingy-markdown-pages",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        for (const [name, file] of Object.entries(pages)) {
          if (!html.includes(`<!-- ${name} -->`)) continue;
          let source = readFileSync(file, "utf8");
          // The kit page's hero says what the file's opening says.
          if (name === "kit") source = source.slice(source.indexOf("\n## "));
          const contents = [...source.matchAll(/^## (.+)$/gm)]
            .map((m) => `<li><a href="#${slug(m[1])}">${inline(m[1])}</a></li>`)
            .join("");
          return html
            .replace(`<!-- ${name}-contents -->`, contents)
            .replace(
              `<!-- ${name} -->`,
              renderMarkdown(source, { skipTitle: true }),
            );
        }
        return html;
      },
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    markdownPages(),
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
        "kit/index.html",
      ],
    },
  },
  server: { host: "127.0.0.1", port: 4321, strictPort: true },
}));
