"use client";

import { Camera, Check, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CameraGestureUnlock } from "@/components/camera-gesture-unlock";
import {
  evaluateVTrace,
  nextSlowWordLetter,
  pointFromPointer,
  type PrototypeLevel,
  type PrototypePhase,
  type PrototypeTimerSnapshot,
  type TracePoint,
} from "@/game/v2-prototype";
import type { Locale } from "@/i18n/config";
import styles from "./prototype-lab.module.css";

interface SceneProps {
  locale: Locale;
  phase: PrototypePhase;
  timer: PrototypeTimerSnapshot;
  resetKey: number;
  assistedResult: boolean;
  onDiscover: () => void;
  onArm: () => void;
  onMainAction: () => void;
}

interface RepresentativeSceneProps extends SceneProps {
  level: PrototypeLevel;
}

const copy = {
  zh: {
    brand: "TIME HACKER",
    challenge: "你能让时间停在 10.00 秒吗？",
    start: "开始",
    stop: "停止",
    again: "再试一次",
    armed: "抓到时间的破绽了",
    normalResult: "差一点，时间还没听你的。",
    assistedResult: "漂亮！你让时间正好停住了。",
    solvedName001: "四角突破",
    solvedName003: "慢词机关",
    solvedName100: "静默星座",
    chapter001: "001 · 纸面醒来",
    chapter003: "003 · 纸面醒来",
    chapter100: "100 · 时间花园",
    camera: "可选摄像头手势",
    closeCamera: "回到页面解法",
  },
  en: {
    brand: "TIME HACKER",
    challenge: "Can you stop time at 10.00 seconds?",
    start: "Start",
    stop: "Stop",
    again: "Try again",
    armed: "You found the crack in time",
    normalResult: "Close. Time is still getting away.",
    assistedResult: "Beautiful. You stopped time exactly.",
    solvedName001: "Four-Corner Breach",
    solvedName003: "Slow Word",
    solvedName100: "Silent Constellation",
    chapter001: "001 · Paper Wakes",
    chapter003: "003 · Paper Wakes",
    chapter100: "100 · Time Garden",
    camera: "Optional camera gesture",
    closeCamera: "Use the page route",
  },
} as const;

function phaseIsSolved(phase: PrototypePhase): boolean {
  return ["ARMED", "RUNNING_ASSISTED", "RESULT"].includes(phase);
}

