import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { Pool } from "pg";
import { CHEAT_DEFINITIONS } from "../../src/game/cheats";
import { effectWallTimeToTarget } from "../../src/game/effects";
import {
  PUZZLE_MECHANICS,
  puzzleSolutionEvents,
  type PuzzleSceneEvent,
} from "../../src/game/puzzle-scenes";
import { selectNextCheat } from "../../src/game/selection";
import { config } from "dotenv";
import { retryTransientDatabaseOperation } from "../database-retry";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for browser acceptance tests");
}

const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, keepAlive: true, max: 5 }) });
const cleanupPool = new Pool({ connectionString: process.env.DATABASE_URL, keepAlive: true, max: 1 });
const storageKey = "time-hacker.player-id.v1";
const createdPlayers = new Set<string>();
const allCreatedPlayers = new Set<string>();
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
  allCreatedPlayers.add(playerId);
  await page.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [storageKey, playerId] as const,
  );
  return playerId;
}

async function openReadyGame(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Can you stop time at 10\.00 seconds/i })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: /START.*Space or Enter/i })).toBeEnabled({ timeout: 60_000 });
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

async function performPuzzleEvent(page: Page, event: PuzzleSceneEvent) {
  const object = page.locator(`[data-puzzle-target="${event.target}"]`);
  const moveObject = async () => {
    const box = await object.boundingBox();
    if (!box) throw new Error(`Puzzle target ${event.target} is not visible`);
    const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = startX + (startX < viewport.width / 2 ? 72 : -72);
    const endY = startY + (startY < viewport.height / 2 ? 18 : -18);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 6 });
    await page.mouse.up();
  };

  switch (event.mechanic) {
    case "tap":
    case "sequence":
    case "toggle":
    case "sort":
      await object.click();
      break;
    case "double-tap":
      await object.dblclick();
      break;
    case "hold": {
      const box = await object.boundingBox();
      if (!box) throw new Error(`Puzzle target ${event.target} is not visible`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      break;
    }
    case "drag":
    case "align":
    case "rotate":
    case "trace":
    case "orbit":
    case "rub":
    case "balance":
    case "assemble":
      await moveObject();
      break;
    case "rhythm":
      await object.click();
      await page.waitForTimeout(160);
      await object.click();
      break;
    case "interval":
      await object.click();
      await page.waitForTimeout(520);
      await object.click();
      break;
    case "wait":
      await page.waitForTimeout(2_550);
      break;
    case "focus":
      await object.focus();
      break;
    case "keyboard":
      await object.focus();
      await page.keyboard.press("Enter");
      break;
    case "wheel":
      await object.hover();
      await page.mouse.wheel(0, 180);
      break;
    case "orientation":
      await page.evaluate(() => window.dispatchEvent(new Event("orientationchange")));
      await page.waitForTimeout(450);
      break;
    case "visibility":
      await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await page.waitForTimeout(450);
      break;
    case "locale":
      await page.locator(".menu-button").click();
      await page.locator(".language-row").click();
      await page.locator(".drawer-header button").last().click();
      break;
    case "camera":
      await object.click();
      await page.locator(".camera-fallback").click();
      await expect(page.locator(".scene-camera-backdrop")).toHaveCount(0);
      break;
    case "resize": {
      const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
      await page.setViewportSize({ width: viewport.width - 80, height: viewport.height });
      await page.waitForTimeout(450);
      break;
    }
  }
}

async function armAssignedCheat(page: Page, expectedSlug?: string, difficulty = 1, onOpened?: () => Promise<void>) {
  const slug = await page.evaluate(async ([storageKey, difficulty]) => {
    const playerId = localStorage.getItem(storageKey);
    const response = await fetch(`/api/dashboard?playerId=${encodeURIComponent(playerId ?? "")}&difficulty=${difficulty}`);
    const dashboard = await response.json() as { suggestedCheat?: { slug?: string } };
    return dashboard.suggestedCheat?.slug ?? null;
  }, [storageKey, difficulty] as const);
  if (expectedSlug) expect(slug).toBe(expectedSlug);
  const definition = CHEAT_DEFINITIONS.find((cheat) => cheat.slug === slug);
  const scene = definition?.triggerConfig.puzzleScene;
  if (!scene) throw new Error(`Missing puzzle scene for ${slug ?? "unknown"}`);
  await expect(page.locator(`[data-scene-id="${scene.sceneId}"]`)).toBeVisible();
  if (onOpened) await onOpened();
  const sceneRoot = page.locator(".puzzle-scene");
  for (const [index, event] of puzzleSolutionEvents(scene).entries()) {
    const completedSteps = Number(await sceneRoot.getAttribute("data-puzzle-step"));
    if (completedSteps >= index + 1) continue;
    await performPuzzleEvent(page, event);
    await expect.poll(async () => Number(await sceneRoot.getAttribute("data-puzzle-step"))).toBeGreaterThanOrEqual(index + 1);
  }
  await expect(sceneRoot).toHaveClass(/is-armed/);
}

