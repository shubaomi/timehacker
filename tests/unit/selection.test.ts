import { describe, expect, it } from "vitest";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { selectNextCheat } from "@/game/selection";

describe("cheat selection", () => {
  it("is deterministic for a seed", () => {
    const input = {
      definitions: CHEAT_DEFINITIONS,
      discoveredSlugs: new Set<string>(),
      desiredDifficulty: 1,
      seed: "player-a:2026-08-02",
    };
    expect(selectNextCheat(input)?.slug).toBe(selectNextCheat(input)?.slug);
  });

  it("never assigns a discovered cheat", () => {
    const discovered = new Set(
      CHEAT_DEFINITIONS.filter(({ difficulty }) => difficulty === 1).map(({ slug }) => slug),
    );
    const selected = selectNextCheat({
      definitions: CHEAT_DEFINITIONS,
      discoveredSlugs: discovered,
      desiredDifficulty: 1,
      seed: "fallback-pool",
    });
    expect(selected).not.toBeNull();
    expect(discovered.has(selected!.slug)).toBe(false);
  });

  it("returns null only after every cheat is discovered", () => {
    expect(
      selectNextCheat({
        definitions: CHEAT_DEFINITIONS,
        discoveredSlugs: new Set(CHEAT_DEFINITIONS.map(({ slug }) => slug)),
        desiredDifficulty: 5,
        seed: "complete",
      }),
    ).toBeNull();
  });
});
