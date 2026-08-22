// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SOFT_LAUNCH_LEVELS } from "@/game/soft-launch";

describe("soft-launch production contract without database writes", () => {
  it("uses an additive migration that preserves existing players on FULL", async () => {
    const migration = await readFile(path.join(
      process.cwd(),
      "prisma/migrations/20260822090000_add_soft_launch_analytics/migration.sql",
    ), "utf8");
    expect(migration).toContain('ADD COLUMN "releaseTrack" "ReleaseTrack" NOT NULL DEFAULT \'FULL\'');
    expect(migration).toContain('CREATE TABLE "PlaytestEvent"');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i);
    expect(migration).not.toContain("FOREIGN KEY");
    expect(migration).toContain('CHECK ("levelNumber" BETWEEN 1 AND 12)');
    expect(migration).toContain('"name" <> \'timer_stopped\'');
    expect(migration).toContain('"name" <> \'level_completed\'');
    expect(migration).toContain('"name" <> \'share_card_exported\'');
  });

  it("keeps the public sample at exactly the 12 frozen authored slugs", () => {
    expect(SOFT_LAUNCH_LEVELS).toHaveLength(12);
    expect(new Set(SOFT_LAUNCH_LEVELS.map(({ slug }) => slug))).toHaveProperty("size", 12);
  });
});
