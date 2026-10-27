import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/pages", outputDir: "test-results/pages", timeout: 45000, workers: 1,
  use: { baseURL: "http://127.0.0.1:3120/digitales-rezeptbuch/", channel: "chrome", serviceWorkers: "allow" },
  webServer: { command: "node scripts/serve-pages.mjs", url: "http://127.0.0.1:3120/digitales-rezeptbuch/", reuseExistingServer: false, timeout: 15000 },
});
