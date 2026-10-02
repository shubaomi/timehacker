import type { CheatDefinition } from "./cheats";
import { REASONING_ORDINAL } from "./reasoning-campaign/order";

interface SelectCheatInput {
  definitions: readonly CheatDefinition[];
  discoveredSlugs: ReadonlySet<string>;
  desiredDifficulty: number;
  seed: string;
}

export function selectNextCheat({
  definitions,
  discoveredSlugs,
  desiredDifficulty,
  seed,
}: SelectCheatInput): CheatDefinition | null {
  const available = definitions
    .filter((definition) => definition.enabled && !discoveredSlugs.has(definition.slug))
    .sort((a,b) => a.triggerConfig.reasoning && b.triggerConfig.reasoning
      ? (REASONING_ORDINAL.get(a.slug) ?? 101) - (REASONING_ORDINAL.get(b.slug) ?? 101) : 0);
  if (available.length === 0) return null;

  const unlockedDifficulty = available.filter(
    (definition) => definition.difficulty <= desiredDifficulty,
  );
  const pool = unlockedDifficulty.length > 0 ? unlockedDifficulty : available;
  // V2 is a campaign: authored order is part of the learning curve. The seed
  // remains in the public input for compatibility with older callers, but it
  // must not shuffle the next undiscovered level.
  void seed;
  return pool[0] ?? null;
}
