// @vitest-environment node

import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import { effectWallTimeToTarget } from "@/game/effects";
import { completeGame, startGame } from "@/server/game-service";
import {
  createOrResumePlayer,
  getDashboard,
  resetPlayer,
} from "@/server/player-service";
import { getRankings } from "@/server/ranking-service";
import { seedCheatCatalog } from "@/server/seed-service";
import { retryTransientDatabaseOperation } from "../database-retry";

config({ path: ".env.local", quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for database integration tests");
}

const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, keepAlive: true, max: 5 }) });
const runId = randomUUID().slice(0, 8);
const prefix = `e2e-${runId}`;
const fixedNow = new Date("2026-08-02T10:00:00.000Z");

function playerId(label: string): string {
  return `${prefix}-${label}`;
}

describe("real PostgreSQL integration", () => {
  beforeAll(async () => {
    await retryTransientDatabaseOperation(() => database.user.deleteMany({ where: { playerId: { startsWith: prefix } } }));
  });

  afterAll(async () => {
    await retryTransientDatabaseOperation(() => database.user.deleteMany({ where: { playerId: { startsWith: prefix } } }));
    await database.$disconnect();
  });

  it("has the deployed migrations and an idempotent bilingual 100-cheat seed", async () => {
    const migrations = await database.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
    `;
    expect(migrations.map(({ migration_name }) => migration_name)).toContain(
      "20260802050000_init",
    );
    expect(migrations.map(({ migration_name }) => migration_name)).toContain(
      "20260802190000_add_cheat_localizations",
    );
    expect(await seedCheatCatalog(database)).toBe(100);
    expect(await seedCheatCatalog(database)).toBe(100);
    expect(await database.cheatMethod.count()).toBe(100);
    expect(
      await database.cheatMethod.groupBy({ by: ["slug"], _count: { slug: true } }),
    ).toHaveLength(100);
    expect(await database.cheatMethod.count({ where: { nameZh: { not: null } } })).toBe(100);
  });

  it("creates an anonymous player idempotently and exposes a non-repeating assignment", async () => {
    const id = playerId("idempotent");
    const first = await createOrResumePlayer(database, id);
    const second = await createOrResumePlayer(database, id);
    expect(second.playerId).toBe(first.playerId);
    expect(await database.user.count({ where: { playerId: id } })).toBe(1);

    const dashboard = await getDashboard(database, id, 1, fixedNow);
    expect(dashboard.suggestedCheat?.difficulty).toBe(1);
    expect(dashboard.collection).toHaveLength(100);
    expect(dashboard.collection.every((entry) => !entry.unlocked)).toBe(true);
  });

  it("writes and idempotently completes a winning Hacker record", async () => {
    const id = playerId("hacker-win");
    await createOrResumePlayer(database, id);
    const game = await startGame(
      database,
      {
        playerId: id,
        clientRequestId: `${prefix}-hacker-request`,
        mode: "HACKER",
        difficulty: 1,
        assignedCheatSlug: "five-finger-echo",
      },
      fixedNow,
    );
    const events = Array.from({ length: 5 }, (_, index) => ({
      type: "TIMER_TAP",
      at: index * 200,
    }));
    const effect = CHEAT_DEFINITIONS.find(({ slug }) => slug === "five-finger-echo")!.effectConfig;
    const wallDurationMs = effectWallTimeToTarget(effect, 10_000) + 1_500;
    const first = await completeGame(
      database,
      { playerId: id, gameId: game.id, durationMs: 9_000, wallDurationMs, events },
      new Date(fixedNow.getTime() + 15_000),
    );
    const second = await completeGame(
      database,
      { playerId: id, gameId: game.id, durationMs: 9_000, wallDurationMs, events },
      new Date(fixedNow.getTime() + 16_000),
    );
    expect(first.success).toBe(true);
    expect(first.durationMs).toBe(10_000);
    expect(second.id).toBe(first.id);
    expect(first.usedCheat?.slug).toBe("five-finger-echo");
    expect(first.assistanceType).toBe(effect.type);
    expect(first.wallDurationMs).toBe(Math.round(wallDurationMs));

    const player = await database.user.findUniqueOrThrow({
      where: { playerId: id },
      include: { unlockedCheats: true },
    });
    expect(player.totalGames).toBe(1);
    expect(player.successGames).toBe(1);
    expect(player.bestErrorMs).toBe(0);
    expect(player.unlockedCheats).toHaveLength(1);
  });

  it("lets only a server-verified tolerance ritual widen Hacker judgment", async () => {
    const hackerId = playerId("tolerance-hacker");
    const pureId = playerId("tolerance-pure");
    await Promise.all([
      createOrResumePlayer(database, hackerId),
      createOrResumePlayer(database, pureId),
    ]);
    const hackerGame = await startGame(database, {
      playerId: hackerId,
      clientRequestId: `${prefix}-tolerance-hacker`,
      mode: "HACKER",
      difficulty: 1,
      assignedCheatSlug: "double-relay",
    }, fixedNow);
    const pureGame = await startGame(database, {
      playerId: pureId,
      clientRequestId: `${prefix}-tolerance-pure`,
      mode: "PURE",
      difficulty: 1,
    }, fixedNow);
    const events = [
      { type: "RITUAL_PULSE", value: "short", at: 100 },
      { type: "RITUAL_PULSE", value: "long", at: 500 },
    ];
    const toleranceEffect = CHEAT_DEFINITIONS.find(({ slug }) => slug === "double-relay")!.effectConfig;
    expect(toleranceEffect.type).toBe("TOLERANCE_ASSIST");
    const hackerResult = await completeGame(database, {
      playerId: hackerId,
      gameId: hackerGame.id,
      durationMs: 10_015,
      wallDurationMs: effectWallTimeToTarget(toleranceEffect, 10_015),
      events,
    });
    const pureResult = await completeGame(database, {
      playerId: pureId,
      gameId: pureGame.id,
      durationMs: 10_015,
      wallDurationMs: 10_015,
      events,
    });
    expect(hackerResult.success).toBe(true);
    expect(hackerResult.assistanceType).toBe("TOLERANCE_ASSIST");
    expect(hackerResult.toleranceMs).toBe(20);
    expect(pureResult.success).toBe(false);
    expect(pureResult.assistanceType).toBeNull();
    expect(pureResult.toleranceMs).toBe(10);
  });

  it("enforces the 49, 50, and 51 attempt boundary under concurrency", async () => {
    const id = playerId("daily-limit");
    const player = await database.user.create({ data: { playerId: id } });
    await database.gameRecord.createMany({
      data: Array.from({ length: 49 }, (_, index) => ({
        clientRequestId: `${prefix}-limit-${index}`,
        userId: player.id,
        mode: "PURE" as const,
        startedAt: fixedNow,
      })),
    });

    const boundary = await Promise.allSettled([
      startGame(
        database,
        {
          playerId: id,
          clientRequestId: `${prefix}-limit-50a`,
          mode: "PURE",
          difficulty: 1,
        },
        fixedNow,
      ),
      startGame(
        database,
        {
          playerId: id,
          clientRequestId: `${prefix}-limit-50b`,
          mode: "PURE",
          difficulty: 1,
        },
        fixedNow,
      ),
    ]);
    expect(boundary.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(boundary.filter(({ status }) => status === "rejected")).toHaveLength(1);
    expect(await database.gameRecord.count({ where: { userId: player.id } })).toBe(50);
    await expect(
      startGame(
        database,
        {
          playerId: id,
          clientRequestId: `${prefix}-limit-51`,
          mode: "PURE",
          difficulty: 1,
        },
        fixedNow,
      ),
    ).rejects.toMatchObject({ code: "DAILY_LIMIT_REACHED", status: 429 });
  });

  it("orders all three ranks from database-backed records", async () => {
    const closerId = playerId("pure-close");
    const fartherId = playerId("pure-far");
    await Promise.all([
      createOrResumePlayer(database, closerId),
      createOrResumePlayer(database, fartherId),
    ]);
    const closeGame = await startGame(
      database,
      {
        playerId: closerId,
        clientRequestId: `${prefix}-pure-close`,
        mode: "PURE",
        difficulty: 1,
      },
      fixedNow,
    );
    const farGame = await startGame(
      database,
      {
        playerId: fartherId,
        clientRequestId: `${prefix}-pure-far`,
        mode: "PURE",
        difficulty: 1,
      },
      fixedNow,
    );
    await completeGame(
      database,
      { playerId: closerId, gameId: closeGame.id, durationMs: 10_005, events: [] },
      new Date(fixedNow.getTime() + 12_000),
    );
    await completeGame(
      database,
      { playerId: fartherId, gameId: farGame.id, durationMs: 10_009, events: [] },
      new Date(fixedNow.getTime() + 13_000),
    );

    const rankings = await getRankings(database);
    const closeName = rankings.perfectTiming.find(({ displayName }) =>
      displayName.endsWith(closerId.replaceAll("-", "").slice(-4).toUpperCase()),
    );
    const farName = rankings.perfectTiming.find(({ displayName }) =>
      displayName.endsWith(fartherId.replaceAll("-", "").slice(-4).toUpperCase()),
    );
    expect(closeName).toBeDefined();
    expect(farName).toBeDefined();
    expect(closeName!.rank).toBeLessThan(farName!.rank);
    expect(rankings.timeHackers.length).toBeGreaterThan(0);
    expect(rankings.cheatMasters.length).toBeGreaterThan(0);
  });

  it("resets only the selected player and preserves catalog and neighbors", async () => {
    const resetId = playerId("reset-target");
    const neighborId = playerId("reset-neighbor");
    await Promise.all([
      createOrResumePlayer(database, resetId),
      createOrResumePlayer(database, neighborId),
    ]);
    const resetUser = await database.user.findUniqueOrThrow({ where: { playerId: resetId } });
    const neighbor = await database.user.findUniqueOrThrow({ where: { playerId: neighborId } });
    await database.gameRecord.createMany({
      data: [
        { clientRequestId: `${prefix}-reset-record`, userId: resetUser.id, mode: "PURE" },
        { clientRequestId: `${prefix}-neighbor-record`, userId: neighbor.id, mode: "PURE" },
      ],
    });

    await resetPlayer(database, resetId);
    expect(await database.gameRecord.count({ where: { userId: resetUser.id } })).toBe(0);
    expect(await database.gameRecord.count({ where: { userId: neighbor.id } })).toBe(1);
    expect(await database.cheatMethod.count()).toBe(100);
  });

  it("enforces foreign keys and the user-cheat unique constraint", async () => {
    const id = playerId("constraints");
    const player = await database.user.create({ data: { playerId: id } });
    const cheat = await database.cheatMethod.findUniqueOrThrow({
      where: { slug: "pressure-delay" },
    });
    await database.userCheat.create({ data: { userId: player.id, cheatId: cheat.id } });
    await expect(
      database.userCheat.create({ data: { userId: player.id, cheatId: cheat.id } }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      database.userCheat.create({ data: { userId: randomUUID(), cheatId: cheat.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
});
