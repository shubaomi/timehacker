import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { CHEAT_DEFINITIONS } from "../../src/game/cheats";

const playerId = "visual-e2e-player";
const screenshotRoot = path.resolve("artifacts", "screenshots");
let forcedCheatIndex: number | null = null;

function dashboard(cheatIndex = 0) {
  return {
    player: {
      playerId,
      displayName: "Player TIME",
      nickname: null,
      currentLevel: 3,
      totalGames: 2,
      successGames: 1,
      bestErrorMs: 0,
      firstSuccessAt: "2026-08-03T00:00:00.000Z",
      unlockedCheats: 1,
    },
    daily: { limit: 50, attempts: 2, remaining: 48, resetsAt: "2026-08-04T00:00:00.000Z" },
    difficulty: 1,
    maximumDifficulty: 5,
    suggestedCheat: CHEAT_DEFINITIONS[cheatIndex],
    collection: CHEAT_DEFINITIONS.map((cheat, index) => ({
      slug: cheat.slug,
      name: index === 0 ? cheat.name : "CLASSIFIED",
      nameZh: index === 0 ? cheat.nameZh : "尚未解锁",
      description: index === 0 ? cheat.description : null,
      descriptionZh: index === 0 ? cheat.descriptionZh : null,
      difficulty: cheat.difficulty,
      category: cheat.category,
      unlocked: index === 0,
      completedAt: index === 0 ? "2026-08-03T00:00:00.000Z" : null,
    })),
  };
}

test.beforeEach(async ({ page }) => {
  forcedCheatIndex = null;
  let dashboardCalls = 0;
  await page.context().addCookies([{ name: "time-hacker.locale", value: "en", url: "http://127.0.0.1:3000" }]);
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, value);
    localStorage.setItem("time-hacker.locale.v1", "en");
  }, ["time-hacker.player-id.v1", playerId] as const);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/dashboard") {
      const requestedPlayer = url.searchParams.get("playerId") ?? "";
      const requestedScene = /^visual-scene-(\d{3})$/.exec(requestedPlayer);
      const cheatIndex = forcedCheatIndex ?? (requestedScene
        ? Number(requestedScene[1])
        : dashboardCalls++ === 0 ? 0 : 1);
      await route.fulfill({ json: dashboard(cheatIndex) });
      return;
    }
    if (url.pathname === "/api/rankings") {
      await route.fulfill({ json: { timeHackers: [], perfectTiming: [], cheatMasters: [] } });
      return;
    }
    if (url.pathname === "/api/games/start") {
      await route.fulfill({ status: 201, json: { game: { id: "visual-game" } } });
      return;
    }
    if (url.pathname === "/api/games/visual-game/complete") {
      await route.fulfill({ json: {
        game: {
          id: "visual-game",
          durationMs: 10_000,
          errorMs: 0,
          absoluteErrorMs: 0,
          success: true,
          wallDurationMs: 12_000,
          toleranceMs: 20,
          assistanceType: "FINAL_DILATION",
          mode: "HACKER",
          assignedCheat: { slug: CHEAT_DEFINITIONS[0].slug, name: CHEAT_DEFINITIONS[0].name },
          usedCheat: { slug: CHEAT_DEFINITIONS[0].slug, name: CHEAT_DEFINITIONS[0].name },
        },
      } });
      return;
    }
    await route.fulfill({ json: { player: { playerId } } });
  });
});

