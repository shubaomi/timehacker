import { mkdir } from "node:fs/promises";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { CHEAT_DEFINITIONS } from "../../src/game/cheats";
import { SOFT_LAUNCH_LEVELS } from "../../src/game/soft-launch";
import { V2_LEVELS, type V2ControllerKind } from "../../src/game/v2-levels.generated";

const playerId = "visual-e2e-player";
const screenshotRoot = path.resolve("artifacts", "screenshots");
const sequentialScreenshotRoot = process.env.PLAYWRIGHT_SCREENSHOT_ROOT
  ? path.resolve(process.env.PLAYWRIGHT_SCREENSHOT_ROOT)
  : path.join(screenshotRoot, "v2-sequential");
let forcedCheatIndex: number | null = null;
let softLaunchMode = false;
let softLaunchComplete = false;
let playtestRequests: Array<Record<string, unknown>> = [];
let completeDelayMs = 0;
let completeSuccess = true;

async function findExposedPoint(control: Locator) {
  return control.evaluate((element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    for (let y = 6; y <= rect.height - 6; y += 6) {
      for (let x = 6; x <= rect.width - 6; x += 6) {
        const clientX = Math.round(rect.left + x);
        const clientY = Math.round(rect.top + y);
        const hit = document.elementFromPoint(clientX, clientY);
        if (hit === element || hit?.closest("button") === element) return { x: clientX, y: clientY };
      }
    }
    throw new Error(`No exposed hit-test point for ${element.getAttribute("aria-label") ?? element.tagName}`);
  });
}

async function solveCatchWake(page: Page, scene: ReturnType<Page["locator"]>) {
  const ring = scene.getByRole("button", { name: "Rotatable wake ring" });
  await ring.focus();
  await page.keyboard.press("ArrowRight");
  const target = Number(await scene.getAttribute("data-target-angle"));
  const wake = Number(await scene.getAttribute("data-wake-angle"));
  const delta = ((target - wake + 540) % 360) - 180;
  const key = delta >= 0 ? "ArrowRight" : "ArrowLeft";
  for (let step = 0; step < Math.round(Math.abs(delta) / 30); step += 1) await page.keyboard.press(key);
}

async function solveCriticalLevel(page: Page, id: number) {
  const scene = page.locator(`[data-v2-level="${String(id).padStart(3, "0")}"]`);
  if (id === 1) {
    const piece = scene.getByRole("button", { name: "Loose paper corner" }); await piece.focus();
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowDown");
  } else if (id === 5) {
    const lamp = scene.getByRole("button", { name: "Amber lamp" }); await lamp.focus();
    for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
  } else if (id === 7) {
    const frame = scene.getByRole("button", { name: "Empty window frame" }); await frame.focus();
    for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
  } else if (id === 2 || id === 11 || id === 12) {
    if (id === 2) await page.waitForTimeout(2_600);
    const core = scene.getByRole("button", { name: id === 2 ? "Quiet bubble" : id === 11 ? "Central paper axis" : "Right pressure disc" }); await core.focus();
    await page.keyboard.down("Space"); await page.waitForTimeout(id === 12 ? 1_500 : id === 2 ? 1_300 : 1_100); await page.keyboard.up("Space");
  } else if (id === 3) {
    const tiles = scene.getByRole("button", { name: /Letter/ });
    for (let tile = 0; tile < 4; tile += 1) { await tiles.nth(tile).click(); await tiles.nth(tile).click(); }
  } else if (id === 4) {
    const first = scene.getByRole("button", { name: "Paper disc 1" }); await first.focus();
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
    const second = scene.getByRole("button", { name: "Paper disc 2" }); await second.focus();
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
    const third = scene.getByRole("button", { name: "Paper disc 3" }); await third.focus(); await page.keyboard.press("Enter");
  } else if (id === 9) {
    const m = scene.getByRole("button", { name: "Letter block M" }); await m.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
    const t = scene.getByRole("button", { name: "Letter block T" }); await t.focus(); await page.keyboard.press("Enter");
    const e = scene.getByRole("button", { name: "Letter block E" }); await e.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
    const i = scene.getByRole("button", { name: "Letter block I" }); await i.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  } else if (id === 6) {
    const trace = scene.getByRole("application", { name: "Rub out the hidden zero" }); await trace.focus();
    await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowUp");
  } else if (id === 8) {
    const sheet = scene.getByRole("button", { name: "Transparent middle sheet" }); await sheet.focus(); await page.keyboard.press("Enter");
    const left = scene.getByRole("button", { name: "Left coral shell" }); await left.focus(); await page.keyboard.press("ArrowRight");
    const right = scene.getByRole("button", { name: "Right coral shell" }); await right.focus(); await page.keyboard.press("ArrowLeft");
  } else if (id === 10) {
    const left = scene.getByRole("button", { name: "Left page edge" }); await left.focus(); await page.keyboard.press("ArrowRight");
    const right = scene.getByRole("button", { name: "Right page edge" }); await right.focus(); await page.keyboard.press("ArrowLeft");
  } else if (id === 13) {
    const strip = scene.getByRole("button", { name: "Upper waveform strip" }); await strip.focus();
    for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
  } else if (id === 14) {
    const horizontal = scene.getByRole("button", { name: "Broken horizontal ribbon" }); await horizontal.focus();
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
    const vertical = scene.getByRole("button", { name: "Broken vertical ribbon" }); await vertical.focus(); await page.keyboard.press("ArrowUp");
  } else if (id === 15) {
    const middle = scene.getByRole("button", { name: "Arc paper piece 2" }); await middle.focus(); await page.keyboard.press("Enter");
  } else if (id === 16) {
    await solveCatchWake(page, scene);
  } else if (id === 18) {
    const ring = scene.getByRole("button", { name: "Resizable inner ring" }); await ring.focus();
    await page.keyboard.press("+"); await page.keyboard.press("+"); await page.keyboard.press("+");
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
    campaign: {
      track: "FULL" as const,
      totalLevels: 100,
      completedLevels: 1,
      currentLevelNumber: cheatIndex + 1,
      complete: false,
    },
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

function softLaunchDashboard() {
  const base = dashboard(0);
  const definitions = SOFT_LAUNCH_LEVELS.map(({ slug }) =>
    CHEAT_DEFINITIONS.find((definition) => definition.slug === slug)!,
  );
  return {
    ...base,
    player: {
      ...base.player,
      currentLevel: 1,
      unlockedCheats: softLaunchComplete ? 12 : 0,
      firstSuccessAt: null,
    },
    maximumDifficulty: 1,
    suggestedCheat: softLaunchComplete ? null : definitions[0],
    campaign: {
      track: "SOFT_LAUNCH" as const,
      totalLevels: 12,
      completedLevels: softLaunchComplete ? 12 : 0,
      currentLevelNumber: softLaunchComplete ? 12 : 1,
      complete: softLaunchComplete,
    },
    collection: definitions.map((cheat) => ({
      slug: cheat.slug,
      name: softLaunchComplete ? cheat.name : "CLASSIFIED",
      nameZh: softLaunchComplete ? cheat.nameZh : "尚未解锁",
      description: softLaunchComplete ? cheat.description : null,
      descriptionZh: softLaunchComplete ? cheat.descriptionZh : null,
      difficulty: cheat.difficulty,
      category: cheat.category,
      unlocked: softLaunchComplete,
      completedAt: softLaunchComplete ? "2026-08-22T00:00:00.000Z" : null,
    })),
  };
}

test.beforeEach(async ({ page }) => {
  forcedCheatIndex = null;
  softLaunchMode = false;
  softLaunchComplete = false;
  playtestRequests = [];
  completeDelayMs = 0;
  completeSuccess = true;
  let dashboardCalls = 0;
  await page.context().addCookies([{ name: "time-hacker.locale", value: "en", url: "http://127.0.0.1:3000" }]);
  await page.addInitScript(([key, value]) => {
    localStorage.setItem(key, value);
    localStorage.setItem("time-hacker.locale.v1", "en");
  }, ["time-hacker.player-id.v1", playerId] as const);
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/dashboard") {
      if (softLaunchMode) {
        await route.fulfill({ json: softLaunchDashboard() });
        return;
      }
      const requestedPlayer = url.searchParams.get("playerId") ?? "";
      const requestedScene = /^visual-scene-(\d{3})$/.exec(requestedPlayer);
      const cheatIndex = forcedCheatIndex ?? (requestedScene
        ? Number(requestedScene[1])
        : dashboardCalls++ === 0 ? 0 : 1);
      await route.fulfill({ json: dashboard(cheatIndex) });
      return;
    }
    if (url.pathname === "/api/playtest/events") {
      playtestRequests.push(route.request().postDataJSON());
      await route.fulfill({ status: 202, json: { accepted: 1, created: 1 } });
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
      if (completeDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, completeDelayMs));
      await route.fulfill({ json: {
        game: {
          id: "visual-game",
          durationMs: completeSuccess ? 10_000 : 9_340,
          errorMs: completeSuccess ? 0 : -660,
          absoluteErrorMs: completeSuccess ? 0 : 660,
          success: completeSuccess,
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

async function solveSpatialPilotLevel(page: Page, id: 1 | 43 | 81) {
  const scene = page.getByTestId(`v2-scene-${String(id).padStart(3, "0")}`);
  if (id === 1) {
    const corner = scene.getByRole("button", { name: "Loose paper corner" });
    await corner.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
  } else if (id === 43) {
    const tabs = scene.locator("button[data-archive-tab]");
    for (let index = 0; index < 3; index += 1) await tabs.nth(index).focus();
  } else {
    const pointerHalf = page.getByTestId("dual-pointer-half");
    const companionHalf = page.getByTestId("dual-companion-half");
    const box = await pointerHalf.boundingBox();
    if (!box) throw new Error("Pointer half has no rendered bounds");
    await page.mouse.move(box.x + box.width * .25, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * .25 + 64, box.y + box.height / 2);
    await page.mouse.up();
    await companionHalf.focus();
    await page.keyboard.press("ArrowLeft");
  }
  await expect(page.getByTestId("puzzle-scene")).toHaveClass(/isArmed/);
  return scene;
}

async function expectSpatialPilotGeometry(page: Page, id: 1 | 43 | 81) {
  if (id === 1) {
    await expect.poll(async () => page.getByTestId("v2-scene-001").evaluate((scene) => {
      const corner = scene.querySelector<HTMLButtonElement>("button")?.getBoundingClientRect();
      const target = scene.querySelector<HTMLElement>("[data-corner-target]")?.getBoundingClientRect();
      return corner && target ? Math.max(
        Math.abs(corner.right - target.right),
        Math.abs(corner.top - target.top),
      ) : Number.POSITIVE_INFINITY;
    })).toBeLessThanOrEqual(1);
    return;
  }
  if (id === 43) {
    const geometry = await page.getByTestId("v2-scene-043").evaluate((scene) => {
      const svg = scene.querySelector<SVGSVGElement>("svg:not([data-testid])");
      const paths = svg ? [...svg.querySelectorAll<SVGPathElement>("path[data-band]")] : [];
      const tabs = [...scene.querySelectorAll<HTMLButtonElement>("button[data-archive-tab]")];
      const screenPoint = (path: SVGPathElement, atEnd: boolean) => {
        const point = path.getPointAtLength(atEnd ? path.getTotalLength() : 0);
        const matrix = path.getScreenCTM();
        return matrix ? new DOMPoint(point.x, point.y).matrixTransform(matrix) : point;
      };
      const centers = tabs.map((tab) => {
        const rect = tab.getBoundingClientRect();
        return { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
      });
      const endpoints = paths.length === 2 ? [screenPoint(paths[0], false), screenPoint(paths[0], true), screenPoint(paths[1], true)] : [];
      return endpoints.map((point, index) => Math.hypot(point.x - centers[index].x, point.y - centers[index].y));
    });
    expect(geometry).toHaveLength(3);
    geometry.forEach((delta) => expect(delta).toBeLessThanOrEqual(1));
    return;
  }
  await expect.poll(async () => page.getByTestId("v2-scene-081").evaluate((scene) => {
    const left = scene.querySelector<HTMLElement>("[data-testid=dual-pointer-half]")!.getBoundingClientRect();
    const right = scene.querySelector<HTMLElement>("[data-testid=dual-companion-half]")!.getBoundingClientRect();
    const socket = scene.querySelector<HTMLElement>("[data-testid=dual-shared-socket]")!.getBoundingClientRect();
    const leftSeam = left.left + left.width / 2;
    const rightSeam = right.left + right.width / 2;
    const ringCenterY = (left.top + left.bottom + right.top + right.bottom) / 4;
    return Math.max(
      Math.abs(rightSeam - leftSeam),
      Math.abs((left.top + left.bottom) / 2 - (right.top + right.bottom) / 2),
      Math.abs((socket.left + socket.right) / 2 - leftSeam),
      Math.abs((socket.top + socket.bottom) / 2 - ringCenterY),
    );
  })).toBeLessThanOrEqual(1);
}

test("the approved spatial pilot stays decorative across real puzzle and timer states", async ({ page }, testInfo) => {
  test.skip(process.env.NEXT_PUBLIC_TIME_HACKER_SPATIAL_PILOT !== "1", "Runs only for the explicit default-off spatial pilot build.");
  test.skip(!["desktop-1440", "mobile-390", "reduced-motion", "webkit-desktop"].includes(testInfo.project.name), "Pilot matrix uses one desktop, one mobile, reduced motion, and WebKit.");
  test.setTimeout(120_000);
  const root = path.join(screenshotRoot, "spatial-pilot");
  await mkdir(root, { recursive: true });

  for (const entry of [
    { id: 1 as const, slug: "four-corner-breach" },
    { id: 43 as const, slug: "archive-route" },
    { id: 81 as const, slug: "dual-device" },
  ]) {
    forcedCheatIndex = CHEAT_DEFINITIONS.findIndex(({ slug }) => slug === entry.slug);
    completeDelayMs = 280;
    completeSuccess = true;
    await page.goto("/");
    const field = page.getByTestId("spatial-time-field");
    await expect(field).toHaveAttribute("aria-hidden", "true");
    await expect(field).toHaveAttribute("data-phase", "idle");
    await expect(field).toHaveCSS("pointer-events", "none");
    await expect(page.getByTestId("puzzle-scene")).toHaveAttribute("data-spatial-pilot", "true");
    await solveSpatialPilotLevel(page, entry.id);
    await expectSpatialPilotGeometry(page, entry.id);

    const button = page.locator(".play-button");
    const receivesPointer = await button.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2));
    });
    expect(receivesPointer).toBe(true);
    await page.screenshot({ path: path.join(root, `${testInfo.project.name}-${String(entry.id).padStart(3, "0")}-armed.png`), fullPage: true });

    await button.click();
    await expect(field).toHaveAttribute("data-phase", "running");
    await button.click();
    await expect(field).toHaveAttribute("data-phase", "stopped");
    await expect(field).toHaveAttribute("data-phase", "success");
    await page.screenshot({ path: path.join(root, `${testInfo.project.name}-${String(entry.id).padStart(3, "0")}-success.png`), fullPage: true });

    const serious = (await new AxeBuilder({ page }).analyze()).violations.filter(({ impact }) => impact === "serious" || impact === "critical");
    expect(serious).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  }

  forcedCheatIndex = CHEAT_DEFINITIONS.findIndex(({ slug }) => slug === "four-corner-breach");
  completeDelayMs = 280;
  completeSuccess = false;
  await page.goto("/");
  await solveSpatialPilotLevel(page, 1);
  await page.locator(".play-button").click();
  await page.locator(".play-button").click();
  await expect(page.getByTestId("spatial-time-field")).toHaveAttribute("data-phase", "miss");
});

test("the spatial pilot is absent from the default build", async ({ page }, testInfo) => {
  test.skip(process.env.NEXT_PUBLIC_TIME_HACKER_SPATIAL_PILOT === "1", "The explicit pilot build is covered separately.");
  test.skip(testInfo.project.name !== "desktop-1440", "One desktop project proves the production default gate.");
  forcedCheatIndex = CHEAT_DEFINITIONS.findIndex(({ slug }) => slug === "four-corner-breach");
  await page.goto("/");
  await expect(page.getByTestId("puzzle-scene")).toHaveAttribute("data-spatial-pilot", "false");
  await expect(page.getByTestId("spatial-time-field")).toHaveCount(0);
  await expect(page.getByTestId("corner-spatial-depth")).toHaveCount(0);
});

test("new players see only the 12-level soft launch and emit the frozen anonymous start events", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Soft-launch flow is verified on one desktop and one phone viewport.");
  softLaunchMode = true;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: /Cheat Catalog/ }).click();
  await expect(page.locator(".collection-grid article")).toHaveCount(12);
  await expect(page.getByText("00 / 12")).toBeVisible();
  await page.getByRole("button", { name: "Close game menu" }).click();
  await page.locator(".play-button").click();

  await expect.poll(() => playtestRequests.flatMap((batch) => (
    batch.events as Array<{ name: string }>
  ).map(({ name }) => name))).toEqual(expect.arrayContaining([
    "level_view",
    "first_interaction",
    "timer_started",
  ]));
  for (const batch of playtestRequests) {
    expect(batch).not.toHaveProperty("userAgent");
    expect(batch).not.toHaveProperty("referrer");
    expect(batch).not.toHaveProperty("ip");
  }
});

test("the soft-launch critical path emits all thirteen frozen events", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The complete analytics path runs once; responsive coverage is separate.");
  test.setTimeout(60_000);
  softLaunchMode = true;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Open game menu" }).click();
  await page.getByRole("button", { name: /^Hint 0\/3$/ }).click();
  await page.getByRole("button", { name: /^Show the next move 1\/3$/ }).click();
  await page.getByRole("button", { name: /^Reveal the answer 2\/3$/ }).click();
  await page.getByRole("button", { name: "Close game menu" }).click();

  const scene = page.getByTestId("v2-scene-001");
  const corner = scene.getByRole("button", { name: "Loose paper corner" });
  await corner.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
  await page.locator(".play-button").click();
  await expect(page.locator(".play-button")).toContainText("STOP");
  await page.locator(".play-button").click();
  await page.getByRole("button", { name: "Share result" }).click();
  await page.getByRole("button", { name: "Download image" }).click();
  await expect(page.getByText("Image card downloaded.")).toBeVisible();
  await page.getByRole("button", { name: "Close result image card" }).click();
  await page.locator(".play-button").click();

  const expectedNames = [
    "level_view", "first_interaction", "puzzle_discovered", "hint_1_open",
    "hint_2_open", "answer_open", "puzzle_armed", "timer_started",
    "timer_stopped", "level_completed", "next_level", "share_card_open",
    "share_card_exported",
  ];
  await expect.poll(() => new Set(playtestRequests.flatMap((batch) => (
    batch.events as Array<{ name: string }>
  ).map(({ name }) => name))), { timeout: 20_000 }).toEqual(new Set(expectedNames));
});

test("the twelfth soft-launch completion does not expose a thirteenth puzzle", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Campaign completion contract runs once.");
  softLaunchMode = true;
  softLaunchComplete = true;
  await page.goto("/");
  await expect(page.getByText("You completed all 12 soft-launch levels.")).toBeVisible();
  await expect(page.locator(".play-button")).toBeDisabled();
  await expect(page.locator("[data-v2-slug]")).toHaveCount(0);
});

test("level 001 preserves the authored page-corner puzzle on desktop and mobile", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 001 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 0;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-001");
  const corner = scene.getByRole("button", { name: "Loose paper corner" });
  const target = page.getByTestId("corner-target-001");
  await expect(scene).toHaveAttribute("data-spatial-model", "page-corner");
  await expect(page.getByText("Four-Corner Breach")).toHaveCount(0);
  await expect(scene.locator("[class*='relationGuide']")).toHaveCount(0);

  const protectedNames = ["challenge", "stopwatch", "main action"];
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const puzzleNames = ["loose corner", "page gap"];
  const puzzleBoxes = await Promise.all([corner.boundingBox(), target.boundingBox()]);
  const overlaps = (first: NonNullable<Awaited<ReturnType<typeof corner.boundingBox>>>, second: NonNullable<Awaited<ReturnType<typeof corner.boundingBox>>>) => (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  );
  for (const [puzzleIndex, puzzleBox] of puzzleBoxes.entries()) {
    expect(puzzleBox).not.toBeNull();
    for (const [protectedIndex, protectedBox] of protectedBoxes.entries()) {
      expect(protectedBox).not.toBeNull();
      expect(overlaps(puzzleBox!, protectedBox!), `${puzzleNames[puzzleIndex]} overlaps ${protectedNames[protectedIndex]}`).toBe(false);
    }
  }
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `001-${testInfo.project.name}.png`) });

  await corner.click();
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await corner.focus();
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowDown");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 002 makes quiet input the discovery rule on desktop and mobile", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 002 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 1;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-002");
  await expect(scene).toHaveAttribute("data-discovery-state", "closed");
  await expect(page.getByText("Breath Gap")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await page.waitForTimeout(1_050);
  await expect(scene).toHaveAttribute("data-discovery-state", "breathing");
  await page.waitForTimeout(1_500);

  const bubble = scene.getByRole("button", { name: "Quiet bubble" });
  await expect(bubble).toBeVisible();
  const puzzleBox = await scene.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  expect(puzzleBox).not.toBeNull();
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    expect(
      puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y,
      "breathing leaves overlap protected game content",
    ).toBe(false);
  }
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `002-${testInfo.project.name}.png`) });

  await bubble.hover();
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await expect(bubble).toBeVisible();
  await page.mouse.down();
  await page.waitForTimeout(1_250);
  await expect(page.getByText("You found the crack in time")).toBeVisible();
  await page.mouse.up();
});

test("level 003 changes the meaning of FAST without becoming a form", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 003 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 2;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-003");
  const tiles = scene.getByRole("button", { name: /Letter \d/ });
  await expect(page.getByText("Slow Word")).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(tiles).toHaveCount(4);
  await expect(tiles).toHaveText(["F", "A", "S", "T"]);

  const tileBoxes = await Promise.all(Array.from({ length: 4 }, (_, index) => tiles.nth(index).boundingBox()));
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const tileBox of tileBoxes) {
    expect(tileBox).not.toBeNull();
    expect(tileBox!.x).toBeGreaterThanOrEqual(0);
    expect(tileBox!.x + tileBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(tileBox!.y + tileBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      expect(
        tileBox!.x < protectedBox!.x + protectedBox!.width
        && tileBox!.x + tileBox!.width > protectedBox!.x
        && tileBox!.y < protectedBox!.y + protectedBox!.height
        && tileBox!.y + tileBox!.height > protectedBox!.y,
        "letter tile overlaps protected game content",
      ).toBe(false);
    }
  }
  await page.waitForTimeout(600);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `003-${testInfo.project.name}.png`) });

  for (let index = 0; index < 4; index += 1) await tiles.nth(index).click();
  await expect(tiles).toHaveText(["T", "I", "M", "E"]);
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  for (let index = 0; index < 4; index += 1) await tiles.nth(index).click();
  await expect(tiles).toHaveText(["S", "L", "O", "W"]);
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 004 trusts stationary shadow length instead of visible disc size", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 004 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 3;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-004");
  await expect(scene).toHaveAttribute("data-spatial-model", "stationary-shadows");
  await expect(page.getByText("Honest Shadows")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect(scene.locator("[data-shadow-stationary='true']")).toHaveCount(3);
  await expect(scene.locator("[data-shadow-well]")).toHaveCount(3);

  const puzzleBoxes = await Promise.all([
    page.locator("[class*='honestSources']").boundingBox(),
    page.locator("[class*='honestWells']").boundingBox(),
  ]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  const overlaps = (first: NonNullable<typeof puzzleBoxes[number]>, second: NonNullable<typeof protectedBoxes[number]>) => (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  );
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      expect(overlaps(puzzleBox!, protectedBox!), "shadow puzzle overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `004-${testInfo.project.name}.png`) });

  const first = scene.getByRole("button", { name: "Paper disc 1" });
  await first.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("shadow-well-0")).toHaveAttribute("data-wrong", "true");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  const second = scene.getByRole("button", { name: "Paper disc 2" }); await second.focus();
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  const third = scene.getByRole("button", { name: "Paper disc 3" }); await third.focus(); await page.keyboard.press("Enter");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 005 balances the shadows by moving their shared amber light", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 005 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 4;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-005");
  await expect(scene).toHaveAttribute("data-spatial-model", "shared-light");
  await expect(page.getByText("Amber Balance")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect(scene.getByRole("button", { name: /Paper weight/ })).toHaveCount(3);

  const puzzleBoxes = await Promise.all([
    page.getByTestId("amber-rig-005").boundingBox(),
    page.getByTestId("amber-lamp-track-005").boundingBox(),
  ]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "amber puzzle overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `005-${testInfo.project.name}.png`) });

  for (const weight of await scene.getByRole("button", { name: /Paper weight/ }).all()) {
    await weight.focus();
    await page.keyboard.press("Enter");
  }
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  const lamp = scene.getByRole("button", { name: "Amber lamp" }); await lamp.focus();
  for (let step = 0; step < 3; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
  expect(Number(await scene.getAttribute("data-shadow-spread"))).toBeLessThanOrEqual(8);
});

test("level 006 reveals a concealed zero instead of rewarding arbitrary rubbing", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 006 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 5;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-006");
  const canvas = scene.getByRole("application", { name: "Rub out the hidden zero" });
  await expect(scene).toHaveAttribute("data-spatial-model", "concealed-zero");
  await expect(page.getByText("Zero in the Mist")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  const puzzleBox = await canvas.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox).not.toBeNull();
  expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
    expect(overlap, "mist puzzle overlaps protected game content").toBe(false);
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `006-${testInfo.project.name}.png`) });

  const points = [[.05, .05], [.95, .05], [.05, .95], [.95, .95], [.5, .5], [.05, .05]];
  await page.mouse.move(puzzleBox!.x + puzzleBox!.width * points[0][0], puzzleBox!.y + puzzleBox!.height * points[0][1]);
  await page.mouse.down();
  for (const [x, y] of points.slice(1)) await page.mouse.move(puzzleBox!.x + puzzleBox!.width * x, puzzleBox!.y + puzzleBox!.height * y);
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-trace-valid", "false");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await canvas.focus();
  await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowUp");
  await expect(scene).toHaveAttribute("data-revealed-sectors", "8");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 007 moves the empty frame to the page edge instead of dragging its shadow", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 007 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 6;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-007");
  const frame = scene.getByRole("button", { name: "Empty window frame" });
  const shadow = scene.getByRole("button", { name: "Window shadow beyond the page" });
  await expect(scene).toHaveAttribute("data-spatial-model", "page-edge-window");
  await expect(page.getByText("Outside the Frame")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBoxes = await Promise.all([frame.boundingBox(), shadow.boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "window puzzle overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `007-${testInfo.project.name}.png`) });

  await shadow.click();
  await expect(scene).toHaveAttribute("data-shadow-stretched", "true");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await frame.click();
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await frame.focus();
  for (let step = 0; step < 3; step += 1) await page.keyboard.press("ArrowRight");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-frame-progress", "80");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 008 sandwiches the transparent relay between two complementary shells", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 008 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 7;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-008");
  const left = scene.getByRole("button", { name: "Left coral shell" });
  const sheet = scene.getByRole("button", { name: "Transparent middle sheet" });
  const right = scene.getByRole("button", { name: "Right coral shell" });
  await expect(scene).toHaveAttribute("data-spatial-model", "transparent-middle");
  await expect(page.getByText("Relay Sandwich")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect(page.getByTestId("puzzle-scene")).toHaveAttribute("data-layout-ready", "true");
  if (testInfo.project.name === "mobile-390") {
    await expect.poll(async () => {
      const pieces = await Promise.all([left.boundingBox(), sheet.boundingBox(), right.boundingBox()]);
      const primary = await page.locator(".play-button").boundingBox();
      return Boolean(primary && pieces.every((piece) => piece && piece.y >= primary.y + primary.height));
    }).toBe(true);
  }

  const puzzleBoxes = await Promise.all([left.boundingBox(), sheet.boundingBox(), right.boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const [puzzleIndex, puzzleBox] of puzzleBoxes.entries()) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x, `relay piece ${puzzleIndex} starts outside the viewport: ${JSON.stringify(puzzleBox)}`).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const [protectedIndex, protectedBox] of protectedBoxes.entries()) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, `relay piece ${puzzleIndex} ${JSON.stringify(puzzleBox)} overlaps protected ${protectedIndex} ${JSON.stringify(protectedBox)}`).toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `008-${testInfo.project.name}.png`) });

  await left.focus(); await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-top-layer-rejected", "true");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await sheet.focus(); await page.keyboard.press("Enter");
  await left.focus(); await page.keyboard.press("ArrowRight");
  await expect(left).toHaveAttribute("data-locked", "true");
  await right.focus(); await page.keyboard.press("ArrowRight");
  await expect(left).toHaveAttribute("data-locked", "true");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 009 follows the stationary TIME shadows rather than the front order", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 009 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 8;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-009");
  const blocks = scene.getByRole("button", { name: /Letter block/ });
  await expect(scene).toHaveAttribute("data-spatial-model", "stationary-letter-shadows");
  await expect(scene).toHaveAttribute("data-shadow-word", "TIME");
  await expect(page.getByText("Shadow Cipher")).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect(blocks).toHaveCount(4);
  if (testInfo.project.name === "mobile-390") {
    await expect.poll(async () => {
      const pieces = await blocks.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
      const primary = await page.locator(".play-button").boundingBox();
      return Boolean(primary && pieces.every((top) => top >= primary.y + primary.height));
    }).toBe(true);
  }

  const puzzleBoxes = await blocks.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  const protectedBoxes = (await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])).filter((box): box is NonNullable<typeof box> => box !== null);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      const overlap = puzzleBox.x < protectedBox.x + protectedBox.width
        && puzzleBox.x + puzzleBox.width > protectedBox.x
        && puzzleBox.y < protectedBox.y + protectedBox.height
        && puzzleBox.y + puzzleBox.height > protectedBox.y;
      expect(overlap, "cipher block overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `009-${testInfo.project.name}.png`) });

  const m = scene.getByRole("button", { name: "Letter block M" }); await m.focus(); await page.keyboard.press("Enter");
  await expect(page.getByTestId("cipher-well-0")).toHaveAttribute("data-wrong", "true");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  const t = scene.getByRole("button", { name: "Letter block T" }); await t.focus(); await page.keyboard.press("Enter");
  const e = scene.getByRole("button", { name: "Letter block E" }); await e.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  const i = scene.getByRole("button", { name: "Letter block I" }); await i.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 010 folds both page edges into the missing zero of 101", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 010 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 9;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-010");
  const left = scene.getByRole("button", { name: "Left page edge" });
  const right = scene.getByRole("button", { name: "Right page edge" });
  await expect(scene).toHaveAttribute("data-spatial-model", "two-page-edges");
  await expect(scene).toHaveAttribute("data-page-width-state", "wide");
  await expect(page.getByText("Folded Calibration")).toHaveCount(0);
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  const puzzleBoxes = await Promise.all([left.boundingBox(), right.boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "folded edge overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `010-${testInfo.project.name}.png`) });

  await page.keyboard.press("1"); await page.keyboard.press("0"); await page.keyboard.press("1");
  await left.click(); await right.click();
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await left.focus(); await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-page-width-state", "one-side");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await right.focus(); await page.keyboard.press("ArrowLeft");
  await expect(scene).toHaveAttribute("data-page-width-state", "narrow");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 011 removes the phase delay through the shared paper axis", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 011 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 10;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-011");
  const left = scene.getByRole("button", { name: "Left paper leaf" });
  const right = scene.getByRole("button", { name: "Right paper leaf" });
  const axis = scene.getByRole("button", { name: "Central paper axis" });
  await expect(scene).toHaveAttribute("data-spatial-model", "coupled-leaves");
  await expect(scene).toHaveAttribute("data-phase-gap", "5");
  await expect(page.getByText("Same-Face Relay")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await axis.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBoxes = await Promise.all([left.boundingBox(), axis.boundingBox(), right.boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "same-face relay overlaps protected game content").toBe(false);
    }
  }

  for (let index = 0; index < 4; index += 1) {
    await left.click();
    await right.click();
  }
  await expect(scene).toHaveAttribute("data-coupling-seen", "true");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `011-${testInfo.project.name}.png`) });

  await axis.hover();
  await page.mouse.down();
  await page.waitForTimeout(640);
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-phase-gap", "5");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await axis.focus();
  await page.keyboard.down("Space");
  await expect(scene).toHaveAttribute("data-phase-gap", "0", { timeout: 1_000 });
  await expect(page.getByText("You found the crack in time")).toBeVisible({ timeout: 1_000 });
  await page.keyboard.up("Space");
});

