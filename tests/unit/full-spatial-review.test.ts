import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FULL_SPATIAL_REVIEW_RECIPES,
  SPATIAL_CONTROLLER_PROFILES,
  fullSpatialReviewRecipe,
  isFullSpatialReviewCoverageComplete,
  reviewTimerElapsed,
} from "@/game/full-spatial-review";
import { SPATIAL_PILOT_SLUGS } from "@/game/spatial-pilot";
import { FULL_SPATIAL_ANCHOR_CONTRACTS } from "@/game/full-spatial-anchor-contract";
import { V2_CONTROLLER_KINDS, V2_LEVELS } from "@/game/v2-levels.generated";

describe("FULL/100 isolated spatial review registry", () => {
  it("covers every stable level and controller with one trace key", () => {
    expect(isFullSpatialReviewCoverageComplete()).toBe(true);
    expect(FULL_SPATIAL_REVIEW_RECIPES).toHaveLength(100);
    expect(Object.keys(SPATIAL_CONTROLLER_PROFILES).sort()).toEqual([...V2_CONTROLLER_KINDS].sort());

    for (const level of V2_LEVELS) {
      const item = fullSpatialReviewRecipe(level.id);
      expect(item.slug).toBe(level.slug);
      expect(item.controller).toBe(level.controller);
      expect(item.traceKey).toBe(`TH-SP-${String(level.id).padStart(3, "0")}`);
      expect(item.marks).toBe(level.visual.marks);
    }
  });

  it("maps every frozen design thesis, silhouette, and completion contract into an explicit recipe", () => {
    const planDir = path.join(process.cwd(), "docs", "plans");
    const sections = fs.readdirSync(planDir)
      .filter((name) => /^2026-08-30-time-hacker-spatial-levels-\d{3}-\d{3}\.md$/.test(name))
      .sort()
      .flatMap((name) => {
        const source = fs.readFileSync(path.join(planDir, name), "utf8").replaceAll("\r\n", "\n");
        const matches = [...source.matchAll(/^## TH-SP-(\d{3}) .+$/gm)];
        return matches.map((match, index) => source.slice(match.index, matches[index + 1]?.index ?? source.length));
      });
    expect(sections).toHaveLength(100);

    for (const section of sections) {
      const id = Number(section.match(/^## TH-SP-(\d{3})/m)?.[1]);
      const item = fullSpatialReviewRecipe(id);
      expect(item.spatialThesis).toBe(section.match(/\*\*空间命题与 Time Hacker 身份\*\*：(.+?)。它把/)?.[1]);
      expect(item.signatureSilhouette).toBe(section.match(/签名剪影为“(.+?)”/)?.[1]);
      expect(item.completionGeometry).toBe(section.match(/^- \*\*几何完成态\*\*：(.+)$/m)?.[1].trim());
      expect(item.anchorCount).toBeGreaterThan(0);
      expect(item.anchorCount).toBe(item.anchorSelectors.length);
    }
    expect(new Set(FULL_SPATIAL_REVIEW_RECIPES.map((item) => item.signatureSilhouette)).size).toBe(100);
  });

  it("has one explicit no-fallback semantic anchor contract and silhouette behavior per level", () => {
    expect(FULL_SPATIAL_ANCHOR_CONTRACTS).toHaveLength(100);
    for (const contract of FULL_SPATIAL_ANCHOR_CONTRACTS) {
      expect(contract.traceKey).toBe(`TH-SP-${String(contract.id).padStart(3, "0")}`);
      expect(contract.anchorSelectors.length).toBeGreaterThan(0);
      expect(contract.anchorRoles).toHaveLength(contract.anchorSelectors.length);
      expect(contract.allowFallback).toBe(false);
      expect(["paper", "ring", "ribbon", "fold", "portal", "ray"]).toContain(contract.silhouettePrimitive);
      expect(["lock", "converge", "stack", "fold", "orbit", "trace"]).toContain(contract.successComposition);
    }
    for (const recipe of FULL_SPATIAL_REVIEW_RECIPES) {
      expect(
        recipe.anchorSelectors.some((selector) => selector === `[data-testid="v2-scene-${String(recipe.id).padStart(3, "0")}"]`),
        `${recipe.traceKey} must not bind a volume to the whole scene`,
      ).toBe(false);
      expect(recipe.anchorCount).toBe(recipe.anchorSelectors.length);
    }
  });

  it("uses controller-specific success geometry instead of flattening all levels to converge", () => {
    const compositions = new Set(FULL_SPATIAL_REVIEW_RECIPES.map((item) => item.successComposition));
    expect(compositions).toEqual(new Set(["lock", "stack", "fold", "orbit", "trace"]));
    for (const controller of V2_CONTROLLER_KINDS) {
      const controllerCompositions = new Set(
        FULL_SPATIAL_REVIEW_RECIPES.filter((item) => item.controller === controller).map((item) => item.successComposition),
      );
      expect(controllerCompositions.size, `${controller} success composition drift`).toBe(1);
    }
  });

  it("keeps the review timer monotonic when a running puzzle unlocks and then slows at 9.50 seconds", () => {
    expect(reviewTimerElapsed(5_000, false, 4_900)).toBe(5_000);
    expect(reviewTimerElapsed(5_020, true, 5_000)).toBe(5_020);
    expect(reviewTimerElapsed(9_800, true, 9_800)).toBe(9_800);
    expect(reviewTimerElapsed(10_500, true, 9_800)).toBe(9_800);
    expect(reviewTimerElapsed(12_500, true, 9_800)).toBe(9_800);
    expect(reviewTimerElapsed(14_500, true, 9_800)).toBe(10_000);
  });

  it("does not expand the formal default-off pilot whitelist", () => {
    expect(SPATIAL_PILOT_SLUGS).toEqual([
      "four-corner-breach",
      "breath-gap",
      "relay-sandwich",
      "slow-command",
      "corner-cross",
      "focus-orbit",
      "archive-route",
      "dual-device",
    ]);
  });
});
