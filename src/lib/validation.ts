import { z } from "zod";

export const playerIdSchema = z.string().uuid();
export const clientRequestIdSchema = z.string().uuid();

export const nicknameSchema = z
  .string()
  .trim()
  .min(2)
  .max(24)
  .regex(/^[\p{L}\p{N} ._-]+$/u, "Nickname contains unsupported characters");

export const cheatEventSchema = z.object({
  type: z.string().trim().min(1).max(32),
  at: z.number().finite().nonnegative().max(10 * 60 * 1_000),
  value: z.union([z.string().max(128), z.number().finite()]).optional(),
  durationMs: z.number().finite().nonnegative().max(60_000).optional(),
});

export const createPlayerSchema = z.object({
  playerId: playerIdSchema,
});

export const updateNicknameSchema = z.object({
  playerId: playerIdSchema,
  nickname: nicknameSchema,
});

export const startGameSchema = z.object({
  playerId: playerIdSchema,
  clientRequestId: clientRequestIdSchema,
  mode: z.enum(["HACKER", "PURE"]),
  difficulty: z.number().int().min(1).max(5),
  assignedCheatSlug: z.string().trim().min(1).max(64).nullable().optional(),
});

export const completeGameSchema = z.object({
  playerId: playerIdSchema,
  durationMs: z.number().finite().nonnegative().max(120_000),
  wallDurationMs: z.number().finite().nonnegative().max(120_000).optional(),
  events: z.array(cheatEventSchema).max(100).default([]),
});

export const resetPlayerSchema = z.object({
  playerId: playerIdSchema,
  analyticsBrowserId: z.string().uuid().optional(),
});