function MainAction({ locale, phase, onClick }: Pick<SceneProps, "locale" | "phase"> & { onClick: () => void }) {
  const words = copy[locale];
  const label = phase === "RESULT"
    ? words.again
    : phase === "RUNNING_NORMAL" || phase === "RUNNING_ASSISTED"
      ? words.stop
      : words.start;
  return (
    <button className={styles.mainAction} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

function TimerReadout({ timer }: { timer: PrototypeTimerSnapshot }) {
  return (
    <div className={styles.timerReadout} aria-live="polite">
      <span>{timer.time}</span>
      <small>s</small>
      {timer.delta ? <b className={timer.delta.startsWith("+") ? styles.deltaSuccess : styles.deltaMiss}>{timer.delta}</b> : null}
    </div>
  );
}

function SceneResult({ locale, phase, assistedResult, name }: Pick<SceneProps, "locale" | "phase" | "assistedResult"> & { name: string }) {
  if (phase !== "RESULT") return null;
  const words = copy[locale];
  return (
    <div className={styles.resultNote} role="status">
      <Check aria-hidden="true" size={17} />
      <span>{assistedResult ? words.assistedResult : words.normalResult}</span>
      {assistedResult ? <strong>{name}</strong> : null}
    </div>
  );
}

function ArmedNote({ locale, phase }: Pick<SceneProps, "locale" | "phase">) {
  if (!phaseIsSolved(phase) || phase === "RESULT") return null;
  return <p className={styles.armedNote}>{copy[locale].armed}</p>;
}

function Level001(props: SceneProps) {
  const { locale, phase, timer, assistedResult, onDiscover, onArm, onMainAction } = props;
  const words = copy[locale];
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [keyPosition, setKeyPosition] = useState({ x: 0, y: 0 });
  const [wrong, setWrong] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const solved = phaseIsSolved(phase);

  const finishPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const moved = Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y);
    dragStart.current = null;
    if (moved <= 12) return;
    const target = event.currentTarget.closest<HTMLElement>("[data-stage]")?.querySelector<HTMLElement>("[data-corner-target]");
    const rect = target?.getBoundingClientRect();
    const hit = Boolean(rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom);
    if (hit) {
      onArm();
      setWrong(false);
    } else {
      setWrong(true);
      setOffset({ x: 0, y: 0 });
    }
  };

  const moveWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    onDiscover();
    const next = {
      x: Math.max(0, Math.min(3, keyPosition.x + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0))),
      y: Math.max(0, Math.min(1, keyPosition.y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0))),
    };
    setKeyPosition(next);
    setOffset({ x: next.x * 46, y: next.y * 28 });
    if (next.x === 3 && next.y === 1) onArm();
  };

  return (
    <section className={`${styles.stage} ${styles.stage001}`} data-stage data-testid="prototype-stage-001" aria-label={words.chapter001}>
      <div className={styles.paperGrain} aria-hidden="true" />
      <header className={styles.sceneHeader}>
        <span className={styles.brandMark}>◷</span>
        <b>{words.brand}</b>
        <small>{words.chapter001}</small>
      </header>
      <div className={styles.missingCorner} data-corner-target aria-hidden="true" />
      <button
        type="button"
        className={`${styles.looseCorner} ${wrong ? styles.cornerWrong : ""} ${solved ? styles.cornerSolved : ""}`}
        aria-label={locale === "zh" ? "游离的纸角" : "Loose paper corner"}
        style={{ transform: solved ? "translate(0, 0)" : `translate(${offset.x}px, ${offset.y}px)` }}
        onClick={() => undefined}
        onKeyDown={moveWithKeyboard}
        onPointerDown={(event) => {
          dragStart.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragStart.current) return;
          const x = event.clientX - dragStart.current.x;
          const y = event.clientY - dragStart.current.y;
          if (Math.hypot(x, y) > 12) onDiscover();
          setOffset({ x, y });
        }}
        onPointerUp={finishPointer}
      >
        <span aria-hidden="true" />
      </button>
      <div className={styles.scene001Body}>
        <p className={styles.firstChallenge}>{words.challenge}</p>
        <TimerReadout timer={timer} />
        <ArmedNote locale={locale} phase={phase} />
        <MainAction locale={locale} phase={phase} onClick={onMainAction} />
        <SceneResult locale={locale} phase={phase} assistedResult={assistedResult} name={words.solvedName001} />
      </div>
      <span className={styles.paperSun} aria-hidden="true" />
      <span className={styles.paperLeaf} aria-hidden="true" />
    </section>
  );
}

