import { z } from "zod";
import { SOFT_LAUNCH_SLUGS } from "@/game/soft-launch";

export const PLAYTEST_EVENT_NAMES = [
  "level_view",
  "first_interaction",
  "puzzle_discovered",
  "hint_1_open",
  "hint_2_open",
  "answer_open",
  "puzzle_armed",
  "timer_started",
  "timer_stopped",
  "level_completed",
  "next_level",
  "share_card_open",
  "share_card_exported",
] as const;

export type PlaytestEventName = (typeof PLAYTEST_EVENT_NAMES)[number];
export type PlaytestEntrySource = "direct" | "share" | "unknown";
export type PlaytestModeName = "normal" | "assisted";
export type PlaytestShareActionName = "save" | "copy";

const levelSlugSchema = z.enum(SOFT_LAUNCH_SLUGS as [string, ...string[]]);

export const playtestEventSchema = z.object({
  clientEventId: z.string().uuid(),
  name: z.enum(PLAYTEST_EVENT_NAMES),
  levelSlug: levelSlugSchema,
  occurredAt: z.string().datetime({ offset: true }),
  mode: z.enum(["normal", "assisted"]).optional(),
  durationMs: z.number().finite().nonnegative().max(120_000).optional(),
  success: z.boolean().optional(),
  puzzleSolved: z.boolean().optional(),
  action: z.enum(["save", "copy"]).optional(),
}).strict().superRefine((event, context) => {
  if (event.name === "timer_stopped") {
    if (event.mode === undefined) context.addIssue({ code: "custom", message: "timer_stopped requires mode" });
    if (event.durationMs === undefined) context.addIssue({ code: "custom", message: "timer_stopped requires durationMs" });
    if (event.success === undefined) context.addIssue({ code: "custom", message: "timer_stopped requires success" });
    if (event.puzzleSolved === undefined) context.addIssue({ code: "custom", message: "timer_stopped requires puzzleSolved" });
  }
  if (event.name === "level_completed") {
    if (event.mode === undefined) context.addIssue({ code: "custom", message: "level_completed requires mode" });
    if (event.success !== true) context.addIssue({ code: "custom", message: "level_completed requires a successful stop" });
    if (event.puzzleSolved === undefined) context.addIssue({ code: "custom", message: "level_completed requires puzzleSolved" });
  }
  if (event.name === "share_card_exported" && event.action === undefined) {
    context.addIssue({ code: "custom", message: "share_card_exported requires action" });
  }
});

export const playtestEventBatchSchema = z.object({
  browserId: z.string().uuid(),
  sessionId: z.string().uuid(),
  entrySource: z.enum(["direct", "share", "unknown"]),
  events: z.array(playtestEventSchema).min(1).max(20),
}).strict();

export type PlaytestEventBatch = z.infer<typeof playtestEventBatchSchema>;

export const deletePlaytestEventsSchema = z.object({
  browserId: z.string().uuid(),
}).strict();
