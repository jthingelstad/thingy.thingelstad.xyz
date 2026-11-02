import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 90000,
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  outputDir: "/tmp/thingy-character-browser-results",
  use: {
    baseURL: "http://127.0.0.1:4322",
    launchOptions: { args: ["--enable-unsafe-swiftshader"] },
    reducedMotion: "no-preference",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1536, height: 1100 } } },
    {
      name: "phone",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4322 --strictPort",
    url: "http://127.0.0.1:4322",
    reuseExistingServer: false,
  },
});
