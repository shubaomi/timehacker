import { describe, expect, it } from "vitest";
import {
  cheatEffectConfigSchema,
  effectElapsedTime,
  effectToleranceMs,
  effectWallTimeToTarget,
  makeCatalogEffect,
} from "@/game/effects";

describe("assisted timing effects", () => {
  it("supports four explicit, bilingual effect families", () => {
    const effects = [
      { type: "FULL_DILATION", timeScale: 0.5, label: "Full", labelZh: "全程" },
      { type: "FINAL_DILATION", startsAtMs: 8_000, timeScale: 0.25, label: "Final", labelZh: "终段" },
      { type: "TOLERANCE_ASSIST", toleranceMs: 40, label: "Window", labelZh: "容差" },
      { type: "BRAKE_PULSE", brakeAtMs: 9_600, brakeDurationMs: 900, label: "Brake", labelZh: "制动" },
    ] as const;

    effects.forEach((effect) => expect(cheatEffectConfigSchema.parse(effect)).toEqual(effect));
  });

  it("maps wall time transparently for every effect family", () => {
    expect(effectElapsedTime(20_000, { type: "FULL_DILATION", timeScale: 0.5, label: "", labelZh: "" })).toBe(10_000);
    expect(effectElapsedTime(12_000, { type: "FINAL_DILATION", startsAtMs: 8_000, timeScale: 0.5, label: "", labelZh: "" })).toBe(10_000);
    expect(effectElapsedTime(10_000, { type: "TOLERANCE_ASSIST", toleranceMs: 40, label: "", labelZh: "" })).toBeLessThan(9_000);
    expect(effectElapsedTime(10_300, { type: "BRAKE_PULSE", brakeAtMs: 9_600, brakeDurationMs: 700, label: "", labelZh: "" })).toBe(9_600);
    expect(effectElapsedTime(10_700, { type: "BRAKE_PULSE", brakeAtMs: 9_600, brakeDurationMs: 700, label: "", labelZh: "" })).toBe(10_000);
  });

  it("keeps generated catalog effects below the 25 second target wall time", () => {
    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
      for (let index = 0; index < 40; index += 1) {
        const effect = makeCatalogEffect(`slug-${difficulty}-${index}`, difficulty, "Effect", "效果");
        expect(effectWallTimeToTarget(effect)).toBeLessThanOrEqual(25_000);
      }
    }
  });

  it("gives every generated effect a perceptible reaction window from 9.40 seconds", () => {
    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
      for (let index = 0; index < 40; index += 1) {
        const effect = makeCatalogEffect(`slug-${difficulty}-${index}`, difficulty, "Effect", "效果");
        const reactionWindow = effectWallTimeToTarget(effect, 10_000) - effectWallTimeToTarget(effect, 9_400);
        expect(reactionWindow, `${effect.type} D${difficulty}`).toBeGreaterThanOrEqual(1_200);
      }
    }
  });

  it("only expands success tolerance for tolerance assists", () => {
    expect(effectToleranceMs({ type: "TOLERANCE_ASSIST", toleranceMs: 55, label: "", labelZh: "" })).toBe(55);
    expect(effectToleranceMs({ type: "FULL_DILATION", timeScale: 0.6, label: "", labelZh: "" })).toBe(10);
    expect(effectToleranceMs(null)).toBe(10);
  });
});
