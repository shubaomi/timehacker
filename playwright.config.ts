import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const windowsEdge = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const localBrowser = process.platform === "win32" && existsSync(windowsEdge)
  ? { channel: "msedge" as const }
  : {};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: "pnpm build && pnpm start --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop-1440",
      use: { ...devices["Desktop Chrome"], ...localBrowser, viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile-360",
      use: { ...devices["Desktop Chrome"], ...localBrowser, viewport: { width: 360, height: 800 } },
    },
    {
      name: "mobile-390",
      use: { ...devices["Desktop Chrome"], ...localBrowser, viewport: { width: 390, height: 844 } },
    },
    {
      name: "tablet-768",
      use: { ...devices["Desktop Chrome"], ...localBrowser, viewport: { width: 768, height: 1024 } },
    },
    {
      name: "reduced-motion",
      use: {
        ...devices["Desktop Chrome"],
        ...localBrowser,
        viewport: { width: 1440, height: 900 },
        contextOptions: { reducedMotion: "reduce" },
      },
    },
    {
      name: "webkit-desktop",
      use: {
        ...devices["Desktop Safari"],
        browserName: "webkit",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