test("level 012 holds one pressure disc until the delayed echo reaches the same radius", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 012 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 11;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-012");
  const left = scene.getByRole("button", { name: "Left pressure disc" });
  const right = scene.getByRole("button", { name: "Right pressure disc" });
  await expect(scene).toHaveAttribute("data-spatial-model", "delayed-pressure-pair");
  await expect(scene).toHaveAttribute("data-wave-state", "separated");
  await expect(page.getByText("Pressure Echo")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await left.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBoxes = await Promise.all([left.boundingBox(), right.boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "pressure echo overlaps protected game content").toBe(false);
    }
  }

  await left.dblclick();
  await right.dblclick();
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await expect(scene).toHaveAttribute("data-wave-state", "separated");

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `012-${testInfo.project.name}.png`) });

  await left.hover();
  await page.mouse.down();
  await page.waitForTimeout(420);
  await expect(right).toHaveAttribute("data-responding", "true");
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-wave-state", "separated");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await right.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(720);
  await expect(scene).toHaveAttribute("data-wave-state", "equal");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await expect(page.getByText("You found the crack in time")).toBeVisible({ timeout: 1_000 });
  await page.keyboard.up("Space");
});

test("level 013 aligns the shared zero cutouts instead of the tempting wave peaks", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 013 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 12;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-013");
  const upper = scene.getByRole("button", { name: "Upper waveform strip" });
  const lower = page.getByTestId("lower-wave-013");
  await expect(scene).toHaveAttribute("data-spatial-model", "shared-zero-cutouts");
  await expect(scene).toHaveAttribute("data-alignment", "misaligned");
  await expect(lower).toHaveAttribute("data-stationary", "true");
  await expect(page.getByText("Shared Zero")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await upper.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBoxes = await Promise.all([upper.boundingBox(), lower.boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "shared-zero waves overlap protected game content").toBe(false);
    }
  }

  await upper.click();
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await upper.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-alignment", "peak");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `013-${testInfo.project.name}.png`) });

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-alignment", "zero");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 014 alternates the coupled ribbons until both cuts share one center", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 014 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 13;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-014");
  const horizontal = scene.getByRole("button", { name: "Broken horizontal ribbon" });
  const vertical = scene.getByRole("button", { name: "Broken vertical ribbon" });
  await expect(scene).toHaveAttribute("data-spatial-model", "coupled-dual-axis");
  await expect(scene).toHaveAttribute("data-half-cross", "none");
  await expect(page.getByText("Corner Cross")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await horizontal.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBoxes = await Promise.all([horizontal.boundingBox(), vertical.boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "corner-cross ribbons overlap protected game content").toBe(false);
    }
  }

  await horizontal.click({ position: { x: 20, y: 20 } });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await horizontal.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-half-cross", "horizontal");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `014-${testInfo.project.name}.png`) });

  await vertical.focus();
  await page.keyboard.press("ArrowUp");
  await expect(scene).toHaveAttribute("data-half-cross", "complete");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 015 flips only the reversed arc instead of mechanically turning every piece", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 015 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 14;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-015");
  const pieces = scene.getByRole("button", { name: /Arc paper piece/ });
  await expect(scene).toHaveAttribute("data-spatial-model", "three-alternating-arcs");
  await expect(scene).toHaveAttribute("data-ring-pattern", "010");
  await expect(pieces).toHaveCount(3);
  await expect(page.getByText("Alternating Ring")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await pieces.nth(0).boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBoxes = await Promise.all([0, 1, 2].map((index) => pieces.nth(index).boundingBox()));
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "alternating-ring arc overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `015-${testInfo.project.name}.png`) });

  for (let index = 0; index < 3; index += 1) await pieces.nth(index).click();
  await expect(scene).toHaveAttribute("data-ring-pattern", "101");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  for (let index = 0; index < 3; index += 1) await pieces.nth(index).click();
  await expect(scene).toHaveAttribute("data-ring-pattern", "010");

  const middle = pieces.nth(1);
  await middle.focus();
  await page.keyboard.press("Enter");
  await expect(scene).toHaveAttribute("data-ring-pattern", "000");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 016 moves the wake instead of rewarding repeated direct bead chasing", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 016 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 15;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-016");
  const ring = scene.getByRole("button", { name: "Rotatable wake ring" });
  const bead = scene.getByRole("button", { name: "Escaping paper bead" });
  await expect(scene).toHaveAttribute("data-spatial-model", "moving-bead-adjustable-wake");
  await expect(scene).toHaveAttribute("data-snap-zone-degrees", "30");
  await expect(page.getByText("Catch the Wake")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await ring.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBoxes = await Promise.all([ring.boundingBox(), bead.boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "catch-wake interaction overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `016-${testInfo.project.name}.png`) });

  for (let attempt = 0; attempt < 6; attempt += 1) await bead.click();
  await expect(scene).toHaveAttribute("data-chase-attempts", "6");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await solveCatchWake(page, scene);
  await expect(scene).toHaveAttribute("data-rebound", "sealed");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 017 flips only the half-glyph tile whose crease and grain both run backward", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 017 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 16;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-017");
  const tiles = scene.getByRole("button", { name: /Half-glyph paper tile/ });
  const oddTile = scene.getByRole("button", { name: "Half-glyph paper tile 3" });
  await expect(scene).toHaveAttribute("data-spatial-model", "four-mirrored-half-glyphs");
  await expect(scene).toHaveAttribute("data-nibble-pattern", "0000");
  await expect(tiles).toHaveCount(4);
  await expect(oddTile).toHaveAttribute("data-crease", "contrary");
  await expect(oddTile).toHaveAttribute("data-grain", "reversed");
  await expect(page.getByText("Inverted Nibble")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await tiles.nth(0).boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBoxes = await Promise.all([0, 1, 2, 3].map((index) => tiles.nth(index).boundingBox()));
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "half-glyph tile overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `017-${testInfo.project.name}.png`) });

  for (let index = 0; index < 4; index += 1) await tiles.nth(index).click();
  await expect(scene).toHaveAttribute("data-nibble-pattern", "1111");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  for (let index = 0; index < 4; index += 1) await tiles.nth(index).click();
  await expect(scene).toHaveAttribute("data-nibble-pattern", "0000");

  await oddTile.focus();
  await page.keyboard.press("Enter");
  await expect(scene).toHaveAttribute("data-nibble-pattern", "0010");
  await expect(scene).toHaveAttribute("data-seam", "continuous");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 018 enlarges the shared boundary instead of sliding its two outer cuts together", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 018 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 17;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-018");
  const ring = scene.getByRole("button", { name: "Resizable inner ring" });
  const cuts = scene.getByRole("button", { name: /Outer cut mark/ });
  await expect(scene).toHaveAttribute("data-spatial-model", "fixed-cuts-resizable-boundary");
  await expect(scene).toHaveAttribute("data-ring-size", "20");
  await expect(scene).toHaveAttribute("data-boundary-state", "outside");
  await expect(cuts).toHaveCount(2);
  await expect(page.getByText("Inside Out")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await ring.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBoxes = await Promise.all([ring.boundingBox(), cuts.nth(0).boundingBox(), cuts.nth(1).boundingBox()]);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const puzzleBox of puzzleBoxes) {
    expect(puzzleBox).not.toBeNull();
    expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
    expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
        && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
        && puzzleBox!.y < protectedBox!.y + protectedBox!.height
        && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
      expect(overlap, "inside-out interaction overlaps protected game content").toBe(false);
    }
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `018-${testInfo.project.name}.png`) });

  await cuts.nth(0).focus();
  for (let step = 0; step < 12; step += 1) await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-mark-gap", "0");
  await expect(scene).toHaveAttribute("data-boundary-state", "outside");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await ring.focus();
  await page.keyboard.press("+");
  await page.keyboard.press("+");
  await expect(scene).toHaveAttribute("data-ring-size", "60");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.keyboard.press("+");
  await expect(scene).toHaveAttribute("data-ring-size", "80");
  await expect(scene).toHaveAttribute("data-boundary-state", "inside");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 019 counter-rotates two broken shells until the interlayer becomes the complete loop", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 019 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 18;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-019");
  const housing = scene.getByRole("button", { name: "Counter-linked outer paper shell" });
  await expect(scene).toHaveAttribute("data-spatial-model", "counter-rotating-shell-gaps");
  await expect(scene).toHaveAttribute("data-gap-separation", "0");
  await expect(scene).toHaveAttribute("data-layer-ink", "faint");
  await expect(page.getByText("Housing Loop")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await housing.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = await housing.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox).not.toBeNull();
  expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
    expect(overlap, "housing-loop dial overlaps protected game content").toBe(false);
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `019-${testInfo.project.name}.png`) });

  await housing.click();
  await expect(scene).toHaveAttribute("data-gap-separation", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await housing.focus();
  for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-gap-separation", "120");
  await expect(scene).toHaveAttribute("data-layer-ink", "growing");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(scene).toHaveAttribute("data-gap-separation", "180");
  await expect(scene).toHaveAttribute("data-layer-ink", "closed");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 020 routes around three button-like centers instead of rewarding their clicks", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 020 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 19;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-020");
  const halos = scene.getByRole("button", { name: /Outer halo/ });
  const centers = scene.getByRole("button", { name: /Node center/ });
  await expect(scene).toHaveAttribute("data-spatial-model", "halo-route-around-button-centers");
  await expect(scene).toHaveAttribute("data-channel-width", "44");
  await expect(halos).toHaveCount(3);
  await expect(centers).toHaveCount(3);
  await expect(page.getByText("Quiet Circuit")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = await scene.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox).not.toBeNull();
  expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
    expect(overlap, "quiet-circuit scene overlaps protected game content").toBe(false);
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `020-${testInfo.project.name}.png`) });

  for (let index = 0; index < 3; index += 1) await centers.nth(index).click();
  await expect(scene).toHaveAttribute("data-center-faults", "3");
  await expect(scene).toHaveAttribute("data-route-length", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const box = (await scene.boundingBox())!;
  const route = [
    { x: box.x + box.width * .30, y: box.y + box.height * .72 },
    { x: box.x + box.width * .60, y: box.y + box.height * .28 },
    { x: box.x + box.width * .92, y: box.y + box.height * .66 },
  ];
  await page.mouse.move(route[0].x, route[0].y);
  await page.mouse.down();
  await page.mouse.move(route[1].x, route[1].y, { steps: 8 });
  await page.mouse.move(route[2].x, route[2].y, { steps: 8 });
  await page.mouse.up();

  await expect(scene).toHaveAttribute("data-route-length", "3");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 021 answers three fixed ink references only when the breathing frame crosses them", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 021 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 20;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-021");
  const surface = scene.getByRole("button", { name: "Answer the frame and ink-dot crossings" });
  const dots = scene.locator("[data-fixed-reference='true']");
  await expect(scene).toHaveAttribute("data-spatial-model", "fixed-ink-references-against-breathing-frame");
  await expect(scene).toHaveAttribute("data-hit-window-ms", "700");
  await expect(dots).toHaveCount(3);
  await expect(page.getByText("Three-Beat Warmup")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = await scene.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox).not.toBeNull();
  expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
    expect(overlap, "three-beat scene overlaps protected game content").toBe(false);
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `021-${testInfo.project.name}.png`) });

  // Wait for a visibly wrong beat instead of the narrow idle edge between
  // timer ticks; the expected first answer is dot 0, so dot 1 is deterministic.
  await expect(scene).toHaveAttribute("data-active-dot", "1", { timeout: 7_000 });
  await surface.evaluate((element) => {
    (element as HTMLButtonElement).click();
    (element as HTMLButtonElement).click();
    (element as HTMLButtonElement).click();
  });
  await expect(scene).toHaveAttribute("data-hit-count", "0");
  await expect(scene).toHaveAttribute("data-bounce-count", "3");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  for (let beat = 0; beat < 3; beat += 1) {
    await expect(scene).toHaveAttribute("data-active-dot", String(beat), { timeout: 7_000 });
    await surface.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(scene).toHaveAttribute("data-hit-count", String(beat + 1));
  }

  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 022 restores the only lane whose ripple arrives without an ink drop", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 022 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 21;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-022");
  const lanes = scene.getByRole("button", { name: /Drop lane/ });
  const emptyLane = scene.getByRole("button", { name: "Drop lane 3" });
  await expect(scene).toHaveAttribute("data-spatial-model", "four-drop-lanes-with-one-ripple-without-a-drop");
  await expect(scene).toHaveAttribute("data-hit-window-ms", "900");
  await expect(lanes).toHaveCount(4);
  await expect(scene.locator("[data-has-drop='true']")).toHaveCount(3);
  await expect(emptyLane).toHaveAttribute("data-has-drop", "false");
  await expect(page.getByText("Missing Drop")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  await emptyLane.click();
  await expect(scene).toHaveAttribute("data-missing-drop", "missing");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  for (const index of [0, 1, 3]) await lanes.nth(index).click();
  await expect(scene).toHaveAttribute("data-splash-count", "4");

  const puzzleBox = await scene.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox).not.toBeNull();
  expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
    expect(overlap, "missing-drop scene overlaps protected game content").toBe(false);
  }

  await page.waitForTimeout(350);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `022-${testInfo.project.name}.png`) });

  await expect(scene).toHaveAttribute("data-observed-rounds", "1", { timeout: 7_000 });
  await expect(scene).toHaveAttribute("data-ripple-active", "true", { timeout: 4_000 });
  await emptyLane.evaluate((element) => (element as HTMLButtonElement).click());

  await expect(scene).toHaveAttribute("data-missing-drop", "restored");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 023 matches each sound petal to the silence gap with the same visible length", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 023 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 22;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-023");
  const petals = scene.getByRole("button", { name: /Sound petal/ });
  const gaps = scene.locator("[data-silence-gap]");
  await expect(scene).toHaveAttribute("data-spatial-model", "petal-width-to-silence-length");
  await expect(scene).toHaveAttribute("data-drop-padding-px", "22");
  await expect(petals).toHaveCount(3);
  await expect(gaps).toHaveCount(3);
  await expect(gaps.nth(0)).toHaveAttribute("data-size", "1");
  await expect(gaps.nth(1)).toHaveAttribute("data-size", "0");
  await expect(gaps.nth(2)).toHaveAttribute("data-size", "2");
  await expect(page.getByText("Falling Intervals")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = await scene.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox).not.toBeNull();
  expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
    expect(overlap, "falling-intervals scene overlaps protected game content").toBe(false);
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `023-${testInfo.project.name}.png`) });

  await petals.nth(2).focus();
  await page.keyboard.press("Enter");
  await petals.nth(1).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await petals.nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(scene).toHaveAttribute("data-slot-pattern", "0,1,2");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  for (const [petalIndex, gapIndex] of [[1, 0], [2, 1]] as const) {
    const petalBox = (await petals.nth(petalIndex).boundingBox())!;
    const gapBox = (await gaps.nth(gapIndex).boundingBox())!;
    await page.mouse.move(petalBox.x + petalBox.width / 2, petalBox.y + petalBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(gapBox.x + gapBox.width / 2, gapBox.y + gapBox.height / 2, { steps: 8 });
    await page.mouse.up();
  }

  await expect(scene).toHaveAttribute("data-slot-pattern", "1,0,2");
  await expect(scene).toHaveAttribute("data-matched-gaps", "3");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 024 traces five unequal curve distances before reproducing their short-long rhythm", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 024 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 23;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-024");
  const curve = scene.getByRole("application", { name: "Trace five points and beat their distances" });
  await expect(scene).toHaveAttribute("data-spatial-model", "curve-distance-encodes-beat-intervals");
  await expect(scene).toHaveAttribute("data-short-range-ms", "273-567");
  await expect(scene).toHaveAttribute("data-long-range-ms", "468-972");
  await expect(scene).toHaveAttribute("data-long-short-ratio-min", "1.25");
  await expect(page.getByText("Precision Five")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = await scene.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox).not.toBeNull();
  expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
    expect(overlap, "precision-five scene overlaps protected game content").toBe(false);
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `024-${testInfo.project.name}.png`) });

  await curve.focus();
  for (let tap = 0; tap < 5; tap += 1) await page.keyboard.press("Space");
  await expect(scene).toHaveAttribute("data-stage", "trace");
  await expect(scene).toHaveAttribute("data-beat-count", "0");

  const box = (await curve.boundingBox())!;
  const route = [[.12, .62], [.28, .48], [.52, .20], [.66, .34], [.91, .69]] as const;
  await page.mouse.move(box.x + box.width * route[0][0], box.y + box.height * route[0][1]);
  await page.mouse.down();
  for (const [x, y] of route.slice(1)) await page.mouse.move(box.x + box.width * x, box.y + box.height * y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-stage", "beat");
  await expect(scene).toHaveAttribute("data-trace-points", "5");

  await curve.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(100);
  await page.keyboard.press("Space");
  await expect(scene).toHaveAttribute("data-failures", "1");
  await expect(scene).toHaveAttribute("data-beat-count", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.keyboard.press("Space");
  for (const gap of [420, 720, 420, 720]) {
    await page.waitForTimeout(gap);
    await page.keyboard.press("Space");
  }
  await expect(scene).toHaveAttribute("data-beat-count", "5");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 025 answers the outlined dark midpoint instead of the two flashing beacons", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 025 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 24;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-025");
  const beacons = scene.getByRole("button", { name: /Bright beacon/ });
  const darkBead = scene.getByRole("button", { name: "Middle dark bead" });
  await expect(scene).toHaveAttribute("data-spatial-model", "silent-midpoint-between-synchronous-beacons");
  await expect(scene).toHaveAttribute("data-hit-window-ms", "800");
  await expect(beacons).toHaveCount(2);
  await expect(page.getByText("Dark Beat")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = await scene.boundingBox();
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox).not.toBeNull();
  expect(puzzleBox!.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.x + puzzleBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox!.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox!.y + puzzleBox!.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox!.x < protectedBox!.x + protectedBox!.width
      && puzzleBox!.x + puzzleBox!.width > protectedBox!.x
      && puzzleBox!.y < protectedBox!.y + protectedBox!.height
      && puzzleBox!.y + puzzleBox!.height > protectedBox!.y;
    expect(overlap, "dark-beat scene overlaps protected game content").toBe(false);
  }

  for (let click = 0; click < 6; click += 1) await beacons.nth(click % 2).click();
  await expect(scene).toHaveAttribute("data-beacon-echoes", "6");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await expect(scene).toHaveAttribute("data-beacon-flash", "true", { timeout: 4_000 });
  await expect(scene).toHaveAttribute("data-dark-beat", "waiting");
  await darkBead.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(scene).toHaveAttribute("data-dark-misses", "1");

  await page.waitForTimeout(350);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `025-${testInfo.project.name}.png`) });

  await expect(scene).toHaveAttribute("data-dark-beat", "active", { timeout: 4_000 });
  await expect(darkBead).toHaveAttribute("data-outline-cue", "thick");
  await darkBead.evaluate((element) => (element as HTMLButtonElement).click());

  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 026 divides the five-dot paper by its two-versus-three edge evidence", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 026 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 25;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-026");
  const divider = scene.getByRole("slider", { name: "Transparent divider" });
  await expect(scene).toHaveAttribute("data-spatial-model", "divider-reveals-two-plus-three");
  await expect(scene).toHaveAttribute("data-split", "4");
  await expect(scene).toHaveAttribute("data-left-notches", "2");
  await expect(scene).toHaveAttribute("data-right-notches", "3");
  await expect(page.getByText("Five-Beat Divider")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "five-beat-divider scene overlaps protected game content").toBe(false);
  }

  const dragToSplit = async (split: 1 | 2 | 3 | 4) => {
    await page.waitForTimeout(180);
    const handle = (await divider.boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(puzzleBox.x + puzzleBox.width * split / 5, puzzleBox.y + puzzleBox.height / 2, { steps: 5 });
    await page.mouse.up();
  };

  for (const wrongSplit of [1, 3, 4] as const) {
    await dragToSplit(wrongSplit);
    await expect(scene).toHaveAttribute("data-split", String(wrongSplit));
    await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  }
  await expect(scene).toHaveAttribute("data-wrong-groups", "3");

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `026-${testInfo.project.name}.png`) });

  await dragToSplit(2);
  await expect(scene).toHaveAttribute("data-grouping", "two-plus-three");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 027 turns the late flash into an equal angular distance", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 027 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 26;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-027");
  const latePoint = scene.getByRole("slider", { name: "Late paper point" });
  await expect(scene).toHaveAttribute("data-spatial-model", "constant-sweep-with-one-long-angular-gap");
  await expect(scene).toHaveAttribute("data-point-angles", "0,90,180,300");
  await expect(scene).toHaveAttribute("data-gap-before", "120");
  await expect(scene).toHaveAttribute("data-gap-after", "60");
  await expect(scene).toHaveAttribute("data-tolerance-percent", "12");
  await expect(page.getByText("Beacon Metronome")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "beacon-metronome scene overlaps protected game content").toBe(false);
  }

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `027-${testInfo.project.name}.png`) });

  await latePoint.click();
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  const dragLatePointTo = async (angle: number) => {
    await page.waitForTimeout(130);
    const handle = (await latePoint.boundingBox())!;
    const radians = angle * Math.PI / 180;
    const radius = puzzleBox.width * .38;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      puzzleBox.x + puzzleBox.width / 2 + Math.cos(radians) * radius,
      puzzleBox.y + puzzleBox.height / 2 + Math.sin(radians) * radius,
      { steps: 8 },
    );
    await page.mouse.up();
  };

  await dragLatePointTo(220);
  await expect.poll(async () => Number(await scene.getAttribute("data-late-angle"))).toBeLessThan(225);
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await dragLatePointTo(276);
  await expect(scene).toHaveAttribute("data-gap-before", "90");
  await expect(scene).toHaveAttribute("data-gap-after", "90");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 028 stabilizes the flower only when the opposite-phase petal is held", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 028 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 27;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-028");
  const petals = scene.getByRole("button", { name: /Paper petal/ });
  await expect(scene).toHaveAttribute("data-spatial-model", "four-petals-with-one-opposite-phase");
  await expect(scene).toHaveAttribute("data-phase-model", "three-same-one-opposite");
  await expect(scene).toHaveAttribute("data-hold-cycle-ms", "1600");
  await expect(petals).toHaveCount(4);
  await expect(page.getByText("Offbeat Petal")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "offbeat-petal scene overlaps protected game content").toBe(false);
  }

  await page.waitForTimeout(420);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `028-${testInfo.project.name}.png`) });

  for (let index = 0; index < 4; index += 1) await petals.nth(index).click();
  await expect(scene).toHaveAttribute("data-quick-releases", "4");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const samePetalBox = (await petals.nth(0).boundingBox())!;
  await page.mouse.move(samePetalBox.x + samePetalBox.width / 2, samePetalBox.y + samePetalBox.height / 2);
  await page.mouse.down();
  await expect(scene).toHaveAttribute("data-rhythm", "chaotic");
  await page.waitForTimeout(1_750);
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.mouse.up();

  const offbeatBox = (await petals.nth(2).boundingBox())!;
  await page.mouse.move(offbeatBox.x + offbeatBox.width / 2, offbeatBox.y + offbeatBox.height / 2);
  await page.mouse.down();
  await expect(scene).toHaveAttribute("data-rhythm", "stabilizing");
  await expect(page.getByText("You found the crack in time")).toBeVisible({ timeout: 3_000 });
  await expect(scene).toHaveAttribute("data-center", "stable");
  await page.mouse.up();
});

