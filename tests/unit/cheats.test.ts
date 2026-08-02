import { describe, expect, it } from "vitest";
import {
  CHEAT_DEFINITIONS,
  evaluateCheatProgress,
  evaluateCheatTrigger,
  validateCheatDefinition,
  type CheatTriggerConfig,
} from "@/game/cheats";
import type { CheatEvent, EventPattern } from "@/game/types";
import { SECRET_INTERACTION_FAMILIES } from "@/game/secret-interactions";
import {
  experienceArchetype,
  experienceSurfaces,
  isObservationPuzzle,
  triggerEventTypes,
  UI_EVENT_CAPABILITIES,
  usesBrowserOrInterfaceState,
  usesNonEqualRhythm,
} from "@/game/experience";

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
    case "timedSequence": {
      let at = 0;
      return config.pattern.map((event, index) => {
        if (index > 0) at += config.intervals[index - 1].minMs;
        return { ...event, at };
      });
    }
    case "waitRange":
      return [{
        type: config.eventType,
        at: 0,
        durationMs: config.minDurationMs,
      }];
    case "accessibleHold":
      return [{ type: config.eventType, at: 0, durationMs: config.minDurationMs }];
    case "fallback":
      return patternEvents(config.fallback.pattern);
  }
}

describe("the one hundred cheat definitions", () => {
  it("contains 100 unique, bilingual, valid definitions", () => {
    expect(CHEAT_DEFINITIONS).toHaveLength(100);
    expect(new Set(CHEAT_DEFINITIONS.map(({ slug }) => slug))).toHaveLength(100);
    expect(new Set(CHEAT_DEFINITIONS.map(({ name }) => name))).toHaveLength(100);
    expect(new Set(CHEAT_DEFINITIONS.map(({ nameZh }) => nameZh))).toHaveLength(100);
    expect(new Set(CHEAT_DEFINITIONS.map(({ triggerConfig }) => JSON.stringify(triggerConfig)))).toHaveLength(100);
    CHEAT_DEFINITIONS.forEach((definition) => {
      expect(() => validateCheatDefinition(definition)).not.toThrow();
      expect(definition.nameZh.trim()).not.toBe("");
      expect(definition.descriptionZh.trim()).not.toBe("");
      expect(definition.hintZh.trim()).not.toBe("");
      expect(definition.effectConfig.labelZh.trim()).not.toBe("");
    });
  });

  it("gives all one hundred cheats unique server-verifiable interactions across twelve families", () => {
    const interactions = CHEAT_DEFINITIONS.map(({ triggerConfig }) => triggerConfig.secretInteraction);
    expect(interactions.every((interaction) => interaction && interaction.steps.length >= 3 && interaction.steps.length <= 5)).toBe(true);
    expect(new Set(interactions.map((interaction) => JSON.stringify([
      interaction?.family,
      interaction?.steps,
    ])))).toHaveLength(100);
    expect(new Set(interactions.map((interaction) => interaction?.family))).toEqual(new Set(SECRET_INTERACTION_FAMILIES));
    for (const definition of CHEAT_DEFINITIONS) {
      const interaction = definition.triggerConfig.secretInteraction!;
      const events = interaction.steps.map((value, index) => ({ type: "SECRET_ACTION", value, at: index * 300 }));
      expect(evaluateCheatTrigger(definition.triggerConfig, events), definition.slug).toBe(true);
      expect(evaluateCheatTrigger(definition.triggerConfig, events.slice(0, -1)), definition.slug).toBe(false);
      expect(evaluateCheatTrigger(definition.triggerConfig, events.map((event, index) => index === events.length - 1 ? { ...event, value: "wrong-action" } : event)), definition.slug).toBe(false);
    }
  });

  it("scales progressive guidance from D1 to D5", () => {
    for (const definition of CHEAT_DEFINITIONS) {
      const interaction = definition.triggerConfig.secretInteraction!;
      expect(interaction.steps).toHaveLength(definition.difficulty >= 5 ? 5 : definition.difficulty >= 3 ? 4 : 3);
      expect(interaction.hintDelayMs).toBe([1_200, 1_800, 2_600, 3_400, 4_200][definition.difficulty - 1]);
    }
  });

  it("keeps every difficulty at twenty while allowing quality-led category totals", () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      expect(CHEAT_DEFINITIONS.filter((definition) => definition.difficulty === difficulty)).toHaveLength(20);
    }
    const totals = Object.fromEntries(
      ["OPERATION", "VISUAL", "RHYTHM", "DEVICE", "META"].map((category) => [
        category,
        CHEAT_DEFINITIONS.filter((definition) => definition.category === category).length,
      ]),
    );
    expect(totals.OPERATION).toBeGreaterThanOrEqual(20);
    expect(totals.OPERATION).toBeLessThanOrEqual(28);
    expect(totals.VISUAL).toBeGreaterThanOrEqual(18);
    expect(totals.VISUAL).toBeLessThanOrEqual(26);
    expect(totals.RHYTHM).toBeGreaterThanOrEqual(14);
    expect(totals.RHYTHM).toBeLessThanOrEqual(22);
    expect(totals.DEVICE).toBeGreaterThanOrEqual(8);
    expect(totals.DEVICE).toBeLessThanOrEqual(16);
    expect(totals.META).toBeGreaterThanOrEqual(14);
    expect(totals.META).toBeLessThanOrEqual(22);
  });

  it("gives every device-dependent exploit an explicit service-input fallback", () => {
    const deviceCheats = CHEAT_DEFINITIONS.filter(({ category }) => category === "DEVICE");
    expect(deviceCheats.length).toBeGreaterThanOrEqual(8);
    expect(deviceCheats.length).toBeLessThanOrEqual(16);
    deviceCheats.forEach(({ triggerConfig }) => expect(triggerConfig.kind).toBe("fallback"));
  });

  it("meets the audited diversity and UI-reachability gates", () => {
    const archetypes = new Map<string, number>();
    for (const definition of CHEAT_DEFINITIONS) {
      const archetype = experienceArchetype(definition);
      archetypes.set(archetype, (archetypes.get(archetype) ?? 0) + 1);
      for (const type of triggerEventTypes(definition.triggerConfig)) {
        expect(UI_EVENT_CAPABILITIES.has(type), `${definition.slug} requires unreachable ${type}`).toBe(true);
      }
    }
    expect(archetypes.size).toBeGreaterThanOrEqual(25);
    expect(Math.max(...archetypes.values())).toBeLessThanOrEqual(5);
    expect(CHEAT_DEFINITIONS.filter((definition) => experienceSurfaces(definition) === 1).length).toBeGreaterThanOrEqual(30);
    expect(CHEAT_DEFINITIONS.filter((definition) => experienceSurfaces(definition) >= 2).length).toBeGreaterThanOrEqual(25);
    expect(CHEAT_DEFINITIONS.filter(isObservationPuzzle).length).toBeGreaterThanOrEqual(15);
    expect(CHEAT_DEFINITIONS.filter(usesNonEqualRhythm).length).toBeGreaterThanOrEqual(10);
    expect(CHEAT_DEFINITIONS.filter(usesBrowserOrInterfaceState).length).toBeGreaterThanOrEqual(10);
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

  it("reports accessible ritual progress without trusting it as final validation", () => {
    const config = {
      kind: "sequence" as const,
      pattern: [
        { type: "CONTROL_TAP" },
        { type: "TIMER_TAP" },
        { type: "CONTROL_TAP" },
      ],
      windowMs: 3_000,
    };
    expect(evaluateCheatProgress(config, [])).toMatchObject({ matched: false, currentStep: 0, totalSteps: 3 });
    expect(evaluateCheatProgress(config, [{ type: "CONTROL_TAP", at: 0 }])).toMatchObject({ matched: false, currentStep: 1, totalSteps: 3 });
    expect(evaluateCheatProgress(config, [
      { type: "CONTROL_TAP", at: 0 },
      { type: "TIMER_TAP", at: 200 },
      { type: "CONTROL_TAP", at: 400 },
    ])).toMatchObject({ matched: true, currentStep: 3, totalSteps: 3 });
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
    expect(evaluateCheatProgress(phrase, events)).toMatchObject({ matched: true, currentStep: 4, totalSteps: 4 });
    expect(evaluateCheatTrigger(phrase, events.map((event, index) => index === 2 ? { ...event, at: 1_800 } : event))).toBe(false);

    const wait = { kind: "waitRange" as const, eventType: "READY_WAIT", minDurationMs: 2_000, maxDurationMs: 4_000 };
    expect(evaluateCheatTrigger(wait, [{ type: "READY_WAIT", at: 3_000, durationMs: 3_000 }])).toBe(true);
    expect(evaluateCheatTrigger(wait, [{ type: "READY_WAIT", at: 5_000, durationMs: 5_000 }])).toBe(false);
  });

  it("locks the named regression fixes to their corrected semantics", () => {
    const definition = (slug: string) => CHEAT_DEFINITIONS.find((cheat) => cheat.slug === slug)!;
    expect(evaluateCheatTrigger(definition("mode-flip").triggerConfig, [
      { type: "MODE_TOGGLE", value: "pure", at: 0 },
      { type: "MODE_TOGGLE", value: "hacker", at: 1_000 },
    ])).toBe(true);
    expect(evaluateCheatTrigger(definition("breath-gap").triggerConfig, [
      { type: "READY_WAIT", at: 2_999, durationMs: 2_999 },
    ])).toBe(false);
    expect(evaluateCheatTrigger(definition("breath-gap").triggerConfig, [
      { type: "READY_WAIT", at: 3_000, durationMs: 3_000 },
    ])).toBe(true);
    const hundred = definition("hundred-code");
    expect(evaluateCheatTrigger(hundred.triggerConfig, [1, 1, 0, 0, 1, 0, 0].map((value, index) => ({ type: "CALIBRATION_TAP", value, at: index * 100 })))).toBe(true);
    expect(evaluateCheatTrigger(hundred.triggerConfig, [1, 1, 0, 0, 1, 0, 1].map((value, index) => ({ type: "CALIBRATION_TAP", value, at: index * 100 })))).toBe(false);
    for (const slug of ["reverse-sweep", "escape-hatch", "quiet-circuit"]) {
      expect(definition(slug).triggerConfig.kind).toBe("fallback");
    }
    for (const slug of ["double-horizon", "triple-gravity"]) {
      const config = definition(slug).triggerConfig;
      expect(config.kind).toBe("fallback");
      if (config.kind === "fallback") {
        expect(config.primary.pattern.map(({ value }) => value)).toEqual(["portrait", "landscape", "portrait"]);
      }
    }
  });
});
