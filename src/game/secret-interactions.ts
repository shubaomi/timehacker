import { z } from "zod";
import type { CheatCategory } from "./types";

export const SECRET_INTERACTION_FAMILIES = [
  "trail",
  "smudge",
  "echo",
  "rhythm",
  "pulse",
  "pressure",
  "corners",
  "constellation",
  "digits",
  "switchboard",
  "orbit",
  "balance",
] as const;

export type SecretInteractionFamily = (typeof SECRET_INTERACTION_FAMILIES)[number];

export const SECRET_DISCOVERY_ACTIONS = [
  "tap",
  "double-tap",
  "hold",
  "swipe-up",
  "swipe-right",
  "swipe-down",
  "swipe-left",
  "orbit-clockwise",
  "orbit-counterclockwise",
  "rub-horizontal",
  "rub-vertical",
  "zigzag",
] as const;

export type SecretDiscoveryAction = (typeof SECRET_DISCOVERY_ACTIONS)[number];

export const SECRET_DISCOVERY_VISUALS = [
  "glint",
  "smudge",
  "bubble",
  "seam",
  "speck",
  "ripple",
  "crack",
  "knot",
  "dust",
  "halo",
] as const;

export type SecretDiscoveryVisual = (typeof SECRET_DISCOVERY_VISUALS)[number];

export const SECRET_DISCOVERY_SLOTS = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
  "readout-left",
  "readout-right",
] as const;

export type SecretDiscoverySlot = (typeof SECRET_DISCOVERY_SLOTS)[number];

export const secretDiscoveryConfigSchema = z.object({
  visual: z.enum(SECRET_DISCOVERY_VISUALS),
  slot: z.enum(SECRET_DISCOVERY_SLOTS),
  steps: z.array(z.enum(SECRET_DISCOVERY_ACTIONS)).length(2),
  variant: z.number().int().nonnegative(),
  hintDelayMs: z.number().int().min(1_000).max(6_000),
});

export type SecretDiscoveryConfig = z.infer<typeof secretDiscoveryConfigSchema>;

export const SECRET_FAMILY_ACTIONS: Record<SecretInteractionFamily, readonly string[]> = {
  trail: ["swipe-up", "swipe-right", "swipe-down", "swipe-left"],
  smudge: ["wipe-up", "wipe-right", "wipe-down", "wipe-left"],
  echo: ["echo-up", "echo-right", "echo-down", "echo-left"],
  rhythm: ["beat-soft", "beat-strong", "beat-hold"],
  pulse: ["pulse-inner", "pulse-middle", "pulse-outer"],
  pressure: ["press-tap", "press-hold", "press-deep"],
  corners: ["corner-nw", "corner-ne", "corner-se", "corner-sw"],
  constellation: ["star-1", "star-2", "star-3", "star-4", "star-5"],
  digits: ["digit-0", "digit-1", "digit-5", "digit-8"],
  switchboard: ["switch-sun", "switch-moon", "switch-wave", "switch-dot"],
  orbit: ["orbit-n", "orbit-e", "orbit-s", "orbit-w"],
  balance: ["balance-left", "balance-center", "balance-right"],
};

export const secretInteractionConfigSchema = z.object({
  family: z.enum(SECRET_INTERACTION_FAMILIES),
  steps: z.array(z.string().min(1)).min(3).max(5),
  variant: z.number().int().nonnegative(),
  hintDelayMs: z.number().int().min(800).max(6_000),
  discovery: secretDiscoveryConfigSchema,
}).superRefine((interaction, context) => {
  const allowedActions = SECRET_FAMILY_ACTIONS[interaction.family];
  interaction.steps.forEach((action, index) => {
    if (!allowedActions.includes(action)) {
      context.addIssue({
        code: "custom",
        message: `Action ${action} does not belong to ${interaction.family}`,
        path: ["steps", index],
      });
    }
  });
});

export type SecretInteractionConfig = z.infer<typeof secretInteractionConfigSchema>;

export const DEFAULT_SECRET_INTERACTION: SecretInteractionConfig = {
  family: "trail",
  steps: ["swipe-up", "swipe-right", "swipe-down"],
  variant: 0,
  hintDelayMs: 1_200,
  discovery: {
    visual: "glint",
    slot: "top-right",
    steps: ["tap", "hold"],
    variant: 0,
    hintDelayMs: 1_200,
  },
};

const CATEGORY_FAMILY_OFFSETS: Record<CheatCategory, number> = {
  OPERATION: 0,
  VISUAL: 1,
  RHYTHM: 2,
  DEVICE: 3,
  META: 4,
};

const HINT_DELAYS = [1_200, 1_800, 2_600, 3_400, 4_200] as const;

export function selectSecretFamily(
  category: CheatCategory,
  catalogIndex: number,
): SecretInteractionFamily {
  const categoryOffset = CATEGORY_FAMILY_OFFSETS[category];
  return SECRET_INTERACTION_FAMILIES[(catalogIndex + categoryOffset) % SECRET_INTERACTION_FAMILIES.length];
}

export function makeSecretInteraction(
  family: SecretInteractionFamily,
  occurrence: number,
  difficulty: number,
  catalogIndex: number,
): SecretInteractionConfig {
  const actions = SECRET_FAMILY_ACTIONS[family];
  const length = difficulty >= 5 ? 5 : difficulty >= 3 ? 4 : 3;
  const steps = Array.from({ length }, (_, position) => {
    const digit = Math.floor(occurrence / (actions.length ** position));
    return actions[(digit + position + difficulty - 1) % actions.length];
  });
  return {
    family,
    steps,
    variant: occurrence,
    hintDelayMs: HINT_DELAYS[Math.max(0, Math.min(4, difficulty - 1))],
    discovery: makeSecretDiscovery(catalogIndex, difficulty),
  };
}

export function makeSecretDiscovery(
  catalogIndex: number,
  difficulty: number,
): SecretDiscoveryConfig {
  const boundedIndex = Math.max(0, Math.floor(catalogIndex));
  const first = SECRET_DISCOVERY_ACTIONS[boundedIndex % SECRET_DISCOVERY_ACTIONS.length];
  const second = SECRET_DISCOVERY_ACTIONS[
    Math.floor(boundedIndex / SECRET_DISCOVERY_ACTIONS.length) % SECRET_DISCOVERY_ACTIONS.length
  ];
  return {
    visual: SECRET_DISCOVERY_VISUALS[(boundedIndex * 7) % SECRET_DISCOVERY_VISUALS.length],
    slot: SECRET_DISCOVERY_SLOTS[(boundedIndex * 3 + Math.floor(boundedIndex / 10)) % SECRET_DISCOVERY_SLOTS.length],
    steps: [first, second],
    variant: boundedIndex,
    hintDelayMs: HINT_DELAYS[Math.max(0, Math.min(4, difficulty - 1))],
  };
}
