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

const REACTION_ZONE_START_MS = 8_000;

function toleranceAssistScale(toleranceMs: number): number {
  const strength = Math.max(0, Math.min(1, (toleranceMs - 20) / 40));
  return 0.42 - strength * 0.12;
}

export function effectElapsedTime(wallElapsedMs: number, effect: CheatEffectConfig | null): number {
  const wall = Math.max(0, wallElapsedMs);
  if (!effect) return wall;
  if (effect.type === "TOLERANCE_ASSIST") {
    if (wall <= REACTION_ZONE_START_MS) return wall;
    return REACTION_ZONE_START_MS + (wall - REACTION_ZONE_START_MS) * toleranceAssistScale(effect.toleranceMs);
  }
  if (effect.type === "FULL_DILATION") return wall * effect.timeScale;
  if (effect.type === "FINAL_DILATION") {
    if (wall <= effect.startsAtMs) return wall;
    return effect.startsAtMs + (wall - effect.startsAtMs) * effect.timeScale;
  }
  if (wall <= effect.brakeAtMs) return wall;
  if (wall <= effect.brakeAtMs + effect.brakeDurationMs) return effect.brakeAtMs;
  return wall - effect.brakeDurationMs;
}

export function effectWallTimeToTarget(effect: CheatEffectConfig, targetMs = TARGET_MS): number {
  if (effect.type === "FULL_DILATION") return targetMs / effect.timeScale;
  if (effect.type === "FINAL_DILATION") {
    if (targetMs <= effect.startsAtMs) return targetMs;
    return effect.startsAtMs + (targetMs - effect.startsAtMs) / effect.timeScale;
  }
  if (effect.type === "TOLERANCE_ASSIST") {
    if (targetMs <= REACTION_ZONE_START_MS) return targetMs;
    return REACTION_ZONE_START_MS + (targetMs - REACTION_ZONE_START_MS) / toleranceAssistScale(effect.toleranceMs);
  }
  if (effect.type === "BRAKE_PULSE") {
    return targetMs <= effect.brakeAtMs ? targetMs : targetMs + effect.brakeDurationMs;
  }
  return targetMs;
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