test.afterEach(async ({ page }) => {
  if (!page.isClosed()) await page.close();
  const ids = [...createdPlayers];
  createdPlayers.clear();
  if (ids.length > 0) {
    await cleanupPool.query('DELETE FROM "User" WHERE "playerId" = ANY($1::text[])', [ids]);
  }
});

test.afterAll(async () => {
  await database.$disconnect();
  const ids = [...allCreatedPlayers];
  if (ids.length > 0) {
    await cleanupPool.query('DELETE FROM "User" WHERE "playerId" = ANY($1::text[])', [ids]);
  }
  await cleanupPool.end();
});

test("responsive initial state has no serious accessibility, console, or overflow failure", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "webkit-desktop",
    "WebKit UI coverage uses the deterministic mocked-API suite; PostgreSQL is covered by Edge and integration tests.",
  );
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await createBrowserPlayer(page);
  await openReadyGame(page);

  await expect(page.locator(".stopwatch-card")).toBeVisible();
  await expect(page.locator('link[rel~="icon"][href="/time-hacker-icon.svg"]')).toHaveCount(1);
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
  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: /Language.*中文/ }).click();
  const heading = page.getByRole("heading", { name: /让时间停在.*10\.00 秒/ });
  await expect(heading).toBeVisible();
  const headingMetrics = await heading.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
  }));
  expect(headingMetrics.height).toBeLessThanOrEqual(headingMetrics.lineHeight * 1.15);
  await page.getByRole("button", { name: "关闭游戏菜单" }).click();
  await expect(page.locator(".game-drawer")).toBeHidden();
  await takeEvidence(page, testInfo.project.name, "zh-initial");
  await expect(page.getByRole("button", { name: /开始.*空格键或回车键/ })).toBeEnabled();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
  await page.reload();
  await expect(page.getByRole("heading", { name: /让时间停在.*10\.00 秒/ })).toBeVisible();
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

  await page.getByRole("button", { name: /START.*Space or Enter/i }).click();
  await expect(page.getByRole("button", { name: /STOP.*Space or Enter/i })).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "running");
  await page.getByRole("button", { name: /STOP.*Space or Enter/i }).click();
  await expect(page.getByRole("heading", { name: "So close. Again?" })).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "failure");

  await page.getByRole("button", { name: /Run again.*Space or Enter/i }).click();
  await armAssignedCheat(page);
  await takeEvidence(page, testInfo.project.name, "armed");
  const journeyEffect = CHEAT_DEFINITIONS.find(({ slug }) => slug === "five-finger-echo")!.effectConfig;
  await normalizeNextCompletionToTarget(page, effectWallTimeToTarget(journeyEffect));
  const armedPrimary = page.getByRole("button", { name: /START.*Space or Enter/i });
  await armedPrimary.click();
  await expect(page.getByRole("button", { name: /STOP.*Space or Enter/i })).toBeVisible();
  await page.getByRole("button", { name: /STOP.*Space or Enter/i }).click();
  await expect(page.getByRole("heading", { name: "Perfect hit! You conquered time." })).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "success");

  await page.getByRole("button", { name: "Open game menu" }).click();
  await expect(page.getByRole("button", { name: "Pure mode" })).toBeEnabled();
  await page.getByRole("button", { name: "Close game menu" }).click();
  await page.getByRole("button", { name: /Share result/i }).click();
  await expect(page.getByText(/Result (copied|shared)|Copy the result manually/)).toBeVisible();

  const persistedId = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(persistedId).toBe(playerId);
  await page.reload();
  await page.getByRole("button", { name: "Open game menu" }).click();
  await expect(page.getByRole("button", { name: /Cheat Catalog.*1.*100/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pure mode" })).toBeEnabled();
});

test("an activated full-dilation secret visibly slows the running stopwatch", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Timing effect measurement runs once on desktop.");
  const definition = CHEAT_DEFINITIONS.find(({ difficulty, effectConfig }) =>
    difficulty === 1 && effectConfig.type === "FULL_DILATION",
  );
  if (!definition) throw new Error("No D1 full-dilation secret is available");
  await createBrowserPlayer(page, playerIdForAssignment(definition.slug, 0, 1));
  await openReadyGame(page);
  await armAssignedCheat(page, definition.slug, 1);
  await page.getByRole("button", { name: /START.*Space or Enter/i }).click();
  await expect(page.getByRole("button", { name: /STOP.*Space or Enter/i })).toBeVisible();
  const before = Number.parseFloat(await page.locator(".timer-readout > span").innerText());
  await page.waitForTimeout(1_000);
  const after = Number.parseFloat(await page.locator(".timer-readout > span").innerText());
  const displayedDelta = after - before;
  expect(displayedDelta).toBeGreaterThan(0.35);
  expect(displayedDelta).toBeLessThan(0.65);
  await page.getByRole("button", { name: /STOP.*Space or Enter/i }).click();
  await expect(page.getByRole("heading", { name: "So close. Again?" })).toBeVisible();
});

