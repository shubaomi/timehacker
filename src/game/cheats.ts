import { z } from "zod";
import type { CheatCategory, CheatEvent, EventPattern } from "./types";

const eventPatternSchema = z.object({
  type: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
});

const sequenceSchema = z.object({
  kind: z.literal("sequence"),
  pattern: z.array(eventPatternSchema).min(1),
  windowMs: z.number().positive().optional(),
});

const countSchema = z.object({
  kind: z.literal("count"),
  eventType: z.string().min(1),
  count: z.number().int().positive(),
  windowMs: z.number().positive(),
});

const holdSchema = z.object({
  kind: z.literal("hold"),
  eventType: z.string().min(1),
  minDurationMs: z.number().positive(),
});

const alternatingSchema = z.object({
  kind: z.literal("alternating"),
  first: eventPatternSchema,
  second: eventPatternSchema,
  cycles: z.number().int().positive(),
  windowMs: z.number().positive(),
});

const rhythmSchema = z.object({
  kind: z.literal("rhythm"),
  eventType: z.string().min(1),
  count: z.number().int().min(3),
  maxDeviationMs: z.number().nonnegative(),
  windowMs: z.number().positive(),
});

const waitSchema = z.object({
  kind: z.literal("wait"),
  eventType: z.string().min(1),
  minDurationMs: z.number().positive(),
});

const simpleTriggerSchema = z.discriminatedUnion("kind", [
  sequenceSchema,
  countSchema,
  holdSchema,
  alternatingSchema,
  rhythmSchema,
  waitSchema,
]);

const fallbackSchema = z.object({
  kind: z.literal("fallback"),
  primary: sequenceSchema,
  fallback: sequenceSchema,
});

export const cheatTriggerConfigSchema = z.union([
  simpleTriggerSchema,
  fallbackSchema,
]);

export const cheatEffectConfigSchema = z.object({
  timeScale: z.number().gt(0).lte(1),
  label: z.string().min(1).max(80),
});

export type CheatTriggerConfig = z.infer<typeof cheatTriggerConfigSchema>;
export type CheatEffectConfig = z.infer<typeof cheatEffectConfigSchema>;

export interface CheatDefinition {
  slug: string;
  name: string;
  description: string;
  hint: string;
  difficulty: number;
  category: CheatCategory;
  triggerConfig: CheatTriggerConfig;
  effectConfig: CheatEffectConfig;
  enabled: boolean;
}

function sequence(
  pattern: EventPattern[],
  windowMs?: number,
): CheatTriggerConfig {
  return { kind: "sequence", pattern, windowMs };
}

