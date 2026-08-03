import { describe, expect, it } from "vitest";
import {
  cheatEffectConfigSchema,
  effectElapsedTime,
  effectToleranceMs,
  effectWallTimeToTarget,
  LANDING_STEP_WALL_MS,
  LANDING_ZONE_START_MS,
  makeCatalogEffect,
  TARGET_EXTRA_HOLD_MS,
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

  it("preserves each authored curve before the common landing zone", () => {
    expect(effectElapsedTime(18_000, { type: "FULL_DILATION", timeScale: 0.5, label: "", labelZh: "" })).toBe(9_000);
    expect(effectElapsedTime(10_000, { type: "FINAL_DILATION", startsAtMs: 8_000, timeScale: 0.5, label: "", labelZh: "" })).toBe(9_000);
    expect(effectElapsedTime(10_000, { type: "TOLERANCE_ASSIST", toleranceMs: 40, label: "", labelZh: "" })).toBeLessThan(9_000);
    expect(effectElapsedTime(10_300, { type: "BRAKE_PULSE", brakeAtMs: 9_600, brakeDurationMs: 700, label: "", labelZh: "" })).toBe(9_600);
  });

  it("keeps generated catalog effects below a 30 second target wall time", () => {
    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
      for (let index = 0; index < 40; index += 1) {
        const effect = makeCatalogEffect(`slug-${difficulty}-${index}`, difficulty, "Effect", "效果");
        expect(effectWallTimeToTarget(effect)).toBeLessThanOrEqual(30_000);
      }
    }
  });

  it("walks hundredths once per second from 9.95 and holds 10.00 for three seconds", () => {
    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
      for (let index = 0; index < 40; index += 1) {
        const effect = makeCatalogEffect(`slug-${difficulty}-${index}`, difficulty, "Effect", "效果");
        const landingStart = effectWallTimeToTarget(effect, LANDING_ZONE_START_MS);
        expect(effectElapsedTime(landingStart, effect), `${effect.type} D${difficulty}`).toBe(9_950);
        expect(effectElapsedTime(landingStart + LANDING_STEP_WALL_MS - 1, effect)).toBe(9_950);
        expect(effectElapsedTime(landingStart + LANDING_STEP_WALL_MS, effect)).toBe(9_960);
        const targetStart = effectWallTimeToTarget(effect, 10_000);
        expect(effectElapsedTime(targetStart, effect)).toBe(10_000);
        expect(effectElapsedTime(targetStart + LANDING_STEP_WALL_MS + TARGET_EXTRA_HOLD_MS - 1, effect)).toBe(10_000);
        expect(effectElapsedTime(targetStart + LANDING_STEP_WALL_MS + TARGET_EXTRA_HOLD_MS, effect)).toBe(10_010);
      }
    }
  });

  it("does not alter pure rounds without an activated cheat", () => {
    expect(effectElapsedTime(9_999, null)).toBe(9_999);
    expect(effectElapsedTime(10_000, null)).toBe(10_000);
  });

  it("only expands success tolerance for tolerance assists", () => {
    expect(effectToleranceMs({ type: "TOLERANCE_ASSIST", toleranceMs: 55, label: "", labelZh: "" })).toBe(55);
    expect(effectToleranceMs({ type: "FULL_DILATION", timeScale: 0.6, label: "", labelZh: "" })).toBe(10);
    expect(effectToleranceMs(null)).toBe(10);
  });
});
