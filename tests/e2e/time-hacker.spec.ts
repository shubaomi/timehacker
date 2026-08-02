import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { CHEAT_DEFINITIONS } from "../../src/game/cheats";
import { selectNextCheat } from "../../src/game/selection";
import { config } from "dotenv";
import { retryTransientDatabaseOperation } from "../database-retry";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for browser acceptance tests");
}

const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, keepAlive: true, max: 5 }) });
const storageKey = "time-hacker.player-id.v1";
const createdPlayers = new Set<string>();
const screenshotRoot = path.resolve("artifacts", "screenshots");

async function installShareFallback(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => undefined },
    });
  });
}

function playerIdForAssignment(slug: string, totalGames: number, difficulty = 1) {
  const day = new Date().toISOString().slice(0, 10);
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const playerId = randomUUID();
    const selected = selectNextCheat({
      definitions: CHEAT_DEFINITIONS,
      discoveredSlugs: new Set(),
      desiredDifficulty: difficulty,
      seed: `${playerId}:${totalGames}:${day}`,
    });
    if (selected?.slug === slug) return playerId;
  }
  throw new Error(`Could not create a player seed for ${slug}`);
}

async function createBrowserPlayer(page: Page, playerId = randomUUID()) {
  createdPlayers.add(playerId);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [storageKey, playerId] as const,
  );
  return playerId;
}

async function openReadyGame(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Can you hack time/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /START.*SPACE/i })).toBeEnabled({ timeout: 60_000 });
}

async function takeEvidence(page: Page, projectName: string, state: string) {
  const folder = path.join(screenshotRoot, projectName);
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: path.join(folder, `${state}.png`), fullPage: true });
}

async function normalizeNextCompletionToTarget(page: Page, wallDurationMs = 10_000) {
  await page.route("**/api/games/*/complete", async (route) => {
    const payload = route.request().postDataJSON() as Record<string, unknown>;
    await route.continue({
      postData: JSON.stringify({ ...payload, durationMs: 10_000, wallDurationMs }),
      headers: { ...route.request().headers(), "content-type": "application/json" },
    });
  }, { times: 1 });
}

async function assertNoHighImpactAxeFindings(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const highImpact = results.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical",
  );
  expect(highImpact, JSON.stringify(highImpact, null, 2)).toEqual([]);
}

async function armAssignedCheat(page: Page) {
  const assignment = (await page.locator(".briefing-panel h2").textContent())?.trim();
  switch (assignment) {
    case "Five-Finger Echo":
      for (let count = 0; count < 5; count += 1) {
        await page.getByRole("button", { name: /Elapsed game time/i }).click();
      }
      break;
    case "Pressure Delay": {
      const primary = page.getByRole("button", { name: /START.*SPACE/i });
      await primary.dispatchEvent("pointerdown");
      await page.waitForTimeout(1_500);
      await primary.dispatchEvent("pointerup");
      break;
    }
    case "Slow Command":
      await page.keyboard.type("slow");
      break;
    case "Four-Corner Breach":
      for (const corner of ["NW", "NE", "SE", "SW"]) {
        await page.getByRole("button", { name: corner, exact: true }).click();
      }
      break;
    case "Signal Oscillation":
      for (let cycle = 0; cycle < 3; cycle += 1) {
        await page.getByRole("button", { name: /Elapsed game time/i }).click();
        await page.locator(".clue-block").click();
      }
      break;
    default:
      throw new Error(`Unexpected first-level assignment: ${assignment}`);
  }
  await expect(page.getByText("Exploit armed", { exact: true })).toBeVisible();
}

test.afterEach(async () => {
  const ids = [...createdPlayers];
  createdPlayers.clear();
  if (ids.length > 0) {
    await retryTransientDatabaseOperation(() => database.user.deleteMany({ where: { playerId: { in: ids } } }));
  }
});

test.afterAll(async () => {
  await database.$disconnect();
});

test("responsive initial state has no serious accessibility, console, or overflow failure", async ({ page }, testInfo) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await createBrowserPlayer(page);
  await openReadyGame(page);

  await expect(page.locator(".timer-housing")).toBeVisible();
  await expect(page.locator('link[rel~="icon"][href*="icon.svg"]')).toHaveCount(1);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await assertNoHighImpactAxeFindings(page);
  await takeEvidence(page, testInfo.project.name, "initial");
  expect(browserErrors).toEqual([]);
});