export const CHEAT_DEFINITIONS: readonly CheatDefinition[] = [
  {
    slug: "five-finger-echo",
    name: "Five-Finger Echo",
    description: "The faceplate remembers a rapid knock better than it remembers time.",
    hint: "The glass is listening. Knock five times before launch.",
    difficulty: 1,
    category: "OPERATION",
    triggerConfig: { kind: "count", eventType: "TIMER_TAP", count: 5, windowMs: 2_000 },
    effectConfig: { timeScale: 0.42, label: "Echo damping engaged" },
    enabled: true,
  },
  {
    slug: "pressure-delay",
    name: "Pressure Delay",
    description: "Holding the actuator preloads a delay into the timing circuit.",
    hint: "Do not press and release. Let the control feel your patience.",
    difficulty: 1,
    category: "OPERATION",
    triggerConfig: { kind: "hold", eventType: "CONTROL_HOLD", minDurationMs: 1_400 },
    effectConfig: { timeScale: 0.38, label: "Pressure buffer charged" },
    enabled: true,
  },
  {
    slug: "slow-command",
    name: "Slow Command",
    description: "A maintenance mnemonic slips past the public control layer.",
    hint: "The lab accepts one four-letter instruction from a keyboard.",
    difficulty: 1,
    category: "META",
    triggerConfig: sequence(
      ["S", "L", "O", "W"].map((value) => ({ type: "KEY", value })),
      3_000,
    ),
    effectConfig: { timeScale: 0.45, label: "SLOW command accepted" },
    enabled: true,
  },
  {
    slug: "four-corner-breach",
    name: "Four-Corner Breach",
    description: "A clockwise diagnostic sweep opens an undocumented service route.",
    hint: "Trace the housing from north-west, clockwise.",
    difficulty: 1,
    category: "VISUAL",
    triggerConfig: sequence(
      ["NW", "NE", "SE", "SW"].map((value) => ({ type: "CORNER_TAP", value })),
      4_000,
    ),
    effectConfig: { timeScale: 0.35, label: "Housing loop bypassed" },
    enabled: true,
  },
  {
    slug: "signal-oscillation",
    name: "Signal Oscillation",
    description: "Alternating between evidence and instrument destabilizes the clock source.",
    hint: "Glass, clue, glass, clue — repeat the contradiction.",
    difficulty: 1,
    category: "OPERATION",
    triggerConfig: {
      kind: "alternating",
      first: { type: "TIMER_TAP" },
      second: { type: "CLUE_TAP" },
      cycles: 3,
      windowMs: 4_000,
    },
    effectConfig: { timeScale: 0.48, label: "Oscillation captured" },
    enabled: true,
  },
  {
    slug: "triple-actuator",
    name: "Triple Actuator",
    description: "Three idle actuator tests leave the relay in a permissive state.",
    hint: "Test the main control three times while the chamber is idle.",
    difficulty: 2,
    category: "OPERATION",
    triggerConfig: { kind: "count", eventType: "CONTROL_TAP", count: 3, windowMs: 1_200 },
    effectConfig: { timeScale: 0.34, label: "Relay permissive state" },
    enabled: true,
  },
  {
    slug: "calibration-101",
    name: "Calibration 101",
    description: "A binary service code reroutes the display oscillator.",
    hint: "The smallest useful lesson is written 1–0–1.",
    difficulty: 2,
    category: "VISUAL",
    triggerConfig: sequence(
      [1, 0, 1].map((value) => ({ type: "CALIBRATION_TAP", value })),
      3_000,
    ),
    effectConfig: { timeScale: 0.3, label: "Binary calibration loaded" },
    enabled: true,
  },
  {
    slug: "status-rebound",
    name: "Status Rebound",
    description: "The status lamp rebounds when acknowledged twice in one beat.",
    hint: "Acknowledge the live status twice — quickly.",
    difficulty: 2,
    category: "RHYTHM",
    triggerConfig: { kind: "count", eventType: "STATUS_TAP", count: 2, windowMs: 500 },
    effectConfig: { timeScale: 0.4, label: "Status rebound detected" },
    enabled: true,
  },
  {
    slug: "patient-zero",
    name: "Patient Zero",
    description: "An untouched chamber drifts out of specification after five seconds.",
    hint: "Wait in READY. Do absolutely nothing for five seconds.",
    difficulty: 2,
    category: "RHYTHM",
    triggerConfig: { kind: "wait", eventType: "READY_WAIT", minDurationMs: 5_000 },
    effectConfig: { timeScale: 0.32, label: "Idle drift harvested" },
    enabled: true,
  },
  {
    slug: "mode-flip",
    name: "Mode Flip",
    description: "Rapid mode negotiation leaves both governors partially active.",
    hint: "Change your mind three times before the lab can settle.",
    difficulty: 2,
    category: "META",
    triggerConfig: { kind: "count", eventType: "MODE_TOGGLE", count: 3, windowMs: 2_400 },
    effectConfig: { timeScale: 0.44, label: "Governor conflict active" },
    enabled: true,
  },
  {
    slug: "metronome-leak",
    name: "Metronome Leak",
    description: "Four evenly spaced pulses synchronize with the internal divider.",
    hint: "Tap a steady four-beat measure on the rhythm port.",
    difficulty: 3,
    category: "RHYTHM",
    triggerConfig: {
      kind: "rhythm",
      eventType: "RHYTHM_TAP",
      count: 4,
      maxDeviationMs: 150,
      windowMs: 4_000,
    },
    effectConfig: { timeScale: 0.36, label: "Metronome phase locked" },
    enabled: true,
  },
  {
    slug: "reverse-sweep",
    name: "Reverse Sweep",
    description: "A down-up-down scan reverses the calibration bus for one run.",
    hint: "Sweep down, back up, then down across the instrument.",
    difficulty: 3,
    category: "OPERATION",
    triggerConfig: sequence(
      ["down", "up", "down"].map((value) => ({ type: "WHEEL", value })),
      3_000,
    ),
    effectConfig: { timeScale: 0.28, label: "Calibration bus reversed" },
    enabled: true,
  },
  {
    slug: "archive-route",
    name: "Archive Route",
    description: "A particular tour through archived intelligence reopens the game clock.",
    hint: "Visit Cheats, then Ranks, then return to Game.",
    difficulty: 3,
    category: "META",
    triggerConfig: sequence(
      ["cheats", "ranks", "game"].map((value) => ({ type: "PANEL_OPEN", value })),
      8_000,
    ),
    effectConfig: { timeScale: 0.39, label: "Archive route authenticated" },
    enabled: true,
  },
  {
    slug: "clue-cipher",
    name: "Clue Cipher",
    description: "Three highlighted words form a sentence the timer was built to obey.",
    hint: "Read only the marked words: TIME / BENDS / HERE.",
    difficulty: 3,
    category: "VISUAL",
    triggerConfig: sequence(
      ["time", "bends", "here"].map((value) => ({ type: "CLUE_TOKEN", value })),
      5_000,
    ),
    effectConfig: { timeScale: 0.26, label: "Cipher phrase resolved" },
    enabled: true,
  },
  {
    slug: "tab-return",
    name: "Tab Return",
    description: "A returning browser tab carries stale clock authority with it.",
    hint: "Leave and return — or type BACK if your device cannot.",
    difficulty: 4,
    category: "DEVICE",
    triggerConfig: {
      kind: "fallback",
      primary: { kind: "sequence", pattern: [{ type: "VISIBILITY_RETURN" }], windowMs: 10_000 },
      fallback: {
        kind: "sequence",
        pattern: ["B", "A", "C", "K"].map((value) => ({ type: "KEY", value })),
        windowMs: 3_000,
      },
    },
    effectConfig: { timeScale: 0.31, label: "Stale tab authority accepted" },
    enabled: true,
  },
  {
    slug: "horizon-shift",
    name: "Horizon Shift",
    description: "A landscape sensor reading changes the chamber's assumed gravity.",
    hint: "Turn the horizon — or spell HORIZON from a keyboard.",
    difficulty: 4,
    category: "DEVICE",
    triggerConfig: {
      kind: "fallback",
      primary: {
        kind: "sequence",
        pattern: [{ type: "ORIENTATION", value: "landscape" }],
        windowMs: 10_000,
      },
      fallback: {
        kind: "sequence",
        pattern: "HORIZON".split("").map((value) => ({ type: "KEY", value })),
        windowMs: 5_000,
      },
    },
    effectConfig: { timeScale: 0.24, label: "Gravity assumption rotated" },
    enabled: true,
  },
  {
    slug: "escape-hatch",
    name: "Escape Hatch",
    description: "The oldest keyboard exit sequence still controls the lab shell.",
    hint: "Escape. Enter. Escape again.",
    difficulty: 4,
    category: "META",
    triggerConfig: sequence(
      ["ESCAPE", "ENTER", "ESCAPE"].map((value) => ({ type: "KEY", value })),
      3_000,
    ),
    effectConfig: { timeScale: 0.22, label: "Shell escape hatch open" },
    enabled: true,
  },
  {
    slug: "mirrored-input",
    name: "Mirrored Input",
    description: "Alternating pointer and keyboard signals creates a doubled control identity.",
    hint: "Pointer, keyboard, pointer, keyboard — mirror the operator.",
    difficulty: 4,
    category: "OPERATION",
    triggerConfig: {
      kind: "alternating",
      first: { type: "INPUT_SOURCE", value: "pointer" },
      second: { type: "INPUT_SOURCE", value: "keyboard" },
      cycles: 2,
      windowMs: 4_000,
    },
    effectConfig: { timeScale: 0.2, label: "Dual operator identity" },
    enabled: true,
  },
  {
    slug: "ten-thousand-glyph",
    name: "Ten-Thousand Glyph",
    description: "The target itself becomes a service code when entered digit by digit.",
    hint: "Touch the target as five separate glyphs: 1 0 0 0 0.",
    difficulty: 5,
    category: "VISUAL",
    triggerConfig: sequence(
      [1, 0, 0, 0, 0].map((value) => ({ type: "GLYPH_TAP", value })),
      5_000,
    ),
    effectConfig: { timeScale: 0.18, label: "Target glyph override" },
    enabled: true,
  },
  {
    slug: "quiet-circuit",
    name: "Quiet Circuit",
    description: "A focus-only inspection route arms the timer without touching a control.",
    hint: "Focus Target, Mode, then Control. Do not activate them.",
    difficulty: 5,
    category: "META",
    triggerConfig: sequence(
      ["target", "mode", "control"].map((value) => ({ type: "FOCUS", value })),
      6_000,
    ),
    effectConfig: { timeScale: 0.16, label: "Quiet circuit armed" },
    enabled: true,
  },
] as const;

