import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { CHEAT_DEFINITIONS } from "../../src/game/cheats";

const playerId = "cognitive-redesign-e2e";
let activeLevelId = 1;

function dashboard() {
  const suggestedCheat = CHEAT_DEFINITIONS[activeLevelId - 1];
  return {
    player: { playerId, displayName: "Player COGNITIVE", nickname: null, currentLevel: activeLevelId, totalGames: 2, successGames: 1, bestErrorMs: 0, firstSuccessAt: "2026-08-31T00:00:00.000Z", unlockedCheats: Math.max(0, activeLevelId - 1) },
    daily: { limit: 50, attempts: 2, remaining: 48, resetsAt: "2026-09-01T00:00:00.000Z" },
    difficulty: Math.ceil(activeLevelId / 20),
    maximumDifficulty: 5,
    suggestedCheat,
    campaign: { track: "FULL" as const, totalLevels: 100, completedLevels: Math.max(0, activeLevelId - 1), currentLevelNumber: activeLevelId, complete: false },
    collection: CHEAT_DEFINITIONS.map((cheat, index) => ({ slug: cheat.slug, name: index < activeLevelId ? cheat.name : "CLASSIFIED", nameZh: index < activeLevelId ? cheat.nameZh : "尚未解锁", description: index < activeLevelId ? cheat.description : null, descriptionZh: index < activeLevelId ? cheat.descriptionZh : null, difficulty: cheat.difficulty, category: cheat.category, unlocked: index < activeLevelId, completedAt: index < activeLevelId ? "2026-08-31T00:00:00.000Z" : null })),
  };
}

async function openLevel(page: Page, levelId: number) {
  activeLevelId = levelId;
  await page.goto("/");
  await expect(page.getByTestId("puzzle-scene")).toHaveAttribute("data-v2-slug", CHEAT_DEFINITIONS[levelId - 1].slug);
}

test.beforeEach(async ({ page }) => {
  activeLevelId = 1;
  await page.context().addCookies([{ name: "time-hacker.locale", value: "en", url: "http://127.0.0.1:3011" }]);
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, value);
    localStorage.setItem("time-hacker.locale.v1", "en");
  }, ["time-hacker.player-id.v1", playerId] as const);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/dashboard") return route.fulfill({ json: dashboard() });
    if (url.pathname === "/api/player") return route.fulfill({ json: { player: { playerId } } });
    if (url.pathname === "/api/rankings") return route.fulfill({ json: { timeHackers: [], perfectTiming: [], cheatMasters: [] } });
    return route.fulfill({ status: 204, body: "" });
  });
});

test("production opens the authored 001 mechanism without a synthetic pre-gate", async ({ page }) => {
  activeLevelId = 1;
  await page.goto("/");
  await expect(page.getByTestId("cognitive-evidence-gate")).toHaveCount(0);
  await expect(page.getByTestId("puzzle-scene")).toHaveAttribute("data-v2-slug", CHEAT_DEFINITIONS[0].slug);
  await expect(page.locator("[data-controller='corner-repair']")).toBeVisible();
  await expect(page.getByRole("button", { name: "Loose paper corner" })).toBeVisible();
});

test("002 quiet mechanism stays clear of the title, timer card, and primary action", async ({ page }) => {
  activeLevelId = 2;
  await page.goto("/");
  await expect(page.getByTestId("puzzle-scene")).toHaveAttribute("data-v2-slug", CHEAT_DEFINITIONS[1].slug);
  const controller = page.locator("[data-controller='patient-hold']");
  await expect(controller).toBeVisible();
  await page.waitForTimeout(2_600);
  await expect(page.getByRole("button", { name: "Quiet bubble" })).toBeVisible();

  const overlaps = await controller.evaluate((element) => {
    const controllerBox = element.getBoundingClientRect();
    return [".challenge-copy h1", ".stopwatch-card", ".play-button"].filter((selector) => {
      const protectedElement = document.querySelector<HTMLElement>(selector);
      if (!protectedElement) return false;
      const protectedBox = protectedElement.getBoundingClientRect();
      return !(
        controllerBox.right + 4 <= protectedBox.left
        || controllerBox.left >= protectedBox.right + 4
        || controllerBox.bottom + 4 <= protectedBox.top
        || controllerBox.top >= protectedBox.bottom + 4
      );
    });
  });
  expect(overlaps).toEqual([]);
});