test("level 029 reveals one missing pulse with the ruler before accepting the spare dot", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 029 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 28;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-029");
  const ruler = scene.getByRole("button", { name: "Transparent inspection ruler" });
  const spare = scene.getByRole("button", { name: "Spare ink dot" });
  await expect(scene).toHaveAttribute("data-spatial-model", "comparison-ruler-reveals-one-missing-pulse");
  await expect(scene).toHaveAttribute("data-stage", "compare");
  await expect(scene).toHaveAttribute("data-visible-gap", "none");
  await expect(page.getByText("Echo Gap")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "pulse-checker scene overlaps protected game content").toBe(false);
  }

  const dragControlTo = async (control: typeof ruler, x: number, y: number) => {
    await page.waitForTimeout(130);
    const box = (await control.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(puzzleBox.x + puzzleBox.width * x, puzzleBox.y + puzzleBox.height * y, { steps: 7 });
    await page.mouse.up();
  };

  await dragControlTo(spare, .60, .60);
  await expect(scene).toHaveAttribute("data-wrong-drops", "1");
  await expect(scene).toHaveAttribute("data-stage", "compare");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragControlTo(ruler, .50, .60);
  await expect(scene).toHaveAttribute("data-stage", "fill");
  await expect(scene).toHaveAttribute("data-matched-ticks", "hidden");
  await expect(scene).toHaveAttribute("data-visible-gap", "5");

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `029-${testInfo.project.name}.png`) });

  await dragControlTo(spare, .40, .60);
  await expect(scene).toHaveAttribute("data-wrong-drops", "2");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await dragControlTo(spare, .60, .60);
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 030 hides the fourth measure line behind a directional paper fold", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 030 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 29;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-030");
  const corner = scene.getByRole("button", { name: "Thick lower-right fold" });
  await expect(scene).toHaveAttribute("data-spatial-model", "thick-corner-reveals-backside-fourth-bar");
  await expect(scene).toHaveAttribute("data-measure-cells", "4");
  await expect(scene).toHaveAttribute("data-front-bars", "3");
  await expect(scene).toHaveAttribute("data-back-line", "hidden");
  await expect(page.getByText("Broken Measure")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "broken-measure scene overlaps protected game content").toBe(false);
  }

  for (let click = 0; click < 4; click += 1) await corner.click();
  await expect(scene).toHaveAttribute("data-clicks", "4");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const wrongBox = (await corner.boundingBox())!;
  await page.mouse.move(wrongBox.x + wrongBox.width / 2, wrongBox.y + wrongBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(wrongBox.x + wrongBox.width / 2 + 45, wrongBox.y + wrongBox.height / 2 + 34, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-wrong-folds", "1");
  await expect(scene).toHaveAttribute("data-paper-response", "rebound");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const partialBox = (await corner.boundingBox())!;
  await page.mouse.move(partialBox.x + partialBox.width / 2, partialBox.y + partialBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(partialBox.x + partialBox.width / 2 - 30, partialBox.y + partialBox.height / 2 - 24, { steps: 5 });
  await expect(scene).toHaveAttribute("data-back-line", "shadow");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `030-${testInfo.project.name}.png`) });
  await page.mouse.up();
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const solveBox = (await corner.boundingBox())!;
  await page.mouse.move(solveBox.x + solveBox.width / 2, solveBox.y + solveBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(solveBox.x + solveBox.width / 2 - 52, solveBox.y + solveBox.height / 2 - 44, { steps: 7 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-back-line", "joined");
  await expect(scene).toHaveAttribute("data-fold-progress", "100");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 031 closes the cropped circle by widening its inner frame", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 031 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 30;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-031");
  const circle = scene.getByRole("button", { name: "Cropped paper circle" });
  const edge = scene.getByRole("slider", { name: "Adjustable right window edge" });
  await expect(scene).toHaveAttribute("data-spatial-model", "fixed-circle-inside-resizable-window");
  await expect(scene).toHaveAttribute("data-circle-state", "cropped");
  await expect(scene).toHaveAttribute("data-window-width", "44");
  await expect(page.getByText("Escape Hatch")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "escape-hatch scene overlaps protected game content").toBe(false);
  }

  const circleBox = (await circle.boundingBox())!;
  await page.mouse.move(circleBox.x + circleBox.width / 2, circleBox.y + circleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(circleBox.x + circleBox.width / 2 + 48, circleBox.y + circleBox.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-circle-drags", "1");
  await expect(scene).toHaveAttribute("data-circle-offset", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await expect(scene).toHaveAttribute("data-window-width", "44");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const dragEdgeToWidth = async (widthPercent: number) => {
    await page.waitForTimeout(140);
    const edgeBox = (await edge.boundingBox())!;
    await page.mouse.move(edgeBox.x + edgeBox.width / 2, edgeBox.y + edgeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      puzzleBox.x + puzzleBox.width / 2 + puzzleBox.width * widthPercent / 200,
      puzzleBox.y + puzzleBox.height / 2,
      { steps: 7 },
    );
    await page.mouse.up();
  };

  await dragEdgeToWidth(36);
  await expect(scene).toHaveAttribute("data-frame-misses", "1");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await dragEdgeToWidth(62);
  await expect(scene).toHaveAttribute("data-circle-state", "seams-touch");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `031-${testInfo.project.name}.png`) });

  await dragEdgeToWidth(70);
  await expect(scene).toHaveAttribute("data-circle-state", "closed");
  await expect(scene).toHaveAttribute("data-window-width", "68");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 032 rotates only the vertical title strip onto the shared baseline", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 032 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 31;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-032");
  const strip = scene.getByRole("button", { name: "Vertical second title strip" });
  await expect(scene).toHaveAttribute("data-spatial-model", "two-title-halves-one-hinge");
  await expect(scene).toHaveAttribute("data-strip-angle", "90");
  await expect(scene).toHaveAttribute("data-baseline", "split");
  await expect(scene).toHaveAttribute("data-hinge", "concealed");
  await expect(page.getByText("Landscape Nudge")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "landscape-nudge scene overlaps protected game content").toBe(false);
  }

  for (let click = 0; click < 4; click += 1) await strip.click();
  await expect(scene).toHaveAttribute("data-clicks", "4");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event("orientationchange")));
  await expect(scene).toHaveAttribute("data-device-orientations", "0");

  const hinge = {
    x: puzzleBox.x + puzzleBox.width * .48,
    y: puzzleBox.y + puzzleBox.height * .54,
  };
  await page.mouse.move(hinge.x, hinge.y + 82);
  await page.mouse.down();
  await page.mouse.move(hinge.x + 72, hinge.y + 42, { steps: 7 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-baseline", "approaching");
  await expect(scene).toHaveAttribute("data-wrong-rotations", "1");
  await expect(scene).toHaveAttribute("data-hinge", "revealed");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `032-${testInfo.project.name}.png`) });

  await page.mouse.move(hinge.x, hinge.y + 82);
  await page.mouse.down();
  await page.mouse.move(hinge.x + 86, hinge.y, { steps: 8 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-strip-angle", "0");
  await expect(scene).toHaveAttribute("data-baseline", "joined");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 033 rotates the whole paper until the fixed plumb line meets its notch", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 033 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 32;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-033");
  const paper = scene.getByRole("button", { name: "Whole scene paper with window frame" });
  await expect(scene).toHaveAttribute("data-spatial-model", "misleading-frame-fixed-plumb-line");
  await expect(scene).toHaveAttribute("data-paper-angle", "0");
  await expect(scene).toHaveAttribute("data-level-state", "misleading");
  await expect(scene).toHaveAttribute("data-plumb-offset", "24");
  await expect(page.getByText("Window Tilt")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "window-tilt scene overlaps protected game content").toBe(false);
  }

  await paper.click();
  await expect(scene).toHaveAttribute("data-clicks", "1");
  await page.evaluate(() => window.dispatchEvent(new Event("deviceorientation")));
  await expect(scene).toHaveAttribute("data-direction-events", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const center = { x: puzzleBox.x + puzzleBox.width / 2, y: puzzleBox.y + puzzleBox.height / 2 };
  const dragBy = async (deltaX: number) => {
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + deltaX, center.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragBy(80);
  await expect(scene).toHaveAttribute("data-level-state", "worse");
  await expect(scene).toHaveAttribute("data-paper-angle", "10");
  await expect(scene).toHaveAttribute("data-wrong-rotations", "1");

  await dragBy(-112);
  await expect(scene).toHaveAttribute("data-level-state", "closer");
  await expect(scene).toHaveAttribute("data-paper-angle", "-4");
  await expect(scene).toHaveAttribute("data-plumb-offset", "16");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `033-${testInfo.project.name}.png`) });

  await dragBy(-40);
  await expect(scene).toHaveAttribute("data-paper-angle", "-12");
  await expect(scene).toHaveAttribute("data-level-state", "true");
  await expect(scene).toHaveAttribute("data-plumb-offset", "0");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 034 turns and overlaps two torn landscapes into one shared horizon", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 034 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 33;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-034");
  const sky = scene.getByRole("button", { name: "Move sky landscape paper" });
  const reflection = scene.getByRole("button", { name: "Move reflection landscape paper" });
  await expect(scene).toHaveAttribute("data-spatial-model", "two-torn-landscapes-one-horizon");
  await expect(scene).toHaveAttribute("data-reflection-angle", "90");
  await expect(scene).toHaveAttribute("data-tears", "concealed");
  await expect(scene).toHaveAttribute("data-overlap", "separate");
  await expect(scene).toHaveAttribute("data-shared-line", "false");
  await expect(page.getByText("Double Horizon")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "double-horizon scene overlaps protected game content").toBe(false);
  }

  await reflection.click();
  await expect(scene).toHaveAttribute("data-tears", "concealed");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const skyBoxBefore = (await sky.boundingBox())!;
  await page.mouse.move(skyBoxBefore.x + skyBoxBefore.width / 2, skyBoxBefore.y + skyBoxBefore.height / 2);
  await page.mouse.down();
  await page.mouse.move(skyBoxBefore.x + skyBoxBefore.width / 2 + 30, skyBoxBefore.y + skyBoxBefore.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-tears", "revealed");

  await page.waitForTimeout(180);
  const skyBox = (await sky.boundingBox())!;
  const reflectionBox = (await reflection.boundingBox())!;
  await page.mouse.move(reflectionBox.x + reflectionBox.width / 2, reflectionBox.y + reflectionBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(skyBox.x + skyBox.width / 2, skyBox.y + skyBox.height / 2, { steps: 10 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-overlap", "overlapping");
  await expect(scene).toHaveAttribute("data-reflection-angle", "90");
  await expect(scene).toHaveAttribute("data-wrong-overlaps", "1");
  await expect(scene).toHaveAttribute("data-shared-line", "false");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.waitForTimeout(180);
  let pivot = scene.getByRole("button", { name: "Reflection paper torn pivot" });
  let pivotBox = (await pivot.boundingBox())!;
  await page.mouse.move(pivotBox.x + pivotBox.width / 2, pivotBox.y + pivotBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(pivotBox.x + pivotBox.width / 2 - 70, pivotBox.y + pivotBox.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-reflection-angle", "20");
  await expect(scene).toHaveAttribute("data-sun-relation", "approaching");
  await page.waitForTimeout(360);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `034-${testInfo.project.name}.png`) });

  await page.waitForTimeout(180);
  pivot = scene.getByRole("button", { name: "Reflection paper torn pivot" });
  pivotBox = (await pivot.boundingBox())!;
  await page.mouse.move(pivotBox.x + pivotBox.width / 2, pivotBox.y + pivotBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(pivotBox.x + pivotBox.width / 2 - 20, pivotBox.y + pivotBox.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-reflection-angle", "0");
  await expect(scene).toHaveAttribute("data-shared-line", "true");
  await expect(scene).toHaveAttribute("data-sun-relation", "mirrored");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 035 shifts a whole-sky viewpoint until three parallax depths share one height", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 035 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 34;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-035");
  const sky = scene.getByRole("button", { name: "Drag the sky viewpoint" });
  await expect(scene).toHaveAttribute("data-spatial-model", "full-sky-three-depths");
  await expect(scene).toHaveAttribute("data-parallax", "concealed");
  await expect(scene).toHaveAttribute("data-height-alignment", "split");
  await expect(scene).toHaveAttribute("data-reflection-segments", "1");
  await expect(page.getByText("Horizon Shift")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await sky.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await sky.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "horizon-shift control overlaps protected game content").toBe(false);
  }

  await sky.click();
  await page.evaluate(() => window.dispatchEvent(new Event("deviceorientation")));
  await expect(scene).toHaveAttribute("data-direction-events", "0");
  await expect(scene).toHaveAttribute("data-parallax", "concealed");
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await sky.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  const dragFromCenter = async (deltaX: number, deltaY: number) => {
    const box = (await sky.boundingBox())!;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + deltaX, center.y + deltaY, { steps: 8 });
    await page.mouse.up();
  };

  await dragFromCenter(24, 0);
  await expect(scene).toHaveAttribute("data-parallax", "revealed");
  await expect(scene).toHaveAttribute("data-view-x", "24");
  await expect(scene).toHaveAttribute("data-front-x", "13");
  await expect(scene).toHaveAttribute("data-back-x", "5");
  await expect(scene).toHaveAttribute("data-sun-x", "20");
  await expect(scene).toHaveAttribute("data-reflection-segments", "2");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragFromCenter(0, 48);
  await expect(scene).toHaveAttribute("data-view-y", "12");
  await expect(scene).toHaveAttribute("data-height-alignment", "two-only");
  await expect(scene).toHaveAttribute("data-reflection-state", "incomplete");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `035-${testInfo.project.name}.png`) });

  await dragFromCenter(0, 32);
  await expect(scene).toHaveAttribute("data-view-y", "20");
  await expect(scene).toHaveAttribute("data-front-height", "51");
  await expect(scene).toHaveAttribute("data-back-height", "51");
  await expect(scene).toHaveAttribute("data-sun-height", "51");
  await expect(scene).toHaveAttribute("data-height-alignment", "all-three");
  await expect(scene).toHaveAttribute("data-reflection-state", "complete");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 036 carries one paper level across three bands before joining the evidenced horizon", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 036 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 35;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-036");
  const tool = scene.getByRole("button", { name: "Paper spirit level" });
  const bands = [1, 2, 3].map((index) => scene.getByRole("button", { name: `Paper band ${index}` }));
  const target = scene.getByTestId("portable-horizon-target");
  await expect(scene).toHaveAttribute("data-spatial-model", "three-bands-portable-level");
  await expect(scene).toHaveAttribute("data-instrument-reading", "air");
  await expect(scene).toHaveAttribute("data-tested-count", "0");
  await expect(scene).toHaveAttribute("data-connected", "false");
  await expect(page.getByText("Portable Horizon")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "portable-horizon workbench overlaps protected game content").toBe(false);
  }

  const dragCenterTo = async (locator: typeof tool, destination: { x: number; y: number }, sourceRatioX = .5) => {
    const box = (await locator.boundingBox())!;
    await page.mouse.move(box.x + box.width * sourceRatioX, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(destination.x, destination.y, { steps: 8 });
    await page.mouse.up();
  };
  const targetBox = (await target.boundingBox())!;
  const targetCenter = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  await dragCenterTo(bands[2], targetCenter, .18);
  await expect(scene).toHaveAttribute("data-wrong-drops", "1");
  await expect(scene).toHaveAttribute("data-connected", "false");
  await page.waitForTimeout(220);

  const firstBandBox = (await bands[0].boundingBox())!;
  await dragCenterTo(tool, { x: firstBandBox.x + firstBandBox.width / 2, y: firstBandBox.y + firstBandBox.height / 2 });
  await expect(scene).toHaveAttribute("data-instrument-reading", "left-low");
  await expect(scene).toHaveAttribute("data-bubble-offset", "-16");
  await expect(scene).toHaveAttribute("data-shadow-left", "36");
  await expect(scene).toHaveAttribute("data-shadow-right", "20");

  const secondBandBox = (await bands[1].boundingBox())!;
  await dragCenterTo(tool, { x: secondBandBox.x + secondBandBox.width / 2, y: secondBandBox.y + secondBandBox.height / 2 });
  await expect(scene).toHaveAttribute("data-instrument-reading", "right-low");
  await expect(scene).toHaveAttribute("data-bubble-offset", "14");
  await expect(scene).toHaveAttribute("data-shadow-left", "18");
  await expect(scene).toHaveAttribute("data-shadow-right", "35");

  const thirdBandBox = (await bands[2].boundingBox())!;
  await dragCenterTo(tool, { x: thirdBandBox.x + thirdBandBox.width / 2, y: thirdBandBox.y + thirdBandBox.height / 2 });
  await expect(scene).toHaveAttribute("data-instrument-reading", "centered");
  await expect(scene).toHaveAttribute("data-bubble-offset", "0");
  await expect(scene).toHaveAttribute("data-shadow-left", "28");
  await expect(scene).toHaveAttribute("data-shadow-right", "28");
  await expect(scene).toHaveAttribute("data-tested-count", "3");
  await expect(scene).toHaveAttribute("data-evidence", "double");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `036-${testInfo.project.name}.png`) });

  await dragCenterTo(bands[0], targetCenter, .18);
  await expect(scene).toHaveAttribute("data-wrong-drops", "2");
  await expect(scene).toHaveAttribute("data-connected", "false");
  await page.waitForTimeout(220);

  await dragCenterTo(bands[2], targetCenter, .18);
  await expect(scene).toHaveAttribute("data-connected", "true");
  await expect(scene).toHaveAttribute("data-joined-band", "verified");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 037 overlaps two depth windows by their clock centers rather than their rims", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 037 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 36;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-037");
  const hands = scene.getByRole("button", { name: "Clock-hand paper window" });
  const ring = scene.getByRole("button", { name: "Clock-ring paper window" });
  await expect(scene).toHaveAttribute("data-spatial-model", "two-depth-windows-one-clock");
  await expect(scene).toHaveAttribute("data-parallax", "concealed");
  await expect(scene).toHaveAttribute("data-window-distance", "175");
  await expect(scene).toHaveAttribute("data-overlap", "separate");
  await expect(scene).toHaveAttribute("data-frame-pattern", "broken");
  await expect(page.getByText("Parallax Window")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await scene.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const puzzleBox = (await scene.boundingBox())!;
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "parallax-window scene overlaps protected game content").toBe(false);
  }

  await hands.click();
  await expect(scene).toHaveAttribute("data-parallax", "concealed");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const dragWindowBy = async (locator: typeof hands, deltaX: number, deltaY: number) => {
    const box = (await locator.boundingBox())!;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + deltaX, center.y + deltaY, { steps: 8 });
    await page.mouse.up();
  };

  await dragWindowBy(hands, 60, 0);
  await expect(scene).toHaveAttribute("data-parallax", "revealed");
  await expect(scene).toHaveAttribute("data-hands-offset", "60,0");
  await expect(scene).toHaveAttribute("data-hands-depth-offset", "-10,0");
  await expect(scene).toHaveAttribute("data-ring-depth-offset", "0,0");
  await expect(scene).toHaveAttribute("data-overlap", "edge-touching");
  await expect(scene).toHaveAttribute("data-frame-pattern", "interrupted");
  await expect(scene).toHaveAttribute("data-wrong-drops", "1");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `037-${testInfo.project.name}.png`) });

  await dragWindowBy(hands, 90, 40);
  await expect(scene).toHaveAttribute("data-window-distance", "0");
  await expect(scene).toHaveAttribute("data-overlap", "aligned");
  await expect(scene).toHaveAttribute("data-frame-pattern", "continuous");
  await expect(scene).toHaveAttribute("data-snap-zone", "36");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
  await expect(ring).toBeVisible();
});

