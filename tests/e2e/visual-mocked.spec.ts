import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { CHEAT_DEFINITIONS } from "../../src/game/cheats";
import { V2_LEVELS, type V2ControllerKind } from "../../src/game/v2-levels.generated";

const playerId = "visual-e2e-player";
const screenshotRoot = path.resolve("artifacts", "screenshots");
let forcedCheatIndex: number | null = null;

async function solveCriticalLevel(page: Page, id: number) {
  const scene = page.locator(`[data-v2-level="${String(id).padStart(3, "0")}"]`);
  if ([1, 5, 7].includes(id)) {
    const piece = scene.getByRole("button", { name: "Interactive scene piece" }); await piece.focus();
    for (let step = 0; step < 7; step += 1) await page.keyboard.press("ArrowRight");
  } else if (id === 2 || id === 11 || id === 12) {
    if (id === 2) await page.waitForTimeout(2_600);
    const core = scene.getByRole("button", { name: "Hold the quiet center" }); await core.focus();
    await page.keyboard.down("Space"); await page.waitForTimeout(id === 12 ? 1_500 : id === 2 ? 1_300 : 1_100); await page.keyboard.up("Space");
  } else if (id === 3) {
    const tiles = scene.getByRole("button", { name: /Letter/ });
    for (let tile = 0; tile < 4; tile += 1) { await tiles.nth(tile).click(); await tiles.nth(tile).click(); }
  } else if (id === 4 || id === 9) {
    const pieces = scene.getByRole("button", { name: /Paper shape with shadow/ });
    for (let piece = 0; piece < 3; piece += 1) { await pieces.nth(piece).focus(); await page.keyboard.press("ArrowDown"); }
  } else if (id === 6) {
    const trace = scene.getByRole("application", { name: "Draw one continuous route" }); await trace.focus();
    await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowUp");
  } else if (id === 8) {
    const layers = scene.getByRole("button", { name: /Paper layer/ });
    for (let layer = 0; layer < 3; layer += 1) { await layers.nth(layer).focus(); await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); }
  } else if (id === 10) {
    const paper = scene.getByRole("button", { name: /fold the marked paper/i }); await paper.click(); await paper.click();
  }
}

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

test("all one hundred production scenes render without fallback, overflow, or interception", async ({ page }, testInfo) => {
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
      await page.locator(".difficulty-control select").selectOption(index % 2 === 0 ? "2" : "3");
    }

    const definition = CHEAT_DEFINITIONS[index];
    const sceneRoot = page.locator(`[data-v2-slug="${definition.slug}"]`);
    await expect(sceneRoot, definition.slug).toBeVisible();
    if (index > 0) {
      await page.locator(".drawer-header button").last().click();
      await expect(page.locator(".drawer-backdrop")).toHaveCount(0);
    }
    await expect(page.locator("[data-testid='puzzle-scene']"), definition.slug).toHaveCount(1);
    await expect(sceneRoot.locator("[data-controller]"), definition.slug).toHaveCount(1);
    await expect(sceneRoot.locator("button, [role='application']").first(), definition.slug).toBeVisible();

    const viewport = page.viewportSize()!;
    const boxes = await sceneRoot.locator("button, [role='application']").evaluateAll((objects) => objects.map((object) => {
      const box = object.getBoundingClientRect();
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    }));
    expect(boxes.every((box) => box.left >= 0 && box.top >= 0 && box.right <= viewport.width && box.bottom <= viewport.height), definition.slug).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), definition.slug).toBe(true);

    const primary = page.locator(".play-button");
    expect(await primary.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return top === element || element.contains(top);
    }), definition.slug).toBe(true);

  }

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  forcedCheatIndex = null;
  expect(browserErrors).toEqual([]);
});

