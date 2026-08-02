"use client";

import { useEffect, useRef, useState } from "react";
import { Gauge, Power, Radio, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { formatDuration } from "@/game/timer";
import type { CheatEffectConfig } from "@/game/effects";
import { useLocale } from "@/i18n/locale-provider";

interface TimerStageProps {
  elapsedMs: number;
  status: string;
  armed: boolean;
  effect: CheatEffectConfig | null;
  disabled: boolean;
  onPrimary: () => void;
  onEvent: (type: string, value?: string | number, durationMs?: number) => void;
}

const CORNERS = ["NW", "NE", "SE", "SW"] as const;
const GLYPHS = [1, 0, 0, 0, 0] as const;

export function TimerStage({
  elapsedMs,
  status,
  armed,
  effect,
  disabled,
  onPrimary,
  onEvent,
}: TimerStageProps) {
  const { t } = useLocale();
  const running = status === "RUNNING";
  const busy = status === "STARTING" || status === "STOPPING";
  const holdStart = useRef(0);
  const [phase, setPhase] = useState<"cool" | "amber" | "dark">("cool");
  useEffect(() => {
    const phases = ["cool", "amber", "dark"] as const;
    let index = 0;
    const interval = window.setInterval(() => {
      index = (index + 1) % phases.length;
      setPhase(phases[index]);
    }, 1_500);
    return () => window.clearInterval(interval);
  }, []);
  const phaseLabel = phase === "amber" ? t("phaseAmber") : phase === "dark" ? t("phaseDark") : t("phaseCool");
  const effectLabel = !effect
    ? t("gameClock", { scale: "1.00" })
    : effect.type === "FULL_DILATION"
      ? t("effectFull", { scale: effect.timeScale.toFixed(2) })
      : effect.type === "FINAL_DILATION"
        ? t("effectFinal", { start: (effect.startsAtMs / 1_000).toFixed(1), scale: effect.timeScale.toFixed(2) })
        : effect.type === "TOLERANCE_ASSIST"
          ? t("effectTolerance", { tolerance: effect.toleranceMs })
          : t("effectBrake", { duration: effect.brakeDurationMs, start: (effect.brakeAtMs / 1_000).toFixed(1) });
  const meterWidth = !effect || effect.type === "TOLERANCE_ASSIST" ? 100 : effect.type === "BRAKE_PULSE" ? 96 : Math.round(effect.timeScale * 100);
  const primaryLabel = running
    ? t("stop")
    : busy
      ? t("syncing")
      : status === "SUCCESS" || status === "FAILED"
        ? t("runAgain").toUpperCase()
        : t("start");

  return (
    <section
      className={`timer-housing ${armed ? "is-armed" : ""}`}
      aria-labelledby="timer-title"
      onWheel={(event) => onEvent("WHEEL", event.deltaY >= 0 ? "down" : "up")}
    >
      <div className="housing-screws" aria-hidden="true">
        {CORNERS.map((corner) => (
          <span
            className={`corner-screw corner-${corner.toLowerCase()}`}
            key={corner}
          />
        ))}
      </div>
      <div className="accessible-corners" aria-label={t("calibrationCorners")}>
        {CORNERS.map((corner) => (
          <button key={corner} type="button" onClick={() => onEvent("CORNER_TAP", corner)}>
            {corner}
          </button>
        ))}
      </div>

      <div className="timer-topline">
        <button type="button" className="status-beacon" onClick={() => {
          onEvent("STATUS_TAP");
          if (phase !== "cool") onEvent("STATUS_PHASE_CAPTURE", phase);
        }}>
          <span className="beacon-dot" aria-hidden="true" />
          {armed ? t("distortionArmed") : running ? t("measuring") : t("chamberReady")} · {phaseLabel}
        </button>
        <span className="serial-mark">TH–10 / UNIT 08</span>
      </div>

      <div className="timer-readout-wrap">
        <div className="calibration-rail" aria-hidden="true">
          {Array.from({ length: 21 }, (_, index) => (
            <i key={index} className={index % 5 === 0 ? "major" : ""} />
          ))}
        </div>
        <button
          id="timer-title"
          type="button"
          className="timer-readout"
          aria-label={t("elapsedTime", { time: formatDuration(elapsedMs) })}
          onClick={() => onEvent("TIMER_TAP")}
          onFocus={() => onEvent("FOCUS", "target")}
        >
          {formatDuration(elapsedMs)}
        </button>
        <div className="target-glyphs" aria-label={t("targetGlyphs")}>
          <span>{t("target")}</span>
          <div>
            {GLYPHS.map((glyph, index) => (
              <button
                type="button"
                key={`${glyph}-${index}`}
                aria-label={t("targetGlyph", { glyph, position: index + 1 })}
                onClick={() => {
                  onEvent("GLYPH_TAP", glyph);
                  onEvent("GLYPH_POSITION", index);
                }}
              >
                {glyph}
              </button>
            ))}
            <b>ms</b>
          </div>
        </div>
      </div>

      <div className="distortion-strip" aria-live="polite">
        <Gauge aria-hidden="true" size={16} />
        <span>{armed ? effectLabel : t("gameClock", { scale: "1.00" })}</span>
        <i aria-hidden="true"><span style={{ width: `${armed ? meterWidth : 100}%` }} /></i>
      </div>

      <div className="instrument-controls">
        <div className="diagnostic-pads" aria-label={t("calibrationControls")}>
          <button type="button" onClick={() => onEvent("CONTROL_TAP")}>
            <RotateCcw aria-hidden="true" size={16} /> {t("relay")}
          </button>
          <button type="button" onClick={() => onEvent("RHYTHM_TAP")}>
            <Radio aria-hidden="true" size={16} /> {t("rhythm")}
          </button>
          <button type="button" onClick={() => onEvent("CALIBRATION_TAP", 1)}>1</button>
          <button type="button" onClick={() => onEvent("CALIBRATION_TAP", 0)}>0</button>
          <button type="button" aria-label={t("pointerSignal")} onClick={() => onEvent("INPUT_SOURCE", "pointer")}>P</button>
          <button type="button" aria-label={t("keyboardSignal")} onClick={() => onEvent("INPUT_SOURCE", "keyboard")}>K</button>
        </div>

        <details className="service-controls">
          <summary>{t("serviceControls")}</summary>
          <div>
            <button type="button" onClick={() => onEvent("SERVICE_SWEEP", "up")}>{t("sweepUp")}</button>
            <button type="button" onClick={() => onEvent("SERVICE_SWEEP", "down")}>{t("sweepDown")}</button>
            <button type="button" onClick={() => onEvent("RITUAL_PULSE", "short")}>{t("shortPulse")}</button>
            <button type="button" onClick={() => onEvent("RITUAL_PULSE", "long")}>{t("longPulse")}</button>
            <button type="button" onClick={() => onEvent("INSPECT", "target")}>{t("inspectTarget")}</button>
            <button type="button" onClick={() => onEvent("INSPECT", "mode")}>{t("inspectMode")}</button>
            <button type="button" onClick={() => onEvent("INSPECT", "control")}>{t("inspectControl")}</button>
            <button type="button" onClick={() => onEvent("ACCESS_LATCH", "echo")}>{t("echoLatch")}</button>
            <button type="button" onClick={() => onEvent("ACCESS_LATCH", "pressure")}>{t("pressureLatch")}</button>
            <button type="button" onClick={() => onEvent("ACCESS_LATCH", "relay")}>{t("relayLatch")}</button>
            <button type="button" onClick={() => onEvent("ACCESS_LATCH", "status-1")}>{t("statusLatchOne")}</button>
            <button type="button" onClick={() => onEvent("ACCESS_LATCH", "status-2")}>{t("statusLatchTwo")}</button>
            <button type="button" onClick={() => onEvent("SERVICE_KEY", "ESCAPE")}>{t("serviceEscape")}</button>
            <button type="button" onClick={() => onEvent("SERVICE_KEY", "ENTER")}>{t("serviceEnter")}</button>
          </div>
        </details>

        <motion.button
          type="button"
          className="primary-actuator"
          disabled={disabled || busy}
          whileTap={{ scale: 0.975 }}
          onPointerDown={() => {
            holdStart.current = performance.now();
            onEvent("INPUT_SOURCE", "pointer");
          }}
          onPointerUp={() =>
            onEvent("CONTROL_HOLD", undefined, performance.now() - holdStart.current)
          }
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
          <Power aria-hidden="true" size={20} />
          <span>{primaryLabel}</span>
          <small>{running ? t("freezeReading") : t("keyboardShortcut")}</small>
        </motion.button>
      </div>
    </section>
  );
}
