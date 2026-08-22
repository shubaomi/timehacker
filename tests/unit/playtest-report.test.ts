import { describe, expect, it } from "vitest";
import { buildPlaytestReport, type ReportEvent } from "@/analytics/playtest-report";

const at = (day: number, minute: number) => new Date(Date.UTC(2026, 7, day, 12, minute));
const event = (
  browserId: string,
  sessionId: string,
  name: ReportEvent["name"],
  levelSlug: string,
  levelNumber: number,
  occurredAt: Date,
  extra: Partial<ReportEvent> = {},
): ReportEvent => ({ browserId, sessionId, name, levelSlug, levelNumber, occurredAt, ...extra });

describe("playtest commercial validation report", () => {
  it("computes the frozen funnel, engagement, share, and next-day metrics", () => {
    const events: ReportEvent[] = [
      event("a", "a1", "level_view", "four-corner-breach", 1, at(1, 0)),
      event("a", "a1", "first_interaction", "four-corner-breach", 1, at(1, 1)),
      event("a", "a1", "puzzle_armed", "four-corner-breach", 1, at(1, 1)),
      event("a", "a1", "level_completed", "four-corner-breach", 1, at(1, 2), { mode: "assisted", success: true, puzzleSolved: true }),
      event("a", "a1", "puzzle_armed", "breath-gap", 2, at(1, 3)),
      event("a", "a1", "level_completed", "breath-gap", 2, at(1, 4), { mode: "assisted", success: true, puzzleSolved: true }),
      event("a", "a1", "puzzle_armed", "slow-command", 3, at(1, 5)),
      event("a", "a1", "level_completed", "slow-command", 3, at(1, 6), { mode: "assisted", success: true, puzzleSolved: true }),
      event("a", "a1", "share_card_exported", "slow-command", 3, at(1, 7), { action: "save" }),
      event("a", "a2", "level_view", "relay-sandwich", 4, at(2, 0)),
      event("b", "b1", "level_view", "four-corner-breach", 1, at(1, 0)),
      event("b", "b1", "first_interaction", "four-corner-breach", 1, at(1, 1)),
      event("b", "b1", "timer_stopped", "four-corner-breach", 1, at(1, 2), { mode: "normal", durationMs: 9_000, success: false, puzzleSolved: false }),
    ];

    const report = buildPlaytestReport(events);
    expect(report.uniqueBrowsers).toBe(2);
    expect(report.firstInteractionRate).toBe(1);
    expect(report.levelOneAssistedCompletionRate).toBe(0.5);
    expect(report.firstThreeAssistedCompletionRate).toBe(0.5);
    expect(report.medianSessionDurationMs).toBe(120_000);
    expect(report.medianCompletedLevels).toBe(1.5);
    expect(report.shareExportRate).toBe(1);
    expect(report.nextDayReturnRate).toBe(0.5);
    expect(report.observationDays).toBe(2);
    expect(report.automatedExpansionEligible).toBe(false);
  });

  it("does not count an assisted completion without an earlier puzzle_armed event", () => {
    const report = buildPlaytestReport([
      event("a", "a1", "level_view", "four-corner-breach", 1, at(1, 0)),
      event("a", "a1", "level_completed", "four-corner-breach", 1, at(1, 1), {
        mode: "assisted", success: true, puzzleSolved: true,
      }),
    ]);
    expect(report.levelOneAssistedCompletionRate).toBe(0);
  });

  it("counts share exports only when the exporting browser also completed a level", () => {
    const report = buildPlaytestReport([
      event("winner", "winner-1", "level_view", "four-corner-breach", 1, at(1, 0)),
      event("winner", "winner-1", "level_completed", "four-corner-breach", 1, at(1, 1), {
        mode: "normal", success: true, puzzleSolved: false,
      }),
      event("failed-exporter", "failed-1", "level_view", "four-corner-breach", 1, at(1, 0)),
      event("failed-exporter", "failed-1", "share_card_exported", "four-corner-breach", 1, at(1, 1), {
        action: "copy",
      }),
    ]);

    expect(report.shareExportRate).toBe(0);
  });
});
