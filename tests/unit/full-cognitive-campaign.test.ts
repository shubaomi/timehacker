import { describe, expect, it } from "vitest";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import {
  FULL_COGNITIVE_CAMPAIGN,
  FULL_COGNITIVE_BY_SLUG,
  isFullCognitiveCoverageComplete,
} from "@/game/full-cognitive-campaign";
import { V2_LEVELS } from "@/game/v2-levels.generated";

describe("full 100 cognitive campaign", () => {
  it("freezes exactly one traceable contract for every stable level", () => {
    expect(FULL_COGNITIVE_CAMPAIGN).toHaveLength(100);
    expect(new Set(FULL_COGNITIVE_CAMPAIGN.map(({ id }) => id)).size).toBe(100);
    expect(new Set(FULL_COGNITIVE_CAMPAIGN.map(({ slug }) => slug)).size).toBe(100);
    expect(new Set(FULL_COGNITIVE_CAMPAIGN.map(({ traceKey }) => traceKey)).size).toBe(100);
    expect(FULL_COGNITIVE_CAMPAIGN.map(({ id, slug }) => ({ id, slug }))).toEqual(
      V2_LEVELS.map(({ id, slug }) => ({ id, slug })),
    );
    expect(FULL_COGNITIVE_CAMPAIGN.map(({ slug }) => slug)).toEqual(
      CHEAT_DEFINITIONS.map(({ slug }) => slug),
    );
    expect(isFullCognitiveCoverageComplete()).toBe(true);
  });

  it("requires counterevidence, observation and relation before the original puzzle", () => {
    for (const level of FULL_COGNITIVE_CAMPAIGN) {
      expect(level.probes.map(({ role }) => role)).toContain("counterexample");
      expect(level.probes.map(({ role }) => role)).toContain("observation");
      expect(level.probes.map(({ role }) => role)).toContain("relation");
      expect(level.sequence.length).toBeGreaterThanOrEqual(3);
      expect(new Set(level.sequence).size).toBe(level.sequence.length);
      expect(level.sequence.every((probeId) => level.probes.some(({ id }) => id === probeId))).toBe(true);
      expect(level.answer.zh).toBeTruthy();
      expect(level.relationship.zh).toBeTruthy();
    }
  });

  it("raises the synthesis floor for the final sixteen levels", () => {
    for (const level of FULL_COGNITIVE_CAMPAIGN.slice(84)) {
      expect(level.sequence).toHaveLength(4);
      expect(level.probes.map(({ role }) => role)).toContain("synthesis");
    }
  });

  it("supports a complete kill switch without changing the legacy catalog", () => {
    expect(FULL_COGNITIVE_BY_SLUG.size).toBe(100);
    expect(CHEAT_DEFINITIONS).toHaveLength(100);
  });
});
