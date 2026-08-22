import type {
  PlaytestEventBatch,
  PlaytestEventName,
  PlaytestEntrySource,
} from "./playtest-contract";

const BROWSER_ID_KEY = "time-hacker.playtest-browser-id.v1";
const SESSION_ID_KEY = "time-hacker.playtest-session-id.v1";
const SESSION_ACTIVITY_KEY = "time-hacker.playtest-session-activity.v1";
const SESSION_TIMEOUT_MS = 30 * 60 * 1_000;

export interface PlaytestEventDetails {
  mode?: "normal" | "assisted";
  durationMs?: number;
  success?: boolean;
  puzzleSolved?: boolean;
  action?: "save" | "copy";
}

function storedUuid(key: string): string {
  const stored = localStorage.getItem(key);
  if (stored) return stored;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

function entrySource(): PlaytestEntrySource {
  const requested = new URLSearchParams(window.location.search).get("entrySource");
  if (requested === "share") return "share";
  return document.referrer === "" ? "direct" : "unknown";
}

function sessionId(now: number): string {
  const previousActivity = Number(localStorage.getItem(SESSION_ACTIVITY_KEY) ?? 0);
  if (!Number.isFinite(previousActivity) || now - previousActivity > SESSION_TIMEOUT_MS) {
    localStorage.removeItem(SESSION_ID_KEY);
  }
  localStorage.setItem(SESSION_ACTIVITY_KEY, String(now));
  return storedUuid(SESSION_ID_KEY);
}

export function getPlaytestBrowserId(): string {
  return storedUuid(BROWSER_ID_KEY);
}

export function clearPlaytestIdentity(): void {
  localStorage.removeItem(BROWSER_ID_KEY);
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(SESSION_ACTIVITY_KEY);
}

export async function trackPlaytestEvent(
  name: PlaytestEventName,
  levelSlug: string,
  details: PlaytestEventDetails = {},
): Promise<void> {
  const now = Date.now();
  const batch: PlaytestEventBatch = {
    browserId: getPlaytestBrowserId(),
    sessionId: sessionId(now),
    entrySource: entrySource(),
    events: [{
      clientEventId: crypto.randomUUID(),
      name,
      levelSlug,
      occurredAt: new Date(now).toISOString(),
      ...details,
    }],
  };
  try {
    await fetch("/api/playtest/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // Analytics must never block or change the game outcome.
  }
}
