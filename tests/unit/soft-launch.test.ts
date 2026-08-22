import { describe, expect, it } from "vitest";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import {
  SOFT_LAUNCH_LEVELS,
  definitionsForReleaseTrack,
  publicLevelNumber,
} from "@/game/soft-launch";

describe("soft launch catalog", () => {
  it("keeps the frozen twelve-level order without changing the full catalog", () => {
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
    expect(definitionsForReleaseTrack("SOFT_LAUNCH")).toHaveLength(12);
    expect(definitionsForReleaseTrack("FULL")).toHaveLength(100);
    expect(CHEAT_DEFINITIONS).toHaveLength(100);
  });

  it("uses sample order for public numbering and original order for full players", () => {
    expect(publicLevelNumber("silent-constellation", "SOFT_LAUNCH")).toBe(12);
    expect(publicLevelNumber("silent-constellation", "FULL")).toBe(100);
    expect(publicLevelNumber("patient-zero", "SOFT_LAUNCH")).toBeNull();
  });
});
