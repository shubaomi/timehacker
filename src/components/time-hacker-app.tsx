"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  Activity,
  Archive,
  ChevronRight,
  CircleHelp,
  Copy,
  FlaskConical,
  Languages,
  RotateCcw,
  Share2,
  Trophy,
  UserRoundPen,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { evaluateCheatTrigger } from "@/game/cheats";
import { buildShareText } from "@/game/share";
import { formatDuration, formatSignedError, scaledElapsedTime } from "@/game/timer";
import type { CheatEvent, GameMode } from "@/game/types";
import { localeTag, type MessageKey } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";
import type { CompletedGame, DashboardData, RankingsData } from "@/types/api";
import { CollectionPanel } from "./collection-panel";
import { RankingsPanel } from "./rankings-panel";
import { ResetDialog } from "./reset-dialog";
import { TimerStage } from "./timer-stage";

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

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = (await response.json()) as T & { error?: string; code?: string };
  if (!response.ok) {
    const error = new Error(payload.error ?? "The time lab did not respond.");
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
  const [rankings, setRankings] = useState<RankingsData | null>(null);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [status, setStatus] = useState<GameStatus>("LOADING");
  const [mode, setMode] = useState<GameMode>("HACKER");
  const [difficulty, setDifficulty] = useState(1);
  const [panel, setPanel] = useState<Panel>("game");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [armed, setArmed] = useState(false);
  const [result, setResult] = useState<CompletedGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [manualShare, setManualShare] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [serviceCommand, setServiceCommand] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const eventsRef = useRef<CheatEvent[]>([]);
  const armedRef = useRef(false);
  const readyEpochRef = useRef(0);
  const wallStartRef = useRef(0);
  const timeScaleRef = useRef(1);
  const activeGameRef = useRef<string | null>(null);

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
      setRankingsError(
        localizeError(rankingError, "rankUnavailable"),
      );
    } finally {
      setRankingsLoading(false);
    }
  }, [localizeError]);

  const loadDashboard = useCallback(
    async (id: string, selectedDifficulty: number) => {
      const data = await requestJson<DashboardData>(
        `/api/dashboard?playerId=${encodeURIComponent(id)}&difficulty=${selectedDifficulty}`,
      );
      setDashboard(data);
      setDifficulty(data.difficulty);
      setNickname(data.player.nickname ?? "");
      return data;
    },
    [],
  );

  const emitCheatEvent = useCallback(
    (type: string, value?: string | number, durationMs?: number) => {
      if (status !== "READY" || mode !== "HACKER") return;
      const event: CheatEvent = {
        type,
        value,
        durationMs,
        at: Math.max(0, performance.now() - readyEpochRef.current),
      };
      const nextEvents = [...eventsRef.current, event].slice(-100);
      eventsRef.current = nextEvents;
      if (
        dashboard?.suggestedCheat &&
        evaluateCheatTrigger(dashboard.suggestedCheat.triggerConfig, nextEvents)
      ) {
        armedRef.current = true;
        setArmed(true);
      }
    },
    [dashboard, mode, status],
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
      setStatus(data.daily.remaining > 0 ? "READY" : "LIMIT_REACHED");
    } catch (initializationError) {
      setError(localizeError(initializationError, "initializationFailed"));
      setStatus("READY");
    }
  }, [loadDashboard, localizeError]);

  useEffect(() => {
    const timer = window.setTimeout(() => void initialize(), 0);
    return () => window.clearTimeout(timer);
  }, [initialize]);

  useEffect(() => {
    if (status !== "READY") return;
    readyEpochRef.current = performance.now();
    const idleTimer = window.setTimeout(() => {
      emitCheatEvent("READY_WAIT", undefined, 5_000);
    }, 5_000);
    return () => window.clearTimeout(idleTimer);
  }, [dashboard?.suggestedCheat?.slug, emitCheatEvent, status]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      emitCheatEvent("KEY", normalizeKey(event.key));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") emitCheatEvent("VISIBILITY_RETURN");
    };
    const handleOrientation = () => {
      if (window.matchMedia("(orientation: landscape)").matches) {
        emitCheatEvent("ORIENTATION", "landscape");
      }
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
    if (status !== "RUNNING") return;
    let frame = 0;
    const tick = () => {
      const wallElapsed = performance.now() - wallStartRef.current;
      setElapsedMs(scaledElapsedTime(wallElapsed, timeScaleRef.current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [status]);

  const prepareNext = useCallback(() => {
    eventsRef.current = [];
    armedRef.current = false;
    activeGameRef.current = null;
    setArmed(false);
    setElapsedMs(0);
    setResult(null);
    setError(null);
    setShareStatus(null);
    setManualShare(null);
    setStatus(dashboard && dashboard.daily.remaining <= 0 ? "LIMIT_REACHED" : "READY");
  }, [dashboard]);

  const startChallenge = useCallback(async () => {
    if (!playerId || !dashboard) return;
    if (dashboard.daily.remaining <= 0) {
      setStatus("LIMIT_REACHED");
      return;
    }
    setStatus("STARTING");
    setError(null);
    try {
      const response = await requestJson<{ game: { id: string } }>("/api/games/start", {
        method: "POST",
        body: JSON.stringify({
          playerId,
          clientRequestId: crypto.randomUUID(),
          mode,
          difficulty,
          assignedCheatSlug:
            mode === "HACKER" ? dashboard.suggestedCheat?.slug ?? null : null,
        }),
      });
      activeGameRef.current = response.game.id;
      timeScaleRef.current =
        mode === "HACKER" && armedRef.current && dashboard.suggestedCheat
          ? dashboard.suggestedCheat.effectConfig.timeScale
          : 1;
      wallStartRef.current = performance.now();
      setElapsedMs(0);
      setStatus("RUNNING");
    } catch (startError) {
      const code = (startError as Error & { code?: string }).code;
      setStatus(code === "DAILY_LIMIT_REACHED" ? "LIMIT_REACHED" : "READY");
      setError(localizeError(startError, "challengeStartFailed"));
    }
  }, [dashboard, difficulty, localizeError, mode, playerId]);

  const stopChallenge = useCallback(async () => {
    if (!playerId || !activeGameRef.current) return;
    const durationMs = scaledElapsedTime(
      performance.now() - wallStartRef.current,
      timeScaleRef.current,
    );
    setElapsedMs(durationMs);
    setStatus("STOPPING");
    try {
      const response = await requestJson<{ game: CompletedGame }>(
        `/api/games/${activeGameRef.current}/complete`,
        {
          method: "POST",
          body: JSON.stringify({ playerId, durationMs, events: eventsRef.current }),
        },
      );
      await loadDashboard(playerId, difficulty);
      setElapsedMs(response.game.durationMs);
      setResult(response.game);
      setStatus(response.game.success ? "SUCCESS" : "FAILED");
    } catch (stopError) {
      setStatus("FAILED");
      setError(localizeError(stopError, "resultSaveFailed"));
    }
  }, [difficulty, loadDashboard, localizeError, playerId]);

  const handlePrimary = useCallback(() => {
    if (status === "RUNNING") void stopChallenge();
    else if (status === "SUCCESS" || status === "FAILED") prepareNext();
    else if (status === "READY") void startChallenge();
  }, [prepareNext, startChallenge, status, stopChallenge]);

  const switchMode = (nextMode: GameMode) => {
    if (nextMode === "PURE" && !dashboard?.player.firstSuccessAt) return;
    emitCheatEvent("MODE_TOGGLE", nextMode);
    setMode(nextMode);
    if (nextMode === "PURE") {
      armedRef.current = false;
      setArmed(false);
    }
  };

  const switchPanel = (nextPanel: Panel) => {
    emitCheatEvent("PANEL_OPEN", nextPanel);
    setPanel(nextPanel);
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

  const shareResult = async () => {
    if (!result || !dashboard) return;
    const text = buildShareText({
      durationMs: result.durationMs,
      errorMs: result.errorMs,
      level: dashboard.player.currentLevel,
      unlockedCheats: dashboard.player.unlockedCheats,
      mode: result.mode,
      locale,
      totalCheats: dashboard.collection.length,
    });
    setManualShare(null);
    try {
      if (navigator.share) {
        await navigator.share({ title: t("shareTitle"), text });
        setShareStatus(t("reportShared"));
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setShareStatus(t("reportCopied"));
      } else {
        setManualShare(text);
        setShareStatus(t("copyReportManually"));
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        setShareStatus(t("reportCopied"));
      } catch {
        setManualShare(text);
        setShareStatus(t("copyReportManually"));
      }
    }
  };

  const confirmReset = async () => {
    if (!playerId) return;
    setResetBusy(true);
    setError(null);
    try {
      await requestJson("/api/player/reset", {
        method: "POST",
        body: JSON.stringify({ playerId }),
      });
      await loadDashboard(playerId, 1);
      setDifficulty(1);
      setMode("HACKER");
      setResetOpen(false);
      prepareNext();
      setStatus("READY");
    } catch (resetError) {
      setError(localizeError(resetError, "resetFailed"));
    } finally {
      setResetBusy(false);
    }
  };

  const chosenTimeScale =
    mode === "HACKER" && dashboard?.suggestedCheat
      ? dashboard.suggestedCheat.effectConfig.timeScale
      : 1;
  const hintStrength = Math.min(3, Math.floor((dashboard?.player.totalGames ?? 0) / 2) + 1);
  const resultCopy = useMemo(() => {
    if (!result) return null;
    return {
      duration: formatDuration(result.durationMs),
      error: formatSignedError(result.errorMs),
    };
  }, [result]);
  const suggestedCheatName = dashboard?.suggestedCheat
    ? locale === "zh" ? dashboard.suggestedCheat.nameZh : dashboard.suggestedCheat.name
    : null;
  const suggestedCheatHint = dashboard?.suggestedCheat
    ? locale === "zh" ? dashboard.suggestedCheat.hintZh : dashboard.suggestedCheat.hint
    : null;
  const suggestedEffectLabel = dashboard?.suggestedCheat
    ? locale === "zh"
      ? dashboard.suggestedCheat.effectConfig.labelZh
      : dashboard.suggestedCheat.effectConfig.label
    : null;

  const submitServiceCommand = (event: FormEvent) => {
    event.preventDefault();
    for (const value of serviceCommand.trim().toUpperCase()) {
      emitCheatEvent("KEY", value);
    }
    setServiceCommand("");
  };

  if (!dashboard && status === "LOADING") {
    return (
      <main className="boot-screen" aria-busy="true">
        <div className="boot-mark"><FlaskConical aria-hidden="true" /></div>
        <p>{t("bootUnit")}</p>
        <h1>{t("bootOpening")}</h1>
        <div className="boot-line"><span /></div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="boot-screen error-state" role="alert">
        <CircleHelp aria-hidden="true" size={32} />
        <h1>{t("linkUnavailable")}</h1>
        <p>{error ?? t("databaseUnavailable")}</p>
        <button type="button" onClick={() => void initialize()}>{t("retryInitialization")}</button>
      </main>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
    <main className="lab-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <header className="site-header">
        <a href="#game" className="brand-lockup" aria-label={t("brandReturn")}>
          <span><FlaskConical aria-hidden="true" size={19} /></span>
          <div><b>TIME HACKER</b><small>{t("unitLabel")}</small></div>
        </a>
        <div className="header-status">
          <span><i /> {t("labOnline")}</span>
          <span>{dashboard.player.displayName}</span>
          <span>{t("utcChannel")}</span>
          <button
            type="button"
            className="language-switch"
            aria-label={t("switchLanguage")}
            onClick={() => setLocale(locale === "en" ? "zh" : "en")}
          >
            <Languages aria-hidden="true" size={14} /> {locale === "en" ? "中文" : "EN"}
          </button>
        </div>
      </header>

      <section className="mission-strip" aria-label={t("missionStatus")}>
        <p><Activity aria-hidden="true" size={15} /> {t("activeExperiment")}</p>
        <h1>{t("missionLead")} <em>{t("missionTime")}</em></h1>
        <p>{t("missionDescription")}</p>
      </section>

      <nav className="section-tabs" aria-label={t("labSections")}>
        {([
          ["game", Zap, t("experiment")],
          ["cheats", Archive, t("cheatArchive")],
          ["ranks", Trophy, t("globalRanks")],
        ] as const).map(([value, Icon, label]) => (
          <button key={value} type="button" aria-current={panel === value ? "page" : undefined} onClick={() => switchPanel(value)}>
            <Icon aria-hidden="true" size={16} /> {label}
          </button>
        ))}
      </nav>

      <div className="lab-grid" id="game">
        <div className="experiment-column">
          <div className="mode-row">
            <div className="mode-switch" aria-label={t("gameMode")}>
              <button type="button" className={mode === "HACKER" ? "active" : ""} onClick={() => switchMode("HACKER")} onFocus={() => emitCheatEvent("FOCUS", "mode")}>{t("hackerMode")}</button>
              <button type="button" className={mode === "PURE" ? "active" : ""} disabled={!dashboard.player.firstSuccessAt} title={!dashboard.player.firstSuccessAt ? t("pureModeLocked") : undefined} onClick={() => switchMode("PURE")} onFocus={() => emitCheatEvent("FOCUS", "mode")}>{t("pureMode")}</button>
            </div>
            <div className="attempt-counter"><span>{t("dailySignals")}</span><strong>{dashboard.daily.remaining}<small> / {dashboard.daily.limit}</small></strong></div>
          </div>

          <TimerStage elapsedMs={elapsedMs} status={status} armed={armed} timeScale={chosenTimeScale} disabled={status === "LIMIT_REACHED"} onPrimary={handlePrimary} onEvent={emitCheatEvent} />

          <div className="live-message" aria-live="polite" role="status">
            {error ? <span className="error-copy">{error}</span> : null}
            {status === "LIMIT_REACHED" ? <span>{t("dailyComplete")} {t("resetAt", { date: new Intl.DateTimeFormat(localeTag(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(dashboard.daily.resetsAt)) })}</span> : null}
            {status === "RUNNING" ? <span>{t("chamberMeasuring")}</span> : null}
            {armed && status === "READY" && suggestedEffectLabel ? <span>{t("gameTimeSlow", { label: suggestedEffectLabel })}</span> : null}
          </div>
        </div>

        <aside className="intelligence-column">
          <AnimatePresence mode="wait">
            {panel === "game" ? (
              <motion.div key="game-panel" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <section className="intel-panel briefing-panel">
                  <header className="panel-heading">
                    <div><p>{t("currentAssignment")}</p><h2>{mode === "PURE" ? t("unassistedTiming") : suggestedCheatName ?? t("archiveComplete")}</h2></div>
                    <span className="difficulty-stamp">D{mode === "PURE" ? 0 : dashboard.suggestedCheat?.difficulty ?? 5}</span>
                  </header>
                  {mode === "HACKER" && dashboard.suggestedCheat ? (
                    <>
                      <p className="classified-copy">{t("triggerBrief")}</p>
                      <button className="clue-block" type="button" onClick={() => emitCheatEvent("CLUE_TAP")}>
                        <CircleHelp aria-hidden="true" size={18} />
                        <span><small>{t("clueLevel", { level: hintStrength })}</small>{suggestedCheatHint}</span>
                        <ChevronRight aria-hidden="true" size={16} />
                      </button>
                      <div className="cipher-words" aria-label={t("clueCipherWords")}>
                        {["time", "bends", "here"].map((word) => <button key={word} type="button" onClick={() => emitCheatEvent("CLUE_TOKEN", word)}>{word}</button>)}
                      </div>
                      <form className="service-console" onSubmit={submitServiceCommand}>
                        <label htmlFor="service-command">{t("serviceInput")}</label>
                        <div>
                          <input
                            id="service-command"
                            value={serviceCommand}
                            onChange={(event) => setServiceCommand(event.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            aria-describedby="service-command-hint"
                          />
                          <button type="submit" disabled={!serviceCommand.trim()}>{t("applyCommand")}</button>
                        </div>
                        <small id="service-command-hint">{t("serviceInputHint")}</small>
                      </form>
                      <div className={`armed-card ${armed ? "active" : ""}`}>
                        <Zap aria-hidden="true" size={18} />
                        <span><b>{armed ? t("exploitArmed") : t("exploitDormant")}</b><small>{armed ? t("clockMultiplier", { scale: chosenTimeScale.toFixed(2) }) : t("completeRitual")}</small></span>
                      </div>
                    </>
                  ) : <p className="classified-copy">{t("pureBrief")}</p>}

                  {dashboard.player.firstSuccessAt ? (
                    <label className="difficulty-control">
                      <span>{t("unlockedDifficulty")}</span>
                      <select value={difficulty} onChange={async (event) => {
                        const next = Number(event.target.value);
                        if (playerId) await loadDashboard(playerId, next);
                        prepareNext();
                      }}>
                        {Array.from({ length: dashboard.maximumDifficulty }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{t("difficulty", { value })}</option>)}
                      </select>
                    </label>
                  ) : null}
                </section>

                <section className="intel-panel operator-panel">
                  <header className="panel-heading"><div><p>{t("operatorRecord")}</p><h2>{dashboard.player.displayName}</h2></div><strong>L{String(dashboard.player.currentLevel).padStart(2, "0")}</strong></header>
                  <div className="metric-grid">
                    <div><span>{t("runs")}</span><b>{dashboard.player.totalGames}</b></div>
                    <div><span>{t("wins")}</span><b>{dashboard.player.successGames}</b></div>
                    <div><span>{t("cheats")}</span><b>{dashboard.player.unlockedCheats}/{dashboard.collection.length}</b></div>
                    <div><span>{t("bestDelta")}</span><b>{dashboard.player.bestErrorMs === null ? "—" : `${dashboard.player.bestErrorMs}ms`}</b></div>
                  </div>
                  {dashboard.player.firstSuccessAt ? (
                    <form className="nickname-form" onSubmit={saveNickname}>
                      <UserRoundPen aria-hidden="true" size={16} /><label htmlFor="nickname">{t("fieldName")}</label><input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={24} /><button type="submit">{t("save")}</button>
                    </form>
                  ) : <p className="unlock-note">{t("firstSuccessUnlocks")}</p>}
                </section>
              </motion.div>
            ) : null}

            {panel === "cheats" ? <motion.div key="cheats-panel" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><CollectionPanel collection={dashboard.collection} /></motion.div> : null}
            {panel === "ranks" ? <motion.div key="ranks-panel" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}><RankingsPanel rankings={rankings} loading={rankingsLoading} error={rankingsError} onRetry={() => void loadRankings()} /></motion.div> : null}
          </AnimatePresence>
        </aside>
      </div>

      <AnimatePresence>
        {result && (status === "SUCCESS" || status === "FAILED") ? (
          <motion.section className={`result-drawer ${result.success ? "success" : "failure"}`} initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} role="status" aria-live="assertive">
            <div><p>{result.success ? t("breachConfirmed") : t("outsideTolerance")}</p><h2>{result.success ? t("timeHacked") : t("tryAgain")}</h2></div>
            <div className="result-measurement"><span>{resultCopy?.duration}</span><b>{resultCopy?.error}</b><small>{result.mode} {result.usedCheat ? `· ${locale === "zh" ? result.usedCheat.nameZh ?? result.usedCheat.name : result.usedCheat.name}` : `· ${t("unassisted")}`}</small></div>
            <div className="result-actions"><button type="button" onClick={() => void shareResult()}><Share2 aria-hidden="true" size={17} /> {t("shareReport")}</button><button type="button" onClick={prepareNext}>{t("runAgain")} <ChevronRight aria-hidden="true" size={17} /></button></div>
            {shareStatus ? <p className="share-status">{shareStatus}</p> : null}
            {manualShare ? <textarea aria-label={t("fieldReportText")} readOnly value={manualShare} /> : null}
          </motion.section>
        ) : null}
      </AnimatePresence>

      <footer className="site-footer">
        <p>{t("footer")}</p>
        <div>
          <button type="button" onClick={async () => {
            const text = locale === "zh"
              ? `操作员 ${dashboard.player.displayName} · 已发现 ${dashboard.player.unlockedCheats}/${dashboard.collection.length} 个漏洞`
              : `Player ${dashboard.player.displayName} · ${dashboard.player.unlockedCheats}/${dashboard.collection.length} cheats`;
            try { await navigator.clipboard.writeText(text); setShareStatus(t("operatorSummaryCopied")); } catch { setManualShare(text); }
          }}><Copy aria-hidden="true" size={14} /> {t("copyIdSummary")}</button>
          <button type="button" onClick={() => setResetOpen(true)}><RotateCcw aria-hidden="true" size={14} /> {t("resetProgress")}</button>
        </div>
      </footer>

      <ResetDialog open={resetOpen} busy={resetBusy} onCancel={() => setResetOpen(false)} onConfirm={() => void confirmReset()} />
    </main>
    </MotionConfig>
  );
}
