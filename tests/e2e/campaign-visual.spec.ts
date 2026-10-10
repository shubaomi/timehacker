import { mkdir } from "node:fs/promises";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { CHEAT_DEFINITIONS, evaluateCheatTrigger } from "../../src/game/cheats";
import { REASONING_CAMPAIGN } from "../../src/game/reasoning-campaign/catalog";
import { solve } from "../../src/game/reasoning-campaign/engine";
import { effectElapsedTime, effectToleranceMs } from "../../src/game/effects";
import { measureGame } from "../../src/game/timer";

for (const initialOrdinal of [1, 3, 4, 5, 6, 7]) test(`real-time representative ${initialOrdinal}: feedback, retry, share and next`, async ({ page }, info) => {
  const en = info.project.name.includes("en"), locale = en ? "en" : "zh";
  const level = REASONING_CAMPAIGN[initialOrdinal - 1];
  const definition = CHEAT_DEFINITIONS.find(c => c.triggerConfig.reasoning?.ordinal === initialOrdinal)!;
  let ordinal = initialOrdinal, starts = 0;
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/dashboard") return route.fulfill({ json: {
      player: { playerId: "visual-fixture", displayName: "Fixture", nickname: null, currentLevel: 1, totalGames: starts, successGames: ordinal - 1, bestErrorMs: 0, firstSuccessAt: null, unlockedCheats: ordinal - 1 },
      daily: { limit: 50, attempts: starts, remaining: 50 - starts, resetsAt: "2026-10-12T00:00:00Z" }, difficulty: 1, maximumDifficulty: 1,
      suggestedCheat: CHEAT_DEFINITIONS.find(c => c.triggerConfig.reasoning?.ordinal === ordinal), collection: [],
      campaign: { track: "SOFT_LAUNCH", totalLevels: 100, completedLevels: ordinal - 1, currentLevelNumber: ordinal, complete: false },
    } });
    if (url.pathname === "/api/games/start") return route.fulfill({ json: { game: { id: `visual-${++starts}` } } });
    if (url.pathname.endsWith("/complete")) {
      const body = route.request().postDataJSON();
      expect(evaluateCheatTrigger(definition.triggerConfig, body.events)).toBe(true);
      const measurement = measureGame(effectElapsedTime(body.wallDurationMs, definition.effectConfig), 10000, effectToleranceMs(definition.effectConfig));
      if (measurement.success) ordinal++;
      return route.fulfill({ json: { game: { id: `visual-${starts}`, ...measurement, mode: "HACKER", usedCheat: definition } } });
    }
    if (url.pathname === "/api/player" || url.pathname === "/api/playtest/events") return route.fulfill({ json: { ok: true } });
    throw new Error(`Unexpected API ${url.pathname}`);
  });
  await page.context().addCookies([{ name: "time-hacker.locale", value: locale, url: "http://127.0.0.1:3011" }]);
  await page.goto("/");
  await expect(page.getByTestId("reasoning-scene")).toBeVisible();
  await page.getByRole("button", { name: en ? "Open game menu" : "打开游戏菜单" }).click();
  await page.locator(".drawer-nav button").first().click();
  await expect(page.locator(".game-drawer")).toHaveCount(0);
  await expect(page.getByTestId("reasoning-scene").locator("aside")).toBeVisible();
  for (const action of solve(level.puzzle)!) await page.getByTestId(`reasoning-action-${action}`).click();
  const primary = page.locator(".play-button");
  await primary.click(); await expect(primary).toHaveText(en ? "STOP" : "停止"); await primary.click();
  await expect(primary).toHaveText(en ? "Retry timer" : "重试停表");
  await primary.click();
  await expect(page.locator(".timer-readout span")).toHaveText("10.00", { timeout: 20000 });
  await primary.click();
  await expect(page.locator(".simple-result")).toHaveCSS("opacity", "1");
  const dir = path.resolve("test-results/campaign-real-time"); await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${info.project.name}-${initialOrdinal}.png`), fullPage: true });
  await page.locator(".simple-result button").click();
  await expect(page.locator(".share-card-preview img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".share-card-dialog")).toHaveCount(0);
  await primary.click();
  await expect(page.getByTestId("reasoning-scene")).toHaveAttribute("data-solved", "false");
  await expect(page.locator(".simple-result")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: REASONING_CAMPAIGN[initialOrdinal].title[locale], exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
