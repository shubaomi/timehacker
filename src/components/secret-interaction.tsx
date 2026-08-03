"use client";

import { Check, CircleHelp, X } from "lucide-react";
import { motion } from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  SECRET_FAMILY_ACTIONS,
  type SecretInteractionConfig,
  type SecretInteractionFamily,
} from "@/game/secret-interactions";
import type { MessageKey } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";

interface SecretInteractionProps {
  interaction: SecretInteractionConfig;
  progress: number;
  armed: boolean;
  onEvent: (type: string, value?: string | number, durationMs?: number) => void;
}

const FAMILY_GLYPHS: Record<SecretInteractionFamily, string> = {
  trail: "↗",
  smudge: "◌",
  echo: "◖",
  rhythm: "♪",
  pulse: "◎",
  pressure: "●",
  corners: "⌜",
  constellation: "✦",
  digits: "10",
  switchboard: "⌁",
  orbit: "◉",
  balance: "↔",
};

const FAMILY_LABELS: Record<SecretInteractionFamily, MessageKey> = {
  trail: "familyTrail",
  smudge: "familySmudge",
  echo: "familyEcho",
  rhythm: "familyRhythm",
  pulse: "familyPulse",
  pressure: "familyPressure",
  corners: "familyCorners",
  constellation: "familyConstellation",
  digits: "familyDigits",
  switchboard: "familySwitchboard",
  orbit: "familyOrbit",
  balance: "familyBalance",
};

const ACTION_LABELS: Record<string, MessageKey> = {
  "swipe-up": "actionSwipeUp",
  "swipe-right": "actionSwipeRight",
  "swipe-down": "actionSwipeDown",
  "swipe-left": "actionSwipeLeft",
  "wipe-up": "actionWipeUp",
  "wipe-right": "actionWipeRight",
  "wipe-down": "actionWipeDown",
  "wipe-left": "actionWipeLeft",
  "echo-up": "actionEchoUp",
  "echo-right": "actionEchoRight",
  "echo-down": "actionEchoDown",
  "echo-left": "actionEchoLeft",
  "beat-soft": "actionBeatSoft",
  "beat-strong": "actionBeatStrong",
  "beat-hold": "actionBeatHold",
  "pulse-inner": "actionPulseInner",
  "pulse-middle": "actionPulseMiddle",
  "pulse-outer": "actionPulseOuter",
  "press-tap": "actionPressTap",
  "press-hold": "actionPressHold",
  "press-deep": "actionPressDeep",
  "corner-nw": "actionCornerNw",
  "corner-ne": "actionCornerNe",
  "corner-se": "actionCornerSe",
  "corner-sw": "actionCornerSw",
  "star-1": "actionStarOne",
  "star-2": "actionStarTwo",
  "star-3": "actionStarThree",
  "star-4": "actionStarFour",
  "star-5": "actionStarFive",
  "digit-0": "actionDigitZero",
  "digit-1": "actionDigitOne",
  "digit-5": "actionDigitFive",
  "digit-8": "actionDigitEight",
  "switch-sun": "actionSwitchSun",
  "switch-moon": "actionSwitchMoon",
  "switch-wave": "actionSwitchWave",
  "switch-dot": "actionSwitchDot",
  "orbit-n": "actionOrbitNorth",
  "orbit-e": "actionOrbitEast",
  "orbit-s": "actionOrbitSouth",
  "orbit-w": "actionOrbitWest",
  "balance-left": "actionBalanceLeft",
  "balance-center": "actionBalanceCenter",
  "balance-right": "actionBalanceRight",
};

const ACTION_GLYPHS: Record<string, string> = {
  "beat-soft": "·",
  "beat-strong": "●",
  "beat-hold": "—",
  "pulse-inner": "•",
  "pulse-middle": "◦",
  "pulse-outer": "○",
  "corner-nw": "⌜",
  "corner-ne": "⌝",
  "corner-se": "⌟",
  "corner-sw": "⌞",
  "star-1": "✦",
  "star-2": "✧",
  "star-3": "✦",
  "star-4": "✧",
  "star-5": "✦",
  "digit-0": "0",
  "digit-1": "1",
  "digit-5": "5",
  "digit-8": "8",
  "switch-sun": "☀",
  "switch-moon": "☾",
  "switch-wave": "≈",
  "switch-dot": "•",
  "orbit-n": "N",
  "orbit-e": "E",
  "orbit-s": "S",
  "orbit-w": "W",
  "balance-left": "←",
  "balance-center": "•",
  "balance-right": "→",
};

const GESTURE_FAMILIES = new Set<SecretInteractionFamily>(["trail", "smudge", "echo"]);

function directionFromAction(action: string) {
  return action.slice(action.lastIndexOf("-") + 1);
}

function actionForDirection(family: SecretInteractionFamily, direction: string) {
  const prefix = family === "smudge" ? "wipe" : family === "echo" ? "echo" : "swipe";
  return `${prefix}-${direction}`;
}

