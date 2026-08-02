import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatSignedError,
  measureGame,
  scaledElapsedTime,
} from "@/game/timer";

describe("timer domain", () => {
  it("formats milliseconds as a stable laboratory readout", () => {
    expect(formatDuration(0)).toBe("00:00.000");
    expect(formatDuration(10_023)).toBe("00:10.023");
    expect(formatDuration(61_005)).toBe("01:01.005");
  });

  it.each([
    [0, true],
    [9, true],
    [-9, true],
    [10, true],
    [-10, true],
    [11, false],
    [-11, false],
  ])("treats an error of %ims as success=%s", (errorMs, success) => {
    expect(measureGame(10_000 + errorMs).success).toBe(success);
  });

  it("keeps signed and absolute errors", () => {
    expect(measureGame(9_977)).toMatchObject({
      errorMs: -23,
      absoluteErrorMs: 23,
    });
    expect(formatSignedError(-23)).toBe("−0.023s");
    expect(formatSignedError(23)).toBe("+0.023s");
  });

  it("scales hacker time without changing pure time", () => {
    expect(scaledElapsedTime(2_000, 1)).toBe(2_000);
    expect(scaledElapsedTime(2_000, 0.25)).toBe(500);
    expect(() => scaledElapsedTime(2_000, 0)).toThrow(RangeError);
  });
});
