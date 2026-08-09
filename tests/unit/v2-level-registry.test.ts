import { describe, expect, it } from "vitest";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { V2_CONTROLLER_KINDS, V2_LEVELS } from "@/game/v2-levels.generated";

describe("V2 production level registry", () => {
  it("contains one ordered authored definition for every stable cheat slug", () => {
    expect(V2_LEVELS).toHaveLength(100);
    expect(V2_LEVELS.map(({ id }) => id)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    expect(new Set(V2_LEVELS.map(({ slug }) => slug))).toHaveLength(100);
    expect(new Set(V2_LEVELS.map(({ slug }) => slug))).toEqual(new Set(CHEAT_DEFINITIONS.map(({ slug }) => slug)));
  });

  it("has no placeholder controller or empty production contract", () => {
    expect(V2_CONTROLLER_KINDS).not.toContain("fallback");
    for (const level of V2_LEVELS) {
      expect(V2_CONTROLLER_KINDS).toContain(level.controller);
      expect(level.scene.length).toBeGreaterThan(8);
      expect(level.discovery.length).toBeGreaterThan(2);
      expect(level.solve.length).toBeGreaterThan(2);
      expect(level.cognitiveShift.length).toBeGreaterThan(2);
      expect(level.silhouette.length).toBeGreaterThan(2);
      expect(level.acceptance.length).toBeGreaterThan(8);
      expect(level.visual.motif).toBe(level.controller);
      expect(level.visual.marks.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("assigns a distinct authored visual signature to every production scene", () => {
    const signatures = V2_LEVELS.map((level) => JSON.stringify(level.visual));
    expect(new Set(signatures)).toHaveLength(100);
  });

  it("keeps the representative and high-risk levels on dedicated controllers", () => {
    const controller = (id: number) => V2_LEVELS[id - 1]?.controller;
    expect(controller(1)).toBe("corner-repair");
    expect(controller(2)).toBe("patient-hold");
    expect(controller(3)).toBe("word-shift");
    expect(controller(40)).toBe("cover-return");
    expect(controller(67)).toBe("wheel-echo");
    expect(controller(69)).toBe("trace");
    expect(controller(100)).toBe("constellation");
  });
});
