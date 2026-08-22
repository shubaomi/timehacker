import type {
  PlaytestEventName,
  PlaytestModeName,
  PlaytestShareActionName,
} from "./playtest-contract";

export interface ReportEvent {
  browserId: string;
  sessionId: string;
  name: PlaytestEventName;
  levelSlug: string;
  levelNumber: number;
  occurredAt: Date;
  mode?: PlaytestModeName | null;
  durationMs?: number | null;
  success?: boolean | null;
  puzzleSolved?: boolean | null;
  action?: PlaytestShareActionName | null;
}

const ratio = (numerator: number, denominator: number) => denominator === 0 ? 0 : numerator / denominator;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function nextUtcDay(day: string): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return utcDayKey(date);
}

export function buildPlaytestReport(events: readonly ReportEvent[]) {
  const browserIds = new Set(events.map(({ browserId }) => browserId));
  const viewers = new Set(events.filter(({ name }) => name === "level_view").map(({ browserId }) => browserId));
  const interacted = new Set(events.filter(({ name }) => name === "first_interaction").map(({ browserId }) => browserId));
  const assistedCompletions = events.filter((event) => {
    if (
      event.name !== "level_completed"
      || event.mode !== "assisted"
      || event.success !== true
      || event.puzzleSolved !== true
    ) return false;
    return events.some((candidate) =>
      candidate.name === "puzzle_armed"
      && candidate.browserId === event.browserId
      && candidate.sessionId === event.sessionId
      && candidate.levelSlug === event.levelSlug
      && candidate.occurredAt <= event.occurredAt,
    );
  });
  const levelOneCompleters = new Set(assistedCompletions.filter(({ levelNumber }) => levelNumber === 1).map(({ browserId }) => browserId));
  const completedLevelsByBrowser = new Map<string, Set<number>>();
  for (const event of assistedCompletions) {
    const levels = completedLevelsByBrowser.get(event.browserId) ?? new Set<number>();
    levels.add(event.levelNumber);
    completedLevelsByBrowser.set(event.browserId, levels);
  }
  const firstThreeCompleters = new Set([...completedLevelsByBrowser.entries()]
    .filter(([, levels]) => [1, 2, 3].every((level) => levels.has(level)))
    .map(([browserId]) => browserId));

  const eventsBySession = new Map<string, ReportEvent[]>();
  for (const event of events) {
    const session = eventsBySession.get(event.sessionId) ?? [];
    session.push(event);
    eventsBySession.set(event.sessionId, session);
  }
  const sessionDurations = [...eventsBySession.values()].map((session) => {
    const times = session.map(({ occurredAt }) => occurredAt.getTime());
    return Math.max(...times) - Math.min(...times);
  });

  const successfulBrowsers = new Set(events
    .filter(({ name, success }) => name === "level_completed" && success === true)
    .map(({ browserId }) => browserId));
  const successfulShareExporters = new Set(events
    .filter(({ browserId, name }) => name === "share_card_exported" && successfulBrowsers.has(browserId))
    .map(({ browserId }) => browserId));

  const daysByBrowser = new Map<string, Set<string>>();
  for (const event of events) {
    const days = daysByBrowser.get(event.browserId) ?? new Set<string>();
    days.add(utcDayKey(event.occurredAt));
    daysByBrowser.set(event.browserId, days);
  }
  const nextDayReturners = [...daysByBrowser.entries()].filter(([, days]) =>
    [...days].some((day) => days.has(nextUtcDay(day))),
  ).length;
  const eventTimes = events.map(({ occurredAt }) => occurredAt.getTime());
  const observationDays = eventTimes.length === 0
    ? 0
    : Math.floor((Math.max(...eventTimes) - Math.min(...eventTimes)) / (24 * 60 * 60 * 1_000)) + 1;

  const report = {
    uniqueBrowsers: browserIds.size,
    firstInteractionRate: ratio(interacted.size, viewers.size),
    levelOneAssistedCompletionRate: ratio(levelOneCompleters.size, viewers.size),
    firstThreeAssistedCompletionRate: ratio(firstThreeCompleters.size, viewers.size),
    medianSessionDurationMs: median(sessionDurations),
    medianCompletedLevels: median([...browserIds].map((browserId) => completedLevelsByBrowser.get(browserId)?.size ?? 0)),
    shareExportRate: ratio(successfulShareExporters.size, successfulBrowsers.size),
    nextDayReturnRate: ratio(nextDayReturners, browserIds.size),
    observationDays,
  };

  const automatedExpansionEligible = report.uniqueBrowsers >= 100
    && report.observationDays >= 7
    && report.firstInteractionRate >= 0.7
    && report.levelOneAssistedCompletionRate >= 0.5
    && report.firstThreeAssistedCompletionRate >= 0.35
    && (report.medianSessionDurationMs >= 300_000 || report.medianCompletedLevels >= 3)
    && (report.shareExportRate >= 0.05 || report.nextDayReturnRate >= 0.08);

  return {
    ...report,
    thresholds: {
      sampleSize: { target: 100, value: report.uniqueBrowsers, passed: report.uniqueBrowsers >= 100 },
      observationDays: { target: 7, value: report.observationDays, passed: report.observationDays >= 7 },
      firstInteractionRate: { target: 0.7, value: report.firstInteractionRate, passed: report.firstInteractionRate >= 0.7 },
      levelOneAssistedCompletionRate: { target: 0.5, value: report.levelOneAssistedCompletionRate, passed: report.levelOneAssistedCompletionRate >= 0.5 },
      firstThreeAssistedCompletionRate: { target: 0.35, value: report.firstThreeAssistedCompletionRate, passed: report.firstThreeAssistedCompletionRate >= 0.35 },
      engagement: {
        targetDurationMs: 300_000,
        targetCompletedLevels: 3,
        valueDurationMs: report.medianSessionDurationMs,
        valueCompletedLevels: report.medianCompletedLevels,
        passed: report.medianSessionDurationMs >= 300_000 || report.medianCompletedLevels >= 3,
      },
      shareExportRate: { target: 0.05, value: report.shareExportRate, passed: report.shareExportRate >= 0.05 },
      nextDayReturnRate: { target: 0.08, value: report.nextDayReturnRate, passed: report.nextDayReturnRate >= 0.08 },
    },
    automatedExpansionEligible,
    manualGates: {
      blindTest: "4/5 understand; 3/5 finish levels 1-3 without answer; 4/5 continue; at most 1/5 calls it simple clicking; all reasonable actions have understandable feedback",
      specificFeedbackRequired: 10,
      status: "not_measured_by_anonymous_events",
    },
  };
}
