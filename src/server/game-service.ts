import type { PrismaClient } from "@/generated/prisma/client";
import type { CheatEvent } from "@/game/types";
import { CHEAT_DEFINITIONS, evaluateCheatTrigger } from "@/game/cheats";
import { definitionsForReleaseTrack } from "@/game/soft-launch";
import { cheatEffectConfigSchema, effectElapsedTime, effectToleranceMs } from "@/game/effects";
import { calculateLevel, difficultyForLevel, utcDayRange } from "@/game/progress";
import { measureGame } from "@/game/timer";
import { AppError, isPrismaErrorWithCode } from "./errors";

interface StartGameInput {
  playerId: string;
  clientRequestId: string;
  mode: "HACKER" | "PURE";
  difficulty: number;
  assignedCheatSlug?: string | null;
}

interface CompleteGameInput {
  playerId: string;
  gameId: string;
  durationMs: number;
  wallDurationMs?: number;
  events: CheatEvent[];
}

export async function startGame(
  database: PrismaClient,
  input: StartGameInput,
  now = new Date(),
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await database.$transaction(
        async (transaction) => {
          const existing = await transaction.gameRecord.findUnique({
            where: { clientRequestId: input.clientRequestId },
            include: { assignedCheat: true, user: true },
          });
          if (existing) {
            if (existing.user.playerId !== input.playerId) {
              throw new AppError("Request identifier is already in use.", 409, "REQUEST_CONFLICT");
            }
            return existing;
          }

          const player = await transaction.user.findUnique({
            where: { playerId: input.playerId },
            include: { unlockedCheats: { include: { cheat: true } } },
          });
          if (!player) {
            throw new AppError("Anonymous player was not found.", 404, "PLAYER_NOT_FOUND");
          }

          const { start, end } = utcDayRange(now);
          const attemptsToday = await transaction.gameRecord.count({
            where: { userId: player.id, startedAt: { gte: start, lt: end } },
          });
          if (attemptsToday >= 50) {
            throw new AppError(
              "Your daily time challenges are complete.",
              429,
              "DAILY_LIMIT_REACHED",
            );
          }

          let assignedCheatId: string | null = null;
          if (input.mode === "HACKER" && input.assignedCheatSlug) {
            const definition = CHEAT_DEFINITIONS.find(
              ({ slug }) => slug === input.assignedCheatSlug,
            );
            const maximumDifficulty = player.firstSuccessAt
              ? difficultyForLevel(player.currentLevel)
              : 1;
            const alreadyUnlocked = player.unlockedCheats.some(
              ({ cheat }) => cheat.slug === input.assignedCheatSlug,
            );
            const expectedSoftLaunchCheat = player.releaseTrack === "SOFT_LAUNCH"
              ? definitionsForReleaseTrack("SOFT_LAUNCH").find(
                ({ slug, enabled }) => enabled && !player.unlockedCheats.some(({ cheat }) => cheat.slug === slug),
              ) ?? null
              : null;
            const invalidForTrack = player.releaseTrack === "SOFT_LAUNCH"
              ? expectedSoftLaunchCheat?.slug !== input.assignedCheatSlug
                || definition?.difficulty !== input.difficulty
              : definition?.difficulty !== input.difficulty
                || (definition?.difficulty ?? Number.POSITIVE_INFINITY) > maximumDifficulty;
            if (!definition || !definition.enabled || invalidForTrack || alreadyUnlocked) {
              throw new AppError("Assigned cheat is not eligible for this player.", 409, "CHEAT_NOT_ELIGIBLE");
            }
            const cheat = await transaction.cheatMethod.findUnique({
              where: { slug: definition.slug },
              select: { id: true },
            });
            if (!cheat) {
              throw new AppError("Cheat catalog has not been initialized.", 503, "CATALOG_UNAVAILABLE");
            }
            assignedCheatId = cheat.id;
          }

          return transaction.gameRecord.create({
            data: {
              clientRequestId: input.clientRequestId,
              userId: player.id,
              mode: input.mode,
              assignedCheatId,
              startedAt: now,
            },
            include: { assignedCheat: true },
          });
        },
        { isolationLevel: "Serializable", maxWait: 10_000, timeout: 30_000 },
      );
    } catch (error) {
      if (isPrismaErrorWithCode(error, "P2034") && attempt < 2) continue;
      if (isPrismaErrorWithCode(error, "P2002")) {
        const existing = await database.gameRecord.findUnique({
          where: { clientRequestId: input.clientRequestId },
          include: { assignedCheat: true },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }
  throw new AppError("The challenge could not be started safely.", 409, "START_CONFLICT");
}

export async function completeGame(
  database: PrismaClient,
  input: CompleteGameInput,
  now = new Date(),
) {
  return database.$transaction(async (transaction) => {
    const game = await transaction.gameRecord.findUnique({
      where: { id: input.gameId },
      include: { user: true, assignedCheat: true, usedCheat: true },
    });
    if (!game || game.user.playerId !== input.playerId) {
      throw new AppError("Challenge was not found.", 404, "GAME_NOT_FOUND");
    }
    if (game.status === "COMPLETED") {
      return game;
    }

    const assignedDefinition = game.assignedCheat
      ? CHEAT_DEFINITIONS.find(({ slug }) => slug === game.assignedCheat?.slug) ?? null
      : null;
    const cheatTriggered =
      game.mode === "HACKER" &&
      assignedDefinition !== null &&
      evaluateCheatTrigger(assignedDefinition.triggerConfig, input.events);
    const usedCheatId = cheatTriggered ? game.assignedCheatId : null;
    const effect = cheatTriggered && assignedDefinition
      ? cheatEffectConfigSchema.parse(assignedDefinition.effectConfig)
      : null;
    const wallDurationMs = input.wallDurationMs ?? input.durationMs;
    const judgedDurationMs = effectElapsedTime(wallDurationMs, effect);
    const toleranceMs = effectToleranceMs(effect);
    const measurement = measureGame(judgedDurationMs, game.targetMs, toleranceMs);

    const completed = await transaction.gameRecord.update({
      where: { id: game.id },
      data: {
        ...measurement,
        wallDurationMs: Math.round(wallDurationMs),
        toleranceMs,
        assistanceType: effect?.type ?? null,
        status: "COMPLETED",
        completedAt: now,
        usedCheatId,
      },
      include: { assignedCheat: true, usedCheat: true },
    });

    if (measurement.success && usedCheatId) {
      await transaction.userCheat.upsert({
        where: { userId_cheatId: { userId: game.userId, cheatId: usedCheatId } },
        update: {},
        create: { userId: game.userId, cheatId: usedCheatId, completedAt: now },
      });
    }

    const unlockedCheats = await transaction.userCheat.count({
      where: { userId: game.userId },
    });
    const nextSuccessGames = game.user.successGames + (measurement.success ? 1 : 0);
    const nextBestError =
      game.user.bestErrorMs === null
        ? measurement.absoluteErrorMs
        : Math.min(game.user.bestErrorMs, measurement.absoluteErrorMs);

    await transaction.user.update({
      where: { id: game.userId },
      data: {
        totalGames: { increment: 1 },
        successGames: nextSuccessGames,
        bestErrorMs: nextBestError,
        currentLevel: calculateLevel(nextSuccessGames, unlockedCheats),
        firstSuccessAt:
          measurement.success && game.user.firstSuccessAt === null ? now : undefined,
      },
    });

    return completed;
  }, { maxWait: 10_000, timeout: 30_000 });
}
