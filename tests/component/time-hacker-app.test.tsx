import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeHackerApp } from "@/components/time-hacker-app";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { LocaleProvider } from "@/i18n/locale-provider";

vi.mock("@/game/share-card", () => ({
  createShareCardDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,iVBORw0KGgo="),
  createShareCardBlob: vi.fn().mockResolvedValue(new Blob(["card"], { type: "image/png" })),
  downloadShareCard: vi.fn(),
}));

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

function installFetchMock(
  success = true,
  suggestedCheat = CHEAT_DEFINITIONS[0],
  nextSuggestedCheat = suggestedCheat,
) {
  let dashboardCalls = 0;
  const mock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    void _init;
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith("/api/dashboard")) {
      const assigned = dashboardCalls === 0 ? suggestedCheat : nextSuggestedCheat;
      dashboardCalls += 1;
      return Response.json(dashboard(assigned));
    }
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
    expect(await screen.findByText("Perfect hit! You conquered time.")).toBeInTheDocument();
    expect(screen.getAllByText("10.00")).toHaveLength(2);
  });

  it("renders the failed result state", async () => {
    installFetchMock(false);
    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /START.*Space or Enter/i }));
    await userEvent.click(await screen.findByRole("button", { name: /STOP.*Space or Enter/i }));
    expect(await screen.findByText("So close. Again?")).toBeInTheDocument();
  });

  it("opens an in-app image card without invoking native sharing", async () => {
    installFetchMock(true);
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: nativeShare });
    renderApp();
    await userEvent.click(await screen.findByRole("button", { name: /START.*Space or Enter/i }));
    await userEvent.click(await screen.findByRole("button", { name: /STOP.*Space or Enter/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Share result/i }));
    expect(await screen.findByRole("dialog", { name: "Result image card" })).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Time Hacker result image card preview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download image" })).toBeInTheDocument();
    expect(nativeShare).not.toHaveBeenCalled();
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

  it("keeps the home simple without automatic helper copy", async () => {
    const suggestedCheat = CHEAT_DEFINITIONS[0];
    installFetchMock(true, suggestedCheat);
    renderApp();
    await screen.findByRole("button", { name: /START.*Space or Enter/i });
    expect(screen.queryByText("Service input")).not.toBeInTheDocument();
    expect(screen.queryByText("Operator record")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cheat Catalog" })).not.toBeInTheDocument();
    expect(screen.queryByText("Tap once to start. Tap again to stop.")).not.toBeInTheDocument();
    expect(screen.queryByText("Stop as close to 10.00 as you can.")).not.toBeInTheDocument();
    expect(screen.queryByText(/hundredths move once per second/i)).not.toBeInTheDocument();
  });

  it("keeps the active scene fixed until Run again and hides it in result states", async () => {
    const first = CHEAT_DEFINITIONS[0];
    const second = CHEAT_DEFINITIONS[1];
    installFetchMock(true, first, second);
    renderApp();
    expect(await screen.findByTestId("puzzle-scene", {}, { timeout: 4_000 })).toHaveAttribute("data-scene-id", first.triggerConfig.puzzleScene?.sceneId);
    await userEvent.click(screen.getByRole("button", { name: /START.*Space or Enter/i }));
    await userEvent.click(await screen.findByRole("button", { name: /STOP.*Space or Enter/i }));
    expect(screen.queryByTestId("puzzle-scene")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Run again.*Space or Enter/i }));
    expect(await screen.findByTestId("puzzle-scene")).toHaveAttribute("data-scene-id", second.triggerConfig.puzzleScene?.sceneId);
  });
});
