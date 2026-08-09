import { describe, expect, it } from "vitest";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { completeGameSchema } from "@/lib/validation";

describe("game completion validation", () => {
  it("accepts every serialized puzzle event emitted by the authored scenes", () => {
    for (const definition of CHEAT_DEFINITIONS) {
      const scene = definition.triggerConfig.puzzleScene;
      expect(scene).toBeDefined();
      const events = [
        { type: "V2_PUZZLE_DISCOVERED", value: definition.slug, at: 0 },
        { type: "V2_PUZZLE_ARMED", value: definition.slug, at: 250 },
      ];

      expect(() => completeGameSchema.parse({
        playerId: "00000000-0000-4000-8000-000000000000",
        durationMs: 10_000,
        wallDurationMs: 10_000,
        events,
      }), definition.slug).not.toThrow();
    }
  });
});
