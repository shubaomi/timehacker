"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import dynamic from "next/dynamic";
import {
  Archive,
  BarChart3,
  ChevronLeft,
  CircleHelp,
  Clock3,
  Languages,
  Menu,
  RotateCcw,
  Share2,
  Trophy,
  UserRoundPen,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  clearPlaytestIdentity,
  getPlaytestBrowserId,
  trackPlaytestEvent,
  type PlaytestEventDetails,
} from "@/analytics/playtest-client";
import type { PlaytestEventName } from "@/analytics/playtest-contract";
import { evaluateCheatTrigger } from "@/game/cheats";
import { effectElapsedTime, type CheatEffectConfig } from "@/game/effects";
import type { ShareCardPayload } from "@/game/share-card";
import { formatSignedError } from "@/game/timer";
import type { CheatEvent, GameMode } from "@/game/types";
import { publicLevelNumber } from "@/game/soft-launch";
import {
  isSpatialPilotBuildEnabled,
  isSpatialPilotSlug,
  spatialVisualPhase,
} from "@/game/spatial-pilot";
import { V2_LEVEL_BY_SLUG } from "@/game/v2-levels.generated";
import { localeTag, type MessageKey } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";
import type { CompletedGame, DashboardData, RankingsData } from "@/types/api";
import { CollectionPanel } from "./collection-panel";
import { RankingsPanel } from "./rankings-panel";
import { ResetDialog } from "./reset-dialog";
import { ShareCardDialog } from "./share-card-dialog";
import { formatStopwatch, TimerStage } from "./timer-stage";
import { V2EclipseMenuLayer, V2PuzzleScene } from "./v2-puzzle-scene";

type GameStatus =
  | "LOADING"
  | "READY"
  | "STARTING"
  | "RUNNING"
  | "STOPPING"
  | "SUCCESS"
  | "FAILED"
  | "LIMIT_REACHED";
type Panel = "game" | "cheats" | "ranks";

const PLAYER_STORAGE_KEY = "time-hacker.player-id.v1";
const SPATIAL_PILOT_ENABLED = isSpatialPilotBuildEnabled();
const SpatialTimeField = dynamic(
  () => import("./spatial-time-field").then((module) => module.SpatialTimeField),
  { ssr: false },
);

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = (await response.json()) as T & { error?: string; code?: string };
  if (!response.ok) {
    const error = new Error(payload.error ?? "Time Hacker did not respond.");
    Object.assign(error, { code: payload.code });
    throw error;
  }
  return payload;
}

function normalizeKey(key: string): string {
  if (key === "Escape") return "ESCAPE";
  if (key === "Enter") return "ENTER";
  return key.toUpperCase();
}

