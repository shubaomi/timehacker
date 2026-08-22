import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { cleanupExpiredPlaytestEvents, PLAYTEST_RETENTION_DAYS } from "../src/server/playtest-service";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 1 }),
});

try {
  const deleted = await cleanupExpiredPlaytestEvents(database);
  console.log(JSON.stringify({ retentionDays: PLAYTEST_RETENTION_DAYS, deleted }));
} finally {
  await database.$disconnect();
}
