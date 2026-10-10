import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.hoisted(() => { process.env.NEXT_PUBLIC_TIME_HACKER_REASONING_CAMPAIGN = "1"; });
import { TimeHackerApp } from "@/components/time-hacker-app";
import { LocaleProvider } from "@/i18n/locale-provider";
import { CHEAT_DEFINITIONS, evaluateCheatTrigger } from "@/game/cheats";
import { REASONING_CAMPAIGN } from "@/game/reasoning-campaign/catalog";
import { solve } from "@/game/reasoning-campaign/engine";
import type { CheatEvent } from "@/game/types";

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); });
const first = CHEAT_DEFINITIONS.find(c => c.triggerConfig.reasoning?.ordinal === 1)!;
const second = CHEAT_DEFINITIONS.find(c => c.triggerConfig.reasoning?.ordinal === 2)!;

function setup(options: { missCount?: number; completionErrors?: number; dashboardErrors?: number; startErrors?: number; ordinal?: number } = {}) {
  let starts = 0, completions = 0, unlocked = false;
  let completionErrors = options.completionErrors ?? 0;
  let dashboardErrors = options.dashboardErrors ?? 0;
  let startErrors = options.startErrors ?? 0;
  const completionsSent: Array<{ url: string; body: { events: CheatEvent[]; durationMs: number; wallDurationMs: number } }> = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("/api/dashboard")) {
      if (completions > 0 && dashboardErrors-- > 0) return Response.json({ error: "offline" }, { status: 503 });
      return Response.json({
        player: { playerId: "first-loop", displayName: "Test", nickname: null, currentLevel: unlocked ? 2 : 1, totalGames: completions, successGames: unlocked ? 1 : 0, bestErrorMs: null, firstSuccessAt: null, unlockedCheats: unlocked ? 1 : 0 },
        daily: { limit: 50, attempts: starts, remaining: 50 - starts, resetsAt: "2026-10-12T00:00:00Z" },
        difficulty: 1, maximumDifficulty: 1, suggestedCheat: unlocked || options.ordinal === 2 ? second : first,
        campaign: { track: "SOFT_LAUNCH", totalLevels: 12, completedLevels: unlocked ? 1 : 0, currentLevelNumber: unlocked ? 2 : 1, complete: false }, collection: [],
      });
    }
    if (url === "/api/games/start") {
      if (startErrors-- > 0) return Response.json({ error: "offline" }, { status: 503 });
      return Response.json({ game: { id: `game-${++starts}` } });
    }
    if (url.endsWith("/complete")) {
      const body = JSON.parse(String(init?.body));
      completionsSent.push({ url, body });
      if (completionErrors-- > 0) return Response.json({ error: "offline" }, { status: 503 });
      completions++;
      const assisted = evaluateCheatTrigger(first.triggerConfig, body.events);
      const success = completions > (options.missCount ?? 0);
      unlocked = success && assisted;
      return Response.json({ game: { id: `game-${starts}`, durationMs: success ? 10000 : 9000, errorMs: success ? 0 : -1000, absoluteErrorMs: success ? 0 : 1000, success, mode: "HACKER", usedCheat: assisted ? { slug: first.slug, name: first.name } : null } });
    }
    return Response.json({ player: { playerId: "first-loop" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<LocaleProvider initialLocale="zh"><TimeHackerApp /></LocaleProvider>);
  return { fetchMock, completionsSent, starts: () => starts };
}

async function solveFirst() {
  await screen.findByTestId("reasoning-scene");
  solve(REASONING_CAMPAIGN[0].puzzle)!.forEach(action => fireEvent.click(screen.getByTestId(`reasoning-action-${action}`)));
}
async function clickPrimary(text: string) {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`^${text}`) }));
}

