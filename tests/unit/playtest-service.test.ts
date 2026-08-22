// @vitest-environment node

import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { cleanupExpiredPlaytestEvents, recordPlaytestEvents } from "@/server/playtest-service";

describe("playtest event service", () => {
  it("derives the public level number and uses idempotent inserts", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const database = {
      playtestEvent: { createMany, deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as PrismaClient;
    const now = new Date("2026-08-22T12:00:00.000Z");
    const result = await recordPlaytestEvents(database, {
      browserId: randomUUID(),
      sessionId: randomUUID(),
      entrySource: "direct",
      events: [{
        clientEventId: randomUUID(),
        name: "level_view",
        levelSlug: "silent-constellation",
        occurredAt: now.toISOString(),
      }],
    }, now);

    expect(result).toEqual({ accepted: 1, created: 1 });
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({
      skipDuplicates: true,
      data: [expect.objectContaining({
        levelNumber: 12,
        name: "LEVEL_VIEW",
        entrySource: "DIRECT",
      })],
    }));
  });

  it("rejects raw events older than the 30-day retention window", async () => {
    const database = {
      playtestEvent: { createMany: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as PrismaClient;
    await expect(recordPlaytestEvents(database, {
      browserId: randomUUID(),
      sessionId: randomUUID(),
      entrySource: "unknown",
      events: [{
        clientEventId: randomUUID(),
        name: "level_view",
        levelSlug: "four-corner-breach",
        occurredAt: "2026-07-20T00:00:00.000Z",
      }],
    }, new Date("2026-08-22T00:00:00.000Z"))).rejects.toMatchObject({
      code: "INVALID_EVENT_TIME",
    });
  });

  it("deletes only events beyond the 30-day cutoff", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 4 });
    const database = { playtestEvent: { deleteMany } } as unknown as PrismaClient;
    expect(await cleanupExpiredPlaytestEvents(database, new Date("2026-08-22T00:00:00.000Z"))).toBe(4);
    expect(deleteMany).toHaveBeenCalledWith({
      where: { occurredAt: { lt: new Date("2026-07-23T00:00:00.000Z") } },
    });
  });
});
