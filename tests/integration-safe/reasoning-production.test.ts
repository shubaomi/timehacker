// @vitest-environment node
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
vi.hoisted(() => { process.env.NEXT_PUBLIC_TIME_HACKER_REASONING_CAMPAIGN = "1"; });
import { CHEAT_DEFINITIONS, evaluateCheatTrigger, validateCheatDefinition } from "@/game/cheats";
import { REASONING_CAMPAIGN } from "@/game/reasoning-campaign/catalog";
import { REASONING_SLUGS, isReasoningEnabled } from "@/game/reasoning-campaign/order";
import { SOFT_LAUNCH_SLUGS, publicLevelNumber } from "@/game/soft-launch";
import { V2_LEVELS } from "@/game/v2-levels.generated";
import { selectNextCheat } from "@/game/selection";
import { effectElapsedTime } from "@/game/effects";

describe("R100 production contracts without shared database writes", () => {
  it("preserves all identities and the frozen onboarding prefix", () => {
    expect(REASONING_SLUGS.slice(0,12)).toEqual(SOFT_LAUNCH_SLUGS);
    expect([...REASONING_SLUGS].sort()).toEqual(V2_LEVELS.map(l=>l.slug).sort());
    expect(new Set(REASONING_SLUGS).size).toBe(100);
    expect(isReasoningEnabled("0")).toBe(false);
  });
  it("reaches all 100 in curriculum order and never reassigns an unlocked identity", () => {
    const discoveredSlugs = new Set<string>();
    for (let i=0;i<100;i++) {
      const definition=selectNextCheat({definitions:CHEAT_DEFINITIONS,discoveredSlugs,desiredDifficulty:5,seed:""})!;
      expect(definition.slug).toBe(REASONING_SLUGS[i]);
      expect(publicLevelNumber(definition.slug,"FULL")).toBe(i+1);
      expect(definition.difficulty).toBe(Math.ceil((i+1)/20));
      discoveredSlugs.add(definition.slug);
    }
    expect(selectNextCheat({definitions:CHEAT_DEFINITIONS,discoveredSlugs,desiredDifficulty:5,seed:""})).toBeNull();
  });
  it("does not expire a long puzzle and does not change the assist reward", () => {
    for (const d of CHEAT_DEFINITIONS) {
      expect(validateCheatDefinition(d).triggerConfig.reasoning?.revision).toBe(3);
      expect(evaluateCheatTrigger(d.triggerConfig,[{type:"V2_PUZZLE_ARMED",value:d.slug,at:600_000}])).toBe(false);
      expect(evaluateCheatTrigger(d.triggerConfig,[{type:"V2_PUZZLE_DISCOVERED",value:d.slug,at:1},{type:"V2_PUZZLE_ARMED",value:d.slug,at:600_000}])).toBe(true);
      expect(effectElapsedTime(14_501,d.effectConfig)).toBe(10_000);
      expect(effectElapsedTime(17_499,d.effectConfig)).toBe(10_000);
    }
  });
  it("implements every frozen numeric specification exactly", async () => {
    const specs = (await Promise.all(Array.from({length:10},(_,i)=>readFile(`docs/contracts/reasoning-100/chapter-${String(i+1).padStart(2,"0")}.md`,"utf8"))))
      .flatMap(text=>[...text.matchAll(/```json\r?\n([^`]+)\r?\n```/g)].map(match=>JSON.parse(match[1])));
    expect(specs).toEqual(REASONING_CAMPAIGN.map(l=>l.puzzle));
  });
});
