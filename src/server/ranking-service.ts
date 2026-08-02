import type { PrismaClient } from "@/generated/prisma/client";
import { anonymousName } from "./player-service";

export async function getRankings(database: PrismaClient) {
  const timeHackers = await database.user.findMany({
      take: 20,
      orderBy: [
        { currentLevel: "desc" },
        { successGames: "desc" },
        { firstSuccessAt: "asc" },
      ],
      select: {
        playerId: true,
        nickname: true,
        currentLevel: true,
        successGames: true,
      },
    });
  const perfectRecords = await database.gameRecord.findMany({
      where: {
        mode: "PURE",
        status: "COMPLETED",
        absoluteErrorMs: { not: null },
      },
      take: 20,
      orderBy: [{ absoluteErrorMs: "asc" }, { completedAt: "asc" }],
      select: {
        durationMs: true,
        errorMs: true,
        absoluteErrorMs: true,
        completedAt: true,
        user: { select: { playerId: true, nickname: true } },
      },
    });
  const cheatCandidates = await database.user.findMany({
      take: 100,
      include: {
        _count: { select: { unlockedCheats: true } },
        unlockedCheats: {
          take: 1,
          orderBy: { cheat: { difficulty: "desc" } },
          select: { completedAt: true, cheat: { select: { difficulty: true } } },
        },
      },
    });

  const cheatMasters = cheatCandidates
    .sort((left, right) => {
      const byCount = right._count.unlockedCheats - left._count.unlockedCheats;
      if (byCount !== 0) return byCount;
      const leftDifficulty = left.unlockedCheats[0]?.cheat.difficulty ?? 0;
      const rightDifficulty = right.unlockedCheats[0]?.cheat.difficulty ?? 0;
      if (rightDifficulty !== leftDifficulty) return rightDifficulty - leftDifficulty;
      return (
        (left.unlockedCheats[0]?.completedAt.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (right.unlockedCheats[0]?.completedAt.getTime() ?? Number.MAX_SAFE_INTEGER)
      );
    })
    .slice(0, 20);

  return {
    timeHackers: timeHackers.map((player, index) => ({
      rank: index + 1,
      displayName: player.nickname ?? anonymousName(player.playerId),
      level: player.currentLevel,
      successes: player.successGames,
    })),
    perfectTiming: perfectRecords.map((record, index) => ({
      rank: index + 1,
      displayName: record.user.nickname ?? anonymousName(record.user.playerId),
      durationMs: record.durationMs,
      errorMs: record.errorMs,
      absoluteErrorMs: record.absoluteErrorMs,
      completedAt: record.completedAt,
    })),
    cheatMasters: cheatMasters.map((player, index) => ({
      rank: index + 1,
      displayName: player.nickname ?? anonymousName(player.playerId),
      unlockedCheats: player._count.unlockedCheats,
      highestDifficulty: player.unlockedCheats[0]?.cheat.difficulty ?? 0,
    })),
  };
}
