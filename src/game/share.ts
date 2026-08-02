import { formatDuration, formatSignedError } from "./timer";
import type { GameMode } from "./types";
import { translate, type Locale } from "@/i18n/config";

interface ShareResultInput {
  durationMs: number;
  errorMs: number;
  level: number;
  unlockedCheats: number;
  totalCheats?: number;
  mode: GameMode;
  assistanceType?: string | null;
  locale?: Locale;
}

export function buildShareText({
  durationMs,
  errorMs,
  level,
  unlockedCheats,
  totalCheats = 100,
  mode,
  assistanceType,
  locale = "en",
}: ShareResultInput): string {
  return [
    translate(locale, "shareHeader"),
    translate(locale, "shareResult", { duration: formatDuration(durationMs), error: formatSignedError(errorMs) }),
    translate(locale, "shareMode", { mode: translate(locale, mode === "PURE" ? "modePure" : "modeHacker") }),
    ...(assistanceType ? [translate(locale, "shareAssistance", { type: assistanceType })] : []),
    translate(locale, "shareLevel", { level }),
    translate(locale, "shareCheats", { count: unlockedCheats, total: totalCheats }),
    translate(locale, "shareChallenge"),
  ].join("\n");
}
