import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { CHEAT_DEFINITIONS, evaluateCheatTrigger } from "../../src/game/cheats";
import { effectElapsedTime, effectToleranceMs } from "../../src/game/effects";
import { measureGame } from "../../src/game/timer";
import type { CheatEvent } from "../../src/game/types";

// All API calls stay in browser fixtures. No player or game database is used.
test("first lesson: solve, miss twice, stop at 10.00, enter the next unsolved lesson", async ({ page }, testInfo) => {
  const zh = !testInfo.project.name.includes("english");
  const first = CHEAT_DEFINITIONS.find(c => c.triggerConfig.reasoning?.ordinal === 1)!;
  const second = CHEAT_DEFINITIONS.find(c => c.triggerConfig.reasoning?.ordinal === 2)!;
  let unlocked = false, starts = 0;
  const calls: Array<{ id: string; assisted: boolean }> = [];
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/player") return route.fulfill({ json: { player: { playerId: "isolated-first-level" } } });
    if (url.pathname === "/api/playtest/events") return route.fulfill({ json: { ok: true } });
    if (url.pathname === "/api/dashboard") return route.fulfill({ json: {
      player: { playerId: "isolated-first-level", displayName: "Local test", nickname: null, currentLevel: unlocked ? 2 : 1, totalGames: calls.length, successGames: unlocked ? 1 : 0, bestErrorMs: unlocked ? 0 : null, firstSuccessAt: unlocked ? "2026-10-10T00:00:00Z" : null, unlockedCheats: unlocked ? 1 : 0 },
      daily: { limit: 50, attempts: starts, remaining: 50 - starts, resetsAt: "2026-10-12T00:00:00Z" },
      difficulty: 1, maximumDifficulty: 1, suggestedCheat: unlocked ? second : first,
      campaign: { track: "SOFT_LAUNCH", totalLevels: 12, completedLevels: unlocked ? 1 : 0, currentLevelNumber: unlocked ? 2 : 1, complete: false }, collection: [],
    } });
    if (url.pathname === "/api/games/start") return route.fulfill({ json: { game: { id: `local-${++starts}` } } });
    if (url.pathname.endsWith("/complete")) {
      const body = route.request().postDataJSON() as { events: CheatEvent[]; wallDurationMs: number };
      const assisted = evaluateCheatTrigger(first.triggerConfig, body.events);
      const effect = assisted ? first.effectConfig : null;
      const measurement = measureGame(effectElapsedTime(body.wallDurationMs, effect), 10000, effectToleranceMs(effect));
      calls.push({ id: url.pathname, assisted });
      unlocked = assisted && measurement.success;
      return route.fulfill({ json: { game: { id: `local-${starts}`, ...measurement, mode: "HACKER", wallDurationMs: body.wallDurationMs, toleranceMs: effectToleranceMs(effect), assistanceType: effect?.type ?? null, assignedCheat: first, usedCheat: assisted ? first : null } } });
    }
    throw new Error(`Unexpected API access: ${url.pathname}`);
  });
  await page.context().addCookies([{ name: "time-hacker.locale", value: zh ? "zh" : "en", url: "http://127.0.0.1:3011" }]);
  await page.goto("/");
  const board = page.getByTestId("reasoning-scene");
  await expect(board).toBeVisible();
  const primary = page.locator(".play-button");
  const screenshot = async (name: string) => {
    if (name === "retry" || name === "success") await expect(page.locator(".simple-result")).toHaveCSS("opacity", "1");
    if (name === "next") await expect(page.locator(".simple-result")).toHaveCount(0);
    const dir = path.resolve("test-results", "first-level-evidence");
    await mkdir(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `${testInfo.project.name}-${name}.png`), fullPage: true });
  };
  // Solve via exposed controls; no internal game-state injection.
  for (const action of [1, 2, 0, 1]) {
    await page.getByTestId(`reasoning-action-${action}`).focus();
    await page.keyboard.press("Enter");
  }
  await expect(board).toHaveAttribute("data-solved", "true");
  await expect(page.getByText(zh ? "你借到了 3 秒。" : "You borrowed 3 seconds.", { exact: true })).toBeVisible();
  await screenshot("solved");
  await primary.scrollIntoViewIfNeeded();
  const box = await primary.boundingBox();
  for (let attempt = 0; attempt < 2; attempt++) {
    await primary.click();
    await expect(primary).toHaveText(zh ? "停止" : "STOP");
    await expect(board).toHaveAttribute("data-solved", "true");
    await expect(page.getByTestId("reasoning-action-0")).toBeDisabled();
    const runningBox = await primary.boundingBox();
    expect(Math.abs(runningBox!.y - box!.y)).toBeLessThan(2);
    await primary.click();
    await expect(primary).toHaveText(zh ? "重试停表" : "Retry timer");
  }
  await screenshot("retry");
  await primary.click();
  await expect(page.locator(".first-level-assist")).toHaveText(zh ? "时间放慢了" : "Time has slowed", { timeout: 14000 });
  await expect(page.locator(".timer-readout span")).toHaveText("10.00", { timeout: 8000 });
  await expect(page.locator(".first-level-assist")).toHaveText(zh ? "现在，按停" : "Now, press stop");
  await primary.press("Enter");
  await expect(primary).toHaveText(zh ? "进入第二关" : "Enter level 2");
  await screenshot("success");
  expect(calls).toHaveLength(3);
  expect(calls.every(c => c.assisted)).toBe(true);
  expect(new Set(calls.map(c => c.id)).size).toBe(3);
  await primary.click();
  await expect(board).toHaveAttribute("data-solved", "false");
  await expect(page.getByRole("heading", { name: zh ? second.nameZh : second.name, exact: true })).toBeVisible();
  await expect(page.locator(".play-timer")).not.toHaveClass(/has-secret/);
  await expect(primary).toHaveText(zh ? "开始" : "START");
  expect(starts).toBe(3);
  await screenshot("next");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
