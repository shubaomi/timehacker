"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  puzzleSolutionEvents,
  serializePuzzleEvent,
  type PuzzleMechanic,
  type PuzzleSceneConfig,
  type PuzzleSceneEvent,
} from "@/game/puzzle-scenes";
import { useLocale } from "@/i18n/locale-provider";
import { CameraGestureUnlock } from "./camera-gesture-unlock";

interface PuzzleSceneProps {
  scene: PuzzleSceneConfig;
  currentStep: number;
  armed: boolean;
  hintLevel: 0 | 1 | 2;
  onEvent: (type: string, value?: string | number, durationMs?: number) => void;
}

const CLICK_MECHANICS = new Set<PuzzleMechanic>([
  "tap", "sequence", "toggle", "sort",
]);
const MOVE_MECHANICS = new Set<PuzzleMechanic>([
  "drag", "align", "rotate", "trace", "orbit", "rub", "balance", "assemble",
]);
const KEYBOARD_KEYS = new Set(["Enter", " ", "ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"]);

function isDirectTarget(event: PuzzleSceneEvent, id: string) {
  return event.target === id;
}

export function PuzzleScene({ scene, currentStep, armed, hintLevel, onEvent }: PuzzleSceneProps) {
  const { locale } = useLocale();
  const solution = useMemo(() => puzzleSolutionEvents(scene), [scene]);
  const expected = solution[currentStep];
  const pointerStart = useRef<{ x: number; y: number; at: number } | null>(null);
  const lastGlobalAt = useRef(0);
  const lastTempoTapAt = useRef(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [touchedObject, setTouchedObject] = useState<string | null>(null);

  const submit = useCallback((event: PuzzleSceneEvent, durationMs?: number) => {
    onEvent("PUZZLE_STEP", serializePuzzleEvent({ ...event, durationMs }), durationMs);
    setTouchedObject(event.target);
  }, [onEvent]);

  const submitExpected = useCallback((mechanic?: PuzzleMechanic, durationMs?: number) => {
    if (!expected || (mechanic && expected.mechanic !== mechanic)) return;
    submit(expected, durationMs);
  }, [expected, submit]);

  useEffect(() => {
    if (!expected || armed) return;
    if (expected.mechanic === "wait") {
      const timer = window.setTimeout(() => submitExpected("wait", 2_400), 2_400);
      return () => window.clearTimeout(timer);
    }
    const oncePerMoment = (mechanic: PuzzleMechanic) => {
      const now = performance.now();
      if (now - lastGlobalAt.current < 400) return;
      lastGlobalAt.current = now;
      submitExpected(mechanic);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") oncePerMoment("visibility");
    };
    const onOrientation = () => oncePerMoment("orientation");
    const onResize = () => oncePerMoment("resize");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("orientationchange", onOrientation);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("orientationchange", onOrientation);
      window.removeEventListener("resize", onResize);
    };
  }, [armed, expected, submitExpected]);

  const interact = (
    id: string,
    mechanism: "click" | "double" | "move" | "hold" | "wheel" | "focus" | "keyboard",
    durationMs?: number,
    eventAt?: number,
  ) => {
    if (!expected || !isDirectTarget(expected, id)) return;
    if (mechanism === "click" && (expected.mechanic === "rhythm" || expected.mechanic === "interval")) {
      const now = eventAt ?? 0;
      const previousTapAt = lastTempoTapAt.current;
      lastTempoTapAt.current = now;
      if (previousTapAt === 0) {
        setTouchedObject(id);
        return;
      }
      const gap = now - previousTapAt;
      const inWindow = expected.mechanic === "rhythm"
        ? gap >= 80 && gap <= 450
        : gap >= 450 && gap <= 1_600;
      if (inWindow) {
        lastTempoTapAt.current = 0;
        submit(expected, gap);
      }
      else setTouchedObject(id);
      return;
    }
    const accepted =
      (mechanism === "click" && (CLICK_MECHANICS.has(expected.mechanic) || hintLevel === 2)) ||
      (mechanism === "double" && expected.mechanic === "double-tap") ||
      (mechanism === "move" && MOVE_MECHANICS.has(expected.mechanic)) ||
      (mechanism === "hold" && expected.mechanic === "hold" && (durationMs ?? 0) >= 650) ||
      (mechanism === "wheel" && expected.mechanic === "wheel") ||
      (mechanism === "focus" && expected.mechanic === "focus") ||
      mechanism === "keyboard";
    if (expected.mechanic === "camera" && mechanism === "click") {
      setCameraOpen(true);
      return;
    }
    if (accepted) submit(expected, durationMs);
    else setTouchedObject(id);
  };

  return (
    <section
      className={`puzzle-scene palette-${scene.palette} zone-${scene.targetZone} ${armed ? "is-armed" : ""}`}
      aria-label={locale === "zh" ? scene.title.zh : scene.title.en}
      data-scene-id={scene.sceneId}
      data-testid="puzzle-scene"
      data-puzzle-mechanic={scene.primaryMechanic}
      data-puzzle-step={currentStep}
    >
      <div className={`scene-composition mechanic-${scene.primaryMechanic}`} aria-hidden="true" />
      {scene.objects.map((object, index) => {
        const interactive = expected?.target === object.id;
        const label = locale === "zh" ? object.label.zh : object.label.en;
        const className = [
          "puzzle-object",
          `object-${index + 1}`,
          `shape-${object.shape}`,
          interactive ? "is-current" : "",
          touchedObject === object.id ? "was-touched" : "",
        ].filter(Boolean).join(" ");
        if (index === 2) {
          return <span className={className} aria-hidden="true" key={object.id}>{object.glyph}</span>;
        }
        return (
          <button
            type="button"
            className={className}
            key={object.id}
            aria-label={label}
            data-puzzle-target={object.id}
            onClick={(event) => interact(object.id, "click", undefined, event.timeStamp)}
            onDoubleClick={() => interact(object.id, "double")}
            onFocus={() => interact(object.id, "focus")}
            onWheel={(event) => {
              event.preventDefault();
              interact(object.id, "wheel");
            }}
            onPointerDown={(event) => {
              pointerStart.current = { x: event.clientX, y: event.clientY, at: performance.now() };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = pointerStart.current;
              if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 42) return;
              interact(object.id, "move", performance.now() - start.at);
              pointerStart.current = null;
            }}
            onPointerUp={() => {
              const start = pointerStart.current;
              if (start) interact(object.id, "hold", performance.now() - start.at);
              pointerStart.current = null;
            }}
            onKeyDown={(event) => {
              if (!KEYBOARD_KEYS.has(event.key)) return;
              event.preventDefault();
              interact(object.id, "keyboard");
            }}
          >
            <span aria-hidden="true">{object.glyph}</span>
          </button>
        );
      })}

      <AnimatePresence>
        {cameraOpen && expected?.mechanic === "camera" && scene.cameraGesture ? (
          <div className="scene-camera-backdrop">
            <motion.div
              className="scene-camera-layer"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <CameraGestureUnlock
                gesture={scene.cameraGesture}
                onComplete={() => submitExpected("camera")}
                onFallback={() => {
                  setCameraOpen(false);
                  submitExpected("camera");
                }}
              />
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {hintLevel > 0 && !armed ? (
        <aside className="scene-hint" role="status">
          {locale === "zh" ? scene.hints.observation.zh : scene.hints.observation.en}
          {hintLevel === 2 ? <span>{locale === "zh" ? scene.hints.logic.zh : scene.hints.logic.en}</span> : null}
        </aside>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {armed ? (locale === "zh" ? scene.feedback.zh : scene.feedback.en) : ""}
      </span>
    </section>
  );
}
