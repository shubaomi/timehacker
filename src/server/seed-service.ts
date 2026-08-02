import type { PrismaClient } from "@/generated/prisma/client";
import { CHEAT_DEFINITIONS, validateCheatDefinition } from "@/game/cheats";

export async function seedCheatCatalog(database: PrismaClient): Promise<number> {
  for (const rawDefinition of CHEAT_DEFINITIONS) {
    const definition = validateCheatDefinition(rawDefinition);
    const data = {
      name: definition.name,
      description: definition.description,
      hint: definition.hint,
      difficulty: definition.difficulty,
      category: definition.category,
      triggerConfig: definition.triggerConfig,
      effectConfig: definition.effectConfig,
      enabled: definition.enabled,
    };
    await database.cheatMethod.upsert({
      where: { slug: definition.slug },
      update: data,
      create: { slug: definition.slug, ...data },
    });
  }

  return database.cheatMethod.count({
    where: { slug: { in: CHEAT_DEFINITIONS.map(({ slug }) => slug) } },
  });
}
