"use client";

import { useRef } from "react";
import { Gauge, Power, Radio, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { formatDuration } from "@/game/timer";

interface TimerStageProps {
  elapsedMs: number;
  status: string;
  armed: boolean;
  timeScale: number;
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
  timeScale,
  disabled,
  onPrimary,
  onEvent,
}: TimerStageProps) {
  const running = status === "RUNNING";
  const busy = status === "STARTING" || status === "STOPPING";
  const holdStart = useRef(0);
  const primaryLabel = running
    ? "STOP"
    : busy
      ? "SYNCING"
      : status === "SUCCESS" || status === "FAILED"
        ? "RUN AGAIN"
        : "START";

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
      <div className="accessible-corners" aria-label="Calibration corner controls">
        {CORNERS.map((corner) => (
          <button key={corner} type="button" onClick={() => onEvent("CORNER_TAP", corner)}>
            {corner}
          </button>
        ))}
      </div>

      <div className="timer-topline">
        <button type="button" className="status-beacon" onClick={() => onEvent("STATUS_TAP")}>
          <span className="beacon-dot" aria-hidden="true" />
          {armed ? "DISTORTION ARMED" : running ? "MEASURING" : "CHAMBER READY"}
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
          aria-label={`Elapsed game time ${formatDuration(elapsedMs)}. Tap to test the timer glass.`}
          onClick={() => onEvent("TIMER_TAP")}
          onFocus={() => onEvent("FOCUS", "target")}
        >
          {formatDuration(elapsedMs)}
        </button>
        <div className="target-glyphs" aria-label="Target time service glyphs">
          <span>TARGET</span>
          <div>
            {GLYPHS.map((glyph, index) => (
              <button
                type="button"
                key={`${glyph}-${index}`}
                aria-label={`Target glyph ${glyph}, position ${index + 1}`}
                onClick={() => onEvent("GLYPH_TAP", glyph)}
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
        <span>{armed ? `GAME CLOCK × ${timeScale.toFixed(2)}` : "GAME CLOCK × 1.00"}</span>
        <i aria-hidden="true"><span style={{ width: `${Math.round(timeScale * 100)}%` }} /></i>
      </div>

      <div className="instrument-controls">
        <div className="diagnostic-pads" aria-label="Calibration controls">
          <button type="button" onClick={() => onEvent("CONTROL_TAP")}>
            <RotateCcw aria-hidden="true" size={16} /> Relay
          </button>
          <button type="button" onClick={() => onEvent("RHYTHM_TAP")}>
            <Radio aria-hidden="true" size={16} /> Rhythm
          </button>
          <button type="button" onClick={() => onEvent("CALIBRATION_TAP", 1)}>1</button>
          <button type="button" onClick={() => onEvent("CALIBRATION_TAP", 0)}>0</button>
          <button type="button" aria-label="Pointer mirror signal" onClick={() => onEvent("INPUT_SOURCE", "pointer")}>P</button>
          <button type="button" aria-label="Keyboard mirror signal" onClick={() => onEvent("INPUT_SOURCE", "keyboard")}>K</button>
        </div>

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
          onClick={onPrimary}
        >
          <Power aria-hidden="true" size={20} />
          <span>{primaryLabel}</span>
          <small>{running ? "FREEZE READING" : "SPACE / ENTER"}</small>
        </motion.button>
      </div>
    </section>
  );
}
