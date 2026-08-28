import { z } from "zod";
import { SUCCESS_TOLERANCE_MS, TARGET_MS } from "./timer";

const labels = {
  label: z.string().min(1).max(100),
  labelZh: z.string().min(1).max(100),
};

const fullDilationSchema = z.object({
  type: z.literal("FULL_DILATION"),
  timeScale: z.number().gte(0.4).lte(0.8),
  ...labels,
});

const finalDilationSchema = z.object({
  type: z.literal("FINAL_DILATION"),
  startsAtMs: z.number().int().gte(7_000).lte(9_000),
  timeScale: z.number().gte(0.2).lte(0.7),
  ...labels,
});

const toleranceAssistSchema = z.object({
  type: z.literal("TOLERANCE_ASSIST"),
  toleranceMs: z.number().int().gte(20).lte(60),
  ...labels,
});

const brakePulseSchema = z.object({
  type: z.literal("BRAKE_PULSE"),
  brakeAtMs: z.number().int().gte(9_000).lt(TARGET_MS),
  brakeDurationMs: z.number().int().gte(400).lte(2_000),
  ...labels,
});

export const cheatEffectConfigSchema = z.discriminatedUnion("type", [
  fullDilationSchema,
  finalDilationSchema,
  toleranceAssistSchema,
  brakePulseSchema,
]);

export type CheatEffectConfig = z.infer<typeof cheatEffectConfigSchema>;
export type CheatEffectType = CheatEffectConfig["type"];

export const LANDING_ZONE_START_MS = 9_500;
export const LANDING_STEP_DISPLAY_MS = 100;
export const LANDING_STEP_WALL_MS = 1_000;
export const TARGET_EXTRA_HOLD_MS = 2_000;

export function effectElapsedTime(wallElapsedMs: number, effect: CheatEffectConfig | null): number {
  const wall = Math.max(0, wallElapsedMs);
  if (!effect) return wall;
  if (wall < LANDING_ZONE_START_MS) return wall;

  const landingWallMs = Math.max(0, wall - LANDING_ZONE_START_MS);
  const stepsToTarget = (TARGET_MS - LANDING_ZONE_START_MS) / LANDING_STEP_DISPLAY_MS;
  const targetStartsAtWallMs = stepsToTarget * LANDING_STEP_WALL_MS;
  const targetHoldWallMs = LANDING_STEP_WALL_MS + TARGET_EXTRA_HOLD_MS;
  if (landingWallMs < targetStartsAtWallMs) {
    return LANDING_ZONE_START_MS
      + Math.floor(landingWallMs / LANDING_STEP_WALL_MS) * LANDING_STEP_DISPLAY_MS;
  }
  if (landingWallMs < targetStartsAtWallMs + targetHoldWallMs) return TARGET_MS;
  const afterTargetWallMs = landingWallMs - targetStartsAtWallMs - targetHoldWallMs;
  return TARGET_MS + afterTargetWallMs / LANDING_STEP_WALL_MS * LANDING_STEP_DISPLAY_MS;
}

export function effectWallTimeToTarget(effect: CheatEffectConfig, targetMs = TARGET_MS): number {
  void effect;
  if (targetMs < LANDING_ZONE_START_MS) return targetMs;
  if (targetMs <= TARGET_MS) {
    const steps = Math.ceil((targetMs - LANDING_ZONE_START_MS) / LANDING_STEP_DISPLAY_MS);
    return LANDING_ZONE_START_MS + Math.max(0, steps) * LANDING_STEP_WALL_MS;
  }
  const targetStartsAtWallMs = (TARGET_MS - LANDING_ZONE_START_MS)
    / LANDING_STEP_DISPLAY_MS * LANDING_STEP_WALL_MS;
  const targetHoldWallMs = LANDING_STEP_WALL_MS + TARGET_EXTRA_HOLD_MS;
  return LANDING_ZONE_START_MS + targetStartsAtWallMs + targetHoldWallMs
    + (targetMs - TARGET_MS) / LANDING_STEP_DISPLAY_MS * LANDING_STEP_WALL_MS;
}

export function effectToleranceMs(effect: CheatEffectConfig | null): number {
  return effect?.type === "TOLERANCE_ASSIST" ? effect.toleranceMs : SUCCESS_TOLERANCE_MS;
}

export function effectNominalRate(effect: CheatEffectConfig | null): number {
  if (!effect || effect.type === "TOLERANCE_ASSIST") return 1;
  if (effect.type === "BRAKE_PULSE") return 0;
  return effect.timeScale;
}

function stableBucket(slug: string): number {
  return [...slug].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 17) % 4;
}

export function makeCatalogEffect(
  slug: string,
  difficulty: number,
  label: string,
  labelZh: string,
): CheatEffectConfig {
  const boundedDifficulty = Math.min(5, Math.max(1, Math.round(difficulty)));
  const type = stableBucket(slug);
  if (type === 0) {
    const scales = [0.5, 0.48, 0.46, 0.44, 0.42] as const;
    return { type: "FULL_DILATION", timeScale: scales[boundedDifficulty - 1], label: `${label} · full dilation`, labelZh: `${labelZh} · 全程缓流` };
  }
  if (type === 1) {
    const scales = [0.4, 0.36, 0.32, 0.28, 0.24] as const;
    return { type: "FINAL_DILATION", startsAtMs: 8_000, timeScale: scales[boundedDifficulty - 1], label: `${label} · final-zone dilation`, labelZh: `${labelZh} · 终段缓流` };
  }
  if (type === 2) {
    const tolerances = [20, 28, 36, 48, 60] as const;
    return { type: "TOLERANCE_ASSIST", toleranceMs: tolerances[boundedDifficulty - 1], label: `${label} · assisted window`, labelZh: `${labelZh} · 辅助容差` };
  }
  const durations = [1_200, 1_400, 1_600, 1_800, 2_000] as const;
  return { type: "BRAKE_PULSE", brakeAtMs: 9_400, brakeDurationMs: durations[boundedDifficulty - 1], label: `${label} · brake pulse`, labelZh: `${labelZh} · 制动脉冲` };
}
