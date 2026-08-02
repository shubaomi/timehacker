import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeHackerApp } from "@/components/time-hacker-app";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { LocaleProvider } from "@/i18n/locale-provider";

const fixedPlayerId = "44c26e31-f4f7-4e01-9cbd-ecbd6bc4b8c1";

function dashboard(suggestedCheat = CHEAT_DEFINITIONS[0]) {
  return {
    player: {
      playerId: fixedPlayerId,
      displayName: "Agent B8C1",
      nickname: null,
      currentLevel: 2,
      totalGames: 1,
      successGames: 1,
      bestErrorMs: 7,
      firstSuccessAt: "2026-08-02T00:00:00.000Z",
      unlockedCheats: 1,
    },
    daily: { limit: 50, attempts: 1, remaining: 49, resetsAt: "2026-08-03T00:00:00.000Z" },
    difficulty: 1,
    maximumDifficulty: 1,
    suggestedCheat,
    collection: CHEAT_DEFINITIONS.map((cheat, index) => ({
      slug: cheat.slug,
      name: index === 0 ? cheat.name : "CLASSIFIED",
      nameZh: index === 0 ? cheat.nameZh : "机密",
      description: index === 0 ? cheat.description : null,
      descriptionZh: index === 0 ? cheat.descriptionZh : null,
      difficulty: cheat.difficulty,
      category: cheat.category,
      unlocked: index === 0,
      completedAt: index === 0 ? "2026-08-02T00:00:00.000Z" : null,
    })),
  };
}

function renderApp() {
  return render(
    <LocaleProvider initialLocale="en">
      <TimeHackerApp />
    </LocaleProvider>,
  );
}

function installFetchMock(success = true, suggestedCheat = CHEAT_DEFINITIONS[0]) {
  const mock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    void _init;
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith("/api/dashboard")) return Response.json(dashboard(suggestedCheat));
    if (url === "/api/rankings") return Response.json({ timeHackers: [], perfectTiming: [], cheatMasters: [] });
    if (url === "/api/games/start") return Response.json({ game: { id: "game-1" } }, { status: 201 });
    if (url === "/api/games/game-1/complete") {
      return Response.json({
        game: {
          id: "game-1",
          durationMs: success ? 10_007 : 9_900,
          errorMs: success ? 7 : -100,
          absoluteErrorMs: success ? 7 : 100,
          success,
          mode: "HACKER",
          assignedCheat: { slug: "five-finger-echo", name: "Five-Finger Echo" },
          usedCheat: null,
        },
      });
    }
    return Response.json({ player: { playerId: fixedPlayerId } });
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

async function completeSecretGesture(pattern: readonly string[]) {
  await userEvent.click(screen.getByRole("button", { name: "Something is glimmering here" }));
  const surface = screen.getByRole("group", { name: "Hidden gesture area" });
  surface.focus();
  const keys: Record<string, string> = {
    up: "[ArrowUp]",
    down: "[ArrowDown]",
    left: "[ArrowLeft]",
    right: "[ArrowRight]",
    tap: "[Enter]",
    hold: "h",
  };
  for (const gesture of pattern) await userEvent.keyboard(keys[gesture]);
}

describe("TimeHackerApp", () => {
  beforeEach(() => {
    localStorage.setItem("time-hacker.player-id.v1", fixedPlayerId);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("moves through READY, RUNNING, and successful STOPPED result states", async () => {
    installFetchMock(true);
    renderApp();
    const start = await screen.findByRole("button", { name: /START.*Space or Enter/i });
    await userEvent.click(start);
    const stop = await screen.findByRole("button", { name: /STOP.*Space or Enter/i });
    await userEvent.click(stop);
    expect(await screen.findByText("You stopped it!")).toBeInTheDocument();
    expect(screen.getAllByText("10.00")).toHaveLength(2);
  });

  it("renders the failed result state", async () => {
    installFetchMock(false);
    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /START.*Space or Enter/i }));
    await userEvent.click(await screen.findByRole("button", { name: /STOP.*Space or Enter/i }));
    expect(await screen.findByText("So close. Again?")).toBeInTheDocument();
  });

  it("falls back to clipboard sharing", async () => {
    installFetchMock(true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /START.*Space or Enter/i }));
    await userEvent.click(await screen.findByRole("button", { name: /STOP.*Space or Enter/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Share result/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(screen.getByText("Field report copied.")).toBeInTheDocument();
  });

  it("shows and cancels the scoped reset confirmation", async () => {
    installFetchMock(true);
    renderApp();
    await screen.findByRole("button", { name: /START.*Space or Enter/i });
    await userEvent.click(screen.getByRole("button", { name: "Open game menu" }));
    await userEvent.click(screen.getByRole("button", { name: /Reset progress/i }));
    expect(screen.getByRole("dialog", { name: /Reset your progress/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Keep progress" }));
    expect(screen.queryByRole("dialog", { name: /Reset your progress/i })).not.toBeInTheDocument();
  });

  it("switches the complete interface to Chinese and persists the locale", async () => {
    installFetchMock(true);
    renderApp();
    await screen.findByRole("button", { name: /START.*Space or Enter/i });
    await userEvent.click(screen.getByRole("button", { name: "Open game menu" }));
    await userEvent.click(screen.getByRole("button", { name: /Language.*中文/i }));
    expect(screen.getByRole("heading", { name: /让时间停在.*10\.00 秒/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /开始.*空格键或回车键/ })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-Hans");
    expect(localStorage.getItem("time-hacker.locale.v1")).toBe("zh");
  });

  it("keeps the home simple and arms through the hidden gesture interaction", async () => {
    const suggestedCheat = CHEAT_DEFINITIONS[0];
    installFetchMock(true, suggestedCheat);
    renderApp();
    await screen.findByRole("button", { name: /START.*Space or Enter/i });
    expect(screen.queryByText("Service input")).not.toBeInTheDocument();
    expect(screen.queryByText("Operator record")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Secrets" })).not.toBeInTheDocument();
    await completeSecretGesture(suggestedCheat.triggerConfig.secretGesture!);
    expect(screen.getByText(/Time will be a little kinder/i)).toBeInTheDocument();
  });

  it(
    "retains a completed READY wait as server-verifiable evidence after START",
    async () => {
      const breathGap = CHEAT_DEFINITIONS.find(({ slug }) => slug === "breath-gap");
      expect(breathGap).toBeDefined();
      const fetchMock = installFetchMock(true, breathGap);
      renderApp();

      const start = await screen.findByRole("button", { name: /START.*Space or Enter/i });
      expect(await screen.findByText(/Time will be a little kinder/i, {}, { timeout: 4_000 })).toBeInTheDocument();
      await userEvent.click(start);
      await userEvent.click(await screen.findByRole("button", { name: /STOP.*Space or Enter/i }));

      const completionCall = fetchMock.mock.calls.find(([input]) =>
        String(input).includes("/api/games/game-1/complete"),
      );
      expect(completionCall).toBeDefined();
      const request = completionCall?.[1] as RequestInit;
      const body = JSON.parse(String(request.body)) as {
        events: Array<{ type: string; durationMs?: number }>;
      };
      expect(body.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: "READY_WAIT", durationMs: expect.any(Number) }),
        ]),
      );
      expect(
        body.events.find(({ type }) => type === "READY_WAIT")?.durationMs,
      ).toBeGreaterThanOrEqual(3_000);
    },
    10_000,
  );
});
