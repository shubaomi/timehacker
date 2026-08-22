import { describe, expect, it } from "vitest";
import {
  playtestEventBatchSchema,
  PLAYTEST_EVENT_NAMES,
} from "@/analytics/playtest-contract";

const envelope = {
  browserId: "019fc0b1-f719-76d0-96d2-502fa5bb5927",
  sessionId: "119fc0b1-f719-76d0-96d2-502fa5bb5927",
  entrySource: "direct",
};

describe("playtest event contract", () => {
  it("freezes all thirteen approved event names", () => {
    expect(PLAYTEST_EVENT_NAMES).toEqual([
      "level_view", "first_interaction", "puzzle_discovered",
      "hint_1_open", "hint_2_open", "answer_open", "puzzle_armed",
      "timer_started", "timer_stopped", "level_completed", "next_level",
      "share_card_open", "share_card_exported",
    ]);
  });

  it("accepts only event-specific, pseudonymous fields", () => {
    expect(playtestEventBatchSchema.parse({
      ...envelope,
      events: [{
        clientEventId: "219fc0b1-f719-76d0-96d2-502fa5bb5927",
        name: "timer_stopped",
        levelSlug: "four-corner-breach",
        occurredAt: "2026-08-22T12:00:00.000Z",
        mode: "assisted",
        durationMs: 10_000,
        success: true,
        puzzleSolved: true,
      }],
    }).events).toHaveLength(1);

    expect(() => playtestEventBatchSchema.parse({
      ...envelope,
      referrer: "https://example.com/private/path",
      events: [{
        clientEventId: "219fc0b1-f719-76d0-96d2-502fa5bb5927",
        name: "level_view",
        levelSlug: "four-corner-breach",
        occurredAt: "2026-08-22T12:00:00.000Z",
        metadata: { userAgent: "forbidden" },
      }],
    })).toThrow();
  });

  it("rejects incomplete timer, completion, and export events", () => {
    for (const event of [
      { name: "timer_stopped", success: true },
      { name: "level_completed", mode: "assisted", puzzleSolved: true, success: false },
      { name: "share_card_exported" },
    ]) {
      expect(() => playtestEventBatchSchema.parse({
        ...envelope,
        events: [{
          clientEventId: "219fc0b1-f719-76d0-96d2-502fa5bb5927",
          levelSlug: "four-corner-breach",
          occurredAt: "2026-08-22T12:00:00.000Z",
          ...event,
        }],
      })).toThrow();
    }
  });
});
