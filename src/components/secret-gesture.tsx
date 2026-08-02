"use client";

import { motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { SecretGesture } from "@/game/cheats";
import { useLocale } from "@/i18n/locale-provider";

interface SecretGestureProps {
  pattern: readonly SecretGesture[];
  progress: number;
  armed: boolean;
  disabled: boolean;
  onEvent: (type: string, value?: string | number, durationMs?: number) => void;
}

const gestureGlyph: Record<SecretGesture, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  tap: "•",
  hold: "◉",
};

export function SecretGesture({ pattern, progress, armed, disabled, onEvent }: SecretGestureProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const pointerStart = useRef({ x: 0, y: 0, at: 0 });
  const current = pattern[Math.min(progress, pattern.length - 1)] ?? "tap";
  const gestureName = t(`gesture${current[0].toUpperCase()}${current.slice(1)}` as
    | "gestureUp"
    | "gestureDown"
    | "gestureLeft"
    | "gestureRight"
    | "gestureTap"
    | "gestureHold");

  const emit = (gesture: SecretGesture, durationMs?: number) => {
    onEvent("SECRET_GESTURE", gesture, durationMs);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStart.current = { x: event.clientX, y: event.clientY, at: performance.now() };
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const durationMs = performance.now() - pointerStart.current.at;
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 28) {
      emit(durationMs >= 650 ? "hold" : "tap", durationMs);
      return;
    }
    emit(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, SecretGesture> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      Enter: "tap",
      " ": "tap",
      h: "hold",
      H: "hold",
    };
    const gesture = keys[event.key];
    if (!gesture) return;
    event.preventDefault();
    emit(gesture, gesture === "hold" ? 700 : undefined);
  };

  return (
    <div className={`secret-discovery ${open ? "is-open" : ""} ${armed ? "is-found" : ""}`}>
      <motion.button
        type="button"
        className="secret-speck"
        aria-label={armed ? t("secretFound") : t("noticeSomething")}
        aria-expanded={open}
        disabled={disabled || armed}
        onClick={() => setOpen(true)}
        animate={armed ? { opacity: 1 } : { opacity: [0.62, 1, 0.62] }}
        transition={{ duration: armed ? 0.3 : 2.4, repeat: armed ? 0 : Infinity, ease: "easeInOut" }}
      >
        <Sparkles aria-hidden="true" size={22} />
      </motion.button>

      {open && !armed ? (
          <motion.div
            className="secret-card"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <button type="button" className="secret-close" onClick={() => setOpen(false)} aria-label={t("closeSecret")}>
              <X aria-hidden="true" size={16} />
            </button>
            <p>{t("secretWhisper")}</p>
            <div
              className="gesture-surface"
              role="group"
              tabIndex={0}
              aria-label={t("gestureArea")}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onKeyDown={onKeyDown}
            >
              <motion.span
                key={`${current}-${progress}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {gestureGlyph[current]}
              </motion.span>
              <small>{t("gestureNudge", { gesture: gestureName })}</small>
            </div>
            <div className="gesture-progress" aria-label={t("secretProgress", { current: progress, total: pattern.length })}>
              {pattern.map((_, index) => <i key={index} className={index < progress ? "done" : ""} />)}
            </div>
            <small className="keyboard-gesture-hint">{t("gestureKeyboardHint")}</small>
          </motion.div>
      ) : null}
    </div>
  );
}
