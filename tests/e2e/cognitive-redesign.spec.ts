import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { CHEAT_DEFINITIONS } from "../../src/game/cheats";
import { FULL_COGNITIVE_CAMPAIGN } from "../../src/game/full-cognitive-campaign";

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
  await expect(page.getByTestId("cognitive-evidence-gate")).toHaveAttribute("data-level", String(levelId).padStart(3, "0"));
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

test("representative chapter boundaries reveal the original scene only after the evidence chain", async ({ page }, testInfo) => {
  for (const id of [1, 12, 13, 36, 37, 60, 61, 84, 85, 100]) {
    const definition = FULL_COGNITIVE_CAMPAIGN[id - 1];
    await openLevel(page, id);
    await expect(page.getByTestId("puzzle-scene")).toHaveCount(0);
    await expect(page.getByTestId("spatial-time-field")).toHaveAttribute("aria-hidden", "true");
await expect(page.getByTestId("spatial-time-field")).toHaveCSS("pointer-events", "none");
    if (id === 1 || id === 100) {
      const screenshotDir = path.resolve("artifacts", "screenshots", "cognitive-redesign", testInfo.project.name);
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({ path: path.join(screenshotDir, `level-${String(id).padStart(3, "0")}-evidence.png`), fullPage: true });
    }
    const gateBox = await page.getByTestId("cognitive-evidence-gate").boundingBox();
    const timerBox = await page.locator(".stopwatch-card").boundingBox();
    expect(gateBox).not.toBeNull();
    expect(timerBox).not.toBeNull();
    expect(gateBox!.y + gateBox!.height).toBeLessThanOrEqual(timerBox!.y + 2);
    for (const probeId of definition.sequence) {
      const probe = page.getByTestId(`cognitive-probe-${probeId}`);
      await probe.scrollIntoViewIfNeeded();
      await probe.click();
    }
await expect(page.getByTestId("puzzle-scene")).toHaveAttribute("data-v2-slug", definition.slug);
    await expect(page.getByTestId("cognitive-evidence-gate")).toHaveCount(0);
    if (id === 1 || id === 100) {
      const screenshotDir = path.resolve("artifacts", "screenshots", "cognitive-redesign", testInfo.project.name);
      await page.screenshot({ path: path.join(screenshotDir, `level-${String(id).padStart(3, "0")}-puzzle.png`), fullPage: true });
    }
  }
});

test("all 100 contracts expose semantic evidence controls without answer copy in H0", async ({ page }) => {
  for (const definition of FULL_COGNITIVE_CAMPAIGN) {
    await openLevel(page, definition.id);
const probes = page.getByTestId("cognitive-evidence-gate").getByRole("button");
    await expect(probes).toHaveCount(definition.probes.length);
    const geometry = await probes.evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    }));
    for (let a = 0; a < geometry.length; a += 1) {
      expect(geometry[a].width).toBeGreaterThanOrEqual(44);
      expect(geometry[a].height).toBeGreaterThanOrEqual(44);
      for (let b = a + 1; b < geometry.length; b += 1) {
        const overlapWidth = Math.max(0, Math.min(geometry[a].right, geometry[b].right) - Math.max(geometry[a].left, geometry[b].left));
        const overlapHeight = Math.max(0, Math.min(geometry[a].bottom, geometry[b].bottom) - Math.max(geometry[a].top, geometry[b].top));
        expect(overlapWidth * overlapHeight).toBeLessThan(44);
      }
    }
    await expect(page.getByText(definition.answer.en, { exact: true })).toHaveCount(0);
  }
});
