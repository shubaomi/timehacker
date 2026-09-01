"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { V2EclipseMenuLayer, V2PuzzleScene } from "@/components/v2-puzzle-scene";
import { DirectorCornerRepair } from "@/components/v2-prototype/director-corner-repair";
import { DirectorEvidenceGate } from "@/components/v2-prototype/director-evidence-gate";
import {
  DIRECTOR_CAMPAIGN,
  DIRECTOR_CHAPTERS,
  directorLevelByNumber,
  type DirectorLevelDefinition,
} from "@/game/director-campaign";
import { CHEAT_DEFINITIONS } from "@/game/cheats";
import {
  effectElapsedTime,
  effectToleranceMs,
  type CheatEffectConfig,
} from "@/game/effects";
import { formatSignedError, measureGame, type GameMeasurement } from "@/game/timer";
import { V2_LEVEL_BY_SLUG } from "@/game/v2-levels.generated";
import { useLocale } from "@/i18n/locale-provider";
import base from "./full-spatial-review-lab.module.css";
import styles from "./director-chapter-lab.module.css";

const SpatialTimeField = dynamic(
  () => import("@/components/spatial-time-field").then((module) => module.SpatialTimeField),
  { ssr: false },
);

type DirectorPlayPhase = "idle" | "running" | "stopped" | "success" | "miss";
type HintLevel = 0 | 1 | 2 | 3;

const DIRECTOR_LEVELS = DIRECTOR_CAMPAIGN;

function campaignLevel(number: number): DirectorLevelDefinition {
  if (Number.isInteger(number) && number >= 1 && number <= DIRECTOR_LEVELS.length) {
    return directorLevelByNumber(number) ?? DIRECTOR_LEVELS[0];
  }
  return DIRECTOR_LEVELS[0];
}

function formatTimer(milliseconds: number) {
  return (Math.max(0, milliseconds) / 1_000).toFixed(2);
}

function hintContent(level: DirectorLevelDefinition, hintLevel: HintLevel) {
  if (hintLevel === 2) return level.hints.h2.content;
  if (hintLevel === 3) return level.hints.h3.content;
  return null;
}

