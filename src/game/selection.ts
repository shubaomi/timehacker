import type { CheatDefinition } from "./cheats";

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

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
    .sort((left, right) => left.slug.localeCompare(right.slug));
  if (available.length === 0) return null;

  const exactDifficulty = available.filter(
    (definition) => definition.difficulty === desiredDifficulty,
  );
  const unlockedDifficulty = available.filter(
    (definition) => definition.difficulty <= desiredDifficulty,
  );
  const pool =
    exactDifficulty.length > 0
      ? exactDifficulty
      : unlockedDifficulty.length > 0
        ? unlockedDifficulty
        : available;
  const random = mulberry32(hashSeed(seed));
  return pool[Math.floor(random() * pool.length)] ?? pool[0];
}
