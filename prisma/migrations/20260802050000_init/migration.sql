-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('HACKER', 'PURE');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('STARTED', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CheatCategory" AS ENUM ('OPERATION', 'VISUAL', 'RHYTHM', 'DEVICE', 'META');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "playerId" VARCHAR(64) NOT NULL,
    "nickname" VARCHAR(24),
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "totalGames" INTEGER NOT NULL DEFAULT 0,
    "successGames" INTEGER NOT NULL DEFAULT 0,
    "bestErrorMs" INTEGER,
    "firstSuccessAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheatMethod" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(280) NOT NULL,
    "hint" VARCHAR(180) NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "category" "CheatCategory" NOT NULL,
    "triggerConfig" JSONB NOT NULL,
    "effectConfig" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CheatMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCheat" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cheatId" UUID NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCheat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRecord" (
    "id" UUID NOT NULL,
    "clientRequestId" VARCHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "mode" "GameMode" NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'STARTED',
    "targetMs" INTEGER NOT NULL DEFAULT 10000,
    "durationMs" INTEGER,
    "errorMs" INTEGER,
    "absoluteErrorMs" INTEGER,
    "success" BOOLEAN,
    "assignedCheatId" UUID,
    "usedCheatId" UUID,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE INDEX "User_currentLevel_successGames_firstSuccessAt_idx" ON "User"("currentLevel", "successGames", "firstSuccessAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheatMethod_slug_key" ON "CheatMethod"("slug");

-- CreateIndex
CREATE INDEX "CheatMethod_enabled_difficulty_category_idx" ON "CheatMethod"("enabled", "difficulty", "category");

-- CreateIndex
CREATE INDEX "UserCheat_cheatId_completedAt_idx" ON "UserCheat"("cheatId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCheat_userId_cheatId_key" ON "UserCheat"("userId", "cheatId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRecord_clientRequestId_key" ON "GameRecord"("clientRequestId");

-- CreateIndex
CREATE INDEX "GameRecord_userId_startedAt_idx" ON "GameRecord"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "GameRecord_mode_status_absoluteErrorMs_completedAt_idx" ON "GameRecord"("mode", "status", "absoluteErrorMs", "completedAt");

-- CreateIndex
CREATE INDEX "GameRecord_assignedCheatId_idx" ON "GameRecord"("assignedCheatId");

-- CreateIndex
CREATE INDEX "GameRecord_usedCheatId_idx" ON "GameRecord"("usedCheatId");

-- AddForeignKey
ALTER TABLE "UserCheat" ADD CONSTRAINT "UserCheat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCheat" ADD CONSTRAINT "UserCheat_cheatId_fkey" FOREIGN KEY ("cheatId") REFERENCES "CheatMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRecord" ADD CONSTRAINT "GameRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRecord" ADD CONSTRAINT "GameRecord_assignedCheatId_fkey" FOREIGN KEY ("assignedCheatId") REFERENCES "CheatMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRecord" ADD CONSTRAINT "GameRecord_usedCheatId_fkey" FOREIGN KEY ("usedCheatId") REFERENCES "CheatMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
