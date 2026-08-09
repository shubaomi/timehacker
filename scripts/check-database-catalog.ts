import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CHEAT_DEFINITIONS } from "../src/game/cheats";

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
  const [databaseCheats, users, games, unlocks, puzzleScenes] = await Promise.all([
    database.cheatMethod.findMany({ select: { slug: true }, orderBy: { slug: "asc" } }),
    database.user.count(),
    database.gameRecord.count(),
    database.userCheat.count(),
    database.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "CheatMethod"
      WHERE "triggerConfig" ? 'puzzleScene'
    `,
  ]);
  const expectedSlugs = CHEAT_DEFINITIONS.map(({ slug }) => slug).sort();
  const databaseSlugs = databaseCheats.map(({ slug }) => slug);
  const missing = expectedSlugs.filter((slug) => !databaseSlugs.includes(slug));
  const unexpected = databaseSlugs.filter((slug) => !expectedSlugs.includes(slug));
  console.log(JSON.stringify({
    cheats: databaseCheats.length,
    codeDefinitions: expectedSlugs.length,
    slugMappingComplete: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
    users,
    games,
    unlocks,
    puzzleScenes: Number(puzzleScenes[0]?.count ?? 0),
  }));
  if (databaseCheats.length !== 100 || expectedSlugs.length !== 100 || missing.length > 0 || unexpected.length > 0) {
    throw new Error("Database CheatMethod slugs do not match the 100 authored V2 levels.");
  }
} finally {
  await database.$disconnect();
}
