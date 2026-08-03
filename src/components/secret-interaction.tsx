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
  type SecretDiscoveryAction,
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

const DISCOVERY_ACTION_LABELS: Record<SecretDiscoveryAction, MessageKey> = {
  tap: "discoveryTap",
  "double-tap": "discoveryDoubleTap",
  hold: "discoveryHold",
  "swipe-up": "discoverySwipeUp",
  "swipe-right": "discoverySwipeRight",
  "swipe-down": "discoverySwipeDown",
  "swipe-left": "discoverySwipeLeft",
  "orbit-clockwise": "discoveryOrbitClockwise",
  "orbit-counterclockwise": "discoveryOrbitCounterclockwise",
  "rub-horizontal": "discoveryRubHorizontal",
  "rub-vertical": "discoveryRubVertical",
  zigzag: "discoveryZigzag",
};

const DISCOVERY_GLYPHS = {
  glint: "✦",
  smudge: "◌",
  bubble: "○",
  seam: "—",
  speck: "·",
  ripple: "◎",
  crack: "⌁",
  knot: "⌘",
  dust: "⁙",
  halo: "◉",
} as const;

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

interface DiscoveryPoint {
  x: number;
  y: number;
  at: number;
}

function travel(points: readonly DiscoveryPoint[]) {
  return points.slice(1).reduce(
    (total, point, index) => total + Math.hypot(point.x - points[index].x, point.y - points[index].y),
    0,
  );
}

function directionChanges(points: readonly DiscoveryPoint[], axis: "x" | "y") {
  let previous = 0;
  let changes = 0;
  for (let index = 1; index < points.length; index += 1) {
    const delta = points[index][axis] - points[index - 1][axis];
    if (Math.abs(delta) < 8) continue;
    const direction = Math.sign(delta);
    if (previous !== 0 && direction !== previous) changes += 1;
    previous = direction;
  }
  return changes;
}

function orbitAction(
  points: readonly DiscoveryPoint[],
  centerX: number,
  centerY: number,
): SecretDiscoveryAction | null {
  if (points.length < 6 || travel(points) < 90) return null;
  let rotation = 0;
  let previous = Math.atan2(points[0].y - centerY, points[0].x - centerX);
  for (const point of points.slice(1)) {
    const angle = Math.atan2(point.y - centerY, point.x - centerX);
    let delta = angle - previous;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    rotation += delta;
    previous = angle;
  }
  if (rotation > Math.PI * 1.05) return "orbit-clockwise";
  if (rotation < -Math.PI * 1.05) return "orbit-counterclockwise";
  return null;
}

function pathAction(
  points: readonly DiscoveryPoint[],
  centerX: number,
  centerY: number,
): SecretDiscoveryAction | null {
  const orbit = orbitAction(points, centerX, centerY);
  if (orbit) return orbit;
  const first = points[0];
  const last = points.at(-1)!;
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const distance = Math.hypot(dx, dy);
  const xChanges = directionChanges(points, "x");
  const yChanges = directionChanges(points, "y");
  const totalTravel = travel(points);
  if (totalTravel > 110 && xChanges >= 2 && yChanges >= 1) return "zigzag";
  if (totalTravel > 100 && xChanges >= 2 && Math.abs(dx) > Math.abs(dy)) return "rub-horizontal";
  if (totalTravel > 100 && yChanges >= 2 && Math.abs(dy) > Math.abs(dx)) return "rub-vertical";
  if (distance < 42) return null;
  if (Math.abs(dx) > Math.abs(dy) * 1.15) return dx > 0 ? "swipe-right" : "swipe-left";
  if (Math.abs(dy) > Math.abs(dx) * 1.15) return dy > 0 ? "swipe-down" : "swipe-up";
  return null;
}