test("all one hundred authored scenes render alone without overflow or interception", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The complete catalog render audit runs once on desktop Chromium.");
  test.setTimeout(900_000);
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));
  forcedCheatIndex = 0;
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.addStyleTag({ content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}" });

  for (let index = 0; index < CHEAT_DEFINITIONS.length; index += 1) {
    if (index > 0) {
      forcedCheatIndex = index;
      await page.locator(".menu-button").click();
      await page.locator(".difficulty-control select").selectOption("2");
    }

    const scene = CHEAT_DEFINITIONS[index].triggerConfig.puzzleScene!;
    const sceneRoot = page.locator(`[data-scene-id="${scene.sceneId}"]`);
    await expect(sceneRoot, scene.slug).toBeVisible();
    if (index > 0) {
      await page.locator(".drawer-header button").last().click();
      await expect(page.locator(".drawer-backdrop")).toHaveCount(0);
    }
    await expect(page.locator("[data-testid='puzzle-scene']"), scene.slug).toHaveCount(1);
    await expect(sceneRoot.locator(".puzzle-object"), scene.slug).toHaveCount(3);

    const viewport = page.viewportSize()!;
    const boxes = await sceneRoot.locator(".puzzle-object").evaluateAll((objects) => objects.map((object) => {
      const box = object.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    }));
    expect(boxes.every((box) => box.left >= 0 && box.top >= 0 && box.right <= viewport.width && box.bottom <= viewport.height), scene.slug).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), scene.slug).toBe(true);

    const target = sceneRoot.locator(`[data-puzzle-target="${scene.discoveryRule.target}"]`);
    const targetBox = await target.boundingBox();
    if (!targetBox) throw new Error(`${scene.slug} discovery target has no browser box`);
    const targetHit = await target.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        hit: top === element || element.contains(top),
        topTag: top?.tagName ?? null,
        topClass: top instanceof HTMLElement ? top.className : null,
      };
    });
    expect(targetHit.hit, `${scene.slug}: ${JSON.stringify(targetHit)}`).toBe(true);

    const primary = page.locator(".play-button");
    expect(await primary.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return top === element || element.contains(top);
    }), scene.slug).toBe(true);

  }

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  forcedCheatIndex = null;
  expect(browserErrors).toEqual([]);
});

test("full-page puzzle, result isolation, catalog states, and responsive accessibility", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Can you stop time at 10\.00 seconds/i })).toBeVisible();
  const firstScene = CHEAT_DEFINITIONS[0].triggerConfig.puzzleScene!;
  await expect(page.locator(`[data-scene-id="${firstScene.sceneId}"]`)).toBeVisible();
  expect(await page.locator(".puzzle-object").count()).toBe(3);
  expect(await page.locator(".stopwatch-card .puzzle-object").count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const primaryBox = await page.getByRole("button", { name: /START.*Space or Enter/i }).boundingBox();
  expect(primaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);

  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: /^Hint/ }).click();
  await page.getByRole("button", { name: "Close game menu" }).click();
  await expect(page.locator(".scene-hint")).toBeVisible();

  const targets = [
    ...firstScene.discoveryRule.steps.map(() => firstScene.discoveryRule.target),
    ...firstScene.unlockRule.steps.map(() => firstScene.unlockRule.target),
  ];
  for (const target of targets) {
    const object = page.locator(`[data-puzzle-target="${target}"]`);
    await object.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.locator(".puzzle-scene")).toHaveClass(/is-armed/);
  await page.getByRole("button", { name: /START.*Space or Enter/i }).click();
  await page.getByRole("button", { name: /STOP.*Space or Enter/i }).click();
  await expect(page.getByRole("heading", { name: "Perfect hit! You conquered time." })).toBeVisible();
  await expect(page.locator(".puzzle-scene")).toHaveCount(0);
  await expect(page.getByText(/tiny secret|hundredths move|three seconds/i)).toHaveCount(0);

  await page.getByRole("button", { name: /Run again.*Space or Enter/i }).click();
  const secondScene = CHEAT_DEFINITIONS[1].triggerConfig.puzzleScene!;
  await expect(page.locator(`[data-scene-id="${secondScene.sceneId}"]`)).toBeVisible();

  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: /Cheat Catalog.*1.*100/ }).click();
  await expect(page.locator("#collection-title")).toHaveText("Cheat Catalog");
  await expect(page.locator(".collection-grid article.unlocked")).toHaveCount(1);
  await expect(page.locator(".collection-grid article.locked")).toHaveCount(99);
  await expect(page.getByText("Not unlocked").first()).toBeVisible();

  const folder = path.join(screenshotRoot, testInfo.project.name);
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: path.join(folder, "puzzle-refactor.png"), fullPage: true });
});