test("each production mechanism family has a natural browser path to ARMED", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Mechanism-family audit runs once on desktop Chromium.");
  const representativeIds: Record<V2ControllerKind, number> = {
    "corner-repair": 1, "patient-hold": 11, "word-shift": 3, "shadow-sort": 4,
    "light-drag": 5, trace: 6, "frame-drag": 7, "layer-stack": 8, fold: 10,
    "coupled-drag": 14, "wave-align": 13, flip: 15, orbit: 27, resize: 18,
    "focus-route": 20, rhythm: 21, "wheel-echo": 67, "cover-return": 40,
    rotate: 16, "edge-route": 38, "shared-control": 26, constellation: 100,
  };

  for (const [controller, id] of Object.entries(representativeIds) as Array<[V2ControllerKind, number]>) {
    forcedCheatIndex = id - 1;
    await page.goto(`/?mechanism=${controller}`);
    const scene = page.locator(`[data-v2-level="${String(id).padStart(3, "0")}"]`);
    await expect(scene).toBeVisible();
    const board = scene.locator(`[data-controller="${controller}"]`);
    await expect(board).toBeVisible();

    if (["corner-repair", "light-drag", "frame-drag", "coupled-drag", "wave-align", "orbit", "resize", "edge-route", "shared-control"].includes(controller)) {
      const piece = scene.getByRole("button", { name: "Interactive scene piece" });
      await piece.focus();
      for (let step = 0; step < 7; step += 1) await page.keyboard.press("ArrowRight");
    } else if (controller === "patient-hold") {
      const core = scene.getByRole("button", { name: "Hold the quiet center" });
      await core.focus(); await page.keyboard.down("Space"); await page.waitForTimeout(1_100); await page.keyboard.up("Space");
    } else if (controller === "word-shift") {
      const tiles = scene.getByRole("button", { name: /Letter/ });
      for (let tile = 0; tile < 4; tile += 1) { await tiles.nth(tile).click(); await tiles.nth(tile).click(); }
    } else if (controller === "shadow-sort") {
      const pieces = scene.getByRole("button", { name: /Paper shape with shadow/ });
      for (let piece = 0; piece < 3; piece += 1) { await pieces.nth(piece).focus(); await page.keyboard.press("ArrowDown"); }
    } else if (controller === "trace") {
      await board.focus();
      if (id === 6 || id === 69) {
        await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowUp");
      } else {
        await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight");
      }
    } else if (controller === "layer-stack") {
      const layers = scene.getByRole("button", { name: /Paper layer/ });
      for (let layer = 0; layer < 3; layer += 1) { await layers.nth(layer).focus(); await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); }
    } else if (controller === "fold") {
      const paper = scene.getByRole("button", { name: /fold the marked paper/i }); await paper.click(); await paper.click();
    } else if (controller === "flip") {
      await scene.getByRole("button", { name: /flip the marked paper/i }).click();
    } else if (controller === "rotate") {
      const dial = scene.getByRole("button", { name: /rotate the marked paper/i }); await dial.click(); await dial.click();
    } else if (controller === "focus-route") {
      const papers = scene.getByRole("button", { name: /Quiet paper/ });
      for (let index = 0; index < 3; index += 1) await papers.nth(index).hover();
    } else if (controller === "rhythm") {
      const beat = scene.getByRole("button", { name: "Answer the visible rhythm" });
      await beat.click(); await page.waitForTimeout(300); await beat.click(); await page.waitForTimeout(300); await beat.click();
    } else if (controller === "wheel-echo") {
      await board.focus(); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
    } else if (controller === "cover-return") {
      const cover = scene.getByRole("button", { name: "Cover the paper" }); await cover.click(); await scene.getByRole("button", { name: "Uncover the paper" }).click();
    } else if (controller === "constellation") {
      await scene.getByRole("button", { name: "Move left stars inward" }).click();
      await scene.getByRole("button", { name: "Move right stars inward" }).click();
      const trace = scene.getByRole("application", { name: "Draw the empty V" }); await trace.focus(); await page.keyboard.press("v");
    }

    await expect(page.getByText("You found the crack in time"), `${id} ${V2_LEVELS[id - 1].slug}`).toBeVisible();
  }
  forcedCheatIndex = null;
});

test("levels 001 through 012 complete their authored critical path", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The complete opening-chapter audit runs once.");
  for (let id = 1; id <= 12; id += 1) {
    forcedCheatIndex = id - 1;
    await page.goto(`/?critical=${id}`);
    await solveCriticalLevel(page, id);
    await expect(page.getByText("You found the crack in time"), V2_LEVELS[id - 1].slug).toBeVisible();
  }
  forcedCheatIndex = null;
});

test("captures approved representative scenes at real responsive sizes", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-360"].includes(testInfo.project.name), "Representative visual evidence uses desktop and 360px mobile.");
  const folder = path.join(screenshotRoot, "v2-production", testInfo.project.name);
  await mkdir(folder, { recursive: true });
  for (const id of [1, 3, 12, 40, 69, 100]) {
    forcedCheatIndex = id - 1;
    await page.goto(`/?visual=${id}`);
    await expect(page.locator(`[data-v2-level="${String(id).padStart(3, "0")}"]`)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: path.join(folder, `level-${String(id).padStart(3, "0")}.png`), fullPage: true });
  }
  forcedCheatIndex = null;
});

test("full-page puzzle, result isolation, catalog states, and responsive accessibility", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Can you stop time at 10\.00 seconds/i })).toBeVisible();
  const firstScene = CHEAT_DEFINITIONS[0];
  await expect(page.locator(`[data-v2-slug="${firstScene.slug}"]`)).toBeVisible();
  await expect(page.locator("[data-controller='corner-repair']")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  const primaryBox = await page.getByRole("button", { name: /START.*Space or Enter/i }).boundingBox();
  expect(primaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);

  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: /^Hint/ }).click();
  await page.getByRole("button", { name: "Close game menu" }).click();
  await expect(page.locator("[data-testid='puzzle-scene'] aside")).toBeVisible();

  const looseCorner = page.getByRole("button", { name: "Interactive scene piece" });
  await looseCorner.focus();
  for (let press = 0; press < 7; press += 1) await page.keyboard.press("ArrowRight");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
  await page.getByRole("button", { name: /START.*Space or Enter/i }).click();
  await page.getByRole("button", { name: /STOP.*Space or Enter/i }).click();
  await expect(page.getByRole("heading", { name: "Perfect hit! You conquered time." })).toBeVisible();
  await expect(page.locator(".puzzle-scene")).toHaveCount(0);
  await expect(page.getByText(/tiny secret|hundredths move|three seconds/i)).toHaveCount(0);

  await page.getByRole("button", { name: /Run again.*Space or Enter/i }).click();
  const secondScene = CHEAT_DEFINITIONS[1];
  await expect(page.locator(`[data-v2-slug="${secondScene.slug}"]`)).toBeVisible();

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
