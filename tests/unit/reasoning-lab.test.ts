import { describe, expect, it } from "vitest";
import { REASONING_LEVELS, applyMove, availableMoves, findSolution, isSolved, projectLayers } from "@/game/reasoning-lab";

describe("isolated reasoning experiments", () => {
  it.each([0, 1, 2, 3])("sample %i requires a relationship, has a reachable solution and accepts state rather than a password", (index) => {
    const level = REASONING_LEVELS[index];
    expect(isSolved(level, level.initial)).toBe(false);
    for (const move of availableMoves(level)) {
      expect(isSolved(level, applyMove(level, level.initial, move).state)).toBe(false);
    }
    const solution = findSolution(level, level.initial);
    expect(solution).not.toBeNull();
    expect(solution!.length).toBeGreaterThan(1);
    let state = [...level.initial];
    for (const move of solution!) state = applyMove(level, state, move).state;
    expect(isSolved(level, state)).toBe(true);
  });

  it("conserves time and bounds for every reachable transfer state, including rejected moves", () => {
    for (const level of REASONING_LEVELS.filter((item) => item.kind === "transfer")) {
      const queue = [[...level.initial]];
      const seen = new Set([level.initial.join()]);
      for (let i = 0; i < queue.length; i++) {
        const state = queue[i];
        for (const move of availableMoves(level)) {
          const next = applyMove(level, state, move);
          expect(next.state.reduce((sum, value) => sum + value, 0)).toBe(30);
          expect(next.state.every((value) => value >= 0 && value <= 16)).toBe(true);
          if (next.blocked) expect(next.state).toEqual(state);
          const key = next.state.join();
          if (!seen.has(key)) { seen.add(key); queue.push(next.state); }
        }
      }
      expect(seen.size).toBeGreaterThan(20);
    }
  });

  it("accepts both valid overlap solutions, not just the designer's first path", () => {
    const level = REASONING_LEVELS[2];
    expect(isSolved(level, [2, 7, 4])).toBe(true);
    expect(isSolved(level, [8, 1, 4])).toBe(true);
    expect(isSolved(level, [2, 7, 3])).toBe(false);
  });

  it("requires leaving a locally improving path in both transfer samples", () => {
    const error = (state: readonly number[]) => state.reduce((sum, value) => sum + Math.abs(value - 10), 0);
    for (const level of REASONING_LEVELS.filter((item) => item.kind === "transfer")) {
      const queue = [[...level.initial]];
      const seen = new Set([level.initial.join()]);
      for (let i = 0; i < queue.length; i++) for (const move of availableMoves(level)) {
        const next = applyMove(level, queue[i], move);
        const key = next.state.join();
        if (next.blocked || seen.has(key) || error(next.state) > error(queue[i])) continue;
        seen.add(key);
        queue.push(next.state);
      }
      expect(queue.some((state) => isSolved(level, state))).toBe(false);
    }
  });

  it("enumerates layer solutions and round trips every rotation without information loss", () => {
    for (const level of REASONING_LEVELS.filter((item) => item.kind === "layers")) {
      let count = 0;
      for (let a = 0; a < 12; a++) for (let b = 0; b < 12; b++) for (let c = 0; c < 12; c++) {
        const state = [a, b, c];
        if (isSolved(level, state)) {
          count++;
          // B2 must actually require the promised third signal, not just a denser B1.
          if (level.id === "B2") expect(projectLayers(level, state).counts[10]).toBe(3);
        }
        for (let row = 0; row < 3; row++) {
          const next = applyMove(level, state, row * 2).state;
          expect(applyMove(level, next, row * 2 + 1).state).toEqual(state);
        }
        const projected = projectLayers(level, state);
        expect(projected.counts.map((value) => value % 2)).toEqual(projected.lit);
      }
      expect(count).toBe(level.id === "B1" ? 2 : 1);
    }
  });

  it("does not mutate an earlier snapshot and rejects invalid moves", () => {
    const level = REASONING_LEVELS[0];
    const before = Object.freeze([...level.initial]);
    applyMove(level, before, 0);
    expect(before).toEqual(level.initial);
    expect(applyMove(level, before, 999).state).toEqual(before);
  });
});
