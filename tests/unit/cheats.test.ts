import { describe, expect, it } from "vitest";
import {
  CHEAT_DEFINITIONS,
  evaluateCheatTrigger,
  validateCheatDefinition,
  type CheatTriggerConfig,
} from "@/game/cheats";
import type { CheatEvent, EventPattern } from "@/game/types";

function patternEvents(pattern: EventPattern[]): CheatEvent[] {
  return pattern.map((event, index) => ({ ...event, at: index * 200 }));
}

function positiveEvents(config: CheatTriggerConfig): CheatEvent[] {
  switch (config.kind) {
    case "sequence":
      return patternEvents(config.pattern);
    case "count":
      return Array.from({ length: config.count }, (_, index) => ({
        type: config.eventType,
        at: index * Math.max(1, Math.floor(config.windowMs / config.count)),
      }));
    case "hold":
    case "wait":
      return [{ type: config.eventType, at: 0, durationMs: config.minDurationMs }];
    case "alternating":
      return patternEvents(
        Array.from({ length: config.cycles * 2 }, (_, index) =>
          index % 2 === 0 ? config.first : config.second,
        ),
      );
    case "rhythm":
      return Array.from({ length: config.count }, (_, index) => ({
        type: config.eventType,
        at: index * 500,
      }));
    case "fallback":
      return patternEvents(config.fallback.pattern);
  }
}

describe("the twenty cheat definitions", () => {
  it("contains twenty unique, valid, multi-category definitions", () => {
    expect(CHEAT_DEFINITIONS).toHaveLength(20);
    expect(new Set(CHEAT_DEFINITIONS.map(({ slug }) => slug))).toHaveLength(20);
    expect(new Set(CHEAT_DEFINITIONS.map(({ category }) => category)).size).toBe(5);
    CHEAT_DEFINITIONS.forEach((definition) => {
      expect(() => validateCheatDefinition(definition)).not.toThrow();
    });
  });

  it.each(CHEAT_DEFINITIONS.map((definition) => [definition.slug, definition] as const))(
    "%s has a positive and an unmet trigger path",
    (_slug, definition) => {
      const events = positiveEvents(definition.triggerConfig);
      expect(evaluateCheatTrigger(definition.triggerConfig, events)).toBe(true);
      expect(evaluateCheatTrigger(definition.triggerConfig, events.slice(0, -1))).toBe(false);
    },
  );

  it("preserves a completed sequence when the START control adds a later event", () => {
    const slowCommand = CHEAT_DEFINITIONS.find(({ slug }) => slug === "slow-command")!;
    const events = [
      ...positiveEvents(slowCommand.triggerConfig),
      { type: "INPUT_SOURCE", value: "pointer", at: 1_200 },
    ];

    expect(evaluateCheatTrigger(slowCommand.triggerConfig, events)).toBe(true);
  });

  it("ignores passive focus events between alternating ritual inputs", () => {
    const oscillation = CHEAT_DEFINITIONS.find(
      ({ slug }) => slug === "signal-oscillation",
    )!;
    const events = positiveEvents(oscillation.triggerConfig).flatMap((event, index) =>
      index === 0
        ? [event]
        : [{ type: "FOCUS", value: "target", at: event.at - 1 }, event],
    );

    expect(evaluateCheatTrigger(oscillation.triggerConfig, events)).toBe(true);
  });
});