function matchesPattern(event: CheatEvent, pattern: EventPattern): boolean {
  return (
    event.type === pattern.type &&
    (pattern.value === undefined || event.value === pattern.value)
  );
}

function evaluateSequence(
  config: z.infer<typeof sequenceSchema>,
  events: readonly CheatEvent[],
): boolean {
  const relevantTypes = new Set(config.pattern.map(({ type }) => type));
  const relevantEvents = events.filter(({ type }) => relevantTypes.has(type));
  if (relevantEvents.length < config.pattern.length) return false;
  for (
    let start = 0;
    start <= relevantEvents.length - config.pattern.length;
    start += 1
  ) {
    const candidate = relevantEvents.slice(start, start + config.pattern.length);
    const matches = candidate.every((event, index) =>
      matchesPattern(event, config.pattern[index]),
    );
    if (
      matches &&
      (config.windowMs === undefined ||
        candidate.at(-1)!.at - candidate[0].at <= config.windowMs)
    ) {
      return true;
    }
  }
  return false;
}

function evaluateSimpleTrigger(
  config: z.infer<typeof simpleTriggerSchema>,
  events: readonly CheatEvent[],
): boolean {
  switch (config.kind) {
    case "sequence":
      return evaluateSequence(config, events);
    case "count": {
      const matching = events.filter((event) => event.type === config.eventType);
      if (matching.length < config.count) return false;
      const tail = matching.slice(-config.count);
      return tail.at(-1)!.at - tail[0].at <= config.windowMs;
    }
    case "hold":
    case "wait":
      return events.some(
        (event) =>
          event.type === config.eventType &&
          (event.durationMs ?? 0) >= config.minDurationMs,
      );
    case "alternating": {
      const expected = Array.from({ length: config.cycles * 2 }, (_, index) =>
        index % 2 === 0 ? config.first : config.second,
      );
      return evaluateSequence(
        { kind: "sequence", pattern: expected, windowMs: config.windowMs },
        events,
      );
    }
    case "rhythm": {
      const matching = events
        .filter((event) => event.type === config.eventType)
        .slice(-config.count);
      if (matching.length < config.count) return false;
      if (matching.at(-1)!.at - matching[0].at > config.windowMs) return false;
      const intervals = matching.slice(1).map((event, index) => event.at - matching[index].at);
      const average = intervals.reduce((total, interval) => total + interval, 0) / intervals.length;
      return intervals.every(
        (interval) => Math.abs(interval - average) <= config.maxDeviationMs,
      );
    }
  }
}

export function evaluateCheatTrigger(
  rawConfig: unknown,
  events: readonly CheatEvent[],
): boolean {
  const config = cheatTriggerConfigSchema.parse(rawConfig);
  if (config.kind === "fallback") {
    return (
      evaluateSequence(config.primary, events) ||
      evaluateSequence(config.fallback, events)
    );
  }
  return evaluateSimpleTrigger(config, events);
}

export function validateCheatDefinition(definition: CheatDefinition): CheatDefinition {
  cheatTriggerConfigSchema.parse(definition.triggerConfig);
  cheatEffectConfigSchema.parse(definition.effectConfig);
  if (!Number.isInteger(definition.difficulty) || definition.difficulty < 1 || definition.difficulty > 5) {
    throw new RangeError("Cheat difficulty must be an integer from 1 to 5");
  }
  return definition;
}
