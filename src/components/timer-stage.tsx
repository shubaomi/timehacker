"use client";

import { motion } from "motion/react";
import { useRef } from "react";
import { useLocale } from "@/i18n/locale-provider";

interface TimerStageProps {
  elapsedMs: number;
  status: string;
  armed: boolean;
  disabled: boolean;
  onPrimary: () => void;
  onEvent: (type: string, value?: string | number, durationMs?: number) => void;
}

export function formatStopwatch(elapsedMs: number): string {
  return (Math.floor(Math.max(0, elapsedMs) / 10) / 100).toFixed(2);
}

export function TimerStage({
  elapsedMs,
  status,
  armed,
  disabled,
  onPrimary,
  onEvent,
}: TimerStageProps) {
  const { t } = useLocale();
  const running = status === "RUNNING";
  const busy = status === "STARTING" || status === "STOPPING";
  const holdStart = useRef(0);
  const primaryLabel = running
    ? t("stop")
    : busy
      ? t("pleaseWait")
      : status === "SUCCESS" || status === "FAILED"
        ? t("runAgain")
        : t("start");

  return (
    <section className={`play-timer ${armed ? "has-secret" : ""}`}>
      <div
        className="stopwatch-card"
        onWheel={(event) => onEvent("WHEEL", event.deltaY >= 0 ? "down" : "up")}
      >
        <span className="timer-blob timer-blob-one" aria-hidden="true" />
        <span className="timer-blob timer-blob-two" aria-hidden="true" />
        <button
          type="button"
          className="timer-readout"
          aria-label={t("elapsedTimeSimple", { time: formatStopwatch(elapsedMs) })}
          onClick={() => onEvent("TIMER_TAP")}
          onFocus={() => onEvent("FOCUS", "target")}
        >
          <span>{formatStopwatch(elapsedMs)}</span>
          <small>s</small>
        </button>

      </div>

      <motion.button
        type="button"
        className={`play-button ${running ? "is-running" : ""}`}
        disabled={disabled || busy}
        aria-label={`${primaryLabel}. ${t("keyboardShortcutSimple")}`}
        whileTap={{ scale: 0.97, y: 1 }}
        onPointerDown={() => {
          holdStart.current = performance.now();
          onEvent("INPUT_SOURCE", "pointer");
        }}
        onPointerUp={() => onEvent("CONTROL_HOLD", undefined, performance.now() - holdStart.current)}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && holdStart.current === 0) {
            holdStart.current = performance.now();
          }
          onEvent("INPUT_SOURCE", "keyboard");
        }}
        onKeyUp={(event) => {
          if (event.key === " " || event.key === "Enter") {
            onEvent("CONTROL_HOLD", undefined, performance.now() - holdStart.current);
            holdStart.current = 0;
          }
        }}
        onFocus={() => onEvent("FOCUS", "control")}
        onClick={() => {
          if (!running) onEvent("CONTROL_TAP");
          onPrimary();
        }}
      >
        <span>{primaryLabel}</span>
      </motion.button>
    </section>
  );
}