function Level003(props: SceneProps) {
  const { locale, phase, timer, assistedResult, onDiscover, onArm, onMainAction } = props;
  const words = copy[locale];
  const [letters, setLetters] = useState(["F", "A", "S", "T"]);
  const solved = phaseIsSolved(phase);

  useEffect(() => {
    if (letters.join("") !== "SLOW") return;
    const timerId = window.setTimeout(onArm, 400);
    return () => window.clearTimeout(timerId);
  }, [letters, onArm]);

  const displayedLetters = solved ? ["S", "L", "O", "W"] : letters;
  const changeLetter = (index: number, direction: number) => {
    onDiscover();
    setLetters((current) => current.map((letter, letterIndex) => (
      letterIndex === index ? nextSlowWordLetter(index, letter, direction) : letter
    )));
  };

  return (
    <section className={`${styles.stage} ${styles.stage003}`} data-stage data-testid="prototype-stage-003" aria-label={words.chapter003}>
      <div className={styles.paperGrain} aria-hidden="true" />
      <header className={`${styles.sceneHeader} ${styles.sceneHeaderCompact}`}>
        <span className={styles.brandMark}>◷</span>
        <b>{words.brand}</b>
        <small>{words.chapter003}</small>
      </header>
      <span className={styles.typeShadow} aria-hidden="true">
        {displayedLetters.map((letter, index) => letter === "SLOW"[index] ? letter : "·").join("")}
      </span>
      <div className={styles.wordTiles} aria-label={locale === "zh" ? "四块漂动的字牌" : "Four drifting letter tiles"}>
        {displayedLetters.map((letter, index) => (
          <button
            type="button"
            key={index}
            className={`${styles.wordTile} ${"SLOW"[index] === letter ? styles.wordTileAligned : ""}`}
            aria-label={`${locale === "zh" ? "字牌" : "Letter tile"} ${index + 1}：${letter}`}
            onClick={() => changeLetter(index, 1)}
            onWheel={(event) => {
              event.preventDefault();
              changeLetter(index, event.deltaY >= 0 ? 1 : -1);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                changeLetter(index, event.key === "ArrowDown" ? 1 : -1);
              }
            }}
          >
            <span>{letter}</span>
          </button>
        ))}
      </div>
      <div className={styles.scene003Timer}>
        <TimerReadout timer={timer} />
        <ArmedNote locale={locale} phase={phase} />
        <MainAction locale={locale} phase={phase} onClick={onMainAction} />
        <SceneResult locale={locale} phase={phase} assistedResult={assistedResult} name={words.solvedName003} />
      </div>
      <span className={styles.inkArc} aria-hidden="true" />
    </section>
  );
}

