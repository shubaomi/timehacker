import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "first-level-loop.spec.ts",
  workers: 1,
  outputDir: "test-results/first-level-runs",
  timeout: 60000,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3011", channel: "msedge", trace: "retain-on-failure" },
  // Explicitly use the isolated local server; never invoke the production build/deploy scripts.
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile-390", use: { viewport: { width: 390, height: 844 } } },
    { name: "mobile-360-english", use: { viewport: { width: 360, height: 800 }, contextOptions: { reducedMotion: "reduce" } } },
    { name: "tablet", use: { viewport: { width: 734, height: 876 } } },
    { name: "short", use: { viewport: { width: 590, height: 698 } } },
  ],
});
