import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
vi.hoisted(() => { process.env.NEXT_PUBLIC_TIME_HACKER_REASONING_CAMPAIGN = "1"; });
import { TimeHackerApp } from "@/components/time-hacker-app";
import { LocaleProvider } from "@/i18n/locale-provider";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { REASONING_CAMPAIGN } from "@/game/reasoning-campaign/catalog";
import { solve } from "@/game/reasoning-campaign/engine";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); localStorage.clear(); });
it("retains discovery after long keyboard exploration and resets a solved scene with its event state", async () => {
  const cheat = CHEAT_DEFINITIONS.find(c=>c.triggerConfig.reasoning?.ordinal===1)!;
  const dashboard = { player: { playerId: "r100-component", displayName: "Test", nickname:null, currentLevel:1, totalGames:0, successGames:0, bestErrorMs:null, firstSuccessAt:null, unlockedCheats:0 }, daily:{ limit:50, attempts:0, remaining:50, resetsAt:"2026-10-04T00:00:00Z" }, difficulty:1, maximumDifficulty:1, suggestedCheat:cheat, campaign:{track:"SOFT_LAUNCH", totalLevels:12, completedLevels:0, currentLevelNumber:1, complete:false}, collection:[] };
  vi.stubGlobal("fetch", vi.fn(async(input:RequestInfo|URL)=>String(input).startsWith("/api/dashboard") ? Response.json(dashboard) : Response.json({player:{playerId:"r100-component"}})));
  render(<LocaleProvider initialLocale="en"><TimeHackerApp/></LocaleProvider>);
  await screen.findByTestId("reasoning-scene");
  const path=solve(REASONING_CAMPAIGN[0].puzzle)!;
  fireEvent.click(screen.getByTestId(`reasoning-action-${path[0]}`));
  for(let i=0;i<150;i++)fireEvent.keyDown(window,{key:"Tab"});
  path.slice(1).forEach(action=>fireEvent.click(screen.getByTestId(`reasoning-action-${action}`)));
  expect(document.querySelector(".play-timer")).toHaveClass("has-secret");
  fireEvent.click(screen.getByRole("button",{name:"Open game menu"}));
  fireEvent.click(screen.getByRole("button",{name:"With secrets"}));
  await waitFor(()=>expect(screen.getByTestId("reasoning-scene")).toHaveAttribute("data-solved","false"));
  expect(document.querySelector(".play-timer")).not.toHaveClass("has-secret");
  path.forEach(action=>fireEvent.click(screen.getByTestId(`reasoning-action-${action}`)));
  expect(document.querySelector(".play-timer")).toHaveClass("has-secret");
});
