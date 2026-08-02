import { describe, expect, it } from "vitest";
import {
  calculateLevel,
  difficultyForLevel,
  remainingDailyAttempts,
  utcDayRange,
} from "@/game/progress";

describe("progress domain", () => {
  it("calculates level in one bounded function", () => {
    expect(calculateLevel(0, 0)).toBe(1);
    expect(calculateLevel(3, 2)).toBe(3);
    expect(calculateLevel(999, 999)).toBe(20);
  });

  it("unlocks one difficulty band every four levels", () => {
    expect(difficultyForLevel(1)).toBe(1);
    expect(difficultyForLevel(5)).toBe(2);
    expect(difficultyForLevel(20)).toBe(5);
  });

  it.each([
    [49, 1],
    [50, 0],
    [51, 0],
  ])("reports remaining attempts at the %ith boundary", (attempts, remaining) => {
    expect(remainingDailyAttempts(attempts)).toBe(remaining);
  });

  it("uses UTC day boundaries", () => {
    const range = utcDayRange(new Date("2026-08-01T23:59:59.999-07:00"));
    expect(range.start.toISOString()).toBe("2026-08-02T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-03T00:00:00.000Z");
  });
});
