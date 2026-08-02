import type { CheatDefinition } from "@/game/cheats";

export interface PlayerSummary {
  playerId: string;
  displayName: string;
  nickname: string | null;
  currentLevel: number;
  totalGames: number;
  successGames: number;
  bestErrorMs: number | null;
  firstSuccessAt: string | null;
  unlockedCheats: number;
}

export interface CollectionEntry {
  slug: string;
  name: string;
  nameZh: string;
  description: string | null;
  descriptionZh: string | null;
  difficulty: number;
  category: string;
  unlocked: boolean;
  completedAt: string | null;
}

export interface DashboardData {
  player: PlayerSummary;
  daily: {
    limit: number;
    attempts: number;
    remaining: number;
    resetsAt: string;
  };
  difficulty: number;
  maximumDifficulty: number;
  suggestedCheat: CheatDefinition | null;
  collection: CollectionEntry[];
}

export interface RankingsData {
  timeHackers: Array<{
    rank: number;
    displayName: string;
    level: number;
    successes: number;
  }>;
  perfectTiming: Array<{
    rank: number;
    displayName: string;
    durationMs: number;
    errorMs: number;
    absoluteErrorMs: number;
    completedAt: string;
  }>;
  cheatMasters: Array<{
    rank: number;
    displayName: string;
    unlockedCheats: number;
    highestDifficulty: number;
  }>;
}

export interface CompletedGame {
  id: string;
  durationMs: number;
  errorMs: number;
  absoluteErrorMs: number;
  success: boolean;
  mode: "HACKER" | "PURE";
  assignedCheat: { slug: string; name: string; nameZh?: string | null } | null;
  usedCheat: { slug: string; name: string; nameZh?: string | null } | null;
}