test("level 038 sends one torn ticket out the left edge and continuously back through the right", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 038 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 37;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-038");
  const ticket = scene.getByRole("button", { name: "Left return-ticket piece" });
  const rightHalf = scene.getByTestId("return-ticket-right-half");
  await expect(scene).toHaveAttribute("data-spatial-model", "continuous-opposite-page-edges");
  await expect(scene).toHaveAttribute("data-edge-state", "split");
  await expect(scene).toHaveAttribute("data-progress", "0");
  await expect(scene).toHaveAttribute("data-navigation", "local-only");
  await expect(scene).toHaveAttribute("data-history-events", "0");
  await expect(page.getByText("Return Ticket")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);
  await expect.poll(async () => (await ticket.boundingBox())?.width ?? 0).toBeGreaterThan(0);

  const ticketBoxes = [(await ticket.boundingBox())!, (await rightHalf.boundingBox())!];
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  const viewport = page.viewportSize()!;
  for (const ticketBox of ticketBoxes) {
    expect(ticketBox.x).toBeGreaterThanOrEqual(0);
    expect(ticketBox.x + ticketBox.width).toBeLessThanOrEqual(viewport.width);
    expect(ticketBox.y).toBeGreaterThanOrEqual(0);
    expect(ticketBox.y + ticketBox.height).toBeLessThanOrEqual(viewport.height);
    for (const protectedBox of protectedBoxes) {
      expect(protectedBox).not.toBeNull();
      const overlap = ticketBox.x < protectedBox!.x + protectedBox!.width
        && ticketBox.x + ticketBox.width > protectedBox!.x
        && ticketBox.y < protectedBox!.y + protectedBox!.height
        && ticketBox.y + ticketBox.height > protectedBox!.y;
      expect(overlap, "return-ticket edge piece overlaps protected game content").toBe(false);
    }
  }

  const initialBox = (await ticket.boundingBox())!;
  const initialCenter = { x: initialBox.x + initialBox.width / 2, y: initialBox.y + initialBox.height / 2 };
  await page.mouse.move(initialCenter.x, initialCenter.y);
  await page.mouse.down();
  await page.mouse.move(initialCenter.x + 50, initialCenter.y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-route", "center-wrong");
  await expect(scene).toHaveAttribute("data-center-attempts", "1");
  await expect(scene).toHaveAttribute("data-progress", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const urlBeforeEdgeLoop = page.url();
  const crossingBox = (await ticket.boundingBox())!;
  const crossingCenter = { x: crossingBox.x + crossingBox.width / 2, y: crossingBox.y + crossingBox.height / 2 };
  await page.mouse.move(crossingCenter.x, crossingCenter.y);
  await page.mouse.down();
  await page.mouse.move(crossingCenter.x - 20, crossingCenter.y, { steps: 5 });
  await expect(scene).toHaveAttribute("data-progress", "70");
  await expect(scene).toHaveAttribute("data-left-exit", "70");
  await expect(scene).toHaveAttribute("data-right-entry", "70");
  await expect(scene).toHaveAttribute("data-edge-state", "wrapped");
  await expect(scene).toHaveAttribute("data-fiber-continuity", "continuous");
  await expect(page).toHaveURL(urlBeforeEdgeLoop);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `038-${testInfo.project.name}.png`) });

  await page.mouse.move(crossingCenter.x - 40, crossingCenter.y, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-progress", "140");
  await expect(scene).toHaveAttribute("data-edge-state", "joined");
  await expect(scene).toHaveAttribute("data-fiber-continuity", "joined");
  await expect(scene).toHaveAttribute("data-right-seam", "closed");
  await expect(scene).toHaveAttribute("data-history-events", "0");
  await expect(page).toHaveURL(urlBeforeEdgeLoop);
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 039 threads one ribbon behind the first tab and in front of the second", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 039 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 38;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-039");
  const endpoint = scene.getByRole("button", { name: "Loose ribbon end" });
  const firstTab = scene.getByTestId("doubleback-tab-1");
  const secondTab = scene.getByTestId("doubleback-tab-2");
  await expect(scene).toHaveAttribute("data-spatial-model", "two-tabs-alternating-depth");
  await expect(scene).toHaveAttribute("data-thread-stage", "0");
  await expect(scene).toHaveAttribute("data-threaded-depths", "none");
  await expect(page.getByText("Tab Doubleback")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "tab-doubleback scene overlaps protected game content").toBe(false);
  }

  await endpoint.click();
  await expect(scene).toHaveAttribute("data-thread-stage", "0");

  const dragEndpointTo = async (target: Locator, verticalRatio: number) => {
    const endpointBox = (await endpoint.boundingBox())!;
    const targetBox = (await target.boundingBox())!;
    const start = { x: endpointBox.x + endpointBox.width / 2, y: endpointBox.y + endpointBox.height / 2 };
    const finish = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height * verticalRatio };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(finish.x, finish.y, { steps: 9 });
    await page.mouse.up();
  };

  await dragEndpointTo(firstTab, .5);
  await expect(scene).toHaveAttribute("data-last-feedback", "rebounded");
  await expect(scene).toHaveAttribute("data-wrong-layers", "1");
  await expect(scene).toHaveAttribute("data-thread-stage", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragEndpointTo(firstTab, .78);
  await expect(scene).toHaveAttribute("data-thread-stage", "1");
  await expect(scene).toHaveAttribute("data-threaded-depths", "back");
  await expect(scene).toHaveAttribute("data-last-feedback", "fold-kept");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `039-${testInfo.project.name}.png`) });

  await dragEndpointTo(secondTab, .78);
  await expect(scene).toHaveAttribute("data-thread-stage", "1");
  await expect(scene).toHaveAttribute("data-last-feedback", "rebounded");
  await expect(scene).toHaveAttribute("data-wrong-layers", "2");

  await dragEndpointTo(secondTab, .22);
  await expect(scene).toHaveAttribute("data-thread-stage", "2");
  await expect(scene).toHaveAttribute("data-threaded-depths", "back-front");
  await expect(scene).toHaveAttribute("data-ribbon-loop", "closed");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 040 reveals an edge ticket before a cover-and-return cycle", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 040 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 39;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-040");
  const ticket = scene.getByRole("button", { name: "Half return ticket" });
  const fold = scene.getByRole("button", { name: "Page fold" });
  await expect(scene).toHaveAttribute("data-spatial-model", "edge-ticket-cover-return");
  await expect(scene).toHaveAttribute("data-ticket-cutout", "concealed");
  await expect(scene).toHaveAttribute("data-return-state", "partial");
  await expect(scene).toHaveAttribute("data-initial-visibility-count", "0");
  await expect(page.getByText("Tab Return")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "tab-return scene overlaps protected game content").toBe(false);
  }

  await ticket.click();
  await expect(scene).toHaveAttribute("data-ticket-cutout", "concealed");
  const dragBy = async (target: Locator, deltaX: number) => {
    const box = (await target.boundingBox())!;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + deltaX, center.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragBy(ticket, -46);
  await expect(scene).toHaveAttribute("data-ticket-feedback", "dodged");
  await expect(scene).toHaveAttribute("data-ticket-dodges", "1");
  await expect(scene).toHaveAttribute("data-ticket-cutout", "concealed");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragBy(ticket, 38);
  await expect(scene).toHaveAttribute("data-ticket-cutout", "revealed");
  await expect(scene).toHaveAttribute("data-discovered", "true");
  await expect(scene).toHaveAttribute("data-ticket-feedback", "cutout-found");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `040-${testInfo.project.name}.png`) });

  await dragBy(fold, -70);
  await expect(scene).toHaveAttribute("data-cover-state", "open");
  await expect(scene).toHaveAttribute("data-cover-progress", "0");

  await dragBy(fold, -150);
  await expect(scene).toHaveAttribute("data-cover-state", "covered");
  await expect(scene).toHaveAttribute("data-cover-progress", "100");
  expect(await fold.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return hit === element || element.contains(hit);
  }), "returned fold handle is not the top hit target").toBe(true);
  await dragBy(fold, 150);
  await expect(scene).toHaveAttribute("data-cover-state", "returned");
  await expect(scene).toHaveAttribute("data-return-state", "returned");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 041 completes the broad outer rim instead of clicking inside the question", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 041 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 40;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-041");
  const route = scene.getByRole("application", { name: "Outer question-mark paper rim" });
  const inside = scene.getByRole("button", { name: "Inside the question mark" });
  const dot = scene.getByRole("button", { name: "Quiet dot" });
  await expect(scene).toHaveAttribute("data-spatial-model", "question-mark-outer-rim");
  await expect(scene).toHaveAttribute("data-route-state", "idle");
  await expect(scene).toHaveAttribute("data-channel-width", "28");
  await expect(page.getByText("Help Loop")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "help-loop scene overlaps protected game content").toBe(false);
  }

  await inside.click();
  await dot.click();
  await expect(scene).toHaveAttribute("data-inner-clicks", "2");
  await expect(scene).toHaveAttribute("data-dot-ripples", "2");
  await expect(scene).toHaveAttribute("data-route-state", "faded");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const nodes = [
    [45, 13], [64, 16], [78, 28], [80, 44], [70, 57], [57, 65], [55, 78], [43, 78], [42, 62],
    [51, 50], [61, 43], [61, 31], [50, 26], [39, 31], [34, 43], [22, 40], [24, 25], [34, 16], [45, 13],
  ] as const;
  const routeBox = (await route.boundingBox())!;
  const point = ([x, y]: readonly [number, number]) => ({
    x: routeBox.x + routeBox.width * x / 100,
    y: routeBox.y + routeBox.height * y / 100,
  });
  const start = point(nodes[0]);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let index = 1; index <= 7; index += 1) {
    const next = point(nodes[index]);
    await page.mouse.move(next.x, next.y, { steps: 4 });
  }
  await expect(scene).toHaveAttribute("data-route-state", "tracing");
  await expect(scene).toHaveAttribute("data-route-progress", "8");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `041-${testInfo.project.name}.png`) });
  for (let index = 8; index < nodes.length; index += 1) {
    const next = point(nodes[index]);
    await page.mouse.move(next.x, next.y, { steps: 4 });
  }
  await page.mouse.up();

  await expect(scene).toHaveAttribute("data-route-state", "complete");
  await expect(scene).toHaveAttribute("data-route-progress", "19");
  await expect(scene).toHaveAttribute("data-connector", "connected");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 042 mirrors one panel probe and reveals the source only after a two-axis return", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 042 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 41;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-042");
  const panel = scene.getByRole("button", { name: "Frosted side paper" });
  await expect(scene).toHaveAttribute("data-spatial-model", "frosted-panel-mirrored-echo");
  await expect(scene).toHaveAttribute("data-ping-mode", "single-replacing");
  await expect(scene).toHaveAttribute("data-edge-visibility", "sliver");
  await expect(page.getByText("Panel Ping")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "panel-ping scene overlaps protected game content").toBe(false);
  }

  const panelBox = (await panel.boundingBox())!;
  const probePosition = { x: panelBox.width * .7, y: panelBox.height * .3 };
  await panel.click({ position: probePosition });
  const mirroredProbe = await scene.evaluate((element) => ({
    probe: (element.getAttribute("data-probe-local") ?? "").split(",").map(Number),
    echo: (element.getAttribute("data-echo-local") ?? "").split(",").map(Number),
    world: (element.getAttribute("data-echo-world") ?? "").split(",").map(Number),
  }));
  expect(Math.abs(mirroredProbe.probe[0] - 70)).toBeLessThanOrEqual(1);
  expect(Math.abs(mirroredProbe.probe[1] - 30)).toBeLessThanOrEqual(1);
  expect(mirroredProbe.probe[0] + mirroredProbe.echo[0]).toBe(100);
  expect(mirroredProbe.probe[1] + mirroredProbe.echo[1]).toBe(100);
  expect(Math.abs(mirroredProbe.world[0] - 42.4)).toBeLessThanOrEqual(.7);
  expect(Math.abs(mirroredProbe.world[1] - 64.2)).toBeLessThanOrEqual(.8);
  await expect(scene).toHaveAttribute("data-active-echoes", "1");
  await panel.click({ position: probePosition });
  await panel.click({ position: probePosition });
  await expect(scene).toHaveAttribute("data-ping-count", "3");
  await expect(scene).toHaveAttribute("data-active-echoes", "1");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const wrongStart = { x: panelBox.x + panelBox.width / 2, y: panelBox.y + panelBox.height / 2 };
  await page.mouse.move(wrongStart.x, wrongStart.y);
  await page.mouse.down();
  await page.mouse.move(wrongStart.x + puzzleBox.width * .18, wrongStart.y + puzzleBox.height * .16, { steps: 7 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-last-feedback", "rebounded");
  await expect(scene).toHaveAttribute("data-panel-offset", "0,0");

  const freshPanelBox = (await panel.boundingBox())!;
  await panel.click({ position: { x: freshPanelBox.width * .7, y: freshPanelBox.height * .3 } });
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `042-${testInfo.project.name}.png`) });

  const alignment = await scene.evaluate((element) => ({
    echo: (element.getAttribute("data-echo-world") ?? "").split(",").map(Number),
    source: (element.getAttribute("data-source-world") ?? "").split(",").map(Number),
  }));
  const correctStart = { x: freshPanelBox.x + freshPanelBox.width / 2, y: freshPanelBox.y + freshPanelBox.height / 2 };
  await page.mouse.move(correctStart.x, correctStart.y);
  await page.mouse.down();
  await page.mouse.move(
    correctStart.x + puzzleBox.width * (alignment.source[0] - alignment.echo[0]) / 100,
    correctStart.y + puzzleBox.height * (alignment.source[1] - alignment.echo[1]) / 100,
    { steps: 9 },
  );
  await page.mouse.up();

  await expect(scene).toHaveAttribute("data-last-feedback", "aligned");
  await expect(scene).toHaveAttribute("data-edge-visibility", "revealed");
  const finalEcho = (await scene.getAttribute("data-echo-world"))!.split(",").map(Number);
  expect(Math.abs(finalEcho[0] - alignment.source[0])).toBeLessThanOrEqual(1);
  expect(Math.abs(finalEcho[1] - alignment.source[1])).toBeLessThanOrEqual(1);
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 043 draws a route with moving attention while opened tabs remain dead ends", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 043 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 42;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-043");
  const tabs = scene.getByRole("button", { name: /Archive tab/ });
  await expect(scene).toHaveAttribute("data-spatial-model", "attention-draws-route");
  await expect(scene).toHaveAttribute("data-route-state", "idle");
  await expect(scene).toHaveAttribute("data-visible-bands", "0");
  await expect(tabs).toHaveCount(3);
  await expect(page.getByText("Archive Route")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "archive-route scene overlaps protected game content").toBe(false);
  }

  for (let index = 0; index < 3; index += 1) await tabs.nth(index).evaluate((element) => (element as HTMLElement).click());
  await expect(scene).toHaveAttribute("data-opened-tabs", "3");
  await expect(scene).toHaveAttribute("data-route-length", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await tabs.nth(1).focus();
  await expect(scene).toHaveAttribute("data-route-state", "broken");
  await expect(scene).toHaveAttribute("data-route-length", "0");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

  await mkdir(sequentialScreenshotRoot, { recursive: true });
  if (testInfo.project.name === "desktop-1440") {
    await tabs.nth(0).hover();
    await page.waitForTimeout(260);
    await expect(scene).toHaveAttribute("data-route-length", "1");
    await expect(scene).toHaveAttribute("data-visible-bands", "1");
    await tabs.nth(1).hover();
    await page.waitForTimeout(260);
    await expect(scene).toHaveAttribute("data-route-length", "2");
    await expect(scene).toHaveAttribute("data-visible-bands", "2");
    await page.screenshot({ path: path.join(sequentialScreenshotRoot, `043-${testInfo.project.name}.png`) });
    await tabs.nth(2).hover();
    await page.waitForTimeout(260);
  } else {
    const point = (x: number, y: number) => ({ x: puzzleBox.x + puzzleBox.width * x / 100, y: puzzleBox.y + puzzleBox.height * y / 100 });
    const start = point(8, 88);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const [x, y] of [[20, 65], [51, 28]] as const) {
      const next = point(x, y);
      await page.mouse.move(next.x, next.y, { steps: 7 });
    }
    await expect(scene).toHaveAttribute("data-input-mode", "held-attention");
    await expect(scene).toHaveAttribute("data-route-length", "2");
    await page.screenshot({ path: path.join(sequentialScreenshotRoot, `043-${testInfo.project.name}.png`) });
    const finish = point(81, 64);
    await page.mouse.move(finish.x, finish.y, { steps: 7 });
    await page.mouse.up();
  }

  await expect(scene).toHaveAttribute("data-route-state", "complete");
  await expect(scene).toHaveAttribute("data-route-length", "3");
  await expect(scene).toHaveAttribute("data-visible-bands", "2");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 044 moves a transparent focus lens instead of activating the visible decimal orbit", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 044 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 43;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-044");
  const orbit = scene.getByRole("button", { name: "Misaligned decimal orbit" });
  const lens = scene.getByRole("button", { name: "Transparent focus lens" });
  const target = scene.getByTestId("focus-orbit-target");
  await expect(scene).toHaveAttribute("data-spatial-model", "lens-over-ghost-decimal");
  await expect(scene).toHaveAttribute("data-ghost-layers", "3");
  await expect(scene).toHaveAttribute("data-orbit-visibility", "visible");
  await expect(scene).toHaveAttribute("data-local-clarity", "blurred");
  await expect(page.getByText("Focus Orbit")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "focus-orbit scene overlaps protected game content").toBe(false);
  }

  for (let click = 0; click < 4; click += 1) await orbit.click();
  await expect(scene).toHaveAttribute("data-orbit-ripples", "4");
  await expect(scene).toHaveAttribute("data-lens-position", "18,75");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const dragTo = async (targetPoint: { x: number; y: number }) => {
    const box = (await lens.boundingBox())!;
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(targetPoint.x, targetPoint.y, { steps: 8 });
    await page.mouse.up();
  };

  const firstLensBox = (await lens.boundingBox())!;
  const firstCenter = { x: firstLensBox.x + firstLensBox.width / 2, y: firstLensBox.y + firstLensBox.height / 2 };
  await dragTo({ x: firstCenter.x + 10, y: firstCenter.y + 4 });
  await expect(scene).toHaveAttribute("data-local-clarity", "blurred");
  await expect(scene).toHaveAttribute("data-lens-position", "18,75");

  await dragTo({ x: puzzleBox.x + puzzleBox.width * .4, y: puzzleBox.y + puzzleBox.height * .72 });
  await expect(scene).toHaveAttribute("data-local-clarity", "clear");
  await expect(scene).toHaveAttribute("data-last-feedback", "miss");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `044-${testInfo.project.name}.png`) });

  const targetBox = (await target.boundingBox())!;
  await dragTo({ x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 });
  await expect(scene).toHaveAttribute("data-lens-position", "74,38");
  await expect(scene).toHaveAttribute("data-ghost-state", "aligned");
  await expect(scene).toHaveAttribute("data-last-feedback", "snapped");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 045 transfers clarity through stacked tracing sheets from deepest to front", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 045 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 44;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-045");
  const lens = scene.getByRole("button", { name: "Tracing focus lens" });
  const layers = [0, 1, 2, 3].map((index) => scene.getByTestId(`focus-cascade-layer-${index}`));
  await expect(scene).toHaveAttribute("data-spatial-model", "stacked-clarity-transfer");
  await expect(scene).toHaveAttribute("data-layer-count", "4");
  await expect(scene).toHaveAttribute("data-clarity-state", "blurred");
  await expect(page.getByText("Focus Cascade")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "focus-cascade scene overlaps protected game content").toBe(false);
  }

  for (const layer of layers) await layer.evaluate((element) => (element as HTMLElement).click());
  await expect(scene).toHaveAttribute("data-moves", "0");
  await expect(scene).toHaveAttribute("data-route-depth", "0");

  const moveLensTo = async (layer: Locator) => {
    const lensBox = (await lens.boundingBox())!;
    const layerBox = (await layer.boundingBox())!;
    const start = { x: lensBox.x + lensBox.width / 2, y: lensBox.y + lensBox.height / 2 };
    const finish = { x: layerBox.x + layerBox.width / 2, y: layerBox.y + layerBox.height / 2 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(finish.x, finish.y, { steps: 9 });
    await page.mouse.up();
  };

  for (const index of [3, 1, 2, 0]) await moveLensTo(layers[index]);
  await expect(scene).toHaveAttribute("data-route-depth", "2");
  await expect(scene).toHaveAttribute("data-clear-layers", "3,2");
  await expect(scene).toHaveAttribute("data-wrong-transfers", "2");
  await expect(scene).toHaveAttribute("data-last-feedback", "returned");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `045-${testInfo.project.name}.png`) });

  await moveLensTo(layers[1]);
  await moveLensTo(layers[0]);
  await expect(scene).toHaveAttribute("data-route-depth", "4");
  await expect(scene).toHaveAttribute("data-clear-layers", "3,2,1,0");
  await expect(scene).toHaveAttribute("data-clarity-state", "complete");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 046 hands off the light without pressing either paper palm", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 046 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 45;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-046");
  const leftPalm = scene.getByRole("button", { name: "Left paper hand" });
  const rightPalm = scene.getByRole("button", { name: "Right paper hand" });
  await expect(scene).toHaveAttribute("data-spatial-model", "paper-hands-shallow-bridge");
  await expect(scene).toHaveAttribute("data-channel-width", "48");
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await expect(page.getByText("Silent Handoff")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "silent-handoff scene overlaps protected game content").toBe(false);
  }
  for (const palm of [leftPalm, rightPalm]) {
    const box = (await palm.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await palm.click();
  }
  await expect(scene).toHaveAttribute("data-palm-presses", "2");
  await expect(scene).toHaveAttribute("data-hands-state", "retracted");
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const route = [
    { x: 24, y: 66 },
    { x: 36, y: 46 },
    { x: 50, y: 35 },
    { x: 64, y: 46 },
    { x: 76, y: 66 },
  ].map((point) => ({
    x: puzzleBox.x + puzzleBox.width * point.x / 100,
    y: puzzleBox.y + puzzleBox.height * point.y / 100,
  }));

  await page.mouse.move(route[0].x, route[0].y);
  await page.mouse.down();
  await page.mouse.move(route[1].x, route[1].y, { steps: 4 });
  await page.mouse.move(route[2].x, route[2].y, { steps: 4 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await page.mouse.move(route[2].x, route[2].y);
  await page.mouse.down();
  await page.mouse.move(route[3].x, route[3].y, { steps: 4 });
  await page.mouse.move(route[4].x, route[4].y, { steps: 4 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.mouse.move(route[0].x, route[0].y);
  if (testInfo.project.name === "mobile-390") await page.mouse.down();
  await page.mouse.move(route[1].x, route[1].y, { steps: 5 });
  await page.mouse.move(route[2].x, route[2].y, { steps: 5 });
  await expect(scene).toHaveAttribute("data-route-progress", "2");
  await expect(scene).toHaveAttribute("data-colored-segments", "2");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `046-${testInfo.project.name}.png`) });
  await page.mouse.move(route[3].x, route[3].y, { steps: 5 });
  await page.mouse.move(route[4].x, route[4].y, { steps: 5 });
  if (testInfo.project.name === "mobile-390") await page.mouse.up();

  await expect(scene).toHaveAttribute("data-route-progress", "4");
  await expect(scene).toHaveAttribute("data-colored-segments", "4");
  await expect(scene).toHaveAttribute("data-hands-state", "received");
  await expect(scene).toHaveAttribute("data-input-mode", testInfo.project.name === "mobile-390" ? "held-trail" : "hover");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 047 waits for still water before pressing the paper stone shadow", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 047 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 46;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-047");
  const stone = scene.getByRole("button", { name: "Floating paper stone" });
  const shadow = scene.getByRole("button", { name: "Paper stone shadow" });
  await expect(scene).toHaveAttribute("data-spatial-model", "floating-stone-ripple-shadow");
  await expect(scene).toHaveAttribute("data-ripple-state", "moving");
  await expect(scene).toHaveAttribute("data-shadow-state", "soft");
  await expect(page.getByText("Deep Pressure")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "deep-pressure scene overlaps protected game content").toBe(false);
  }
  for (const target of [stone, shadow]) {
    const box = (await target.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  await stone.dispatchEvent("pointerdown", { pointerId: 47, pointerType: "touch", bubbles: true });
  await expect(scene).toHaveAttribute("data-direct-presses", "1");
  await expect(scene).toHaveAttribute("data-stone-state", "raised");
  await expect(scene).toHaveAttribute("data-ripple-state", "disturbed");
  await shadow.dispatchEvent("pointerdown", { pointerId: 48, pointerType: "touch", bubbles: true });
  await shadow.dispatchEvent("pointerup", { pointerId: 48, pointerType: "touch", bubbles: true });
  await expect(scene).toHaveAttribute("data-input-mode", "early-shadow");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.waitForTimeout(650);
  await page.mouse.move(puzzleBox.x + 20, puzzleBox.y + 20);
  await page.waitForTimeout(750);
  await expect(scene).toHaveAttribute("data-ripple-state", "still");
  await expect(scene).toHaveAttribute("data-shadow-state", "stable");

  const shadowBox = (await shadow.boundingBox())!;
  await page.mouse.move(shadowBox.x + shadowBox.width / 2, shadowBox.y + shadowBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await expect(scene).toHaveAttribute("data-hold-state", "holding");
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-hold-state", "released-early");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `047-${testInfo.project.name}.png`) });
  await page.waitForTimeout(600);
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const retryShadowBox = (await shadow.boundingBox())!;
  await page.mouse.move(retryShadowBox.x + retryShadowBox.width / 2, retryShadowBox.y + retryShadowBox.height / 2);
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest("[data-deep-pressure-shadow]")), {
    x: retryShadowBox.x + retryShadowBox.width / 2,
    y: retryShadowBox.y + retryShadowBox.height / 2,
  })).toBe(true);
  await page.mouse.down();
  await page.waitForTimeout(950);
  await expect(scene).toHaveAttribute("data-hold-state", "complete");
  await expect(scene).toHaveAttribute("data-stone-state", "sunk");
  await page.mouse.up();
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 048 freezes five moving word strips by holding the fixed blank", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 048 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 47;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-048");
  const strips = scene.getByRole("button", { name: /Word strip/ });
  const blank = scene.getByRole("button", { name: "Fixed blank" });
  await expect(scene).toHaveAttribute("data-spatial-model", "moving-word-strips-fixed-blank");
  await expect(scene).toHaveAttribute("data-strip-count", "5");
  await expect(scene).toHaveAttribute("data-word-state", "fragments");
  await expect(page.getByText("Pause Word")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "pause-word scene overlaps protected game content").toBe(false);
  }
  expect(await strips.count()).toBe(5);
  const blankBox = (await blank.boundingBox())!;
  expect(blankBox.width).toBeGreaterThanOrEqual(44);
  expect(blankBox.height).toBeGreaterThanOrEqual(44);

  for (let index = 0; index < 5; index += 1) {
    await strips.nth(index).dispatchEvent("pointerdown", { pointerId: 60 + index, pointerType: "touch", bubbles: true });
  }
  await expect(scene).toHaveAttribute("data-strip-presses", "5");
  await expect(scene).toHaveAttribute("data-strip-state", "accelerated");
  await expect(scene).toHaveAttribute("data-word-state", "fragments");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.mouse.move(blankBox.x + blankBox.width / 2, blankBox.y + blankBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await expect(scene).toHaveAttribute("data-blank-state", "pressed");
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-blank-state", "released-early");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `048-${testInfo.project.name}.png`) });
  await page.waitForTimeout(400);
  await expect(scene).toHaveAttribute("data-word-state", "fragments");

  const retryBlankBox = (await blank.boundingBox())!;
  await page.mouse.move(retryBlankBox.x + retryBlankBox.width / 2, retryBlankBox.y + retryBlankBox.height / 2);
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="Fixed blank"]')), {
    x: retryBlankBox.x + retryBlankBox.width / 2,
    y: retryBlankBox.y + retryBlankBox.height / 2,
  })).toBe(true);
  await page.mouse.down();
  await page.waitForTimeout(650);
  await expect(scene).toHaveAttribute("data-blank-state", "complete");
  await expect(scene).toHaveAttribute("data-strip-state", "aligned");
  await expect(scene).toHaveAttribute("data-word-state", "pause");
  await page.mouse.up();
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 049 closes one broad continuous curve through five engraved points", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 049 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 48;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-049");
  const canvas = scene.getByRole("application", { name: "Five-point paper fiber" });
  await expect(scene).toHaveAttribute("data-spatial-model", "five-engraved-points-open-loop");
  await expect(scene).toHaveAttribute("data-point-count", "5");
  await expect(scene).toHaveAttribute("data-camera-route", "optional");
  await expect(scene).toHaveAttribute("data-tolerance", "16");
  await expect(page.getByText("Ten-Thousand Glyph")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "ten-thousand-glyph scene overlaps protected game content").toBe(false);
  }

  const canvasBox = (await canvas.boundingBox())!;
  const route = [
    { x: 28, y: 58 },
    { x: 35, y: 28 },
    { x: 62, y: 20 },
    { x: 78, y: 52 },
    { x: 58, y: 76 },
  ].map((point) => ({
    x: canvasBox.x + canvasBox.width * point.x / 100,
    y: canvasBox.y + canvasBox.height * point.y / 100,
  }));

  await page.mouse.move(route[2].x, route[2].y);
  await page.mouse.down();
  await page.mouse.move(route[3].x, route[3].y, { steps: 4 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await expect(scene).toHaveAttribute("data-breaks", "1");

  await page.mouse.move(route[0].x, route[0].y);
  await page.mouse.down();
  await page.mouse.move(route[1].x, route[1].y, { steps: 5 });
  await page.mouse.move(route[2].x, route[2].y, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await page.mouse.move(route[2].x, route[2].y);
  await page.mouse.down();
  await page.mouse.move(route[3].x, route[3].y, { steps: 4 });
  await page.mouse.move(route[4].x, route[4].y, { steps: 4 });
  await page.mouse.move(route[0].x, route[0].y, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-closed", "false");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.mouse.move(route[0].x, route[0].y);
  await page.mouse.down();
  for (const point of route.slice(1)) await page.mouse.move(point.x, point.y, { steps: 6 });
  await expect(scene).toHaveAttribute("data-route-progress", "5");
  await expect(scene).toHaveAttribute("data-inked-points", "0,1,2,3,4");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `049-${testInfo.project.name}.png`) });
  await page.mouse.move(route[0].x, route[0].y, { steps: 7 });
  await expect(scene).toHaveAttribute("data-closed", "true");
  await page.mouse.up();
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 050 mirrors two language bands into one shared sentence ending", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 050 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 49;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-050");
  const english = scene.getByRole("button", { name: "English sentence punctuation" });
  const chinese = scene.getByRole("button", { name: "Chinese sentence punctuation" });
  await expect(scene).toHaveAttribute("data-spatial-model", "bilingual-mirrored-sentence-bands");
  await expect(scene).toHaveAttribute("data-band-count", "2");
  await expect(scene).toHaveAttribute("data-shared-slot", "open");
  await expect(scene.locator("[data-testid^='mirrored-input-band-']")).toHaveCount(2);
  await expect(scene.locator("[data-testid^='mirrored-input-direction-']")).toHaveCount(2);
  await expect(scene.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByText("Mirrored Input")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "mirrored-input scene overlaps protected game content").toBe(false);
  }
  const englishBox = (await english.boundingBox())!;
  const chineseBox = (await chinese.boundingBox())!;
  expect(englishBox.height).toBeGreaterThanOrEqual(44);
  expect(chineseBox.height).toBeGreaterThanOrEqual(44);

  await english.evaluate((element: HTMLButtonElement) => element.click());
  await chinese.evaluate((element: HTMLButtonElement) => element.click());
  await expect(scene).toHaveAttribute("data-mirror-offset", "-2");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const start = {
    x: puzzleBox.x + 32,
    y: puzzleBox.y + puzzleBox.height * .43,
  };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="English sentence punctuation"]')), start)).toBe(true);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 150, start.y, { steps: 8 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-mirror-offset", "1");
  await expect(scene).toHaveAttribute("data-en-ending", "correct");
  await expect(scene).toHaveAttribute("data-zh-ending", "wrong");
  await expect(scene).toHaveAttribute("data-shared-slot", "open");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `050-${testInfo.project.name}.png`) });

  const movedEnglishBox = (await english.boundingBox())!;
  const movedStart = {
    x: movedEnglishBox.x + 24,
    y: movedEnglishBox.y + movedEnglishBox.height * .28,
  };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="English sentence punctuation"]')), movedStart)).toBe(true);
  await page.mouse.move(movedStart.x, movedStart.y);
  await page.mouse.down();
  await page.mouse.move(movedStart.x - 50, movedStart.y, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-mirror-offset", "0");
  await expect(scene).toHaveAttribute("data-en-ending", "correct");
  await expect(scene).toHaveAttribute("data-zh-ending", "correct");
  await expect(scene).toHaveAttribute("data-shared-slot", "filled");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 051 unfolds the thick READY tile into STEADY", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 051 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 50;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-051");
  const left = scene.getByRole("button", { name: "Left leaf of thick R tile" });
  const right = scene.getByRole("button", { name: "Right leaf of thick R tile" });
  await expect(scene).toHaveAttribute("data-spatial-model", "thick-double-leaf-ready-type");
  await expect(scene).toHaveAttribute("data-visible-word", "READY");
  await expect(scene).toHaveAttribute("data-motion", "shaking");
  await expect(scene.getByTestId("ready-code-seam-051")).toBeVisible();
  await expect(scene.locator("[data-testid^='ready-code-static-tile-']")).toHaveCount(4);
  await expect(page.getByText("Ready, Then Steady")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "ready-code scene overlaps protected game content").toBe(false);
  }
  const initialLeftBox = (await left.boundingBox())!;
  const initialRightBox = (await right.boundingBox())!;
  expect(initialLeftBox.width).toBeGreaterThanOrEqual(44);
  expect(initialLeftBox.height).toBeGreaterThanOrEqual(44);
  expect(initialRightBox.width).toBeGreaterThanOrEqual(44);
  expect(initialRightBox.height).toBeGreaterThanOrEqual(44);

  await left.evaluate((element: HTMLButtonElement) => element.click());
  await right.evaluate((element: HTMLButtonElement) => element.click());
  await expect(scene).toHaveAttribute("data-visible-word", "READY");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const inwardStart = {
    x: initialLeftBox.x + initialLeftBox.width / 2,
    y: initialLeftBox.y + initialLeftBox.height / 2,
  };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="Left leaf of thick R tile"]')), inwardStart)).toBe(true);
  await page.mouse.move(inwardStart.x, inwardStart.y);
  await page.mouse.down();
  await page.mouse.move(inwardStart.x + 60, inwardStart.y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-left-leaf", "closed");
  await expect(scene).toHaveAttribute("data-rebounds", "1");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const leftBox = (await left.boundingBox())!;
  const leftStart = { x: leftBox.x + leftBox.width / 2, y: leftBox.y + leftBox.height / 2 };
  await page.mouse.move(leftStart.x, leftStart.y);
  await page.mouse.down();
  await page.mouse.move(leftStart.x - 60, leftStart.y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-left-leaf", "open");
  await expect(scene).toHaveAttribute("data-right-leaf", "closed");
  await expect(scene).toHaveAttribute("data-visible-word", "S·EADY");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `051-${testInfo.project.name}.png`) });

  const rightBox = (await right.boundingBox())!;
  const rightStart = { x: rightBox.x + rightBox.width / 2, y: rightBox.y + rightBox.height / 2 };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="Right leaf of thick R tile"]')), rightStart)).toBe(true);
  await page.mouse.move(rightStart.x, rightStart.y);
  await page.mouse.down();
  await page.mouse.move(rightStart.x + 60, rightStart.y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-left-leaf", "open");
  await expect(scene).toHaveAttribute("data-right-leaf", "open");
  await expect(scene).toHaveAttribute("data-visible-word", "STEADY");
  await expect(scene).toHaveAttribute("data-motion", "still");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 052 bends one paper command so its back rewrites RUSH as HUSH", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 052 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 51;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-052");
  const crease = scene.getByRole("button", { name: "Command strip crease" });
  await expect(scene).toHaveAttribute("data-spatial-model", "single-command-strip-backside-rewrite");
  await expect(scene).toHaveAttribute("data-visible-command", "RUSH");
  await expect(scene).toHaveAttribute("data-fold-progress", "0");
  await expect(scene.getByTestId("bend-command-crease-052")).toBeVisible();
  await expect(scene.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByText("Bend Command")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "bend-command scene overlaps protected game content").toBe(false);
  }
  const creaseBox = (await crease.boundingBox())!;
  expect(creaseBox.width).toBeGreaterThanOrEqual(44);
  expect(creaseBox.height).toBeGreaterThanOrEqual(44);
  const center = { x: creaseBox.x + creaseBox.width / 2, y: creaseBox.y + creaseBox.height / 2 };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="Command strip crease"]')), center)).toBe(true);

  await crease.evaluate((element: HTMLButtonElement) => element.click());
  await expect(scene).toHaveAttribute("data-visible-command", "RUSH");
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 70, center.y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-rebounds", "1");
  await expect(scene).toHaveAttribute("data-fold-progress", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x, center.y - 30, { steps: 5 });
  await expect(scene).toHaveAttribute("data-fold-progress", "50");
  await expect(scene).toHaveAttribute("data-letter-state", "transition");
  await expect(scene.getByTestId("bend-command-back-052")).toHaveAttribute("data-visible", "true");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `052-${testInfo.project.name}.png`) });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-visible-command", "RUSH");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 4, center.y - 60, { steps: 7 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-fold-progress", "100");
  await expect(scene).toHaveAttribute("data-visible-command", "HUSH");
  await expect(scene).toHaveAttribute("data-letter-state", "quiet");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 053 joins two contrary bilingual rings with their one shared paper axle", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 053 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 52;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-053");
  const outer = scene.getByRole("button", { name: "Outer SLOW paper ring" });
  const inner = scene.getByRole("button", { name: "Inner slow paper ring" });
  const pin = scene.getByRole("button", { name: "Loose paper axle pin" });
  await expect(scene).toHaveAttribute("data-spatial-model", "counter-rotating-bilingual-rings-shared-axle");
  await expect(scene).toHaveAttribute("data-motion", "opposed");
  await expect(scene).toHaveAttribute("data-pin-state", "loose");
  await expect(scene.getByTestId("override-shared-axle-053")).toBeVisible();
  await expect(scene.locator("[data-testid^='override-ring-direction-']")).toHaveCount(2);
  await expect(page.getByText("Bilingual Override")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "bilingual override scene overlaps protected game content").toBe(false);
  }

  for (const control of [outer, inner, pin]) {
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const drag = async (
    start: { x: number; y: number },
    end: { x: number; y: number },
    beforeRelease?: () => Promise<void>,
  ) => {
    if (testInfo.project.name !== "mobile-390") {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 8 });
      if (beforeRelease) await beforeRelease();
      await page.mouse.up();
      return;
    }
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await page.waitForTimeout(20);
      for (let step = 1; step <= 8; step += 1) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{
            x: start.x + (end.x - start.x) * step / 8,
            y: start.y + (end.y - start.y) * step / 8,
          }],
        });
        await page.waitForTimeout(12);
      }
      if (beforeRelease) await beforeRelease();
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    } finally {
      await session.detach();
    }
  };

  await outer.evaluate((element: HTMLButtonElement) => element.click());
  await inner.evaluate((element: HTMLButtonElement) => element.click());
  await expect(scene).toHaveAttribute("data-ring-transfers", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const outerStart = await findExposedPoint(outer);
  await drag(outerStart, { x: outerStart.x + 60, y: outerStart.y });
  await expect(scene).toHaveAttribute("data-ring-transfers", "1");
  await expect(scene).toHaveAttribute("data-speed-relation", "transferred");
  await expect(scene).toHaveAttribute("data-motion", "opposed");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const pinBox = (await pin.boundingBox())!;
  const pinStart = { x: pinBox.x + pinBox.width / 2, y: pinBox.y + pinBox.height / 2 };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="Loose paper axle pin"]')), pinStart)).toBe(true);
  const ringEdge = { x: puzzleBox.x + puzzleBox.width * .75, y: puzzleBox.y + puzzleBox.height * .5 };
  await drag(pinStart, ringEdge, async () => {
    await expect(scene).toHaveAttribute("data-pin-state", "tilted");
    await mkdir(sequentialScreenshotRoot, { recursive: true });
    await page.screenshot({ path: path.join(sequentialScreenshotRoot, `053-${testInfo.project.name}.png`) });
  });
  await expect(scene).toHaveAttribute("data-pin-state", "tilted");
  await expect(scene).toHaveAttribute("data-pin-x", "82");
  await expect(scene).toHaveAttribute("data-pin-y", "72");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.waitForTimeout(180);
  const resetPinBox = (await pin.boundingBox())!;
  const resetStart = { x: resetPinBox.x + resetPinBox.width / 2, y: resetPinBox.y + resetPinBox.height / 2 };
  const axle = { x: puzzleBox.x + puzzleBox.width / 2, y: puzzleBox.y + puzzleBox.height / 2 };
  await drag(resetStart, axle);
  await expect(scene).toHaveAttribute("data-pin-state", "locked");
  await expect(scene).toHaveAttribute("data-pin-x", "50");
  await expect(scene).toHaveAttribute("data-pin-y", "50");
  await expect(scene).toHaveAttribute("data-motion", "still");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 054 keeps the paper axle fixed while the loose ribbon makes one continuous orbit", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 054 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 53;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-054");
  const axle = scene.getByRole("button", { name: "Central pressable paper axle" });
  const ribbon = scene.getByRole("button", { name: "Loose ribbon end" });
  await expect(scene).toHaveAttribute("data-spatial-model", "held-axis-continuous-ribbon-orbit");
  await expect(scene).toHaveAttribute("data-axis-state", "free");
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await expect(scene.locator("[data-testid^='hybrid-orbit-segment-']")).toHaveCount(4);
  await expect(page.getByText("Hybrid Console")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "hybrid console scene overlaps protected game content").toBe(false);
  }
  for (const control of [axle, ribbon]) {
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const route = [
    { x: puzzleBox.x + puzzleBox.width * .5, y: puzzleBox.y + puzzleBox.height * .8 },
    { x: puzzleBox.x + puzzleBox.width * .2, y: puzzleBox.y + puzzleBox.height * .5 },
    { x: puzzleBox.x + puzzleBox.width * .5, y: puzzleBox.y + puzzleBox.height * .2 },
    { x: puzzleBox.x + puzzleBox.width * .8, y: puzzleBox.y + puzzleBox.height * .5 },
  ];
  const ribbonBox = (await ribbon.boundingBox())!;
  const ribbonStart = { x: ribbonBox.x + ribbonBox.width / 2, y: ribbonBox.y + ribbonBox.height / 2 };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="Loose ribbon end"]')), ribbonStart)).toBe(true);

  await page.mouse.move(ribbonStart.x, ribbonStart.y);
  await page.mouse.down();
  for (const point of route) await page.mouse.move(point.x, point.y, { steps: 4 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await expect(scene).toHaveAttribute("data-route-state", "rebounded");
  await expect(scene).toHaveAttribute("data-rebounds", "1");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await axle.focus();
  await page.keyboard.down("Space");
  await expect(scene).toHaveAttribute("data-axis-state", "held");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  const resetRibbonBox = (await ribbon.boundingBox())!;
  const resetRibbonStart = { x: resetRibbonBox.x + resetRibbonBox.width / 2, y: resetRibbonBox.y + resetRibbonBox.height / 2 };
  await page.mouse.move(resetRibbonStart.x, resetRibbonStart.y);
  await page.mouse.down();
  await page.mouse.move(route[0].x, route[0].y, { steps: 4 });
  await page.mouse.move(route[1].x, route[1].y, { steps: 4 });
  await expect(scene).toHaveAttribute("data-route-progress", "2");
  await expect(scene).toHaveAttribute("data-overlap-active", "true");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `054-${testInfo.project.name}.png`) });
  await page.mouse.move(route[2].x, route[2].y, { steps: 4 });
  await page.mouse.move(route[3].x, route[3].y, { steps: 4 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-route-progress", "4");
  await expect(scene).toHaveAttribute("data-route-state", "complete");
  await page.keyboard.up("Space");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 055 overlaps translucent nineteen until its separating shadow reads ten", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 055 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 54;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-055");
  const one = scene.getByRole("button", { name: "Translucent digit one" });
  const nine = scene.getByRole("button", { name: "Translucent digit nine" });
  await expect(scene).toHaveAttribute("data-spatial-model", "overlapping-nineteen-reveals-shadow-ten");
  await expect(scene).toHaveAttribute("data-front-distance", "40");
  await expect(scene).toHaveAttribute("data-shadow-state", "merged");
  await expect(scene.getByTestId("nineteen-shadow-one-055")).toBeVisible();
  await expect(scene.getByTestId("nineteen-shadow-zero-055")).toBeVisible();
  await expect(scene.locator("input, textarea, [contenteditable='true']")).toHaveCount(0);
  await expect(page.getByText("Nineteen Code")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "nineteen code scene overlaps protected game content").toBe(false);
  }
  for (const digit of [one, nine]) {
    const box = (await digit.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await digit.evaluate((element: HTMLButtonElement) => element.click());
  }
  await page.keyboard.type("1910");
  await expect(scene).toHaveAttribute("data-front-distance", "40");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  let oneBox = (await one.boundingBox())!;
  let oneCenter = { x: oneBox.x + oneBox.width / 2, y: oneBox.y + oneBox.height / 2 };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="Translucent digit one"]')), oneCenter)).toBe(true);
  await page.mouse.move(oneCenter.x, oneCenter.y);
  await page.mouse.down();
  await page.mouse.move(oneCenter.x - 45, oneCenter.y, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-front-legibility", "clear");
  await expect(scene).toHaveAttribute("data-shadow-state", "merged");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  oneBox = (await one.boundingBox())!;
  oneCenter = { x: oneBox.x + oneBox.width / 2, y: oneBox.y + oneBox.height / 2 };
  await page.mouse.move(oneCenter.x, oneCenter.y);
  await page.mouse.down();
  await page.mouse.move(oneCenter.x + 110, oneCenter.y, { steps: 8 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-shadow-state", "parting");
  await expect(scene).toHaveAttribute("data-front-legibility", "crowded");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `055-${testInfo.project.name}.png`) });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  oneBox = (await one.boundingBox())!;
  oneCenter = { x: oneBox.x + oneBox.width / 2, y: oneBox.y + oneBox.height / 2 };
  await page.mouse.move(oneCenter.x, oneCenter.y);
  await page.mouse.down();
  await page.mouse.move(oneCenter.x + 42, oneCenter.y, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-shadow-state", "clear-10");
  await expect(scene).toHaveAttribute("data-front-legibility", "obscured");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 056 turns one loose ink speck into the decimal that makes 10.00", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 056 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 55;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-056");
  const dot = scene.getByRole("button", { name: "Small ink speck below the strip" });
  await expect(scene).toHaveAttribute("data-spatial-model", "loose-speck-becomes-decimal-in-number-strip");
  await expect(scene).toHaveAttribute("data-dot-state", "loose");
  await expect(scene).toHaveAttribute("data-display-preview", "none");
  await expect(scene.locator("[data-testid^='hundred-digit-']")).toHaveCount(4);
  await expect(scene.locator("[data-testid^='hundred-gap-']")).toHaveCount(4);
  await expect(scene.locator("input, textarea, [contenteditable='true']")).toHaveCount(0);
  await expect(page.getByText("Hundred Code")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "hundred code scene overlaps protected game content").toBe(false);
  }
  const dotBox = (await dot.boundingBox())!;
  expect(dotBox.width).toBeGreaterThanOrEqual(44);
  expect(dotBox.height).toBeGreaterThanOrEqual(44);
  const dotStart = { x: dotBox.x + dotBox.width / 2, y: dotBox.y + dotBox.height / 2 };
  expect(await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('button[aria-label="Small ink speck below the strip"]')), dotStart)).toBe(true);
  await dot.evaluate((element: HTMLButtonElement) => element.click());
  await page.keyboard.type("100010");
  await expect(scene).toHaveAttribute("data-selected-gap", "none");

  const gaps = [36, 50, 64, 78].map((x) => ({ x: puzzleBox.x + puzzleBox.width * x / 100, y: puzzleBox.y + puzzleBox.height * .45 }));
  await page.mouse.move(dotStart.x, dotStart.y);
  await page.mouse.down();
  await page.mouse.move(gaps[0].x, gaps[0].y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-selected-gap", "0");
  await expect(scene).toHaveAttribute("data-display-preview", "1.000");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await expect.poll(async () => {
    const settledDot = (await dot.boundingBox())!;
    return Math.abs(settledDot.x + settledDot.width / 2 - gaps[0].x);
  }).toBeLessThan(2);

  let currentDotBox = (await dot.boundingBox())!;
  let currentDot = { x: currentDotBox.x + currentDotBox.width / 2, y: currentDotBox.y + currentDotBox.height / 2 };
  await page.mouse.move(currentDot.x, currentDot.y);
  await page.mouse.down();
  await page.mouse.move(gaps[2].x, gaps[2].y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-selected-gap", "2");
  await expect(scene).toHaveAttribute("data-display-preview", "100.0");
  await expect.poll(async () => {
    const settledDot = (await dot.boundingBox())!;
    return Math.abs(settledDot.x + settledDot.width / 2 - gaps[2].x);
  }).toBeLessThan(2);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `056-${testInfo.project.name}.png`) });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  currentDotBox = (await dot.boundingBox())!;
  currentDot = { x: currentDotBox.x + currentDotBox.width / 2, y: currentDotBox.y + currentDotBox.height / 2 };
  await page.mouse.move(currentDot.x, currentDot.y);
  await page.mouse.down();
  await page.mouse.move(gaps[1].x, gaps[1].y, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-selected-gap", "1");
  await expect(scene).toHaveAttribute("data-dot-state", "placed");
  await expect(scene).toHaveAttribute("data-display-preview", "10.00");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 057 aligns five bit shadows by moving their one shared light", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 057 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 56;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-057");
  const light = scene.getByRole("button", { name: "Shared light above the paper slot" });
  await expect(scene).toHaveAttribute("data-spatial-model", "shared-light-aligns-palindromic-bit-shadows");
  await expect(scene).toHaveAttribute("data-face-sequence", "10110");
  await expect(scene).toHaveAttribute("data-composite-sequence", "scrambled");
  await expect(scene.locator("[data-testid^='five-bit-face-']")).toHaveCount(5);
  await expect(scene.locator("[data-testid^='five-bit-shadow-']")).toHaveCount(5);
  await expect(page.getByText("Five-Bit Latch")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "five bit latch scene overlaps protected game content").toBe(false);
  }

  const lightBox = (await light.boundingBox())!;
  expect(lightBox.width).toBeGreaterThanOrEqual(44);
  expect(lightBox.height).toBeGreaterThanOrEqual(44);
  for (const chip of await scene.getByRole("button", { name: /Bit tile/ }).all()) await chip.click();
  await expect(scene).toHaveAttribute("data-chip-feedback", "sprung-back");
  await expect(scene).toHaveAttribute("data-latched-pairs", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  let currentLightBox = (await light.boundingBox())!;
  let currentLight = { x: currentLightBox.x + currentLightBox.width / 2, y: currentLightBox.y + currentLightBox.height / 2 };
  await page.mouse.move(currentLight.x, currentLight.y);
  await page.mouse.down();
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .78, currentLight.y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-light-state", "right-offset");
  await expect(scene).toHaveAttribute("data-composite-sequence", "scrambled");
  await page.waitForTimeout(120);

  currentLightBox = (await light.boundingBox())!;
  currentLight = { x: currentLightBox.x + currentLightBox.width / 2, y: currentLightBox.y + currentLightBox.height / 2 };
  await page.mouse.move(currentLight.x, currentLight.y);
  await page.mouse.down();
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .42, currentLight.y, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-light-state", "near-center");
  await expect(scene).toHaveAttribute("data-latched-pairs", "1");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, `057-${testInfo.project.name}.png`) });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await page.waitForTimeout(120);

  currentLightBox = (await light.boundingBox())!;
  currentLight = { x: currentLightBox.x + currentLightBox.width / 2, y: currentLightBox.y + currentLightBox.height / 2 };
  await page.mouse.move(currentLight.x, currentLight.y);
  await page.mouse.down();
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .50, currentLight.y, { steps: 4 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-light-state", "centered");
  await expect(scene).toHaveAttribute("data-composite-sequence", "10101");
  await expect(scene).toHaveAttribute("data-slot-state", "closed");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 058 reveals the readable cipher by flipping one transparent strip", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 058 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 57;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-058");
  const corner = scene.getByRole("button", { name: "Folded corner of the transparent word strip" });
  await expect(scene).toHaveAttribute("data-spatial-model", "one-transparent-strip-flips-as-a-whole");
  await expect(scene).toHaveAttribute("data-front-order", "WOLS");
  await expect(scene).toHaveAttribute("data-rear-order", "SLOW");
  await expect(scene).toHaveAttribute("data-flip-state", "front");
  await expect(scene.locator("[data-testid^='cipher-glyph-']")).toHaveCount(4);
  await expect(scene.getByTestId("cipher-rear-shadow")).toBeVisible();
  await expect(scene.locator("input, textarea, [contenteditable='true']")).toHaveCount(0);
  await expect(page.getByText("Cipher Reversal")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "cipher reversal scene overlaps protected game content").toBe(false);
  }

  const cornerBox = (await corner.boundingBox())!;
  expect(cornerBox.width).toBeGreaterThanOrEqual(44);
  expect(cornerBox.height).toBeGreaterThanOrEqual(44);
  for (const glyph of await scene.getByRole("button", { name: /Transparent glyph/ }).all()) await glyph.click();
  await page.keyboard.type("slow");
  await expect(scene).toHaveAttribute("data-letter-offset", "none");
  await expect(scene).toHaveAttribute("data-flip-state", "front");

  const secondGlyph = scene.getByRole("button", { name: "Transparent glyph 2" });
  const glyphBox = (await secondGlyph.boundingBox())!;
  const glyphCenter = { x: glyphBox.x + glyphBox.width / 2, y: glyphBox.y + glyphBox.height / 2 };
  await page.mouse.move(glyphCenter.x, glyphCenter.y);
  await page.mouse.down();
  await page.mouse.move(glyphCenter.x + 38, glyphCenter.y + 14, { steps: 4 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-letter-offset", "disturbed");
  await expect(scene).toHaveAttribute("data-shadow-legibility", "worse");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  let currentCornerBox = (await corner.boundingBox())!;
  let currentCorner = { x: currentCornerBox.x + currentCornerBox.width / 2, y: currentCornerBox.y + currentCornerBox.height / 2 };
  await page.mouse.move(currentCorner.x, currentCorner.y);
  await page.mouse.down();
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .55, puzzleBox.y + puzzleBox.height * .52, { steps: 6 });
  await expect(scene).toHaveAttribute("data-flip-state", "half");
  await expect(scene).toHaveAttribute("data-reading-directions", "both");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "058-" + testInfo.project.name + ".png") });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-flip-state", "front");

  currentCornerBox = (await corner.boundingBox())!;
  currentCorner = { x: currentCornerBox.x + currentCornerBox.width / 2, y: currentCornerBox.y + currentCornerBox.height / 2 };
  await page.mouse.move(currentCorner.x, currentCorner.y);
  await page.mouse.down();
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .18, puzzleBox.y + puzzleBox.height * .55, { steps: 7 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-flip-state", "back");
  await expect(scene).toHaveAttribute("data-visible-order", "SLOW");
  await expect(scene).toHaveAttribute("data-reading-directions", "rear-forward");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 059 joins two, three, and five tick arcs into one complete clock cycle", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 059 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 58;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-059");
  await expect(scene).toHaveAttribute("data-spatial-model", "three-arcs-cover-one-ten-tick-cycle");
  await expect(scene).toHaveAttribute("data-arc-lengths", "2,3,5");
  await expect(scene).toHaveAttribute("data-arc-starts", "0,4,8");
  await expect(scene.locator("[data-testid^='clock-sum-arc-']")).toHaveCount(3);
  await expect(scene.locator("[data-testid^='clock-sum-tick-']")).toHaveCount(10);
  await expect(scene.getByTestId("clock-sum-center")).toHaveText("10");
  await expect(page.getByText("Clockface Sum")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  const protectedBoxes = await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ]);
  for (const protectedBox of protectedBoxes) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "clockface sum scene overlaps protected game content").toBe(false);
  }

  const arcs = scene.getByRole("button", { name: /-tick arc strip/ });
  await expect(arcs).toHaveCount(3);
  for (const arc of await arcs.all()) {
    const box = (await arc.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await arc.click();
  }
  await expect(scene).toHaveAttribute("data-arc-starts", "0,4,8");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const pointForTick = (tick: number) => {
    const angle = (tick * 36 - 90) * Math.PI / 180;
    const radius = Math.min(puzzleBox.width, puzzleBox.height) * .40;
    return {
      x: puzzleBox.x + puzzleBox.width / 2 + Math.cos(angle) * radius,
      y: puzzleBox.y + puzzleBox.height / 2 + Math.sin(angle) * radius,
    };
  };
  const dragArcTo = async (arc: Locator, tick: number) => {
    const box = (await arc.boundingBox())!;
    const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const target = pointForTick(tick);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 6 });
    await page.mouse.up();
  };

  await dragArcTo(scene.getByRole("button", { name: "3-tick arc strip" }), 0);
  await expect(scene).toHaveAttribute("data-arc-starts", "0,0,8");
  await expect(scene.getByTestId("clock-sum-tick-0")).toHaveAttribute("data-count", "3");
  await expect(scene).toHaveAttribute("data-coverage-state", "overlap-and-gaps");

  await dragArcTo(scene.getByRole("button", { name: "3-tick arc strip" }), 2);
  await expect(scene).toHaveAttribute("data-arc-starts", "0,2,8");
  await expect(scene).toHaveAttribute("data-coverage-state", "forming");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "059-" + testInfo.project.name + ".png") });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragArcTo(scene.getByRole("button", { name: "5-tick arc strip" }), 5);
  await expect(scene).toHaveAttribute("data-arc-starts", "0,2,5");
  await expect(scene).toHaveAttribute("data-coverage-state", "complete-cycle");
  await expect(scene).toHaveAttribute("data-merged-dots", "10");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 060 unties one printed ribbon by correcting its single over-under crossing", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 060 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 59;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-060");
  const leftEnd = scene.getByRole("button", { name: "Left free ribbon end" });
  await expect(scene).toHaveAttribute("data-spatial-model", "one-ribbon-one-wrong-over-under-crossing");
  await expect(scene).toHaveAttribute("data-knot-state", "crossed");
  await expect(scene).toHaveAttribute("data-reading-order", "fragmented");
  await expect(scene.locator("[data-testid^='cipher-knot-end-']")).toHaveCount(2);
  await expect(scene.getByTestId("cipher-knot-crossing")).toBeVisible();
  await expect(page.getByText("Cipher Knot")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "cipher knot scene overlaps protected game content").toBe(false);
  }
  for (const end of await scene.getByRole("button", { name: /free ribbon end/ }).all()) {
    const box = (await end.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await end.click();
  }
  await scene.getByTestId("cipher-knot-crossing").click();
  await page.keyboard.type("pause");
  await expect(scene).toHaveAttribute("data-knot-state", "crossed");

  let endBox = (await leftEnd.boundingBox())!;
  let start = { x: endBox.x + endBox.width / 2, y: endBox.y + endBox.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .50, puzzleBox.y + puzzleBox.height * .52, { steps: 4 });
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .80, puzzleBox.y + puzzleBox.height * .54, { steps: 4 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-crossing-layer", "wrong-over");
  await expect(scene).toHaveAttribute("data-reading-order", "shifting");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "060-" + testInfo.project.name + ".png") });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  endBox = (await leftEnd.boundingBox())!;
  start = { x: endBox.x + endBox.width / 2, y: endBox.y + endBox.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .50, puzzleBox.y + puzzleBox.height * .30, { steps: 5 });
  await page.mouse.move(puzzleBox.x + puzzleBox.width * .80, puzzleBox.y + puzzleBox.height * .74, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-knot-state", "untied");
  await expect(scene).toHaveAttribute("data-crossing-layer", "corrected");
  await expect(scene).toHaveAttribute("data-reading-order", "PAUSE");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 061 aligns an inverse cloud notch with the reversed ruler's only blank tick", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 061 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 60;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-061");
  const scanner = scene.getByRole("slider", { name: "Reversed ruler scan line" });
  await expect(scene).toHaveAttribute("data-spatial-model", "reversed-ruler-and-inverse-cloud-shadow");
  await expect(scene).toHaveAttribute("data-direction-relation", "hand-right-shadow-left");
  await expect(scene).toHaveAttribute("data-scan-position", "50");
  await expect(scene).toHaveAttribute("data-cloud-notch-position", "50");
  await expect(scene.locator("[data-testid^='reverse-sweep-tick-']")).toHaveCount(10);
  await expect(scene.locator("[data-missing='true']")).toHaveCount(1);
  await expect(page.getByText("Reverse Sweep")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "reverse sweep scene overlaps protected game content").toBe(false);
  }
  const scannerBox = (await scanner.boundingBox())!;
  expect(scannerBox.width).toBeGreaterThanOrEqual(44);
  expect(scannerBox.height).toBeGreaterThanOrEqual(44);
  await scanner.click();
  await page.keyboard.type("slow");
  await expect(scene).toHaveAttribute("data-alignment-state", "separated");

  const dragScannerTo = async (fraction: number) => {
    const box = (await scanner.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(puzzleBox.x + puzzleBox.width * fraction, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
  };

  await dragScannerTo(.30);
  await expect(scene).toHaveAttribute("data-scan-position", "30");
  await expect(scene).toHaveAttribute("data-cloud-notch-position", "70");
  await expect(scene).toHaveAttribute("data-alignment-state", "separated");
  await page.waitForTimeout(100);

  await dragScannerTo(.65);
  await expect(scene).toHaveAttribute("data-scan-position", "65");
  await expect(scene).toHaveAttribute("data-cloud-notch-position", "35");
  await expect(scene).toHaveAttribute("data-alignment-state", "approaching");
  await expect(scene).toHaveAttribute("data-warm-ticks", "1");
  await page.waitForTimeout(100);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "061-" + testInfo.project.name + ".png") });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragScannerTo(.72);
  await expect(scene).toHaveAttribute("data-scan-position", "72");
  await expect(scene).toHaveAttribute("data-cloud-notch-position", "28");
  await expect(scene).toHaveAttribute("data-alignment-state", "aligned");
  await expect(scene).toHaveAttribute("data-warm-ticks", "2");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 062 leaves a delayed paper echo in the well after the solid pointer moves away", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 062 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 61;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-062");
  const surface = scene.getByRole("application", { name: "Paper echo movement field" });
  await expect(scene).toHaveAttribute("data-spatial-model", "solid-pointer-delayed-paper-echo-and-shallow-well");
  await expect(scene).toHaveAttribute("data-solid-position", "22,68");
  await expect(scene).toHaveAttribute("data-echo-position", "14,75");
  await expect(scene).toHaveAttribute("data-target-state", "quiet");
  await expect(scene.getByTestId("pointer-echo-solid")).toBeVisible();
  await expect(scene.getByTestId("pointer-echo-ghost")).toBeVisible();
  await expect(scene.getByTestId("pointer-echo-target")).toBeVisible();
  await expect(scene.locator("[data-testid^='pointer-echo-trail-']")).toHaveCount(3);
  await expect(page.getByText("Pointer Echo")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const surfaceBox = (await surface.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  expect(surfaceBox.width).toBeGreaterThanOrEqual(44);
  expect(surfaceBox.height).toBeGreaterThanOrEqual(44);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "pointer echo scene overlaps protected game content").toBe(false);
  }
  await surface.click({ position: { x: surfaceBox.width * .22, y: surfaceBox.height * .68 } });
  await page.keyboard.type("echo");
  await expect(scene).toHaveAttribute("data-target-state", "quiet");

  const middle = { x: surfaceBox.x + surfaceBox.width * .45, y: surfaceBox.y + surfaceBox.height * .50 };
  await page.mouse.move(middle.x, middle.y, { steps: 4 });
  await expect(scene).toHaveAttribute("data-solid-position", "45,50");
  await expect(scene).toHaveAttribute("data-echo-position", "14,75");
  await expect(scene).toHaveAttribute("data-echo-position", "45,50", { timeout: 1_000 });

  const target = { x: surfaceBox.x + surfaceBox.width * .70, y: surfaceBox.y + surfaceBox.height * .38 };
  const away = { x: surfaceBox.x + surfaceBox.width * .90, y: surfaceBox.y + surfaceBox.height * .80 };
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 4 });
  await expect(scene).toHaveAttribute("data-solid-position", "70,38");
  await expect(scene).toHaveAttribute("data-target-state", "solid-rejected");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "062-" + testInfo.project.name + ".png") });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await page.mouse.move(away.x, away.y, { steps: 5 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-solid-position", "90,80");
  await expect(scene).toHaveAttribute("data-echo-position", "70,38", { timeout: 1_000 });
  await expect(scene).toHaveAttribute("data-target-state", "echo-accepted");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 063 carries one broken seam through four cut-matched paper corners", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 063 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 62;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-063");
  const head = scene.getByRole("button", { name: "Loose zigzag end" });
  await expect(scene).toHaveAttribute("data-spatial-model", "four-corner-cuts-turn-one-broken-zigzag");
  await expect(scene).toHaveAttribute("data-cut-orientation", "clockwise-forward-slash");
  await expect(scene).toHaveAttribute("data-route-stage", "0");
  await expect(scene.locator("[data-testid^='corner-zigzag-cut-']")).toHaveCount(4);
  await expect(scene.locator("[data-testid^='corner-zigzag-segment-']")).toHaveCount(4);
  await expect(page.getByText("Corner Zigzag")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "corner zigzag scene overlaps protected game content").toBe(false);
  }
  const firstHeadBox = (await head.boundingBox())!;
  expect(firstHeadBox.width).toBeGreaterThanOrEqual(48);
  expect(firstHeadBox.height).toBeGreaterThanOrEqual(48);
  await head.click();
  await expect(scene).toHaveAttribute("data-route-stage", "0");

  const dragHeadTo = async (x: number, y: number) => {
    const box = (await head.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(puzzleBox.x + puzzleBox.width * x, puzzleBox.y + puzzleBox.height * y, { steps: 5 });
    await page.mouse.up();
  };

  await dragHeadTo(.98, .5);
  await expect(scene).toHaveAttribute("data-route-stage", "0");
  await expect(scene).toHaveAttribute("data-last-edge", "right-rejected");

  await dragHeadTo(.18, .02);
  await expect(scene).toHaveAttribute("data-route-stage", "1");
  await expect(scene).toHaveAttribute("data-active-corner", "top-right");
  await page.waitForTimeout(170);
  await dragHeadTo(.5, .98);
  await expect(scene).toHaveAttribute("data-route-stage", "1");
  await expect(scene).toHaveAttribute("data-last-edge", "bottom-rejected");

  await dragHeadTo(.98, .18);
  await expect(scene).toHaveAttribute("data-route-stage", "2");
  await expect(scene).toHaveAttribute("data-kept-segments", "2");
  await page.waitForTimeout(170);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "063-" + testInfo.project.name + ".png") });
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragHeadTo(.82, .98);
  await expect(scene).toHaveAttribute("data-route-stage", "3");
  await page.waitForTimeout(170);
  await dragHeadTo(.02, .82);
  await expect(scene).toHaveAttribute("data-route-stage", "4");
  await expect(scene).toHaveAttribute("data-route-state", "closed");
  await expect(scene).toHaveAttribute("data-kept-segments", "4");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 064 flips the reverse face across a shared hinge into one loop", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 064 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 63;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-064");
  const leftBoard = scene.getByRole("button", { name: "Left hinged board" });
  const rightBoard = scene.getByRole("button", { name: "Right hinged board" });
  await expect(scene).toHaveAttribute("data-spatial-model", "two-board-shared-hinge-front-back-loop");
  await expect(scene).toHaveAttribute("data-flip-angle", "0");
  await expect(scene).toHaveAttribute("data-right-face", "front");
  await expect(scene).toHaveAttribute("data-ring-state", "same-direction-halves");
  await expect(scene.getByTestId("hinge-loop-axis")).toBeVisible();
  await expect(page.getByText("Hinge Loop")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "hinge loop scene overlaps protected game content").toBe(false);
  }
  const initialBoardBox = (await rightBoard.boundingBox())!;
  expect(initialBoardBox.width).toBeGreaterThanOrEqual(44);
  expect(initialBoardBox.height).toBeGreaterThanOrEqual(44);

  await leftBoard.click();
  await rightBoard.click();
  await expect(scene).toHaveAttribute("data-flip-angle", "0");

  const dragRightBoard = async (deltaX: number, release = true) => {
    const box = (await rightBoard.boundingBox())!;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + deltaX, center.y, { steps: 8 });
    if (release) await page.mouse.up();
  };

  await dragRightBoard(58);
  await expect(scene).toHaveAttribute("data-flip-angle", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragRightBoard(-30, false);
  await expect(scene).toHaveAttribute("data-right-face", "turning");
  await expect(scene).toHaveAttribute("data-ring-state", "growing-across-hinge");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "064-" + testInfo.project.name + ".png") });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-flip-angle", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragRightBoard(-70);
  await expect(scene).toHaveAttribute("data-flip-angle", "180");
  await expect(scene).toHaveAttribute("data-right-face", "back");
  await expect(scene).toHaveAttribute("data-ring-state", "complete-loop");
  await expect(scene).toHaveAttribute("data-input-mode", "pointer-hinge");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 065 follows stable shadows through five labels whose text and layout can change", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 065 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 64;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  let scene = page.getByTestId("v2-scene-065");
  await expect(scene).toHaveAttribute("data-layout-ready", "true");
  const firstOrder = await scene.getAttribute("data-route-order");
  await page.reload();
  scene = page.getByTestId("v2-scene-065");
  await expect(scene).toHaveAttribute("data-layout-ready", "true");
  const secondOrder = await scene.getAttribute("data-route-order");
  expect(secondOrder).not.toBe(firstOrder);

  await expect(scene).toHaveAttribute("data-spatial-model", "five-changing-labels-stable-shadow-route");
  await expect(scene.locator("[data-testid^='target-route-tab-']")).toHaveCount(5);
  await expect(scene.locator("[data-testid^='target-route-shadow-']")).toHaveCount(4);
  await expect(page.getByText("Target-Guided Route")).toHaveCount(0);
  await expect(page.getByText(/read the shadow/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "target-guided route scene overlaps protected game content").toBe(false);
  }
  for (const tab of await scene.locator("[data-testid^='target-route-tab-']").all()) {
    const box = (await tab.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }

  const labelsBefore = await scene.locator("[data-testid^='target-route-label-']").allTextContents();
  await page.waitForTimeout(850);
  expect(await scene.locator("[data-testid^='target-route-label-']").allTextContents()).not.toEqual(labelsBefore);

  const route = secondOrder!.split(",").map(Number);
  await scene.getByTestId(`target-route-tab-${route[0]}`).click();
  await expect(scene).toHaveAttribute("data-opened-tabs", "1");
  await expect(scene).toHaveAttribute("data-route-length", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const wrong = [0, 1, 2, 3, 4].find((index) => index !== route[0])!;
  await scene.getByTestId(`target-route-tab-${wrong}`).focus();
  await expect(scene).toHaveAttribute("data-route-state", "broken");
  await expect(scene).toHaveAttribute("data-dead-end-tab", String(wrong));

  for (let step = 0; step < route.length; step += 1) {
    await scene.getByTestId(`target-route-tab-${route[step]}`).focus();
    await expect(scene).toHaveAttribute("data-route-length", String(step + 1));
    await expect(scene.getByTestId(`target-route-tab-${route[step]}`)).toHaveAttribute("data-kept", "true");
    if (step === 1) {
      await mkdir(sequentialScreenshotRoot, { recursive: true });
      await page.screenshot({ path: path.join(sequentialScreenshotRoot, "065-" + testInfo.project.name + ".png") });
    }
  }
  await expect(scene).toHaveAttribute("data-route-state", "complete");
  await expect(scene).toHaveAttribute("data-terminal-outgoing", "none");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 066 releases four matched archive bands by lifting only the wrong central layer", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 066 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 65;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-066");
  const endpoints = scene.getByRole("button", { name: /Archive ribbon endpoint/ });
  const crossing = scene.getByRole("button", { name: "Upper paper strip at the central crossing" });
  await expect(scene).toHaveAttribute("data-spatial-model", "four-matched-bands-one-wrong-over-under-crossing");
  await expect(scene).toHaveAttribute("data-matched-endpoints", "4");
  await expect(scene).toHaveAttribute("data-crossing-order", "upper-wrong");
  await expect(endpoints).toHaveCount(4);
  await expect(scene.locator("[data-testid^='archive-knot-exit-']")).toHaveCount(4);
  await expect(scene.locator("[data-testid^='archive-knot-band-']")).toHaveCount(4);
  await expect(page.getByText("Archive Knot")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "archive knot scene overlaps protected game content").toBe(false);
  }
  for (const target of [await endpoints.nth(0).boundingBox(), await crossing.boundingBox()]) {
    expect(target).not.toBeNull();
    expect(target!.width).toBeGreaterThanOrEqual(44);
    expect(target!.height).toBeGreaterThanOrEqual(44);
  }

  await endpoints.nth(0).click();
  await crossing.click();
  await expect(scene).toHaveAttribute("data-endpoint-probes", "0");
  await expect(scene).toHaveAttribute("data-crossing-order", "upper-wrong");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const endpointBox = (await endpoints.nth(0).boundingBox())!;
  await page.mouse.move(endpointBox.x + endpointBox.width / 2, endpointBox.y + endpointBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(endpointBox.x + endpointBox.width / 2 + 42, endpointBox.y + endpointBox.height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-endpoint-probes", "1");
  await expect(scene).toHaveAttribute("data-matched-endpoints", "4");
  await expect(scene).toHaveAttribute("data-tension-state", "knotted");

  const liftOnce = async (distance: number, release = true) => {
    const box = (await crossing.boundingBox())!;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x + 3, center.y - distance, { steps: 6 });
    if (release) await page.mouse.up();
  };

  await liftOnce(16, false);
  await expect(scene).toHaveAttribute("data-crossing-state", "lifting");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "066-" + testInfo.project.name + ".png") });
  await page.mouse.up();
  await expect(scene).toHaveAttribute("data-crossing-state", "rebounded");
  await expect(scene).toHaveAttribute("data-tension-state", "knotted");

  await liftOnce(38);
  await expect(scene).toHaveAttribute("data-crossing-state", "swapped");
  await expect(scene).toHaveAttribute("data-crossing-order", "lower-correct");
  await expect(scene).toHaveAttribute("data-tension-state", "released");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 067 fills a translucent wheel gap only with the 120ms opposed echo", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 067 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 66;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-067");
  await expect(scene).toHaveAttribute("data-spatial-model", "paper-wheel-translucent-gap-opposed-delayed-echo");
  await expect(scene).toHaveAttribute("data-scroll-scope", "puzzle-only");
  await expect(scene.getByTestId("wheel-echo-gap")).toHaveAttribute("data-material", "translucent");
  await expect(scene.getByTestId("wheel-echo-solid")).toHaveAttribute("data-material", "solid");
  await expect(scene.getByTestId("wheel-echo-return")).toHaveAttribute("data-material", "translucent");
  await expect(page.getByText("Wheel Echo")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "wheel echo scene overlaps protected game content").toBe(false);
  }

  await scene.click();
  await expect(scene).toHaveAttribute("data-solid-angle", "120");
  const center = { x: puzzleBox.x + puzzleBox.width / 2, y: puzzleBox.y + puzzleBox.height / 2 };
  const swipeWheelOnPhone = async () => {
    const freshBox = (await scene.boundingBox())!;
    const x = Math.round(freshBox.x + freshBox.width / 2);
    const startY = Math.round(freshBox.y + freshBox.height / 2 + 15);
    const endY = startY - 30;
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: endY }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  };
  if (testInfo.project.name === "mobile-390") {
    await swipeWheelOnPhone();
    await expect(scene).toHaveAttribute("data-input-mode", "swipe");
  } else {
    await page.mouse.move(center.x, center.y);
    await page.mouse.wheel(0, 100);
    await expect(scene).toHaveAttribute("data-input-mode", "wheel");
  }
  await expect(scene).toHaveAttribute("data-solid-angle", testInfo.project.name === "mobile-390" ? "75" : "165");
  await expect(scene).toHaveAttribute("data-echo-state", "waiting");
  await expect(scene).toHaveAttribute("data-echo-state", "returned", { timeout: 1_000 });
  await expect(scene).toHaveAttribute("data-echo-angle", testInfo.project.name === "mobile-390" ? "165" : "75");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "067-" + testInfo.project.name + ".png") });

  if (testInfo.project.name === "mobile-390") {
    for (const expectedAngle of [30, 345]) {
      await swipeWheelOnPhone();
      await expect(scene).toHaveAttribute("data-solid-angle", String(expectedAngle));
    }
  } else {
    for (let turn = 0; turn < 2; turn += 1) await page.mouse.wheel(0, 100);
  }
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  if (testInfo.project.name === "mobile-390") await swipeWheelOnPhone();
  else await page.mouse.wheel(0, 100);
  await expect(scene).toHaveAttribute("data-solid-angle", "300");
  await expect(scene).toHaveAttribute("data-solid-state", "dispersed");
  await expect(scene).toHaveAttribute("data-gap-state", "echo-filled", { timeout: 1_000 });
  await expect(scene).toHaveAttribute("data-echo-state", "magnetic");
  await expect(scene).toHaveAttribute("data-echo-angle", "300");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 068 pulls a real backside arc into the gap with short counterclockwise rim sweeps", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 068 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 67;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-068");
  await expect(scene).toHaveAttribute("data-spatial-model", "broken-clock-rim-backside-arc");
  await expect(scene).toHaveAttribute("data-scroll-scope", "puzzle-only");
  await expect(scene.getByTestId("breach-gap-068")).toHaveAttribute("data-material", "translucent-cut");
  await expect(scene.getByTestId("breach-arc-068")).toHaveAttribute("data-material", "backside-paper");
  await expect(page.getByText("Counterclockwise Breach")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "counterclockwise breach scene overlaps protected game content").toBe(false);
  }

  const sweep = async (direction: "counterclockwise" | "clockwise") => {
    const freshBox = (await scene.boundingBox())!;
    const centerX = Math.round(freshBox.x + freshBox.width / 2);
    const y = Math.round(freshBox.y + freshBox.height / 2 - 80);
    const startX = centerX + (direction === "counterclockwise" ? 55 : -55);
    const endX = centerX + (direction === "counterclockwise" ? -55 : 55);
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: endX, y }] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(startX, y);
    await page.mouse.down();
    await page.mouse.move(endX, y, { steps: 8 });
    await page.mouse.up();
  };

  await scene.click();
  await expect(scene).toHaveAttribute("data-arc-stage", "0");
  await sweep("counterclockwise");
  await expect(scene).toHaveAttribute("data-arc-stage", "1");
  await expect(scene).toHaveAttribute("data-last-direction", "counterclockwise");
  await sweep("clockwise");
  await expect(scene).toHaveAttribute("data-arc-stage", "0");
  await expect(scene).toHaveAttribute("data-last-direction", "clockwise");
  await expect(scene).toHaveAttribute("data-retractions", "1");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await sweep("counterclockwise");
  await expect(scene).toHaveAttribute("data-arc-stage", "1");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "068-" + testInfo.project.name + ".png") });
  await sweep("counterclockwise");
  await expect(scene).toHaveAttribute("data-arc-stage", "2");
  await sweep("counterclockwise");
  await expect(scene).toHaveAttribute("data-arc-stage", "3");
  await expect(scene).toHaveAttribute("data-arc-layer", "front");
  await expect(scene).toHaveAttribute("data-gap-state", "sealed");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 069 requires one continuous two-lobe archive topology through the shared crossing", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 069 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 68;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-069");
  const canvas = page.getByTestId("archive-eight-canvas-069");
  await expect(scene).toHaveAttribute("data-spatial-model", "two-broken-stamp-lobes-one-crossing");
  await expect(scene.getByTestId("archive-eight-left-lobe")).toHaveAttribute("data-break", "open");
  await expect(scene.getByTestId("archive-eight-right-lobe")).toHaveAttribute("data-break", "open");
  await expect(scene.getByTestId("archive-eight-crossing")).toHaveAttribute("data-shared", "true");
  await expect(page.getByText("Archive Figure Eight")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "archive figure eight scene overlaps protected game content").toBe(false);
  }

  const trace = async (normalized: Array<[number, number]>) => {
    const box = (await canvas.boundingBox())!;
    const points = normalized.map(([x, y]) => ({
      x: Math.round(box.x + box.width * x / 100),
      y: Math.round(box.y + box.height * y / 100),
    }));
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [points[0]] });
      for (const point of points.slice(1)) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(points[0].x, points[0].y);
    await page.mouse.down();
    for (const point of points.slice(1)) await page.mouse.move(point.x, point.y, { steps: 3 });
    await page.mouse.up();
  };
  const leftLobe: Array<[number, number]> = [[50, 50], [32, 24], [12, 50], [32, 76], [50, 50]];
  const rightLobe: Array<[number, number]> = [[50, 50], [68, 24], [88, 50], [68, 76], [50, 50]];

  await trace(leftLobe);
  await expect(scene).toHaveAttribute("data-retained-lobes", "left");
  await expect(scene).toHaveAttribute("data-stroke-state", "broken");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "069-" + testInfo.project.name + ".png") });
  await trace(rightLobe);
  await expect(scene).toHaveAttribute("data-retained-lobes", "left,right");
  await expect(scene).toHaveAttribute("data-crossings", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await trace([...leftLobe, ...rightLobe.slice(1)]);
  await expect(scene).toHaveAttribute("data-crossings", "2");
  await expect(scene).toHaveAttribute("data-left-lobe", "closed");
  await expect(scene).toHaveAttribute("data-right-lobe", "closed");
  await expect(scene).toHaveAttribute("data-stroke-state", "sealed");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 070 joins one line through two staggered paper depths instead of merely aligning the gates", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 070 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 69;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-070");
  const front = page.getByTestId("twin-gate-front-sheet");
  await expect(scene).toHaveAttribute("data-spatial-model", "two-depth-gates-one-continuous-line");
  await expect(scene.getByTestId("twin-gate-front-sheet")).toHaveAttribute("data-depth", "front");
  await expect(scene.getByTestId("twin-gate-rear-sheet")).toHaveAttribute("data-depth", "rear");
  await expect(scene.getByTestId("twin-gate-opening-front")).toBeVisible();
  await expect(scene.getByTestId("twin-gate-opening-rear")).toBeVisible();
  await expect(page.getByText("Twin Gates")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "twin gates scene overlaps protected game content").toBe(false);
  }

  const dragFront = async (deltaX: number) => {
    const box = (await front.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const end = { x: start.x + deltaX, y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };

  await front.click();
  await expect(scene).toHaveAttribute("data-front-offset", "-64");
  await dragFront(64);
  await expect(scene).toHaveAttribute("data-front-offset", "0");
  await expect(scene).toHaveAttribute("data-depth-state", "flat-aligned");
  await expect(scene).toHaveAttribute("data-line-state", "one-gate-half-lit");
  await expect(scene).toHaveAttribute("data-gates-passed", "1");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "070-" + testInfo.project.name + ".png") });

  await dragFront(48);
  await expect(scene).toHaveAttribute("data-front-offset", "48");
  await expect(scene).toHaveAttribute("data-depth-state", "front-before-rear");
  await expect(scene).toHaveAttribute("data-line-state", "continuous-through-two-depths");
  await expect(scene).toHaveAttribute("data-gates-passed", "2");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 071 reveals that only the center dial can settle both one-way belts", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 071 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 70;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-071");
  const left = page.getByTestId("triple-dial-left");
  const center = page.getByTestId("triple-dial-center");
  await expect(scene).toHaveAttribute("data-spatial-model", "three-dials-two-one-way-belts-shared-center");
  await expect(scene.getByTestId("triple-dial-left")).toBeVisible();
  await expect(scene.getByTestId("triple-dial-center")).toBeVisible();
  await expect(scene.getByTestId("triple-dial-right")).toBeVisible();
  await expect(scene.getByTestId("triple-belt-left")).toBeVisible();
  await expect(scene.getByTestId("triple-belt-right")).toBeVisible();
  await expect(page.getByText("Triple Actuator")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "triple actuator scene overlaps protected game content").toBe(false);
  }

  const dragDial = async (dial: typeof left, deltaX: number) => {
    const box = (await dial.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const end = { x: start.x + deltaX, y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };

  await left.click();
  await expect(scene).toHaveAttribute("data-belt-state", "none");
  await dragDial(left, 30);
  await expect(scene).toHaveAttribute("data-belt-state", "left-only");
  await expect(scene).toHaveAttribute("data-right-angle", "330");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "071-" + testInfo.project.name + ".png") });

  await dragDial(left, -30);
  await dragDial(center, 60);
  await expect(scene).toHaveAttribute("data-left-angle", "90");
  await expect(scene).toHaveAttribute("data-right-angle", "270");
  await expect(scene).toHaveAttribute("data-left-groove", "seated");
  await expect(scene).toHaveAttribute("data-right-groove", "seated");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 072 cancels the shared glass oscillation only after positioning and quarter-turning the polarizer", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 072 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 71;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-072");
  const polarizer = page.getByTestId("glass-polarizer");
  const corner = page.getByTestId("glass-polarizer-corner");
  await expect(scene).toHaveAttribute("data-spatial-model", "two-glass-waves-one-cross-polarizer");
  await expect(scene.getByTestId("glass-sheet-left")).toBeVisible();
  await expect(scene.getByTestId("glass-sheet-right")).toBeVisible();
  await expect(scene.getByTestId("glass-double-shadow")).toBeVisible();
  await expect(polarizer).toBeVisible();
  await expect(corner).toBeVisible();
  await expect(page.getByText("Glass Relay Oscillator")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "glass relay scene overlaps protected game content").toBe(false);
  }

  const drag = async (target: typeof polarizer, deltaX: number, deltaY: number) => {
    const box = (await target.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const end = { x: start.x + deltaX, y: start.y + deltaY };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };

  await polarizer.click();
  await corner.click();
  await expect(scene).toHaveAttribute("data-overlap-state", "separate");
  await drag(corner, 0, 90);
  await expect(scene).toHaveAttribute("data-polarizer-angle", "90");
  await expect(scene).toHaveAttribute("data-wave-amplitude", "strong");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await drag(corner, 0, -90);
  await expect(scene).toHaveAttribute("data-polarizer-angle", "0");
  await drag(polarizer, 90, -55);
  await expect(scene).toHaveAttribute("data-overlap-state", "covered");
  await expect(scene).toHaveAttribute("data-wave-amplitude", "reduced");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "072-" + testInfo.project.name + ".png") });

  await drag(corner, 0, 90);
  await expect(scene).toHaveAttribute("data-polarizer-angle", "90");
  await expect(scene).toHaveAttribute("data-wave-amplitude", "zero");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 073 measures hidden pressure radii before matching identical stones to capacity wells", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 073 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 72;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-073");
  await expect(scene).toHaveAttribute("data-spatial-model", "equal-stones-hidden-pressure-radii-capacity-wells");
  await expect(scene.getByTestId("pressure-stone-0")).toBeVisible();
  await expect(scene.getByTestId("pressure-stone-1")).toBeVisible();
  await expect(scene.getByTestId("pressure-stone-2")).toBeVisible();
  await expect(scene.getByTestId("pressure-well-0")).toBeVisible();
  await expect(scene.getByTestId("pressure-well-1")).toBeVisible();
  await expect(scene.getByTestId("pressure-well-2")).toBeVisible();
  await expect(page.getByText("Beacon Vault")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "pressure vault scene overlaps protected game content").toBe(false);
  }

  const holdStone = async (stoneIndex: number) => {
    const stone = scene.getByTestId(`pressure-stone-${stoneIndex}`);
    const point = await findExposedPoint(stone);
    const probedPattern = new RegExp(`(?:^|,)${stoneIndex}(?:,|$)`);
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      await expect(scene).toHaveAttribute("data-probed-stones", probedPattern);
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await expect(scene).toHaveAttribute("data-probed-stones", probedPattern);
    await page.mouse.up();
  };
  const dragStoneToWell = async (stoneIndex: number, wellIndex: number) => {
    const stone = scene.getByTestId(`pressure-stone-${stoneIndex}`);
    const well = scene.getByTestId(`pressure-well-${wellIndex}`);
    const wellBox = (await well.boundingBox())!;
    const start = await findExposedPoint(stone);
    const end = { x: Math.round(wellBox.x + wellBox.width / 2), y: Math.round(wellBox.y + wellBox.height / 2) };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };

  await scene.getByTestId("pressure-stone-0").click();
  await expect(scene).toHaveAttribute("data-probed-stones", "none");
  await dragStoneToWell(0, 0);
  await expect(scene).toHaveAttribute("data-rejection", "unmeasured");
  await expect(scene).toHaveAttribute("data-matched-stones", "0");

  await holdStone(0);
  await expect(scene).toHaveAttribute("data-probed-stones", "0");
  await expect(scene.getByTestId("pressure-stone-0")).toHaveAttribute("data-pressure", "large");
  await dragStoneToWell(0, 0);
  await expect(scene.getByTestId("pressure-well-0")).toHaveAttribute("data-feedback", "bulge");
  await expect(scene).toHaveAttribute("data-matched-stones", "0");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "073-" + testInfo.project.name + ".png") });

  await dragStoneToWell(0, 1);
  await expect(scene).toHaveAttribute("data-matched-stones", "1");
  await holdStone(1);
  await dragStoneToWell(1, 2);
  await expect(scene).toHaveAttribute("data-matched-stones", "2");
  await holdStone(2);
  await dragStoneToWell(2, 0);
  await expect(scene).toHaveAttribute("data-matched-stones", "3");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 074 braids three incomplete sentence bands by their over-under-over edge grain", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 074 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 73;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-074");
  await expect(scene).toHaveAttribute("data-spatial-model", "three-sentence-bands-three-depths-over-under-over");
  await expect(scene).toHaveAttribute("data-edge-patterns", "up,down,up");
  for (let index = 0; index < 3; index += 1) {
    await expect(scene.getByTestId(`braid-band-${index}`)).toBeVisible();
    await expect(scene.getByTestId(`braid-edge-${index}`)).toBeVisible();
  }
  await expect(page.getByText("Clue Relay Braid")).toHaveCount(0);
  await expect(page.getByText("FOLLOW THE GAP")).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "sentence braid scene overlaps protected game content").toBe(false);
  }

  const dragBand = async (bandIndex: number, deltaY: number) => {
    const band = scene.getByTestId(`braid-band-${bandIndex}`);
    const box = (await band.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const end = { x: start.x, y: start.y + deltaY };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 6 });
    await page.mouse.up();
  };

  await scene.getByTestId("braid-band-0").click();
  await expect(scene).toHaveAttribute("data-depths", "middle,middle,middle");
  await dragBand(0, 45);
  await expect(scene).toHaveAttribute("data-depths", "down,middle,middle");
  await expect(scene).toHaveAttribute("data-phrase-clarity", "0");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  await dragBand(0, -45);
  await dragBand(1, 45);
  await expect(scene).toHaveAttribute("data-depths", "up,down,middle");
  await expect(scene).toHaveAttribute("data-phrase-clarity", "2");
  await expect(page.getByText("FOLLOW THE GAP")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "074-" + testInfo.project.name + ".png") });

  await dragBand(2, -45);
  await expect(scene).toHaveAttribute("data-depths", "up,down,up");
  await expect(scene).toHaveAttribute("data-phrase-clarity", "3");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("FOLLOW THE GAP")).toBeVisible();
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 075 reveals a fixed four-band weave by moving one shared beacon to its edge notch", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 075 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 74;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-075");
  await expect(scene).toHaveAttribute("data-spatial-model", "fixed-four-band-weave-revealed-by-one-shared-light");
  await expect(scene).toHaveAttribute("data-weave-state", "fixed");
  for (let index = 0; index < 4; index += 1) await expect(scene.getByTestId(`relay-weave-band-${index}`)).toBeVisible();
  await expect(scene.getByTestId("relay-weave-beacon")).toBeVisible();
  await expect(scene.getByTestId("relay-weave-notch")).toBeVisible();
  await expect(page.getByText("Relay Beacon Weave")).toHaveCount(0);
  await expect(page.getByText(/over.*under.*over.*under/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "beacon weave scene overlaps protected game content").toBe(false);
  }

  const beacon = scene.getByTestId("relay-weave-beacon");
  await beacon.click();
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  for (let index = 0; index < 4; index += 1) {
    await scene.getByTestId(`relay-weave-band-${index}`).evaluate((band) => (band as HTMLElement).click());
  }
  await expect(scene).toHaveAttribute("data-weave-state", "fixed");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);

  const dragBeaconTo = async (targetX: number) => {
    const box = (await beacon.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const end = { x: Math.round(targetX), y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragBeaconTo(puzzleBox.x + puzzleBox.width * .5);
  await expect(scene).toHaveAttribute("data-shadow-state", "contradictory");
  await expect(scene).toHaveAttribute("data-weave-state", "fixed");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "075-" + testInfo.project.name + ".png") });

  const notchBox = (await scene.getByTestId("relay-weave-notch").boundingBox())!;
  await dragBeaconTo(notchBox.x + notchBox.width / 2);
  await expect(scene).toHaveAttribute("data-beacon-state", "at-notch");
  await expect(scene).toHaveAttribute("data-shadow-state", "alternating");
  await expect(scene).toHaveAttribute("data-weave-state", "pressed");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 076 reconciles face and shadow majorities by flipping the one crease-contrary paper vote", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 076 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 75;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-076");
  await expect(scene).toHaveAttribute("data-spatial-model", "five-paper-votes-face-shadow-and-crease");
  await expect(scene).toHaveAttribute("data-face-pattern", "ooocc");
  await expect(scene).toHaveAttribute("data-shadow-pattern", "ococc");
  for (let index = 0; index < 5; index += 1) {
    await expect(scene.getByTestId(`quorum-leaf-${index}`)).toBeVisible();
    await expect(scene.getByTestId(`quorum-shadow-${index}`)).toBeVisible();
  }
  await expect(scene.getByTestId("quorum-leaf-2")).toHaveAttribute("data-crease", "contrary");
  await expect(page.getByText("Relay Quorum")).toHaveCount(0);
  await expect(page.getByText(/odd vote|异常/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "paper quorum scene overlaps protected game content").toBe(false);
  }

  for (let index = 0; index < 5; index += 1) await scene.getByTestId(`quorum-leaf-${index}`).click();
  await expect(scene).toHaveAttribute("data-flip-pattern", "11111");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await expect(page.getByText("You found the crack in time")).toHaveCount(0);
  for (let index = 0; index < 5; index += 1) await scene.getByTestId(`quorum-leaf-${index}`).click();
  await expect(scene).toHaveAttribute("data-flip-pattern", "00000");

  await scene.getByTestId("quorum-leaf-0").click();
  await expect(scene).toHaveAttribute("data-face-pattern", "coocc");
  await expect(scene).toHaveAttribute("data-shadow-pattern", "ccocc");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "076-" + testInfo.project.name + ".png") });

  await scene.getByTestId("quorum-leaf-0").click();
  await scene.getByTestId("quorum-leaf-2").click();
  await expect(scene).toHaveAttribute("data-flip-pattern", "00100");
  await expect(scene).toHaveAttribute("data-face-majority", "closed");
  await expect(scene).toHaveAttribute("data-shadow-majority", "closed");
  await expect(scene).toHaveAttribute("data-vote-state", "unanimous-tilt");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 077 rewrites the fixed numeric relation by moving its slash into the arrow groove", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 077 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 76;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-077");
  await expect(scene).toHaveAttribute("data-spatial-model", "fixed-numbers-three-stroke-relation-and-arrow-groove");
  await expect(scene).toHaveAttribute("data-number-state", "fixed");
  await expect(scene).toHaveAttribute("data-operator-state", "not-equal");
  await expect(scene.getByText("9.95")).toBeVisible();
  await expect(scene.getByText("10.00")).toBeVisible();
  await expect(scene.getByTestId("operator-stroke-upper")).toBeVisible();
  await expect(scene.getByTestId("operator-stroke-lower")).toBeVisible();
  await expect(scene.getByTestId("operator-stroke-slash")).toBeVisible();
  await expect(scene.getByTestId("operator-arrow-groove")).toBeVisible();
  await expect(page.getByText("Split Operator")).toHaveCount(0);
  await expect(page.getByText(/relation is wrong|关系错误/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "split operator scene overlaps protected game content").toBe(false);
  }

  const slash = scene.getByTestId("operator-stroke-slash");
  await slash.click();
  await expect(scene).toHaveAttribute("data-operator-state", "not-equal");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragSlashTo = async (target: { x: number; y: number }) => {
    const box = (await slash.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 7 });
    await page.mouse.up();
  };

  await dragSlashTo({ x: Math.round(puzzleBox.x + puzzleBox.width * .34), y: Math.round(puzzleBox.y + puzzleBox.height * .5) });
  await expect(scene).toHaveAttribute("data-operator-state", "equals");
  await expect(scene).toHaveAttribute("data-preview-state", "normal");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "077-" + testInfo.project.name + ".png") });

  const grooveBox = (await scene.getByTestId("operator-arrow-groove").boundingBox())!;
  await dragSlashTo({ x: Math.round(grooveBox.x + grooveBox.width / 2), y: Math.round(grooveBox.y + grooveBox.height / 2) });
  await expect(scene).toHaveAttribute("data-operator-state", "arrow");
  await expect(scene).toHaveAttribute("data-preview-state", "slowing");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 078 cancels three matching oscillations by placing the observed counter-phase window in the center", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 078 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 77;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-078");
  await expect(scene).toHaveAttribute("data-spatial-model", "four-breathing-windows-one-counter-phase-center-cancellation");
  await expect(scene).toHaveAttribute("data-window-colors", "same,same,same,same");
  await expect(scene).toHaveAttribute("data-center-state", "empty");
  for (let index = 0; index < 4; index += 1) {
    await expect(scene.getByTestId(`oscillation-window-${index}`)).toBeVisible();
    await expect(scene.getByTestId(`oscillation-trail-${index}`)).toBeAttached();
  }
  await expect(scene.getByTestId("oscillation-center-slot")).toBeVisible();
  await expect(page.getByText("Fourfold Oscillation")).toHaveCount(0);
  await expect(page.getByText(/counter.phase|反拍/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "fourfold oscillation scene overlaps protected game content").toBe(false);
  }

  for (let index = 0; index < 4; index += 1) await scene.getByTestId(`oscillation-window-${index}`).click();
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const centerBox = (await scene.getByTestId("oscillation-center-slot").boundingBox())!;
  const center = { x: Math.round(centerBox.x + centerBox.width / 2), y: Math.round(centerBox.y + centerBox.height / 2) };
  const dragWindowToCenter = async (index: number) => {
    const window = scene.getByTestId(`oscillation-window-${index}`);
    const box = (await window.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [center] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(center.x, center.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragWindowToCenter(0);
  await expect(scene).toHaveAttribute("data-last-phase", "same");
  await expect(scene).toHaveAttribute("data-amplitude", "reinforced");
  await expect(scene.getByTestId("oscillation-trail-0")).toHaveAttribute("data-visible", "true");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "078-" + testInfo.project.name + ".png") });

  await dragWindowToCenter(2);
  await expect(scene).toHaveAttribute("data-last-phase", "counter");
  await expect(scene).toHaveAttribute("data-amplitude", "cancelled");
  await expect(scene).toHaveAttribute("data-center-state", "filled");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 079 opens one paper fold until all seven relay votes and their hidden majority are visible together", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 079 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 78;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-079");
  await expect(scene).toHaveAttribute("data-spatial-model", "seven-votes-three-exposed-four-behind-one-adjustable-fold");
  await expect(scene).toHaveAttribute("data-visible-votes", "3");
  await expect(scene).toHaveAttribute("data-visible-shadows", "0");
  await expect(scene).toHaveAttribute("data-fold-state", "closed");
  await expect(scene.getByTestId("countdown-fold")).toBeVisible();
  for (let index = 0; index < 7; index += 1) {
    await expect(scene.getByTestId(`countdown-vote-${index}`)).toBeAttached();
  }
  for (let index = 0; index < 4; index += 1) {
    await expect(scene.getByTestId(`countdown-shadow-${index}`)).toBeAttached();
  }
  await expect(page.getByText("Countdown Relay")).toHaveCount(0);
  await expect(page.getByText(/majority|多数/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "seven relay vote scene overlaps protected game content").toBe(false);
  }

  for (let index = 0; index < 7; index += 1) {
    await scene.getByTestId(`countdown-vote-${index}`).evaluate((element) => (element as HTMLButtonElement).click());
  }
  await expect(scene).toHaveAttribute("data-visible-votes", "3");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragFoldBy = async (fraction: number) => {
    const fold = scene.getByTestId("countdown-fold");
    const box = (await fold.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: Math.round(start.x - puzzleBox.width * fraction), y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragFoldBy(.30);
  await expect(scene).toHaveAttribute("data-visible-votes", "5");
  await expect(scene).toHaveAttribute("data-visible-shadows", "2");
  await expect(scene).toHaveAttribute("data-fold-state", "partly-open");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "079-" + testInfo.project.name + ".png") });

  await dragFoldBy(.66);
  await expect(scene).toHaveAttribute("data-visible-votes", "6");
  await expect(scene).toHaveAttribute("data-visible-shadows", "3");
  await expect(scene).toHaveAttribute("data-fold-state", "overfolded");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await page.reload();
  await expect(scene).toHaveAttribute("data-fold-state", "closed");
  await dragFoldBy(.68);
  await expect(scene).toHaveAttribute("data-visible-votes", "7");
  await expect(scene).toHaveAttribute("data-visible-shadows", "4");
  await expect(scene).toHaveAttribute("data-fold-state", "balanced-open");
  await expect(scene).toHaveAttribute("data-majority", "right");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 080 releases the compressed center only by pulling the fibrous outer ring through every tension layer", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 080 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 79;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-080");
  await expect(scene).toHaveAttribute("data-spatial-model", "compressed-concentric-paper-rings-outer-fibers-and-released-center");
  await expect(scene).toHaveAttribute("data-loosened-layers", "0");
  await expect(scene).toHaveAttribute("data-center-state", "compressed");
  for (let index = 0; index < 4; index += 1) await expect(scene.getByTestId(`singularity-ring-${index}`)).toBeVisible();
  for (let index = 0; index < 6; index += 1) await expect(scene.getByTestId(`singularity-fiber-${index}`)).toBeAttached();
  await expect(scene.getByTestId("singularity-center")).toBeVisible();
  await expect(page.getByText("Pressure Singularity")).toHaveCount(0);
  await expect(page.getByText(/release pressure|释放压力/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "pressure singularity scene overlaps protected game content").toBe(false);
  }

  await scene.getByTestId("singularity-center").click();
  await scene.getByTestId("singularity-center").click();
  await expect(scene).toHaveAttribute("data-center-state", "tighter");
  await expect(scene).toHaveAttribute("data-center-presses", "2");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const innerBox = (await scene.getByTestId("singularity-ring-2").boundingBox())!;
  const innerStart = { x: Math.round(innerBox.x + innerBox.width / 2), y: Math.round(innerBox.y + 5) };
  if (testInfo.project.name === "mobile-390") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [innerStart] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: innerStart.x, y: innerStart.y - 55 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(innerStart.x, innerStart.y);
    await page.mouse.down();
    await page.mouse.move(innerStart.x, innerStart.y - 55, { steps: 6 });
    await page.mouse.up();
  }
  await expect(scene).toHaveAttribute("data-loosened-layers", "0");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragOuterBy = async (distance: number) => {
    const outerBox = (await scene.getByTestId("singularity-ring-0").boundingBox())!;
    const start = { x: Math.round(outerBox.x + outerBox.width - 9), y: Math.round(outerBox.y + outerBox.height / 2) };
    const target = { x: start.x + distance, y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragOuterBy(30);
  await expect(scene).toHaveAttribute("data-loosened-layers", "1");
  await expect(scene).toHaveAttribute("data-tension-state", "loosening");
  await expect(scene).toHaveAttribute("data-center-state", "tighter");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "080-" + testInfo.project.name + ".png") });

  await page.reload();
  await expect(scene).toHaveAttribute("data-center-state", "compressed");
  await dragOuterBy(80);
  await expect(scene).toHaveAttribute("data-loosened-layers", "3");
  await expect(scene).toHaveAttribute("data-tension-state", "released");
  await expect(scene).toHaveAttribute("data-center-state", "open");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 081 completes one shared ring only when two distinct device inputs deliver their matching halves", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 081 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 80;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-081");
  const pointerHalf = scene.getByTestId("dual-pointer-half");
  const companionHalf = scene.getByTestId("dual-companion-half");
  await expect(scene).toHaveAttribute("data-spatial-model", "pointer-grain-and-companion-grain-half-rings-share-one-socket");
  await expect(scene).toHaveAttribute("data-pointer-half", "waiting");
  await expect(scene).toHaveAttribute("data-companion-half", "waiting");
  await expect(pointerHalf).toBeVisible();
  await expect(companionHalf).toBeVisible();
  await expect(scene.getByTestId("dual-shared-socket")).toBeVisible();
  if (testInfo.project.name === "mobile-390") {
    await expect(scene.getByTestId("dual-keycap-grain")).toBeHidden();
    await expect(scene.getByTestId("dual-two-touch-grain")).toBeVisible();
  } else {
    await expect(scene.getByTestId("dual-keycap-grain")).toBeVisible();
    await expect(scene.getByTestId("dual-two-touch-grain")).toBeHidden();
  }
  await expect(page.getByText("Dual Device")).toHaveCount(0);
  await expect(page.getByText(/pointer.*keyboard|指针.*键盘/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "dual-device scene overlaps protected game content").toBe(false);
  }

  await pointerHalf.evaluate((element) => (element as HTMLButtonElement).click());
  await companionHalf.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const companionBox = (await companionHalf.boundingBox())!;
  const companionPoint = { x: Math.round(companionBox.x + companionBox.width * .75), y: Math.round(companionBox.y + companionBox.height / 2) };
  if (testInfo.project.name === "mobile-390") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [companionPoint] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(companionPoint.x, companionPoint.y);
    await page.mouse.down();
    await page.mouse.move(companionPoint.x - 60, companionPoint.y, { steps: 6 });
    await page.mouse.up();
  }
  await expect(scene).toHaveAttribute("data-mismatch", "companion");
  await expect(scene).toHaveAttribute("data-companion-half", "waiting");

  const pointerBox = (await pointerHalf.boundingBox())!;
  const pointerStart = { x: Math.round(pointerBox.x + pointerBox.width * .25), y: Math.round(pointerBox.y + pointerBox.height / 2) };
  const pointerTarget = { x: pointerStart.x + 65, y: pointerStart.y };
  if (testInfo.project.name === "mobile-390") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pointerStart] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pointerTarget] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(pointerStart.x, pointerStart.y);
    await page.mouse.down();
    await page.mouse.move(pointerTarget.x, pointerTarget.y, { steps: 8 });
    await page.mouse.up();
  }
  await expect(scene).toHaveAttribute("data-pointer-half", "docked");
  await expect(scene).toHaveAttribute("data-companion-half", "waiting");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "081-" + testInfo.project.name + ".png") });

  if (testInfo.project.name === "mobile-390") {
    const currentBox = (await companionHalf.boundingBox())!;
    const first = { x: Math.round(currentBox.x + currentBox.width * .68), y: Math.round(currentBox.y + currentBox.height * .42), id: 1 };
    const second = { x: Math.round(currentBox.x + currentBox.width * .82), y: Math.round(currentBox.y + currentBox.height * .62), id: 2 };
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [first, second] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...first, x: first.x - 50 }, { ...second, x: second.x - 50 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
    await expect(scene).toHaveAttribute("data-input-pair", "touch+two-touch");
  } else {
    await companionHalf.press("ArrowLeft");
    await expect(scene).toHaveAttribute("data-input-pair", "pointer+keyboard");
  }
  await expect(scene).toHaveAttribute("data-companion-half", "docked");
  await expect(scene).toHaveAttribute("data-ring-state", "complete");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 082 follows the two agreeing arrow shadows instead of accumulating visits to both candidate wells", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 082 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 81;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-082");
  const pointer = scene.getByTestId("majority-pointer");
  await expect(scene).toHaveAttribute("data-spatial-model", "one-solid-pointer-three-arrow-shadows-two-candidate-wells");
  await expect(scene).toHaveAttribute("data-shortened-shadows", "000");
  await expect(pointer).toBeVisible();
  for (let index = 0; index < 3; index += 1) await expect(scene.getByTestId(`majority-shadow-${index}`)).toBeAttached();
  for (let index = 0; index < 2; index += 1) await expect(scene.getByTestId(`majority-well-${index}`)).toBeVisible();
  await expect(page.getByText("Pointer Majority")).toHaveCount(0);
  await expect(page.getByText(/majority target|多数目标/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const shadowColors = await Promise.all([0, 1, 2].map((index) => scene.getByTestId(`majority-shadow-${index}`).evaluate((element) => getComputedStyle(element).borderTopColor)));
  expect(new Set(shadowColors).size).toBe(1);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "pointer-majority scene overlaps protected game content").toBe(false);
  }

  await pointer.evaluate((element) => (element as HTMLButtonElement).click());
  for (let index = 0; index < 2; index += 1) await scene.getByTestId(`majority-well-${index}`).evaluate((element) => (element as HTMLButtonElement).click());
  await expect(scene).toHaveAttribute("data-visited", "none");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragPointerTo = async (target: { x: number; y: number }) => {
    const box = (await pointer.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  const minorityBox = (await scene.getByTestId("majority-well-1").boundingBox())!;
  await dragPointerTo({ x: Math.round(minorityBox.x + minorityBox.width / 2), y: Math.round(minorityBox.y + minorityBox.height / 2) });
  await expect(scene).toHaveAttribute("data-visited", "minority");
  await expect(scene).toHaveAttribute("data-shortened-shadows", "001");
  await expect(scene).toHaveAttribute("data-visit-count", "1");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "082-" + testInfo.project.name + ".png") });

  await dragPointerTo({ x: Math.round(puzzleBox.x + puzzleBox.width / 2), y: Math.round(puzzleBox.y + puzzleBox.height / 2) });
  await expect(scene).toHaveAttribute("data-visited", "between");
  await expect(scene).toHaveAttribute("data-visit-count", "1");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const majorityBox = (await scene.getByTestId("majority-well-0").boundingBox())!;
  await dragPointerTo({ x: Math.round(majorityBox.x + majorityBox.width / 2), y: Math.round(majorityBox.y + majorityBox.height / 2) });
  await expect(scene).toHaveAttribute("data-visited", "majority");
  await expect(scene).toHaveAttribute("data-shortened-shadows", "110");
  await expect(scene).toHaveAttribute("data-merge-state", "merged");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 083 fixes both alternating rings by pressing their unlit shared intersection during the broad crossing window", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 083 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 82;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-083");
  const leftRing = scene.getByTestId("alternating-ring-0");
  const rightRing = scene.getByTestId("alternating-ring-1");
  const center = scene.getByTestId("alternating-shared-center");
  await expect(scene).toHaveAttribute("data-spatial-model", "two-alternating-target-rings-with-one-unlit-shared-intersection");
  await expect(scene).toHaveAttribute("data-window-ms", "1200");
  await expect(scene).toHaveAttribute("data-center-lit", "false");
  await expect(leftRing).toBeVisible();
  await expect(rightRing).toHaveAttribute("data-visible", "false");
  await expect(center).toBeVisible();
  for (let index = 0; index < 2; index += 1) await expect(scene.getByTestId(`alternating-trail-${index}`)).toBeAttached();
  await expect(page.getByText("Alternating Target")).toHaveCount(0);
  await expect(page.getByText(/shared center|共同中心/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "alternating-target scene overlaps protected game content").toBe(false);
  }

  await center.click();
  await expect(scene).toHaveAttribute("data-chase-count", "0");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await leftRing.click();
  await expect(scene).toHaveAttribute("data-active-target", "none");
  await expect(scene).toHaveAttribute("data-next-target", "right");
  await expect(scene).toHaveAttribute("data-intersection-imprints", "1");
  await expect(scene).toHaveAttribute("data-window-open", "true");
  await center.click();
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await expect(rightRing).toHaveAttribute("data-visible", "true", { timeout: 3_000 });
  await rightRing.click();
  await expect(scene).toHaveAttribute("data-active-target", "none");
  await expect(scene).toHaveAttribute("data-next-target", "left");
  await expect(scene).toHaveAttribute("data-intersection-imprints", "2");
  await expect(scene).toHaveAttribute("data-window-open", "true");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "083-" + testInfo.project.name + ".png") });

  await center.click();
  await expect(scene).toHaveAttribute("data-ring-state", "fixed-together");
  await expect(scene).toHaveAttribute("data-center-lit", "false");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 084 preserves one grounded imprint across the normal run-again reset and completes only at its complement", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 084 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 83;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  let scene = page.getByTestId("v2-scene-084");
  let dot = scene.getByTestId("ghost-session-dot");
  await expect(scene).toHaveAttribute("data-spatial-model", "one-returning-dot-two-complementary-imprints-one-session-shadow");
  await expect(scene).toHaveAttribute("data-shadow-anchor", "none");
  await expect(scene).toHaveAttribute("data-reset-count", "0");
  await expect(page.getByText("Ghost Session")).toHaveCount(0);
  await expect(page.getByText(/complete circle|完整圆/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "ghost-session scene overlaps protected game content").toBe(false);
  }

  const dragDotBy = async (dx: number, dy = 0) => {
    const box = (await dot.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x + dx, y: start.y + dy };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragDotBy(-64);
  await expect(scene).toHaveAttribute("data-dot-anchor", "left");
  await expect(scene).toHaveAttribute("data-shadow-anchor", "none");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await page.getByRole("button", { name: /START.*Space or Enter/i }).click();
  await page.getByRole("button", { name: /STOP.*Space or Enter/i }).click();
  await expect(page.getByRole("button", { name: /Run again.*Space or Enter/i })).toBeVisible();
  await expect(page.locator(".puzzle-scene")).toHaveCount(0);
  await page.getByRole("button", { name: /Run again.*Space or Enter/i }).click();

  scene = page.getByTestId("v2-scene-084");
  dot = scene.getByTestId("ghost-session-dot");
  await expect(scene).toHaveAttribute("data-reset-count", "1");
  await expect(scene).toHaveAttribute("data-dot-anchor", "start");
  await expect(scene).toHaveAttribute("data-shadow-anchor", "left");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await expect(page.locator(".simple-result")).toHaveCount(0);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "084-" + testInfo.project.name + ".png") });

  await dragDotBy(-64);
  await expect(scene).toHaveAttribute("data-dot-anchor", "left");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await dragDotBy(128);
  await expect(scene).toHaveAttribute("data-circle-state", "complete");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 085 keeps the moon moving behind a pulled cover and accepts the broad complementary reveal window", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 085 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 84;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-085");
  const moon = scene.getByTestId("phase-return-moon");
  const cover = scene.getByTestId("phase-return-cover");
  const window = scene.getByTestId("phase-return-window");
  await expect(scene).toHaveAttribute("data-spatial-model", "moving-moon-under-page-cover-with-one-edge-window-and-complementary-notch");
  await expect(scene).toHaveAttribute("data-window-ms", "1800");
  await expect(scene).toHaveAttribute("data-cover-state", "open");
  await expect(moon).toBeVisible();
  await expect(cover).toBeVisible();
  await expect(window).toBeAttached();
  await expect(page.getByText("Phase Return")).toHaveCount(0);
  await expect(page.getByText(/complementary phase|互补月相/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "phase-return scene overlaps protected game content").toBe(false);
  }

  await moon.evaluate((element) => (element as HTMLButtonElement).click());
  await cover.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(scene).toHaveAttribute("data-cover-state", "open");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragCoverBy = async (dy: number) => {
    const box = (await cover.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x, y: start.y + dy };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragCoverBy(72);
  await expect(scene).toHaveAttribute("data-cover-state", "covered");
  await page.waitForTimeout(700);
  await dragCoverBy(-72);
  await expect(scene).toHaveAttribute("data-cover-state", "open");
  await expect(scene).toHaveAttribute("data-difference-shadow", "visible");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await dragCoverBy(72);
  await expect(scene).toHaveAttribute("data-cover-state", "covered");
  await page.waitForTimeout(2_100);
  expect(Number(await scene.getAttribute("data-hidden-elapsed-ms"))).toBeGreaterThanOrEqual(2_000);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "085-" + testInfo.project.name + ".png") });

  await dragCoverBy(-72);
  await expect(scene).toHaveAttribute("data-phase-state", "complementary");
  await expect(scene).toHaveAttribute("data-circle-state", "full");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 086 turns the real settings drawer paper into an eclipse without hiding its normal controls", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 086 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 85;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-086");
  await expect(scene).toHaveAttribute("data-spatial-model", "real-menu-paper-cutout-crosses-page-sun-and-carries-shadow-to-decimal");
  await expect(scene).toHaveAttribute("data-eclipse-state", "separate");
  await expect(scene.getByTestId("eclipse-decimal-shadow")).toHaveAttribute("data-visible", "false");
  await expect(page.getByText("Eclipse Return")).toHaveCount(0);
  await expect(page.getByText(/carry.*sun|带走太阳/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "eclipse-session scene overlaps protected game content").toBe(false);
  }

  await page.getByRole("button", { name: "Open game menu" }).click();
  await expect(page.getByTestId("eclipse-menu-paper")).toBeVisible();
  await page.getByRole("button", { name: "Close game menu" }).click();
  await expect(page.locator(".game-drawer")).toHaveCount(0);
  await expect(scene).toHaveAttribute("data-close-result", "miss");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await page.getByRole("button", { name: "Open game menu" }).click();
  const layer = page.getByTestId("eclipse-menu-paper");
  const handle = layer.getByTestId("eclipse-menu-paper-handle");
  await expect(layer).toHaveAttribute("data-settings-access", "preserved");
  await page.getByRole("button", { name: /^Hint/ }).click();
  await expect(page.getByRole("button", { name: /Show the next move/ })).toBeVisible();

  const handleBox = (await handle.boundingBox())!;
  const start = { x: Math.round(handleBox.x + handleBox.width / 2), y: Math.round(handleBox.y + handleBox.height / 2) };
  const target = { x: start.x, y: start.y - 72 };
  if (testInfo.project.name === "mobile-390") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  }
  await expect(layer).toHaveAttribute("data-aligned", "true");
  await expect(scene).toHaveAttribute("data-menu-cutout", "aligned");
  await expect(scene).toHaveAttribute("data-eclipse-state", "corona");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "086-" + testInfo.project.name + ".png") });

  await page.getByRole("button", { name: "Close game menu" }).click();
  await expect(page.locator(".game-drawer")).toHaveCount(0);
  await expect(scene).toHaveAttribute("data-close-result", "carried-shadow");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(scene.getByTestId("eclipse-decimal-shadow")).toHaveAttribute("data-visible", "true");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 087 rotates one independent frame through the visible down-right-up gravity route", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 087 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 86;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-087");
  const frame = scene.getByTestId("triple-gravity-frame");
  await expect(scene).toHaveAttribute("data-spatial-model", "one-rotatable-frame-three-gravity-beads-three-slot-broken-u-groove");
  await expect(scene).toHaveAttribute("data-slot-count", "3");
  await expect(frame).toBeVisible();
  for (let index = 0; index < 3; index += 1) {
    await expect(scene.getByTestId(`gravity-bead-${index}`)).toBeAttached();
    await expect(scene.getByTestId(`gravity-groove-${index}`)).toBeAttached();
  }
  await expect(page.getByText("Gravity Round Trip II")).toHaveCount(0);
  await expect(page.getByText(/down.*right.*up|竖横竖/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "triple-gravity scene overlaps protected game content").toBe(false);
  }

  await frame.evaluate((element) => (element as HTMLButtonElement).click());
  await page.evaluate(() => window.dispatchEvent(new Event("orientationchange")));
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragFrameBy = async (dx: number, dy: number) => {
    const box = (await frame.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x + dx, y: start.y + dy };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragFrameBy(64, 0);
  await expect(scene).toHaveAttribute("data-current-slot", "right");
  await expect(scene).toHaveAttribute("data-route-progress", "0");
  await expect(scene).toHaveAttribute("data-shadow-line", "visible");

  await dragFrameBy(0, 64);
  await dragFrameBy(64, 0);
  await expect(scene).toHaveAttribute("data-route-progress", "2");
  await expect(scene).toHaveAttribute("data-retained-traces", "down,right");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "087-" + testInfo.project.name + ".png") });

  await dragFrameBy(0, -64);
  await expect(scene).toHaveAttribute("data-route-progress", "3");
  await expect(scene).toHaveAttribute("data-u-state", "joined");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 088 reverses the paper boundary before the outside face can return into the empty slot", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 088 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 87;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-088");
  const fold = scene.getByTestId("liminal-fold");
  const inside = scene.getByTestId("liminal-inside-piece");
  const outside = scene.getByTestId("liminal-outside-piece");
  await expect(scene).toHaveAttribute("data-spatial-model", "inside-outside-pieces-central-reversible-fold-and-redefined-return-edge");
  await expect(scene).toHaveAttribute("data-operation-modes", "fold,edge-drag");
  await expect(fold).toBeVisible();
  await expect(inside).toContainText("IN");
  await expect(outside).toContainText("OUT");
  await expect(scene.getByTestId("liminal-return-slot")).toBeVisible();
  await expect(page.getByText("Liminal Device")).toHaveCount(0);
  await expect(page.getByText(/first.*fold|send.*outside|先翻|送出边缘/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "liminal-device scene overlaps protected game content").toBe(false);
  }

  const dragPieceAcrossLeft = async (piece: typeof inside) => {
    const box = (await piece.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x - 86, y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragPieceAcrossLeft(outside);
  await expect(scene).toHaveAttribute("data-fold-state", "front");
  await expect(scene).toHaveAttribute("data-last-crossing", "outside-old-edge");
  await expect(scene).toHaveAttribute("data-return-state", "wrapped-unseated");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await fold.click();
  await expect(scene).toHaveAttribute("data-fold-state", "back");
  await expect(scene).toHaveAttribute("data-edge-texture", "reversed");
  await expect(inside).toHaveAttribute("data-side", "right");
  await expect(outside).toHaveAttribute("data-side", "left");
  await page.waitForTimeout(350);

  await dragPieceAcrossLeft(inside);
  await expect(scene).toHaveAttribute("data-last-crossing", "inside-reversed-edge");
  await expect(scene).toHaveAttribute("data-return-state", "wrapped-unseated");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "088-" + testInfo.project.name + ".png") });

  await dragPieceAcrossLeft(outside);
  await expect(scene).toHaveAttribute("data-last-crossing", "outside-reversed-edge");
  await expect(scene).toHaveAttribute("data-return-state", "seated-inside");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(outside).toHaveAttribute("data-side", "slot");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 089 retains the dotted narrow ribbon before widening the internal paper viewport into a braid", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 089 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 88;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-089");
  const handle = scene.getByTestId("braid-viewport-handle");
  const clip = scene.getByTestId("braid-paper-clip");
  await expect(scene).toHaveAttribute("data-spatial-model", "resizable-paper-viewport-one-clip-and-one-ribbon-reflowing-between-continuous-and-dotted");
  await expect(scene).toHaveAttribute("data-layout", "wide");
  await expect(scene.getByTestId("braid-paper-viewport")).toBeVisible();
  await expect(scene.getByTestId("braid-continuous-ribbon")).toBeAttached();
  await expect(scene.getByTestId("braid-dotted-ribbon")).toBeAttached();
  await expect(clip).toBeVisible();
  await expect(page.getByText("Locale Input Braid")).toHaveCount(0);
  await expect(page.getByText(/first.*narrow|clip.*dotted|先留住窄版/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const originalViewport = page.viewportSize()!;
  await page.setViewportSize({ width: originalViewport.width - 20, height: originalViewport.height });
  await expect(scene).toHaveAttribute("data-browser-resizes", "0");
  await expect(scene).toHaveAttribute("data-layout", "wide");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await page.setViewportSize(originalViewport);

  const puzzleBox = (await scene.boundingBox())!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(originalViewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(originalViewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "device-braid scene overlaps protected game content").toBe(false);
  }
  expect(await handle.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const top = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    return top?.closest("[data-testid]")?.getAttribute("data-testid") ?? `${top?.tagName ?? "none"}.${top instanceof HTMLElement ? top.className : ""}`;
  })).toBe("braid-viewport-handle");

  const dragHandleBy = async (dx: number) => {
    const box = (await handle.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x + dx, y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
    } else {
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(target.x, target.y, { steps: 8 });
      await page.mouse.up();
    }
    await page.waitForTimeout(380);
  };

  await clip.click();
  await expect(scene).toHaveAttribute("data-clip-state", "empty-clamp");
  await expect(scene).toHaveAttribute("data-retained-layer", "none");

  await dragHandleBy(-86);
  await expect(scene).toHaveAttribute("data-layout", "narrow");
  await dragHandleBy(86);
  await expect(scene).toHaveAttribute("data-layout", "wide");
  await expect(scene).toHaveAttribute("data-braid-state", "separate");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await dragHandleBy(-86);
  await expect(scene).toHaveAttribute("data-layout", "narrow");
  await clip.click();
  await expect(scene).toHaveAttribute("data-clip-state", "holding-dotted");
  await expect(scene).toHaveAttribute("data-retained-layer", "dotted");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "089-" + testInfo.project.name + ".png") });

  await dragHandleBy(86);
  await expect(scene).toHaveAttribute("data-layout", "wide");
  await expect(scene).toHaveAttribute("data-braid-state", "woven");
  await expect(scene).toHaveAttribute("data-layer-order", "dotted-over-continuous");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 090 moves one transparent map across scattered archive textures until all three route segments connect", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 090 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 89;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-090");
  const map = scene.getByTestId("labyrinth-map-window");
  await expect(scene).toHaveAttribute("data-spatial-model", "scattered-archive-textures-one-transparent-map-window-and-three-route-segments");
  await expect(scene.getByTestId(/labyrinth-cell-/)).toHaveCount(6);
  await expect(scene.getByTestId(/labyrinth-route-segment-/)).toHaveCount(3);
  await expect(map).toBeVisible();
  await expect(scene).toHaveAttribute("data-date-dependency", "none");
  await expect(page.getByText("Daily Archive Route")).toHaveCount(0);
  await expect(page.getByText(/unique.*cover|move.*map|移动地图/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "archive-labyrinth scene overlaps protected game content").toBe(false);
  }

  expect(await scene.getByTestId(/labyrinth-cell-/).evaluateAll((cells) => cells.map((cell) => {
    const box = cell.getBoundingClientRect();
    return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest("[data-testid]")?.getAttribute("data-testid") ?? "blocked";
  }))).toEqual(["labyrinth-cell-0", "labyrinth-cell-1", "labyrinth-cell-2", "labyrinth-map-window", "labyrinth-cell-4", "labyrinth-cell-5"]);
  const archiveCells = await scene.getByTestId(/labyrinth-cell-/).all();
  for (const index of [0, 1, 2, 4, 5]) await archiveCells[index].click({ timeout: 3_000 });
  await expect(scene).toHaveAttribute("data-opened-cells", "5");
  await expect(scene).toHaveAttribute("data-route-state", "hidden");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragMapBy = async (dx: number, dy: number) => {
    const box = (await map.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x + dx, y: start.y + dy };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragMapBy(150, -15);
  await expect(scene).toHaveAttribute("data-route-state", "dead-end");
  expect(Number(await scene.getAttribute("data-visible-segments"))).toBeGreaterThan(0);
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await archiveCells[3].click({ timeout: 3_000 });
  await expect(scene).toHaveAttribute("data-opened-cells", "6");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "090-" + testInfo.project.name + ".png") });

  await dragMapBy(20, -66);
  await expect(scene).toHaveAttribute("data-visible-segments", "3");
  await expect(scene).toHaveAttribute("data-route-state", "connected");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 091 lets the two mode cards cancel each other until their shared blank backing is lifted", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 091 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 90;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-091");
  const normal = scene.getByTestId("mode-card-normal");
  const slow = scene.getByTestId("mode-card-slow");
  const backing = scene.getByTestId("mode-backing-sheet");
  await expect(scene).toHaveAttribute("data-spatial-model", "two-mutually-cancelling-mode-cards-over-one-shared-blank-backing-sheet");
  await expect(normal).toContainText("NORMAL");
  await expect(slow).toContainText("SLOW");
  await expect(backing).toBeVisible();
  await expect(scene).toHaveAttribute("data-page-speed", "normal");
  await expect(page.getByText("Mode Paradox")).toHaveCount(0);
  await expect(page.getByText(/shared.*backing|lift.*blank|背后的空白/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "mode-flip scene overlaps protected game content").toBe(false);
  }

  await normal.click();
  await expect(scene).toHaveAttribute("data-card-faces", "back,front");
  await slow.click();
  await normal.click();
  await slow.click();
  await expect(scene).toHaveAttribute("data-card-flips", "4");
  await expect(scene).toHaveAttribute("data-page-speed", "normal");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await backing.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(scene).toHaveAttribute("data-backing-state", "flat");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "091-" + testInfo.project.name + ".png") });

  const box = (await backing.boundingBox())!;
  const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height - 18) };
  const target = { x: start.x, y: start.y - 72 };
  if (testInfo.project.name === "mobile-390") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  }
  await expect(scene).toHaveAttribute("data-backing-state", "covering-cards");
  await expect(scene).toHaveAttribute("data-page-speed", "slow");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 092 rewards one shared-center touch with five depth echoes instead of five arbitrary taps", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 092 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 91;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-092");
  const field = scene.getByTestId("five-echo-field");
  await expect(scene).toHaveAttribute("data-spatial-model", "five-nested-hollow-paper-rings-one-shared-unglowing-center-and-depth-dependent-echoes");
  await expect(scene).toHaveAttribute("data-multitouch-required", "false");
  await expect(scene.getByTestId(/five-echo-ring-/)).toHaveCount(5);
  await expect(scene.getByTestId("five-echo-center")).toHaveAttribute("data-glow", "false");
  await expect(page.getByText("Five-Finger Echo")).toHaveCount(0);
  await expect(page.getByText(/shared center|common center|five echoes/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const [protectedName, protectedBox] of (await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])).map((box, index) => [["challenge", "timer", "play-button"][index], box] as const)) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, `five-finger-echo scene overlaps ${protectedName}: puzzle=${JSON.stringify(puzzleBox)} protected=${JSON.stringify(protectedBox)}`).toBe(false);
  }

  const fieldBox = (await field.boundingBox())!;
  const hitAt = async (ratioX: number, ratioY: number) => {
    const point = {
      x: Math.round(fieldBox.x + fieldBox.width * ratioX),
      y: Math.round(fieldBox.y + fieldBox.height * ratioY),
    };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.click(point.x, point.y);
  };

  for (const point of [[.16, .18], [.84, .22], [.18, .78], [.82, .82], [.5, .82]] as const) {
    await hitAt(point[0], point[1]);
  }
  await expect(scene).toHaveAttribute("data-attempt-count", "5");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  expect(Number(await scene.getAttribute("data-echo-count"))).toBeLessThan(5);
  expect(await scene.getByTestId(/five-echo-wave-/).count()).toBe(Number(await scene.getAttribute("data-echo-count")));
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "092-" + testInfo.project.name + ".png") });

  await hitAt(.5, .5);
  await expect(scene).toHaveAttribute("data-attempt-count", "6");
  await expect(scene).toHaveAttribute("data-echo-count", "5");
  await expect(scene).toHaveAttribute("data-crossed-layers", "5");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 093 folds six long-short paper beats into one shared endpoint instead of playing a rhythm", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 093 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 92;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-093");
  const segments = await scene.getByTestId(/six-beat-segment-/).all();
  await expect(scene).toHaveAttribute("data-spatial-model", "six-radial-long-short-paper-beats-folding-their-outer-endpoints-onto-one-shared-center-stamp");
  expect(segments).toHaveLength(6);
  await expect(scene.getByTestId(/six-beat-fold-line-/)).toHaveCount(6);
  await expect(page.getByText("Six-Beat Lock")).toHaveCount(0);
  await expect(page.getByText(/fold.*beat|play.*rhythm|common endpoint/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "six-beat-lock scene overlaps protected game content").toBe(false);
  }
  for (const segment of segments) {
    const box = (await segment.boundingBox())!;
    expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(44);
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    await segment.evaluate((element) => (element as HTMLButtonElement).click());
  }
  await expect(scene).toHaveAttribute("data-folded-count", "0");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const sceneCenter = { x: puzzleBox.x + puzzleBox.width / 2, y: puzzleBox.y + puzzleBox.height / 2 };
  const angles = [-10, 50, 110, 170, 230, 290];
  const lengths = [140.8, 92.8, 140.8, 92.8, 140.8, 92.8];
  const dragSegment = async (index: number, towardCenter: boolean) => {
    const radians = angles[index] * Math.PI / 180;
    const start = {
      x: Math.round(sceneCenter.x + Math.cos(radians) * (lengths[index] - 12)),
      y: Math.round(sceneCenter.y + Math.sin(radians) * (lengths[index] - 12)),
    };
    const target = towardCenter
      ? { x: Math.round(sceneCenter.x), y: Math.round(sceneCenter.y) }
      : { x: Math.round(sceneCenter.x + Math.cos(radians) * (lengths[index] + 36)), y: Math.round(sceneCenter.y + Math.sin(radians) * (lengths[index] + 36)) };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragSegment(0, false);
  await expect(scene).toHaveAttribute("data-rebound-count", "1");
  await expect(scene).toHaveAttribute("data-folded-count", "0");
  for (const index of [4, 1, 5]) await dragSegment(index, true);
  await expect(scene).toHaveAttribute("data-fold-order", "4,1,5");
  await expect(scene).toHaveAttribute("data-endpoint-overlap", "3");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "093-" + testInfo.project.name + ".png") });

  for (const index of [0, 3, 2]) await dragSegment(index, true);
  await expect(scene).toHaveAttribute("data-fold-order", "4,1,5,0,3,2");
  await expect(scene).toHaveAttribute("data-endpoint-overlap", "6");
  await expect(scene).toHaveAttribute("data-stamp-state", "single-thick-beat");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 094 removes saturation with a white shade until a texture clock appears", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 094 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 93;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-094");
  const shade = scene.getByTestId("saturation-shade");
  const layers = scene.getByTestId(/saturation-layer-/);
  await expect(scene).toHaveAttribute("data-spatial-model", "overlapping-colored-texture-papers-one-white-desaturation-shade-and-one-hidden-texture-clock-at-the-saturated-center");
  await expect(scene).toHaveAttribute("data-color-only", "false");
  await expect(scene).toHaveAttribute("data-flashing", "false");
  await expect(layers).toHaveCount(4);
  expect(new Set(await layers.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-texture")))).size).toBe(4);
  await expect(page.getByText("Beacon Saturation")).toHaveCount(0);
  await expect(page.getByText(/white shade|desaturat|strongest color|texture clock/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "beacon-saturation scene overlaps protected game content").toBe(false);
  }
  const shadeBox = (await shade.boundingBox())!;
  expect(shadeBox.width).toBeGreaterThanOrEqual(44);
  expect(shadeBox.height).toBeGreaterThanOrEqual(44);
  await layers.evaluateAll((nodes) => nodes.forEach((node) => (node as HTMLElement).click()));
  await expect(scene).toHaveAttribute("data-shade-position", "14,74");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragShadeTo = async (ratioX: number, ratioY: number) => {
    const current = (await shade.boundingBox())!;
    const start = { x: Math.round(current.x + current.width / 2), y: Math.round(current.y + current.height / 2) };
    const target = { x: Math.round(puzzleBox.x + puzzleBox.width * ratioX), y: Math.round(puzzleBox.y + puzzleBox.height * ratioY) };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragShadeTo(.25, .74);
  await expect(scene).toHaveAttribute("data-clock-state", "concealed");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await dragShadeTo(.38, .58);
  await expect(scene).toHaveAttribute("data-pattern-visibility", "emerging");
  expect(Number(await scene.getAttribute("data-saturation"))).toBeLessThan(100);
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "094-" + testInfo.project.name + ".png") });

  await dragShadeTo(.5, .5);
  await expect(scene).toHaveAttribute("data-shade-position", "50,50");
  await expect(scene).toHaveAttribute("data-saturation", "0");
  await expect(scene).toHaveAttribute("data-pattern-visibility", "clear");
  await expect(scene).toHaveAttribute("data-clock-state", "visible-texture");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 095 stacks past present and future into one unghosted ring", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 095 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 94;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-095");
  const phases = scene.getByTestId(/triple-phase-(past|present|future)/);
  await expect(scene).toHaveAttribute("data-spatial-model", "three-translucent-time-slices-with-complementary-ring-gaps-and-edge-embossing-stacked-past-present-future");
  await expect(scene).toHaveAttribute("data-color-only", "false");
  await expect(scene).toHaveAttribute("data-flashing", "false");
  await expect(phases).toHaveCount(3);
  await expect(scene.getByTestId("triple-phase-past")).toHaveAttribute("data-gap-angle", "30");
  await expect(scene.getByTestId("triple-phase-present")).toHaveAttribute("data-gap-angle", "150");
  await expect(scene.getByTestId("triple-phase-future")).toHaveAttribute("data-gap-angle", "270");
  await expect(scene.getByTestId("triple-phase-past")).toHaveAttribute("data-edge-emboss", "1");
  await expect(scene.getByTestId("triple-phase-present")).toHaveAttribute("data-edge-emboss", "2");
  await expect(scene.getByTestId("triple-phase-future")).toHaveAttribute("data-edge-emboss", "3");
  await expect(page.getByText("Triple Phase")).toHaveCount(0);
  await expect(page.getByText(/past.*present.*future|complete ring|stack/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "triple-phase scene overlaps protected game content").toBe(false);
  }
  for (const phase of await phases.all()) {
    const box = (await phase.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await phase.evaluate((element) => (element as HTMLButtonElement).click());
  }
  await expect(scene).toHaveAttribute("data-stack-order", "");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dispatchDrag = async (start: { x: number; y: number }, target: { x: number; y: number }) => {
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };
  const dragPhaseToCenter = async (phase: "past" | "present" | "future") => {
    const box = (await scene.getByTestId(`triple-phase-${phase}`).boundingBox())!;
    await dispatchDrag(
      { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) },
      { x: Math.round(puzzleBox.x + puzzleBox.width / 2), y: Math.round(puzzleBox.y + puzzleBox.height / 2) },
    );
  };
  const dragTopPhaseOut = async (phase: "past" | "present" | "future") => {
    const box = (await scene.getByTestId(`triple-phase-${phase}`).boundingBox())!;
    await dispatchDrag(
      { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) },
      { x: Math.round(puzzleBox.x + puzzleBox.width * .86), y: Math.round(puzzleBox.y + puzzleBox.height * .16) },
    );
  };

  for (const phase of ["future", "past", "present"] as const) await dragPhaseToCenter(phase);
  await expect(scene).toHaveAttribute("data-stack-order", "future,past,present");
  await expect(scene).toHaveAttribute("data-overlap-count", "3");
  await expect(scene).toHaveAttribute("data-ghost-count", "2");
  await expect(scene).toHaveAttribute("data-ring-state", "ghosted");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "095-" + testInfo.project.name + ".png") });

  for (const phase of ["present", "past", "future"] as const) await dragTopPhaseOut(phase);
  await expect(scene).toHaveAttribute("data-stack-order", "");
  for (const phase of ["past", "present", "future"] as const) await dragPhaseToCenter(phase);
  await expect(scene).toHaveAttribute("data-stack-order", "past,present,future");
  await expect(scene).toHaveAttribute("data-overlap-count", "3");
  await expect(scene).toHaveAttribute("data-ghost-count", "0");
  await expect(scene).toHaveAttribute("data-ring-state", "complete-single-ring");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 096 removes only the examined beat that breaks geometric convergence", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 096 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 95;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-096");
  const beats = scene.getByTestId(/null-beat-[0-6]/);
  await expect(scene).toHaveAttribute("data-spatial-model", "seven-ink-beats-converging-by-halved-gaps-with-one-two-sided-null-break-and-a-zero-point");
  await expect(scene).toHaveAttribute("data-color-only", "false");
  await expect(scene).toHaveAttribute("data-flashing", "false");
  await expect(scene).toHaveAttribute("data-distance-curve", "broken");
  await expect(beats).toHaveCount(7);
  await expect(scene.getByTestId("null-zero-point")).toBeVisible();
  await expect(page.getByText("Null Accelerando")).toHaveCount(0);
  await expect(page.getByText(/remove.*beat|fifth beat|geometric convergence/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "seven-beat-null scene overlaps protected game content").toBe(false);
  }
  for (const beat of await beats.all()) {
    const box = (await beat.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await beat.evaluate((element) => (element as HTMLButtonElement).click());
  }
  await expect(scene).toHaveAttribute("data-inspected-point", "none");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dispatchDrag = async (start: { x: number; y: number }, target: { x: number; y: number }) => {
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };
  const dragBeat = async (index: number, kind: "inspect" | "remove") => {
    const box = (await scene.getByTestId(`null-beat-${index}`).boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = kind === "inspect"
      ? { x: start.x + 18, y: start.y + 3 }
      : { x: start.x, y: Math.round(puzzleBox.y + 18) };
    await dispatchDrag(start, target);
  };

  await dragBeat(1, "inspect");
  await dragBeat(1, "remove");
  await expect(scene).toHaveAttribute("data-returned-point", "1");
  await expect(scene).toHaveAttribute("data-visible-beats", "7");
  await dragBeat(4, "remove");
  await expect(scene).toHaveAttribute("data-inspected-point", "4");
  await expect(scene).toHaveAttribute("data-returned-point", "4");
  await expect(scene).toHaveAttribute("data-distance-curve", "broken");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "096-" + testInfo.project.name + ".png") });

  await dragBeat(4, "inspect");
  await dragBeat(4, "remove");
  await expect(scene).toHaveAttribute("data-removed-point", "4");
  await expect(scene).toHaveAttribute("data-visible-beats", "6");
  await expect(scene).toHaveAttribute("data-distance-curve", "smooth-halving");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 097 raises seven folded leaves together with their one shared spine clasp", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 097 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 96;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-097");
  const pages = scene.getByTestId(/sevenfold-page-[0-6]/);
  const clasp = scene.getByTestId("sevenfold-clasp");
  await expect(scene).toHaveAttribute("data-spatial-model", "seven-folded-leaves-on-one-spine-raised-sequentially-by-one-shared-clasp-at-a-single-embossed-notch");
  await expect(scene).toHaveAttribute("data-color-only", "false");
  await expect(scene).toHaveAttribute("data-flashing", "false");
  await expect(pages).toHaveCount(7);
  await expect(scene.getByTestId("sevenfold-notch")).toBeVisible();
  await expect(page.getByText("Binary Beacon")).toHaveCount(0);
  await expect(page.getByText(/pull.*clasp|shared spine|seven.*page/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "sevenfold-ack scene overlaps protected game content").toBe(false);
  }
  const claspBox = (await clasp.boundingBox())!;
  expect(claspBox.width).toBeGreaterThanOrEqual(44);
  expect(claspBox.height).toBeGreaterThanOrEqual(44);
  for (const leaf of await pages.all()) await leaf.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(scene).toHaveAttribute("data-page-flips", "7");
  await expect(scene).toHaveAttribute("data-shadow-alignment", "covered");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragClasp = async (deltaY: number) => {
    const box = (await clasp.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x, y: start.y + deltaY };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragClasp(36);
  await expect(scene).toHaveAttribute("data-lifted-pages", "3");
  await expect(scene).toHaveAttribute("data-shadow-alignment", "partial");
  await dragClasp(70);
  await expect(scene).toHaveAttribute("data-lifted-pages", "7");
  await expect(scene).toHaveAttribute("data-shadow-alignment", "overshot");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "097-" + testInfo.project.name + ".png") });

  await dragClasp(-30);
  await expect(scene).toHaveAttribute("data-lifted-pages", "7");
  await expect(scene).toHaveAttribute("data-shadow-alignment", "shared-center");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 098 rotates four coupled moments until their edge path becomes chronological", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 098 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 97;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-098");
  const moments = scene.getByTestId(/quad-moment-[0-3]/);
  const cross = scene.getByTestId("quad-cross");
  await expect(scene).toHaveAttribute("data-spatial-model", "four-stopwatch-moments-in-coupled-quadrants-reordered-only-by-one-central-quarter-turn-cross");
  await expect(scene).toHaveAttribute("data-color-only", "false");
  await expect(scene).toHaveAttribute("data-flashing", "false");
  await expect(scene).toHaveAttribute("data-quadrant-order", "0,2,3,1");
  await expect(moments).toHaveCount(4);
  await expect(scene.getByText("2.50")).toBeVisible();
  await expect(scene.getByText("5.00")).toBeVisible();
  await expect(scene.getByText("7.50")).toBeVisible();
  await expect(scene.getByText("10.00")).toBeVisible();
  await expect(page.getByText("Broken Waltz")).toHaveCount(0);
  await expect(page.getByText(/clockwise|chronological|quarter turn/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "quad-phase scene overlaps protected game content").toBe(false);
  }
  for (const moment of await moments.all()) {
    const box = (await moment.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await moment.evaluate((element) => (element as HTMLButtonElement).click());
  }
  await expect(scene).toHaveAttribute("data-quadrant-order", "0,2,3,1");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragCross = async (deltaX: number) => {
    const box = (await cross.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x + deltaX, y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragCross(60);
  await expect(scene).toHaveAttribute("data-rotation-step", "1");
  await expect(scene).toHaveAttribute("data-complete-edges", "1");
  await expect(scene).toHaveAttribute("data-path-state", "partial");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "098-" + testInfo.project.name + ".png") });

  await dragCross(60);
  await expect(scene).toHaveAttribute("data-rotation-step", "2");
  await expect(scene).toHaveAttribute("data-quadrant-order", "0,1,2,3");
  await expect(scene).toHaveAttribute("data-complete-edges", "4");
  await expect(scene).toHaveAttribute("data-path-state", "continuous-loop");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 099 aligns one six-hole inspection band with the common cycle of two paper waves", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 099 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 98;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-099");
  const band = scene.getByTestId("polyrhythm-inspection-band");
  const holes = scene.getByTestId(/polyrhythm-hole-[0-5]/);
  await expect(scene).toHaveAttribute("data-spatial-model", "two-division-and-three-division-paper-waves-filtered-together-by-one-six-hole-inspection-band");
  await expect(scene).toHaveAttribute("data-audio-required", "false");
  await expect(scene).toHaveAttribute("data-color-only", "false");
  await expect(scene).toHaveAttribute("data-flashing", "false");
  await expect(scene.getByTestId("polyrhythm-wave-2")).toBeVisible();
  await expect(scene.getByTestId("polyrhythm-wave-3")).toBeVisible();
  await expect(holes).toHaveCount(6);
  await expect(page.getByText("Relay Polyrhythm")).toHaveCount(0);
  await expect(page.getByText(/intersection|common cycle|align.*hole/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "relay-polyrhythm scene overlaps protected game content").toBe(false);
  }
  const bandBox = (await band.boundingBox())!;
  expect(bandBox.width).toBeGreaterThanOrEqual(44);
  expect(bandBox.height).toBeGreaterThanOrEqual(44);
  await scene.getByTestId("polyrhythm-wave-2").evaluate((element) => (element as HTMLButtonElement).click());
  await scene.getByTestId("polyrhythm-wave-3").evaluate((element) => (element as HTMLButtonElement).click());
  for (let count = 0; count < 6; count += 1) await band.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(scene).toHaveAttribute("data-band-position", "15");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dragBand = async (deltaX: number) => {
    const box = (await band.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    const target = { x: start.x + deltaX, y: start.y };
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [target] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(target.x, target.y, { steps: 8 });
    await page.mouse.up();
  };

  await dragBand(55);
  await expect(scene).toHaveAttribute("data-band-position", "32");
  await expect(scene).toHaveAttribute("data-aligned-holes", "0");
  await dragBand(35);
  await expect(scene).toHaveAttribute("data-band-position", "43");
  await expect(scene).toHaveAttribute("data-aligned-holes", "3");
  await expect(scene).toHaveAttribute("data-cycle-state", "approaching");
  await expect(scene).toHaveAttribute("data-lock-state", "open");
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "099-" + testInfo.project.name + ".png") });

  await dragBand(29);
  await expect(scene).toHaveAttribute("data-band-position", "52");
  await expect(scene).toHaveAttribute("data-aligned-holes", "6");
  await expect(scene).toHaveAttribute("data-cycle-state", "shared-six-point-cycle");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
});

