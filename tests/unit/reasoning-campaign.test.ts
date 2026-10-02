import { describe, expect, it } from "vitest";
import { REASONING_CAMPAIGN } from "@/game/reasoning-campaign/catalog";
import { actions, transition, solved, solve } from "@/game/reasoning-campaign/engine";

describe("R100 authored campaign gate", () => {
  it("contains exactly 100 stable learning positions", () => {
    expect(REASONING_CAMPAIGN.map((l) => l.ordinal)).toEqual(Array.from({ length: 100 }, (_, i) => i+1));
    expect(new Set(REASONING_CAMPAIGN.map((l) => JSON.stringify(l.puzzle))).size).toBe(100);
  });
  for (const level of REASONING_CAMPAIGN) {
    it(`${level.ordinal}: requires multiple actions and has a legal solution`, () => {
      expect(solved(level.puzzle, level.puzzle.initial)).toBe(false);
      for (const action of actions(level.puzzle)) {
        expect(solved(level.puzzle, transition(level.puzzle, level.puzzle.initial, action).state)).toBe(false);
      }
      const path = solve(level.puzzle);
      expect(path).not.toBeNull();
      let state = [...level.puzzle.initial];
      for (const action of path!) state = transition(level.puzzle, state, action).state;
      expect(solved(level.puzzle, state)).toBe(true);
    });
  }
  it("route chapters cannot bypass every gate", () => {
    for (const {puzzle,ordinal} of REASONING_CAMPAIGN) {
      if(puzzle.kind !== "route")continue;
      expect(solve({...puzzle,rows:puzzle.rows.map(row=>row.replace(/[ABC]/g,"#"))}),String(ordinal)).toBeNull();
    }
  });
  it("the finale requires its conditional path and rejects the chapter-two shortcut", () => {
    const puzzle=REASONING_CAMPAIGN[99].puzzle;
    if(puzzle.kind!=="flow")throw new Error("Finale contract");
    expect(transition(puzzle,puzzle.initial,0).blocked).toBe("condition");
    expect(solve({...puzzle,edges:puzzle.edges.slice(1)})).toBeNull();
    let state=[...puzzle.initial];
    for(const action of [0,0,2,2,3,3,4,4])state=transition(puzzle,state,action).state;
    expect(solved(puzzle,state)).toBe(false);
  });
});
