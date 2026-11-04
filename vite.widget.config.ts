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
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        banner:
          "/*! Thingy by Jamie Thingelstad, https://thingy.thingelstad.xyz/. CC BY-NC 4.0, https://creativecommons.org/licenses/by-nc/4.0/. Includes Three.js, MIT licence, https://thingy.thingelstad.xyz/shared/three-LICENSE.txt. */",
      },
    },
  },
});