test("level 100 gathers two star groups and traces the V implied by their negative space", async ({ page }, testInfo) => {
  test.skip(!["desktop-1440", "mobile-390"].includes(testInfo.project.name), "Level 100 visual contract runs on one desktop and one phone viewport.");
  forcedCheatIndex = 99;
  await page.goto("/");
  await expect(page.locator(".play-button")).toBeVisible({ timeout: 60_000 });

  const scene = page.getByTestId("v2-scene-100");
  const left = scene.getByTestId("constellation-left-cluster");
  const right = scene.getByTestId("constellation-right-cluster");
  const stars = scene.getByTestId(/constellation-star-[0-5]/);
  await expect(scene).toHaveAttribute("data-spatial-model", "two-three-star-clusters-gathered-to-reveal-a-negative-space-v-then-traced-through-three-structural-stars");
  await expect(scene).toHaveAttribute("data-camera-route", "optional");
  await expect(scene).toHaveAttribute("data-color-only", "false");
  await expect(scene).toHaveAttribute("data-flashing", "false");
  await expect(stars).toHaveCount(6);
  await expect(scene.getByTestId("constellation-trace")).toHaveCount(0);
  await expect(page.getByText("Silent Constellation")).toHaveCount(0);
  await expect(page.getByText(/draw.*v|trace.*star|negative space/i)).toHaveCount(0);
  await expect(page.locator("[class*='ambientMarks']")).toHaveCount(0);

  const puzzleBox = (await scene.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(puzzleBox.x).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.x + puzzleBox.width).toBeLessThanOrEqual(viewport.width);
  expect(puzzleBox.y).toBeGreaterThanOrEqual(0);
  expect(puzzleBox.y + puzzleBox.height).toBeLessThanOrEqual(viewport.height);
  for (const protectedBox of await Promise.all([
    page.locator(".challenge-copy").boundingBox(),
    page.locator(".stopwatch-card").boundingBox(),
    page.locator(".play-button").boundingBox(),
  ])) {
    expect(protectedBox).not.toBeNull();
    const overlap = puzzleBox.x < protectedBox!.x + protectedBox!.width
      && puzzleBox.x + puzzleBox.width > protectedBox!.x
      && puzzleBox.y < protectedBox!.y + protectedBox!.height
      && puzzleBox.y + puzzleBox.height > protectedBox!.y;
    expect(overlap, "silent-constellation scene overlaps protected game content").toBe(false);
  }
  for (const cluster of [left, right]) {
    const box = (await cluster.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await cluster.evaluate((element) => (element as HTMLButtonElement).click());
  }
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await expect(scene).toHaveAttribute("data-gathered-clusters", "0");
  await expect(scene).toHaveAttribute("data-negative-space", "closed");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  const dispatchDrag = async (start: { x: number; y: number }, points: Array<{ x: number; y: number }>) => {
    if (testInfo.project.name === "mobile-390") {
      const session = await page.context().newCDPSession(page);
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
      for (const point of points) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [point] });
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await session.detach();
      return;
    }
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (const point of points) await page.mouse.move(point.x, point.y, { steps: 8 });
    await page.mouse.up();
  };
  const dragCluster = async (cluster: typeof left, deltaX: number) => {
    const box = (await cluster.boundingBox())!;
    const start = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    await dispatchDrag(start, [{ x: start.x + deltaX, y: start.y }]);
  };

  await dragCluster(left, 70);
  await expect(scene).toHaveAttribute("data-gathered-clusters", "1");
  await expect(scene).toHaveAttribute("data-negative-space", "half-open");
  await dragCluster(right, -70);
  await expect(scene).toHaveAttribute("data-gathered-clusters", "2");
  await expect(scene).toHaveAttribute("data-negative-space", "open-v");
  const trace = scene.getByTestId("constellation-trace");
  await expect(trace).toBeVisible();
  await mkdir(sequentialScreenshotRoot, { recursive: true });
  await page.screenshot({ path: path.join(sequentialScreenshotRoot, "100-" + testInfo.project.name + ".png") });

  const traceBox = (await trace.boundingBox())!;
  const at = (x: number, y: number) => ({ x: Math.round(traceBox.x + traceBox.width * x / 100), y: Math.round(traceBox.y + traceBox.height * y / 100) });
  await dispatchDrag(at(50, 45), [at(82, 48), at(70, 75)]);
  await expect(scene).toHaveAttribute("data-trace-progress", "0");
  await expect(scene).toHaveAttribute("data-lock-state", "open");

  await dispatchDrag(at(20, 18), [at(35, 48), at(50, 80), at(65, 48), at(80, 18)]);
  await expect(scene).toHaveAttribute("data-trace-progress", "3");
  await expect(scene).toHaveAttribute("data-trace-state", "complete-v");
  await expect(scene).toHaveAttribute("data-lock-state", "locked");
  await expect(page.getByText("You found the crack in time")).toBeVisible();
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
    const sceneControls = definition.slug === "eclipse-session"
      ? page.locator(".menu-button")
      : sceneRoot.locator("button, [role='application']");
    await expect(sceneControls.first(), definition.slug).toBeVisible();

    const viewport = page.viewportSize()!;
    const boxes = await sceneControls.evaluateAll((objects) => objects.map((object) => {
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

test("all one hundred production scenes keep their controls clear of the timer, challenge, and main action", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The cross-viewport geometry audit runs once on desktop Chromium.");
  test.setTimeout(900_000);
  const viewports = [
    { name: "desktop-short", width: 1536, height: 800 },
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const;
  const violations: string[] = [];

  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    forcedCheatIndex = 0;
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
      await expect(sceneRoot, `${viewport.name} ${definition.slug}`).toBeVisible();
      if (index > 0) {
        await page.locator(".drawer-header button").last().click();
        await expect(page.locator(".drawer-backdrop")).toHaveCount(0);
      }
      await expect(sceneRoot).toHaveAttribute("data-layout-ready", "true");
      await expect.poll(async () => sceneRoot.evaluate((scene) => {
        const timer = document.querySelector<HTMLElement>(".stopwatch-card");
        if (!timer) return false;
        const measuredBottom = Number.parseFloat((scene as HTMLElement).style.getPropertyValue("--timer-bottom"));
        return Math.abs(measuredBottom - timer.getBoundingClientRect().bottom) < 1;
      })).toBe(true);

      const levelViolations = await sceneRoot.evaluate((scene) => {
        const isRendered = (element: Element) => {
          const style = window.getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== "none"
            && style.visibility !== "hidden"
            && Number.parseFloat(style.opacity || "1") > 0.02
            && style.pointerEvents !== "none"
            && box.width >= 2
            && box.height >= 2;
        };
        const overlaps = (first: DOMRect, second: DOMRect, clearance = 4) => !(
          first.right + clearance <= second.left
          || first.left >= second.right + clearance
          || first.bottom + clearance <= second.top
          || first.top >= second.bottom + clearance
        );
        const protectedElements = [
          ["challenge", document.querySelector(".challenge-copy h1")],
          ["timer", document.querySelector(".timer-readout")],
          ["main-action", document.querySelector(".play-button")],
        ] as const;
        const controls = Array.from(scene.querySelectorAll("button, [role='application'], input, select, textarea"))
          .filter(isRendered);
        return controls.flatMap((control) => {
          const controlBox = control.getBoundingClientRect();
          const label = control.getAttribute("aria-label")
            ?? control.getAttribute("data-testid")
            ?? control.tagName.toLowerCase();
          const results: string[] = [];
          if (
            controlBox.left < -1
            || controlBox.top < -1
            || controlBox.right > window.innerWidth + 1
            || controlBox.bottom > window.innerHeight + 1
          ) {
            results.push(`${label} leaves viewport (${Math.round(controlBox.left)},${Math.round(controlBox.top)} ${Math.round(controlBox.width)}x${Math.round(controlBox.height)})`);
          }
          results.push(...protectedElements.flatMap(([protectedName, protectedElement]) => {
            if (!protectedElement || !isRendered(protectedElement)) return [];
            const protectedBox = protectedElement.getBoundingClientRect();
            if (!overlaps(controlBox, protectedBox)) return [];
            return [`${label} overlaps ${protectedName}`];
          }));
          return results;
        });
      });
      violations.push(...levelViolations.map((violation) => `${viewport.name} ${String(index + 1).padStart(3, "0")} ${definition.slug}: ${violation}`));
    }
  }

  forcedCheatIndex = null;
  expect(violations).toEqual([]);
});

test("each production mechanism family has a natural browser path to ARMED", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "Mechanism-family audit runs once on desktop Chromium.");
  test.skip(true, "Superseded by the 100 dedicated desktop/mobile level contracts, which verify each authored ARMED path without generic controller shortcuts.");
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

    if (controller === "corner-repair") {
      const piece = scene.getByRole("button", { name: "Loose paper corner" });
      await piece.focus();
      await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowDown");
    } else if (controller === "light-drag") {
      const lamp = scene.getByRole("button", { name: "Amber lamp" }); await lamp.focus();
      for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
    } else if (controller === "frame-drag") {
      const frame = scene.getByRole("button", { name: "Empty window frame" }); await frame.focus();
      for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
    } else if (["orbit", "edge-route", "shared-control"].includes(controller)) {
      const piece = scene.getByRole("button", { name: "Interactive scene piece" });
      await piece.focus();
      for (let step = 0; step < 7; step += 1) await page.keyboard.press("ArrowRight");
    } else if (controller === "resize") {
      const ring = scene.getByRole("button", { name: "Resizable inner ring" }); await ring.focus();
      await page.keyboard.press("+"); await page.keyboard.press("+"); await page.keyboard.press("+");
    } else if (controller === "coupled-drag") {
      const horizontal = scene.getByRole("button", { name: "Broken horizontal ribbon" });
      await horizontal.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
      const vertical = scene.getByRole("button", { name: "Broken vertical ribbon" });
      await vertical.focus(); await page.keyboard.press("ArrowUp");
    } else if (controller === "wave-align") {
      const strip = scene.getByRole("button", { name: "Upper waveform strip" });
      await strip.focus();
      for (let step = 0; step < 4; step += 1) await page.keyboard.press("ArrowRight");
    } else if (controller === "patient-hold") {
      const core = scene.getByRole("button", { name: "Central paper axis" });
      await core.focus(); await page.keyboard.down("Space"); await page.waitForTimeout(1_100); await page.keyboard.up("Space");
    } else if (controller === "word-shift") {
      const tiles = scene.getByRole("button", { name: /Letter/ });
      for (let tile = 0; tile < 4; tile += 1) { await tiles.nth(tile).click(); await tiles.nth(tile).click(); }
    } else if (controller === "shadow-sort") {
      const first = scene.getByRole("button", { name: "Paper disc 1" }); await first.focus();
      await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
      const second = scene.getByRole("button", { name: "Paper disc 2" }); await second.focus();
      await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
      const third = scene.getByRole("button", { name: "Paper disc 3" }); await third.focus(); await page.keyboard.press("Enter");
    } else if (controller === "trace") {
      const traceSurface = scene.getByRole("application", { name: "Rub out the hidden zero" });
      await traceSurface.focus();
      await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowUp");
    } else if (controller === "layer-stack") {
      const sheet = scene.getByRole("button", { name: "Transparent middle sheet" }); await sheet.focus(); await page.keyboard.press("Enter");
      const left = scene.getByRole("button", { name: "Left coral shell" }); await left.focus(); await page.keyboard.press("ArrowRight");
      const right = scene.getByRole("button", { name: "Right coral shell" }); await right.focus(); await page.keyboard.press("ArrowLeft");
    } else if (controller === "fold") {
      const left = scene.getByRole("button", { name: "Left page edge" }); await left.focus(); await page.keyboard.press("ArrowRight");
      const right = scene.getByRole("button", { name: "Right page edge" }); await right.focus(); await page.keyboard.press("ArrowLeft");
    } else if (controller === "flip") {
      const middle = scene.getByRole("button", { name: "Arc paper piece 2" });
      await middle.focus(); await page.keyboard.press("Enter");
    } else if (controller === "rotate") {
      await solveCatchWake(page, scene);
    } else if (controller === "focus-route") {
      const halos = scene.getByRole("button", { name: /Outer halo/ });
      for (let index = 0; index < 3; index += 1) await halos.nth(index).focus();
    } else if (controller === "rhythm") {
      const beat = scene.getByRole("button", { name: "Answer the visible rhythm" });
      await beat.click(); await page.waitForTimeout(300); await beat.click(); await page.waitForTimeout(300); await beat.click();
    } else if (controller === "wheel-echo") {
      await board.focus(); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown");
    } else if (controller === "cover-return") {
      const cover = scene.getByRole("button", { name: "Cover the paper" }); await cover.click(); await scene.getByRole("button", { name: "Uncover the paper" }).click();
    } else if (controller === "constellation") {
      const left = scene.getByRole("button", { name: "Move left stars inward" });
      const right = scene.getByRole("button", { name: "Move right stars inward" });
      await left.focus(); await page.keyboard.press("ArrowRight");
      await right.focus(); await page.keyboard.press("ArrowLeft");
      for (const star of await scene.locator("[data-testid^='constellation-route-star-']").all()) {
        await star.focus(); await page.keyboard.press("Enter");
      }
      const trace = scene.getByRole("application", { name: "Draw the empty V" });
      await trace.focus(); await page.keyboard.down("v"); await page.waitForTimeout(700); await page.keyboard.up("v");
    }

    await expect(page.getByText("You found the crack in time"), `${id} ${V2_LEVELS[id - 1].slug}`).toBeVisible();
  }
  forcedCheatIndex = null;
});

test("levels 001 through 012 complete their authored critical path", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-1440", "The complete opening-chapter audit runs once.");
  test.setTimeout(900_000);
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

  const looseCorner = page.getByRole("button", { name: "Loose paper corner" });
  await looseCorner.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");
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
