import { describe, expect, it } from "vitest";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { CAMERA_GESTURES } from "@/game/camera-gestures";
import {
  PUZZLE_MECHANICS,
  PUZZLE_SCENES,
  evaluatePuzzleProgress,
  puzzleSceneConfigSchema,
  puzzleSolutionEvents,
} from "@/game/puzzle-scenes";

describe("authored full-page puzzle scenes", () => {
  it("maps exactly one valid, bilingual scene to every stable cheat slug", () => {
    expect(PUZZLE_SCENES).toHaveLength(100);
    expect(PUZZLE_MECHANICS.length).toBeGreaterThanOrEqual(25);

    const expectedSlugs = CHEAT_DEFINITIONS.map(({ slug }) => slug).sort();
    const sceneSlugs = PUZZLE_SCENES.map(({ slug }) => slug).sort();
    expect(sceneSlugs).toEqual(expectedSlugs);

    for (const scene of PUZZLE_SCENES) {
      expect(puzzleSceneConfigSchema.parse(scene)).toEqual(scene);
      expect(scene.title.en.trim()).not.toBe("");
      expect(scene.title.zh.trim()).not.toBe("");
      expect(scene.hints.observation.en.trim()).not.toBe("");
      expect(scene.hints.observation.zh.trim()).not.toBe("");
      expect(scene.hints.logic.en.trim()).not.toBe("");
      expect(scene.hints.logic.zh.trim()).not.toBe("");
      expect(scene.mobileAlternative.en.trim()).not.toBe("");
      expect(scene.keyboardAlternative.en.trim()).not.toBe("");
      expect(scene.reducedMotionAlternative.en.trim()).not.toBe("");
    }
  });

  it("enforces authored identity, diversity, distribution, and quality gates", () => {
    expect(new Set(PUZZLE_SCENES.map(({ sceneId }) => sceneId))).toHaveLength(100);
    expect(new Set(PUZZLE_SCENES.map(({ signature }) => signature))).toHaveLength(100);
    expect(new Set(PUZZLE_SCENES.map(({ discoveryRule, unlockRule }) =>
      `${discoveryRule.mechanic}:${discoveryRule.target}:${discoveryRule.gesture}>${unlockRule.mechanic}:${unlockRule.target}:${unlockRule.gesture}`,
    ))).toHaveLength(100);

    const mechanicCounts = new Map<string, number>();
    for (const scene of PUZZLE_SCENES) {
      mechanicCounts.set(scene.primaryMechanic, (mechanicCounts.get(scene.primaryMechanic) ?? 0) + 1);
      expect(scene.ratings.every((rating) => rating >= 3)).toBe(true);
      expect(scene.ratings.reduce((sum, rating) => sum + rating, 0) / scene.ratings.length).toBeGreaterThanOrEqual(4);
    }
    expect(mechanicCounts.size).toBeGreaterThanOrEqual(25);
    expect(Math.max(...mechanicCounts.values())).toBeLessThanOrEqual(6);
    expect(PUZZLE_SCENES.filter(({ targetZone }) => targetZone !== "stopwatch").length).toBeGreaterThanOrEqual(70);

    const zones = new Set(PUZZLE_SCENES.map(({ targetZone }) => targetZone));
    expect(zones).toEqual(new Set([
      "top", "left", "right", "bottom", "title", "border", "decor", "stopwatch",
    ]));
    expect(JSON.stringify(PUZZLE_SCENES)).not.toMatch(/glint|generic-star|click me/i);
  });

  it("programmatically completes all one hundred scenes and rejects wrong paths", () => {
    for (const scene of PUZZLE_SCENES) {
      const solution = puzzleSolutionEvents(scene);
      expect(evaluatePuzzleProgress(scene, solution)).toMatchObject({ phase: "ARMED", armed: true });
      expect(evaluatePuzzleProgress(scene, solution.slice(0, -1)).armed, scene.slug).toBe(false);
      expect(evaluatePuzzleProgress(scene, [
        ...solution.slice(0, -1),
        { ...solution.at(-1)!, target: `wrong-${scene.unlockRule.target}` },
      ]).armed, scene.slug).toBe(false);
      if (solution.length > 1) {
        const reordered = [...solution];
        [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
        expect(evaluatePuzzleProgress(scene, reordered).armed, scene.slug).toBe(false);
      }
    }
  });

  it("gives every device or camera mechanic a complete fallback", () => {
    for (const scene of PUZZLE_SCENES.filter(({ primaryMechanic }) =>
      ["camera", "orientation", "visibility", "wheel"].includes(primaryMechanic),
    )) {
      expect(scene.mobileAlternative.en.length).toBeGreaterThan(12);
      expect(scene.mobileAlternative.zh.length).toBeGreaterThan(6);
      expect(scene.keyboardAlternative.en.length).toBeGreaterThan(12);
      expect(scene.keyboardAlternative.zh.length).toBeGreaterThan(6);
    }
  });

  it("keeps the six camera gestures rare, distinct, and optional", () => {
    const cameraScenes = PUZZLE_SCENES.filter(({ cameraGesture }) => cameraGesture);
    expect(cameraScenes).toHaveLength(6);
    expect(new Set(cameraScenes.map(({ cameraGesture }) => cameraGesture))).toEqual(
      new Set(CAMERA_GESTURES),
    );

    for (const scene of cameraScenes) {
      expect(scene.mobileAlternative.zh.length).toBeGreaterThan(6);
      expect(scene.keyboardAlternative.zh.length).toBeGreaterThan(6);
    }
  });
});
