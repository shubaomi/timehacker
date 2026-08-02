import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TimeHackerApp } from "@/components/time-hacker-app";
import { CHEAT_DEFINITIONS } from "@/game/cheats";

const fixedPlayerId = "44c26e31-f4f7-4e01-9cbd-ecbd6bc4b8c1";

function dashboard() {
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
    suggestedCheat: CHEAT_DEFINITIONS[0],
    collection: CHEAT_DEFINITIONS.map((cheat, index) => ({
      slug: cheat.slug,
      name: index === 0 ? cheat.name : "CLASSIFIED",
      description: index === 0 ? cheat.description : null,
      difficulty: cheat.difficulty,
      category: cheat.category,
      unlocked: index === 0,
      completedAt: index === 0 ? "2026-08-02T00:00:00.000Z" : null,
    })),
  };
}

function installFetchMock(success = true) {
  const mock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith("/api/dashboard")) return Response.json(dashboard());
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
    render(<TimeHackerApp />);
    const start = await screen.findByRole("button", { name: /START.*SPACE/i });
    await userEvent.click(start);
    const stop = await screen.findByRole("button", { name: /STOP.*FREEZE/i });
    await userEvent.click(stop);
    expect(await screen.findByText("TIME HACKED!")).toBeInTheDocument();
    expect(screen.getAllByText("00:10.007")).toHaveLength(2);
  });

  it("renders the failed result state", async () => {
    installFetchMock(false);
    render(<TimeHackerApp />);
    await userEvent.click(await screen.findByRole("button", { name: /START.*SPACE/i }));
    await userEvent.click(await screen.findByRole("button", { name: /STOP.*FREEZE/i }));
    expect(await screen.findByText("TRY AGAIN")).toBeInTheDocument();
  });

  it("falls back to clipboard sharing", async () => {
    installFetchMock(true);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<TimeHackerApp />);
    await userEvent.click(await screen.findByRole("button", { name: /START.*SPACE/i }));
    await userEvent.click(await screen.findByRole("button", { name: /STOP.*FREEZE/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Share field report/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledOnce());
    expect(screen.getByText("Field report copied.")).toBeInTheDocument();
  });

  it("shows and cancels the scoped reset confirmation", async () => {
    installFetchMock(true);
    render(<TimeHackerApp />);
    await screen.findByRole("button", { name: /START.*SPACE/i });
    await userEvent.click(screen.getByRole("button", { name: /Reset progress/i }));
    expect(screen.getByRole("dialog", { name: /Reset your field record/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Keep progress" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
