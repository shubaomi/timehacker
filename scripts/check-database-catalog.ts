import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const database = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    max: 1,
  }),
});

try {
  const [cheats, users, games, unlocks, puzzleScenes] = await Promise.all([
    database.cheatMethod.count(),
    database.user.count(),
    database.gameRecord.count(),
    database.userCheat.count(),
    database.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "CheatMethod"
      WHERE "triggerConfig" ? 'puzzleScene'
    `,
  ]);
  console.log(JSON.stringify({
    cheats,
    users,
    games,
    unlocks,
    puzzleScenes: Number(puzzleScenes[0]?.count ?? 0),
  }));
} finally {
  await database.$disconnect();
}
