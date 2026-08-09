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

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "undefined";
}

try {
  const [databaseCheats, users, games, unlocks, puzzleScenes, v2Levels] = await Promise.all([
    database.cheatMethod.findMany({
      select: {
        slug: true,
        name: true,
        nameZh: true,
        description: true,
        descriptionZh: true,
        hint: true,
        hintZh: true,
        difficulty: true,
        category: true,
        triggerConfig: true,
        effectConfig: true,
        enabled: true,
      },
      orderBy: { slug: "asc" },
    }),
    database.user.count(),
    database.gameRecord.count(),
    database.userCheat.count(),
    database.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "CheatMethod"
      WHERE "triggerConfig" ? 'puzzleScene'
    `,
    database.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "CheatMethod"
      WHERE "triggerConfig" ? 'v2Level'
        AND "triggerConfig"->'v2Level'->>'schemaVersion' = '2'
    `,
  ]);
  const expectedSlugs = CHEAT_DEFINITIONS.map(({ slug }) => slug).sort();
  const databaseSlugs = databaseCheats.map(({ slug }) => slug);
  const missing = expectedSlugs.filter((slug) => !databaseSlugs.includes(slug));
  const unexpected = databaseSlugs.filter((slug) => !expectedSlugs.includes(slug));
  const expectedBySlug = new Map(CHEAT_DEFINITIONS.map((definition) => [definition.slug, definition]));
  const synchronizedFields = [
    "name", "nameZh", "description", "descriptionZh", "hint", "hintZh",
    "difficulty", "category", "triggerConfig", "effectConfig", "enabled",
  ] as const;
  const mismatches = databaseCheats.flatMap((row) => {
    const expected = expectedBySlug.get(row.slug);
    if (!expected) return [];
    const fields = synchronizedFields.filter((field) => canonicalJson(row[field]) !== canonicalJson(expected[field]));
    return fields.length > 0 ? [{ slug: row.slug, fields }] : [];
  });
  const catalogSynchronized = missing.length === 0 && unexpected.length === 0 && mismatches.length === 0;
  console.log(JSON.stringify({
    cheats: databaseCheats.length,
    codeDefinitions: expectedSlugs.length,
    slugMappingComplete: missing.length === 0 && unexpected.length === 0,
    catalogSynchronized,
    missing,
    unexpected,
    mismatches,
    users,
    games,
    unlocks,
    puzzleScenes: Number(puzzleScenes[0]?.count ?? 0),
    v2Levels: Number(v2Levels[0]?.count ?? 0),
  }));
  if (
    databaseCheats.length !== 100
    || expectedSlugs.length !== 100
    || Number(v2Levels[0]?.count ?? 0) !== 100
    || !catalogSynchronized
  ) {
    throw new Error("Database CheatMethod catalog does not match the 100 authored V2 definitions.");
  }
} finally {
  await database.$disconnect();
}
