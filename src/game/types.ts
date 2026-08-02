export const GAME_MODES = ["HACKER", "PURE"] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const CHEAT_CATEGORIES = [
  "OPERATION",
  "VISUAL",
  "RHYTHM",
  "DEVICE",
  "META",
] as const;

export type CheatCategory = (typeof CHEAT_CATEGORIES)[number];

export type CheatEventValue = string | number;

export interface CheatEvent {
  type: string;
  at: number;
  value?: CheatEventValue;
  durationMs?: number;
}

export interface EventPattern {
  type: string;
  value?: CheatEventValue;
}