test("language switch localizes the interface and persists across reload", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Locale persistence runs once on desktop.");
  await createBrowserPlayer(page);
  await openReadyGame(page);
  await page.getByRole("button", { name: "切换到中文" }).click();
  await expect(page.getByRole("heading", { name: /你能破解.*时间吗/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /开始.*空格/ })).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await page.reload();
  await expect(page.getByRole("heading", { name: /你能破解.*时间吗/ })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
});

test("game journey verifies failure, cheat success, share fallback, and persistence", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Game journey runs once on desktop.");
  await installShareFallback(page);
  const playerId = await createBrowserPlayer(
    page,
    playerIdForAssignment("five-finger-echo", 1),
  );
  await openReadyGame(page);

  await page.getByRole("button", { name: /START.*SPACE/i }).click();
  await expect(page.getByRole("button", { name: /STOP.*FREEZE READING/i })).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "running");
  await page.getByRole("button", { name: /STOP.*FREEZE READING/i }).click();
  await expect(page.getByRole("heading", { name: "TRY AGAIN" })).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "failure");

  await page.getByRole("button", { name: "Run again", exact: true }).click();
  await armAssignedCheat(page);
  await expect(page.locator(".armed-card")).toContainText(/brake pulse/i);
  await takeEvidence(page, testInfo.project.name, "armed");
  await normalizeNextCompletionToTarget(page, 10_500);
  const armedPrimary = page.getByRole("button", { name: /START.*SPACE/i });
  await armedPrimary.click();
  await expect(page.getByRole("button", { name: /STOP.*FREEZE READING/i })).toBeVisible();
  await page.getByRole("button", { name: /STOP.*FREEZE READING/i }).click();
  await expect(page.getByRole("heading", { name: "TIME HACKED!" })).toBeVisible();
  await expect(page.getByText(/HACKER ASSISTED · BRAKE_PULSE/)).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "success");

  await expect(page.getByRole("button", { name: "Pure mode" })).toBeEnabled();
  await page.getByRole("button", { name: /Share field report/i }).click();
  await expect(page.getByText(/Field report (copied|shared)|Copy the field report manually/)).toBeVisible();

  const persistedId = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(persistedId).toBe(playerId);
  await page.reload();
  await expect(page.locator(".metric-grid")).toContainText("CHEATS1/100");
  await expect(page.getByRole("button", { name: "Pure mode" })).toBeEnabled();
});

test("unlocked journey verifies Pure Mode keyboard control, collection, ranks, and isolated reset", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Unlocked journey runs once on desktop.");
  const playerId = await createBrowserPlayer(page);
  const cheat = await database.cheatMethod.findUniqueOrThrow({
    where: { slug: "five-finger-echo" },
  });
  const player = await database.user.create({
    data: {
      playerId,
      totalGames: 1,
      successGames: 1,
      bestErrorMs: 0,
      firstSuccessAt: new Date(),
    },
  });
  await database.userCheat.create({
    data: { userId: player.id, cheatId: cheat.id },
  });
  await openReadyGame(page);
  await page.getByRole("button", { name: "Pure mode" }).click();
  await expect(page.getByRole("button", { name: "Pure mode" })).toHaveClass(/active/);
  const primary = page.getByRole("button", { name: /START.*SPACE/i });
  await normalizeNextCompletionToTarget(page);
  await primary.focus();
  await page.keyboard.press("Space");
  const stop = page.getByRole("button", { name: /STOP.*FREEZE READING/i });
  await expect(stop).toBeVisible();
  await stop.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("heading", { name: "TIME HACKED!" })).toBeVisible();
  await page.getByRole("button", { name: "Run again", exact: true }).click();

  await page.getByRole("button", { name: "Cheat archive" }).click();
  await expect(page.getByRole("heading", { name: "Cheat archive" })).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "collection");

  await page.getByRole("button", { name: "Global ranks" }).click();
  await expect(page.getByRole("heading", { name: "Global ranks" })).toBeVisible();
  await expect(page.getByText(/Time Hackers/)).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "rankings");

  await page.getByRole("button", { name: "Experiment" }).click();
  await page.getByRole("button", { name: /Reset progress/i }).click();
  await expect(page.getByRole("dialog", { name: "Reset your field record?" })).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "reset-dialog");
  await page.getByRole("button", { name: "Reset my progress" }).click();
  await expect(page.locator(".metric-grid")).toContainText("CHEATS0/100");
  await expect(page.getByRole("button", { name: "Pure mode" })).toBeDisabled();
});

