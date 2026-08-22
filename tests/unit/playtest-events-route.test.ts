import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  recordPlaytestEvents: vi.fn(),
  deleteBrowserPlaytestEvents: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { marker: "test-prisma" } }));
vi.mock("@/server/playtest-service", () => serviceMocks);

import { DELETE, POST } from "@/app/api/playtest/events/route";

const browserId = "00000000-0000-4000-8000-000000000001";
const sessionId = "00000000-0000-4000-8000-000000000002";
const clientEventId = "00000000-0000-4000-8000-000000000003";

function validBatch() {
  return {
    browserId,
    sessionId,
    entrySource: "direct",
    events: [{
      clientEventId,
      name: "level_view",
      levelSlug: "four-corner-breach",
      occurredAt: "2026-08-22T12:00:00.000Z",
    }],
  };
}

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("https://timehacker.example/api/playtest/events", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("playtest event API route", () => {
  beforeEach(() => {
    serviceMocks.recordPlaytestEvents.mockReset().mockResolvedValue({ accepted: 1 });
    serviceMocks.deleteBrowserPlaytestEvents.mockReset().mockResolvedValue(2);
  });

  it("accepts a strict same-origin event batch", async () => {
    const response = await POST(request(JSON.stringify(validBatch()), {
      host: "timehacker.example",
      origin: "https://timehacker.example",
      "sec-fetch-site": "same-origin",
    }));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: 1 });
    expect(serviceMocks.recordPlaytestEvents).toHaveBeenCalledOnce();
  });

  it("rejects explicit cross-origin writes before calling the service", async () => {
    const response = await POST(request(JSON.stringify(validBatch()), {
      host: "timehacker.example",
      origin: "https://attacker.example",
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("EVENT_ORIGIN_REJECTED");
    expect(serviceMocks.recordPlaytestEvents).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON and oversized requests", async () => {
    const malformed = await POST(request("{"));
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).code).toBe("INVALID_REQUEST");

    const oversized = await POST(request("{}", { "content-length": String(32 * 1_024 + 1) }));
    expect(oversized.status).toBe(413);
    expect((await oversized.json()).code).toBe("EVENT_BATCH_TOO_LARGE");
    expect(serviceMocks.recordPlaytestEvents).not.toHaveBeenCalled();
  });

  it("deletes events only for the validated anonymous browser id", async () => {
    const response = await DELETE(request(JSON.stringify({ browserId })));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 2 });
    expect(serviceMocks.deleteBrowserPlaytestEvents).toHaveBeenCalledWith(
      expect.anything(),
      browserId,
    );
  });
});
