import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e", testMatch: /campaign-(polish|visual)\.spec\.ts/, workers: 1,
  outputDir: "test-results/campaign-runs",
  timeout: 360000, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3011", channel: "msedge", contextOptions: { reducedMotion: "reduce" }, trace: "retain-on-failure" },
  projects: [
    { name: "desktop-zh", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile-en", use: { viewport: { width: 360, height: 800 } } },
  ],
});
