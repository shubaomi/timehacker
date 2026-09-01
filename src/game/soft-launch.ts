import { CHEAT_DEFINITIONS, type CheatDefinition } from "./cheats";
import { V2_LEVEL_BY_SLUG } from "./v2-levels.generated";

export type ReleaseTrackName = "FULL" | "SOFT_LAUNCH";

export const SOFT_LAUNCH_LEVELS = [
  { slug: "four-corner-breach", number: 1 },
  { slug: "breath-gap", number: 2 },
  { slug: "slow-command", number: 3 },
  { slug: "relay-sandwich", number: 4 },
  { slug: "corner-cross", number: 5 },
  { slug: "precision-five", number: 6 },
  { slug: "horizon-shift", number: 7 },
  { slug: "focus-orbit", number: 8 },
  { slug: "wheel-echo", number: 9 },
  { slug: "tab-return", number: 10 },
  { slug: "archive-figure-eight", number: 11 },
  { slug: "silent-constellation", number: 12 },
] as const;

export const SOFT_LAUNCH_SLUGS = SOFT_LAUNCH_LEVELS.map(({ slug }) => slug);
const SOFT_LAUNCH_LEVEL_BY_SLUG = new Map<string, number>(
  SOFT_LAUNCH_LEVELS.map((level) => [level.slug, level.number]),
);

const SOFT_LAUNCH_DEFINITIONS = SOFT_LAUNCH_LEVELS.map(({ slug }) => {
  const definition = CHEAT_DEFINITIONS.find((candidate) => candidate.slug === slug);
  if (!definition) throw new Error(`Soft-launch level is missing from the canonical catalog: ${slug}`);
  return definition;
});

export function definitionsForReleaseTrack(
  releaseTrack: ReleaseTrackName,
): readonly CheatDefinition[] {
  return releaseTrack === "SOFT_LAUNCH" ? SOFT_LAUNCH_DEFINITIONS : CHEAT_DEFINITIONS;
}

export function publicLevelNumber(
  slug: string,
  releaseTrack: ReleaseTrackName,
): number | null {
  if (releaseTrack === "SOFT_LAUNCH") return SOFT_LAUNCH_LEVEL_BY_SLUG.get(slug) ?? null;
  return V2_LEVEL_BY_SLUG.get(slug)?.id ?? null;
}

export function isSoftLaunchSlug(slug: string): boolean {
  return SOFT_LAUNCH_LEVEL_BY_SLUG.has(slug);
}

export function hasCompletedSoftLaunch(discoveredSlugs: Iterable<string>): boolean {
  const discovered = new Set(discoveredSlugs);
  return SOFT_LAUNCH_SLUGS.every((slug) => discovered.has(slug));
}
