import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { buildPlaytestReport, type ReportEvent } from "../src/analytics/playtest-report";
import { PrismaClient } from "../src/generated/prisma/client";
import { cleanupExpiredPlaytestEvents, playtestRetentionCutoff } from "../src/server/playtest-service";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }),
});

try {
  const now = new Date();
  const deleted = await cleanupExpiredPlaytestEvents(database, now);
  const rows = await database.playtestEvent.findMany({
    where: { occurredAt: { gte: playtestRetentionCutoff(now) } },
    orderBy: { occurredAt: "asc" },
  });
  const events: ReportEvent[] = rows.map((row) => ({
    browserId: row.browserId,
    sessionId: row.sessionId,
    name: row.name.toLowerCase() as ReportEvent["name"],
    levelSlug: row.levelSlug,
    levelNumber: row.levelNumber,
    occurredAt: row.occurredAt,
    mode: row.mode?.toLowerCase() as ReportEvent["mode"],
    durationMs: row.durationMs,
    success: row.success,
    puzzleSolved: row.puzzleSolved,
    action: row.action?.toLowerCase() as ReportEvent["action"],
  }));
  console.log(JSON.stringify({ generatedAt: now.toISOString(), retentionCleanupDeleted: deleted, ...buildPlaytestReport(events) }, null, 2));
} finally {
  await database.$disconnect();
}
