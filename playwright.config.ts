import { defineConfig } from "@playwright/test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { resolve } from "node:path";
mkdirSync("work", { recursive: true });
const analysisDir = process.env.RECIPE_E2E_DIR ??= mkdtempSync(resolve("work/e2e-analysis-"));
export default defineConfig({
  testDir: "tests/e2e", outputDir: "test-results/e2e", timeout: 60000, workers: 1,
  use: { baseURL: "http://127.0.0.1:3118", channel: "chrome", serviceWorkers: "allow", trace: "retain-on-failure" },
  webServer: [
    { command: "npm run start --workspace @rezeptbuch/web -- --port 3118", url: "http://127.0.0.1:3118", reuseExistingServer: false, timeout: 30000, env: { LOCAL_ANALYSIS_ENABLED: "false" } },
    { command: "npm run start --workspace @rezeptbuch/web -- --port 3119", url: "http://127.0.0.1:3119", reuseExistingServer: false, timeout: 30000, env: { LOCAL_ANALYSIS_ENABLED: "true", OPENAI_API_KEY: "synthetic-test-key-no-provider-call", OPENAI_MODEL: "synthetic-no-api", RECIPE_DATA_DIR: analysisDir } },
  ],
});