test("representative chapter boundaries expose the authored puzzle without a synthetic pre-gate", async ({ page }, testInfo) => {
  for (const id of [1, 12, 13, 36, 37, 60, 61, 84, 85, 100]) {
    await openLevel(page, id);
    await expect(page.getByTestId("cognitive-evidence-gate")).toHaveCount(0);
    await expect(page.getByTestId("spatial-time-field")).toHaveAttribute("aria-hidden", "true");
    await expect(page.getByTestId("spatial-time-field")).toHaveCSS("pointer-events", "none");
    if (id === 1 || id === 100) {
      const screenshotDir = path.resolve("artifacts", "screenshots", "cognitive-redesign", testInfo.project.name);
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({ path: path.join(screenshotDir, `level-${String(id).padStart(3, "0")}-direct-puzzle.png`), fullPage: true });
    }
  }
});

test("the production puzzle and timer stay in one page coordinate system", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The responsive coordinate-system regression runs once in Chromium.");

  const revealPuzzle = async () => openLevel(page, 1);

  await revealPuzzle();
  const desktop = await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>(".game-shell")!;
    const scene = document.querySelector<HTMLElement>("[data-testid='puzzle-scene']")!;
    const timer = document.querySelector<HTMLElement>(".stopwatch-card")!;
    const action = document.querySelector<HTMLElement>(".play-button")!;
    return {
      shellClasses: shell.className,
      scenePosition: getComputedStyle(scene).position,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      timer: timer.getBoundingClientRect().toJSON(),
      action: action.getBoundingClientRect().toJSON(),
    };
  });
  expect(desktop.shellClasses).toContain("cognitive-puzzle-active");
  expect(desktop.scenePosition).toBe("absolute");
  expect(desktop.scrollHeight).toBeLessThanOrEqual(desktop.viewportHeight + 1);
  expect(desktop.timer.top).toBeGreaterThanOrEqual(0);
  expect(desktop.action.bottom).toBeLessThanOrEqual(desktop.viewportHeight);

  await page.setViewportSize({ width: 590, height: 698 });
  await revealPuzzle();
  const shortBefore = await page.evaluate(() => {
    const scene = document.querySelector<HTMLElement>("[data-testid='puzzle-scene']")!;
    const timer = document.querySelector<HTMLElement>(".stopwatch-card")!;
    return {
      scenePosition: getComputedStyle(scene).position,
      sceneTop: scene.getBoundingClientRect().top,
      timerTop: timer.getBoundingClientRect().top,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  });
  expect(shortBefore.scenePosition).toBe("absolute");
  expect(shortBefore.scrollHeight).toBeGreaterThan(shortBefore.viewportHeight);

  await page.evaluate(() => window.scrollTo(0, 220));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const shortAfter = await page.evaluate(() => {
    const scene = document.querySelector<HTMLElement>("[data-testid='puzzle-scene']")!;
    const timer = document.querySelector<HTMLElement>(".stopwatch-card")!;
    return {
      sceneTop: scene.getBoundingClientRect().top,
      timerTop: timer.getBoundingClientRect().top,
    };
  });
  expect(shortAfter.sceneTop - shortBefore.sceneTop).toBeCloseTo(shortAfter.timerTop - shortBefore.timerTop, 0);

  for (const levelId of [43, 81]) {
    await openLevel(page, levelId);
    const controller = page.locator("[data-controller]");
    await controller.scrollIntoViewIfNeeded();
    const controllerBox = await controller.boundingBox();
    expect(controllerBox).not.toBeNull();
    expect(controllerBox!.y).toBeGreaterThanOrEqual(0);
    expect(controllerBox!.y + controllerBox!.height).toBeLessThanOrEqual(699);
  }
});

test("all 100 levels mount their authored controller directly", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The exhaustive mount audit runs once in Chromium.");
  for (let levelId = 1; levelId <= CHEAT_DEFINITIONS.length; levelId += 1) {
    await openLevel(page, levelId);
    await expect(page.getByTestId("cognitive-evidence-gate")).toHaveCount(0);
    await expect(page.locator("[data-controller]"), `level ${String(levelId).padStart(3, "0")}`).toHaveCount(1);
  }
});
