const MAX_LEVEL = 20;

export function calculateLevel(successGames: number, unlockedCheats: number): number {
  const safeSuccesses = Math.max(0, Math.floor(successGames));
  const safeCheats = Math.max(0, Math.floor(unlockedCheats));
  return Math.min(
    MAX_LEVEL,
    1 + Math.floor(safeSuccesses / 3) + Math.floor(safeCheats / 2),
  );
}

export function difficultyForLevel(level: number): number {
  return Math.min(5, Math.max(1, Math.ceil(Math.max(1, level) / 4)));
}

export function remainingDailyAttempts(
  attemptsToday: number,
  dailyLimit = 50,
): number {
  return Math.max(0, dailyLimit - Math.max(0, Math.floor(attemptsToday)));
}

export function utcDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1_000);
  return { start, end };
}

export function nextUtcReset(date: Date): Date {
  return utcDayRange(date).end;
}
