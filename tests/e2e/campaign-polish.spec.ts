import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { CHEAT_DEFINITIONS, evaluateCheatTrigger } from "../../src/game/cheats";
import { REASONING_CAMPAIGN } from "../../src/game/reasoning-campaign/catalog";
import { solve } from "../../src/game/reasoning-campaign/engine";
import { effectElapsedTime, effectToleranceMs } from "../../src/game/effects";
import { measureGame } from "../../src/game/timer";

test("100 real DOM puzzles: assisted miss, retained retry, win, next; terminal reload and menus", async ({ page }, info) => {
  const en = info.project.name.includes("en");
  let ordinal = 1, starts = 0, completions = 0, nickname = "", rankRequests = 0;
  const definitions = [...CHEAT_DEFINITIONS].sort((a, b) => a.triggerConfig.reasoning!.ordinal - b.triggerConfig.reasoning!.ordinal);
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/api/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/player") {
      if (route.request().method() === "PATCH") nickname = route.request().postDataJSON().nickname;
      return route.fulfill({ json: { player: { playerId: "fixture-campaign" } } });
    }
    if (url.pathname === "/api/playtest/events") return route.fulfill({ json: { ok: true } });
    if (url.pathname === "/api/dashboard") return route.fulfill({ json: {
      player: { playerId: "fixture-campaign", displayName: "Fixture", nickname, currentLevel: 20, totalGames: completions, successGames: ordinal - 1, bestErrorMs: 0, firstSuccessAt: ordinal > 1 ? "2026-10-10T00:00:00Z" : null, unlockedCheats: ordinal - 1 },
      // Multi-day campaign fixture: never connected to a database or subject to today's quota.
      daily: { limit: 50, attempts: 0, remaining: 50, resetsAt: "2026-10-12T00:00:00Z" },
      difficulty: Math.min(5, Math.ceil(ordinal / 20)), maximumDifficulty: 5, suggestedCheat: definitions[ordinal - 1] ?? null,
      campaign: { track: ordinal > 12 ? "FULL" : "SOFT_LAUNCH", totalLevels: ordinal > 12 ? 100 : 12, completedLevels: ordinal - 1, currentLevelNumber: ordinal <= 100 ? ordinal : null, complete: ordinal === 101 },
      collection: [...definitions].reverse().map((d, i) => ({ ...d, unlocked: 100 - i < ordinal })),
    } });
    if (url.pathname === "/api/games/start") return route.fulfill({ json: { game: { id: `fixture-${++starts}` } } });
    if (url.pathname.endsWith("/complete")) {
      completions++;
      const body = route.request().postDataJSON();
      const d = definitions[ordinal - 1];
      const assisted = evaluateCheatTrigger(d.triggerConfig, body.events);
      expect(assisted).toBe(true);
      const measurement = measureGame(effectElapsedTime(body.wallDurationMs, d.effectConfig), 10000, effectToleranceMs(d.effectConfig));
      if (measurement.success) ordinal++;
      return route.fulfill({ json: { game: { id: `fixture-${starts}`, ...measurement, mode: "HACKER", usedCheat: d } } });
    }
    if (url.pathname === "/api/rankings") {
      rankRequests++;
      return rankRequests === 1 ? route.fulfill({ status: 503, json: { error: "offline" } })
        : route.fulfill({ json: { timeHackers: [], perfectTiming: [], cheatMasters: [] } });
    }
    throw new Error(`Unexpected API: ${url.pathname}`);
  });
  await page.context().addCookies([{ name: "time-hacker.locale", value: en ? "en" : "zh", url: "http://127.0.0.1:3011" }]);
  await page.clock.install();
  await page.goto("/");
  const board = page.getByTestId("reasoning-scene"), primary = page.locator(".play-button");
  const evidence = path.resolve("test-results/campaign-polish");
  await mkdir(evidence, { recursive: true });
  for (const level of REASONING_CAMPAIGN) {
    await expect(board).toHaveAttribute("data-solved", "false");
    await expect(board.getByRole("heading")).toHaveText(level.title[en ? "en" : "zh"]);
    for (const action of solve(level.puzzle)!) await page.getByTestId(`reasoning-action-${action}`).click();
    await expect(board).toHaveAttribute("data-solved", "true");
    await expect(primary).toHaveText(en ? "Start timer" : "开始停表");
    if ([1, 3, 4, 5, 6, 7, 80, 99, 100].includes(level.ordinal)) {
      await page.screenshot({ path: path.join(evidence, `${info.project.name}-${level.ordinal}-solved.png`), fullPage: true });
    }
    const y = await primary.evaluate(el => el.getBoundingClientRect().top + window.scrollY);
    await primary.click();
    await expect(primary).toHaveText(en ? "STOP" : "停止");
    expect(Math.abs(await primary.evaluate(el => el.getBoundingClientRect().top + window.scrollY) - y)).toBeLessThan(2);
    await primary.click();
    await expect(primary).toHaveText(en ? "Retry timer" : "重试停表");
    await expect(board).toHaveAttribute("data-solved", "true");
    const beforeStart = await page.evaluate(() => performance.now());
    await primary.click();
    await expect(primary).toHaveText(en ? "STOP" : "停止");
    const elapsed = await page.evaluate(() => performance.now()) - beforeStart;
    await page.clock.fastForward(Math.max(0, 15500 - elapsed));
    await expect(page.locator(".timer-readout span")).toHaveText("10.00");
    await primary.click();
    await expect(primary).toContainText(level.ordinal === 100 ? en ? "View completed archive" : "查看通关档案" : en ? "Enter level" : "进入第");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await primary.click();
  }
  expect(starts).toBe(200); expect(completions).toBe(200);
  await expect(page.locator(".collection-grid article")).toHaveCount(100);
  await expect(page.locator(".collection-grid article").first()).toContainText(REASONING_CAMPAIGN[0].title[en ? "en" : "zh"]);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByRole("heading", { name: en ? "All 100 levels complete" : "100 关已完成" })).toBeVisible();
  await expect(primary).toHaveCount(0);
  await page.getByRole("button", { name: en ? "Open game menu" : "打开游戏菜单" }).click();
  await expect(page.locator(".difficulty-control")).toHaveCount(0);
  await page.locator("#nickname").fill("Campaign Test");
  await page.locator('.nickname-form button').click();
  await expect(page.locator('.nickname-form [role="status"]')).toHaveText(en ? "Name saved." : "昵称已保存。");
  await page.locator('.reset-link').click();
  await page.locator('.reset-dialog .dialog-actions button').first().click();
  await expect(page.locator('.reset-dialog')).toHaveCount(0);
  await page.getByRole('button', { name: en ? 'Leaderboard' : '排行榜', exact: true }).click();
  await page.getByRole('button', { name: en ? 'Try again' : '再试一次', exact: true }).click();
  await expect(page.locator('.empty-rank')).toHaveCount(3);
  await page.getByRole('button', { name: en ? 'Back to game menu' : '返回游戏菜单' }).click();
  await page.locator('.game-drawer button').first().focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('.reset-link')).toBeFocused();
  expect(errors).toEqual([]);
});