test("daily limit blocks the 51st browser start and 200 percent zoom preserves the primary action", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Boundary journey runs once on desktop.");
  const playerId = await createBrowserPlayer(page);
  await openReadyGame(page);
  const user = await database.user.findUniqueOrThrow({ where: { playerId } });
  await database.gameRecord.createMany({
    data: Array.from({ length: 50 }, () => ({
      clientRequestId: randomUUID(),
      userId: user.id,
      mode: "PURE" as const,
    })),
  });
  await page.reload();
  await expect(page.getByText(/Your daily time challenges are complete/)).toBeVisible();
  await expect(page.getByRole("button", { name: /START.*SPACE/i })).toBeDisabled();

  await page.evaluate(() => { document.body.style.zoom = "2"; });
  await expect(page.getByRole("button", { name: /START.*SPACE/i })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBe(true);
});

test("reduced-motion preference keeps the game usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "reduced-motion", "Runs only in reduced-motion project.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await createBrowserPlayer(page);
  await openReadyGame(page);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  await page.getByRole("button", { name: /START.*SPACE/i }).click();
  await expect(page.getByRole("button", { name: /STOP.*FREEZE READING/i })).toBeVisible();
});

test("D1 through D5 representative rituals are reachable with explicit controls", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Difficulty coverage runs once on desktop.");
  const cases = [
    { difficulty: 1, slug: "double-relay", name: "Relay Morse Alpha", run: async (page: Page) => {
      await page.getByText("Accessible ritual controls").click();
      await page.getByRole("button", { name: "Short pulse" }).click();
      await page.getByRole("button", { name: "Long pulse" }).click();
    } },
    { difficulty: 2, slug: "mode-flip", name: "Mode Paradox", run: async (page: Page) => {
      await page.getByRole("button", { name: "Pure mode" }).click();
      await page.getByRole("button", { name: "Hacker mode" }).click();
    } },
    { difficulty: 3, slug: "reverse-sweep", name: "Reverse Sweep", run: async (page: Page) => {
      await page.getByText("Accessible ritual controls").click();
      await page.getByRole("button", { name: "Sweep down", exact: true }).click();
      await page.getByRole("button", { name: "Sweep up", exact: true }).click();
      await page.getByRole("button", { name: "Sweep down", exact: true }).click();
    } },
    { difficulty: 4, slug: "escape-hatch", name: "Escape Hatch", run: async (page: Page) => {
      await page.getByText("Accessible ritual controls").click();
      await page.getByRole("button", { name: "Service Escape" }).click();
      await page.getByRole("button", { name: "Service Enter" }).click();
      await page.getByRole("button", { name: "Service Escape" }).click();
    } },
    { difficulty: 5, slug: "hundred-code", name: "Hundred Code", run: async (page: Page) => {
      const calibration = page.locator(".diagnostic-pads");
      for (const bit of [1, 1, 0, 0, 1, 0, 0]) {
        await calibration.getByRole("button", { name: String(bit), exact: true }).click();
      }
    } },
  ];

  for (const entry of cases) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const playerId = playerIdForAssignment(entry.slug, 0, entry.difficulty);
    createdPlayers.add(playerId);
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [storageKey, playerId] as const);
    await retryTransientDatabaseOperation(() => database.user.create({
      data: { playerId, currentLevel: 20, successGames: 1, firstSuccessAt: new Date() },
    }));
    await openReadyGame(page);
    if (entry.difficulty > 1) {
      await page.getByRole("combobox").selectOption(String(entry.difficulty));
    }
    await expect(page.locator(".briefing-panel h2")).toHaveText(entry.name);
    await entry.run(page);
    await expect(page.getByText("Exploit armed", { exact: true })).toBeVisible();
    await context.close();
  }
});