export function SecretInteraction({ interaction, progress, armed, onEvent }: SecretInteractionProps) {
  const { t } = useLocale();
  const dragInstructionId = useId();
  const [discovered, setDiscovered] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState(0);
  const [showDiscoveryHint, setShowDiscoveryHint] = useState(false);
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [softReset, setSoftReset] = useState(false);
  const [dragPoint, setDragPoint] = useState({ active: false, x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0, at: 0 });
  const choiceDrag = useRef({ active: false, moved: false, startX: 0, startY: 0, startAction: null as string | null });
  const lastDragAction = useRef<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discoveryPointer = useRef<DiscoveryPoint[]>([]);
  const discoveryTap = useRef({ count: 0, at: 0 });
  const discovery = interaction.discovery;
  const currentDiscoveryAction = discovery.steps[Math.min(discoveryProgress, discovery.steps.length - 1)];
  const current = interaction.steps[Math.min(progress, interaction.steps.length - 1)] ?? interaction.steps[0];
  const actionLabel = t(ACTION_LABELS[current] ?? "actionTryAgain");
  const familyLabel = t(FAMILY_LABELS[interaction.family]);
  const usesDirectTargets = !GESTURE_FAMILIES.has(interaction.family) && interaction.family !== "pressure";
  const guidanceOpacity = Math.max(0.24, 0.72 - (interaction.hintDelayMs - 1_200) / 8_000);
  const choiceMinOpacity = Math.min(0.7, 0.4 + (interaction.hintDelayMs - 1_200) / 10_000);

  useEffect(() => {
    if (discovered || armed) return;
    const timer = window.setTimeout(() => setShowDiscoveryHint(true), discovery.hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [armed, discovered, discovery.hintDelayMs, discoveryProgress]);

  useEffect(() => {
    if (!open || armed) return;
    const timer = window.setTimeout(() => setShowHint(true), interaction.hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [armed, interaction.hintDelayMs, open, progress]);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const submitDiscovery = (action: SecretDiscoveryAction) => {
    if (action !== currentDiscoveryAction) {
      setShowDiscoveryHint(true);
      return;
    }
    const next = discoveryProgress + 1;
    setDiscoveryProgress(next);
    setShowDiscoveryHint(false);
    if (next >= discovery.steps.length) {
      setDiscovered(true);
      setOpen(true);
    }
  };

  const onDiscoveryPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    discoveryPointer.current = [{ x: event.clientX, y: event.clientY, at: event.timeStamp }];
  };

  const onDiscoveryPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (discoveryPointer.current.length === 0) return;
    const previous = discoveryPointer.current.at(-1)!;
    if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 5) return;
    discoveryPointer.current.push({ x: event.clientX, y: event.clientY, at: event.timeStamp });
  };

  const onDiscoveryPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const points = [
      ...discoveryPointer.current,
      { x: event.clientX, y: event.clientY, at: event.timeStamp },
    ];
    discoveryPointer.current = [];
    const first = points[0];
    const duration = event.timeStamp - first.at;
    const distance = Math.hypot(event.clientX - first.x, event.clientY - first.y);
    const rect = event.currentTarget.getBoundingClientRect();
    const traced = pathAction(points, rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (traced) {
      submitDiscovery(traced);
      return;
    }
    if (duration >= 650 && distance < 24) {
      submitDiscovery("hold");
      return;
    }
    if (distance >= 24) {
      setShowDiscoveryHint(true);
      return;
    }
    if (currentDiscoveryAction === "double-tap") {
      const recent = event.timeStamp - discoveryTap.current.at <= 360;
      discoveryTap.current = { count: recent ? discoveryTap.current.count + 1 : 1, at: event.timeStamp };
      if (discoveryTap.current.count >= 2) {
        discoveryTap.current = { count: 0, at: 0 };
        submitDiscovery("double-tap");
      }
      return;
    }
    discoveryTap.current = { count: 0, at: 0 };
    submitDiscovery("tap");
  };

  const onDiscoveryKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keyboardActions: Record<string, SecretDiscoveryAction> = {
      Enter: "tap",
      " ": "tap",
      d: "double-tap",
      h: "hold",
      ArrowUp: "swipe-up",
      ArrowRight: "swipe-right",
      ArrowDown: "swipe-down",
      ArrowLeft: "swipe-left",
      c: "orbit-clockwise",
      a: "orbit-counterclockwise",
      x: "rub-horizontal",
      y: "rub-vertical",
      z: "zigzag",
    };
    const action = keyboardActions[event.key.length === 1 ? event.key.toLowerCase() : event.key];
    if (!action) return;
    event.preventDefault();
    submitDiscovery(action);
  };

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
      <div className={`secret-discovery is-found family-${interaction.family} slot-${discovery.slot}`}>
        <div className="secret-active-badge" role="status" aria-label={t("secretFound")}>
          <Check aria-hidden="true" size={18} />
          <span>{t("secretActiveShort")}</span>
        </div>
      </div>
    );
  }

  if (!discovered) {
    const discoveryLabel = t(DISCOVERY_ACTION_LABELS[currentDiscoveryAction]);
    return (
      <div
        className={`secret-discovery is-searching family-${interaction.family} slot-${discovery.slot} visual-${discovery.visual}`}
      >
        <motion.div
          role="button"
          tabIndex={0}
          className={`discovery-anomaly discovery-action-${currentDiscoveryAction}`}
          aria-label={t("discoveryAccessibleHint", { action: discoveryLabel })}
          onPointerDown={onDiscoveryPointerDown}
          onPointerMove={onDiscoveryPointerMove}
          onPointerUp={onDiscoveryPointerUp}
          onPointerCancel={() => { discoveryPointer.current = []; }}
          onKeyDown={onDiscoveryKeyDown}
          animate={{ opacity: [0.58, 0.94, 0.58] }}
          transition={{ duration: 2.1 + (discovery.variant % 5) * 0.16, repeat: Infinity, ease: "easeInOut" }}
        >
          <span aria-hidden="true">{DISCOVERY_GLYPHS[discovery.visual]}</span>
          {showDiscoveryHint ? (
            <motion.small role="status" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
              {t("discoveryNudge", { action: discoveryLabel })}
            </motion.small>
          ) : null}
          <i aria-hidden="true" className="discovery-step">{discoveryProgress + 1}/{discovery.steps.length}</i>
        </motion.div>
      </div>
    );
  }

  const choiceActions = SECRET_FAMILY_ACTIONS[interaction.family];
  const clueStyle = { "--clue-opacity": guidanceOpacity } as CSSProperties;

  return (
    <div className={`secret-discovery is-discovered ${open ? "is-open" : ""} family-${interaction.family} slot-${discovery.slot}`} style={clueStyle}>
      {!open ? (
        <motion.button
          type="button"
          className="secret-unlock-trigger"
          aria-label={t("reopenSecret")}
          aria-expanded={false}
          onClick={() => {
            setShowHint(false);
            setOpen(true);
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <span aria-hidden="true">{FAMILY_GLYPHS[interaction.family]}</span>
        </motion.button>
      ) : null}

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
