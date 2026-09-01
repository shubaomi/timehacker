import { describe, expect, it } from "vitest";
import {
  DIRECTOR_CAMPAIGN,
  DIRECTOR_CAMPAIGN_BY_LEGACY_SLUG,
  DIRECTOR_CHAPTERS,
  DIRECTOR_SPATIAL_STATES,
  directorLevelByNumber,
} from "@/game/director-campaign";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { SOFT_LAUNCH_LEVELS, definitionsForReleaseTrack } from "@/game/soft-launch";
import { V2_LEVEL_BY_SLUG } from "@/game/v2-levels.generated";

describe("Director's Cut campaign contract", () => {
  it("freezes exactly six chapters of six uniquely mapped levels", () => {
    expect(DIRECTOR_CAMPAIGN).toHaveLength(36);
    expect(DIRECTOR_CHAPTERS).toHaveLength(6);
    expect(Object.isFrozen(DIRECTOR_CAMPAIGN)).toBe(true);
    expect(Object.isFrozen(DIRECTOR_CHAPTERS)).toBe(true);

    expect(new Set(DIRECTOR_CAMPAIGN.map((level) => level.traceId)).size).toBe(36);
    expect(new Set(DIRECTOR_CAMPAIGN.map((level) => level.number)).size).toBe(36);
    expect(new Set(DIRECTOR_CAMPAIGN.map((level) => level.legacySlug)).size).toBe(36);

    expect(DIRECTOR_CAMPAIGN.map((level) => level.number)).toEqual(
      Array.from({ length: 36 }, (_, index) => index + 1),
    );
    expect(DIRECTOR_CAMPAIGN.map((level) => level.traceId)).toEqual(
      Array.from(
        { length: 36 },
        (_, index) => `TH-DC-${String(index + 1).padStart(3, "0")}`,
      ),
    );

    for (const chapter of DIRECTOR_CHAPTERS) {
      expect(DIRECTOR_CAMPAIGN.filter((level) => level.chapter === chapter.number)).toHaveLength(6);
    }
  });

  it("maps additively to stable Legacy levels without changing existing release tracks", () => {
    for (const level of DIRECTOR_CAMPAIGN) {
      const legacy = V2_LEVEL_BY_SLUG.get(level.legacySlug);
      expect(legacy, level.traceId).toBeDefined();
      expect(legacy?.id, level.traceId).toBe(level.legacyId);
      expect(legacy?.controller, level.traceId).toBe(level.controller);
      expect(DIRECTOR_CAMPAIGN_BY_LEGACY_SLUG.get(level.legacySlug)).toBe(level);
    }

    expect(CHEAT_DEFINITIONS).toHaveLength(100);
    expect(definitionsForReleaseTrack("FULL")).toHaveLength(100);
    expect(definitionsForReleaseTrack("SOFT_LAUNCH")).toHaveLength(12);
    expect(SOFT_LAUNCH_LEVELS.map(({ slug }) => slug)).toEqual([
      "four-corner-breach",
      "breath-gap",
      "slow-command",
      "relay-sandwich",
      "corner-cross",
      "precision-five",
      "horizon-shift",
      "focus-orbit",
      "wheel-echo",
      "tab-return",
      "archive-figure-eight",
      "silent-constellation",
    ]);
  });

  it("enforces the cognitive floor and a non-revealing early hint ladder", () => {
    for (const level of DIRECTOR_CAMPAIGN) {
      const minimumHypotheses = level.number <= 12 ? 2 : 3;
      const minimumReasoningSteps = level.number <= 24 ? 2 : 3;

      expect(level.evidence.length, `${level.traceId} evidence`).toBeGreaterThanOrEqual(2);
      expect(level.hypotheses.length, `${level.traceId} hypotheses`).toBeGreaterThanOrEqual(
        minimumHypotheses,
      );
      expect(level.reasoningSteps.length, `${level.traceId} reasoning`).toBeGreaterThanOrEqual(
        minimumReasoningSteps,
      );
      expect(level.negativeFeedback.length, `${level.traceId} feedback`).toBeGreaterThanOrEqual(2);

      expect(level.hints.h0.revealsAction, `${level.traceId} H0`).toBe(false);
      expect(level.hints.h1.revealsAction, `${level.traceId} H1`).toBe(false);
      expect(level.hints.h2.revealsAction, `${level.traceId} H2`).toBe(false);
      expect(level.hints.h3.revealsAction, `${level.traceId} H3`).toBe(true);

    }

    expect(DIRECTOR_CAMPAIGN.filter((level) => level.solveShape === "single-action")).toHaveLength(0);
    expect(DIRECTOR_CAMPAIGN.filter((level) => level.solveShape === "sequence")).toHaveLength(32);
    expect(DIRECTOR_CAMPAIGN.filter((level) => level.solveShape === "concurrent")).toHaveLength(1);
    expect(DIRECTOR_CAMPAIGN.filter((level) => level.solveShape === "stateful")).toHaveLength(3);
  });

  it("keeps known-answer execution humane while preserving a real discovery window", () => {
    for (const level of DIRECTOR_CAMPAIGN) {
      expect(level.firstSolveTargetSeconds.min, level.traceId).toBeGreaterThanOrEqual(25);
      expect(level.firstSolveTargetSeconds.max, level.traceId).toBeGreaterThan(
        level.firstSolveTargetSeconds.min,
      );
      expect(level.knownAnswerMaxSeconds, level.traceId).toBeGreaterThanOrEqual(6);
      expect(level.knownAnswerMaxSeconds, level.traceId).toBeLessThanOrEqual(25);
      expect(level.knownAnswerMaxSeconds, level.traceId).toBeLessThan(
        level.firstSolveTargetSeconds.min,
      );
      expect(level.inputModes).toEqual(["pointer", "touch", "keyboard"]);
      expect(level.reducedMotionEquivalent).toBe(true);
    }
  });

  it("uses the one-way spatial state vocabulary and safe selectors", () => {
    expect(DIRECTOR_SPATIAL_STATES).toEqual([
      "idle",
      "probe",
      "armed",
      "running",
      "stopped",
      "success",
      "miss",
    ]);
    expect(Object.isFrozen(DIRECTOR_SPATIAL_STATES)).toBe(true);

    expect(directorLevelByNumber(1)?.legacySlug).toBe("four-corner-breach");
    expect(directorLevelByNumber(36)?.legacySlug).toBe("silent-constellation");
    expect(directorLevelByNumber(0)).toBeNull();
    expect(directorLevelByNumber(37)).toBeNull();
    expect(directorLevelByNumber(Number.NaN)).toBeNull();
  });
});
