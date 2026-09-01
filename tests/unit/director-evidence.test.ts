import { describe, expect, it } from "vitest";
import { DIRECTOR_EVIDENCE_BY_LEVEL, DIRECTOR_EVIDENCE_DEFINITIONS } from "@/game/director-evidence";

describe("Director's Cut cognitive evidence contracts", () => {
  it("covers every remaining Director level exactly once", () => {
    expect(DIRECTOR_EVIDENCE_DEFINITIONS).toHaveLength(35);
    expect(DIRECTOR_EVIDENCE_DEFINITIONS.map((item) => item.levelNumber)).toEqual(
      Array.from({ length: 35 }, (_, index) => index + 2),
    );
    expect(DIRECTOR_EVIDENCE_BY_LEVEL.size).toBe(35);
  });

  it("requires evidence before the final action and keeps every probe descriptive", () => {
    for (const definition of DIRECTOR_EVIDENCE_DEFINITIONS) {
      expect(definition.probes).toHaveLength(3);
      expect(new Set(definition.probes.map((probe) => probe.id)).size).toBe(3);
      expect(definition.sequence.length, `level ${definition.levelNumber}`).toBeGreaterThanOrEqual(
        definition.levelNumber >= 13 ? 3 : 2,
      );
      expect(definition.sequence.every((id) => definition.probes.some((probe) => probe.id === id))).toBe(true);
      for (const probe of definition.probes) {
        expect(probe.label.zh.trim()).not.toBe("");
        expect(probe.label.en.trim()).not.toBe("");
        expect(probe.response.zh.trim()).not.toBe("");
        expect(probe.response.en.trim()).not.toBe("");
      }
    }
  });
});