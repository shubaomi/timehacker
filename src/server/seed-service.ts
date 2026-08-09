import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { CHEAT_DEFINITIONS, validateCheatDefinition } from "@/game/cheats";

export async function seedCheatCatalog(database: PrismaClient): Promise<number> {
  const rows = CHEAT_DEFINITIONS.map((rawDefinition) => {
    const definition = validateCheatDefinition(rawDefinition);
    return Prisma.sql`(
      ${randomUUID()}::uuid,
      ${definition.slug},
      ${definition.name},
      ${definition.nameZh},
      ${definition.description},
      ${definition.descriptionZh},
      ${definition.hint},
      ${definition.hintZh},
      ${definition.difficulty},
      ${definition.category}::"CheatCategory",
      ${JSON.stringify(definition.triggerConfig)}::jsonb,
      ${JSON.stringify(definition.effectConfig)}::jsonb,
      ${definition.enabled},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )`;
  });

  await database.$executeRaw(Prisma.sql`
    INSERT INTO "CheatMethod" (
      "id", "slug", "name", "nameZh", "description", "descriptionZh",
      "hint", "hintZh", "difficulty", "category", "triggerConfig",
      "effectConfig", "enabled", "createdAt", "updatedAt"
    ) VALUES ${Prisma.join(rows)}
    ON CONFLICT ("slug") DO UPDATE SET
      "name" = EXCLUDED."name",
      "nameZh" = EXCLUDED."nameZh",
      "description" = EXCLUDED."description",
      "descriptionZh" = EXCLUDED."descriptionZh",
      "hint" = EXCLUDED."hint",
      "hintZh" = EXCLUDED."hintZh",
      "difficulty" = EXCLUDED."difficulty",
      "category" = EXCLUDED."category",
      "triggerConfig" = EXCLUDED."triggerConfig",
      "effectConfig" = EXCLUDED."effectConfig",
      "enabled" = EXCLUDED."enabled",
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE ROW(
      "CheatMethod"."name", "CheatMethod"."nameZh",
      "CheatMethod"."description", "CheatMethod"."descriptionZh",
      "CheatMethod"."hint", "CheatMethod"."hintZh",
      "CheatMethod"."difficulty", "CheatMethod"."category",
      "CheatMethod"."triggerConfig", "CheatMethod"."effectConfig",
      "CheatMethod"."enabled"
    ) IS DISTINCT FROM ROW(
      EXCLUDED."name", EXCLUDED."nameZh",
      EXCLUDED."description", EXCLUDED."descriptionZh",
      EXCLUDED."hint", EXCLUDED."hintZh",
      EXCLUDED."difficulty", EXCLUDED."category",
      EXCLUDED."triggerConfig", EXCLUDED."effectConfig",
      EXCLUDED."enabled"
    )
  `);

  return database.cheatMethod.count({
    where: { slug: { in: CHEAT_DEFINITIONS.map(({ slug }) => slug) } },
  });
}
