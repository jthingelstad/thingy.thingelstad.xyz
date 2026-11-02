import { defineConfig } from "vite";
export default defineConfig({
  publicDir: false,
  build: {
    emptyOutDir: false,
    lib: {
      entry: "src/element.ts",
      formats: ["es"],
      fileName: () => "thingy.js",
    },
    rollupOptions: { output: { chunkFileNames: "assets/[name]-[hash].js" } },
  },
});
