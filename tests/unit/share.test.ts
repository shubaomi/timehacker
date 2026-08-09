import { describe, expect, it } from "vitest";
import { buildShareText } from "@/game/share";

describe("share text", () => {
  it("contains the measured result, mode, level, and collection progress", () => {
    expect(
      buildShareText({
        durationMs: 10_007,
        errorMs: 7,
        level: 4,
        unlockedCheats: 6,
        mode: "PURE",
      }),
    ).toContain("Result: 00:10.00 (+0.01s)\nMode: PURE\nLevel: 4\nCheats discovered: 6/100");
  });

  it("renders a complete Chinese field report", () => {
    expect(
      buildShareText({
        durationMs: 9_995,
        errorMs: -5,
        level: 3,
        unlockedCheats: 12,
        mode: "HACKER",
        locale: "zh",
      }),
    ).toContain("成绩：00:09.99（−0.01s）\n模式：黑客\n等级：3\n已发现漏洞：12/100");
  });
});
