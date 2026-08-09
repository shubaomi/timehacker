import { describe, expect, it } from "vitest";
import {
  evaluateFigureEightTrace,
  evaluateVTrace,
  getPrototypeTimer,
  nextSlowWordLetter,
} from "@/game/v2-prototype";

describe("V2 prototype rules", () => {
  it("keeps every visible timer value to two decimal places", () => {
    expect(getPrototypeTimer("DORMANT", false)).toEqual({ time: "0.00", delta: null });
    expect(getPrototypeTimer("RUNNING_NORMAL", false)).toEqual({ time: "6.28", delta: null });
    expect(getPrototypeTimer("RUNNING_ASSISTED", true)).toEqual({ time: "9.98", delta: null });
    expect(getPrototypeTimer("RESULT", false)).toEqual({ time: "8.42", delta: "−1.58" });
    expect(getPrototypeTimer("RESULT", true)).toEqual({ time: "10.00", delta: "+0.00" });
  });

  it("requires varied cycling rather than one mechanical pass to turn FAST into SLOW", () => {
    const fast = ["F", "A", "S", "T"] as const;
    const once = fast.map((letter, index) => nextSlowWordLetter(index, letter, 1));
    expect(once.join("")).not.toBe("SLOW");

    expect(nextSlowWordLetter(0, "F", 2)).toBe("S");
    expect(nextSlowWordLetter(1, "A", 1)).toBe("L");
    expect(nextSlowWordLetter(2, "S", 2)).toBe("O");
    expect(nextSlowWordLetter(3, "T", 2)).toBe("W");
  });

  it("accepts a broad V gesture but rejects three unrelated points", () => {
    expect(
      evaluateVTrace([
        { x: 12, y: 14 },
        { x: 26, y: 45 },
        { x: 48, y: 82 },
        { x: 71, y: 47 },
        { x: 90, y: 12 },
      ]),
    ).toBe(true);

    expect(
      evaluateVTrace([
        { x: 10, y: 10 },
        { x: 50, y: 12 },
        { x: 90, y: 14 },
      ]),
    ).toBe(false);
  });

  it("recognises figure-eight topology without pixel matching", () => {
    const figureEight = [
      { x: 50, y: 50 },
      { x: 25, y: 25 },
      { x: 8, y: 50 },
      { x: 25, y: 75 },
      { x: 50, y: 50 },
      { x: 75, y: 25 },
      { x: 92, y: 50 },
      { x: 75, y: 75 },
      { x: 50, y: 50 },
    ];
    expect(evaluateFigureEightTrace(figureEight)).toBe(true);
    expect(evaluateFigureEightTrace(figureEight.slice(0, 5))).toBe(false);
  });
});
