import { defineConfig, type Plugin } from "vite";

// Tinylytics, in the production deploy build only. The deploy job builds with
// THINGY_TINYLYTICS=true; every other build (dev, preview, tests, a plain
// npm run build) carries no reference to tinylytics.app, and the contract
// test fails if one does. Even the deploy build loads the script only on
// thingy.thingelstad.xyz. The /embed/ frame never counts: it lives inside
// other sites' pages, and their own analytics already see those visits.
const TINYLYTICS = "https://tinylytics.app/embed/iJwbo9BJKkpgx7a9sZo1.js";
function tinylytics(enabled: boolean): Plugin {
  return {
    name: "thingy-tinylytics",
    transformIndexHtml(html, context) {
      if (!enabled || context.path.startsWith("/embed/")) return html;
      return [
        {
          tag: "script",
          injectTo: "body",
          children: `if (location.hostname === "thingy.thingelstad.xyz") { const s = document.createElement("script"); s.src = "${TINYLYTICS}"; s.defer = true; document.body.append(s); }`,
        },
      ];
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [
    tinylytics(command === "build" && process.env.THINGY_TINYLYTICS === "true"),
  ],
  build: {
    rollupOptions: {
      input: [
        "index.html",
        "404.html",
        "embed/index.html",
        "examples/workshop.html",
      ],
    },
  },
  server: { host: "127.0.0.1", port: 4321, strictPort: true },
}));