export function TimeHackerApp() {
  const { locale, setLocale, t } = useLocale();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activeRoundCheat, setActiveRoundCheat] = useState<DashboardData["suggestedCheat"]>(null);
  const [rankings, setRankings] = useState<RankingsData | null>(null);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [status, setStatus] = useState<GameStatus>("LOADING");
  const [mode, setMode] = useState<GameMode>("HACKER");
  const [difficulty, setDifficulty] = useState(1);
  const [panel, setPanel] = useState<Panel>("game");
  const [menuOpen, setMenuOpen] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [armed, setArmed] = useState(false);
  const [result, setResult] = useState<CompletedGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [puzzleResetEpoch, setPuzzleResetEpoch] = useState(0);
  const [ghostAnchor, setGhostAnchor] = useState<"left" | "right" | null>(null);
  const [eclipseOffset, setEclipseOffset] = useState(0);
  const [nickname, setNickname] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const eventsRef = useRef<CheatEvent[]>([]);
  const armedRef = useRef(false);
  const modeRef = useRef<GameMode>("HACKER");
  const readyEpochRef = useRef(0);
  const idleStartRef = useRef(0);
  const wallStartRef = useRef(0);
  const effectRef = useRef<CheatEffectConfig | null>(null);
  const activeGameRef = useRef<string | null>(null);
  const initializationStartedRef = useRef(false);
  const analyticsOnceRef = useRef(new Set<string>());

  const trackSoftLaunchEvent = useCallback((
    name: PlaytestEventName,
    details: PlaytestEventDetails = {},
  ) => {
    if (dashboard?.campaign.track !== "SOFT_LAUNCH" || !activeRoundCheat) return;
    void trackPlaytestEvent(name, activeRoundCheat.slug, details);
  }, [activeRoundCheat, dashboard?.campaign.track]);

  const trackSoftLaunchEventOnce = useCallback((
    name: PlaytestEventName,
    details: PlaytestEventDetails = {},
  ) => {
    const slug = activeRoundCheat?.slug;
    if (!slug || dashboard?.campaign.track !== "SOFT_LAUNCH") return;
    const key = `${slug}:${name}`;
    if (analyticsOnceRef.current.has(key)) return;
    analyticsOnceRef.current.add(key);
    void trackPlaytestEvent(name, slug, details);
  }, [activeRoundCheat?.slug, dashboard?.campaign.track]);

  const localizeError = useCallback(
    (cause: unknown, fallback: MessageKey) => {
      const code = (cause as Error & { code?: string })?.code;
      const errorKeys: Record<string, MessageKey> = {
        PLAYER_NOT_FOUND: "playerNotFound",
        DAILY_LIMIT_REACHED: "dailyLimitReached",
        CHEAT_NOT_ELIGIBLE: "cheatNotEligible",
        CATALOG_UNAVAILABLE: "catalogUnavailable",
        GAME_NOT_FOUND: "gameNotFound",
        INVALID_REQUEST: "invalidRequest",
      };
      if (code && errorKeys[code]) return t(errorKeys[code]);
      return locale === "en" && cause instanceof Error ? cause.message : t(fallback);
    },
    [locale, t],
  );

  const loadRankings = useCallback(async () => {
    setRankingsLoading(true);
    setRankingsError(null);
    try {
      setRankings(await requestJson<RankingsData>("/api/rankings"));
    } catch (rankingError) {
      setRankingsError(localizeError(rankingError, "rankUnavailable"));
    } finally {
      setRankingsLoading(false);
    }
  }, [localizeError]);

  const loadDashboard = useCallback(async (id: string, selectedDifficulty: number) => {
    const data = await requestJson<DashboardData>(
      `/api/dashboard?playerId=${encodeURIComponent(id)}&difficulty=${selectedDifficulty}`,
    );
    setDashboard(data);
    setDifficulty(data.difficulty);
    setNickname(data.player.nickname ?? "");
    return data;
  }, []);

  const emitCheatEvent = useCallback(
    (type: string, value?: string | number, durationMs?: number) => {
      if (status !== "READY" || (modeRef.current !== "HACKER" && type !== "MODE_TOGGLE")) return;
      const now = performance.now();
      const event: CheatEvent = {
        type,
        value,
        durationMs,
        at: Math.max(0, now - readyEpochRef.current),
      };
      const isIdleSample = type === "READY_WAIT" || type === "READY_MARK";
      if (!isIdleSample) idleStartRef.current = now;
      const retainedEvents = type === "READY_WAIT"
        ? eventsRef.current.filter(({ type: existingType }) => existingType !== "READY_WAIT")
        : isIdleSample || armedRef.current
          ? eventsRef.current
          : eventsRef.current.filter(({ type: existingType }) => existingType !== "READY_WAIT");
      const nextEvents = [...retainedEvents, event].slice(-100);
      eventsRef.current = nextEvents;
      if (activeRoundCheat) {
        if (evaluateCheatTrigger(activeRoundCheat.triggerConfig, nextEvents)) {
          armedRef.current = true;
          setArmed(true);
        }
      }
    },
    [activeRoundCheat, status],
  );

  const initialize = useCallback(async () => {
    setStatus("LOADING");
    setError(null);
    try {
      const stored = localStorage.getItem(PLAYER_STORAGE_KEY);
      const id = stored ?? crypto.randomUUID();
      if (!stored) localStorage.setItem(PLAYER_STORAGE_KEY, id);
      setPlayerId(id);
      await requestJson("/api/player", {
        method: "POST",
        body: JSON.stringify({ playerId: id }),
      });
      const data = await loadDashboard(id, 1);
      setActiveRoundCheat(data.suggestedCheat);
      setStatus(data.daily.remaining > 0 ? "READY" : "LIMIT_REACHED");
    } catch (initializationError) {
      setError(localizeError(initializationError, "initializationFailed"));
      setStatus("READY");
    }
  }, [loadDashboard, localizeError]);

  useEffect(() => {
    if (initializationStartedRef.current) return;
    const timer = window.setTimeout(() => {
      initializationStartedRef.current = true;
      void initialize();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialize]);

  useEffect(() => {
    if (status !== "READY") return;
    const now = performance.now();
    readyEpochRef.current = now;
    idleStartRef.current = now;
    eventsRef.current = [{ type: "READY_MARK", at: 0 }];
    trackSoftLaunchEventOnce("level_view");
  }, [activeRoundCheat, status, trackSoftLaunchEventOnce]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      emitCheatEvent("KEY", normalizeKey(event.key));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") emitCheatEvent("VISIBILITY_RETURN");
    };
    const handleOrientation = () => {
      emitCheatEvent("ORIENTATION", window.matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait");
    };
    window.addEventListener("keydown", handleKey);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("orientationchange", handleOrientation);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("orientationchange", handleOrientation);
    };
  }, [emitCheatEvent]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    if (status !== "RUNNING") return;
    let frame = 0;
    const tick = () => {
      const wallElapsed = performance.now() - wallStartRef.current;
      setElapsedMs(effectElapsedTime(wallElapsed, effectRef.current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  const prepareNext = useCallback((nextDashboard = dashboard) => {
    const nextCheat = nextDashboard?.suggestedCheat ?? null;
    if (activeRoundCheat?.slug === "ghost-session" && nextCheat?.slug === "ghost-session") {
      setPuzzleResetEpoch((epoch) => epoch + 1);
    } else {
      setPuzzleResetEpoch(0);
      setGhostAnchor(null);
    }
    if (nextCheat?.slug !== "eclipse-session") setEclipseOffset(0);
    eventsRef.current = [];
    armedRef.current = false;
    activeGameRef.current = null;
    effectRef.current = null;
    analyticsOnceRef.current.clear();
    setArmed(false);
    setElapsedMs(0);
    setResult(null);
    setError(null);
    setShareCardOpen(false);
    setHintLevel(0);
    setActiveRoundCheat(nextCheat);
    setStatus(nextDashboard && nextDashboard.daily.remaining <= 0 ? "LIMIT_REACHED" : "READY");
  }, [activeRoundCheat?.slug, dashboard]);

  const startChallenge = useCallback(async () => {
    if (!playerId || !dashboard) return;
    if (dashboard.campaign.track === "SOFT_LAUNCH" && dashboard.campaign.complete) return;
    if (dashboard.daily.remaining <= 0) {
      setStatus("LIMIT_REACHED");
      return;
    }
    setStatus("STARTING");
    trackSoftLaunchEventOnce("first_interaction");
    setError(null);
    try {
      const response = await requestJson<{ game: { id: string } }>("/api/games/start", {
        method: "POST",
        body: JSON.stringify({
          playerId,
          clientRequestId: crypto.randomUUID(),
          mode,
          difficulty,
          assignedCheatSlug: mode === "HACKER" ? activeRoundCheat?.slug ?? null : null,
        }),
      });
      activeGameRef.current = response.game.id;
      effectRef.current = mode === "HACKER" && armedRef.current && activeRoundCheat
        ? activeRoundCheat.effectConfig
        : null;
      wallStartRef.current = performance.now();
      setElapsedMs(0);
      setStatus("RUNNING");
      trackSoftLaunchEvent("timer_started");
    } catch (startError) {
      const code = (startError as Error & { code?: string }).code;
      setStatus(code === "DAILY_LIMIT_REACHED" ? "LIMIT_REACHED" : "READY");
      setError(localizeError(startError, "challengeStartFailed"));
    }
  }, [activeRoundCheat, dashboard, difficulty, localizeError, mode, playerId, trackSoftLaunchEvent, trackSoftLaunchEventOnce]);

  const stopChallenge = useCallback(async () => {
    if (!playerId || !activeGameRef.current) return;
    const wallDurationMs = performance.now() - wallStartRef.current;
    const durationMs = effectElapsedTime(wallDurationMs, effectRef.current);
    setElapsedMs(durationMs);
    setStatus("STOPPING");
    try {
      const response = await requestJson<{ game: CompletedGame }>(
        `/api/games/${activeGameRef.current}/complete`,
        {
          method: "POST",
          body: JSON.stringify({ playerId, durationMs, wallDurationMs, events: eventsRef.current }),
        },
      );
      await loadDashboard(playerId, difficulty);
      setElapsedMs(response.game.durationMs);
      setResult(response.game);
      setStatus(response.game.success ? "SUCCESS" : "FAILED");
      const puzzleSolved = Boolean(response.game.usedCheat);
      const analyticsMode = response.game.assistanceType && puzzleSolved ? "assisted" : "normal";
      trackSoftLaunchEvent("timer_stopped", {
        mode: analyticsMode,
        durationMs: response.game.durationMs,
        success: response.game.success,
        puzzleSolved,
      });
      if (response.game.success) {
        trackSoftLaunchEvent("level_completed", {
          mode: analyticsMode,
          success: true,
          puzzleSolved,
        });
      }
    } catch (stopError) {
      setStatus("FAILED");
      setError(localizeError(stopError, "resultSaveFailed"));
    }
  }, [difficulty, loadDashboard, localizeError, playerId, trackSoftLaunchEvent]);

  const handlePrimary = useCallback(() => {
    if (status === "RUNNING") void stopChallenge();
    else if (status === "SUCCESS" || status === "FAILED") {
      if (status === "SUCCESS") trackSoftLaunchEvent("next_level");
      prepareNext();
    }
    else if (status === "READY") void startChallenge();
  }, [prepareNext, startChallenge, status, stopChallenge, trackSoftLaunchEvent]);

  const switchMode = (nextMode: GameMode) => {
    if (nextMode === "PURE" && !dashboard?.player.firstSuccessAt) return;
    emitCheatEvent("MODE_TOGGLE", nextMode.toLowerCase());
    modeRef.current = nextMode;
    setMode(nextMode);
    prepareNext();
  };

  const switchPanel = (nextPanel: Panel) => {
    emitCheatEvent("PANEL_OPEN", nextPanel);
    setPanel(nextPanel);
    setMenuOpen(true);
    if (nextPanel === "ranks") void loadRankings();
  };

  const saveNickname = async (event: FormEvent) => {
    event.preventDefault();
    if (!playerId) return;
    setError(null);
    try {
      await requestJson("/api/player", {
        method: "PATCH",
        body: JSON.stringify({ playerId, nickname }),
      });
      await loadDashboard(playerId, difficulty);
    } catch (nicknameError) {
      setError(localizeError(nicknameError, "nicknameSaveFailed"));
    }
  };

  const confirmReset = async () => {
    if (!playerId) return;
    const resetAnalytics = dashboard?.campaign.track === "SOFT_LAUNCH";
    setResetBusy(true);
    setError(null);
    try {
      await requestJson("/api/player/reset", {
        method: "POST",
        body: JSON.stringify({
          playerId,
          analyticsBrowserId: resetAnalytics
            ? getPlaytestBrowserId()
            : undefined,
        }),
      });
      if (resetAnalytics) clearPlaytestIdentity();
      const nextDashboard = await loadDashboard(playerId, 1);
      setDifficulty(1);
      modeRef.current = "HACKER";
      setMode("HACKER");
      setResetOpen(false);
      setMenuOpen(false);
      prepareNext(nextDashboard);
      setStatus("READY");
    } catch (resetError) {
      setError(localizeError(resetError, "resetFailed"));
    } finally {
      setResetBusy(false);
    }
  };

  const resultCopy = useMemo(() => result ? {
    duration: formatStopwatch(result.durationMs),
    error: formatSignedError(result.errorMs),
  } : null, [result]);

  const shareCardPayload = useMemo<ShareCardPayload | null>(() => result && dashboard ? {
    durationMs: result.durationMs,
    errorMs: result.errorMs,
    success: result.success,
    level: activeRoundCheat
      ? publicLevelNumber(activeRoundCheat.slug, dashboard.campaign.track)
        ?? V2_LEVEL_BY_SLUG.get(activeRoundCheat.slug)?.id
        ?? dashboard.player.currentLevel
      : dashboard.player.currentLevel,
    discoveredCheats: dashboard.player.unlockedCheats,
    totalCheats: dashboard.collection.length,
    mode: result.mode,
  } : null, [activeRoundCheat, dashboard, result]);

  if (!dashboard && status === "LOADING") {
    return (
      <main className="boot-screen" aria-busy="true">
        <Clock3 aria-hidden="true" size={38} />
        <h1>{t("bootOpeningSimple")}</h1>
        <div className="boot-dots" aria-hidden="true"><i /><i /><i /></div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="boot-screen error-state" role="alert">
        <CircleHelp aria-hidden="true" size={34} />
        <h1>{t("gameUnavailable")}</h1>
        <p>{error ?? t("databaseUnavailable")}</p>
        <button type="button" onClick={() => void initialize()}>{t("tryAgainSimple")}</button>
      </main>
    );
  }

  const drawerTitle = panel === "cheats" ? t("cheatArchive") : panel === "ranks" ? t("globalRanks") : t("menuTitle");
  const spatialPhase = spatialVisualPhase(status);
  const spatialSlug = activeRoundCheat?.slug;
  const showSpatialPilot = SPATIAL_PILOT_ENABLED && spatialPhase !== null && isSpatialPilotSlug(spatialSlug);

  return (
    <MotionConfig reducedMotion="user">
      <main className="game-shell">
        <div className="playful-sky" aria-hidden="true"><i /><i /><i /></div>
        {showSpatialPilot ? (
          <SpatialTimeField
            armed={mode === "HACKER" && armed}
            enabled
            phase={spatialPhase}
            slug={spatialSlug}
          />
        ) : null}

        <header className="minimal-header">
          <a href="#play" className="simple-brand" aria-label={t("brandReturn")}>
            <span><Clock3 aria-hidden="true" size={19} /></span>
            <b>TIME HACKER</b>
          </a>
          <button
            type="button"
            className="menu-button"
            aria-label={t("openMenu")}
            aria-expanded={menuOpen}
            onClick={() => {
              setPanel("game");
              setMenuOpen(true);
            }}
          >
            <Menu aria-hidden="true" size={22} />
          </button>
        </header>

        <section
          className="play-screen"
          id="play"
          onPointerDownCapture={(event) => {
            if (event.target instanceof Element && event.target.closest("[data-v2-slug]")) {
              trackSoftLaunchEventOnce("first_interaction");
            }
          }}
          onKeyDownCapture={(event) => {
            if (event.target instanceof Element && event.target.closest("[data-v2-slug]")) {
              trackSoftLaunchEventOnce("first_interaction");
            }
          }}
          onWheelCapture={(event) => {
            if (event.target instanceof Element && event.target.closest("[data-v2-slug]")) {
              trackSoftLaunchEventOnce("first_interaction");
            }
          }}
        >
          <motion.div
            className="challenge-copy"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1>{t("simpleChallenge")}</h1>
          </motion.div>

          {status === "READY" && mode === "HACKER" && activeRoundCheat?.triggerConfig.v2Level ? (
            <V2PuzzleScene
              key={activeRoundCheat.slug}
              slug={activeRoundCheat.slug}
              armed={armed}
              hintLevel={hintLevel}
              spatialPilot={showSpatialPilot}
              resetEpoch={puzzleResetEpoch}
              ghostAnchor={ghostAnchor}
              onGhostAnchorChange={setGhostAnchor}
              menuOpen={menuOpen}
              eclipseOffset={eclipseOffset}
              onDiscover={() => {
                emitCheatEvent("V2_PUZZLE_DISCOVERED", activeRoundCheat.slug);
                trackSoftLaunchEventOnce("puzzle_discovered");
              }}
              onArm={() => {
                emitCheatEvent("V2_PUZZLE_ARMED", activeRoundCheat.slug);
                trackSoftLaunchEventOnce("puzzle_armed");
              }}
            />
          ) : null}

          <TimerStage
            elapsedMs={elapsedMs}
            status={status}
            armed={mode === "HACKER" && armed}
            disabled={status === "LIMIT_REACHED" || (dashboard.campaign.track === "SOFT_LAUNCH" && dashboard.campaign.complete)}
            onPrimary={handlePrimary}
            onEvent={emitCheatEvent}
          />

          <div className="live-message" aria-live="polite" role="status">
            {error ? <span className="error-copy">{error}</span> : null}
            {status === "LIMIT_REACHED" ? (
              <span>{t("dailyComplete")} {t("resetAt", { date: new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(dashboard.daily.resetsAt)) })}</span>
            ) : null}
            {dashboard.campaign.track === "SOFT_LAUNCH" && dashboard.campaign.complete ? (
              <span>{t("campaignComplete")}</span>
            ) : null}
          </div>

          <AnimatePresence mode="wait">
            {result && (status === "SUCCESS" || status === "FAILED") ? (
              <motion.section
                className={`simple-result ${result.success ? "success" : "failure"}`}
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10 }}
                role="status"
                aria-live="assertive"
              >
                <div>
                  <h2>{result.success ? t("successSimple") : t("missSimple")}</h2>
                </div>
                <div className="simple-result-number">
                  <span>{resultCopy?.duration}<small>s</small></span>
                  <b>{resultCopy?.error}</b>
                </div>
                <button type="button" onClick={() => {
                  setShareCardOpen(true);
                  trackSoftLaunchEvent("share_card_open");
                }}><Share2 aria-hidden="true" size={17} /> {t("shareResultSimple")}</button>
              </motion.section>
            ) : null}
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {menuOpen ? (
            <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={() => setMenuOpen(false)}>
              <motion.aside
                className="game-drawer"
                role="dialog"
                aria-modal="true"
                aria-label={drawerTitle}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {status === "READY" && mode === "HACKER" && activeRoundCheat?.slug === "eclipse-session" && panel === "game" ? (
                  <V2EclipseMenuLayer
                    offset={eclipseOffset}
                    aligned={eclipseOffset >= 60 && eclipseOffset <= 84}
                    onOffsetChange={setEclipseOffset}
                  />
                ) : null}
                <header className="drawer-header">
                  {panel !== "game" ? (
                    <button type="button" onClick={() => switchPanel("game")} aria-label={t("backToMenu")}><ChevronLeft aria-hidden="true" size={20} /></button>
                  ) : <span className="drawer-clock"><Clock3 aria-hidden="true" size={19} /></span>}
                  <h2>{drawerTitle}</h2>
                  <button type="button" onClick={() => setMenuOpen(false)} aria-label={t("closeMenu")}><X aria-hidden="true" size={20} /></button>
                </header>

                <div className="drawer-content">
                  {panel === "game" ? (
                    <>
                      <button
                        type="button"
                        className="drawer-row language-row"
                        onClick={() => {
                          const nextLocale = locale === "en" ? "zh" : "en";
                          emitCheatEvent("LOCALE_TOGGLE", nextLocale);
                          setLocale(nextLocale);
                        }}
                      >
                        <Languages aria-hidden="true" size={19} />
                        <span>{t("language")}</span>
                        <b>{locale === "en" ? "中文" : "English"}</b>
                      </button>

                      <section className="drawer-section">
                        <h3>{t("playMode")}</h3>
                        <div className="mode-switch" aria-label={t("gameMode")}>
                          <button type="button" className={mode === "HACKER" ? "active" : ""} onClick={() => switchMode("HACKER")}>{t("playfulMode")}</button>
                          <button type="button" className={mode === "PURE" ? "active" : ""} disabled={dashboard.campaign.track === "SOFT_LAUNCH" || !dashboard.player.firstSuccessAt} onClick={() => switchMode("PURE")}>{t("pureMode")}</button>
                        </div>
                        {dashboard.campaign.track === "FULL" && dashboard.player.firstSuccessAt ? (
                          <label className="difficulty-control">
                            <span>{t("difficultyLabel")}</span>
                            <select value={difficulty} onChange={async (event) => {
                              const next = Number(event.target.value);
                              const nextDashboard = playerId
                                ? await loadDashboard(playerId, next)
                                : dashboard;
                              prepareNext(nextDashboard);
                            }}>
                              {Array.from({ length: dashboard.maximumDifficulty }, (_, index) => index + 1).map((value) => (
                                <option key={value} value={value}>{t("difficulty", { value })}</option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </section>

                      <nav className="drawer-nav" aria-label={t("moreGameOptions")}>
                        {status === "READY" && mode === "HACKER" && activeRoundCheat ? (
                          <button type="button" onClick={() => setHintLevel((level) => {
                            const next = level === 0 ? 1 : level === 1 ? 2 : 3;
                            trackSoftLaunchEventOnce(next === 1 ? "hint_1_open" : next === 2 ? "hint_2_open" : "answer_open");
                            return next;
                          })}>
                            <CircleHelp aria-hidden="true" size={20} />
                            <span>{hintLevel === 0 ? t("hint") : hintLevel < 2 ? t("showNextHint") : t("showAnswer")}</span>
                            <b>{hintLevel}/3</b>
                          </button>
                        ) : null}
                        <button type="button" onClick={() => switchPanel("cheats")}><Archive aria-hidden="true" size={20} /><span>{t("cheatArchive")}</span><b>{dashboard.player.unlockedCheats}/{dashboard.collection.length}</b></button>
                        <button type="button" onClick={() => switchPanel("ranks")}><Trophy aria-hidden="true" size={20} /><span>{t("globalRanks")}</span><ChevronLeft className="forward-chevron" aria-hidden="true" size={18} /></button>
                      </nav>

                      <section className="drawer-section progress-section">
                        <div className="drawer-section-title"><div><BarChart3 aria-hidden="true" size={20} /><h3>{t("myProgress")}</h3></div><strong>L{dashboard.player.currentLevel}</strong></div>
                        <div className="metric-grid">
                          <div><span>{t("runs")}</span><b>{dashboard.player.totalGames}</b></div>
                          <div><span>{t("wins")}</span><b>{dashboard.player.successGames}</b></div>
                          <div><span>{t("bestDelta")}</span><b>{dashboard.player.bestErrorMs === null ? "—" : `${dashboard.player.bestErrorMs}ms`}</b></div>
                        </div>
                        <small>{t("attemptsLeft", { count: dashboard.daily.remaining })}</small>
                      </section>

                      {dashboard.player.firstSuccessAt ? (
                        <form className="nickname-form" onSubmit={saveNickname}>
                          <UserRoundPen aria-hidden="true" size={17} />
                          <label htmlFor="nickname">{t("playerName")}</label>
                          <input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={24} placeholder={t("playerName")} />
                          <button type="submit">{t("save")}</button>
                        </form>
                      ) : null}

                      <button type="button" className="reset-link" onClick={() => setResetOpen(true)}><RotateCcw aria-hidden="true" size={16} /> {t("resetProgress")}</button>
                    </>
                  ) : null}

                  {panel === "cheats" ? <CollectionPanel collection={dashboard.collection} /> : null}
                  {panel === "ranks" ? <RankingsPanel rankings={rankings} loading={rankingsLoading} error={rankingsError} onRetry={() => void loadRankings()} /> : null}
                </div>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <ResetDialog open={resetOpen} busy={resetBusy} onCancel={() => setResetOpen(false)} onConfirm={() => void confirmReset()} />
        <ShareCardDialog
          open={shareCardOpen}
          payload={shareCardPayload}
          locale={locale}
          t={t}
          onClose={() => setShareCardOpen(false)}
          onExport={(action) => trackSoftLaunchEvent("share_card_exported", { action })}
        />
      </main>
    </MotionConfig>
  );
}
