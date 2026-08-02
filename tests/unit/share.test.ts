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
    ).toContain("Result: 00:10.007 (+0.007s)\nMode: PURE\nLevel: 4\nCheats discovered: 6/20");
  });
});
