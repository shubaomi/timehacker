import { z } from "zod";

export const PUZZLE_MECHANICS = [
  "tap",
  "double-tap",
  "hold",
  "drag",
  "align",
  "rotate",
  "trace",
  "orbit",
  "rub",
  "rhythm",
  "interval",
  "wait",
  "focus",
  "keyboard",
  "wheel",
  "orientation",
  "visibility",
  "locale",
  "camera",
  "sequence",
  "toggle",
  "balance",
  "assemble",
  "sort",
  "resize",
] as const;

export const PUZZLE_TARGET_ZONES = [
  "top",
  "left",
  "right",
  "bottom",
  "title",
  "border",
  "decor",
  "stopwatch",
] as const;

const bilingualSchema = z.object({
  en: z.string().min(1),
  zh: z.string().min(1),
});

const puzzleRuleSchema = z.object({
  mechanic: z.enum(PUZZLE_MECHANICS),
  target: z.string().min(1),
  gesture: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1).max(6),
  minDurationMs: z.number().int().nonnegative().optional(),
  maxDurationMs: z.number().int().positive().optional(),
});

const puzzleObjectSchema = z.object({
  id: z.string().min(1),
  glyph: z.string().min(1).max(12),
  label: bilingualSchema,
  shape: z.enum(["orb", "tile", "line", "arc", "paper", "dial"]),
});

export const puzzleSceneConfigSchema = z.object({
  version: z.literal(1),
  slug: z.string().min(1),
  sceneId: z.string().min(1),
  title: bilingualSchema,
  difficulty: z.number().int().min(1).max(5),
  primaryMechanic: z.enum(PUZZLE_MECHANICS),
  targetZone: z.enum(PUZZLE_TARGET_ZONES),
  palette: z.enum(["sunrise", "lagoon", "sorbet", "meadow", "lilac", "apricot", "sky", "paper", "tide", "dusk"]),
  composition: z.string().min(1),
  motif: bilingualSchema,
  objects: z.array(puzzleObjectSchema).length(3),
  discoveryRule: puzzleRuleSchema,
  unlockRule: puzzleRuleSchema,
  feedback: bilingualSchema,
  hints: z.object({
    observation: bilingualSchema,
    logic: bilingualSchema,
  }),
  mobileAlternative: bilingualSchema,
  keyboardAlternative: bilingualSchema,
  reducedMotionAlternative: bilingualSchema,
  expectedSeconds: z.number().int().min(10).max(240),
  signature: z.string().min(8),
  antiCopyReview: bilingualSchema,
  ratings: z.array(z.number().int().min(3).max(5)).length(7),
  cameraGesture: z.enum(["air-loop", "air-zigzag", "open-palm", "fist-open", "victory", "pinch-drag"]).optional(),
});

export type PuzzleMechanic = (typeof PUZZLE_MECHANICS)[number];
export type PuzzleTargetZone = (typeof PUZZLE_TARGET_ZONES)[number];
export type PuzzleSceneConfig = z.infer<typeof puzzleSceneConfigSchema>;

export interface PuzzleSceneEvent {
  phase: "DISCOVER" | "UNLOCK";
  mechanic: PuzzleMechanic;
  target: string;
  action: string;
  at: number;
  durationMs?: number;
}

export interface PuzzleProgress {
  phase: "EXPLORING" | "DISCOVERED" | "SOLVING" | "ARMED";
  currentStep: number;
  totalSteps: number;
  armed: boolean;
}

function ruleEvents(
  phase: PuzzleSceneEvent["phase"],
  rule: PuzzleSceneConfig["discoveryRule"],
  startAt: number,
): PuzzleSceneEvent[] {
  return rule.steps.map((action, index) => ({
    phase,
    mechanic: rule.mechanic,
    target: rule.target,
    action,
    at: startAt + index * 180,
    ...(rule.minDurationMs ? { durationMs: rule.minDurationMs } : {}),
  }));
}

export function puzzleSolutionEvents(scene: PuzzleSceneConfig): PuzzleSceneEvent[] {
  const discovery = ruleEvents("DISCOVER", scene.discoveryRule, 0);
  return [
    ...discovery,
    ...ruleEvents("UNLOCK", scene.unlockRule, discovery.length * 180 + 240),
  ];
}

function matches(expected: PuzzleSceneEvent, actual: PuzzleSceneEvent): boolean {
  if (!expected) return false;
  if (
    expected.phase !== actual.phase ||
    expected.mechanic !== actual.mechanic ||
    expected.target !== actual.target ||
    expected.action !== actual.action
  ) return false;
  if (expected.durationMs && (actual.durationMs ?? 0) < expected.durationMs) return false;
  return true;
}

export function evaluatePuzzleProgress(
  rawScene: PuzzleSceneConfig,
  events: readonly PuzzleSceneEvent[],
): PuzzleProgress {
  const scene = puzzleSceneConfigSchema.parse(rawScene);
  const expected = puzzleSolutionEvents(scene);
  let currentStep = 0;
  for (const event of events) {
    if (matches(expected[currentStep], event)) {
      currentStep += 1;
      if (currentStep === expected.length) break;
      continue;
    }
    currentStep = matches(expected[0], event) ? 1 : 0;
  }
  const discoverySteps = scene.discoveryRule.steps.length;
  const armed = currentStep === expected.length;
  const phase = armed
    ? "ARMED"
    : currentStep > discoverySteps
      ? "SOLVING"
      : currentStep === discoverySteps
        ? "DISCOVERED"
        : "EXPLORING";
  return { phase, currentStep, totalSteps: expected.length, armed };
}

export function serializePuzzleEvent(event: PuzzleSceneEvent): string {
  return [event.phase, event.mechanic, event.target, event.action].join(":");
}

export { PUZZLE_SCENES } from "./puzzle-scene-catalog";