function Level100(props: SceneProps) {
  const { locale, phase, timer, assistedResult, onDiscover, onArm, onMainAction } = props;
  const words = copy[locale];
  const [leftMoved, setLeftMoved] = useState(false);
  const [rightMoved, setRightMoved] = useState(false);
  const [trace, setTrace] = useState<TracePoint[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const clusterStart = useRef<Record<"left" | "right", number | null>>({ left: null, right: null });
  const vHoldTimer = useRef<number | null>(null);
  const tracing = useRef(false);
  const traceRef = useRef<TracePoint[]>([]);
  const solved = phaseIsSolved(phase);
  const ready = solved || (leftMoved && rightMoved);

  useEffect(() => () => {
    if (vHoldTimer.current !== null) window.clearTimeout(vHoldTimer.current);
  }, []);

  const moveCluster = (side: "left" | "right") => {
    onDiscover();
    if (side === "left") setLeftMoved(true);
    else setRightMoved(true);
  };

  const handleClusterPointerDown = (side: "left" | "right", event: React.PointerEvent<HTMLButtonElement>) => {
    clusterStart.current[side] = event.clientX;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleClusterPointerUp = (side: "left" | "right", event: React.PointerEvent<HTMLButtonElement>) => {
    const start = clusterStart.current[side];
    clusterStart.current[side] = null;
    if (start === null) return;
    const delta = event.clientX - start;
    if ((side === "left" && delta >= 24) || (side === "right" && delta <= -24)) moveCluster(side);
  };

  const handleClusterKeyDown = (side: "left" | "right", event: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((side === "left" && event.key === "ArrowRight") || (side === "right" && event.key === "ArrowLeft")) {
      event.preventDefault();
      moveCluster(side);
    }
  };

  const finishTrace = () => {
    tracing.current = false;
    if (evaluateVTrace(traceRef.current)) onArm();
    else window.setTimeout(() => {
      traceRef.current = [];
      setTrace([]);
    }, 240);
  };

  const pathPoints = useMemo(() => trace.map((point) => `${point.x},${point.y}`).join(" "), [trace]);

  return (
    <section
      className={`${styles.stage} ${styles.stage100}`}
      data-stage
      data-testid="prototype-stage-100"
      aria-label={words.chapter100}
      tabIndex={0}
      onKeyDown={(event) => {
        if (!ready || event.key.toLowerCase() !== "v" || event.repeat || vHoldTimer.current !== null) return;
        vHoldTimer.current = window.setTimeout(() => {
          onArm();
          vHoldTimer.current = null;
        }, 700);
      }}
      onKeyUp={(event) => {
        if (event.key.toLowerCase() === "v" && vHoldTimer.current !== null) {
          window.clearTimeout(vHoldTimer.current);
          vHoldTimer.current = null;
        }
      }}
    >
      <div className={styles.twilightWash} aria-hidden="true" />
      <header className={`${styles.sceneHeader} ${styles.sceneHeaderTwilight}`}>
        <span className={styles.brandMark}>◷</span>
        <b>{words.brand}</b>
        <small>{words.chapter100}</small>
      </header>
      <button
        type="button"
        className={`${styles.starCluster} ${styles.starClusterLeft} ${leftMoved || solved ? styles.starClusterMoved : ""}`}
        aria-label={locale === "zh" ? "左侧星群" : "Left star cluster"}
        onPointerDown={(event) => handleClusterPointerDown("left", event)}
        onPointerUp={(event) => handleClusterPointerUp("left", event)}
        onKeyDown={(event) => handleClusterKeyDown("left", event)}
      >
        <span /><span /><span />
      </button>
      <button
        type="button"
        className={`${styles.starCluster} ${styles.starClusterRight} ${rightMoved || solved ? styles.starClusterMoved : ""}`}
        aria-label={locale === "zh" ? "右侧星群" : "Right star cluster"}
        onPointerDown={(event) => handleClusterPointerDown("right", event)}
        onPointerUp={(event) => handleClusterPointerUp("right", event)}
        onKeyDown={(event) => handleClusterKeyDown("right", event)}
      >
        <span /><span /><span />
      </button>
      {ready ? (
        <svg
          className={styles.constellationTrace}
          viewBox="0 0 100 100"
          role="application"
          aria-label={locale === "zh" ? "在星群之间连续描出形状" : "Draw one continuous shape between the stars"}
          tabIndex={0}
          onPointerDown={(event) => {
            tracing.current = true;
            const rect = event.currentTarget.getBoundingClientRect();
            const firstPoint = pointFromPointer(event.clientX, event.clientY, rect);
            traceRef.current = [firstPoint];
            setTrace([firstPoint]);
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!tracing.current) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const nextTrace = [...traceRef.current, pointFromPointer(event.clientX, event.clientY, rect)];
            traceRef.current = nextTrace;
            setTrace(nextTrace);
          }}
          onPointerUp={finishTrace}
        >
          <path className={styles.vGhost} d="M 12 16 L 50 82 L 88 16" />
          <polyline className={styles.vInk} points={pathPoints} />
        </svg>
      ) : null}
      <div className={styles.scene100Body}>
        <TimerReadout timer={timer} />
        <ArmedNote locale={locale} phase={phase} />
        <MainAction locale={locale} phase={phase} onClick={onMainAction} />
        <SceneResult locale={locale} phase={phase} assistedResult={assistedResult} name={words.solvedName100} />
        <button className={styles.cameraOption} type="button" onClick={() => setCameraOpen((open) => !open)}>
          {cameraOpen ? <RotateCcw aria-hidden="true" size={15} /> : <Camera aria-hidden="true" size={15} />}
          {cameraOpen ? words.closeCamera : words.camera}
        </button>
      </div>
      {cameraOpen ? (
        <div className={styles.cameraPrototype}>
          <CameraGestureUnlock
            gesture="victory"
            onComplete={() => {
              onArm();
              setCameraOpen(false);
            }}
            onFallback={() => setCameraOpen(false)}
          />
        </div>
      ) : null}
    </section>
  );
}

export function RepresentativeScene({ level, ...props }: RepresentativeSceneProps) {
  if (level === "003") return <Level003 key={`${level}-${props.resetKey}`} {...props} />;
  if (level === "100") return <Level100 key={`${level}-${props.resetKey}`} {...props} />;
  return <Level001 key={`${level}-${props.resetKey}`} {...props} />;
}
