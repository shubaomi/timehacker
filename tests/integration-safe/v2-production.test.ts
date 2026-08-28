// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CHEAT_DEFINITIONS, evaluateCheatTrigger } from "@/game/cheats";
import { effectElapsedTime } from "@/game/effects";
import { selectNextCheat } from "@/game/selection";
import { V2_LEVELS } from "@/game/v2-levels.generated";

describe("V2 production integration without database writes", () => {
  it("connects every stable database slug to one authored production level", () => {
    expect(CHEAT_DEFINITIONS.map(({ slug }) => slug)).toEqual(V2_LEVELS.map(({ slug }) => slug));
  });

  it("selects the first undiscovered authored level and accepts its V2 state path", () => {
    const selected = selectNextCheat({
      definitions: CHEAT_DEFINITIONS,
      discoveredSlugs: new Set(V2_LEVELS.slice(0, 37).map(({ slug }) => slug)),
      desiredDifficulty: 2,
      seed: "safe-integration",
    });

    expect(selected?.slug).toBe(V2_LEVELS[37].slug);
    expect(evaluateCheatTrigger(selected!.triggerConfig, [
      { type: "V2_PUZZLE_DISCOVERED", value: selected!.slug, at: 100 },
      { type: "V2_PUZZLE_ARMED", value: selected!.slug, at: 200 },
    ])).toBe(true);
  });

  it("applies the common reaction window to every assisted level", () => {
    for (const definition of CHEAT_DEFINITIONS) {
      expect(effectElapsedTime(9_499, definition.effectConfig), definition.slug).toBe(9_499);
      expect(effectElapsedTime(14_501, definition.effectConfig), definition.slug).toBe(10_000);
      expect(effectElapsedTime(17_499, definition.effectConfig), definition.slug).toBe(10_000);
    }
  });
});
