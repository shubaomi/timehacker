import { formatDuration, formatSignedError } from "./timer";
import type { GameMode } from "./types";

interface ShareResultInput {
  durationMs: number;
  errorMs: number;
  level: number;
  unlockedCheats: number;
  totalCheats?: number;
  mode: GameMode;
}

export function buildShareText({
  durationMs,
  errorMs,
  level,
  unlockedCheats,
  totalCheats = 20,
  mode,
}: ShareResultInput): string {
  return [
    "TIME HACKER // FIELD REPORT",
    `Result: ${formatDuration(durationMs)} (${formatSignedError(errorMs)})`,
    `Mode: ${mode === "PURE" ? "PURE" : "HACKER"}`,
    `Level: ${level}`,
    `Cheats discovered: ${unlockedCheats}/${totalCheats}`,
    "Can you stop time at 10.000?",
  ].join("\n");
}