it("retains the solved board and valid assist evidence over two misses, then opens level two without its assist", async () => {
  const mock = setup({ missCount: 2 });
  await solveFirst();
  expect(screen.getByText("你借到了 3 秒。")).toBeInTheDocument();
  await clickPrimary("开始停表");
  await clickPrimary("停止");
  for (let i = 0; i < 2; i++) {
    await screen.findByText("机关已经解开，减速仍然有效。再试一次停表即可。");
    expect(screen.getByTestId("reasoning-scene")).toHaveAttribute("data-solved", "true");
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
    await clickPrimary("重试停表");
    expect(screen.getByTestId("reasoning-scene").querySelectorAll("output")[0]).toHaveTextContent("10");
    await clickPrimary("停止");
  }
  await screen.findByText("第一关「借来的秒」完成");
  expect(mock.starts()).toBe(3);
  expect(new Set(mock.completionsSent.map(c => c.url)).size).toBe(3);
  for (const call of mock.completionsSent) expect(evaluateCheatTrigger(first.triggerConfig, call.body.events)).toBe(true);
  await clickPrimary("进入第二关");
  expect(await screen.findByRole("heading", { name: "满格之后" })).toBeInTheDocument();
  expect(screen.getByTestId("reasoning-scene")).toHaveAttribute("data-solved", "false");
  expect(document.querySelector(".play-timer")).not.toHaveClass("has-secret");
  expect(mock.starts()).toBe(3);
});

it("does not unlock a level on an unassisted timing success", async () => {
  const mock = setup();
  await screen.findByTestId("reasoning-scene");
  await clickPrimary("开始");
  await clickPrimary("停止");
  await screen.findByText("命中 10 秒！解开机关后才能完成本关。");
  expect(screen.queryByRole("button", { name: /^进入第二关/ })).not.toBeInTheDocument();
  await clickPrimary("返回解谜");
  expect(screen.getByTestId("reasoning-scene")).toHaveAttribute("data-solved", "false");
  expect(mock.starts()).toBe(1);
});

it("retries an unknown result with the original game and frozen stop payload", async () => {
  const mock = setup({ completionErrors: 1 });
  await solveFirst();
  await clickPrimary("开始停表");
  await clickPrimary("停止");
  await screen.findByText("结果暂未确认，请重试确认本局。");
  expect(screen.queryByText("停早了。")).not.toBeInTheDocument();
  await clickPrimary("重试确认结果");
  await screen.findByText("第一关「借来的秒」完成");
  expect(mock.completionsSent[1]).toEqual(mock.completionsSent[0]);
  expect(mock.starts()).toBe(1);
});

it("recovers a dashboard failure without resubmitting an already confirmed completion", async () => {
  const mock = setup({ dashboardErrors: 1 });
  await solveFirst();
  await clickPrimary("开始停表");
  await clickPrimary("停止");
  await clickPrimary("重试确认结果");
  await screen.findByText("第一关「借来的秒」完成");
  expect(mock.completionsSent).toHaveLength(1);
  expect(mock.starts()).toBe(1);
});

it("retains real solve evidence after a failed start and blocks duplicate starts", async () => {
  const mock = setup({ startErrors: 1 });
  await solveFirst();
  await clickPrimary("开始停表");
  await waitFor(() => expect(mock.fetchMock.mock.calls.filter(([url]) => url === "/api/games/start")).toHaveLength(1));
  const start = await screen.findByRole("button", { name: /^开始停表/ });
  fireEvent.click(start); fireEvent.click(start);
  await clickPrimary("停止");
  await screen.findByText("第一关「借来的秒」完成");
  expect(mock.starts()).toBe(1);
  expect(evaluateCheatTrigger(first.triggerConfig, mock.completionsSent[0].body.events)).toBe(true);
});

it("leaves the second level on the existing interaction path", async () => {
  setup({ ordinal: 2 });
  await screen.findByTestId("reasoning-scene");
  expect(screen.queryByText("你借到了 3 秒。")).not.toBeInTheDocument();
  await clickPrimary("开始");
  await screen.findByRole("button", { name: /^停止/ });
  expect(screen.queryByTestId("reasoning-scene")).not.toBeInTheDocument();
});
