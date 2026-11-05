import { defineConfig } from "vite";
// The tuning page for the `life` prototype. A branch-only build, kept out of the
// site's own build and deploy: `npx vite build --config vite.life.config.ts`.
export default defineConfig({
  root: "prototype/life",
  base: "./",
  publicDir: false,
  build: {
    outDir: "../../local-only/life",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    modulePreload: false,
    rollupOptions: {
      output: {
        entryFileNames: "life.js",
        chunkFileNames: "life-[hash].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
  server: { host: "127.0.0.1", port: 4391, strictPort: true },
});
