import type { PrismaClient } from "@/generated/prisma/client";
import type { PlaytestEventBatch } from "@/analytics/playtest-contract";
import { SOFT_LAUNCH_LEVELS } from "@/game/soft-launch";
import { AppError } from "./errors";

export const PLAYTEST_RETENTION_DAYS = 30;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;
const LEVEL_NUMBER_BY_SLUG = new Map<string, number>(
  SOFT_LAUNCH_LEVELS.map(({ slug, number }) => [slug, number]),
);

const EVENT_NAME = {
  level_view: "LEVEL_VIEW",
  first_interaction: "FIRST_INTERACTION",
  puzzle_discovered: "PUZZLE_DISCOVERED",
  hint_1_open: "HINT_1_OPEN",
  hint_2_open: "HINT_2_OPEN",
  answer_open: "ANSWER_OPEN",
  puzzle_armed: "PUZZLE_ARMED",
  timer_started: "TIMER_STARTED",
  timer_stopped: "TIMER_STOPPED",
  level_completed: "LEVEL_COMPLETED",
  next_level: "NEXT_LEVEL",
  share_card_open: "SHARE_CARD_OPEN",
  share_card_exported: "SHARE_CARD_EXPORTED",
} as const;

export function playtestRetentionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - PLAYTEST_RETENTION_DAYS * 24 * 60 * 60 * 1_000);
}

export async function cleanupExpiredPlaytestEvents(
  database: PrismaClient,
  now = new Date(),
): Promise<number> {
  const result = await database.playtestEvent.deleteMany({
    where: { occurredAt: { lt: playtestRetentionCutoff(now) } },
  });
  return result.count;
}

export async function recordPlaytestEvents(
  database: PrismaClient,
  batch: PlaytestEventBatch,
  now = new Date(),
) {
  await cleanupExpiredPlaytestEvents(database, now);
  const oldestAccepted = playtestRetentionCutoff(now).getTime();
  const newestAccepted = now.getTime() + MAX_CLOCK_SKEW_MS;
  const data = batch.events.map((event) => {
    const occurredAt = new Date(event.occurredAt);
    if (occurredAt.getTime() < oldestAccepted || occurredAt.getTime() > newestAccepted) {
      throw new AppError("Event timestamp is outside the accepted window.", 400, "INVALID_EVENT_TIME");
    }
    const levelNumber = LEVEL_NUMBER_BY_SLUG.get(event.levelSlug);
    if (levelNumber === undefined) {
      throw new AppError("Event level is not in the public soft launch.", 400, "INVALID_EVENT_LEVEL");
    }
    return {
      clientEventId: event.clientEventId,
      browserId: batch.browserId,
      sessionId: batch.sessionId,
      name: EVENT_NAME[event.name],
      levelSlug: event.levelSlug,
      levelNumber,
      entrySource: batch.entrySource.toUpperCase() as "DIRECT" | "SHARE" | "UNKNOWN",
      mode: event.mode?.toUpperCase() as "NORMAL" | "ASSISTED" | undefined,
      durationMs: event.durationMs === undefined ? undefined : Math.round(event.durationMs),
      success: event.success,
      puzzleSolved: event.puzzleSolved,
      action: event.action?.toUpperCase() as "SAVE" | "COPY" | undefined,
      occurredAt,
    };
  });

  const result = await database.playtestEvent.createMany({ data, skipDuplicates: true });
  return { accepted: data.length, created: result.count };
}

export async function deleteBrowserPlaytestEvents(
  database: PrismaClient,
  browserId: string,
): Promise<number> {
  return (await database.playtestEvent.deleteMany({ where: { browserId } })).count;
}
