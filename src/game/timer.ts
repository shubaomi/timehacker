export const TARGET_MS = 10_000;
export const SUCCESS_TOLERANCE_MS = 10;

export interface GameMeasurement {
  durationMs: number;
  errorMs: number;
  absoluteErrorMs: number;
  success: boolean;
}

export function formatDuration(durationMs: number): string {
  const safeDuration = Math.max(0, Math.round(durationMs));
  const minutes = Math.floor(safeDuration / 60_000);
  const seconds = Math.floor((safeDuration % 60_000) / 1_000);
  const hundredths = Math.floor((safeDuration % 1_000) / 10);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

export function formatSignedError(errorMs: number): string {
  const rounded = Math.round(errorMs);
  const sign = rounded >= 0 ? "+" : "−";
  return `${sign}${(Math.abs(rounded) / 1_000).toFixed(2)}s`;
}

export function measureGame(
  durationMs: number,
  targetMs = TARGET_MS,
  toleranceMs = SUCCESS_TOLERANCE_MS,
): GameMeasurement {
  const roundedDuration = Math.round(durationMs);
  const errorMs = roundedDuration - targetMs;
  const absoluteErrorMs = Math.abs(errorMs);

  return {
    durationMs: roundedDuration,
    errorMs,
    absoluteErrorMs,
    success: absoluteErrorMs <= toleranceMs,
  };
}

export function scaledElapsedTime(wallElapsedMs: number, timeScale: number): number {
  if (!Number.isFinite(timeScale) || timeScale <= 0 || timeScale > 1) {
    throw new RangeError("timeScale must be greater than 0 and at most 1");
  }

  return Math.max(0, wallElapsedMs) * timeScale;
}
