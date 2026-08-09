import { describe, expect, it } from "vitest";
import {
  CHEAT_DEFINITIONS,
  evaluateCheatProgress,
  evaluateCheatTrigger,
  validateCheatDefinition,
} from "@/game/cheats";
import { triggerEventTypes, UI_EVENT_CAPABILITIES } from "@/game/experience";

describe("the one hundred cheat definitions", () => {
  it("contains 100 unique, bilingual, valid definitions with authored scenes", () => {
    expect(CHEAT_DEFINITIONS).toHaveLength(100);
    expect(new Set(CHEAT_DEFINITIONS.map(({ slug }) => slug))).toHaveLength(100);
    expect(new Set(CHEAT_DEFINITIONS.map(({ name }) => name))).toHaveLength(100);
    expect(new Set(CHEAT_DEFINITIONS.map(({ nameZh }) => nameZh))).toHaveLength(100);
    expect(new Set(CHEAT_DEFINITIONS.map(({ triggerConfig }) => triggerConfig.puzzleScene?.sceneId))).toHaveLength(100);
    for (const definition of CHEAT_DEFINITIONS) {
      expect(() => validateCheatDefinition(definition)).not.toThrow();
      expect(definition.triggerConfig.puzzleScene?.slug).toBe(definition.slug);
      expect(definition.nameZh.trim()).not.toBe("");
      expect(definition.descriptionZh.trim()).not.toBe("");
      expect(definition.effectConfig.labelZh.trim()).not.toBe("");
    }
  });

  it("server-verifies every authored solution and rejects incomplete or wrong paths", () => {
    for (const definition of CHEAT_DEFINITIONS) {
      const events = [
        { type: "V2_PUZZLE_DISCOVERED", value: definition.slug, at: 0 },
        { type: "V2_PUZZLE_ARMED", value: definition.slug, at: 250 },
      ];
      expect(evaluateCheatTrigger(definition.triggerConfig, events), definition.slug).toBe(true);
      expect(evaluateCheatTrigger(definition.triggerConfig, events.slice(0, -1)), definition.slug).toBe(false);
      expect(evaluateCheatTrigger(definition.triggerConfig, [
        ...events.slice(0, -1),
        { ...events.at(-1)!, value: "wrong-path" },
      ]), definition.slug).toBe(false);
      expect(evaluateCheatProgress(definition.triggerConfig, events)).toMatchObject({ matched: true, armed: true });
    }
  });

  it("keeps every difficulty at twenty and all puzzle inputs reachable", () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      expect(CHEAT_DEFINITIONS.filter((definition) => definition.difficulty === difficulty)).toHaveLength(20);
    }
    for (const definition of CHEAT_DEFINITIONS) {
      expect(triggerEventTypes(definition.triggerConfig)).toEqual(expect.arrayContaining(["V2_PUZZLE_DISCOVERED", "V2_PUZZLE_ARMED"]));
      for (const type of triggerEventTypes(definition.triggerConfig)) {
        expect(UI_EVENT_CAPABILITIES.has(type), `${definition.slug} requires unreachable ${type}`).toBe(true);
      }
    }
  });

  it("retains standalone legacy trigger evaluation for saved historical records", () => {
    const sequence = {
      kind: "sequence" as const,
      pattern: [{ type: "A" }, { type: "B" }, { type: "C" }],
      windowMs: 2_000,
    };
    expect(evaluateCheatTrigger(sequence, [
      { type: "A", at: 0 },
      { type: "B", at: 200 },
      { type: "C", at: 400 },
    ])).toBe(true);
    expect(evaluateCheatProgress(sequence, [{ type: "A", at: 0 }])).toMatchObject({
      matched: false,
      currentStep: 1,
      totalSteps: 3,
    });
  });

  it("evaluates non-uniform timed phrases and bounded waits", () => {
    const phrase = {
      kind: "timedSequence" as const,
      pattern: [
        { type: "RHYTHM_TAP" },
        { type: "RHYTHM_TAP" },
        { type: "RHYTHM_TAP" },
        { type: "RHYTHM_TAP" },
      ],
      intervals: [
        { minMs: 650, maxMs: 850 },
        { minMs: 400, maxMs: 600 },
        { minMs: 180, maxMs: 350 },
      ],
    };
    const events = [0, 750, 1_250, 1_500].map((at) => ({ type: "RHYTHM_TAP", at }));
    expect(evaluateCheatTrigger(phrase, events)).toBe(true);
    expect(evaluateCheatTrigger(phrase, events.map((event, index) => index === 2 ? { ...event, at: 1_800 } : event))).toBe(false);

    const wait = { kind: "waitRange" as const, eventType: "READY_WAIT", minDurationMs: 2_000, maxDurationMs: 4_000 };
    expect(evaluateCheatTrigger(wait, [{ type: "READY_WAIT", at: 3_000, durationMs: 3_000 }])).toBe(true);
    expect(evaluateCheatTrigger(wait, [{ type: "READY_WAIT", at: 5_000, durationMs: 5_000 }])).toBe(false);
  });
});