export function SecretInteraction({ interaction, progress, armed, onEvent }: SecretInteractionProps) {
  const { t } = useLocale();
  const dragInstructionId = useId();
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [softReset, setSoftReset] = useState(false);
  const [dragPoint, setDragPoint] = useState({ active: false, x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0, at: 0 });
  const choiceDrag = useRef({ active: false, moved: false, startX: 0, startY: 0, startAction: null as string | null });
  const lastDragAction = useRef<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = interaction.steps[Math.min(progress, interaction.steps.length - 1)] ?? interaction.steps[0];
  const actionLabel = t(ACTION_LABELS[current] ?? "actionTryAgain");
  const familyLabel = t(FAMILY_LABELS[interaction.family]);
  const usesDirectTargets = !GESTURE_FAMILIES.has(interaction.family) && interaction.family !== "pressure";
  const guidanceOpacity = Math.max(0.24, 0.72 - (interaction.hintDelayMs - 1_200) / 8_000);
  const choiceMinOpacity = Math.min(0.7, 0.4 + (interaction.hintDelayMs - 1_200) / 10_000);

  useEffect(() => {
    if (!open || armed) return;
    const timer = window.setTimeout(() => setShowHint(true), interaction.hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [armed, interaction.hintDelayMs, open, progress]);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const submit = (action: string, durationMs?: number) => {
    const correct = action === current;
    setShowHint(!correct);
    if (!correct) {
      setSoftReset(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setSoftReset(false), 1_200);
    }
    onEvent("SECRET_ACTION", action, durationMs);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerStart.current = { x: event.clientX, y: event.clientY, at: event.timeStamp };
  };

  const onGesturePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const dx = event.clientX - pointerStart.current.x;
    const dy = event.clientY - pointerStart.current.y;
    if (Math.hypot(dx, dy) < 28) {
      setShowHint(true);
      return;
    }
    const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    submit(actionForDirection(interaction.family, direction));
  };

  const onPressurePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const durationMs = event.timeStamp - pointerStart.current.at;
    const action = durationMs >= 1_250 ? "press-deep" : durationMs >= 650 ? "press-hold" : "press-tap";
    submit(action, durationMs);
  };

  const choiceActionAt = (surface: HTMLDivElement, clientX: number, clientY: number) => {
    for (const target of surface.querySelectorAll<HTMLElement>("[data-secret-action]")) {
      const rect = target.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        return target.dataset.secretAction ?? null;
      }
    }
    return null;
  };

  const onChoicePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const surfaceRect = event.currentTarget.getBoundingClientRect();
    const startTarget = (event.target as HTMLElement).closest<HTMLElement>("[data-secret-action]");
    choiceDrag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      startAction: startTarget?.dataset.secretAction ?? null,
    };
    lastDragAction.current = null;
    setDragPoint({ active: true, x: event.clientX - surfaceRect.left, y: event.clientY - surfaceRect.top });
  };

  const onChoicePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!choiceDrag.current.active) return;
    const surfaceRect = event.currentTarget.getBoundingClientRect();
    const distance = Math.hypot(event.clientX - choiceDrag.current.startX, event.clientY - choiceDrag.current.startY);
    if (distance >= 10) choiceDrag.current.moved = true;
    setDragPoint({ active: true, x: event.clientX - surfaceRect.left, y: event.clientY - surfaceRect.top });
    if (!choiceDrag.current.moved) return;
    const action = choiceActionAt(event.currentTarget, event.clientX, event.clientY);
    if (!action) {
      lastDragAction.current = null;
      return;
    }
    if (action !== lastDragAction.current) {
      lastDragAction.current = action;
      submit(action);
    }
  };

  const finishChoicePointer = () => {
    if (choiceDrag.current.active && !choiceDrag.current.moved && choiceDrag.current.startAction) {
      submit(choiceDrag.current.startAction);
    }
    choiceDrag.current.active = false;
    lastDragAction.current = null;
    setDragPoint((point) => ({ ...point, active: false }));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (GESTURE_FAMILIES.has(interaction.family)) {
      const directions: Record<string, string> = {
        ArrowUp: "up",
        ArrowRight: "right",
        ArrowDown: "down",
        ArrowLeft: "left",
      };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      submit(actionForDirection(interaction.family, direction));
      return;
    }
    if (interaction.family === "pressure") {
      const action = event.key === "Enter" || event.key === " "
        ? "press-tap"
        : event.key.toLowerCase() === "h"
          ? "press-hold"
          : event.key.toLowerCase() === "d"
            ? "press-deep"
            : null;
      if (!action) return;
      event.preventDefault();
      submit(action, action === "press-deep" ? 1_300 : action === "press-hold" ? 700 : undefined);
    }
  };

  if (armed) {
    return (
      <div className={`secret-discovery is-found family-${interaction.family}`}>
        <div className="secret-active-badge" role="status" aria-label={t("secretFound")}>
          <Check aria-hidden="true" size={18} />
          <span>{t("secretActiveShort")}</span>
        </div>
      </div>
    );
  }

  const choiceActions = SECRET_FAMILY_ACTIONS[interaction.family];
  const clueStyle = { "--clue-opacity": guidanceOpacity } as CSSProperties;

  return (
    <div className={`secret-discovery ${open ? "is-open" : ""} family-${interaction.family}`} style={clueStyle}>
      <motion.button
        type="button"
        className="secret-trigger"
        aria-label={t("noticeSomething")}
        aria-expanded={open}
        onClick={() => {
          setShowHint(false);
          setOpen(true);
        }}
        animate={{ opacity: [0.66, 1, 0.66] }}
        transition={{ duration: 2.4 + (interaction.variant % 4) * 0.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span aria-hidden="true">{FAMILY_GLYPHS[interaction.family]}</span>
      </motion.button>

      {open ? (
        <motion.div
          className="secret-card interaction-card"
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
        >
          <button type="button" className="secret-close" onClick={() => setOpen(false)} aria-label={t("closeSecret")}>
            <X aria-hidden="true" size={16} />
          </button>
          <div className="secret-card-heading">
            <span aria-hidden="true">{FAMILY_GLYPHS[interaction.family]}</span>
            <div>
              <b>{familyLabel}</b>
              <p id={usesDirectTargets ? dragInstructionId : undefined}>
                {t(usesDirectTargets ? "dragThroughTargets" : "secretObserve")}
              </p>
            </div>
          </div>

          {GESTURE_FAMILIES.has(interaction.family) ? (
            <div
              className={`secret-playground gesture-playground action-${directionFromAction(current)}`}
              role="group"
              tabIndex={0}
              aria-label={`${familyLabel}. ${t("gestureNudge", { gesture: actionLabel })}`}
              onPointerDown={onPointerDown}
              onPointerUp={onGesturePointerUp}
              onKeyDown={onKeyDown}
            >
              <motion.i className="motion-clue" aria-hidden="true" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.5, repeat: Infinity }} />
              {showHint ? <strong>{actionLabel}</strong> : <small>{t("watchTheMotion")}</small>}
            </div>
          ) : interaction.family === "pressure" ? (
            <div
              className="secret-playground pressure-playground"
              role="group"
              tabIndex={0}
              aria-label={`${familyLabel}. ${t("gestureNudge", { gesture: actionLabel })}`}
              onPointerDown={onPointerDown}
              onPointerUp={onPressurePointerUp}
              onKeyDown={onKeyDown}
            >
              <motion.i className="pressure-pad" aria-hidden="true" whileTap={{ scale: 0.82 }} />
              {showHint ? <strong>{actionLabel}</strong> : <small>{t("feelThePressure")}</small>}
            </div>
          ) : (
            <div
              className={`secret-playground choice-playground choice-${interaction.family} ${dragPoint.active ? "is-dragging" : ""}`}
              role="group"
              aria-label={familyLabel}
              aria-describedby={dragInstructionId}
              onPointerDown={onChoicePointerDown}
              onPointerMove={onChoicePointerMove}
              onPointerUp={finishChoicePointer}
              onPointerCancel={finishChoicePointer}
            >
              {dragPoint.active ? (
                <motion.i
                  className="secret-drag-cursor"
                  aria-hidden="true"
                  style={{ left: dragPoint.x, top: dragPoint.y }}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                />
              ) : null}
              {choiceActions.map((action, index) => (
                <motion.button
                  type="button"
                  key={action}
                  data-secret-action={action}
                  className={action === current ? "is-current" : ""}
                  aria-label={t(ACTION_LABELS[action] ?? "actionTryAgain")}
                  onClick={(event) => {
                    if (event.detail === 0) submit(action);
                  }}
                  animate={action === current ? { opacity: [choiceMinOpacity, 1, choiceMinOpacity] } : { opacity: 0.7 }}
                  transition={{ duration: 1.5 + index * 0.08, repeat: action === current ? Infinity : 0 }}
                >
                  <span aria-hidden="true">{ACTION_GLYPHS[action] ?? action.replace(/^[^-]+-/, "")}</span>
                </motion.button>
              ))}
              {showHint ? <strong className="choice-hint">{t("gestureNudge", { gesture: actionLabel })}</strong> : null}
            </div>
          )}

          <div className="gesture-progress" aria-label={t("secretProgress", { current: progress, total: interaction.steps.length })}>
            {interaction.steps.map((_, index) => <i key={index} className={index < progress ? "done" : ""} />)}
          </div>
          <div className="secret-card-footer">
            <small>{softReset ? t("patternShifted") : t("secretProgress", { current: progress, total: interaction.steps.length })}</small>
            {!showHint ? (
              <button type="button" onClick={() => setShowHint(true)} aria-label={t("showNextHint")}>
                <CircleHelp aria-hidden="true" size={15} /> {t("hint")}
              </button>
            ) : null}
          </div>
          <small className="keyboard-gesture-hint">{t("interactionKeyboardHint")}</small>
        </motion.div>
      ) : null}
    </div>
  );
}
