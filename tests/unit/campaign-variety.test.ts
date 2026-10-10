// @vitest-environment node
import { expect, it } from "vitest";
import { REASONING_CAMPAIGN as levels } from "@/game/reasoning-campaign/catalog";
import { solve, type Puzzle } from "@/game/reasoning-campaign/engine";

it("interleaves six families without three consecutive lessons of one family", () => {
  expect(new Set(levels.map(l => l.puzzle.kind)).size).toBe(6);
  for (let i = 2; i < levels.length; i++) {
    expect(new Set(levels.slice(i - 2, i + 1).map(l => l.puzzle.kind)).size).toBeGreaterThan(1);
  }
});

it("does not repeat identical rules with only a different initial state or target", () => {
  const keys = levels.map(l => {
    const { initial, target, ...rule } = l.puzzle as Puzzle & { target?: unknown };
    void initial; void target;
    return JSON.stringify(rule);
  });
  expect(new Set(keys).size).toBe(100);
});

it("increases average minimum work across five bands, without claiming human difficulty", () => {
  const means = Array.from({ length: 5 }, (_, band) =>
    levels.slice(band * 20, band * 20 + 20).reduce((sum, l) => sum + solve(l.puzzle)!.length, 0) / 20);
  for (let i = 1; i < means.length; i++) expect(means[i]).toBeGreaterThan(means[i - 1]);
});
