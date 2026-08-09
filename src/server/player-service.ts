import type { PrismaClient } from "@/generated/prisma/client";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import {
  difficultyForLevel,
  nextUtcReset,
  remainingDailyAttempts,
  utcDayRange,
} from "@/game/progress";
import { selectNextCheat } from "@/game/selection";
import { AppError } from "./errors";

export function anonymousName(playerId: string): string {
  return `Agent ${playerId.replaceAll("-", "").slice(-4).toUpperCase()}`;
}

export async function createOrResumePlayer(
  database: PrismaClient,
  playerId: string,
) {
  return database.user.upsert({
    where: { playerId },
    update: {},
    create: { playerId },
    select: {
      playerId: true,
      nickname: true,
      currentLevel: true,
      totalGames: true,
      successGames: true,
      bestErrorMs: true,
      firstSuccessAt: true,
      createdAt: true,
    },
  });
}

export async function updateNickname(
  database: PrismaClient,
  playerId: string,
  nickname: string,
) {
  try {
    return await database.user.update({
      where: { playerId },
      data: { nickname },
      select: { playerId: true, nickname: true },
    });
  } catch {
    throw new AppError("Anonymous player was not found.", 404, "PLAYER_NOT_FOUND");
  }
}

export async function getDashboard(
  database: PrismaClient,
  playerId: string,
  requestedDifficulty: number,
  now = new Date(),
) {
  const player = await database.user.findUnique({
    where: { playerId },
    include: {
      unlockedCheats: {
        include: { cheat: true },
        orderBy: { completedAt: "asc" },
      },
    },
  });
  if (!player) {
    throw new AppError("Anonymous player was not found.", 404, "PLAYER_NOT_FOUND");
  }

  const maximumDifficulty = player.firstSuccessAt
    ? difficultyForLevel(player.currentLevel)
    : 1;
  const requested = Math.min(maximumDifficulty, Math.max(1, requestedDifficulty));
  const discoveredSlugs = new Set(
    player.unlockedCheats.map(({ cheat }) => cheat.slug),
  );
  const suggestedCheat = selectNextCheat({
    definitions: CHEAT_DEFINITIONS,
    discoveredSlugs,
    desiredDifficulty: maximumDifficulty,
    seed: `${player.playerId}:${player.totalGames}:${now.toISOString().slice(0, 10)}`,
  });
  const { start, end } = utcDayRange(now);
  const attemptsToday = await database.gameRecord.count({
    where: { userId: player.id, startedAt: { gte: start, lt: end } },
  });

  const collection = CHEAT_DEFINITIONS.map((definition) => {
    const unlocked = player.unlockedCheats.find(
      ({ cheat }) => cheat.slug === definition.slug,
    );
    return {
      slug: definition.slug,
      name: unlocked ? definition.name : "CLASSIFIED",
      nameZh: unlocked ? definition.nameZh : "机密",
      description: unlocked ? definition.description : null,
      descriptionZh: unlocked ? definition.descriptionZh : null,
      difficulty: definition.difficulty,
      category: definition.category,
      unlocked: Boolean(unlocked),
      completedAt: unlocked?.completedAt ?? null,
    };
  });

  return {
    player: {
      playerId: player.playerId,
      displayName: player.nickname ?? anonymousName(player.playerId),
      nickname: player.nickname,
      currentLevel: player.currentLevel,
      totalGames: player.totalGames,
      successGames: player.successGames,
      bestErrorMs: player.bestErrorMs,
      firstSuccessAt: player.firstSuccessAt,
      unlockedCheats: player.unlockedCheats.length,
    },
    daily: {
      limit: 50,
      attempts: attemptsToday,
      remaining: remainingDailyAttempts(attemptsToday),
      resetsAt: nextUtcReset(now),
    },
    difficulty: suggestedCheat?.difficulty ?? requested,
    maximumDifficulty,
    suggestedCheat,
    collection,
  };
}

export async function resetPlayer(database: PrismaClient, playerId: string) {
  const player = await database.user.findUnique({ where: { playerId } });
  if (!player) {
    throw new AppError("Anonymous player was not found.", 404, "PLAYER_NOT_FOUND");
  }

  await database.$transaction(
    async (transaction) => {
      await transaction.gameRecord.deleteMany({ where: { userId: player.id } });
      await transaction.userCheat.deleteMany({ where: { userId: player.id } });
      await transaction.user.update({
        where: { id: player.id },
        data: {
          currentLevel: 1,
          totalGames: 0,
          successGames: 0,
          bestErrorMs: null,
          firstSuccessAt: null,
        },
      });
    },
    { maxWait: 10_000, timeout: 30_000 },
  );

  return { reset: true, preserved: ["playerId", "nickname"] };
}