export function DirectorChapterLab({
  initialLevel,
  hintDelayMs = 45_000,
}: {
  initialLevel: number;
  hintDelayMs?: number;
}) {
  const { locale, setLocale } = useLocale();
  const [levelNumber, setLevelNumber] = useState(() => campaignLevel(initialLevel).number);
  const [phase, setPhase] = useState<DirectorPlayPhase>("idle");
  const [armed, setArmed] = useState(false);
  const [discovered, setDiscovered] = useState(false);
  const [evidenceReady, setEvidenceReady] = useState(() => campaignLevel(initialLevel).number === 1);
  const [hintLevel, setHintLevel] = useState<HintLevel>(0);
  const [hintAvailable, setHintAvailable] = useState(false);
  const [resetEpoch, setResetEpoch] = useState(0);
  const [ghostAnchor, setGhostAnchor] = useState<"left" | "right" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eclipseOffset, setEclipseOffset] = useState(18);
  const [visualEnabled, setVisualEnabled] = useState(true);
  const [result, setResult] = useState<GameMeasurement | null>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const wallStartRef = useRef(0);
  const frozenElapsedRef = useRef(0);
  const effectRef = useRef<CheatEffectConfig | null>(null);
  const resultTimerRef = useRef<number | null>(null);
  const level = campaignLevel(levelNumber);
  const chapter = DIRECTOR_CHAPTERS[level.chapter - 1];
  const legacy = V2_LEVEL_BY_SLUG.get(level.legacySlug);
  const definition = useMemo(
    () => CHEAT_DEFINITIONS.find((candidate) => candidate.slug === level.legacySlug) ?? null,
    [level.legacySlug],
  );
  const zh = locale === "zh";
  const currentHint = hintContent(level, hintLevel);

  const writeTimer = useCallback((elapsed: number) => {
    frozenElapsedRef.current = elapsed;
    if (timerRef.current) timerRef.current.textContent = formatTimer(elapsed);
  }, []);

  useEffect(() => {
    if (phase !== "running") return;
    let frame = 0;
    const draw = (now: number) => {
      if (document.visibilityState !== "hidden") {
        writeTimer(effectElapsedTime(now - wallStartRef.current, effectRef.current));
      }
      frame = window.requestAnimationFrame(draw);
    };
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [phase, writeTimer]);

  useEffect(() => () => {
    if (resultTimerRef.current !== null) window.clearTimeout(resultTimerRef.current);
  }, []);

  useEffect(() => {
    if (hintAvailable || hintLevel > 0 || armed) return;

    let remaining = Math.max(0, hintDelayMs);
    let startedAt: number | null = null;
    let timer: number | null = null;

    const pause = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
      if (startedAt !== null) remaining = Math.max(0, remaining - (performance.now() - startedAt));
      startedAt = null;
    };
    const schedule = () => {
      if (document.visibilityState === "hidden") return;
      startedAt = performance.now();
      timer = window.setTimeout(() => setHintAvailable(true), remaining);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") pause();
      else schedule();
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      pause();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [armed, hintAvailable, hintDelayMs, hintLevel, levelNumber]);

  const resetExperience = useCallback((nextNumber = levelNumber) => {
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
    const next = campaignLevel(nextNumber);
    const sameLevel = next.number === levelNumber;
    setLevelNumber(next.number);
    setPhase("idle");
    setArmed(false);
    setDiscovered(false);
    setHintLevel(0);
    setHintAvailable(false);
    setEvidenceReady((current) => sameLevel ? current : next.number === 1);
    setMenuOpen(false);
    setEclipseOffset(18);
    if (next.number !== levelNumber) setGhostAnchor(null);
    setResult(null);
    setResetEpoch((value) => value + 1);
    effectRef.current = null;
    writeTimer(0);
  }, [levelNumber, writeTimer]);

  const startTimer = useCallback(() => {
    setResult(null);
    effectRef.current = armed ? definition?.effectConfig ?? null : null;
    wallStartRef.current = performance.now();
    writeTimer(0);
    setPhase("running");
  }, [armed, definition?.effectConfig, writeTimer]);

  const stopTimer = useCallback(() => {
    const elapsed = effectElapsedTime(
      performance.now() - wallStartRef.current,
      effectRef.current,
    );
    const measurement = measureGame(elapsed, 10_000, effectToleranceMs(effectRef.current));
    writeTimer(measurement.durationMs);
    setPhase("stopped");
    resultTimerRef.current = window.setTimeout(() => {
      setResult(measurement);
      setPhase(measurement.success ? "success" : "miss");
      resultTimerRef.current = null;
    }, 0);
  }, [writeTimer]);

  const primaryAction = () => {
    if (phase === "running") {
      stopTimer();
      return;
    }
    if (phase === "success") {
      resetExperience(levelNumber === DIRECTOR_LEVELS.length ? 1 : levelNumber + 1);
      return;
    }
    startTimer();
  };

  const primaryLabel = phase === "running"
    ? (zh ? "停止" : "Stop")
    : phase === "success"
      ? (zh ? "下一关" : "Next level")
      : phase === "miss"
        ? (zh ? "重试" : "Retry")
        : (zh ? "开始" : "Start");

  if (!legacy || !definition) {
    throw new RangeError(`Missing Director's Cut Legacy mapping for ${level.traceId}`);
  }

  return (
    <main
      className={`${base.root} ${styles.root}`}
      data-armed={armed ? "true" : "false"}
      data-controller={level.controller}
      data-director-chapter={level.chapter}
      data-discovered={discovered ? "true" : "false"}
      data-evidence-ready={evidenceReady ? "true" : "false"}
      data-hint-level={hintLevel}
      data-phase={phase}
      data-spatial-enabled={visualEnabled ? "true" : "false"}
    >
      {visualEnabled ? (
        <SpatialTimeField
          allowUnlisted
          armed={armed}
          enabled
          phase={phase}
          slug={level.legacySlug}
        />
      ) : null}

      <header className={base.header}>
        <a href="/playtest-v2" className={base.brand} aria-label={zh ? "返回 Time Hacker 评审入口" : "Back to Time Hacker review"}>
          <span aria-hidden="true">10</span>
          <b>TIME HACKER</b>
        </a>
        <div className={`${base.headerActions} ${styles.headerActions}`}>
          <span>DIRECTOR&apos;S CUT · CHAPTER {String(level.chapter).padStart(2, "0")}</span>
          <button type="button" onClick={() => setLocale(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button>
          {level.legacyId === 86 ? <button type="button" data-testid="director-menu-paper" aria-expanded={menuOpen} disabled={!evidenceReady} onClick={() => setMenuOpen((value) => !value)}>{zh ? "菜单纸层" : "Menu paper"}</button> : null}
        </div>
      </header>

      <section className={`${base.challenge} ${styles.challenge}`} aria-labelledby="director-title">
        <p><span>{String(level.number).padStart(2, "0")} / 36</span><b>{level.traceId}</b></p>
        <h1 id="director-title">{zh ? `第 ${level.chapter} 章 · ${chapter.title.zh}` : `Chapter ${level.chapter} · ${chapter.title.en}`}</h1>
      </section>

      <section className={`${base.stage} ${styles.stage}`} aria-label={zh ? "Director’s Cut 隔离体验" : "Director's Cut isolated experience"}>
        <div className={`${base.stageBack} ${styles.stageBack}`} aria-hidden="true" />

        <section className={`${base.timerCard} stopwatch-card`} aria-label={zh ? "计时器" : "Timer"}>
          <div className={base.timerValue}><span ref={timerRef}>0.00</span><small>s</small></div>
          <p aria-live="polite">
            {armed
              ? (zh ? "规则已经解锁。你仍需亲自停止时间。" : "Rule unlocked. You still stop time yourself.")
              : "\u00a0"}
          </p>
        </section>

        <div className={`${base.puzzlePlane} ${styles.puzzlePlane}`}>
          {level.number === 1 ? (
            <DirectorCornerRepair
              key={`director-corner-${resetEpoch}`}
              locale={locale}
              solved={armed}
              onDiscover={() => setDiscovered(true)}
              onArm={() => {
                setDiscovered(true);
                setArmed(true);
              }}
            />
          ) : (
            <>
              {!evidenceReady ? (
                <DirectorEvidenceGate
                  key={`director-evidence-${level.number}-${resetEpoch}`}
                  levelNumber={level.number}
                  locale={locale}
                  hintLevel={hintLevel}
                  visualEnabled={visualEnabled}
                  onDiscover={() => setDiscovered(true)}
                  onComplete={() => {
                    setDiscovered(true);
                    setEvidenceReady(true);
                  }}
                />
              ) : null}
              {evidenceReady ? (
                <div
                  className={styles.finalScene}
                  data-evidence-ready="true"
                  data-testid="director-final-scene"
                >
                  <V2PuzzleScene
                    key={`${level.legacySlug}-${resetEpoch}`}
                    slug={level.legacySlug}
                    armed={armed}
                    directorMode
                    hintLevel={0}
                    resetEpoch={resetEpoch}
                    ghostAnchor={ghostAnchor}
                    onGhostAnchorChange={setGhostAnchor}
                    menuOpen={menuOpen}
                    eclipseOffset={eclipseOffset}
                    spatialPilot={visualEnabled}
                    onDiscover={() => setDiscovered(true)}
                    onArm={() => {
                      if (!evidenceReady) return;
                      setDiscovered(true);
                      setArmed(true);
                    }}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>

        <button className={`${base.primary} ${styles.primary}`} data-testid="director-primary" type="button" onClick={primaryAction}>
          {primaryLabel}
        </button>

        {hintAvailable || hintLevel > 0 ? (
          <aside
            className={styles.hintDock}
            data-has-copy={currentHint ? "true" : "false"}
            aria-label={zh ? "渐进提示" : "Progressive hints"}
          >
            {currentHint ? <p role="status">{currentHint}</p> : null}
            <button
              type="button"
              disabled={hintLevel === 3 || armed}
              onClick={() => setHintLevel((value) => Math.min(3, value + 1) as HintLevel)}
            >
              {hintLevel === 0
                ? (zh ? "需要一点线索？" : "Need a small clue?")
                : hintLevel === 1
                  ? (zh ? "再给一点" : "One more")
                  : hintLevel === 2
                    ? (zh ? "显示最后提示" : "Show final hint")
                    : (zh ? "已显示最后提示" : "Final hint shown")}
            </button>
          </aside>
        ) : null}

        {result ? (
          <section className={styles.result} aria-live="polite" data-success={result.success ? "true" : "false"}>
            <b>{result.success ? (zh ? "时间被你锁住了" : "You locked time") : (zh ? "还差一点" : "Almost")}</b>
            <span>{formatTimer(result.durationMs)}s · {formatSignedError(result.errorMs)}</span>
          </section>
        ) : null}
      </section>

      <nav className={styles.campaignNav} aria-label={zh ? "Director Cut 36 关导航" : "Director Cut 36-level navigation"}>
        <button type="button" onClick={() => resetExperience(levelNumber - 1)} disabled={levelNumber === 1}>{zh ? "上一关" : "Previous"}</button>
        <label>
          <span>{zh ? "选择 Director’s Cut 关卡" : "Choose Director's Cut level"}</span>
          <select value={levelNumber} onChange={(event) => resetExperience(Number(event.target.value))}>
            {DIRECTOR_LEVELS.map((item) => {
              const mapped = V2_LEVEL_BY_SLUG.get(item.legacySlug);
              return <option key={item.traceId} value={item.number}>{String(item.number).padStart(2, "0")} · {mapped?.title[locale] ?? item.legacySlug}</option>;
            })}
          </select>
        </label>
        <button type="button" onClick={() => resetExperience(levelNumber + 1)} disabled={levelNumber === DIRECTOR_LEVELS.length}>{zh ? "下一关" : "Next"}</button>
        <button type="button" onClick={() => resetExperience()}>{zh ? "重置本关" : "Reset"}</button>
        <button type="button" aria-pressed={visualEnabled} onClick={() => setVisualEnabled((value) => !value)}>{zh ? `空间反馈 ${visualEnabled ? "开" : "关"}` : `Spatial feedback ${visualEnabled ? "on" : "off"}`}</button>
      </nav>

      {level.legacyId === 86 && menuOpen ? (
        <aside className={`${base.eclipseMenu} ${styles.eclipseMenu}`} aria-label={zh ? "Director 第 31 关菜单纸层" : "Director level 31 menu paper"}>
          <V2EclipseMenuLayer
            offset={eclipseOffset}
            aligned={eclipseOffset >= 60 && eclipseOffset <= 84}
            onOffsetChange={setEclipseOffset}
          />
          <button type="button" onClick={() => setMenuOpen(false)}>{zh ? "关闭菜单" : "Close menu"}</button>
        </aside>
      ) : null}
      <p className={styles.localOnly}>{zh ? "隔离体验 · 不写入正式进度或历史数据" : "Isolated experience · does not write formal progress or history"}</p>
    </main>
  );
}
