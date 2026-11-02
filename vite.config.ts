import { defineConfig } from "vite";
export default defineConfig({
  build: {
    rollupOptions: {
      input: ["index.html", "embed/index.html", "examples/workshop.html"],
    },
  },
  server: { host: "127.0.0.1", port: 4321, strictPort: true },
});
