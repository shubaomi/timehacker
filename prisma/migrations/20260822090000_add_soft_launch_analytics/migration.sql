-- The release track defaults to FULL so existing players and an older application
-- binary retain the complete 100-level behavior during a rollback.
CREATE TYPE "ReleaseTrack" AS ENUM ('FULL', 'SOFT_LAUNCH');
CREATE TYPE "PlaytestEventName" AS ENUM (
  'level_view',
  'first_interaction',
  'puzzle_discovered',
  'hint_1_open',
  'hint_2_open',
  'answer_open',
  'puzzle_armed',
  'timer_started',
  'timer_stopped',
  'level_completed',
  'next_level',
  'share_card_open',
  'share_card_exported'
);
CREATE TYPE "PlaytestEntrySource" AS ENUM ('direct', 'share', 'unknown');
CREATE TYPE "PlaytestMode" AS ENUM ('normal', 'assisted');
CREATE TYPE "PlaytestShareAction" AS ENUM ('save', 'copy');

ALTER TABLE "User"
ADD COLUMN "releaseTrack" "ReleaseTrack" NOT NULL DEFAULT 'FULL';

CREATE TABLE "PlaytestEvent" (
  "id" UUID NOT NULL,
  "clientEventId" UUID NOT NULL,
  "browserId" UUID NOT NULL,
  "sessionId" UUID NOT NULL,
  "name" "PlaytestEventName" NOT NULL,
  "levelSlug" VARCHAR(64) NOT NULL,
  "levelNumber" INTEGER NOT NULL,
  "entrySource" "PlaytestEntrySource" NOT NULL,
  "mode" "PlaytestMode",
  "durationMs" INTEGER,
  "success" BOOLEAN,
  "puzzleSolved" BOOLEAN,
  "action" "PlaytestShareAction",
  "occurredAt" TIMESTAMPTZ(3) NOT NULL,
  "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlaytestEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlaytestEvent_levelNumber_check" CHECK ("levelNumber" BETWEEN 1 AND 12),
  CONSTRAINT "PlaytestEvent_durationMs_check" CHECK ("durationMs" IS NULL OR "durationMs" BETWEEN 0 AND 120000),
  CONSTRAINT "PlaytestEvent_timerStopped_check" CHECK (
    "name" <> 'timer_stopped'
    OR ("mode" IS NOT NULL AND "durationMs" IS NOT NULL AND "success" IS NOT NULL AND "puzzleSolved" IS NOT NULL)
  ),
  CONSTRAINT "PlaytestEvent_levelCompleted_check" CHECK (
    "name" <> 'level_completed'
    OR ("mode" IS NOT NULL AND "success" = true AND "puzzleSolved" IS NOT NULL)
  ),
  CONSTRAINT "PlaytestEvent_shareExported_check" CHECK (
    "name" <> 'share_card_exported' OR "action" IS NOT NULL
  )
);

CREATE UNIQUE INDEX "PlaytestEvent_clientEventId_key" ON "PlaytestEvent"("clientEventId");
CREATE INDEX "PlaytestEvent_browserId_occurredAt_idx" ON "PlaytestEvent"("browserId", "occurredAt");
CREATE INDEX "PlaytestEvent_sessionId_occurredAt_idx" ON "PlaytestEvent"("sessionId", "occurredAt");
CREATE INDEX "PlaytestEvent_name_occurredAt_idx" ON "PlaytestEvent"("name", "occurredAt");
CREATE INDEX "PlaytestEvent_levelNumber_name_idx" ON "PlaytestEvent"("levelNumber", "name");
CREATE INDEX "PlaytestEvent_occurredAt_idx" ON "PlaytestEvent"("occurredAt");