test("a camera-enabled secret offers opt-in and preserves the touch fallback", async ({ page }, testInfo) => {
  test.skip(
    !["desktop-1440", "mobile-390"].includes(testInfo.project.name),
    "Camera fallback runs on representative desktop and mobile viewports.",
  );
  const definition = CHEAT_DEFINITIONS.find(({ slug }) => slug === "ten-thousand-glyph")!;
  const playerId = playerIdForAssignment(definition.slug, 0, definition.difficulty);
  await createBrowserPlayer(page, playerId);
  await database.user.create({
    data: { playerId, currentLevel: 20, successGames: 1, firstSuccessAt: new Date() },
  });
  await openReadyGame(page);
  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("combobox").selectOption(String(definition.difficulty));
  await page.getByRole("button", { name: "Close game menu" }).click();
  const cameraTarget = page.locator(`[data-puzzle-target="${definition.triggerConfig.puzzleScene?.discoveryRule.target}"]`);
  await cameraTarget.click();
  await expect(page.getByRole("button", { name: "Enable camera" })).toBeVisible();
  await page.getByRole("button", { name: "Use touch instead" }).click();
  await armAssignedCheat(
    page,
    definition.slug,
    definition.difficulty,
    () => takeEvidence(page, testInfo.project.name, "camera-secret-opt-in"),
  );
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
  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: "Pure mode" }).click();
  await expect(page.getByRole("button", { name: "Pure mode" })).toHaveClass(/active/);
  await page.getByRole("button", { name: "Close game menu" }).click();
  const primary = page.getByRole("button", { name: /START.*Space or Enter/i });
  await normalizeNextCompletionToTarget(page);
  await primary.focus();
  await page.keyboard.press("Space");
  const stop = page.getByRole("button", { name: /STOP.*Space or Enter/i });
  await expect(stop).toBeVisible();
  await stop.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("heading", { name: "Perfect hit! You conquered time." })).toBeVisible();
  await page.getByRole("button", { name: /Run again.*Space or Enter/i }).click();

  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: /Cheat Catalog.*1.*100/ }).click();
  await expect(page.locator(".collection-panel h2")).toHaveText("Cheat Catalog");
  await takeEvidence(page, testInfo.project.name, "collection");

  await page.getByRole("button", { name: "Back to game menu" }).click();
  await page.getByRole("button", { name: "Leaderboard" }).click();
  await expect(page.locator(".rankings-panel h2")).toHaveText("Leaderboard");
  await expect(page.getByText(/Time Hackers/)).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "rankings");

  await page.getByRole("button", { name: "Back to game menu" }).click();
  await page.getByRole("button", { name: /Reset progress/i }).click();
  await expect(page.getByRole("dialog", { name: "Reset your progress?" })).toBeVisible();
  await takeEvidence(page, testInfo.project.name, "reset-dialog");
  await page.getByRole("button", { name: "Reset my progress" }).click();
  await page.getByRole("button", { name: "Open game menu" }).click();
  await expect(page.getByRole("button", { name: /Cheat Catalog.*0.*100/ })).toBeVisible();
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
  await expect(page.getByRole("button", { name: /START.*Space or Enter/i })).toBeDisabled();

  await page.evaluate(() => { document.body.style.zoom = "2"; });
  await expect(page.getByRole("button", { name: /START.*Space or Enter/i })).toBeVisible();
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
  await page.getByRole("button", { name: /START.*Space or Enter/i }).click();
  await expect(page.getByRole("button", { name: /STOP.*Space or Enter/i })).toBeVisible();
});

const mechanicCases = PUZZLE_MECHANICS.map((mechanic, index) => {
  const desiredDifficulty = (index % 5) + 1;
  const candidates = CHEAT_DEFINITIONS.filter((definition) => definition.triggerConfig.puzzleScene?.primaryMechanic === mechanic);
  const definition = candidates.find(({ difficulty }) => difficulty === desiredDifficulty) ?? candidates[0];
  if (!definition) throw new Error(`No puzzle definition for ${mechanic}`);
  return { mechanic, difficulty: definition.difficulty, slug: definition.slug };
});

for (const entry of mechanicCases) {
  test(`puzzle mechanic ${entry.mechanic} is reachable with its native browser interaction`, async ({ browser }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-1440", "Mechanic coverage runs once on desktop.");
    expect(new Set(mechanicCases.map(({ difficulty }) => difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const playerId = playerIdForAssignment(entry.slug, 0, entry.difficulty);
    createdPlayers.add(playerId);
    allCreatedPlayers.add(playerId);
    await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [storageKey, playerId] as const);
    await retryTransientDatabaseOperation(() => database.user.create({
      data: { playerId, currentLevel: 20, successGames: 1, firstSuccessAt: new Date() },
    }));
    await openReadyGame(page);
    if (entry.difficulty > 1) {
      await page.getByRole("button", { name: "Open game menu" }).click();
      await page.getByRole("combobox").selectOption(String(entry.difficulty));
      await page.getByRole("button", { name: "Close game menu" }).click();
    }
    await armAssignedCheat(
      page,
      entry.slug,
      entry.difficulty,
      () => takeEvidence(page, "puzzle-mechanics", entry.mechanic),
    );
    await context.close();
  });
}
