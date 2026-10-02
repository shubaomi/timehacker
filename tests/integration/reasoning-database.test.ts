// @vitest-environment node
import {randomUUID} from "node:crypto";
import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "@/generated/prisma/client";
import {afterAll,expect,it} from "vitest";
import {seedCheatCatalog} from "@/server/seed-service";
import {createOrResumePlayer,getDashboard} from "@/server/player-service";
import {startGame,completeGame} from "@/server/game-service";
import {REASONING_SLUGS} from "@/game/reasoning-campaign/order";
import {CHEAT_DEFINITIONS} from "@/game/cheats";
import {effectWallTimeToTarget} from "@/game/effects";

if(new URL(process.env.DATABASE_URL!).pathname!=="/timehacker_r100_verify_20261002" || process.env.NEXT_PUBLIC_TIME_HACKER_REASONING_CAMPAIGN!=="1")throw new Error("Requires isolated R100 database and feature flag; never run on production");
const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL,max:2})});
afterAll(()=>db.$disconnect());
it("migrates catalog without identity loss and completes onboarding plus all remaining levels",async()=>{
  const before=await db.cheatMethod.findMany({select:{id:true,slug:true},orderBy:{slug:"asc"}});
  await seedCheatCatalog(db);
  expect(await db.cheatMethod.findMany({select:{id:true,slug:true},orderBy:{slug:"asc"}})).toEqual(before);
  const playerId=`r100-journey-${randomUUID()}`;
  await createOrResumePlayer(db,playerId);
  for(let i=0;i<100;i++){
    const now=new Date(Date.UTC(2026,9,3+Math.floor(i/25),10,i%25));
    const dashboard=await getDashboard(db,playerId,5,now);
    expect(dashboard.suggestedCheat?.slug).toBe(REASONING_SLUGS[i]);
    expect(dashboard.campaign.currentLevelNumber).toBe(i+1);
    expect(dashboard.campaign.track).toBe(i<12?"SOFT_LAUNCH":"FULL");
    const definition=CHEAT_DEFINITIONS.find(d=>d.slug===REASONING_SLUGS[i])!;
    const game=await startGame(db,{playerId,clientRequestId:randomUUID(),mode:"HACKER",difficulty:definition.difficulty,assignedCheatSlug:definition.slug},now);
    const wallDurationMs=effectWallTimeToTarget(definition.effectConfig,10000);
    const result=await completeGame(db,{playerId,gameId:game.id,durationMs:10000,wallDurationMs,events:[{type:"V2_PUZZLE_DISCOVERED",value:definition.slug,at:1},{type:"V2_PUZZLE_ARMED",value:definition.slug,at:600000}]},new Date(now.getTime()+wallDurationMs));
    expect(result.success).toBe(true);
  }
  const last=await getDashboard(db,playerId,5,new Date("2026-10-08T10:00:00Z"));
  expect(last.campaign).toMatchObject({complete:true,completedLevels:100,totalLevels:100,track:"FULL"});
  expect(last.suggestedCheat).toBeNull();
},600000);
