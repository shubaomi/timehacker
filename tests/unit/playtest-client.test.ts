import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearPlaytestIdentity, trackPlaytestEvent } from "@/analytics/playtest-client";

describe("privacy-minimal playtest client", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/?entrySource=share");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-22T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("sends only the frozen pseudonymous contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
    vi.stubGlobal("fetch", fetchMock);
    await trackPlaytestEvent("first_interaction", "four-corner-breach");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(init.body));

    expect(payload.entrySource).toBe("share");
    expect(payload.browserId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(payload.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(payload.events[0]).toMatchObject({
      name: "first_interaction",
      levelSlug: "four-corner-breach",
    });
    expect(JSON.stringify(payload)).not.toMatch(/userAgent|referrer|ip|gesture|metadata/i);
  });

  it("rotates the session after 30 minutes and clears the browser identifier on reset", async () => {
    const payloads: Array<{ browserId: string; sessionId: string }> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      payloads.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 202 });
    }));
    await trackPlaytestEvent("level_view", "four-corner-breach");
    vi.setSystemTime(new Date("2026-08-22T12:31:00.000Z"));
    await trackPlaytestEvent("level_view", "breath-gap");
    expect(payloads[1].browserId).toBe(payloads[0].browserId);
    expect(payloads[1].sessionId).not.toBe(payloads[0].sessionId);

    clearPlaytestIdentity();
    await trackPlaytestEvent("level_view", "slow-command");
    expect(payloads[2].browserId).not.toBe(payloads[0].browserId);
  });
});
