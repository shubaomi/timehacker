"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { pointFromPointer, type TracePoint } from "@/game/v2-prototype";
import { V2_LEVEL_BY_SLUG, type V2ControllerKind, type V2LevelDefinition } from "@/game/v2-levels.generated";
import type { Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";
import styles from "./v2-puzzle-scene.module.css";

interface V2PuzzleSceneProps {
  slug: string;
  armed: boolean;
  hintLevel: 0 | 1 | 2 | 3;
  spatialPilot?: boolean;
  resetEpoch?: number;
  ghostAnchor?: "left" | "right" | null;
  onGhostAnchorChange?: (anchor: "left" | "right" | null) => void;
  menuOpen?: boolean;
  eclipseOffset?: number;
  onDiscover: () => void;
  onArm: () => void;
}

interface ControllerProps {
  level: V2LevelDefinition;
  locale: Locale;
  solved: boolean;
  resetEpoch: number;
  ghostAnchor: "left" | "right" | null;
  onGhostAnchorChange: (anchor: "left" | "right" | null) => void;
  menuOpen: boolean;
  eclipseOffset: number;
  spatialPilot: boolean;
  onDiscover: () => void;
  onArm: () => void;
}

const controllerHints: Record<V2ControllerKind, { zh: [string, string]; en: [string, string] }> = {
  "corner-repair": { zh: ["看看纸面的边缘。", "外面的纸角和缺口原本属于彼此。"], en: ["Look at the edge of the sheet.", "The loose corner and the gap belong together."] },
  "patient-hold": { zh: ["先观察它怎样回应你的动作。", "有时不动，再稳稳按住，才是答案。"], en: ["Notice how it responds to your actions.", "Sometimes waiting, then holding steady, is the answer."] },
  "word-shift": { zh: ["读一读这些活字。", "让 FAST 变成表示缓慢的词。"], en: ["Read the moving type.", "Turn FAST into a word that means slow."] },
  "shadow-sort": { zh: ["物体和影子说了不同的话。", "相信影子留下的关系。"], en: ["The objects and shadows disagree.", "Trust the relation preserved by the shadows."] },
  "light-drag": { zh: ["物体也许没有歪。", "移动光，而不是逐个修理影子。"], en: ["The objects may not be wrong.", "Move the light instead of fixing each shadow."] },
  trace: { zh: ["断口之间藏着一条连续路线。", "保持一笔，让路线满足画面中的拓扑。"], en: ["The breaks imply one continuous route.", "Keep one stroke and satisfy the visible topology."] },
  "frame-drag": { zh: ["框外仍有画面。", "移动观看它的框，而不是框里的影子。"], en: ["The picture continues beyond its frame.", "Move the frame, not the shadow inside it."] },
  "layer-stack": { zh: ["纸边和材质透露了上下关系。", "按画面依据重新叠合这些层。"], en: ["Edges and materials reveal depth.", "Restack the layers according to that evidence."] },
  fold: { zh: ["纸背也属于这一关。", "沿折痕改变正反或内外关系。"], en: ["The back of the paper is part of the level.", "Use the crease to change front, back, inside, or outside."] },
  "coupled-drag": { zh: ["移动一个，另一个也会回应。", "寻找它们共同依赖的中心。"], en: ["Move one and another responds.", "Find the center they both depend on."] },
  "wave-align": { zh: ["不要只看波峰。", "让两条规律在共同的位置相遇。"], en: ["Do not only watch the peaks.", "Make both patterns meet at their shared point."] },
  flip: { zh: ["只有一片违背整体规律。", "翻动异常的纸片，恢复接缝。"], en: ["One piece breaks the larger rule.", "Flip the odd piece to restore the seam."] },
  orbit: { zh: ["目标和轨道不一定谁该移动。", "改变外层关系，让缺口自己归位。"], en: ["The target may not be the thing to move.", "Change the outer relation so the gap returns."] },
  resize: { zh: ["边界也可以被改变。", "调节框的大小，让被裁掉的关系完整出现。"], en: ["A boundary can change too.", "Resize the frame until the clipped relation becomes whole."] },
  "focus-route": { zh: ["注意力经过哪里，路线才出现。", "沿光晕移动，不要按下中心。"], en: ["The route appears where attention travels.", "Follow the halos without pressing their centers."] },
  rhythm: { zh: ["距离和空白也在计时。", "按画面中的宽松节拍回应。"], en: ["Distance and silence are keeping time.", "Answer with the broad rhythm shown by the scene."] },
  "wheel-echo": { zh: ["输入离开后，还有东西回来。", "利用反向回声，而不是实体波纹。"], en: ["Something returns after your input leaves.", "Use the reverse echo, not the solid wave."] },
  "cover-return": { zh: ["不可见不等于停止。", "让页面经历一次盖住与返回。"], en: ["Hidden does not mean stopped.", "Let the page be covered and return."] },
  rotate: { zh: ["控制关系不在每个小物件上。", "转动共同的轴或承载它们的纸。"], en: ["The control is not on every small piece.", "Rotate the shared axis or the sheet carrying them."] },
  "edge-route": { zh: ["页面两边也许是相连的。", "让断线穿过边缘或深度后继续。"], en: ["Opposite page edges may connect.", "Continue the broken line through an edge or depth layer."] },
  "shared-control": { zh: ["多个物件共享一个原因。", "不要逐个修理，寻找共同控制物。"], en: ["Several objects share one cause.", "Do not fix them one by one; find their shared control."] },
  constellation: { zh: ["别只看星星，也看看空白。", "收拢星群后，用一条宽松的 V 表达负空间。"], en: ["Look between the stars, not only at them.", "Gather the clusters, then express the empty V in one broad stroke."] },
};

function useFeedback() {
  const [feedback, setFeedback] = useState<"idle" | "trying" | "close">("idle");
  const pulse = useCallback((next: "trying" | "close" = "trying") => {
    setFeedback(next);
    window.setTimeout(() => setFeedback("idle"), 260);
  }, []);
  return [feedback, pulse] as const;
}

function DragRelation({ level, locale, solved, onDiscover, onArm, kind }: ControllerProps & { kind: V2ControllerKind }) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const start = useRef<number | null>(null);
  const [feedback, pulse] = useFeedback();
  const target = 72 - (level.id % 4) * 4;
  const move = (next: number) => {
    const bounded = Math.max(0, Math.min(100, next));
    offsetRef.current = bounded;
    setOffset(bounded);
    if (bounded > 8) onDiscover();
  };
  const finish = () => {
    if (offsetRef.current >= target) {
      pulse("close");
      onArm();
    } else {
      pulse();
      move(offsetRef.current - 12);
    }
  };
  return (
    <div className={`${styles.relationBoard} ${styles[`kind_${kind}`]} ${styles[`feedback_${feedback}`]}`} data-controller={kind}>
      <span className={styles.relationGuide} aria-hidden="true" />
      <span className={styles.relationTarget} aria-hidden="true" />
      <button
        type="button"
        className={styles.relationPiece}
        aria-label={locale === "zh" ? "可移动的场景纸片" : "Interactive scene piece"}
        style={{ "--progress": `${solved ? target : offset}%` } as React.CSSProperties}
        onPointerDown={(event) => {
          start.current = event.clientX;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (start.current === null) return;
          move(offsetRef.current + (event.clientX - start.current) / 3);
          start.current = event.clientX;
        }}
        onPointerUp={() => { start.current = null; finish(); }}
        onKeyDown={(event) => {
          if (!event.key.startsWith("Arrow")) return;
          event.preventDefault();
          const next = offsetRef.current + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 12 : -12);
          move(next);
          if (next >= target) onArm();
        }}
      ><span aria-hidden="true" /></button>
      <i className={styles.relationEcho} aria-hidden="true" />
    </div>
  );
}

function SharedZeroWave({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [position, setPosition] = useState(15);
  const positionRef = useRef(15);
  const dragStart = useRef<{ x: number; position: number } | null>(null);
  const armedRef = useRef(false);

  const alignment = solved || (position >= 68 && position <= 82)
    ? "zero"
    : position >= 40 && position <= 50
      ? "peak"
      : "misaligned";

  const move = (next: number, discover = true) => {
    const bounded = Math.max(0, Math.min(100, next));
    positionRef.current = bounded;
    setPosition(bounded);
    if (discover) onDiscover();
  };

  const finish = () => {
    dragStart.current = null;
    if (positionRef.current < 68 || positionRef.current > 82 || armedRef.current) return;
    armedRef.current = true;
    positionRef.current = 75;
    setPosition(75);
    onArm();
  };

  const shift = (position - 45) * 1.25;

  return (
    <div
      className={`${styles.sharedZeroScene} ${alignment === "peak" ? styles.sharedZeroPeak : ""} ${alignment === "zero" ? styles.sharedZeroAligned : ""}`}
      data-alignment={alignment}
      data-controller="wave-align"
      data-spatial-model="shared-zero-cutouts"
      data-testid="v2-scene-013"
      style={{ "--wave-shift": `${shift}px` } as React.CSSProperties}
    >
      <div className={`${styles.waveStrip} ${styles.waveLower}`} data-stationary="true" data-testid="lower-wave-013" aria-hidden="true">
        <svg viewBox="0 0 320 84"><path d="M0 42 C28 4 52 4 80 42 S132 80 160 42 S212 4 240 42 S292 80 320 42" /></svg>
        <i className={styles.zeroCut} />
      </div>
      <button
        type="button"
        className={`${styles.waveStrip} ${styles.waveUpper}`}
        aria-label={locale === "zh" ? "上层波形纸带" : "Upper waveform strip"}
        onPointerDown={(event) => {
          dragStart.current = { x: event.clientX, position: positionRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragStart.current) return;
          const delta = event.clientX - dragStart.current.x;
          move(dragStart.current.position + delta / 2, Math.abs(delta) > 10);
        }}
        onPointerUp={finish}
        onPointerCancel={() => { dragStart.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          move(positionRef.current + (event.key === "ArrowRight" ? 15 : -15));
          finish();
        }}
      >
        <svg viewBox="0 0 320 84" aria-hidden="true"><path d="M0 42 C28 4 52 4 80 42 S132 80 160 42 S212 4 240 42 S292 80 320 42" /></svg>
        <i className={styles.zeroCut} aria-hidden="true" />
      </button>
      <span className={styles.zeroSeal} aria-hidden="true" />
    </div>
  );
}

function WaveAlign(props: ControllerProps) {
  return props.level.id === 13
    ? <SharedZeroWave {...props} />
    : props.level.id === 99
      ? <RelayPolyrhythm {...props} />
      : <DragRelation {...props} kind="wave-align" />;
}

function CornerCross({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [offsets, setOffsets] = useState({ x: -90, y: 90 });
  const offsetsRef = useRef({ x: -90, y: 90 });
  const dragStart = useRef<{ axis: "horizontal" | "vertical"; x: number; y: number; offsets: { x: number; y: number } } | null>(null);
  const armedRef = useRef(false);

  const setNextOffsets = (next: { x: number; y: number }) => {
    const bounded = {
      x: Math.max(-110, Math.min(110, next.x)),
      y: Math.max(-110, Math.min(110, next.y)),
    };
    offsetsRef.current = bounded;
    setOffsets(bounded);
  };

  const finish = () => {
    dragStart.current = null;
    if (Math.abs(offsetsRef.current.x) > 36 || Math.abs(offsetsRef.current.y) > 36 || armedRef.current) return;
    armedRef.current = true;
    offsetsRef.current = { x: 0, y: 0 };
    setOffsets({ x: 0, y: 0 });
    onArm();
  };

  const nudgeHorizontal = (delta: number) => {
    onDiscover();
    setNextOffsets({ x: offsetsRef.current.x + delta, y: offsetsRef.current.y - delta * .35 });
    finish();
  };

  const nudgeVertical = (delta: number) => {
    onDiscover();
    setNextOffsets({ x: offsetsRef.current.x - delta * .35, y: offsetsRef.current.y + delta });
    finish();
  };

  const xAligned = solved || Math.abs(offsets.x) <= 36;
  const yAligned = solved || Math.abs(offsets.y) <= 36;
  const halfCross = xAligned && yAligned ? "complete" : xAligned ? "horizontal" : yAligned ? "vertical" : "none";

  const beginDrag = (axis: "horizontal" | "vertical", event: React.PointerEvent<HTMLButtonElement>) => {
    dragStart.current = { axis, x: event.clientX, y: event.clientY, offsets: offsetsRef.current };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const deltaX = event.clientX - dragStart.current.x;
    const deltaY = event.clientY - dragStart.current.y;
    if (Math.hypot(deltaX, deltaY) > 10) onDiscover();
    if (dragStart.current.axis === "horizontal") {
      setNextOffsets({
        x: dragStart.current.offsets.x + deltaX,
        y: dragStart.current.offsets.y - deltaX * .35,
      });
    } else {
      setNextOffsets({
        x: dragStart.current.offsets.x - deltaY * .35,
        y: dragStart.current.offsets.y + deltaY,
      });
    }
  };

  return (
    <div
      className={`${styles.cornerCrossScene} ${styles[`cornerCross_${halfCross}`]}`}
      data-controller="coupled-drag"
      data-spatial-model="coupled-dual-axis"
      data-half-cross={halfCross}
      data-horizontal-offset={Math.round(offsets.x)}
      data-vertical-offset={Math.round(offsets.y)}
      data-testid="v2-scene-014"
      style={{ "--cross-x": `${offsets.x * .22}px`, "--cross-y": `${offsets.y * .22}px` } as React.CSSProperties}
    >
      <span className={styles.crossCrease} aria-hidden="true" />
      <button
        type="button"
        className={`${styles.crossRibbon} ${styles.crossHorizontal}`}
        aria-label={locale === "zh" ? "横向断裂丝带" : "Broken horizontal ribbon"}
        onPointerDown={(event) => beginDrag("horizontal", event)}
        onPointerMove={moveDrag}
        onPointerUp={finish}
        onPointerCancel={() => { dragStart.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          nudgeHorizontal(event.key === "ArrowRight" ? 45 : -45);
        }}
      ><span aria-hidden="true" /></button>
      <button
        type="button"
        className={`${styles.crossRibbon} ${styles.crossVertical}`}
        aria-label={locale === "zh" ? "纵向断裂丝带" : "Broken vertical ribbon"}
        onPointerDown={(event) => beginDrag("vertical", event)}
        onPointerMove={moveDrag}
        onPointerUp={finish}
        onPointerCancel={() => { dragStart.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          nudgeVertical(event.key === "ArrowDown" ? 45 : -45);
        }}
      ><span aria-hidden="true" /></button>
      <i className={styles.crossSeal} aria-hidden="true" />
    </div>
  );
}

type HybridRouteState = "idle" | "wrapping" | "rebounded" | "complete";

function HybridConsole({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [axisHeld, setAxisHeld] = useState(false);
  const [axisLatched, setAxisLatched] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [routeState, setRouteState] = useState<HybridRouteState>(solved ? "complete" : "idle");
  const [rebounds, setRebounds] = useState(0);
  const [inputMode, setInputMode] = useState<"none" | "pointer-dual" | "space-pointer" | "pointer-keyboard" | "assist-lock">("none");
  const [ribbonPosition, setRibbonPosition] = useState({ x: 80, y: 50 });
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const axisActiveRef = useRef(false);
  const axisPressModeRef = useRef<"pointer" | "space" | null>(null);
  const axisPointerRef = useRef<number | null>(null);
  const routeProgressRef = useRef(0);
  const ribbonPointerRef = useRef<number | null>(null);
  const ribbonLastSectorRef = useRef(0);
  const ribbonFailedRef = useRef(false);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const assistTimerRef = useRef<number | null>(null);
  const reducedMotion = useMemo(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches), []);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const clearAssistTimer = () => {
    if (assistTimerRef.current !== null) window.clearTimeout(assistTimerRef.current);
    assistTimerRef.current = null;
  };

  useEffect(() => () => clearAssistTimer(), []);

  const resetRoute = (rebounded = false) => {
    if (armedRef.current || solved) return;
    routeProgressRef.current = 0;
    setRouteProgress(0);
    setRibbonPosition({ x: 80, y: 50 });
    setRouteState(rebounded ? "rebounded" : "idle");
    if (rebounded) setRebounds((count) => count + 1);
  };

  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    routeProgressRef.current = 4;
    setRouteProgress(4);
    setRouteState("complete");
    setCompleted(true);
    onArm();
  };

  const beginAxisHold = (mode: "pointer" | "space", pointerId?: number) => {
    if (armedRef.current || solved || axisActiveRef.current) return;
    discover();
    axisActiveRef.current = true;
    axisPressModeRef.current = mode;
    axisPointerRef.current = pointerId ?? null;
    setAxisHeld(true);
    if (!reducedMotion) return;
    clearAssistTimer();
    assistTimerRef.current = window.setTimeout(() => {
      assistTimerRef.current = null;
      axisActiveRef.current = true;
      setAxisLatched(true);
      setInputMode("assist-lock");
    }, 5_000);
  };

  const releaseAxis = (pointerId?: number) => {
    if (pointerId !== undefined && axisPointerRef.current !== pointerId) return;
    clearAssistTimer();
    axisPointerRef.current = null;
    axisPressModeRef.current = null;
    setAxisHeld(false);
    if (axisLatched || armedRef.current || solved) return;
    axisActiveRef.current = false;
    if (routeProgressRef.current > 0) resetRoute(true);
  };

  const pointInScene = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return {
      x: (clientX - rect.left) / rect.width * 100,
      y: (clientY - rect.top) / rect.height * 100,
    };
  };

  const sectorForPoint = (point: { x: number; y: number }) => Math.round((Math.atan2(point.y - 50, point.x - 50) / (Math.PI / 2) + 4)) % 4;
  const sectorPosition = (sector: number) => [
    { x: 80, y: 50 },
    { x: 50, y: 80 },
    { x: 20, y: 50 },
    { x: 50, y: 20 },
  ][sector];

  const advanceSector = (sector: number, mode: "pointer" | "keyboard") => {
    if (armedRef.current || solved || sector === ribbonLastSectorRef.current) return;
    ribbonLastSectorRef.current = sector;
    setRibbonPosition(sectorPosition(sector));
    discover();
    if (!axisActiveRef.current) {
      ribbonFailedRef.current = true;
      setRouteState("rebounded");
      return;
    }
    const expected = (routeProgressRef.current + 1) % 4;
    if (sector !== expected) {
      ribbonFailedRef.current = true;
      resetRoute(true);
      return;
    }
    const next = routeProgressRef.current + 1;
    routeProgressRef.current = next;
    setRouteProgress(next);
    setRouteState("wrapping");
    setInputMode(mode === "keyboard"
      ? "pointer-keyboard"
      : axisPressModeRef.current === "space" ? "space-pointer" : axisLatched ? "assist-lock" : "pointer-dual");
    if (next === 4) complete();
  };

  const beginRibbon = (pointerId: number, clientX: number, clientY: number) => {
    if (armedRef.current || solved) return;
    const point = pointInScene(clientX, clientY);
    if (!point) return;
    discover();
    ribbonPointerRef.current = pointerId;
    ribbonLastSectorRef.current = sectorForPoint(point);
    ribbonFailedRef.current = !axisActiveRef.current;
    routeProgressRef.current = 0;
    setRouteProgress(0);
    setRouteState(axisActiveRef.current ? "wrapping" : "rebounded");
  };

  const moveRibbon = (pointerId: number, clientX: number, clientY: number) => {
    if (ribbonPointerRef.current !== pointerId || armedRef.current || solved) return;
    const point = pointInScene(clientX, clientY);
    if (!point) return;
    const radius = Math.hypot(point.x - 50, point.y - 50);
    if (radius < 18 || radius > 46) {
      if (routeProgressRef.current > 0) resetRoute(true);
      ribbonFailedRef.current = true;
      return;
    }
    setRibbonPosition({ x: Math.round(point.x), y: Math.round(point.y) });
    advanceSector(sectorForPoint(point), "pointer");
  };

  const finishRibbon = (pointerId: number) => {
    if (ribbonPointerRef.current !== pointerId) return;
    ribbonPointerRef.current = null;
    if (armedRef.current || solved) return;
    if (routeProgressRef.current < 4) {
      ribbonFailedRef.current = false;
      resetRoute(true);
    }
  };

  const moveRibbonWithKey = (key: string) => {
    const sector = key === "ArrowRight" ? 0
      : key === "ArrowDown" ? 1
        : key === "ArrowLeft" ? 2
          : key === "ArrowUp" ? 3
            : null;
    if (sector === null) return false;
    discover();
    if (!axisActiveRef.current) {
      resetRoute(true);
      return true;
    }
    advanceSector(sector, "keyboard");
    return true;
  };

  const visibleSolved = solved || completed;
  const visibleProgress = visibleSolved ? 4 : routeProgress;
  const axisState = axisLatched ? "latched" : axisHeld ? "held" : visibleSolved ? "latched" : "free";
  return (
    <div
      ref={sceneRef}
      className={styles.hybridConsoleScene}
      data-axis-state={axisState}
      data-controller="coupled-drag"
      data-input-mode={inputMode}
      data-overlap-active={(axisHeld || axisLatched) && !visibleSolved ? "true" : "false"}
      data-rebounds={rebounds}
      data-route-progress={visibleProgress}
      data-route-state={visibleSolved ? "complete" : routeState}
      data-spatial-model="held-axis-continuous-ribbon-orbit"
      data-testid="v2-scene-054"
      style={{ "--hybrid-ribbon-x": `${ribbonPosition.x}%`, "--hybrid-ribbon-y": `${ribbonPosition.y}%`, "--hybrid-wrap": visibleProgress } as React.CSSProperties}
    >
      <span className={styles.hybridPaper} aria-hidden="true"><i /><b /></span>
      <svg className={styles.hybridRibbonTrail} viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="30" pathLength="4" />
      </svg>
      <span className={styles.hybridOrbitEvidence} aria-hidden="true">
        {[0, 1, 2, 3].map((segment) => <i key={segment} data-testid={`hybrid-orbit-segment-${segment}`} />)}
      </span>
      <button
        type="button"
        className={styles.hybridAxle}
        aria-label={locale === "zh" ? "中央按压纸轴" : "Central pressable paper axle"}
        onPointerDown={(event) => {
          beginAxisHold("pointer", event.pointerId);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerUp={(event) => releaseAxis(event.pointerId)}
        onPointerCancel={(event) => releaseAxis(event.pointerId)}
        onKeyDown={(event) => {
          if (event.key === " " && !event.repeat) {
            event.preventDefault();
            beginAxisHold("space");
            return;
          }
          if (moveRibbonWithKey(event.key)) event.preventDefault();
        }}
        onKeyUp={(event) => {
          if (event.key !== " ") return;
          event.preventDefault();
          releaseAxis();
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <button
        type="button"
        className={styles.hybridRibbonEnd}
        aria-label={locale === "zh" ? "松散丝带端" : "Loose ribbon end"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          beginRibbon(event.pointerId, event.clientX, event.clientY);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => moveRibbon(event.pointerId, event.clientX, event.clientY)}
        onPointerUp={(event) => finishRibbon(event.pointerId)}
        onPointerCancel={(event) => finishRibbon(event.pointerId)}
        onKeyDown={(event) => {
          if (moveRibbonWithKey(event.key)) event.preventDefault();
        }}
      ><span aria-hidden="true"><i>↻</i><b /></span></button>
    </div>
  );
}

function DualDevice({ locale, solved, spatialPilot, onDiscover, onArm }: ControllerProps) {
  type PointerInput = "none" | "pointer" | "touch";
  type CompanionInput = "none" | "keyboard" | "two-touch";
  const [pointerDocked, setPointerDocked] = useState(solved);
  const pointerDockedRef = useRef(solved);
  const [companionDocked, setCompanionDocked] = useState(solved);
  const companionDockedRef = useRef(solved);
  const [pointerInput, setPointerInput] = useState<PointerInput>("none");
  const pointerInputRef = useRef<PointerInput>("none");
  const [companionInput, setCompanionInput] = useState<CompanionInput>("none");
  const companionInputRef = useRef<CompanionInput>("none");
  const [mismatch, setMismatch] = useState<"none" | "pointer" | "companion">("none");
  const [completed, setCompleted] = useState(false);
  const pointerDragRef = useRef<{ pointerId: number; x: number; input: Exclude<PointerInput, "none"> } | null>(null);
  const companionTouchesRef = useRef(new Map<number, number>());
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const finishIfComplete = (nextPointer = pointerDockedRef.current, nextCompanion = companionDockedRef.current) => {
    if (!nextPointer || !nextCompanion || solved || armedRef.current) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };
  const dockPointer = (input: Exclude<PointerInput, "none">) => {
    if (solved || armedRef.current) return;
    discover();
    pointerDockedRef.current = true;
    pointerInputRef.current = input;
    setPointerDocked(true);
    setPointerInput(input);
    setMismatch("none");
    finishIfComplete(true, companionDockedRef.current);
  };
  const dockCompanion = (input: Exclude<CompanionInput, "none">) => {
    if (solved || armedRef.current) return;
    discover();
    companionDockedRef.current = true;
    companionInputRef.current = input;
    setCompanionDocked(true);
    setCompanionInput(input);
    setMismatch("none");
    finishIfComplete(pointerDockedRef.current, true);
  };

  const visibleSolved = solved || completed;
  const visiblePointerDocked = visibleSolved || pointerDocked;
  const visibleCompanionDocked = visibleSolved || companionDocked;
  const inputPair = visibleSolved
    ? `${pointerInput === "none" ? "pointer" : pointerInput}+${companionInput === "none" ? "keyboard" : companionInput}`
    : "incomplete";

  return (
    <div
      className={styles.dualDeviceScene}
      data-companion-half={visibleCompanionDocked ? "docked" : "waiting"}
      data-companion-input={companionInput}
      data-controller="coupled-drag"
      data-input-pair={inputPair}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-mismatch={mismatch}
      data-pointer-half={visiblePointerDocked ? "docked" : "waiting"}
      data-pointer-input={pointerInput}
      data-ring-state={visibleSolved ? "complete" : "split"}
      data-spatial-pilot={spatialPilot ? "true" : "false"}
      data-spatial-model="pointer-grain-and-companion-grain-half-rings-share-one-socket"
      data-testid="v2-scene-081"
    >
      <span className={styles.dualDevicePaper} aria-hidden="true"><i /><b /></span>
      {spatialPilot ? <span className={styles.dualSpatialDepth} data-testid="dual-spatial-depth" aria-hidden="true"><i /><b /><em /></span> : null}
      <span className={styles.dualSharedSocket} data-testid="dual-shared-socket" aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={`${styles.dualHalf} ${styles.dualPointerHalf}`}
        data-testid="dual-pointer-half"
        aria-label={locale === "zh" ? "指针纹半环" : "Pointer-grain half ring"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          const input = event.pointerType === "touch" ? "touch" : "pointer";
          pointerDragRef.current = { pointerId: event.pointerId, x: event.clientX, input };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = pointerDragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          if (event.clientX - drag.x >= 45) dockPointer(drag.input);
        }}
        onPointerUp={() => { pointerDragRef.current = null; }}
        onPointerCancel={() => { pointerDragRef.current = null; }}
      ><span aria-hidden="true"><i data-testid="dual-pointer-grain" /><b /></span></button>
      <button
        type="button"
        className={`${styles.dualHalf} ${styles.dualCompanionHalf}`}
        data-testid="dual-companion-half"
        aria-label={locale === "zh" ? "另一种输入纹半环" : "Companion-input half ring"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          if (event.pointerType !== "touch") {
            discover();
            setMismatch("companion");
            return;
          }
          companionTouchesRef.current.set(event.pointerId, event.clientX);
          if (companionTouchesRef.current.size >= 2) discover();
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = companionTouchesRef.current.get(event.pointerId);
          if (start === undefined || companionTouchesRef.current.size < 2 || visibleSolved) return;
          if (start - event.clientX >= 40) dockCompanion("two-touch");
        }}
        onPointerUp={(event) => {
          const wasSingleTouch = companionTouchesRef.current.size === 1 && !companionDockedRef.current;
          companionTouchesRef.current.delete(event.pointerId);
          if (wasSingleTouch) setMismatch("companion");
        }}
        onPointerCancel={(event) => {
          companionTouchesRef.current.delete(event.pointerId);
          if (!companionDockedRef.current) setMismatch("companion");
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" || visibleSolved) return;
          event.preventDefault();
          dockCompanion("keyboard");
        }}
      ><span aria-hidden="true"><i className={styles.dualKeycapGrain} data-testid="dual-keycap-grain" /><b className={styles.dualTwoTouchGrain} data-testid="dual-two-touch-grain" /></span></button>
      <span className={styles.dualDeviceSeal} aria-hidden="true" />
    </div>
  );
}

function CoupledDrag(props: ControllerProps) {
  return props.level.id === 14
    ? <CornerCross {...props} />
    : props.level.id === 54
      ? <HybridConsole {...props} />
      : props.level.id === 81
        ? <DualDevice {...props} />
        : props.level.id === 97
          ? <SevenfoldAck {...props} />
          : <DragRelation {...props} kind="coupled-drag" />;
}

function CornerRepair(props: ControllerProps) {
  const { locale, solved, spatialPilot, onDiscover, onArm } = props;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [keyPosition, setKeyPosition] = useState({ x: 0, y: 0 });
  const [wrong, setWrong] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const finishPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const moved = Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y);
    dragStart.current = null;
    if (moved <= 12) return;

    const target = event.currentTarget
      .closest<HTMLElement>("[data-corner-scene]")
      ?.querySelector<HTMLElement>("[data-corner-target]");
    const rect = target?.getBoundingClientRect();
    const hit = Boolean(
      rect
      && event.clientX >= rect.left - 22
      && event.clientX <= rect.right + 22
      && event.clientY >= rect.top - 22
      && event.clientY <= rect.bottom + 22,
    );

    if (hit) {
      setWrong(false);
      onArm();
      return;
    }

    setWrong(true);
    setOffset({ x: 0, y: 0 });
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
    setOffset({ x: next.x * 48, y: next.y * 32 });
    setWrong(next.x === keyPosition.x && next.y === keyPosition.y);
    if (next.x === 3 && next.y === 1) onArm();
  };

  return (
    <div
      className={`${styles.cornerScene} ${wrong ? styles.cornerWrong : ""} ${solved ? styles.cornerSolved : ""}`}
      data-corner-scene
      data-controller="corner-repair"
      data-spatial-pilot={spatialPilot ? "true" : "false"}
      data-spatial-model="page-corner"
      data-testid="v2-scene-001"
    >
      <span className={styles.cornerFrame} aria-hidden="true" />
      {spatialPilot ? <span className={styles.cornerSpatialDepth} data-testid="corner-spatial-depth" aria-hidden="true"><i /><b /><em /></span> : null}
      <span
        className={styles.cornerTarget}
        data-corner-target
        data-testid="corner-target-001"
        aria-hidden="true"
      />
      <button
        type="button"
        className={styles.looseCorner}
        aria-label={locale === "zh" ? "游离的纸角" : "Loose paper corner"}
        style={{ transform: solved ? undefined : `translate(${offset.x}px, ${offset.y}px)` }}
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
        onPointerCancel={() => {
          dragStart.current = null;
          setOffset({ x: 0, y: 0 });
        }}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

function GenericShadowSort({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [placed, setPlaced] = useState([false, false, false]);
  const starts = useRef<Record<number, number>>({});
  const place = (index: number) => {
    onDiscover();
    setPlaced((current) => {
      const next = current.map((value, position) => position === index ? true : value);
      if (next.every(Boolean)) queueMicrotask(onArm);
      return next;
    });
  };
  return <div className={styles.shadowBoard} data-controller="shadow-sort">
    <div className={styles.shadowWells} aria-hidden="true"><i /><i /><i /></div>
    {[0, 1, 2].map((index) => <button
      type="button" key={index} className={solved || placed[index] ? styles.shadowPlaced : ""}
      aria-label={locale === "zh" ? `带影子的纸片 ${index + 1}` : `Paper shape with shadow ${index + 1}`}
      onPointerDown={(event) => { starts.current[index] = event.clientY; event.currentTarget.setPointerCapture?.(event.pointerId); }}
      onPointerMove={(event) => { if (Math.abs(event.clientY - (starts.current[index] ?? event.clientY)) > 12) onDiscover(); }}
      onPointerUp={(event) => {
        const moved = Math.abs(event.clientY - (starts.current[index] ?? event.clientY));
        if (moved > 28) place(index);
      }}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === "ArrowDown") { event.preventDefault(); place(index); } }}
    ><span aria-hidden="true" /></button>)}
  </div>;
}

const HONEST_SHADOW_TARGETS = [1, 2, 0] as const;
const HONEST_SHADOW_WELLS = ["long", "short", "medium"] as const;

function HonestShadows({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [placed, setPlaced] = useState<Array<number | null>>([null, null, null]);
  const [keyboardWells, setKeyboardWells] = useState([0, 0, 0]);
  const [offsets, setOffsets] = useState([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
  const [wrongWell, setWrongWell] = useState<number | null>(null);
  const dragStarts = useRef<Record<number, { x: number; y: number }>>({});
  const wrongTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
  }, []);

  const reject = (wellIndex: number) => {
    setWrongWell(wellIndex);
    if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => {
      wrongTimer.current = null;
      setWrongWell(null);
    }, 150);
  };

  const attemptPlacement = (discIndex: number, wellIndex: number) => {
    onDiscover();
    setOffsets((current) => current.map((value, index) => index === discIndex ? { x: 0, y: 0 } : value));
    if (wellIndex !== HONEST_SHADOW_TARGETS[discIndex]) {
      reject(wellIndex);
      return;
    }

    setWrongWell(null);
    setPlaced((current) => {
      const next = current.map((value, index) => index === discIndex ? wellIndex : value);
      if (next.every((value) => value !== null)) queueMicrotask(onArm);
      return next;
    });
  };

  const moveKeyboardTarget = (discIndex: number, direction: number) => {
    onDiscover();
    setKeyboardWells((current) => current.map((value, index) => (
      index === discIndex ? (value + direction + HONEST_SHADOW_WELLS.length) % HONEST_SHADOW_WELLS.length : value
    )));
  };

  const effectivePlaced = solved ? [...HONEST_SHADOW_TARGETS] : placed;

  return (
    <div
      className={styles.honestShadowsScene}
      data-controller="shadow-sort"
      data-spatial-model="stationary-shadows"
      data-testid="v2-scene-004"
    >
      <span className={styles.honestLightBeam} aria-hidden="true" />
      <div className={styles.honestSources}>
        {[0, 1, 2].map((discIndex) => (
          <div className={styles.honestSource} data-disc={discIndex} key={discIndex}>
            <i
              className={styles.honestStationaryShadow}
              data-shadow-length={["short", "medium", "long"][discIndex]}
              data-shadow-stationary="true"
              data-testid={`shadow-source-${discIndex}`}
              aria-hidden="true"
            />
            {effectivePlaced[discIndex] === null ? (
              <button
                type="button"
                className={styles.honestDisc}
                data-size={["large", "medium", "small"][discIndex]}
                aria-label={locale === "zh" ? `圆纸片 ${discIndex + 1}` : `Paper disc ${discIndex + 1}`}
                style={{ transform: `translate(${offsets[discIndex].x}px, ${offsets[discIndex].y}px)` }}
                onPointerDown={(event) => {
                  dragStarts.current[discIndex] = { x: event.clientX, y: event.clientY };
                  event.currentTarget.setPointerCapture?.(event.pointerId);
                }}
                onPointerMove={(event) => {
                  const start = dragStarts.current[discIndex];
                  if (!start) return;
                  const offset = { x: event.clientX - start.x, y: event.clientY - start.y };
                  if (Math.hypot(offset.x, offset.y) > 12) onDiscover();
                  setOffsets((current) => current.map((value, index) => index === discIndex ? offset : value));
                }}
                onPointerUp={(event) => {
                  const start = dragStarts.current[discIndex];
                  delete dragStarts.current[discIndex];
                  if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
                  const wells = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-004']")
                    ?.querySelectorAll<HTMLElement>("[data-shadow-well]");
                  const wellIndex = [...(wells ?? [])].findIndex((well) => {
                    const rect = well.getBoundingClientRect();
                    return event.clientX >= rect.left - 18 && event.clientX <= rect.right + 18
                      && event.clientY >= rect.top - 18 && event.clientY <= rect.bottom + 18;
                  });
                  if (wellIndex >= 0) attemptPlacement(discIndex, wellIndex);
                  else setOffsets((current) => current.map((value, index) => index === discIndex ? { x: 0, y: 0 } : value));
                }}
                onPointerCancel={() => {
                  delete dragStarts.current[discIndex];
                  setOffsets((current) => current.map((value, index) => index === discIndex ? { x: 0, y: 0 } : value));
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    moveKeyboardTarget(discIndex, 1);
                  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    moveKeyboardTarget(discIndex, -1);
                  } else if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    attemptPlacement(discIndex, keyboardWells[discIndex]);
                  }
                }}
              ><span aria-hidden="true" /></button>
            ) : null}
          </div>
        ))}
      </div>
      <div className={styles.honestWells}>
        {HONEST_SHADOW_WELLS.map((length, wellIndex) => {
          const placedDisc = effectivePlaced.findIndex((value) => value === wellIndex);
          return (
            <span
              className={styles.honestWell}
              data-shadow-well={length}
              data-wrong={wrongWell === wellIndex ? "true" : "false"}
              data-testid={`shadow-well-${wellIndex}`}
              key={length}
            >
              {placedDisc >= 0 ? <i className={styles.honestPlacedDisc} data-size={["large", "medium", "small"][placedDisc]} aria-hidden="true" /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const CIPHER_LETTERS = ["M", "T", "E", "I"] as const;
const CIPHER_TARGETS = [2, 0, 3, 1] as const;

function ShadowCipher({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [placed, setPlaced] = useState<Array<number | null>>([null, null, null, null]);
  const [keyboardWells, setKeyboardWells] = useState([0, 0, 0, 0]);
  const [offsets, setOffsets] = useState([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
  const [wrongWell, setWrongWell] = useState<number | null>(null);
  const starts = useRef<Record<number, { x: number; y: number }>>({});
  const wrongTimer = useRef<number | null>(null);
  const armedCipher = useRef(false);
  const placedRef = useRef<Array<number | null>>([null, null, null, null]);

  useEffect(() => () => {
    if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
  }, []);

  const reject = (wellIndex: number) => {
    setWrongWell(wellIndex);
    if (wrongTimer.current !== null) window.clearTimeout(wrongTimer.current);
    wrongTimer.current = window.setTimeout(() => {
      wrongTimer.current = null;
      setWrongWell(null);
    }, 150);
  };

  const attempt = (blockIndex: number, wellIndex: number) => {
    onDiscover();
    setOffsets((current) => current.map((value, index) => index === blockIndex ? { x: 0, y: 0 } : value));
    if (wellIndex !== CIPHER_TARGETS[blockIndex]) {
      reject(wellIndex);
      return;
    }
    setWrongWell(null);
    const next = placedRef.current.map((value, index) => index === blockIndex ? wellIndex : value);
    placedRef.current = next;
    setPlaced(next);
    if (next.every((value) => value !== null) && !armedCipher.current && !solved) {
      armedCipher.current = true;
      onArm();
    }
  };

  const effectivePlaced = solved ? [...CIPHER_TARGETS] : placed;

  return (
    <div
      className={styles.cipherScene}
      data-controller="shadow-sort"
      data-shadow-word="TIME"
      data-spatial-model="stationary-letter-shadows"
      data-testid="v2-scene-009"
    >
      <div className={styles.cipherBlocks} data-testid="cipher-blocks-009">
        {CIPHER_LETTERS.map((letter, blockIndex) => effectivePlaced[blockIndex] === null ? (
          <button
            type="button"
            className={styles.cipherBlock}
            aria-label={locale === "zh" ? `字块 ${letter}` : `Letter block ${letter}`}
            key={letter}
            style={{ transform: `translate(${offsets[blockIndex].x}px, ${offsets[blockIndex].y}px) rotate(${[-2, 1.5, -1, 2][blockIndex]}deg)` }}
            onPointerDown={(event) => {
              starts.current[blockIndex] = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = starts.current[blockIndex];
              if (!start) return;
              const offset = { x: event.clientX - start.x, y: event.clientY - start.y };
              if (Math.hypot(offset.x, offset.y) > 12) onDiscover();
              setOffsets((current) => current.map((value, index) => index === blockIndex ? offset : value));
            }}
            onPointerUp={(event) => {
              const start = starts.current[blockIndex];
              delete starts.current[blockIndex];
              if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
              const wells = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-009']")
                ?.querySelectorAll<HTMLElement>("[data-cipher-well]");
              const wellIndex = [...(wells ?? [])].findIndex((well) => {
                const rect = well.getBoundingClientRect();
                return event.clientX >= rect.left - 18 && event.clientX <= rect.right + 18
                  && event.clientY >= rect.top - 18 && event.clientY <= rect.bottom + 18;
              });
              if (wellIndex >= 0) attempt(blockIndex, wellIndex);
              else setOffsets((current) => current.map((value, index) => index === blockIndex ? { x: 0, y: 0 } : value));
            }}
            onPointerCancel={() => {
              delete starts.current[blockIndex];
              setOffsets((current) => current.map((value, index) => index === blockIndex ? { x: 0, y: 0 } : value));
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                onDiscover();
                setKeyboardWells((current) => current.map((value, index) => index === blockIndex ? (value + 1) % 4 : value));
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                onDiscover();
                setKeyboardWells((current) => current.map((value, index) => index === blockIndex ? (value + 3) % 4 : value));
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                attempt(blockIndex, keyboardWells[blockIndex]);
              }
            }}
          >{letter}</button>
        ) : <span className={styles.cipherBlockPlaceholder} key={letter} aria-hidden="true" />)}
      </div>
      <div className={styles.cipherWells} aria-label={locale === "zh" ? "固定的影字" : "Stationary shadow letters"}>
        {["T", "I", "M", "E"].map((shadowLetter, wellIndex) => {
          const blockIndex = effectivePlaced.findIndex((value) => value === wellIndex);
          return (
            <span
              className={styles.cipherWell}
              data-cipher-well={shadowLetter}
              data-wrong={wrongWell === wellIndex ? "true" : "false"}
              data-testid={`cipher-well-${wellIndex}`}
              key={shadowLetter}
            >
              <b aria-hidden="true">{shadowLetter}</b>
              {blockIndex >= 0 ? <i aria-hidden="true">{CIPHER_LETTERS[blockIndex]}</i> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const fallingPetalSizes = [2, 1, 0] as const;
const fallingGapSizes = [1, 0, 2] as const;

function FallingIntervals({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [placements, setPlacements] = useState<Array<number | null>>([null, null, null]);
  const placementsRef = useRef<Array<number | null>>([null, null, null]);
  const [keyboardSlots, setKeyboardSlots] = useState([0, 0, 0]);
  const [keyboardPetal, setKeyboardPetal] = useState<number | null>(null);
  const starts = useRef<Record<number, { x: number; y: number }>>({});
  const armedRef = useRef(false);
  const effectivePlacements = solved ? [2, 0, 1] : placements;
  const slotPattern = fallingGapSizes.map((_size, slotIndex) => {
    const petalIndex = effectivePlacements.findIndex((slot) => slot === slotIndex);
    return petalIndex < 0 ? "x" : String(fallingPetalSizes[petalIndex]);
  });
  const matchedGaps = slotPattern.filter((size, index) => size === String(fallingGapSizes[index])).length;

  const place = (petalIndex: number, slotIndex: number) => {
    if (armedRef.current) return;
    onDiscover();
    const next = placementsRef.current.map((slot, index) => slot === slotIndex && index !== petalIndex ? null : slot);
    next[petalIndex] = slotIndex;
    placementsRef.current = next;
    setPlacements(next);
    const complete = fallingGapSizes.every((size, gapIndex) => {
      const occupant = next.findIndex((slot) => slot === gapIndex);
      return occupant >= 0 && fallingPetalSizes[occupant] === size;
    });
    if (complete && !armedRef.current) {
      armedRef.current = true;
      onArm();
    }
  };

  return (
    <div
      className={styles.fallingIntervalsScene}
      data-controller="shadow-sort"
      data-drop-padding-px="22"
      data-keyboard-target={keyboardPetal === null ? -1 : keyboardSlots[keyboardPetal]}
      data-matched-gaps={matchedGaps}
      data-slot-pattern={slotPattern.join(",")}
      data-spatial-model="petal-width-to-silence-length"
      data-testid="v2-scene-023"
    >
      <div className={styles.soundPetals}>
        {fallingPetalSizes.map((size, petalIndex) => (
          <button
            type="button"
            key={petalIndex}
            className={styles.soundPetal}
            aria-label={locale === "zh"
              ? `声纹花瓣 ${petalIndex + 1}，${["窄", "中", "宽"][size]}`
              : `Sound petal ${petalIndex + 1}, ${["narrow", "medium", "wide"][size]}`}
            data-placed={effectivePlacements[petalIndex] !== null}
            data-size={size}
            onFocus={() => setKeyboardPetal(petalIndex)}
            onPointerDown={(event) => {
              starts.current[petalIndex] = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerUp={(event) => {
              const start = starts.current[petalIndex];
              delete starts.current[petalIndex];
              if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
              const gaps = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-023']")
                ?.querySelectorAll<HTMLElement>("[data-silence-gap]");
              const slotIndex = [...(gaps ?? [])].findIndex((gap) => {
                const rect = gap.getBoundingClientRect();
                return event.clientX >= rect.left - 22 && event.clientX <= rect.right + 22
                  && event.clientY >= rect.top - 22 && event.clientY <= rect.bottom + 22;
              });
              if (slotIndex >= 0) place(petalIndex, slotIndex);
            }}
            onPointerCancel={() => { delete starts.current[petalIndex]; }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                onDiscover();
                setKeyboardSlots((current) => current.map((slot, index) => index === petalIndex ? (slot + 1) % 3 : slot));
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                onDiscover();
                setKeyboardSlots((current) => current.map((slot, index) => index === petalIndex ? (slot + 2) % 3 : slot));
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                place(petalIndex, keyboardSlots[petalIndex]);
              }
            }}
          ><span aria-hidden="true" /></button>
        ))}
      </div>
      <div className={styles.silenceStrip} aria-hidden="true">
        {fallingGapSizes.map((size, gapIndex) => {
          const occupant = effectivePlacements.findIndex((slot) => slot === gapIndex);
          const matched = occupant >= 0 && fallingPetalSizes[occupant] === size;
          return (
            <span
              key={gapIndex}
              className={styles.silenceGap}
              data-keyboard-target={keyboardPetal !== null && keyboardSlots[keyboardPetal] === gapIndex}
              data-matched={matched}
              data-silence-gap={gapIndex}
              data-size={size}
              data-testid={`silence-gap-${gapIndex}`}
            >
              {occupant >= 0 ? <i data-size={fallingPetalSizes[occupant]} /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function PressureVault({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-capacity" | "keyboard-capacity";
  type Rejection = "none" | "unmeasured" | "bulge" | "loose-edge" | "occupied";
  const stoneSizes = [2, 0, 1] as const;
  const wellCapacities = [1, 2, 0] as const;
  const targets = [1, 2, 0] as const;
  const sizeNames = ["small", "medium", "large"] as const;
  const [probed, setProbed] = useState([false, false, false]);
  const probedRef = useRef(probed);
  const [placements, setPlacements] = useState<Array<number | null>>(solved ? [...targets] : [null, null, null]);
  const placementsRef = useRef<Array<number | null>>(solved ? [...targets] : [null, null, null]);
  const [offsets, setOffsets] = useState([{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }]);
  const [keyboardWells, setKeyboardWells] = useState([0, 0, 0]);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [rejection, setRejection] = useState<Rejection>("none");
  const [feedbackWell, setFeedbackWell] = useState<number | null>(null);
  const pressRef = useRef<Record<number, { pointerId: number; x: number; y: number; moved: boolean }>>({});
  const holdTimersRef = useRef<Record<number, number>>({});
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => () => {
    Object.values(holdTimersRef.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const clearHold = (stoneIndex: number) => {
    const timer = holdTimersRef.current[stoneIndex];
    if (timer !== undefined) window.clearTimeout(timer);
    delete holdTimersRef.current[stoneIndex];
  };
  const probe = (stoneIndex: number) => {
    if (solved || placements[stoneIndex] !== null) return;
    setProbed((current) => {
      if (current[stoneIndex]) return current;
      const next = current.map((value, index) => index === stoneIndex ? true : value);
      probedRef.current = next;
      return next;
    });
    discover();
  };
  const beginHold = (stoneIndex: number) => {
    clearHold(stoneIndex);
    holdTimersRef.current[stoneIndex] = window.setTimeout(() => {
      delete holdTimersRef.current[stoneIndex];
      probe(stoneIndex);
    }, 320);
  };
  const reject = (wellIndex: number | null, kind: Rejection) => {
    setFeedbackWell(wellIndex);
    setRejection(kind);
  };
  const place = (stoneIndex: number, wellIndex: number, mode: Exclude<InputMode, "none">) => {
    setInputMode(mode);
    setOffsets((current) => current.map((offset, index) => index === stoneIndex ? { x: 0, y: 0 } : offset));
    if (!probedRef.current[stoneIndex]) {
      reject(wellIndex, "unmeasured");
      return;
    }
    if (placementsRef.current.some((slot, index) => index !== stoneIndex && slot === wellIndex)) {
      reject(wellIndex, "occupied");
      return;
    }
    if (stoneSizes[stoneIndex] !== wellCapacities[wellIndex]) {
      reject(wellIndex, stoneSizes[stoneIndex] > wellCapacities[wellIndex] ? "bulge" : "loose-edge");
      return;
    }
    setFeedbackWell(null);
    setRejection("none");
    const next = placementsRef.current.map((slot, index) => index === stoneIndex ? wellIndex : slot);
    placementsRef.current = next;
    setPlacements(next);
    if (next.every((slot, index) => slot === targets[index]) && !armedRef.current) {
      armedRef.current = true;
      onArm();
    }
  };
  const effectivePlacements = solved ? [...targets] : placements;
  const matchedStones = effectivePlacements.filter((slot, index) => slot === targets[index]).length;
  const visibleSolved = solved || matchedStones === 3;

  return (
    <div
      className={styles.pressureVaultScene}
      data-controller="shadow-sort"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-matched-stones={matchedStones}
      data-probed-stones={probed.map((value, index) => value ? index : null).filter((value) => value !== null).join(",") || "none"}
      data-rejection={rejection}
      data-spatial-model="equal-stones-hidden-pressure-radii-capacity-wells"
      data-testid="v2-scene-073"
    >
      <span className={styles.pressureVaultPaper} aria-hidden="true"><i /><b /></span>
      <div className={styles.pressureStones}>
        {stoneSizes.map((size, stoneIndex) => {
          const placed = effectivePlacements[stoneIndex] !== null;
          return (
            <button
              type="button"
              className={styles.pressureStone}
              data-appearance="same"
              data-placed={placed ? "true" : "false"}
              data-pressure={probed[stoneIndex] || solved ? sizeNames[size] : "hidden"}
              data-testid={`pressure-stone-${stoneIndex}`}
              key={stoneIndex}
              aria-label={locale === "zh"
                ? `软纸石 ${stoneIndex + 1}${probed[stoneIndex] ? `，${["小", "中", "大"][size]}涟漪` : ""}`
                : `Soft paper stone ${stoneIndex + 1}${probed[stoneIndex] ? `, ${sizeNames[size]} ripple` : ""}`}
              style={{
                "--pressure-offset-x": `${offsets[stoneIndex].x}px`,
                "--pressure-offset-y": `${offsets[stoneIndex].y}px`,
                "--pressure-ripple-size": `${[3.5, 4.8, 6.2][size]}rem`,
              } as React.CSSProperties}
              onClick={() => undefined}
              onPointerDown={(event) => {
                if (placed || visibleSolved) return;
                pressRef.current[stoneIndex] = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
                beginHold(stoneIndex);
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={(event) => {
                const press = pressRef.current[stoneIndex];
                if (!press || press.pointerId !== event.pointerId || placed || visibleSolved) return;
                const offset = { x: event.clientX - press.x, y: event.clientY - press.y };
                if (Math.hypot(offset.x, offset.y) > 10) {
                  press.moved = true;
                  if (!probedRef.current[stoneIndex]) clearHold(stoneIndex);
                }
                if (press.moved) {
                  setInputMode("pointer-capacity");
                  setOffsets((current) => current.map((value, index) => index === stoneIndex ? offset : value));
                }
              }}
              onPointerUp={(event) => {
                clearHold(stoneIndex);
                const press = pressRef.current[stoneIndex];
                delete pressRef.current[stoneIndex];
                if (!press || press.pointerId !== event.pointerId || !press.moved || placed || visibleSolved) return;
                const wells = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-073']")
                  ?.querySelectorAll<HTMLElement>("[data-pressure-well]");
                const wellIndex = [...(wells ?? [])].findIndex((well) => {
                  const rect = well.getBoundingClientRect();
                  return event.clientX >= rect.left - 18 && event.clientX <= rect.right + 18
                    && event.clientY >= rect.top - 18 && event.clientY <= rect.bottom + 18;
                });
                if (wellIndex >= 0) place(stoneIndex, wellIndex, "pointer-capacity");
                else setOffsets((current) => current.map((value, index) => index === stoneIndex ? { x: 0, y: 0 } : value));
              }}
              onPointerCancel={() => {
                clearHold(stoneIndex);
                delete pressRef.current[stoneIndex];
                setOffsets((current) => current.map((value, index) => index === stoneIndex ? { x: 0, y: 0 } : value));
              }}
              onKeyDown={(event) => {
                if (event.key === " ") {
                  event.preventDefault();
                  if (!event.repeat) beginHold(stoneIndex);
                } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  setInputMode("keyboard-capacity");
                  setKeyboardWells((current) => current.map((well, index) => index === stoneIndex ? (well + 1) % 3 : well));
                } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setInputMode("keyboard-capacity");
                  setKeyboardWells((current) => current.map((well, index) => index === stoneIndex ? (well + 2) % 3 : well));
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  place(stoneIndex, keyboardWells[stoneIndex], "keyboard-capacity");
                }
              }}
              onKeyUp={(event) => {
                if (event.key === " ") clearHold(stoneIndex);
              }}
            ><span aria-hidden="true"><i /><b /></span></button>
          );
        })}
      </div>
      <div className={styles.pressureWells}>
        {wellCapacities.map((capacity, wellIndex) => {
          const occupant = effectivePlacements.findIndex((slot) => slot === wellIndex);
          return (
            <span
              className={styles.pressureWell}
              data-capacity={sizeNames[capacity]}
              data-feedback={feedbackWell === wellIndex ? rejection : "none"}
              data-pressure-well={wellIndex}
              data-testid={`pressure-well-${wellIndex}`}
              key={wellIndex}
              role="img"
              aria-label={locale === "zh" ? `${["小", "中", "大"][capacity]}容量纸槽` : `${sizeNames[capacity]} capacity paper well`}
              style={{ "--pressure-well-size": `${[3.1, 4.25, 5.45][capacity]}rem` } as React.CSSProperties}
            >{occupant >= 0 ? <i data-stone={occupant} aria-hidden="true" /> : null}<b aria-hidden="true" /></span>
          );
        })}
      </div>
      <span className={styles.pressureVaultSeal} aria-hidden="true" />
    </div>
  );
}

function ShadowSort(props: ControllerProps) {
  if (props.level.id === 4) return <HonestShadows {...props} />;
  if (props.level.id === 9) return <ShadowCipher {...props} />;
  if (props.level.id === 23) return <FallingIntervals {...props} />;
  if (props.level.id === 73) return <PressureVault {...props} />;
  if (props.level.id === 96) return <SevenBeatNull {...props} />;
  return <GenericShadowSort {...props} />;
}

function AmberBalance({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [lampPosition, setLampPosition] = useState(10);
  const [nudgedWeight, setNudgedWeight] = useState<number | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const weightStarts = useRef<Record<number, { x: number; y: number }>>({});
  const nudgeTimer = useRef<number | null>(null);
  const armedByBalance = useRef(false);

  useEffect(() => () => {
    if (nudgeTimer.current !== null) window.clearTimeout(nudgeTimer.current);
  }, []);

  const effectivePosition = solved ? 50 : lampPosition;
  const shadowLengths = [
    64 + (effectivePosition - 50) * .55,
    64,
    64 - (effectivePosition - 50) * .55,
  ];
  const shadowSpread = Math.max(...shadowLengths) - Math.min(...shadowLengths);
  const frameAngle = solved ? 0 : Math.max(-5, Math.min(5, (50 - effectivePosition) / 8));

  const moveLamp = (next: number) => {
    const bounded = Math.max(0, Math.min(100, next));
    if (Math.abs(bounded - lampPosition) > 2) onDiscover();
    setLampPosition(bounded);
    const nextSpread = Math.abs(bounded - 50) * 1.1;
    if (nextSpread <= 8 && !armedByBalance.current) {
      armedByBalance.current = true;
      onArm();
    }
  };

  const nudge = (index: number) => {
    onDiscover();
    setNudgedWeight(index);
    if (nudgeTimer.current !== null) window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => {
      nudgeTimer.current = null;
      setNudgedWeight(null);
    }, 260);
  };

  return (
    <div
      className={styles.amberScene}
      data-controller="light-drag"
      data-spatial-model="shared-light"
      data-shadow-spread={shadowSpread.toFixed(1)}
      data-testid="v2-scene-005"
    >
      <div
        className={styles.amberRig}
        data-frame-angle={frameAngle.toFixed(2)}
        data-testid="amber-rig-005"
        style={{ "--frame-angle": `${frameAngle}deg` } as React.CSSProperties}
      >
        <span className={styles.amberHook} aria-hidden="true" />
        <span className={styles.amberBeam} aria-hidden="true" />
        <span className={styles.amberTriangle} aria-hidden="true" />
        {[0, 1, 2].map((index) => (
          <span className={styles.amberWeightColumn} data-weight={index} key={index}>
            <i className={styles.amberString} aria-hidden="true" />
            <button
              type="button"
              className={styles.amberWeight}
              data-shape={["round", "diamond", "hexagon"][index]}
              aria-label={locale === "zh" ? `纸砝码 ${index + 1}` : `Paper weight ${index + 1}`}
              onPointerDown={(event) => {
                weightStarts.current[index] = { x: event.clientX, y: event.clientY };
                event.currentTarget.setPointerCapture?.(event.pointerId);
              }}
              onPointerMove={(event) => {
                const start = weightStarts.current[index];
                if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) nudge(index);
              }}
              onPointerUp={() => { delete weightStarts.current[index]; }}
              onPointerCancel={() => { delete weightStarts.current[index]; }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  nudge(index);
                }
              }}
            ><span aria-hidden="true" /></button>
            <i
              className={styles.amberShadow}
              data-nudged={nudgedWeight === index ? "true" : "false"}
              data-testid={`amber-shadow-${index}`}
              style={{ width: `${shadowLengths[index]}px` }}
              aria-hidden="true"
            />
          </span>
        ))}
      </div>
      <div className={styles.amberLampTrack} data-testid="amber-lamp-track-005">
        <span className={styles.amberGlow} aria-hidden="true" />
        <button
          type="button"
          className={styles.amberLamp}
          aria-label={locale === "zh" ? "琥珀灯" : "Amber lamp"}
          style={{ left: `${effectivePosition}%` }}
          onPointerDown={(event) => {
            dragStart.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!dragStart.current) return;
            const track = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!track || track.width <= 0) return;
            moveLamp((event.clientX - track.left) / track.width * 100);
          }}
          onPointerUp={() => { dragStart.current = null; }}
          onPointerCancel={() => { dragStart.current = null; }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();
            moveLamp(lampPosition + (event.key === "ArrowRight" ? 10 : -10));
          }}
        ><span aria-hidden="true" /></button>
      </div>
    </div>
  );
}

function RelayBeaconWeave({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-beacon" | "keyboard-beacon";
  const targetX = 80;
  const initialX = 18;
  const [beaconX, setBeaconX] = useState(solved ? targetX : initialX);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [moved, setMoved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const beaconXRef = useRef(solved ? targetX : initialX);
  const dragRef = useRef<{ pointerId: number; x: number; startBeaconX: number; moved: boolean } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = (mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    beaconXRef.current = targetX;
    setBeaconX(targetX);
    setInputMode(mode);
    setMoved(true);
    setCompleted(true);
    onArm();
  };
  const moveBeacon = (next: number, mode: Exclude<InputMode, "none">, final = false) => {
    if (solved || armedRef.current) return;
    const clamped = Math.max(8, Math.min(92, next));
    beaconXRef.current = clamped;
    setBeaconX(clamped);
    setInputMode(mode);
    setMoved(true);
    discover();
    if (final && Math.abs(clamped - targetX) <= 8) complete(mode);
  };

  const visibleSolved = solved || completed;
  const visibleBeaconX = visibleSolved ? targetX : beaconX;
  const distance = Math.abs(visibleBeaconX - targetX);
  const beaconState = visibleSolved || distance <= 8
    ? "at-notch"
    : visibleBeaconX < targetX ? "left-offset" : "right-offset";
  const shadowState = visibleSolved
    ? "alternating"
    : moved ? "contradictory" : "ambiguous";

  return (
    <div
      ref={sceneRef}
      className={styles.relayBeaconScene}
      data-beacon-state={beaconState}
      data-controller="light-drag"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-shadow-state={shadowState}
      data-spatial-model="fixed-four-band-weave-revealed-by-one-shared-light"
      data-testid="v2-scene-075"
      data-weave-state={visibleSolved ? "pressed" : "fixed"}
      style={{ "--relay-beacon-x": `${visibleBeaconX}%` } as React.CSSProperties}
    >
      <span className={styles.relayBeaconPaper} aria-hidden="true"><i /><b /></span>
      <div className={styles.relayBeaconWeave} aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            className={styles.relayBeaconBand}
            data-band-axis={index % 2 === 0 ? "horizontal" : "vertical"}
            data-testid={`relay-weave-band-${index}`}
            key={index}
            style={{ "--relay-band-index": index } as React.CSSProperties}
          ><i /><b /></span>
        ))}
        <span className={styles.relayBeaconCrossings}>
          {[0, 1, 2, 3].map((index) => <i data-relation={index % 2 === 0 ? "over" : "under"} key={index} />)}
        </span>
      </div>
      <span className={styles.relayBeaconNotch} data-testid="relay-weave-notch" aria-hidden="true"><i /></span>
      <span className={styles.relayBeaconRail} aria-hidden="true" />
      <button
        type="button"
        className={styles.relayBeaconLamp}
        data-testid="relay-weave-beacon"
        aria-label={locale === "zh" ? "纸编织旁的可移动信标" : "Movable beacon beside the paper weave"}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, startBeaconX: beaconXRef.current, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dx = event.clientX - drag.x;
          if (Math.abs(dx) <= 8) return;
          drag.moved = true;
          const sceneWidth = sceneRef.current?.getBoundingClientRect().width ?? 0;
          moveBeacon(drag.startBeaconX + (sceneWidth > 0 ? dx / sceneWidth * 100 : dx / 3), "pointer-beacon");
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || !drag.moved || visibleSolved) return;
          const sceneWidth = sceneRef.current?.getBoundingClientRect().width ?? 0;
          const dx = event.clientX - drag.x;
          moveBeacon(drag.startBeaconX + (sceneWidth > 0 ? dx / sceneWidth * 100 : dx / 3), "pointer-beacon", true);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = beaconXRef.current + (event.key === "ArrowRight" ? 12 : -12);
          moveBeacon(next, "keyboard-beacon", Math.abs(next - targetX) <= 8);
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.relayBeaconBeam} aria-hidden="true" />
      <span className={styles.relayBeaconSeal} aria-hidden="true" />
    </div>
  );
}

function LightDrag(props: ControllerProps) {
  return props.level.id === 5
    ? <AmberBalance {...props} />
    : props.level.id === 57
      ? <FiveBitLatch {...props} />
      : props.level.id === 75
      ? <RelayBeaconWeave {...props} />
      : props.level.id === 94
        ? <BeaconSaturation {...props} />
        : <DragRelation {...props} kind="light-drag" />;
}

function OutsideFrame({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [progress, setProgress] = useState(0);
  const [shadowStretched, setShadowStretched] = useState(false);
  const progressRef = useRef(0);
  const frameStart = useRef<{ x: number; progress: number } | null>(null);
  const shadowStart = useRef<number | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const armedAtEdge = useRef(false);

  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
  }, []);

  const rejectShadow = () => {
    onDiscover();
    setShadowStretched(true);
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => {
      feedbackTimer.current = null;
      setShadowStretched(false);
    }, 180);
  };

  const moveFrame = (next: number) => {
    const bounded = Math.max(0, Math.min(100, next));
    if (Math.abs(bounded - progressRef.current) > 2) onDiscover();
    progressRef.current = bounded;
    setProgress(bounded);
    if (bounded >= 76 && !armedAtEdge.current) {
      armedAtEdge.current = true;
      onArm();
    }
  };

  const effectiveProgress = solved ? 80 : progress;

  return (
    <div
      className={`${styles.outsideFrameScene} ${shadowStretched ? styles.outsideShadowWrong : ""}`}
      data-controller="frame-drag"
      data-frame-progress={Math.round(effectiveProgress)}
      data-shadow-stretched={shadowStretched ? "true" : "false"}
      data-spatial-model="page-edge-window"
      data-testid="v2-scene-007"
    >
      <span className={styles.outsidePageEdge} aria-hidden="true" />
      <div className={styles.outsideFrameLane} data-testid="window-lane-007">
        <button
          type="button"
          className={styles.outsideWindowFrame}
          aria-label={locale === "zh" ? "空窗框" : "Empty window frame"}
          style={{ "--frame-progress": `${effectiveProgress}%` } as React.CSSProperties}
          onClick={() => undefined}
          onPointerDown={(event) => {
            frameStart.current = { x: event.clientX, progress: progressRef.current };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = frameStart.current;
            const lane = event.currentTarget.parentElement?.getBoundingClientRect();
            if (!start || !lane || lane.width <= 0) return;
            moveFrame(start.progress + (event.clientX - start.x) / lane.width * 100);
          }}
          onPointerUp={() => { frameStart.current = null; }}
          onPointerCancel={() => { frameStart.current = null; }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();
            const direction = event.key === "ArrowRight" ? 20 : -20;
            moveFrame(progressRef.current + direction);
            if (direction < 0) rejectShadow();
          }}
        ><span aria-hidden="true"><i /><i /></span></button>
        <button
          type="button"
          className={styles.outsideWindowShadow}
          aria-label={locale === "zh" ? "框外窗影" : "Window shadow beyond the page"}
          onClick={rejectShadow}
          onPointerDown={(event) => {
            shadowStart.current = event.clientX;
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (shadowStart.current !== null && Math.abs(event.clientX - shadowStart.current) > 8) rejectShadow();
          }}
          onPointerUp={() => { shadowStart.current = null; }}
          onPointerCancel={() => { shadowStart.current = null; }}
        ><span aria-hidden="true"><i /><i /></span></button>
      </div>
    </div>
  );
}

function FourfoldOscillation({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-window" | "keyboard-window";
  type Point = { x: number; y: number };
  const origins: Point[] = [{ x: 22, y: 27 }, { x: 78, y: 27 }, { x: 24, y: 74 }, { x: 77, y: 73 }];
  const phases = ["same", "same", "counter", "same"] as const;
  const center = { x: 50, y: 50 };
  const [positions, setPositions] = useState<Point[]>(solved ? origins.map((point, index) => index === 2 ? center : point) : origins);
  const positionsRef = useRef(positions);
  const [trails, setTrails] = useState([false, false, false, false]);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [lastPhase, setLastPhase] = useState<"none" | "same" | "counter">(solved ? "counter" : "none");
  const [amplitude, setAmplitude] = useState<"breathing" | "moving" | "reinforced" | "cancelled">(solved ? "cancelled" : "breathing");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Record<number, { pointerId: number; x: number; y: number; start: Point; moved: boolean }>>({});
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const atCenter = (point: Point) => Math.abs(point.x - center.x) <= 12 && Math.abs(point.y - center.y) <= 12;
  const updatePosition = (index: number, point: Point, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    const clamped = { x: Math.max(12, Math.min(88, point.x)), y: Math.max(16, Math.min(84, point.y)) };
    const next = positionsRef.current.map((current, position) => position === index ? clamped : current);
    positionsRef.current = next;
    setPositions(next);
    setTrails((current) => current.map((visible, position) => position === index ? true : visible));
    setInputMode(mode);
    setLastPhase(phases[index]);
    setAmplitude(atCenter(clamped) && phases[index] === "same" ? "reinforced" : "moving");
    discover();
    return clamped;
  };
  const finish = (index: number, point: Point, mode: Exclude<InputMode, "none">) => {
    const clamped = updatePosition(index, point, mode);
    if (!clamped || !atCenter(clamped)) return;
    if (phases[index] !== "counter") {
      positionsRef.current = positionsRef.current.map((current, position) => position === index ? origins[index] : current);
      setPositions(positionsRef.current);
      setAmplitude("reinforced");
      return;
    }
    if (solved || armedRef.current) return;
    armedRef.current = true;
    positionsRef.current = positionsRef.current.map((current, position) => position === index ? center : current);
    setPositions(positionsRef.current);
    setAmplitude("cancelled");
    setCompleted(true);
    onArm();
  };

  const visibleSolved = solved || completed;
  const visiblePositions = visibleSolved ? origins.map((point, index) => index === 2 ? center : point) : positions;

  return (
    <div
      ref={sceneRef}
      className={styles.fourfoldScene}
      data-amplitude={visibleSolved ? "cancelled" : amplitude}
      data-center-state={visibleSolved ? "filled" : "empty"}
      data-controller="frame-drag"
      data-input-mode={inputMode}
      data-last-phase={visibleSolved ? "counter" : lastPhase}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-spatial-model="four-breathing-windows-one-counter-phase-center-cancellation"
      data-testid="v2-scene-078"
      data-trail-pattern={trails.map((visible) => visible ? 1 : 0).join("")}
      data-window-colors="same,same,same,same"
    >
      <span className={styles.fourfoldPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.fourfoldCenter} data-testid="oscillation-center-slot" aria-hidden="true"><i /><b /></span>
      {visiblePositions.map((position, index) => (
        <Fragment key={index}>
          <span
            className={styles.fourfoldTrail}
            data-phase={phases[index]}
            data-testid={`oscillation-trail-${index}`}
            data-visible={trails[index] ? "true" : "false"}
            aria-hidden="true"
            style={{ "--fourfold-origin-x": `${origins[index].x}%`, "--fourfold-origin-y": `${origins[index].y}%` } as React.CSSProperties}
          ><i /></span>
          <button
            type="button"
            className={styles.fourfoldWindow}
            data-phase={phases[index]}
            data-testid={`oscillation-window-${index}`}
            aria-label={locale === "zh" ? `半透明纸窗 ${index + 1}` : `Translucent paper window ${index + 1}`}
            style={{ "--fourfold-x": `${position.x}%`, "--fourfold-y": `${position.y}%` } as React.CSSProperties}
            onClick={() => undefined}
            onPointerDown={(event) => {
              if (visibleSolved) return;
              dragRef.current[index] = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: positionsRef.current[index], moved: false };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current[index];
              if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
              const dx = event.clientX - drag.x;
              const dy = event.clientY - drag.y;
              if (Math.hypot(dx, dy) <= 8) return;
              drag.moved = true;
              const rect = sceneRef.current?.getBoundingClientRect();
              updatePosition(index, {
                x: drag.start.x + (rect?.width ? dx / rect.width * 100 : dx / 3),
                y: drag.start.y + (rect?.height ? dy / rect.height * 100 : dy / 3),
              }, "pointer-window");
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current[index];
              delete dragRef.current[index];
              if (!drag || drag.pointerId !== event.pointerId || !drag.moved || visibleSolved) return;
              const rect = sceneRef.current?.getBoundingClientRect();
              finish(index, {
                x: drag.start.x + (rect?.width ? (event.clientX - drag.x) / rect.width * 100 : (event.clientX - drag.x) / 3),
                y: drag.start.y + (rect?.height ? (event.clientY - drag.y) / rect.height * 100 : (event.clientY - drag.y) / 3),
              }, "pointer-window");
            }}
            onPointerCancel={() => { delete dragRef.current[index]; }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              finish(index, center, "keyboard-window");
            }}
          ><span aria-hidden="true"><i /><b /></span></button>
        </Fragment>
      ))}
      <span className={styles.fourfoldSeal} aria-hidden="true" />
    </div>
  );
}

function FrameDrag(props: ControllerProps) {
  return props.level.id === 7
    ? <OutsideFrame {...props} />
    : props.level.id === 78
      ? <FourfoldOscillation {...props} />
      : <DragRelation {...props} kind="frame-drag" />;
}

function BreathGap({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [quietPhase, setQuietPhase] = useState<"closed" | "breathing" | "revealed">("closed");
  const [ready, setReady] = useState(false);
  const [holding, setHolding] = useState(false);
  const [disturbed, setDisturbed] = useState(false);
  const [releasedEarly, setReleasedEarly] = useState(false);
  const readyRef = useRef(false);
  const holdingRef = useRef(false);
  const discoverRef = useRef(onDiscover);
  const armRef = useRef(onArm);
  const holdTimer = useRef<number | null>(null);
  useEffect(() => {
    discoverRef.current = onDiscover;
    armRef.current = onArm;
  }, [onArm, onDiscover]);

  const cancelHold = useCallback((markReleased = true) => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (markReleased && holdingRef.current) setReleasedEarly(true);
    holdingRef.current = false;
    setHolding(false);
  }, []);

  const startHold = () => {
    if (!readyRef.current || solved || holdingRef.current) return;
    setReleasedEarly(false);
    holdingRef.current = true;
    setHolding(true);
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      holdingRef.current = false;
      setHolding(false);
      armRef.current();
    }, 1_200);
  };

  useEffect(() => {
    if (solved) return;
    let warmRemaining = 1_000;
    let revealRemaining = 2_500;
    let activeSince: number | null = null;
    let warmTimer: number | null = null;
    let revealTimer: number | null = null;
    let disturbedTimer: number | null = null;

    const clearQuietTimers = () => {
      if (warmTimer !== null) window.clearTimeout(warmTimer);
      if (revealTimer !== null) window.clearTimeout(revealTimer);
      warmTimer = null;
      revealTimer = null;
    };
    const scheduleQuiet = () => {
      if (readyRef.current || document.hidden || activeSince !== null) return;
      activeSince = performance.now();
      if (warmRemaining > 0) {
        warmTimer = window.setTimeout(() => {
          warmRemaining = 0;
          warmTimer = null;
          setQuietPhase("breathing");
        }, warmRemaining);
      }
      revealTimer = window.setTimeout(() => {
        revealRemaining = 0;
        revealTimer = null;
        activeSince = null;
        readyRef.current = true;
        setQuietPhase("revealed");
        setReady(true);
        discoverRef.current();
      }, revealRemaining);
    };
    const pauseQuiet = () => {
      if (activeSince === null || readyRef.current) return;
      const elapsed = performance.now() - activeSince;
      warmRemaining = Math.max(0, warmRemaining - elapsed);
      revealRemaining = Math.max(0, revealRemaining - elapsed);
      activeSince = null;
      clearQuietTimers();
    };
    const resetQuiet = () => {
      if (readyRef.current) return;
      clearQuietTimers();
      activeSince = null;
      warmRemaining = 1_000;
      revealRemaining = 2_500;
      setQuietPhase("closed");
      setDisturbed(true);
      if (disturbedTimer !== null) window.clearTimeout(disturbedTimer);
      disturbedTimer = window.setTimeout(() => setDisturbed(false), 180);
      scheduleQuiet();
    };
    const handleVisibility = () => {
      if (document.hidden) pauseQuiet();
      else scheduleQuiet();
    };

    window.addEventListener("pointerdown", resetQuiet, true);
    window.addEventListener("keydown", resetQuiet, true);
    window.addEventListener("wheel", resetQuiet, { capture: true, passive: true });
    window.addEventListener("touchstart", resetQuiet, { capture: true, passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    scheduleQuiet();

    return () => {
      clearQuietTimers();
      if (disturbedTimer !== null) window.clearTimeout(disturbedTimer);
      window.removeEventListener("pointerdown", resetQuiet, true);
      window.removeEventListener("keydown", resetQuiet, true);
      window.removeEventListener("wheel", resetQuiet, true);
      window.removeEventListener("touchstart", resetQuiet, true);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [solved]);

  useEffect(() => {
    const cancelForBlur = () => cancelHold(true);
    window.addEventListener("blur", cancelForBlur);
    return () => {
      window.removeEventListener("blur", cancelForBlur);
      cancelHold(false);
    };
  }, [cancelHold]);

  return (
    <div
      className={`${styles.breathGapScene} ${styles[`breath_${quietPhase}`]} ${holding ? styles.isHolding : ""} ${disturbed ? styles.isDisturbed : ""} ${releasedEarly ? styles.wasReleased : ""}`}
      data-controller="patient-hold"
      data-discovery-state={quietPhase}
      data-testid="v2-scene-002"
    >
      <span className={styles.breathGapLeaf} aria-hidden="true" />
      <span className={styles.breathGapLeaf} aria-hidden="true" />
      {ready ? <button
        type="button"
        className={styles.breathGapCore}
        aria-label={locale === "zh" ? "安静的气泡" : "Quiet bubble"}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          startHold();
        }}
        onPointerUp={() => cancelHold(true)}
        onPointerCancel={() => cancelHold(true)}
        onKeyDown={(event) => {
          if (event.key !== " " || event.repeat) return;
          event.preventDefault();
          startHold();
        }}
        onKeyUp={(event) => {
          if (event.key === " ") cancelHold(true);
        }}
      /> : null}
    </div>
  );
}

function GenericPatientHold({ level, locale, onDiscover, onArm }: ControllerProps) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | null>(null);
  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
    onDiscover();
  };
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  return (
    <div className={`${styles.breathBoard} ${styles.isReady} ${holding ? styles.isHolding : ""}`} data-controller="patient-hold">
      <span className={styles.breathLeaf} aria-hidden="true" /><span className={styles.breathLeaf} aria-hidden="true" />
      <button
        type="button"
        className={styles.breathCore}
        aria-label={locale === "zh" ? "按住安静的中心" : "Hold the quiet center"}
        onPointerDown={() => {
          setHolding(true); onDiscover();
          timer.current = window.setTimeout(onArm, level.id === 12 ? 1_400 : 1_000);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={(event) => {
          if (event.key !== " " || event.repeat) return;
          event.preventDefault(); setHolding(true); onDiscover();
          timer.current = window.setTimeout(onArm, level.id === 12 ? 1_400 : 1_000);
        }}
        onKeyUp={(event) => { if (event.key === " ") stop(); }}
      />
    </div>
  );
}

function SameFaceRelay({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [phaseGap, setPhaseGap] = useState(5);
  const [holding, setHolding] = useState(false);
  const [couplingSeen, setCouplingSeen] = useState(false);
  const [delayedLeaf, setDelayedLeaf] = useState<"left" | "right" | null>(null);
  const phaseGapRef = useRef(5);
  const holdingRef = useRef(false);
  const armedRef = useRef(false);
  const progressTimer = useRef<number | null>(null);
  const stableTimer = useRef<number | null>(null);
  const echoTimer = useRef<number | null>(null);

  const clearProgressTimers = useCallback(() => {
    if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
    if (stableTimer.current !== null) window.clearTimeout(stableTimer.current);
    progressTimer.current = null;
    stableTimer.current = null;
  }, []);

  const cancelHold = useCallback(() => {
    if (armedRef.current || solved) return;
    clearProgressTimers();
    holdingRef.current = false;
    phaseGapRef.current = 5;
    setHolding(false);
    setPhaseGap(5);
  }, [clearProgressTimers, solved]);

  const beginHold = useCallback(() => {
    if (holdingRef.current || armedRef.current || solved) return;
    onDiscover();
    clearProgressTimers();
    holdingRef.current = true;
    setHolding(true);
    progressTimer.current = window.setInterval(() => {
      const next = Math.max(0, phaseGapRef.current - 1);
      phaseGapRef.current = next;
      setPhaseGap(next);
      if (next !== 0) return;
      if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
      progressTimer.current = null;
      stableTimer.current = window.setTimeout(() => {
        stableTimer.current = null;
        armedRef.current = true;
        holdingRef.current = false;
        setHolding(false);
        onArm();
      }, 300);
    }, 160);
  }, [clearProgressTimers, onArm, onDiscover, solved]);

  const touchLeaf = (side: "left" | "right") => {
    if (solved) return;
    onDiscover();
    setCouplingSeen(true);
    setDelayedLeaf(side === "left" ? "right" : "left");
    if (echoTimer.current !== null) window.clearTimeout(echoTimer.current);
    echoTimer.current = window.setTimeout(() => {
      echoTimer.current = null;
      setDelayedLeaf(null);
    }, 240);
  };

  useEffect(() => () => {
    clearProgressTimers();
    if (echoTimer.current !== null) window.clearTimeout(echoTimer.current);
  }, [clearProgressTimers]);

  return (
    <div
      className={`${styles.sameFaceRelayScene} ${holding ? styles.sameFaceHolding : ""} ${solved ? styles.sameFaceSolved : ""}`}
      data-controller="patient-hold"
      data-spatial-model="coupled-leaves"
      data-coupling-seen={couplingSeen}
      data-phase-gap={phaseGap}
      data-testid="v2-scene-011"
      style={{ "--phase-gap": phaseGap } as React.CSSProperties}
    >
      <div className={styles.sameFacePair}>
        <button
          type="button"
          className={`${styles.sameFaceLeaf} ${styles.sameFaceLeft} ${delayedLeaf === "left" ? styles.sameFaceDelayed : ""}`}
          aria-label={locale === "zh" ? "左侧纸叶" : "Left paper leaf"}
          onClick={() => touchLeaf("left")}
        ><span aria-hidden="true"><i /><b /></span></button>
        <button
          type="button"
          className={styles.sameFaceAxis}
          aria-label={locale === "zh" ? "中央纸轴" : "Central paper axis"}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            beginHold();
          }}
          onPointerUp={cancelHold}
          onPointerCancel={cancelHold}
          onKeyDown={(event) => {
            if (event.key !== " " || event.repeat) return;
            event.preventDefault();
            beginHold();
          }}
          onKeyUp={(event) => {
            if (event.key !== " ") return;
            event.preventDefault();
            cancelHold();
          }}
        ><span aria-hidden="true" /></button>
        <button
          type="button"
          className={`${styles.sameFaceLeaf} ${styles.sameFaceRight} ${delayedLeaf === "right" ? styles.sameFaceDelayed : ""}`}
          aria-label={locale === "zh" ? "右侧纸叶" : "Right paper leaf"}
          onClick={() => touchLeaf("right")}
        ><span aria-hidden="true"><i /><b /></span></button>
      </div>
    </div>
  );
}

function PressureEcho({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [pressureStep, setPressureStep] = useState(0);
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null);
  const stepRef = useRef(0);
  const holdingRef = useRef(false);
  const armedRef = useRef(false);
  const progressTimer = useRef<number | null>(null);
  const equalTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
    if (equalTimer.current !== null) window.clearTimeout(equalTimer.current);
    progressTimer.current = null;
    equalTimer.current = null;
  }, []);

  const release = useCallback(() => {
    if (armedRef.current || solved) return;
    clearTimers();
    holdingRef.current = false;
    stepRef.current = 0;
    setPressureStep(0);
    setActiveSide(null);
  }, [clearTimers, solved]);

  const press = useCallback((side: "left" | "right") => {
    if (holdingRef.current || armedRef.current || solved) return;
    onDiscover();
    clearTimers();
    holdingRef.current = true;
    stepRef.current = 0;
    setPressureStep(0);
    setActiveSide(side);
    progressTimer.current = window.setInterval(() => {
      const next = Math.min(5, stepRef.current + 1);
      stepRef.current = next;
      setPressureStep(next);
      if (next !== 5) return;
      if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
      progressTimer.current = null;
      equalTimer.current = window.setTimeout(() => {
        equalTimer.current = null;
        armedRef.current = true;
        holdingRef.current = false;
        onArm();
      }, 700);
    }, 140);
  }, [clearTimers, onArm, onDiscover, solved]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const waveState = pressureStep === 0 ? "separated" : pressureStep < 5 ? "responding" : "equal";
  const renderDisc = (side: "left" | "right") => (
    <button
      type="button"
      className={`${styles.pressureDisc} ${side === "left" ? styles.pressureLeft : styles.pressureRight}`}
      aria-label={locale === "zh" ? `${side === "left" ? "左侧" : "右侧"}压力圆盘` : `${side === "left" ? "Left" : "Right"} pressure disc`}
      data-active={activeSide === side}
      data-responding={activeSide !== null && activeSide !== side && pressureStep > 0}
      data-testid={`pressure-disc-${side}-012`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        press(side);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={(event) => {
        if (event.key !== " " || event.repeat) return;
        event.preventDefault();
        press(side);
      }}
      onKeyUp={(event) => {
        if (event.key !== " ") return;
        event.preventDefault();
        release();
      }}
    ><span aria-hidden="true"><i /><b /></span></button>
  );

  return (
    <div
      className={`${styles.pressureEchoScene} ${waveState === "equal" ? styles.pressureEqual : ""} ${solved ? styles.pressureSolved : ""}`}
      data-controller="patient-hold"
      data-spatial-model="delayed-pressure-pair"
      data-pressure-step={pressureStep}
      data-wave-state={waveState}
      data-testid="v2-scene-012"
      style={{ "--pressure-step": pressureStep } as React.CSSProperties}
    >
      {renderDisc("left")}
      {renderDisc("right")}
    </div>
  );
}

const offbeatHoldCycleMs = 1_600;
const offbeatPetalIndex = 2;

function OffbeatPetal({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [holdingIndex, setHoldingIndex] = useState<number | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [quickReleases, setQuickReleases] = useState(0);
  const [centerStable, setCenterStable] = useState(false);
  const holdingRef = useRef<number | null>(null);
  const armedRef = useRef(false);
  const progressTimer = useRef<number | null>(null);
  const armTimer = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (progressTimer.current !== null) window.clearInterval(progressTimer.current);
    if (armTimer.current !== null) window.clearTimeout(armTimer.current);
    progressTimer.current = null;
    armTimer.current = null;
  }, []);

  const release = useCallback(() => {
    if (armedRef.current || solved || holdingRef.current === null) return;
    clearTimers();
    holdingRef.current = null;
    setHoldingIndex(null);
    setHoldProgress(0);
    setQuickReleases((current) => current + 1);
  }, [clearTimers, solved]);

  const beginHold = useCallback((index: number) => {
    if (armedRef.current || solved || holdingRef.current !== null) return;
    clearTimers();
    onDiscover();
    holdingRef.current = index;
    setHoldingIndex(index);
    setHoldProgress(0);
    if (index !== offbeatPetalIndex) return;
    progressTimer.current = window.setInterval(() => {
      setHoldProgress((current) => Math.min(8, current + 1));
    }, offbeatHoldCycleMs / 8);
    armTimer.current = window.setTimeout(() => {
      clearTimers();
      armedRef.current = true;
      setHoldProgress(8);
      setCenterStable(true);
      onArm();
    }, offbeatHoldCycleMs);
  }, [clearTimers, onArm, onDiscover, solved]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const rhythm = centerStable || solved
    ? "stable"
    : holdingIndex === null
      ? "observing"
      : holdingIndex === offbeatPetalIndex
        ? "stabilizing"
        : "chaotic";

  return (
    <div
      className={styles.offbeatPetalScene}
      data-center={centerStable || solved ? "stable" : "open"}
      data-controller="patient-hold"
      data-hold-cycle-ms={offbeatHoldCycleMs}
      data-hold-progress={holdProgress}
      data-offbeat-index={offbeatPetalIndex}
      data-phase-model="three-same-one-opposite"
      data-quick-releases={quickReleases}
      data-rhythm={rhythm}
      data-spatial-model="four-petals-with-one-opposite-phase"
      data-testid="v2-scene-028"
      style={{ "--petal-progress": holdProgress } as React.CSSProperties}
    >
      <span className={styles.offbeatCenter} aria-hidden="true"><i /><b /></span>
      {[0, 1, 2, 3].map((index) => (
        <button
          type="button"
          key={index}
          className={styles.offbeatPetal}
          aria-label={locale === "zh" ? `纸瓣 ${index + 1}` : `Paper petal ${index + 1}`}
          data-held={holdingIndex === index}
          data-index={index}
          data-phase={index === offbeatPetalIndex ? "opposite" : "same"}
          style={{ "--petal-angle": `${index * 90}deg` } as React.CSSProperties}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            beginHold(index);
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyDown={(event) => {
            if (event.key !== " " || event.repeat) return;
            event.preventDefault();
            beginHold(index);
          }}
          onKeyUp={(event) => {
            if (event.key !== " ") return;
            event.preventDefault();
            release();
          }}
        ><span aria-hidden="true"><i /></span></button>
      ))}
    </div>
  );
}

function DeepPressure({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [quietCycle, setQuietCycle] = useState(0);
  const [ripplePhase, setRipplePhase] = useState<"moving" | "disturbed" | "settling" | "stable">("moving");
  const [directPresses, setDirectPresses] = useState(0);
  const [disturbances, setDisturbances] = useState(0);
  const [holdState, setHoldState] = useState<"idle" | "holding" | "released-early" | "complete">("idle");
  const [inputMode, setInputMode] = useState<"none" | "stone-press" | "early-shadow" | "pointer-shadow" | "keyboard-shadow">("none");
  const [completed, setCompleted] = useState(false);
  const readyRef = useRef(false);
  const holdingRef = useRef(false);
  const armedRef = useRef(false);
  const discoverRef = useRef(onDiscover);
  const armRef = useRef(onArm);
  const holdTimer = useRef<number | null>(null);

  useEffect(() => {
    discoverRef.current = onDiscover;
    armRef.current = onArm;
  }, [onArm, onDiscover]);

  const cancelHold = useCallback((releasedEarly = true) => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (releasedEarly && holdingRef.current) setHoldState("released-early");
    holdingRef.current = false;
  }, []);

  const disturb = useCallback(() => {
    if (armedRef.current || solved) return;
    cancelHold(false);
    readyRef.current = false;
    setRipplePhase("disturbed");
    setHoldState("idle");
    setDisturbances((count) => count + 1);
    setQuietCycle((cycle) => cycle + 1);
  }, [cancelHold, solved]);

  const beginHold = (mode: "pointer-shadow" | "keyboard-shadow") => {
    if (!readyRef.current || holdingRef.current || armedRef.current || solved) {
      if (!readyRef.current) setInputMode("early-shadow");
      return;
    }
    setInputMode(mode);
    setHoldState("holding");
    holdingRef.current = true;
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      holdingRef.current = false;
      armedRef.current = true;
      setCompleted(true);
      setHoldState("complete");
      armRef.current();
    }, 900);
  };

  useEffect(() => {
    if (solved || armedRef.current) return;
    readyRef.current = false;
    const movingTimer = window.setTimeout(() => setRipplePhase("moving"), 180);
    const settlingTimer = window.setTimeout(() => setRipplePhase("settling"), 500);
    const stableTimer = window.setTimeout(() => {
      readyRef.current = true;
      setRipplePhase("stable");
      discoverRef.current();
    }, 1_300);
    return () => {
      window.clearTimeout(movingTimer);
      window.clearTimeout(settlingTimer);
      window.clearTimeout(stableTimer);
    };
  }, [quietCycle, solved]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (armedRef.current || solved) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-deep-pressure-shadow]") && readyRef.current) return;
      disturb();
    };
    const handleWheel = () => disturb();
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("wheel", handleWheel, { capture: true, passive: true });
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("wheel", handleWheel, true);
      cancelHold(false);
    };
  }, [cancelHold, disturb, solved]);

  const visibleSolved = solved || completed;
  const rippleState = visibleSolved ? "still" : ripplePhase === "stable" ? "still" : ripplePhase;
  const shadowState = visibleSolved || ripplePhase === "stable" ? "stable" : "soft";
  const stoneState = visibleSolved ? "sunk" : ripplePhase === "disturbed" && directPresses > 0 ? "raised" : "floating";
  return (
    <div
      className={styles.deepPressureScene}
      data-controller="patient-hold"
      data-direct-presses={directPresses}
      data-disturbances={disturbances}
      data-hold-ms="900"
      data-hold-state={visibleSolved ? "complete" : holdState}
      data-input-mode={inputMode}
      data-ripple-state={rippleState}
      data-settle-ms="1300"
      data-shadow-state={shadowState}
      data-spatial-model="floating-stone-ripple-shadow"
      data-stone-state={stoneState}
      data-testid="v2-scene-047"
    >
      <span className={styles.deepPressureWater} aria-hidden="true" />
      {[0, 1, 2].map((index) => <i
        key={index}
        className={styles.deepPressureRipple}
        data-testid={`deep-pressure-ripple-${index}`}
        style={{ "--deep-ripple": index } as React.CSSProperties}
        aria-hidden="true"
      />)}
      <button
        type="button"
        className={styles.deepPressureStone}
        aria-label={locale === "zh" ? "悬浮纸石" : "Floating paper stone"}
        onPointerDown={() => {
          if (visibleSolved) return;
          setDirectPresses((count) => count + 1);
          setInputMode("stone-press");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <button
        type="button"
        className={styles.deepPressureShadow}
        data-deep-pressure-shadow="true"
        aria-label={locale === "zh" ? "纸石的影子" : "Paper stone shadow"}
        onPointerDown={(event) => {
          if (!readyRef.current) {
            setInputMode("early-shadow");
            return;
          }
          event.currentTarget.setPointerCapture?.(event.pointerId);
          beginHold("pointer-shadow");
        }}
        onPointerUp={() => cancelHold(true)}
        onPointerCancel={() => cancelHold(true)}
        onKeyDown={(event) => {
          if (event.key !== " " || event.repeat) return;
          event.preventDefault();
          beginHold("keyboard-shadow");
        }}
        onKeyUp={(event) => {
          if (event.key !== " ") return;
          event.preventDefault();
          cancelHold(true);
        }}
      ><span aria-hidden="true" /></button>
    </div>
  );
}

const pauseWordLetters = ["P", "A", "U", "S", "E"] as const;

function PauseWord({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [stripPresses, setStripPresses] = useState(0);
  const [blankState, setBlankState] = useState<"flat" | "pressed" | "released-early" | "complete">("flat");
  const [inputMode, setInputMode] = useState<"none" | "text-strip" | "pointer-blank" | "keyboard-blank">("none");
  const [completed, setCompleted] = useState(false);
  const holdingRef = useRef(false);
  const armedRef = useRef(false);
  const armRef = useRef(onArm);
  const holdTimer = useRef<number | null>(null);

  useEffect(() => { armRef.current = onArm; }, [onArm]);

  const cancelHold = useCallback((releasedEarly = true) => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (releasedEarly && holdingRef.current) setBlankState("released-early");
    holdingRef.current = false;
  }, []);

  useEffect(() => () => cancelHold(false), [cancelHold]);

  const pressStrip = () => {
    if (armedRef.current || solved) return;
    setStripPresses((count) => count + 1);
    setInputMode("text-strip");
    onDiscover();
  };

  const beginBlank = (mode: "pointer-blank" | "keyboard-blank") => {
    if (armedRef.current || solved || holdingRef.current) return;
    onDiscover();
    holdingRef.current = true;
    setInputMode(mode);
    setBlankState("pressed");
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      holdingRef.current = false;
      armedRef.current = true;
      setCompleted(true);
      setBlankState("complete");
      armRef.current();
    }, 600);
  };

  const visibleSolved = solved || completed;
  return (
    <div
      className={styles.pauseWordScene}
      data-blank-state={visibleSolved ? "complete" : blankState}
      data-controller="patient-hold"
      data-hold-ms="600"
      data-input-mode={inputMode}
      data-reduced-motion-model="three-discrete-positions"
      data-spatial-model="moving-word-strips-fixed-blank"
      data-strip-count="5"
      data-strip-presses={stripPresses}
      data-strip-state={visibleSolved ? "aligned" : stripPresses > 0 ? "accelerated" : "moving"}
      data-testid="v2-scene-048"
      data-word-state={visibleSolved ? "pause" : "fragments"}
    >
      {pauseWordLetters.map((letter, index) => <button
        type="button"
        key={letter}
        className={styles.pauseWordStrip}
        aria-label={locale === "zh" ? `文字纸带 ${index + 1}` : `Word strip ${index + 1}`}
        style={{ "--pause-strip": index } as React.CSSProperties}
        onPointerDown={pressStrip}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          pressStrip();
        }}
      ><span aria-hidden="true">{letter}</span></button>)}
      <button
        type="button"
        className={styles.pauseWordBlank}
        aria-label={locale === "zh" ? "固定空白" : "Fixed blank"}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          beginBlank("pointer-blank");
        }}
        onPointerUp={() => cancelHold(true)}
        onPointerCancel={() => cancelHold(true)}
        onKeyDown={(event) => {
          if (event.key !== " " || event.repeat) return;
          event.preventDefault();
          beginBlank("keyboard-blank");
        }}
        onKeyUp={(event) => {
          if (event.key !== " ") return;
          event.preventDefault();
          cancelHold(true);
        }}
      ><span aria-hidden="true" /></button>
    </div>
  );
}

function AlternatingTarget({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type Side = "left" | "right";
  type InputMode = "none" | "pointer-chase" | "keyboard-chase" | "pointer-center" | "keyboard-center";
  const [activeTarget, setActiveTarget] = useState<Side | "none">(solved ? "none" : "left");
  const [nextTarget, setNextTarget] = useState<Side>("right");
  const [chaseCount, setChaseCount] = useState(0);
  const chaseCountRef = useRef(0);
  const [windowOpen, setWindowOpen] = useState(false);
  const windowOpenRef = useRef(false);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const swapTimerRef = useRef<number | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => () => {
    if (swapTimerRef.current !== null) window.clearTimeout(swapTimerRef.current);
  }, []);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const chase = (side: Side, mode: "pointer-chase" | "keyboard-chase") => {
    if (solved || armedRef.current) return;
    discover();
    if (swapTimerRef.current !== null) window.clearTimeout(swapTimerRef.current);
    const next = side === "left" ? "right" : "left";
    const count = chaseCountRef.current + 1;
    chaseCountRef.current = count;
    windowOpenRef.current = true;
    setChaseCount(count);
    setInputMode(mode);
    setActiveTarget("none");
    setNextTarget(next);
    setWindowOpen(true);
    swapTimerRef.current = window.setTimeout(() => {
      setActiveTarget(next);
      setWindowOpen(false);
      windowOpenRef.current = false;
      swapTimerRef.current = null;
    }, 1200);
  };
  const pressCenter = (mode: "pointer-center" | "keyboard-center") => {
    if (solved || armedRef.current || chaseCountRef.current < 2 || !windowOpenRef.current) return;
    if (swapTimerRef.current !== null) window.clearTimeout(swapTimerRef.current);
    swapTimerRef.current = null;
    armedRef.current = true;
    setInputMode(mode);
    setWindowOpen(false);
    setActiveTarget("none");
    setCompleted(true);
    onArm();
  };

  const visibleSolved = solved || completed;
  return (
    <div
      className={styles.alternatingTargetScene}
      data-active-target={visibleSolved ? "both" : activeTarget}
      data-center-lit="false"
      data-chase-count={chaseCount}
      data-controller="patient-hold"
      data-input-mode={inputMode}
      data-intersection-imprints={chaseCount}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-next-target={nextTarget}
      data-ring-state={visibleSolved ? "fixed-together" : "alternating"}
      data-spatial-model="two-alternating-target-rings-with-one-unlit-shared-intersection"
      data-testid="v2-scene-083"
      data-window-ms="1200"
      data-window-open={windowOpen && !visibleSolved ? "true" : "false"}
    >
      <span className={styles.alternatingTargetPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.alternatingTargetTrails} aria-hidden="true">
        <i data-testid="alternating-trail-0" /><i data-testid="alternating-trail-1" />
      </span>
      {(["left", "right"] as const).map((side, index) => (
        <button
          type="button"
          className={`${styles.alternatingTargetRing} ${side === "left" ? styles.alternatingTargetLeft : styles.alternatingTargetRight}`}
          data-visible={visibleSolved || activeTarget === side ? "true" : "false"}
          data-testid={`alternating-ring-${index}`}
          key={side}
          aria-label={locale === "zh" ? `${side === "left" ? "左" : "右"}侧纸环` : `${side} paper ring`}
          onClick={() => chase(side, "pointer-chase")}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            chase(side, "keyboard-chase");
          }}
        ><span aria-hidden="true"><i /></span></button>
      ))}
      <button
        type="button"
        className={styles.alternatingSharedCenter}
        data-testid="alternating-shared-center"
        aria-label={locale === "zh" ? "轨迹交会处的空白" : "Blank intersection of the paper trails"}
        onClick={() => pressCenter("pointer-center")}
        onKeyDown={(event) => {
          if (event.key !== " ") return;
          event.preventDefault();
          pressCenter("keyboard-center");
        }}
      >{Array.from({ length: Math.min(4, chaseCount) }, (_, index) => <i aria-hidden="true" key={index} />)}</button>
      <span className={styles.alternatingTargetSeal} aria-hidden="true" />
    </div>
  );
}

function PatientHold(props: ControllerProps) {
  if (props.level.id === 2) return <BreathGap {...props} />;
  if (props.level.id === 11) return <SameFaceRelay {...props} />;
  if (props.level.id === 12) return <PressureEcho {...props} />;
  if (props.level.id === 28) return <OffbeatPetal {...props} />;
  if (props.level.id === 47) return <DeepPressure {...props} />;
  if (props.level.id === 48) return <PauseWord {...props} />;
  if (props.level.id === 83) return <AlternatingTarget {...props} />;
  return <GenericPatientHold {...props} />;
}

const WORD_COLUMNS = [["F", "T", "S", "R"], ["A", "I", "L", "E"], ["S", "M", "O", "N"], ["T", "E", "W", "R"]] as const;
function WordShift({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [letters, setLetters] = useState(["F", "A", "S", "T"]);
  const pointerStarts = useRef<Record<number, number>>({});
  useEffect(() => {
    if (letters.join("") !== "SLOW") return;
    const timer = window.setTimeout(onArm, 400);
    return () => window.clearTimeout(timer);
  }, [letters, onArm]);
  const turn = (index: number, direction = 1) => {
    onDiscover();
    setLetters((current) => current.map((letter, position) => {
      if (position !== index) return letter;
      const column = WORD_COLUMNS[index];
      return column[(Math.max(0, column.indexOf(letter as never)) + direction + column.length) % column.length];
    }));
  };
  const visible = solved ? ["S", "L", "O", "W"] : letters;
  return <div className={styles.slowWordScene} data-controller="word-shift" data-testid="v2-scene-003" aria-label={locale === "zh" ? "四块漂动的字牌" : "Four drifting letter tiles"}>
    <span className={styles.slowWordShadow} aria-hidden="true">{visible.map((letter, index) => letter === "SLOW"[index] ? letter : "·").join("")}</span>
    <div className={styles.slowWordTiles} data-testid="slow-word-tiles-003">{visible.map((letter, index) => <button
      type="button"
      key={index}
      className={letter === "SLOW"[index] ? styles.isLetterRight : ""}
      data-correct={letter === "SLOW"[index] ? "true" : "false"}
      style={{ "--tile-index": index } as React.CSSProperties}
      aria-label={locale === "zh" ? `字牌 ${index + 1}：${letter}` : `Letter ${index + 1}: ${letter}`}
      onClick={() => turn(index)}
      onWheel={(event) => { event.preventDefault(); turn(index, event.deltaY >= 0 ? 1 : -1); }}
      onPointerDown={(event) => {
        pointerStarts.current[index] = event.clientY;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        const start = pointerStarts.current[index];
        delete pointerStarts.current[index];
        if (start === undefined || Math.abs(event.clientY - start) < 18) return;
        turn(index, event.clientY < start ? 1 : -1);
      }}
      onPointerCancel={() => { delete pointerStarts.current[index]; }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault(); turn(index, event.key === "ArrowDown" ? 1 : -1);
      }}
    ><span>{letter}</span><i aria-hidden="true" /></button>)}</div>
  </div>;
}

type MirroredBand = "en" | "zh";

function MirroredInput({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [mirrorOffset, setMirrorOffset] = useState(-2);
  const [mirrorState, setMirrorState] = useState<"resting" | "linked">("resting");
  const [inputMode, setInputMode] = useState<"none" | "pointer-bands" | "keyboard-bands">("none");
  const [completed, setCompleted] = useState(false);
  const mirrorOffsetRef = useRef(-2);
  const dragRef = useRef<{
    band: MirroredBand;
    pointerId: number;
    startOffset: number;
    startX: number;
    moved: boolean;
  } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const normalizeOffset = (value: number) => {
    const bounded = Math.max(-2, Math.min(2, Math.round(value * 10) / 10));
    return Object.is(bounded, -0) ? 0 : bounded;
  };

  const announceDiscovery = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const writeOffset = (value: number, mode: "pointer-bands" | "keyboard-bands") => {
    const next = normalizeOffset(value);
    mirrorOffsetRef.current = next;
    setMirrorOffset(next);
    setMirrorState("linked");
    setInputMode(mode);
    announceDiscovery();
    return next;
  };

  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    mirrorOffsetRef.current = 0;
    setMirrorOffset(0);
    setCompleted(true);
    onArm();
  };

  const moveFromPointer = (clientX: number) => {
    const drag = dragRef.current;
    if (!drag) return mirrorOffsetRef.current;
    const delta = clientX - drag.startX;
    if (Math.abs(delta) <= 12 && !drag.moved) return drag.startOffset;
    drag.moved = true;
    const direction = drag.band === "en" ? 1 : -1;
    return writeOffset(drag.startOffset + direction * delta / 50, "pointer-bands");
  };

  const finishPointer = (clientX: number, pointerId: number) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== pointerId) return;
    const next = moveFromPointer(clientX);
    dragRef.current = null;
    if (drag.moved && Math.abs(next) <= 0.35) complete();
  };

  const moveFromKeyboard = (band: MirroredBand, key: string) => {
    if (key !== "ArrowLeft" && key !== "ArrowRight") return false;
    const physicalDirection = key === "ArrowRight" ? 1 : -1;
    const mirroredDirection = band === "en" ? physicalDirection : -physicalDirection;
    const next = writeOffset(mirrorOffsetRef.current + mirroredDirection, "keyboard-bands");
    if (Math.abs(next) <= 0.35) complete();
    return true;
  };

  const visibleOffset = solved || completed ? 0 : mirrorOffset;
  const enBandX = Math.round((50 + visibleOffset * 15) * 10) / 10;
  const zhBandX = Math.round((50 - visibleOffset * 15) * 10) / 10;
  const bothCorrect = Math.abs(visibleOffset) <= 0.35;
  const enCorrect = bothCorrect || visibleOffset >= 0.7;
  const zhCorrect = bothCorrect || visibleOffset <= -0.7;

  const band = (language: MirroredBand) => {
    const isEnglish = language === "en";
    const x = isEnglish ? enBandX : zhBandX;
    const label = locale === "zh"
      ? isEnglish ? "英文句带标点" : "中文句带标点"
      : isEnglish ? "English sentence punctuation" : "Chinese sentence punctuation";
    return (
      <button
        type="button"
        className={`${styles.mirroredInputBand} ${isEnglish ? styles.mirroredInputBandEn : styles.mirroredInputBandZh}`}
        data-band={language}
        data-correct={(isEnglish ? enCorrect : zhCorrect) ? "true" : "false"}
        data-testid={`mirrored-input-band-${language}`}
        aria-label={label}
        style={{ "--mirrored-band-x": `${x}%` } as React.CSSProperties}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          dragRef.current = {
            band: language,
            pointerId: event.pointerId,
            startOffset: mirrorOffsetRef.current,
            startX: event.clientX,
            moved: false,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (dragRef.current?.pointerId !== event.pointerId) return;
          moveFromPointer(event.clientX);
        }}
        onPointerUp={(event) => finishPointer(event.clientX, event.pointerId)}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (!moveFromKeyboard(language, event.key)) return;
          event.preventDefault();
        }}
      >
        <span className={styles.mirroredInputWords} aria-hidden="true">
          {isEnglish ? <><i>TIME</i><i>STOPS</i><i>HERE</i></> : <><i>时</i><i>间</i><i>停</i><i>在</i><i>这</i><i>里</i></>}
        </span>
        <b className={styles.mirroredInputPunctuation} aria-hidden="true">{isEnglish ? "?" : "。"}</b>
        <span
          className={styles.mirroredInputDirection}
          data-testid={`mirrored-input-direction-${language}`}
          aria-hidden="true"
        >{isEnglish ? "→" : "←"}</span>
      </button>
    );
  };

  return (
    <div
      className={styles.mirroredInputScene}
      data-band-count="2"
      data-controller="layer-stack"
      data-en-band-x={enBandX}
      data-en-ending={enCorrect ? "correct" : "wrong"}
      data-input-mode={inputMode}
      data-mirror-offset={visibleOffset}
      data-mirror-state={mirrorState}
      data-shared-slot={bothCorrect ? "filled" : "open"}
      data-spatial-model="bilingual-mirrored-sentence-bands"
      data-testid="v2-scene-050"
      data-zh-band-x={zhBandX}
      data-zh-ending={zhCorrect ? "correct" : "wrong"}
    >
      <span className={styles.mirroredInputPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.mirroredInputSlot} data-testid="mirrored-input-slot" aria-hidden="true"><i /></span>
      {band("en")}
      {band("zh")}
    </div>
  );
}

function GenericLayerStack({ level, locale, solved, onDiscover, onArm, kind = "layer-stack" }: ControllerProps & { kind?: V2ControllerKind }) {
  const [positions, setPositions] = useState([0, 0, 0]);
  const starts = useRef<Record<number, number>>({});
  const move = (index: number, amount: number) => {
    onDiscover();
    setPositions((current) => current.map((value, position) => position === index ? Math.max(0, Math.min(2, value + amount)) : value));
  };
  useEffect(() => {
    if (positions.every((position) => position === 2)) onArm();
  }, [onArm, positions]);
  return <div className={`${styles.layerBoard} ${styles[`kind_${kind}`]}`} data-controller={kind}>{positions.map((position, index) => <button
    type="button" key={index} aria-label={locale === "zh" ? `纸层 ${index + 1}` : `Paper layer ${index + 1}`}
    className={solved || position === 2 ? styles.layerLocked : ""}
    style={{ "--layer": index, "--shift": solved ? 2 : position, "--tilt": `${((level.id + index) % 3) - 1}deg` } as React.CSSProperties}
    onPointerDown={(event) => { starts.current[index] = event.clientX; event.currentTarget.setPointerCapture?.(event.pointerId); }}
    onPointerUp={(event) => { const delta = event.clientX - (starts.current[index] ?? event.clientX); move(index, Math.abs(delta) > 18 ? 1 : 0); }}
    onKeyDown={(event) => { if (event.key === "ArrowRight" || event.key === "Enter") { event.preventDefault(); move(index, 1); } }}
  ><span aria-hidden="true" /></button>)}</div>;
}

type HorizonPaper = "sky" | "reflection";
type HorizonPosition = { x: number; y: number };

const initialHorizonPositions: Record<HorizonPaper, HorizonPosition> = {
  sky: { x: 25, y: 38 },
  reflection: { x: 74, y: 68 },
};
const horizonPositionTolerance = 10;
const horizonAngleTolerance = 12;

function DoubleHorizon({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [positions, setPositions] = useState(initialHorizonPositions);
  const [reflectionAngle, setReflectionAngle] = useState(90);
  const [tearsRevealed, setTearsRevealed] = useState(false);
  const [wrongOverlaps, setWrongOverlaps] = useState(0);
  const positionsRef = useRef(initialHorizonPositions);
  const angleRef = useRef(90);
  const drags = useRef<Partial<Record<HorizonPaper, { x: number; y: number; position: HorizonPosition }>>>({});
  const rotationDrag = useRef<{ x: number; angle: number } | null>(null);
  const armedRef = useRef(false);
  const visiblePositions = solved
    ? { sky: initialHorizonPositions.sky, reflection: initialHorizonPositions.sky }
    : positions;
  const visibleAngle = solved ? 0 : reflectionAngle;
  const deltaX = Math.abs(visiblePositions.sky.x - visiblePositions.reflection.x);
  const deltaY = Math.abs(visiblePositions.sky.y - visiblePositions.reflection.y);
  const overlapping = deltaX <= horizonPositionTolerance && deltaY <= horizonPositionTolerance;
  const near = deltaX <= 18 && deltaY <= 18;
  const angleReady = Math.abs(visibleAngle) <= horizonAngleTolerance;
  const sharedLine = overlapping && angleReady;

  const reveal = () => {
    setTearsRevealed(true);
    onDiscover();
  };

  const setPaperPosition = (paper: HorizonPaper, next: HorizonPosition) => {
    const bounded = {
      x: Math.max(10, Math.min(90, Math.round(next.x))),
      y: Math.max(20, Math.min(80, Math.round(next.y))),
    };
    positionsRef.current = { ...positionsRef.current, [paper]: bounded };
    setPositions(positionsRef.current);
    return bounded;
  };

  const setPaperAngle = (next: number) => {
    const bounded = Math.max(0, Math.min(90, Math.round(next)));
    angleRef.current = bounded;
    setReflectionAngle(bounded);
    return bounded;
  };

  const evaluate = (nextPositions = positionsRef.current, nextAngle = angleRef.current, penalize = false) => {
    const xGap = Math.abs(nextPositions.sky.x - nextPositions.reflection.x);
    const yGap = Math.abs(nextPositions.sky.y - nextPositions.reflection.y);
    const nextOverlap = xGap <= horizonPositionTolerance && yGap <= horizonPositionTolerance;
    if (!nextOverlap || Math.abs(nextAngle) > horizonAngleTolerance) {
      if (penalize && nextOverlap) setWrongOverlaps((current) => current + 1);
      return;
    }
    if (armedRef.current || solved) return;
    armedRef.current = true;
    angleRef.current = 0;
    setReflectionAngle(0);
    positionsRef.current = { ...nextPositions, reflection: { ...nextPositions.sky } };
    setPositions(positionsRef.current);
    onArm();
  };

  const moveByKeyboard = (paper: HorizonPaper, dx: number, dy: number) => {
    if (armedRef.current || solved) return;
    reveal();
    const current = positionsRef.current[paper];
    const next = setPaperPosition(paper, { x: current.x + dx, y: current.y + dy });
    evaluate({ ...positionsRef.current, [paper]: next }, angleRef.current);
  };

  const positionFromPointer = (control: HTMLElement, start: HorizonPosition, dx: number, dy: number) => {
    const rect = control.closest<HTMLElement>("[data-testid='v2-scene-034']")?.getBoundingClientRect();
    const width = rect?.width || 400;
    const height = rect?.height || 400;
    return { x: start.x + dx / width * 100, y: start.y + dy / height * 100 };
  };

  const paperStyle = (paper: HorizonPaper) => ({
    left: `${visiblePositions[paper].x}%`,
    top: `${visiblePositions[paper].y}%`,
    "--horizon-angle": `${paper === "reflection" ? visibleAngle : 0}deg`,
  }) as React.CSSProperties;

  const labels: Record<HorizonPaper, string> = locale === "zh"
    ? { sky: "移动天空纸景", reflection: "移动倒影纸景" }
    : { sky: "Move sky landscape paper", reflection: "Move reflection landscape paper" };

  return (
    <div
      className={styles.doubleHorizonScene}
      data-angle-tolerance={horizonAngleTolerance}
      data-controller="layer-stack"
      data-overlap={overlapping ? "overlapping" : near ? "near" : "separate"}
      data-position-tolerance={horizonPositionTolerance}
      data-reflection-angle={visibleAngle}
      data-reflection-x={visiblePositions.reflection.x}
      data-reflection-y={visiblePositions.reflection.y}
      data-shared-line={sharedLine ? "true" : "false"}
      data-sky-x={visiblePositions.sky.x}
      data-sky-y={visiblePositions.sky.y}
      data-spatial-model="two-torn-landscapes-one-horizon"
      data-sun-relation={sharedLine ? "mirrored" : near && Math.abs(visibleAngle) <= 30 ? "approaching" : "divided"}
      data-tears={tearsRevealed || solved ? "revealed" : "concealed"}
      data-testid="v2-scene-034"
      data-wrong-overlaps={wrongOverlaps}
    >
      {(["sky", "reflection"] as const).map((paper) => (
        <div
          className={`${styles.horizonPaper} ${paper === "sky" ? styles.horizonSky : styles.horizonReflection}`}
          data-landscape-paper={paper}
          key={paper}
          style={paperStyle(paper)}
        >
          <span className={styles.horizonSun} aria-hidden="true" />
          <span className={styles.horizonWash} aria-hidden="true" />
          <span className={styles.horizonTear} data-tear-signature="shared-notch" data-testid="horizon-tear-034" aria-hidden="true"><i /><b /></span>
        </div>
      ))}
      <button
        type="button"
        className={`${styles.horizonPivot} ${styles.horizonPivotDetached}`}
        aria-label={locale === "zh" ? "倒影纸景的撕口转轴" : "Reflection paper torn pivot"}
        style={paperStyle("reflection")}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          rotationDrag.current = { x: event.clientX, angle: angleRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = rotationDrag.current;
          if (!start || armedRef.current || solved || Math.abs(event.clientX - start.x) <= 8) return;
          reveal();
          setPaperAngle(start.angle + event.clientX - start.x);
        }}
        onPointerUp={(event) => {
          const start = rotationDrag.current;
          rotationDrag.current = null;
          if (!start || armedRef.current || solved || Math.abs(event.clientX - start.x) <= 8) return;
          const next = setPaperAngle(start.angle + event.clientX - start.x);
          evaluate(positionsRef.current, next, true);
        }}
        onPointerCancel={() => { rotationDrag.current = null; }}
      ><span aria-hidden="true" /></button>
      {(["sky", "reflection"] as const).map((paper) => (
        <button
          type="button"
          className={styles.horizonDragControl}
          aria-label={labels[paper]}
          data-horizon-control={paper}
          key={paper}
          style={paperStyle(paper)}
          onPointerDown={(event) => {
            if (armedRef.current || solved) return;
            drags.current[paper] = { x: event.clientX, y: event.clientY, position: { ...positionsRef.current[paper] } };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = drags.current[paper];
            if (!start || armedRef.current || solved) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.hypot(dx, dy) <= 12) return;
            reveal();
            setPaperPosition(paper, positionFromPointer(event.currentTarget, start.position, dx, dy));
          }}
          onPointerUp={(event) => {
            const start = drags.current[paper];
            delete drags.current[paper];
            if (!start || armedRef.current || solved) return;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.hypot(dx, dy) <= 12) return;
            const next = setPaperPosition(paper, positionFromPointer(event.currentTarget, start.position, dx, dy));
            evaluate({ ...positionsRef.current, [paper]: next }, angleRef.current, true);
          }}
          onPointerCancel={() => { delete drags.current[paper]; }}
          onKeyDown={(event) => {
            if (paper === "reflection" && (event.key === "Enter" || event.key === " ")) {
              event.preventDefault();
              if (armedRef.current || solved) return;
              reveal();
              const next = setPaperAngle(angleRef.current === 0 ? 90 : 0);
              evaluate(positionsRef.current, next);
              return;
            }
            if (!event.key.startsWith("Arrow")) return;
            event.preventDefault();
            moveByKeyboard(
              paper,
              event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0,
              event.key === "ArrowUp" ? -12 : event.key === "ArrowDown" ? 12 : 0,
            );
          }}
        />
      ))}
      {wrongOverlaps > 0 ? <span key={wrongOverlaps} className={styles.horizonReject} aria-hidden="true" /> : null}
      <span className={styles.horizonSharedLine} aria-hidden="true" />
    </div>
  );
}

type HorizonView = { x: number; y: number };

const horizonShiftHeights = (viewY: number) => ({
  front: Math.round((45 + viewY * .3) * 10) / 10,
  back: Math.round((52 - viewY * .05) * 10) / 10,
  sun: Math.round((48 + viewY * .15) * 10) / 10,
});

function HorizonShift({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [view, setView] = useState<HorizonView>({ x: 0, y: 0 });
  const [parallaxRevealed, setParallaxRevealed] = useState(false);
  const viewRef = useRef<HorizonView>({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; view: HorizonView } | null>(null);
  const armedRef = useRef(false);
  const visibleView = solved ? { x: 24, y: 20 } : view;
  const heights = horizonShiftHeights(visibleView.y);
  const heightValues = [heights.front, heights.back, heights.sun];
  const heightSpan = Math.max(...heightValues) - Math.min(...heightValues);
  const pairGap = Math.min(
    Math.abs(heights.front - heights.back),
    Math.abs(heights.front - heights.sun),
    Math.abs(heights.back - heights.sun),
  );
  const revealed = solved || parallaxRevealed;
  const heightAlignment = revealed && heightSpan <= 2
    ? "all-three"
    : revealed && pairGap <= 2
      ? "two-only"
      : "split";

  const setNextView = (next: HorizonView) => {
    const bounded = {
      x: Math.max(-80, Math.min(80, Math.round(next.x))),
      y: Math.max(0, Math.min(32, Math.round(next.y))),
    };
    viewRef.current = bounded;
    setView(bounded);
    if (Math.abs(bounded.x) >= 20) {
      setParallaxRevealed(true);
      onDiscover();
    }
    return bounded;
  };

  const finish = (next = viewRef.current) => {
    const nextRevealed = parallaxRevealed || Math.abs(next.x) >= 20;
    const nextHeights = horizonShiftHeights(next.y);
    const nextSpan = Math.max(nextHeights.front, nextHeights.back, nextHeights.sun)
      - Math.min(nextHeights.front, nextHeights.back, nextHeights.sun);
    if (!nextRevealed || nextSpan > 2 || armedRef.current || solved) return;
    armedRef.current = true;
    viewRef.current = { x: next.x, y: 20 };
    setView(viewRef.current);
    setParallaxRevealed(true);
    onArm();
  };

  const moveByKey = (dx: number, dy: number) => {
    if (armedRef.current || solved) return;
    const next = setNextView({ x: viewRef.current.x + dx, y: viewRef.current.y + dy });
    finish(next);
  };

  return (
    <div
      className={styles.horizonShiftScene}
      data-back-height={heights.back}
      data-back-x={Math.round(visibleView.x * .22)}
      data-controller="shared-control"
      data-direction-events="0"
      data-front-height={heights.front}
      data-front-x={Math.round(visibleView.x * .55)}
      data-height-alignment={heightAlignment}
      data-height-tolerance="2"
      data-parallax={revealed ? "revealed" : "concealed"}
      data-reflection-segments={revealed ? "2" : "1"}
      data-reflection-state={heightAlignment === "all-three" ? "complete" : heightAlignment === "two-only" ? "incomplete" : "split"}
      data-spatial-model="full-sky-three-depths"
      data-sun-height={heights.sun}
      data-sun-x={Math.round(visibleView.x * .85)}
      data-testid="v2-scene-035"
      data-view-x={visibleView.x}
      data-view-y={visibleView.y}
      style={{
        "--shift-back-height": `${heights.back}%`,
        "--shift-back-x": `${visibleView.x * .22}px`,
        "--shift-front-height": `${heights.front}%`,
        "--shift-front-x": `${visibleView.x * .55}px`,
        "--shift-sun-height": `${heights.sun}%`,
        "--shift-sun-x": `${visibleView.x * .85}px`,
      } as React.CSSProperties}
    >
      <span className={styles.shiftSkyWash} aria-hidden="true" />
      <span className={`${styles.shiftHorizon} ${styles.shiftBackHorizon}`} aria-hidden="true"><i /></span>
      <span className={`${styles.shiftHorizon} ${styles.shiftFrontHorizon}`} aria-hidden="true"><i /></span>
      <span className={styles.shiftSun} aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={styles.horizonViewControl}
        aria-label={locale === "zh" ? "拖动天空视角" : "Drag the sky viewpoint"}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          dragRef.current = { x: event.clientX, y: event.clientY, view: { ...viewRef.current } };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = dragRef.current;
          if (!start || armedRef.current || solved) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) <= 8) return;
          setNextView({ x: start.view.x + dx, y: start.view.y + dy / 4 });
        }}
        onPointerUp={(event) => {
          const start = dragRef.current;
          dragRef.current = null;
          if (!start || armedRef.current || solved) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) <= 8) return;
          const next = setNextView({ x: start.view.x + dx, y: start.view.y + dy / 4 });
          finish(next);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (!event.key.startsWith("Arrow")) return;
          event.preventDefault();
          moveByKey(
            event.key === "ArrowLeft" ? -24 : event.key === "ArrowRight" ? 24 : 0,
            event.key === "ArrowUp" ? -5 : event.key === "ArrowDown" ? 5 : 0,
          );
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

const portableBandYs = [22, 50, 78] as const;
const portableReadings = [
  { name: "left-low", bubble: -16, leftShadow: 36, rightShadow: 20 },
  { name: "right-low", bubble: 14, leftShadow: 18, rightShadow: 35 },
  { name: "centered", bubble: 0, leftShadow: 28, rightShadow: 28 },
] as const;
const portableCorrectBand = 2;

function PortableHorizon({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLSpanElement>(null);
  const testedRef = useRef(new Set<number>());
  const toolDragging = useRef(false);
  const bandDrag = useRef<{ index: number; x: number; y: number } | null>(null);
  const armedRef = useRef(false);
  const [toolPosition, setToolPosition] = useState({ x: 50, y: 14 });
  const [activeBand, setActiveBand] = useState<number | null>(null);
  const [testedBands, setTestedBands] = useState(() => portableBandYs.map(() => false));
  const [wrongDrops, setWrongDrops] = useState(0);
  const [connected, setConnected] = useState(false);
  const [bandOffsets, setBandOffsets] = useState(() => portableBandYs.map(() => ({ x: 0, y: 0 })));
  const visibleConnected = solved || connected;
  const reading = activeBand === null ? null : portableReadings[activeBand];
  const testedCount = testedBands.filter(Boolean).length;

  const inspectBand = (index: number) => {
    setActiveBand(index);
    if (!testedRef.current.has(index)) {
      testedRef.current.add(index);
      setTestedBands((current) => current.map((tested, bandIndex) => bandIndex === index ? true : tested));
      if (testedRef.current.size >= 2) onDiscover();
    }
  };

  const moveTool = (clientX: number, clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    const next = {
      x: Math.max(8, Math.min(92, (clientX - rect.left) / rect.width * 100)),
      y: Math.max(6, Math.min(92, (clientY - rect.top) / rect.height * 100)),
    };
    setToolPosition(next);
    const nearest = portableBandYs.reduce((best, bandY, index) => {
      const distance = Math.abs(next.y - bandY);
      return distance < best.distance ? { index, distance } : best;
    }, { index: -1, distance: Number.POSITIVE_INFINITY });
    if (nearest.distance <= 10) inspectBand(nearest.index);
    else setActiveBand(null);
  };

  const rejectBand = (index: number) => {
    setWrongDrops((count) => count + 1);
    setBandOffsets((current) => current.map((offset, bandIndex) => bandIndex === index ? { x: 0, y: 0 } : offset));
  };

  const completeBand = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setConnected(true);
    onArm();
  };

  const attemptBandDrop = (index: number, clientX: number, clientY: number) => {
    const target = targetRef.current?.getBoundingClientRect();
    const insideTarget = Boolean(target
      && clientX >= target.left && clientX <= target.right
      && clientY >= target.top && clientY <= target.bottom);
    if (testedRef.current.size === 3 && index === portableCorrectBand && insideTarget) completeBand();
    else rejectBand(index);
  };

  return (
    <div
      ref={rootRef}
      className={styles.portableHorizonScene}
      data-bubble-offset={reading?.bubble ?? 0}
      data-connected={visibleConnected ? "true" : "false"}
      data-controller="shared-control"
      data-evidence={testedCount === 3 ? "double" : testedCount > 0 ? "single" : "none"}
      data-instrument-reading={reading?.name ?? "air"}
      data-joined-band={visibleConnected ? "verified" : "none"}
      data-shadow-left={reading?.leftShadow ?? 0}
      data-shadow-right={reading?.rightShadow ?? 0}
      data-spatial-model="three-bands-portable-level"
      data-tested-count={testedCount}
      data-testid="v2-scene-036"
      data-wrong-drops={wrongDrops}
      style={{
        "--portable-bubble": `${reading?.bubble ?? 0}%`,
        "--portable-shadow-left": `${reading?.leftShadow ?? 0}px`,
        "--portable-shadow-right": `${reading?.rightShadow ?? 0}px`,
        "--portable-tool-x": `${toolPosition.x}%`,
        "--portable-tool-y": `${toolPosition.y}%`,
      } as React.CSSProperties}
    >
      <span className={styles.portablePaperField} aria-hidden="true" />
      <span ref={targetRef} className={styles.portableBaselineTarget} data-testid="portable-horizon-target" aria-hidden="true"><i /></span>
      {portableBandYs.map((bandY, index) => (
        <button
          key={index}
          type="button"
          className={styles.portableBand}
          aria-label={locale === "zh" ? `纸带 ${index + 1}` : `Paper band ${index + 1}`}
          data-band-index={index}
          data-tested={testedBands[index] ? "true" : "false"}
          style={{
            "--portable-band-y": `${bandY}%`,
            "--portable-band-x": `${bandOffsets[index].x}px`,
            "--portable-band-dy": `${bandOffsets[index].y}px`,
          } as React.CSSProperties}
          onPointerDown={(event) => {
            if (visibleConnected) return;
            bandDrag.current = { index, x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = bandDrag.current;
            if (!start || start.index !== index || visibleConnected) return;
            setBandOffsets((current) => current.map((offset, bandIndex) => bandIndex === index
              ? { x: event.clientX - start.x, y: event.clientY - start.y }
              : offset));
          }}
          onPointerUp={(event) => {
            const start = bandDrag.current;
            bandDrag.current = null;
            if (!start || start.index !== index || visibleConnected) return;
            attemptBandDrop(index, event.clientX, event.clientY);
          }}
          onPointerCancel={() => {
            bandDrag.current = null;
            rejectBand(index);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            if (testedRef.current.size === 3 && index === portableCorrectBand) completeBand();
            else rejectBand(index);
          }}
        ><span aria-hidden="true"><i /><b /></span></button>
      ))}
      <button
        type="button"
        className={styles.portableLevel}
        style={{ transition: "none" }}
        aria-label={locale === "zh" ? "纸质水平仪" : "Paper spirit level"}
        onPointerDown={(event) => {
          if (visibleConnected) return;
          toolDragging.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!toolDragging.current || visibleConnected) return;
          moveTool(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (!toolDragging.current || visibleConnected) return;
          toolDragging.current = false;
          moveTool(event.clientX, event.clientY);
        }}
        onPointerCancel={() => { toolDragging.current = false; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          const direction = event.key === "ArrowDown" ? 1 : -1;
          const next = activeBand === null
            ? (direction > 0 ? 0 : portableBandYs.length - 1)
            : (activeBand + direction + portableBandYs.length) % portableBandYs.length;
          setToolPosition({ x: 50, y: portableBandYs[next] });
          inspectBand(next);
        }}
      >
        <span className={styles.portableLevelBody} aria-hidden="true"><em /></span>
        <i className={styles.portableShadowLeft} aria-hidden="true" />
        <b className={styles.portableShadowRight} aria-hidden="true" />
      </button>
      {wrongDrops > 0 ? <span key={wrongDrops} className={styles.portableReject} aria-hidden="true" /> : null}
    </div>
  );
}

type ParallaxWindowKey = "hands" | "ring";
type WindowOffset = { x: number; y: number };

const parallaxWindowBases: Record<ParallaxWindowKey, WindowOffset> = {
  hands: { x: 75, y: 95 },
  ring: { x: 245, y: 135 },
};

function ParallaxWindow({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [offsets, setOffsets] = useState<Record<ParallaxWindowKey, WindowOffset>>({
    hands: { x: 0, y: 0 },
    ring: { x: 0, y: 0 },
  });
  const offsetsRef = useRef(offsets);
  const dragRef = useRef<{ window: ParallaxWindowKey; x: number; y: number; offset: WindowOffset } | null>(null);
  const armedRef = useRef(false);
  const [parallaxRevealed, setParallaxRevealed] = useState(false);
  const [wrongDrops, setWrongDrops] = useState(0);
  const [aligned, setAligned] = useState(false);
  const solvedOffsets: Record<ParallaxWindowKey, WindowOffset> = {
    hands: { x: 170, y: 40 },
    ring: { x: 0, y: 0 },
  };
  const visibleOffsets = solved ? solvedOffsets : offsets;
  const centerFor = (window: ParallaxWindowKey, source = visibleOffsets) => ({
    x: parallaxWindowBases[window].x + source[window].x,
    y: parallaxWindowBases[window].y + source[window].y,
  });
  const handsCenter = centerFor("hands");
  const ringCenter = centerFor("ring");
  const distance = solved || aligned ? 0 : Math.round(Math.hypot(handsCenter.x - ringCenter.x, handsCenter.y - ringCenter.y));
  const overlap = solved || aligned
    ? "aligned"
    : distance <= 96
      ? "overlapping-offset"
      : distance <= 124
        ? "edge-touching"
        : "separate";
  const framePattern = solved || aligned ? "continuous" : distance <= 124 ? "interrupted" : "broken";
  const handsDepth = {
    x: Math.round(visibleOffsets.hands.x * -.17),
    y: Math.round(visibleOffsets.hands.y * -.17),
  };
  const ringDepth = {
    x: Math.round(visibleOffsets.ring.x * -.38),
    y: Math.round(visibleOffsets.ring.y * -.38),
  };

  const setWindowOffset = (window: ParallaxWindowKey, offset: WindowOffset) => {
    const next = { ...offsetsRef.current, [window]: offset };
    offsetsRef.current = next;
    setOffsets(next);
    return next;
  };

  const finish = (next = offsetsRef.current) => {
    if (armedRef.current || solved) return;
    const hands = centerFor("hands", next);
    const ring = centerFor("ring", next);
    const nextDistance = Math.hypot(hands.x - ring.x, hands.y - ring.y);
    if (nextDistance <= 36) {
      const midpoint = { x: (hands.x + ring.x) / 2, y: (hands.y + ring.y) / 2 };
      const snapped = {
        hands: { x: midpoint.x - parallaxWindowBases.hands.x, y: midpoint.y - parallaxWindowBases.hands.y },
        ring: { x: midpoint.x - parallaxWindowBases.ring.x, y: midpoint.y - parallaxWindowBases.ring.y },
      };
      offsetsRef.current = snapped;
      setOffsets(snapped);
      setAligned(true);
      armedRef.current = true;
      onArm();
    } else if (nextDistance <= 124) {
      setWrongDrops((count) => count + 1);
    }
  };

  const moveByKey = (window: ParallaxWindowKey, dx: number, dy: number) => {
    if (armedRef.current || solved) return;
    setParallaxRevealed(true);
    onDiscover();
    const current = offsetsRef.current[window];
    const next = setWindowOffset(window, { x: current.x + dx, y: current.y + dy });
    finish(next);
  };

  const renderWindow = (window: ParallaxWindowKey) => {
    const isHands = window === "hands";
    const offset = visibleOffsets[window];
    return (
      <button
        type="button"
        className={`${styles.parallaxClockWindow} ${isHands ? styles.parallaxHandsWindow : styles.parallaxRingWindow}`}
        aria-label={locale === "zh" ? (isHands ? "钟针纸窗" : "钟圈纸窗") : (isHands ? "Clock-hand paper window" : "Clock-ring paper window")}
        data-window={window}
        style={{
          "--parallax-window-x": `${parallaxWindowBases[window].x + offset.x}px`,
          "--parallax-window-y": `${parallaxWindowBases[window].y + offset.y}px`,
          "--parallax-depth-x": `${isHands ? handsDepth.x : ringDepth.x}px`,
          "--parallax-depth-y": `${isHands ? handsDepth.y : ringDepth.y}px`,
        } as React.CSSProperties}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          dragRef.current = { window, x: event.clientX, y: event.clientY, offset: { ...offsetsRef.current[window] } };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = dragRef.current;
          if (!start || start.window !== window || armedRef.current || solved) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) > 10) {
            setParallaxRevealed(true);
            onDiscover();
          }
          setWindowOffset(window, { x: start.offset.x + dx, y: start.offset.y + dy });
        }}
        onPointerUp={(event) => {
          const start = dragRef.current;
          dragRef.current = null;
          if (!start || start.window !== window || armedRef.current || solved) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) <= 10) return;
          const next = setWindowOffset(window, { x: start.offset.x + dx, y: start.offset.y + dy });
          finish(next);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (!event.key.startsWith("Arrow")) return;
          event.preventDefault();
          moveByKey(
            window,
            event.key === "ArrowLeft" ? -24 : event.key === "ArrowRight" ? 24 : 0,
            event.key === "ArrowUp" ? -20 : event.key === "ArrowDown" ? 20 : 0,
          );
        }}
      >
        <span className={styles.parallaxWindowPaper} aria-hidden="true">
          <i className={styles.parallaxFramePattern} />
          {isHands
            ? <b className={styles.parallaxClockHands}><i /><em /></b>
            : <b className={styles.parallaxClockRing}><i /></b>}
        </span>
      </button>
    );
  };

  return (
    <div
      className={styles.parallaxWindowScene}
      data-controller="layer-stack"
      data-frame-pattern={framePattern}
      data-hands-depth-offset={`${handsDepth.x},${handsDepth.y}`}
      data-hands-offset={`${visibleOffsets.hands.x},${visibleOffsets.hands.y}`}
      data-overlap={overlap}
      data-parallax={parallaxRevealed || solved ? "revealed" : "concealed"}
      data-ring-depth-offset={`${ringDepth.x},${ringDepth.y}`}
      data-ring-offset={`${visibleOffsets.ring.x},${visibleOffsets.ring.y}`}
      data-snap-zone="36"
      data-spatial-model="two-depth-windows-one-clock"
      data-testid="v2-scene-037"
      data-window-distance={distance}
      data-wrong-drops={wrongDrops}
    >
      <span className={styles.parallaxWindowField} aria-hidden="true"><i /><b /></span>
      {renderWindow("hands")}
      {renderWindow("ring")}
      <span
        className={styles.parallaxSharedCenter}
        style={{ left: `${(handsCenter.x + ringCenter.x) / 2}px`, top: `${(handsCenter.y + ringCenter.y) / 2}px` }}
        aria-hidden="true"
      />
      {wrongDrops > 0 ? <span key={wrongDrops} className={styles.parallaxWindowReject} aria-hidden="true" /> : null}
    </div>
  );
}

function ReturnTicket({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const dragRef = useRef<{ x: number; progress: number } | null>(null);
  const armedRef = useRef(false);
  const [route, setRoute] = useState<"edge-loop" | "center-wrong">("edge-loop");
  const [centerAttempts, setCenterAttempts] = useState(0);
  const [centerOffset, setCenterOffset] = useState(0);
  const [joined, setJoined] = useState(false);
  const visibleProgress = solved || joined ? 140 : progress;
  const visibleJoined = solved || joined;
  const edgeState = visibleJoined ? "joined" : visibleProgress >= 24 ? "wrapped" : visibleProgress > 0 ? "crossing" : "split";

  const setNextProgress = (nextProgress: number) => {
    const bounded = Math.max(0, Math.min(140, Math.round(nextProgress)));
    progressRef.current = bounded;
    setProgress(bounded);
    setRoute("edge-loop");
    setCenterOffset(0);
    if (bounded > 8) onDiscover();
    return bounded;
  };

  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    progressRef.current = 140;
    setProgress(140);
    setJoined(true);
    onArm();
  };

  const rejectCenter = () => {
    setRoute("center-wrong");
    setCenterAttempts((count) => count + 1);
    setCenterOffset(0);
  };

  return (
    <div
      className={styles.returnTicketScene}
      data-center-attempts={centerAttempts}
      data-controller="edge-route"
      data-edge-state={edgeState}
      data-fiber-continuity={visibleJoined ? "joined" : visibleProgress >= 24 ? "continuous" : "unproven"}
      data-history-events="0"
      data-left-exit={visibleProgress}
      data-navigation="local-only"
      data-progress={visibleProgress}
      data-right-entry={visibleProgress}
      data-right-seam={visibleJoined ? "closed" : "open"}
      data-route={route}
      data-spatial-model="continuous-opposite-page-edges"
      data-testid="v2-scene-038"
      style={{
        "--ticket-center-offset": `${centerOffset}px`,
        "--ticket-progress": `${visibleProgress}px`,
      } as React.CSSProperties}
    >
      <span className={styles.returnTicketFiberLeft} aria-hidden="true" />
      <span className={styles.returnTicketFiberRight} aria-hidden="true" />
      <button
        type="button"
        className={styles.returnTicketLeft}
        aria-label={locale === "zh" ? "左侧回程票纸片" : "Left return-ticket piece"}
        data-testid="return-ticket-left-half"
        onPointerDown={(event) => {
          if (visibleJoined) return;
          dragRef.current = { x: event.clientX, progress: progressRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = dragRef.current;
          if (!start || visibleJoined) return;
          const dx = event.clientX - start.x;
          if (dx < -8) setNextProgress(start.progress - dx * 3.5);
          else if (dx > 8) {
            setRoute("center-wrong");
            setCenterOffset(Math.min(64, dx));
          }
        }}
        onPointerUp={(event) => {
          const start = dragRef.current;
          dragRef.current = null;
          if (!start || visibleJoined) return;
          const dx = event.clientX - start.x;
          if (dx > 20) {
            rejectCenter();
            return;
          }
          if (dx >= -8) return;
          const next = setNextProgress(start.progress - dx * 3.5);
          if (next >= 140) complete();
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setCenterOffset(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            rejectCenter();
            return;
          }
          if (event.key !== "ArrowLeft") return;
          event.preventDefault();
          const next = setNextProgress(progressRef.current + 30);
          if (next >= 140) complete();
        }}
      ><span className={styles.returnTicketPaper} aria-hidden="true"><i /><b /><em /></span></button>
      <span
        className={styles.returnTicketWrapped}
        style={{ transform: `translate(${224 - visibleProgress * 1.6}px,-50%)` }}
        aria-hidden="true"
      ><span className={styles.returnTicketPaper}><i /><b /><em /></span></span>
      <span className={styles.returnTicketRight} data-testid="return-ticket-right-half" aria-hidden="true"><span className={styles.returnTicketPaper}><i /><b /><em /></span></span>
      {centerAttempts > 0 ? <span key={centerAttempts} className={styles.returnTicketReject} aria-hidden="true" /> : null}
    </div>
  );
}

type RibbonLayer = "front" | "back";

function TabDoubleback({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  const [activeLayer, setActiveLayer] = useState<RibbonLayer>("front");
  const [feedback, setFeedback] = useState<"idle" | "fold-kept" | "rebounded">("idle");
  const [wrongLayers, setWrongLayers] = useState(0);
  const [endpointOffset, setEndpointOffset] = useState({ x: 0, y: 0 });
  const [previewTab, setPreviewTab] = useState<0 | 1 | 2>(0);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const tabRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const armedRef = useRef(false);
  const visibleStage = solved ? 2 : stage;

  const reject = () => {
    setFeedback("rebounded");
    setWrongLayers((count) => count + 1);
    setEndpointOffset({ x: 0, y: 0 });
    setPreviewTab(0);
  };

  const attempt = (tabIndex: 0 | 1, layer: RibbonLayer) => {
    if (solved || stage >= 2) return;
    const expectedLayer: RibbonLayer = stage === 0 ? "back" : "front";
    if (tabIndex !== stage || layer !== expectedLayer) {
      reject();
      return;
    }

    const nextStage = (stage + 1) as 1 | 2;
    setStage(nextStage);
    setActiveLayer(layer);
    setFeedback("fold-kept");
    setEndpointOffset({ x: 0, y: 0 });
    setPreviewTab(0);
    onDiscover();
    if (nextStage === 2 && !armedRef.current) {
      armedRef.current = true;
      onArm();
    }
  };

  const nearestTab = (clientX: number, clientY: number) => {
    let nearest: { index: 0 | 1; rect: DOMRect; distance: number } | null = null;
    for (let index = 0; index < tabRefs.current.length; index += 1) {
      const tab = tabRefs.current[index];
      const rect = tab?.getBoundingClientRect();
      if (!rect) continue;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(clientX - centerX, clientY - centerY);
      if (!nearest || distance < nearest.distance) nearest = { index: index as 0 | 1, rect, distance };
    }
    return nearest;
  };

  const chooseAt = (clientX: number, clientY: number) => {
    const target = nearestTab(clientX, clientY);
    if (!target || target.distance > Math.max(52, target.rect.height * .72)) {
      reject();
      return;
    }
    const middleY = target.rect.top + target.rect.height / 2;
    if (Math.abs(clientY - middleY) <= Math.max(8, target.rect.height * .12)) {
      reject();
      return;
    }
    const layer: RibbonLayer = clientY < middleY ? "front" : "back";
    setActiveLayer(layer);
    attempt(target.index, layer);
  };

  const effectiveDepths = visibleStage === 2 ? "back-front" : visibleStage === 1 ? "back" : "none";

  return (
    <div
      className={styles.tabDoublebackScene}
      data-active-layer={activeLayer}
      data-controller="layer-stack"
      data-initial-first-layer="front"
      data-initial-second-layer="back"
      data-last-feedback={feedback}
      data-preview-tab={previewTab}
      data-ribbon-loop={visibleStage === 2 ? "closed" : "open"}
      data-spatial-model="two-tabs-alternating-depth"
      data-testid="v2-scene-039"
      data-thread-stage={visibleStage}
      data-threaded-depths={effectiveDepths}
      data-wrong-layers={wrongLayers}
    >
      <span className={styles.doublebackPaper} aria-hidden="true"><i /><b /><em /></span>
      <span className={`${styles.doublebackRibbon} ${styles.doublebackRibbonBase}`} aria-hidden="true" />
      <span
        ref={(element) => { tabRefs.current[0] = element; }}
        className={`${styles.doublebackTab} ${styles.doublebackTabFirst}`}
        data-testid="doubleback-tab-1"
        aria-hidden="true"
      ><i /><b /></span>
      <span
        ref={(element) => { tabRefs.current[1] = element; }}
        className={`${styles.doublebackTab} ${styles.doublebackTabSecond}`}
        data-testid="doubleback-tab-2"
        aria-hidden="true"
      ><i /><b /></span>
      <span className={`${styles.doublebackRibbon} ${styles.doublebackRibbonFront}`} aria-hidden="true" />
      {visibleStage >= 1 ? <span className={`${styles.doublebackRibbon} ${styles.doublebackRibbonBackFold}`} aria-hidden="true" /> : null}
      {visibleStage >= 2 ? <span className={`${styles.doublebackRibbon} ${styles.doublebackRibbonClosing}`} aria-hidden="true" /> : null}
      <button
        type="button"
        className={styles.doublebackEndpoint}
        aria-label={locale === "zh" ? "丝带活动端" : "Loose ribbon end"}
        style={{
          "--doubleback-x": `${endpointOffset.x}px`,
          "--doubleback-y": `${endpointOffset.y}px`,
        } as React.CSSProperties}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleStage >= 2) return;
          dragRef.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = dragRef.current;
          if (!start || visibleStage >= 2) return;
          const offset = { x: event.clientX - start.x, y: event.clientY - start.y };
          if (Math.hypot(offset.x, offset.y) <= 10) return;
          setEndpointOffset(offset);
          const target = nearestTab(event.clientX, event.clientY);
          if (target) {
            setPreviewTab((target.index + 1) as 1 | 2);
            setActiveLayer(event.clientY < target.rect.top + target.rect.height / 2 ? "front" : "back");
          }
        }}
        onPointerUp={(event) => {
          const start = dragRef.current;
          dragRef.current = null;
          if (!start || visibleStage >= 2) return;
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) return;
          chooseAt(event.clientX, event.clientY);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          setEndpointOffset({ x: 0, y: 0 });
          setPreviewTab(0);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            setActiveLayer(event.key === "ArrowUp" ? "front" : "back");
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          attempt(stage === 0 ? 0 : 1, activeLayer);
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      {wrongLayers > 0 ? <span key={wrongLayers} className={styles.doublebackRebound} aria-hidden="true" /> : null}
    </div>
  );
}

type RelayPiece = "left" | "sheet" | "right";

function RelaySandwich({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [sheetCentered, setSheetCentered] = useState(false);
  const [leftLocked, setLeftLocked] = useState(false);
  const [rightLocked, setRightLocked] = useState(false);
  const [shellsRespond, setShellsRespond] = useState(false);
  const [rejectedPiece, setRejectedPiece] = useState<RelayPiece | null>(null);
  const [offsets, setOffsets] = useState<Record<RelayPiece, { x: number; y: number }>>({
    left: { x: 0, y: 0 }, sheet: { x: 0, y: 0 }, right: { x: 0, y: 0 },
  });
  const starts = useRef<Partial<Record<RelayPiece, { x: number; y: number }>>>({});
  const rejectTimer = useRef<number | null>(null);
  const armedSandwich = useRef(false);

  useEffect(() => () => {
    if (rejectTimer.current !== null) window.clearTimeout(rejectTimer.current);
  }, []);

  const reject = (piece: RelayPiece) => {
    onDiscover();
    setRejectedPiece(piece);
    setOffsets((current) => ({ ...current, [piece]: { x: 0, y: 0 } }));
    if (rejectTimer.current !== null) window.clearTimeout(rejectTimer.current);
    rejectTimer.current = window.setTimeout(() => {
      rejectTimer.current = null;
      setRejectedPiece(null);
    }, 180);
  };

  const place = (piece: RelayPiece) => {
    onDiscover();
    setRejectedPiece(null);
    setOffsets((current) => ({ ...current, [piece]: { x: 0, y: 0 } }));
    if (piece === "sheet") {
      setSheetCentered(true);
      return;
    }
    if (!sheetCentered) {
      reject(piece);
      return;
    }
    const nextLeft = piece === "left" ? true : leftLocked;
    const nextRight = piece === "right" ? true : rightLocked;
    setLeftLocked(nextLeft);
    setRightLocked(nextRight);
    if (nextLeft && nextRight && !armedSandwich.current) {
      armedSandwich.current = true;
      onArm();
    }
  };

  const locked = (piece: RelayPiece) => solved || (piece === "sheet" ? sheetCentered : piece === "left" ? leftLocked : rightLocked);
  const labels: Record<RelayPiece, string> = locale === "zh"
    ? { left: "左侧珊瑚外壳", sheet: "透明薄片", right: "右侧珊瑚外壳" }
    : { left: "Left coral shell", sheet: "Transparent middle sheet", right: "Right coral shell" };

  return (
    <div
      className={`${styles.relayScene} ${shellsRespond ? styles.relayResponding : ""} ${(solved || (sheetCentered && leftLocked && rightLocked)) ? styles.relayComplete : ""}`}
      data-controller="layer-stack"
      data-shells-respond={shellsRespond ? "true" : "false"}
      data-spatial-model="transparent-middle"
      data-top-layer-rejected={rejectedPiece ? "true" : "false"}
      data-testid="v2-scene-008"
    >
      <span className={styles.relayTarget} data-relay-target aria-hidden="true" />
      {(["left", "sheet", "right"] as const).map((piece) => (
        <button
          type="button"
          className={`${styles.relayPiece} ${styles[`relay_${piece}`]} ${locked(piece) ? styles.relayLocked : ""} ${rejectedPiece === piece ? styles.relayRejected : ""}`}
          data-layer={piece}
          data-locked={locked(piece) ? "true" : "false"}
          aria-label={labels[piece]}
          key={piece}
          style={{ transform: locked(piece) ? undefined : `translate(${offsets[piece].x}px, ${offsets[piece].y}px)` }}
          onClick={() => undefined}
          onPointerDown={(event) => {
            starts.current[piece] = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = starts.current[piece];
            if (!start || locked(piece)) return;
            const next = { x: event.clientX - start.x, y: event.clientY - start.y };
            if (Math.hypot(next.x, next.y) > 12) {
              onDiscover();
              if (piece === "sheet") setShellsRespond(true);
            }
            setOffsets((current) => ({ ...current, [piece]: next }));
          }}
          onPointerUp={(event) => {
            const start = starts.current[piece];
            delete starts.current[piece];
            if (!start || locked(piece) || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
            const target = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-008']")
              ?.querySelector<HTMLElement>("[data-relay-target]");
            const rect = target?.getBoundingClientRect();
            const centered = Boolean(rect
              && Math.abs(event.clientX - (rect.left + rect.width / 2)) <= rect.width / 2 + 20
              && Math.abs(event.clientY - (rect.top + rect.height / 2)) <= rect.height / 2 + 20);
            if (centered) place(piece); else reject(piece);
          }}
          onPointerCancel={() => {
            delete starts.current[piece];
            setOffsets((current) => ({ ...current, [piece]: { x: 0, y: 0 } }));
          }}
          onKeyDown={(event) => {
            const correct = piece === "sheet"
              ? event.key === "Enter" || event.key === " " || event.key === "ArrowDown"
              : piece === "left"
                ? event.key === "Enter" || event.key === " " || event.key === "ArrowRight"
                : event.key === "Enter" || event.key === " " || event.key === "ArrowLeft";
            if (correct) {
              event.preventDefault();
              place(piece);
            } else if (event.key.startsWith("Arrow")) {
              event.preventDefault();
              reject(piece);
            }
          }}
        ><span aria-hidden="true"><i /></span></button>
      ))}
      <span className={styles.relayWholeCircle} aria-hidden="true" />
    </div>
  );
}

type NineteenDigit = "one" | "nine";

function NineteenCode({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const initialPositions = { one: 30, nine: 70 };
  const [positions, setPositions] = useState(initialPositions);
  const [inputMode, setInputMode] = useState<"none" | "pointer-overlap" | "keyboard-overlap">("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef(initialPositions);
  const startsRef = useRef<Partial<Record<NineteenDigit, { pointerId: number; x: number; position: number }>>>({});
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const writePosition = (digit: NineteenDigit, position: number) => {
    const bounded = Math.max(8, Math.min(92, position));
    const next = { ...positionsRef.current, [digit]: bounded };
    positionsRef.current = next;
    setPositions(next);
    return next;
  };

  const completeIfOverlapped = (next: typeof initialPositions) => {
    if (armedRef.current || solved || Math.abs(next.nine - next.one) > 12) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const movePointer = (digit: NineteenDigit, clientX: number, pointerId: number) => {
    const start = startsRef.current[digit];
    if (!start || start.pointerId !== pointerId || armedRef.current || solved) return;
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    const delta = (clientX - start.x) / rect.width * 100;
    if (Math.abs(clientX - start.x) > 12) {
      discover();
      setInputMode("pointer-overlap");
    }
    writePosition(digit, start.position + delta);
  };

  const finishPointer = (digit: NineteenDigit, clientX: number, pointerId: number) => {
    const start = startsRef.current[digit];
    if (!start || start.pointerId !== pointerId || armedRef.current || solved) return;
    delete startsRef.current[digit];
    if (Math.abs(clientX - start.x) <= 12) return;
    discover();
    setInputMode("pointer-overlap");
    completeIfOverlapped(positionsRef.current);
  };

  const nudge = (digit: NineteenDigit, direction: number) => {
    if (armedRef.current || solved) return;
    discover();
    setInputMode("keyboard-overlap");
    completeIfOverlapped(writePosition(digit, positionsRef.current[digit] + direction * 11));
  };

  const visibleSolved = solved || completed;
  const visiblePositions = visibleSolved && Math.abs(positions.nine - positions.one) > 12
    ? { one: 48, nine: 52 }
    : positions;
  const distance = Math.abs(visiblePositions.nine - visiblePositions.one);
  const shadowState = distance <= 12 ? "clear-10" : distance <= 28 ? "parting" : "merged";
  const frontLegibility = distance <= 12 ? "obscured" : distance < 32 ? "crowded" : "clear";

  const digitButton = (digit: NineteenDigit) => {
    const isOne = digit === "one";
    const label = locale === "zh" ? `半透明数字${isOne ? "一" : "九"}` : `Translucent digit ${isOne ? "one" : "nine"}`;
    return (
      <button
        type="button"
        className={`${styles.nineteenDigit} ${isOne ? styles.nineteenOne : styles.nineteenNine}`}
        aria-label={label}
        style={{ left: `${visiblePositions[digit]}%` }}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          startsRef.current[digit] = { pointerId: event.pointerId, x: event.clientX, position: positionsRef.current[digit] };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => movePointer(digit, event.clientX, event.pointerId)}
        onPointerUp={(event) => finishPointer(digit, event.clientX, event.pointerId)}
        onPointerCancel={() => { delete startsRef.current[digit]; }}
        onKeyDown={(event) => {
          const inward = isOne ? event.key === "ArrowRight" : event.key === "ArrowLeft";
          const outward = isOne ? event.key === "ArrowLeft" : event.key === "ArrowRight";
          if (!inward && !outward) return;
          event.preventDefault();
          nudge(digit, inward ? (isOne ? 1 : -1) : (isOne ? -1 : 1));
        }}
      ><span aria-hidden="true">{isOne ? "1" : "9"}<i /><b /></span></button>
    );
  };

  return (
    <div
      ref={sceneRef}
      className={styles.nineteenCodeScene}
      data-controller="layer-stack"
      data-front-distance={Math.round(distance)}
      data-front-legibility={frontLegibility}
      data-input-mode={inputMode}
      data-shadow-state={shadowState}
      data-spatial-model="overlapping-nineteen-reveals-shadow-ten"
      data-testid="v2-scene-055"
      style={{ "--nineteen-shadow-clarity": `${Math.max(0, Math.min(1, (40 - distance) / 28))}` } as React.CSSProperties}
    >
      <span className={styles.nineteenPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.nineteenShadow} aria-hidden="true">
        <i data-testid="nineteen-shadow-one-055">1</i>
        <b data-testid="nineteen-shadow-zero-055">0</b>
      </span>
      {digitButton("one")}
      {digitButton("nine")}
    </div>
  );
}

function CipherKnot({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const origins = [{ x: 13, y: 55 }, { x: 87, y: 55 }];
  const [knotState, setKnotState] = useState<"crossed" | "tensioned" | "untied">(solved ? "untied" : "crossed");
  const [readingOrder, setReadingOrder] = useState(solved ? "PAUSE" : "fragmented");
  const [inputMode, setInputMode] = useState<"none" | "pointer-end" | "keyboard-crossing">("none");
  const [positions, setPositions] = useState(origins);
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; index: number; x: number; y: number; crossedCenter: boolean } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const complete = (mode: "pointer-end" | "keyboard-crossing") => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    setKnotState("untied");
    setReadingOrder("PAUSE");
    setInputMode(mode);
    setPositions(origins);
    onArm();
  };

  const pointInScene = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return { x: (clientX - rect.left) / rect.width * 100, y: (clientY - rect.top) / rect.height * 100 };
  };

  const visibleSolved = solved || completed;
  const visibleKnot = visibleSolved ? "untied" : knotState;
  const visibleReading = visibleSolved ? "PAUSE" : readingOrder;
  const glyphs = locale === "zh" ? ["停", "一", "下"] : ["P", "A", "U", "S", "E"];

  return (
    <div
      ref={sceneRef}
      className={styles.cipherKnotScene}
      data-controller="layer-stack"
      data-crossing-layer={visibleSolved ? "corrected" : "wrong-over"}
      data-input-mode={inputMode}
      data-knot-state={visibleKnot}
      data-reading-order={visibleReading}
      data-spatial-model="one-ribbon-one-wrong-over-under-crossing"
      data-target-reading="PAUSE"
      data-testid="v2-scene-060"
      style={{
        "--knot-left-x": `${positions[0].x}%`, "--knot-left-y": `${positions[0].y}%`,
        "--knot-right-x": `${positions[1].x}%`, "--knot-right-y": `${positions[1].y}%`,
      } as React.CSSProperties}
    >
      <span className={styles.cipherKnotPaper} aria-hidden="true"><i /><b /></span>
      <svg className={styles.cipherKnotRibbon} viewBox="0 0 240 150" aria-hidden="true">
        <path className={styles.cipherKnotUnder} d={visibleSolved ? "M25 82 C78 82 162 82 215 82" : "M25 82 C70 82 76 35 120 76 C164 117 180 90 172 68 C164 45 140 48 120 76 C100 104 76 117 68 92 C60 67 85 53 120 76 C155 99 170 82 215 82"} />
        <path className={styles.cipherKnotOver} d={visibleSolved ? "M104 82 C114 82 126 82 136 82" : "M103 63 C112 68 120 76 132 85"} />
      </svg>
      <span className={styles.cipherKnotLetters} aria-hidden="true">
        {glyphs.map((glyph, index) => <i key={index}>{glyph}</i>)}
      </span>
      <button type="button" className={styles.cipherKnotCrossing} data-testid="cipher-knot-crossing" aria-label={locale === "zh" ? "中央交叉压痕" : "Embossed central crossing"} onClick={() => undefined}><span aria-hidden="true"><i /><b /></span></button>
      {([0, 1] as const).map((index) => (
        <button
          type="button"
          key={index}
          className={`${styles.cipherKnotEnd} ${index === 0 ? styles.cipherKnotEndLeft : styles.cipherKnotEndRight}`}
          data-testid={`cipher-knot-end-${index}`}
          aria-label={locale === "zh" ? `${index === 0 ? "左侧" : "右侧"}丝带自由端` : `${index === 0 ? "Left" : "Right"} free ribbon end`}
          onClick={() => undefined}
          onPointerDown={(event) => {
            if (visibleSolved) return;
            dragRef.current = { pointerId: event.pointerId, index, x: event.clientX, y: event.clientY, crossedCenter: false };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId || drag.index !== index || visibleSolved) return;
            if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 12) return;
            const point = pointInScene(event.clientX, event.clientY);
            if (!point) return;
            discover();
            setInputMode("pointer-end");
            setKnotState("tensioned");
            setReadingOrder("shifting");
            if (point.x >= 42 && point.x <= 58) drag.crossedCenter = true;
            setPositions((current) => current.map((position, positionIndex) => positionIndex === index ? { x: Math.max(7, Math.min(93, point.x)), y: Math.max(18, Math.min(82, point.y)) } : position));
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            dragRef.current = null;
            if (!drag || drag.pointerId !== event.pointerId || drag.index !== index || visibleSolved) return;
            const point = pointInScene(event.clientX, event.clientY);
            if (!point) return;
            const crossedSide = index === 0 ? point.x >= 68 : point.x <= 32;
            const changedLayer = Math.abs(event.clientY - drag.y) >= 24;
            if (drag.crossedCenter && crossedSide && changedLayer) complete("pointer-end");
            else setPositions(origins);
          }}
          onPointerCancel={() => { dragRef.current = null; setPositions(origins); }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            discover();
            complete("keyboard-crossing");
          }}
        ><span aria-hidden="true"><i /><b /></span></button>
      ))}
    </div>
  );
}

function ReverseSweep({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const targetNotch = 28;
  const solvedScan = 100 - targetNotch;
  const [scanPosition, setScanPosition] = useState(solved ? solvedScan : 50);
  const [inputMode, setInputMode] = useState<"none" | "pointer-scan" | "wheel-scan" | "keyboard-scan">("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; scan: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const moveScan = (nextPosition: number, mode: "pointer-scan" | "wheel-scan" | "keyboard-scan") => {
    if (solved || armedRef.current) return;
    const next = Math.max(10, Math.min(90, nextPosition));
    if (Math.abs(next - scanPosition) < .5) return;
    discover();
    setInputMode(mode);
    setScanPosition(next);
    if (Math.abs((100 - next) - targetNotch) <= 4) {
      armedRef.current = true;
      setCompleted(true);
      onArm();
    }
  };

  const visibleScan = solved ? solvedScan : scanPosition;
  const cloudNotch = 100 - visibleScan;
  const distance = Math.abs(cloudNotch - targetNotch);
  const alignmentState = solved || completed || distance <= 4 ? "aligned" : distance <= 12 ? "approaching" : "separated";
  const warmTicks = alignmentState === "aligned" ? 2 : alignmentState === "approaching" ? 1 : 0;

  return (
    <div
      ref={sceneRef}
      className={styles.reverseSweepScene}
      data-controller="shared-control"
      data-alignment-state={alignmentState}
      data-cloud-notch-position={Math.round(cloudNotch)}
      data-direction-relation="hand-right-shadow-left"
      data-input-mode={inputMode}
      data-ruler-gap-position={targetNotch}
      data-scan-position={Math.round(visibleScan)}
      data-spatial-model="reversed-ruler-and-inverse-cloud-shadow"
      data-testid="v2-scene-061"
      data-warm-ticks={warmTicks}
      style={{
        "--reverse-scan-x": `${visibleScan}%`,
        "--reverse-notch-x": `${cloudNotch}%`,
        "--reverse-warmth": `${Math.max(0, 1 - distance / 22)}`,
      } as React.CSSProperties}
      onWheel={(event) => {
        if (solved || completed) return;
        event.preventDefault();
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (Math.abs(delta) < 1) return;
        moveScan(scanPosition + Math.sign(delta) * 6, "wheel-scan");
      }}
    >
      <span className={styles.reverseSweepPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.reverseSweepCloud} aria-hidden="true">
        <i data-testid="reverse-sweep-cloud-notch" />
      </span>
      <span className={styles.reverseSweepRuler} aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <i
            key={index}
            data-missing={index === 2 ? "true" : "false"}
            data-testid={`reverse-sweep-tick-${index}`}
            data-warm={Math.abs(index - 2) === 1 && warmTicks > 0 ? "true" : "false"}
          ><b>{9 - index}</b></i>
        ))}
      </span>
      <button
        type="button"
        role="slider"
        aria-label={locale === "zh" ? "反向纸尺扫描线" : "Reversed ruler scan line"}
        aria-valuemin={10}
        aria-valuemax={90}
        aria-valuenow={Math.round(visibleScan)}
        className={styles.reverseSweepScanner}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (solved || completed) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, scan: scanPosition };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const rect = sceneRef.current?.getBoundingClientRect();
          if (!drag || drag.pointerId !== event.pointerId || !rect?.width) return;
          moveScan(drag.scan + (event.clientX - drag.x) / rect.width * 100, "pointer-scan");
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          moveScan(scanPosition + (event.key === "ArrowRight" ? 5 : -5), "keyboard-scan");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

function PointerEcho({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type EchoPoint = { x: number; y: number };
  const startSolid = { x: 22, y: 68 };
  const startEcho = { x: 14, y: 75 };
  const acceptedSolid = { x: 90, y: 80 };
  const target = { x: 70, y: 38 };
  const [solid, setSolid] = useState<EchoPoint>(solved ? acceptedSolid : startSolid);
  const [echo, setEcho] = useState<EchoPoint>(solved ? target : startEcho);
  const [inputMode, setInputMode] = useState<"none" | "pointer-marker" | "keyboard-marker">("none");
  const [targetState, setTargetState] = useState<"quiet" | "echo-pending" | "solid-rejected" | "echo-accepted">(solved ? "echo-accepted" : "quiet");
  const [completed, setCompleted] = useState(false);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<number | null>(null);
  const solidRef = useRef(solid);
  const echoRef = useRef(echo);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  const inTarget = (point: EchoPoint) => Math.hypot(point.x - target.x, point.y - target.y) <= 10;
  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    setTargetState("echo-accepted");
    onArm();
  };

  const moveSolid = (nextPoint: EchoPoint, mode: "pointer-marker" | "keyboard-marker") => {
    if (solved || armedRef.current) return;
    const next = { x: Math.max(7, Math.min(93, nextPoint.x)), y: Math.max(10, Math.min(88, nextPoint.y)) };
    if (Math.hypot(next.x - solidRef.current.x, next.y - solidRef.current.y) < 1) return;
    discover();
    setInputMode(mode);
    solidRef.current = next;
    setSolid(next);
    if (inTarget(echoRef.current) && !inTarget(next)) {
      complete();
      return;
    }
    setTargetState(inTarget(next) ? "solid-rejected" : "echo-pending");
    const timer = setTimeout(() => {
      if (armedRef.current) return;
      echoRef.current = next;
      setEcho(next);
      if (inTarget(next)) {
        if (!inTarget(solidRef.current)) complete();
        else setTargetState("solid-rejected");
      } else {
        setTargetState(inTarget(solidRef.current) ? "solid-rejected" : "quiet");
      }
    }, 600);
    timersRef.current.push(timer);
  };

  const pointFromEvent = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return { x: (clientX - rect.left) / rect.width * 100, y: (clientY - rect.top) / rect.height * 100 };
  };
  const visibleSolid = solved ? acceptedSolid : solid;
  const visibleEcho = solved ? target : echo;
  const visibleTargetState = solved || completed ? "echo-accepted" : targetState;

  return (
    <div
      className={styles.pointerEchoScene}
      data-controller="shared-control"
      data-echo-position={`${Math.round(visibleEcho.x)},${Math.round(visibleEcho.y)}`}
      data-echo-state={Math.hypot(visibleSolid.x - visibleEcho.x, visibleSolid.y - visibleEcho.y) <= 2 ? "caught-up" : "lagging"}
      data-input-mode={inputMode}
      data-solid-position={`${Math.round(visibleSolid.x)},${Math.round(visibleSolid.y)}`}
      data-spatial-model="solid-pointer-delayed-paper-echo-and-shallow-well"
      data-target-state={visibleTargetState}
      data-testid="v2-scene-062"
      style={{
        "--echo-solid-x": `${visibleSolid.x}%`, "--echo-solid-y": `${visibleSolid.y}%`,
        "--echo-ghost-x": `${visibleEcho.x}%`, "--echo-ghost-y": `${visibleEcho.y}%`,
      } as React.CSSProperties}
    >
      <span className={styles.pointerEchoPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.pointerEchoWell} data-testid="pointer-echo-target" aria-hidden="true"><i /></span>
      <div
        ref={surfaceRef}
        className={styles.pointerEchoSurface}
        role="application"
        tabIndex={0}
        aria-label={locale === "zh" ? "纸影移动区" : "Paper echo movement field"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (solved || completed) return;
          pointerRef.current = event.pointerId;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          const point = pointFromEvent(event.clientX, event.clientY);
          if (point) moveSolid(point, "pointer-marker");
        }}
        onPointerMove={(event) => {
          if (solved || completed) return;
          if (pointerRef.current !== event.pointerId && event.pointerType !== "mouse") return;
          const point = pointFromEvent(event.clientX, event.clientY);
          if (point) moveSolid(point, "pointer-marker");
        }}
        onPointerUp={(event) => {
          if (pointerRef.current === event.pointerId) pointerRef.current = null;
        }}
        onPointerCancel={() => { pointerRef.current = null; }}
        onKeyDown={(event) => {
          if (!event.key.startsWith("Arrow")) return;
          event.preventDefault();
          const dx = event.key === "ArrowRight" ? 10 : event.key === "ArrowLeft" ? -10 : 0;
          const dy = event.key === "ArrowDown" ? 10 : event.key === "ArrowUp" ? -10 : 0;
          moveSolid({ x: solidRef.current.x + dx, y: solidRef.current.y + dy }, "keyboard-marker");
        }}
      >
        <span className={styles.pointerEchoTrail} aria-hidden="true">
          {[.25, .5, .75].map((ratio, index) => <i
            key={index}
            data-testid={`pointer-echo-trail-${index}`}
            style={{ left: `${visibleEcho.x + (visibleSolid.x - visibleEcho.x) * ratio}%`, top: `${visibleEcho.y + (visibleSolid.y - visibleEcho.y) * ratio}%` }}
          />)}
        </span>
        <span className={styles.pointerEchoGhost} data-testid="pointer-echo-ghost" aria-hidden="true"><i /><b /></span>
        <span className={styles.pointerEchoSolid} data-testid="pointer-echo-solid" aria-hidden="true"><i /><b /></span>
      </div>
    </div>
  );
}

const archiveKnotBands = [
  { start: 22, end: 78, texture: "dots" },
  { start: 40, end: 60, texture: "stripes" },
  { start: 60, end: 40, texture: "checks" },
  { start: 78, end: 22, texture: "dashes" },
] as const;

function ArchiveKnot({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-endpoint" | "pointer-crossing" | "keyboard-layer";
  const [endpointProbes, setEndpointProbes] = useState(0);
  const [activeEndpoint, setActiveEndpoint] = useState<number | null>(null);
  const [endpointShift, setEndpointShift] = useState(0);
  const [lift, setLift] = useState(0);
  const [crossingState, setCrossingState] = useState<"idle" | "lifting" | "rebounded" | "swapped">(solved ? "swapped" : "idle");
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const endpointDrag = useRef<{ pointerId: number; index: number; x: number; moved: boolean } | null>(null);
  const crossingDrag = useRef<{ pointerId: number; y: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = (mode: "pointer-crossing" | "keyboard-layer") => {
    if (solved || armedRef.current) return;
    discover();
    armedRef.current = true;
    setCompleted(true);
    setLift(0);
    setCrossingState("swapped");
    setInputMode(mode);
    onArm();
  };
  const visibleSolved = solved || completed;

  return (
    <div
      className={styles.archiveKnotScene}
      data-active-endpoint={activeEndpoint ?? "none"}
      data-controller="layer-stack"
      data-crossing-order={visibleSolved ? "lower-correct" : "upper-wrong"}
      data-crossing-state={visibleSolved ? "swapped" : crossingState}
      data-endpoint-probes={endpointProbes}
      data-input-mode={inputMode}
      data-matched-endpoints="4"
      data-spatial-model="four-matched-bands-one-wrong-over-under-crossing"
      data-tension-state={visibleSolved ? "released" : "knotted"}
      data-testid="v2-scene-066"
      style={{ "--archive-knot-lift": `${lift}px` } as React.CSSProperties}
    >
      <span className={styles.archiveKnotPaper} aria-hidden="true"><i /><b /></span>
      <svg className={styles.archiveKnotBands} viewBox="0 0 100 100" aria-hidden="true">
        {archiveKnotBands.map((band, index) => (
          <path
            key={band.texture}
            data-band={index}
            data-texture={band.texture}
            data-testid={`archive-knot-band-${index}`}
            d={visibleSolved
              ? `M10 ${band.start} C34 ${band.start} 66 ${band.end} 90 ${band.end}`
              : `M10 ${band.start} C33 ${band.start} 39 ${50 + (index - 1.5) * 3} 50 50 C61 ${50 - (index - 1.5) * 3} 67 ${band.end} 90 ${band.end}`}
          />
        ))}
      </svg>
      <span className={styles.archiveKnotExits} aria-hidden="true">
        {archiveKnotBands.map((band, index) => <i
          key={band.texture}
          data-texture={band.texture}
          data-testid={`archive-knot-exit-${index}`}
          style={{ top: `${band.end}%` }}
        />)}
      </span>
      <span className={styles.archiveKnotEndpoints}>
        {archiveKnotBands.map((band, index) => (
          <button
            type="button"
            key={band.texture}
            aria-label={locale === "zh" ? `档案色带端点 ${index + 1}` : `Archive ribbon endpoint ${index + 1}`}
            data-texture={band.texture}
            data-testid={`archive-knot-endpoint-${index}`}
            style={{
              top: `${band.start}%`,
              "--archive-endpoint-shift": `${activeEndpoint === index ? endpointShift : 0}px`,
            } as React.CSSProperties}
            onClick={() => undefined}
            onPointerDown={(event) => {
              if (visibleSolved) return;
              endpointDrag.current = { pointerId: event.pointerId, index, x: event.clientX, moved: false };
              setActiveEndpoint(index);
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = endpointDrag.current;
              if (!drag || drag.pointerId !== event.pointerId || drag.index !== index || visibleSolved) return;
              const delta = Math.max(-8, Math.min(46, event.clientX - drag.x));
              setEndpointShift(delta);
              if (Math.abs(delta) > 12 && !drag.moved) {
                drag.moved = true;
                setInputMode("pointer-endpoint");
                discover();
              }
            }}
            onPointerUp={(event) => {
              const drag = endpointDrag.current;
              endpointDrag.current = null;
              if (drag?.pointerId === event.pointerId && drag.moved) setEndpointProbes((count) => count + 1);
              setActiveEndpoint(null);
              setEndpointShift(0);
            }}
            onPointerCancel={() => {
              endpointDrag.current = null;
              setActiveEndpoint(null);
              setEndpointShift(0);
            }}
          ><span aria-hidden="true"><i /><b /></span></button>
        ))}
      </span>
      <button
        type="button"
        className={styles.archiveKnotCrossing}
        aria-label={locale === "zh" ? "中央上层纸带" : "Upper paper strip at the central crossing"}
        data-testid="archive-knot-crossing"
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          crossingDrag.current = { pointerId: event.pointerId, y: event.clientY };
          setCrossingState("idle");
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = crossingDrag.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const next = Math.max(0, Math.min(48, drag.y - event.clientY));
          setLift(next);
          if (next > 6) {
            setCrossingState("lifting");
            setInputMode("pointer-crossing");
            discover();
          }
        }}
        onPointerUp={(event) => {
          const drag = crossingDrag.current;
          crossingDrag.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const next = Math.max(0, drag.y - event.clientY);
          if (next >= 28) complete("pointer-crossing");
          else {
            setLift(0);
            setCrossingState("rebounded");
          }
        }}
        onPointerCancel={() => {
          crossingDrag.current = null;
          setLift(0);
          if (!visibleSolved) setCrossingState("rebounded");
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          complete("keyboard-layer");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

function TwinGates({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "drag-layer" | "keyboard-layer";
  const [frontOffset, setFrontOffset] = useState(solved ? 48 : -64);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const offsetRef = useRef(solved ? 48 : -64);
  const dragRef = useRef<{ pointerId: number; x: number; offset: number; moved: boolean } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const classify = (offset: number) => Math.abs(offset) <= 8
    ? "flat-aligned"
    : offset >= 40 && offset <= 56
      ? "front-before-rear"
      : offset > 56
        ? "reverse-stagger"
        : "side-by-side";
  const complete = (mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    offsetRef.current = 48;
    setFrontOffset(48);
    setInputMode(mode);
    setCompleted(true);
    onArm();
  };
  const setOffset = (next: number, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    const bounded = Math.max(-80, Math.min(80, next));
    offsetRef.current = bounded;
    setFrontOffset(bounded);
    setInputMode(mode);
    discover();
  };
  const settle = (mode: Exclude<InputMode, "none">) => {
    if (classify(offsetRef.current) === "front-before-rear") complete(mode);
  };
  const visibleSolved = solved || completed;
  const depthState = visibleSolved ? "front-before-rear" : classify(frontOffset);
  const lineState = depthState === "front-before-rear"
    ? "continuous-through-two-depths"
    : depthState === "flat-aligned"
      ? "one-gate-half-lit"
      : depthState === "reverse-stagger"
        ? "broken-after-rear"
        : "separate";

  return (
    <div
      className={styles.twinGatesScene}
      data-controller="layer-stack"
      data-depth-state={depthState}
      data-front-offset={visibleSolved ? 48 : Math.round(frontOffset)}
      data-gates-passed={visibleSolved ? 2 : depthState === "flat-aligned" ? 1 : 0}
      data-input-mode={inputMode}
      data-line-state={lineState}
      data-spatial-model="two-depth-gates-one-continuous-line"
      data-testid="v2-scene-070"
      style={{ "--twin-front-x": `${visibleSolved ? 48 : frontOffset}px` } as React.CSSProperties}
    >
      <span className={styles.twinGatesPaper} aria-hidden="true"><i /><b /></span>
      <span className={`${styles.twinGateSheet} ${styles.twinGateRear}`} data-depth="rear" data-testid="twin-gate-rear-sheet" aria-hidden="true">
        <i className={styles.twinGateOpening} data-testid="twin-gate-opening-rear" />
        <b className={styles.twinGateHalfLine} data-testid="twin-gate-half-line-rear" />
      </span>
      <button
        type="button"
        className={`${styles.twinGateSheet} ${styles.twinGateFront}`}
        data-depth="front"
        data-testid="twin-gate-front-sheet"
        aria-label={locale === "zh" ? "上层竖向纸片" : "Upper vertical paper sheet"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, offset: offsetRef.current, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const delta = event.clientX - drag.x;
          if (Math.abs(delta) > 12) drag.moved = true;
          if (drag.moved) setOffset(drag.offset + delta, "drag-layer");
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || !drag.moved || visibleSolved) return;
          settle("drag-layer");
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = Math.max(-80, Math.min(80, offsetRef.current + (event.key === "ArrowRight" ? 16 : -16)));
          setOffset(next, "keyboard-layer");
          if (classify(next) === "front-before-rear") complete("keyboard-layer");
        }}
      >
        <i className={styles.twinGateOpening} data-testid="twin-gate-opening-front" />
        <b className={styles.twinGateHalfLine} data-testid="twin-gate-half-line-front" />
      </button>
      <span className={styles.twinGateDepthBridge} aria-hidden="true" />
      <span className={styles.twinGateSeal} aria-hidden="true" />
    </div>
  );
}

function GlassRelayOscillator({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-polarizer" | "pointer-corner" | "keyboard-polarizer";
  const initialPosition = { x: -90, y: 55 };
  const [position, setPosition] = useState(solved ? { x: 0, y: 0 } : initialPosition);
  const [angle, setAngle] = useState(solved ? 90 : 0);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const positionRef = useRef(position);
  const angleRef = useRef(angle);
  const plateDragRef = useRef<{ pointerId: number; x: number; y: number; position: typeof position; moved: boolean } | null>(null);
  const cornerDragRef = useRef<{ pointerId: number; y: number; angle: number; moved: boolean } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const isCovered = (next = positionRef.current) => Math.abs(next.x) <= 24 && Math.abs(next.y) <= 24;
  const isQuarterTurned = (next = angleRef.current) => Math.abs(next - 90) <= 15;
  const complete = (mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    positionRef.current = { x: 0, y: 0 };
    angleRef.current = 90;
    setPosition({ x: 0, y: 0 });
    setAngle(90);
    setInputMode(mode);
    setCompleted(true);
    onArm();
  };
  const setNextPosition = (next: typeof position, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    const bounded = { x: Math.max(-120, Math.min(120, Math.round(next.x))), y: Math.max(-70, Math.min(70, Math.round(next.y))) };
    positionRef.current = bounded;
    setPosition(bounded);
    setInputMode(mode);
    discover();
  };
  const settlePosition = (mode: Exclude<InputMode, "none">) => {
    if (isCovered() && isQuarterTurned()) complete(mode);
  };
  const setNextAngle = (next: number, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    const bounded = Math.max(0, Math.min(90, Math.round(next)));
    angleRef.current = bounded;
    setAngle(bounded);
    setInputMode(mode);
    discover();
  };
  const settleAngle = (mode: Exclude<InputMode, "none">) => {
    if (isCovered() && isQuarterTurned()) complete(mode);
  };
  const visibleSolved = solved || completed;
  const overlapState = visibleSolved || isCovered(position) ? "covered" : "separate";
  const waveAmplitude = visibleSolved ? "zero" : overlapState === "covered" ? "reduced" : "strong";
  const visiblePosition = visibleSolved ? { x: 0, y: 0 } : position;
  const visibleAngle = visibleSolved ? 90 : angle;

  return (
    <div
      className={styles.glassRelayScene}
      data-controller="layer-stack"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-overlap-state={overlapState}
      data-polarizer-angle={visibleAngle}
      data-polarizer-x={visiblePosition.x}
      data-polarizer-y={visiblePosition.y}
      data-spatial-model="two-glass-waves-one-cross-polarizer"
      data-testid="v2-scene-072"
      data-wave-amplitude={waveAmplitude}
      style={{
        "--glass-polarizer-x": `${visiblePosition.x}px`,
        "--glass-polarizer-y": `${visiblePosition.y}px`,
        "--glass-polarizer-angle": `${visibleAngle}deg`,
      } as React.CSSProperties}
    >
      <span className={styles.glassRelayPaper} aria-hidden="true"><i /><b /></span>
      <span className={`${styles.glassSheet} ${styles.glassSheetLeft}`} data-testid="glass-sheet-left" aria-hidden="true"><i /></span>
      <span className={`${styles.glassSheet} ${styles.glassSheetRight}`} data-testid="glass-sheet-right" aria-hidden="true"><i /></span>
      <span className={styles.glassDoubleShadow} data-testid="glass-double-shadow" aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={styles.glassPolarizer}
        data-testid="glass-polarizer"
        aria-label={locale === "zh" ? "带偏振纹的透明薄片" : "Transparent sheet with polarizing grain"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          plateDragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, position: positionRef.current, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = plateDragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (Math.hypot(dx, dy) > 8) drag.moved = true;
          if (drag.moved) setNextPosition({ x: drag.position.x + dx, y: drag.position.y + dy }, "pointer-polarizer");
        }}
        onPointerUp={(event) => {
          const drag = plateDragRef.current;
          plateDragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || !drag.moved || visibleSolved) return;
          settlePosition("pointer-polarizer");
        }}
        onPointerCancel={() => { plateDragRef.current = null; }}
        onKeyDown={(event) => {
          const deltas: Partial<Record<string, { x: number; y: number }>> = {
            ArrowLeft: { x: -30, y: 0 }, ArrowRight: { x: 30, y: 0 }, ArrowUp: { x: 0, y: -30 }, ArrowDown: { x: 0, y: 30 },
          };
          const delta = deltas[event.key];
          if (!delta) return;
          event.preventDefault();
          const next = { x: positionRef.current.x + delta.x, y: positionRef.current.y + delta.y };
          setNextPosition(next, "keyboard-polarizer");
          if (isCovered(next) && isQuarterTurned()) complete("keyboard-polarizer");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <button
        type="button"
        className={styles.glassPolarizerCorner}
        data-testid="glass-polarizer-corner"
        aria-label={locale === "zh" ? "偏振薄片的折角" : "Folded corner of the polarizing sheet"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          cornerDragRef.current = { pointerId: event.pointerId, y: event.clientY, angle: angleRef.current, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = cornerDragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dy = event.clientY - drag.y;
          if (Math.abs(dy) > 8) drag.moved = true;
          if (drag.moved) setNextAngle(drag.angle + dy, "pointer-corner");
        }}
        onPointerUp={(event) => {
          const drag = cornerDragRef.current;
          cornerDragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || !drag.moved || visibleSolved) return;
          settleAngle("pointer-corner");
        }}
        onPointerCancel={() => { cornerDragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " " && event.key !== "ArrowRight") return;
          event.preventDefault();
          setNextAngle(90, "keyboard-polarizer");
          if (isCovered()) complete("keyboard-polarizer");
        }}
      ><span aria-hidden="true" /></button>
      <span className={styles.glassRelaySeal} aria-hidden="true" />
    </div>
  );
}

function ClueRelayBraid({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-weave" | "keyboard-weave";
  const targets = [1, -1, 1] as const;
  const [depths, setDepths] = useState<number[]>(solved ? [...targets] : [0, 0, 0]);
  const depthsRef = useRef(depths);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<Record<number, { pointerId: number; y: number; depth: number; moved: boolean }>>({});
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const depthName = (depth: number) => depth > 0 ? "up" : depth < 0 ? "down" : "middle";
  const setDepth = (bandIndex: number, depth: number, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    const bounded = Math.max(-1, Math.min(1, depth));
    const next = depthsRef.current.map((value, index) => index === bandIndex ? bounded : value);
    depthsRef.current = next;
    setDepths(next);
    setInputMode(mode);
    discover();
    if (next.every((value, index) => value === targets[index]) && !armedRef.current) {
      armedRef.current = true;
      setCompleted(true);
      onArm();
    }
  };
  const visibleSolved = solved || completed;
  const visibleDepths = visibleSolved ? [...targets] : depths;
  const phraseClarity = visibleDepths.filter((depth, index) => depth === targets[index]).length;
  const fragments = locale === "zh" ? ["沿 ·", "· 着空 ·", "· 隙"] : ["FOL ·", "· LOW TH ·", "· E GAP"];

  return (
    <div
      className={styles.clueBraidScene}
      data-controller="layer-stack"
      data-depths={visibleDepths.map(depthName).join(",")}
      data-edge-patterns="up,down,up"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-phrase-clarity={phraseClarity}
      data-spatial-model="three-sentence-bands-three-depths-over-under-over"
      data-testid="v2-scene-074"
    >
      <span className={styles.clueBraidPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.clueBraidCrossing} aria-hidden="true"><i /><b /><em /></span>
      {visibleDepths.map((depth, bandIndex) => {
        const matched = depth === targets[bandIndex];
        return (
          <button
            type="button"
            className={styles.clueBraidBand}
            data-depth={depthName(depth)}
            data-edge-match={matched ? "true" : "false"}
            data-testid={`braid-band-${bandIndex}`}
            key={bandIndex}
            aria-label={locale === "zh" ? `透明句带 ${bandIndex + 1}` : `Transparent sentence band ${bandIndex + 1}`}
            style={{
              "--braid-band-index": bandIndex,
              "--braid-base-y": `${[-2.35, 0, 2.35][bandIndex]}rem`,
              "--braid-depth-shift": `${-depth * 8}px`,
              "--braid-rotation": `${[-12, 3, 14][bandIndex]}deg`,
              zIndex: 7 + depth,
            } as React.CSSProperties}
            onClick={() => undefined}
            onPointerDown={(event) => {
              if (visibleSolved) return;
              dragRef.current[bandIndex] = { pointerId: event.pointerId, y: event.clientY, depth, moved: false };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current[bandIndex];
              if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
              const dy = event.clientY - drag.y;
              if (Math.abs(dy) > 18) drag.moved = true;
              if (drag.moved) setDepth(bandIndex, dy < 0 ? 1 : -1, "pointer-weave");
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current[bandIndex];
              delete dragRef.current[bandIndex];
              if (!drag || drag.pointerId !== event.pointerId || !drag.moved || visibleSolved) return;
              setDepth(bandIndex, event.clientY - drag.y < 0 ? 1 : -1, "pointer-weave");
            }}
            onPointerCancel={() => { delete dragRef.current[bandIndex]; }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
              event.preventDefault();
              setDepth(bandIndex, depth + (event.key === "ArrowUp" ? 1 : -1), "keyboard-weave");
            }}
          >
            <span className={styles.clueBraidFragment}>{fragments[bandIndex]}</span>
            <i
              className={`${styles.clueBraidEdge} ${targets[bandIndex] > 0 ? styles.clueBraidEdgeUp : styles.clueBraidEdgeDown}`}
              data-testid={`braid-edge-${bandIndex}`}
              aria-hidden="true"
            />
          </button>
        );
      })}
      <span className={styles.clueBraidReveal} aria-hidden="true"><i /><b /><em /></span>
      {visibleSolved ? <span className={styles.clueBraidPhrase}>{locale === "zh" ? "沿着空隙" : "FOLLOW THE GAP"}</span> : null}
      <span className={styles.clueBraidSeal} aria-hidden="true" />
    </div>
  );
}

function LayerStack(props: ControllerProps & { kind?: V2ControllerKind }) {
  return props.level.id === 8
    ? <RelaySandwich {...props} />
    : props.level.id === 34
      ? <DoubleHorizon {...props} />
      : props.level.id === 37
        ? <ParallaxWindow {...props} />
        : props.level.id === 39
          ? <TabDoubleback {...props} />
          : props.level.id === 42
            ? <PanelPing {...props} />
            : props.level.id === 50
              ? <MirroredInput {...props} />
              : props.level.id === 55
                ? <NineteenCode {...props} />
                : props.level.id === 60
                ? <CipherKnot {...props} />
                  : props.level.id === 66
                    ? <ArchiveKnot {...props} />
                    : props.level.id === 70
                      ? <TwinGates {...props} />
                      : props.level.id === 72
                        ? <GlassRelayOscillator {...props} />
                      : props.level.id === 74
                        ? <ClueRelayBraid {...props} />
                        : props.level.id === 95
                          ? <TriplePhase {...props} />
                          : <GenericLayerStack {...props} />;
}

function FoldedCalibration({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [leftFolded, setLeftFolded] = useState(false);
  const [rightFolded, setRightFolded] = useState(false);
  const [offsets, setOffsets] = useState({ left: 0, right: 0 });
  const starts = useRef<{ left: number | null; right: number | null }>({ left: null, right: null });
  const armedCalibration = useRef(false);

  const fold = (side: "left" | "right") => {
    onDiscover();
    const nextLeft = side === "left" ? true : leftFolded;
    const nextRight = side === "right" ? true : rightFolded;
    setLeftFolded(nextLeft);
    setRightFolded(nextRight);
    setOffsets((current) => ({ ...current, [side]: 0 }));
    if (nextLeft && nextRight && !armedCalibration.current) {
      armedCalibration.current = true;
      onArm();
    }
  };

  const effectiveLeft = solved || leftFolded;
  const effectiveRight = solved || rightFolded;
  const widthState = effectiveLeft && effectiveRight ? "narrow" : effectiveLeft || effectiveRight ? "one-side" : "wide";

  const edge = (side: "left" | "right") => {
    const folded = side === "left" ? effectiveLeft : effectiveRight;
    return (
      <button
        type="button"
        className={`${styles.fold101Edge} ${side === "left" ? styles.fold101Left : styles.fold101Right} ${folded ? styles.fold101Folded : ""}`}
        data-folded={folded ? "true" : "false"}
        aria-label={locale === "zh" ? `${side === "left" ? "左" : "右"}侧页边` : `${side === "left" ? "Left" : "Right"} page edge`}
        style={{ transform: folded ? undefined : `translateX(${offsets[side]}px)` }}
        onClick={() => undefined}
        onPointerDown={(event) => {
          starts.current[side] = event.clientX;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = starts.current[side];
          if (start === null || folded) return;
          const directional = side === "left" ? event.clientX - start : start - event.clientX;
          if (directional > 12) onDiscover();
          setOffsets((current) => ({ ...current, [side]: side === "left" ? Math.max(0, directional) : -Math.max(0, directional) }));
        }}
        onPointerUp={(event) => {
          const start = starts.current[side];
          starts.current[side] = null;
          if (start === null || folded) return;
          const directional = side === "left" ? event.clientX - start : start - event.clientX;
          if (directional >= 56) fold(side);
          else setOffsets((current) => ({ ...current, [side]: 0 }));
        }}
        onPointerCancel={() => {
          starts.current[side] = null;
          setOffsets((current) => ({ ...current, [side]: 0 }));
        }}
        onKeyDown={(event) => {
          const correct = side === "left" ? event.key === "ArrowRight" : event.key === "ArrowLeft";
          if (!correct && event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          fold(side);
        }}
      >
        <span className={styles.fold101One} aria-hidden="true">1</span>
        <span className={styles.fold101Half} aria-hidden="true" />
      </button>
    );
  };

  return (
    <div
      className={`${styles.fold101Scene} ${styles[`fold101_${widthState}`]}`}
      data-controller="fold"
      data-left-folded={effectiveLeft ? "true" : "false"}
      data-page-width-state={widthState}
      data-right-folded={effectiveRight ? "true" : "false"}
      data-spatial-model="two-page-edges"
      data-testid="v2-scene-010"
    >
      <span className={styles.fold101Outline} aria-hidden="true" />
      {edge("left")}
      {edge("right")}
    </div>
  );
}

function BrokenMeasure({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [foldProgress, setFoldProgress] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [wrongFolds, setWrongFolds] = useState(0);
  const [paperResponse, setPaperResponse] = useState<"still" | "lifting" | "rebound" | "joined">("still");
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lastDeltaRef = useRef({ x: 0, y: 0 });
  const armedRef = useRef(false);
  const visibleProgress = solved ? 100 : foldProgress;
  const backLine = visibleProgress >= 100 ? "joined" : visibleProgress >= 35 ? "shadow" : "hidden";

  const armFold = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setFoldProgress(100);
    setPaperResponse("joined");
    onDiscover();
    onArm();
  };

  const rebound = () => {
    setWrongFolds((current) => current + 1);
    setFoldProgress(0);
    setPaperResponse("rebound");
    onDiscover();
  };

  const updateFold = (clientX: number, clientY: number) => {
    const start = startRef.current;
    if (!start || armedRef.current || solved) return;
    const delta = { x: clientX - start.x, y: clientY - start.y };
    lastDeltaRef.current = delta;
    const upwardLeft = Math.min(Math.max(0, -delta.x) / 50, Math.max(0, -delta.y) / 40);
    const nextProgress = Math.min(100, Math.round(upwardLeft * 100));
    setFoldProgress(nextProgress);
    if (nextProgress >= 12) {
      setPaperResponse("lifting");
      onDiscover();
    }
  };

  return (
    <div
      className={styles.brokenMeasureScene}
      data-back-line={backLine}
      data-clicks={clicks}
      data-controller="fold"
      data-fold-progress={visibleProgress}
      data-front-bars="3"
      data-gesture-threshold="35x28"
      data-measure-cells="4"
      data-paper-response={solved ? "joined" : paperResponse}
      data-spatial-model="thick-corner-reveals-backside-fourth-bar"
      data-testid="v2-scene-030"
      data-wrong-folds={wrongFolds}
      style={{ "--fold-progress": visibleProgress } as React.CSSProperties}
    >
      <span className={styles.brokenPaper} aria-hidden="true">
        <span className={styles.brokenBeatEvidence}>{[0, 1, 2, 3].map((beat) => <i key={beat} />)}</span>
        <span className={styles.brokenStaff}>{[0, 1, 2].map((line) => <i key={line} />)}</span>
        <span className={styles.brokenBackLine} />
        <span className={styles.brokenFourBeatSweep}>{[0, 1, 2, 3].map((beat) => <i key={beat} />)}</span>
      </span>
      <button
        type="button"
        className={styles.brokenCornerControl}
        aria-label={locale === "zh" ? "加厚的右下折角" : "Thick lower-right fold"}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          startRef.current = { x: event.clientX, y: event.clientY };
          lastDeltaRef.current = { x: 0, y: 0 };
          setPaperResponse("still");
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => updateFold(event.clientX, event.clientY)}
        onPointerUp={(event) => {
          const start = startRef.current;
          if (!start || armedRef.current || solved) return;
          updateFold(event.clientX, event.clientY);
          const delta = { x: event.clientX - start.x, y: event.clientY - start.y };
          startRef.current = null;
          lastDeltaRef.current = delta;
          if (Math.hypot(delta.x, delta.y) <= 12) {
            setClicks((current) => current + 1);
            setFoldProgress(0);
            setPaperResponse("still");
            return;
          }
          if (delta.x <= -35 && delta.y <= -28) {
            armFold();
            return;
          }
          if (delta.x > 12 || delta.y > 12) {
            rebound();
            return;
          }
          setFoldProgress(0);
          setPaperResponse("still");
        }}
        onPointerCancel={() => {
          startRef.current = null;
          setFoldProgress(0);
          setPaperResponse("still");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            armFold();
          } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            rebound();
          }
        }}
      >
        <span className={styles.brokenCornerFace} aria-hidden="true"><i /></span>
      </button>
      {wrongFolds > 0 ? <span key={wrongFolds} className={styles.brokenRebound} aria-hidden="true" /> : null}
    </div>
  );
}

type ReadyLeaf = "left" | "right";

function ReadyCode({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [leaves, setLeaves] = useState<Record<ReadyLeaf, boolean>>({ left: false, right: false });
  const [offsets, setOffsets] = useState<Record<ReadyLeaf, number>>({ left: 0, right: 0 });
  const [rebounds, setRebounds] = useState(0);
  const [inputMode, setInputMode] = useState<"none" | "pointer-leaves" | "keyboard-leaves">("none");
  const [completed, setCompleted] = useState(false);
  const leavesRef = useRef<Record<ReadyLeaf, boolean>>({ left: false, right: false });
  const startsRef = useRef<Partial<Record<ReadyLeaf, { pointerId: number; x: number }>>>({});
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const openLeaf = (side: ReadyLeaf, mode: "pointer-leaves" | "keyboard-leaves") => {
    if (armedRef.current || solved || leavesRef.current[side]) return;
    discover();
    const next = { ...leavesRef.current, [side]: true };
    leavesRef.current = next;
    setLeaves(next);
    setOffsets((current) => ({ ...current, [side]: 0 }));
    setInputMode(mode);
    if (!next.left || !next.right) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const outwardDistance = (side: ReadyLeaf, clientX: number, startX: number) => side === "left"
    ? startX - clientX
    : clientX - startX;

  const moveLeaf = (side: ReadyLeaf, clientX: number) => {
    const start = startsRef.current[side];
    if (!start || leavesRef.current[side] || armedRef.current || solved) return;
    const distance = outwardDistance(side, clientX, start.x);
    if (Math.abs(distance) > 12) {
      discover();
      setInputMode("pointer-leaves");
    }
    setOffsets((current) => ({ ...current, [side]: Math.max(-12, Math.min(54, distance)) }));
  };

  const finishLeaf = (side: ReadyLeaf, clientX: number, pointerId: number) => {
    const start = startsRef.current[side];
    if (!start || start.pointerId !== pointerId || leavesRef.current[side] || armedRef.current || solved) return;
    delete startsRef.current[side];
    const distance = outwardDistance(side, clientX, start.x);
    if (Math.abs(distance) <= 12) {
      setOffsets((current) => ({ ...current, [side]: 0 }));
      return;
    }
    discover();
    setInputMode("pointer-leaves");
    if (distance >= 40) {
      openLeaf(side, "pointer-leaves");
      return;
    }
    if (distance <= -20) setRebounds((current) => current + 1);
    setOffsets((current) => ({ ...current, [side]: 0 }));
  };

  const visibleLeaves = solved || completed ? { left: true, right: true } : leaves;
  const visibleWord = visibleLeaves.left && visibleLeaves.right
    ? "STEADY"
    : visibleLeaves.left
      ? "S·EADY"
      : visibleLeaves.right
        ? "·TEADY"
        : "READY";

  const leaf = (side: ReadyLeaf) => {
    const open = visibleLeaves[side];
    const label = locale === "zh"
      ? `R ${side === "left" ? "左" : "右"}页纸缝`
      : `${side === "left" ? "Left" : "Right"} leaf of thick R tile`;
    const correctKey = side === "left" ? "ArrowLeft" : "ArrowRight";
    return (
      <button
        type="button"
        className={`${styles.readyCodeLeaf} ${side === "left" ? styles.readyCodeLeafLeft : styles.readyCodeLeafRight}`}
        data-open={open ? "true" : "false"}
        aria-label={label}
        style={{ "--ready-leaf-offset": `${open ? 54 : offsets[side]}px` } as React.CSSProperties}
        onPointerDown={(event) => {
          if (open || armedRef.current || solved) return;
          startsRef.current[side] = { pointerId: event.pointerId, x: event.clientX };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (startsRef.current[side]?.pointerId !== event.pointerId) return;
          moveLeaf(side, event.clientX);
        }}
        onPointerUp={(event) => finishLeaf(side, event.clientX, event.pointerId)}
        onPointerCancel={() => {
          delete startsRef.current[side];
          setOffsets((current) => ({ ...current, [side]: 0 }));
        }}
        onKeyDown={(event) => {
          if (event.key !== correctKey) return;
          event.preventDefault();
          openLeaf(side, "keyboard-leaves");
        }}
      ><span aria-hidden="true"><i /></span></button>
    );
  };

  const staticLetters = locale === "zh" ? ["", "", "", ""] : ["E", "A", "D", "Y"];
  return (
    <div
      className={styles.readyCodeScene}
      data-controller="fold"
      data-front-glyph="就绪"
      data-inner-glyph="稳定"
      data-input-mode={inputMode}
      data-left-leaf={visibleLeaves.left ? "open" : "closed"}
      data-motion={visibleLeaves.left && visibleLeaves.right ? "still" : "shaking"}
      data-rebounds={rebounds}
      data-right-leaf={visibleLeaves.right ? "open" : "closed"}
      data-spatial-model="thick-double-leaf-ready-type"
      data-testid="v2-scene-051"
      data-visible-word={visibleWord}
    >
      <span className={styles.readyCodePaper} aria-hidden="true"><i /><b /></span>
      <div className={styles.readyCodeTypeRow}>
        <div className={styles.readyCodeThickTile} data-testid="ready-code-thick-tile-051">
          <span
            className={`${styles.readyCodeInner} ${styles.readyCodeInnerLeft}`}
            data-revealed={visibleLeaves.left ? "true" : "false"}
            data-testid="ready-code-inner-left-051"
            aria-hidden="true"
          >{locale === "zh" ? "稳" : "S"}</span>
          <span
            className={`${styles.readyCodeInner} ${styles.readyCodeInnerRight}`}
            data-revealed={visibleLeaves.right ? "true" : "false"}
            data-testid="ready-code-inner-right-051"
            aria-hidden="true"
          >{locale === "zh" ? "定" : "T"}</span>
          <span className={styles.readyCodeFrontGlyph} aria-hidden="true">{locale === "zh" ? "就绪" : "R"}</span>
          <span className={styles.readyCodeSeam} data-testid="ready-code-seam-051" aria-hidden="true" />
          {leaf("left")}
          {leaf("right")}
        </div>
        {staticLetters.map((letter, index) => <span
          key={index}
          className={styles.readyCodeStaticTile}
          data-testid={`ready-code-static-tile-${index}`}
          aria-hidden="true"
        >{letter}<i /></span>)}
      </div>
    </div>
  );
}

function BendCommand({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [foldProgress, setFoldProgress] = useState(0);
  const [rebounds, setRebounds] = useState(0);
  const [inputMode, setInputMode] = useState<"none" | "pointer-fold" | "keyboard-fold">("none");
  const [completed, setCompleted] = useState(false);
  const startRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const progressRef = useRef(0);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const writeProgress = (progress: number) => {
    const next = Math.max(0, Math.min(100, Math.round(progress)));
    progressRef.current = next;
    setFoldProgress(next);
  };

  const complete = (mode: "pointer-fold" | "keyboard-fold") => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    discover();
    setInputMode(mode);
    writeProgress(100);
    setCompleted(true);
    onArm();
  };

  const updateFold = (clientX: number, clientY: number) => {
    const start = startRef.current;
    if (!start || armedRef.current || solved) return;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    if (Math.hypot(dx, dy) <= 12) return;
    discover();
    setInputMode("pointer-fold");
    const upward = Math.max(0, -dy);
    const horizontalPenalty = Math.max(0, Math.abs(dx) - 24) * .8;
    writeProgress((upward - horizontalPenalty) / 60 * 100);
  };

  const finishFold = (clientX: number, clientY: number, pointerId: number) => {
    const start = startRef.current;
    if (!start || start.pointerId !== pointerId || armedRef.current || solved) return;
    startRef.current = null;
    const dx = clientX - start.x;
    const dy = clientY - start.y;
    if (Math.hypot(dx, dy) <= 12) {
      writeProgress(0);
      return;
    }
    discover();
    setInputMode("pointer-fold");
    if (dy <= -48 && Math.abs(dx) <= 65) {
      complete("pointer-fold");
      return;
    }
    setRebounds((current) => current + 1);
    writeProgress(0);
  };

  const visibleProgress = solved || completed ? 100 : foldProgress;
  const quiet = visibleProgress >= 100;
  return (
    <div
      className={styles.bendCommandScene}
      data-back-glyph="静"
      data-controller="fold"
      data-fold-progress={visibleProgress}
      data-front-glyph="急"
      data-input-mode={inputMode}
      data-letter-state={quiet ? "quiet" : visibleProgress >= 20 ? "transition" : "front"}
      data-rebounds={rebounds}
      data-spatial-model="single-command-strip-backside-rewrite"
      data-testid="v2-scene-052"
      data-visible-command={quiet ? "HUSH" : "RUSH"}
      style={{ "--bend-progress": `${visibleProgress}%` } as React.CSSProperties}
    >
      <span className={styles.bendCommandPaper} aria-hidden="true"><i /><b /></span>
      <div className={styles.bendCommandStrip}>
        <span className={styles.bendCommandBack} data-testid="bend-command-back-052" data-visible={visibleProgress >= 20 ? "true" : "false"} aria-hidden="true">
          {locale === "zh" ? "静" : "H"}
        </span>
        <span className={styles.bendCommandFront} aria-hidden="true">{locale === "zh" ? "急" : "R"}</span>
        {locale === "zh" ? <span className={styles.bendCommandQuietMarks} aria-hidden="true"><i /><i /><i /></span> : ["U", "S", "H"].map((letter) => <span key={letter} className={styles.bendCommandLetter} aria-hidden="true">{letter}</span>)}
        <button
          type="button"
          className={styles.bendCommandCrease}
          data-testid="bend-command-crease-052"
          aria-label={locale === "zh" ? "命令纸带折线" : "Command strip crease"}
          onPointerDown={(event) => {
            if (armedRef.current || solved) return;
            startRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (startRef.current?.pointerId !== event.pointerId) return;
            updateFold(event.clientX, event.clientY);
          }}
          onPointerUp={(event) => finishFold(event.clientX, event.clientY, event.pointerId)}
          onPointerCancel={() => {
            startRef.current = null;
            writeProgress(0);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            complete("keyboard-fold");
          }}
        ><span aria-hidden="true"><i /><b /></span></button>
      </div>
    </div>
  );
}

type OverridePinState = "loose" | "dragging" | "tilted" | "locked";

function BilingualOverride({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const pinOrigin = { x: 82, y: 72 };
  const [pinPosition, setPinPosition] = useState(pinOrigin);
  const [pinState, setPinState] = useState<OverridePinState>(solved ? "locked" : "loose");
  const [ringTransfers, setRingTransfers] = useState(0);
  const [speedRelation, setSpeedRelation] = useState<"opposed" | "transferred">("opposed");
  const [inputMode, setInputMode] = useState<"none" | "ring-drag" | "pointer-pin" | "keyboard-pin">("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const pinPositionRef = useRef(pinOrigin);
  const pinStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const ringStartsRef = useRef<Record<"outer" | "inner", { pointerId: number; x: number; y: number; moved: boolean } | null>>({ outer: null, inner: null });
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const writePinPosition = (position: { x: number; y: number }) => {
    const bounded = {
      x: Math.max(8, Math.min(92, Math.round(position.x))),
      y: Math.max(8, Math.min(92, Math.round(position.y))),
    };
    pinPositionRef.current = bounded;
    setPinPosition(bounded);
  };

  const pointInScene = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return {
      x: (clientX - rect.left) / rect.width * 100,
      y: (clientY - rect.top) / rect.height * 100,
    };
  };

  const complete = (mode: "pointer-pin" | "keyboard-pin") => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    discover();
    setInputMode(mode);
    writePinPosition({ x: 50, y: 50 });
    setPinState("locked");
    setCompleted(true);
    onArm();
  };

  const moveRing = (ring: "outer" | "inner", clientX: number, clientY: number, pointerId: number) => {
    const start = ringStartsRef.current[ring];
    if (!start || start.pointerId !== pointerId || solved || armedRef.current) return;
    if (Math.hypot(clientX - start.x, clientY - start.y) <= 12) return;
    start.moved = true;
    discover();
    setInputMode("ring-drag");
  };

  const finishRing = (ring: "outer" | "inner", pointerId: number) => {
    const start = ringStartsRef.current[ring];
    ringStartsRef.current[ring] = null;
    if (!start || start.pointerId !== pointerId || !start.moved || solved || armedRef.current) return;
    setRingTransfers((count) => count + 1);
    setSpeedRelation("transferred");
  };

  const ring = (kind: "outer" | "inner") => (
    <button
      type="button"
      className={`${styles.overrideRing} ${kind === "outer" ? styles.overrideRingOuter : styles.overrideRingInner}`}
      aria-label={locale === "zh" ? `${kind === "outer" ? "外层 SLOW" : "内层 慢"} 纸环` : `${kind === "outer" ? "Outer SLOW" : "Inner slow"} paper ring`}
      onClick={() => undefined}
      onPointerDown={(event) => {
        if (solved || armedRef.current) return;
        ringStartsRef.current[kind] = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => moveRing(kind, event.clientX, event.clientY, event.pointerId)}
      onPointerUp={(event) => finishRing(kind, event.pointerId)}
      onPointerCancel={() => { ringStartsRef.current[kind] = null; }}
    >
      <span aria-hidden="true">{kind === "outer" ? "SLOW" : "慢"}</span>
      <i data-testid={`override-ring-direction-${kind}`} aria-hidden="true">{kind === "outer" ? "↻" : "↺"}</i>
    </button>
  );

  const visibleSolved = solved || completed;
  const visiblePin = visibleSolved ? { x: 50, y: 50 } : pinPosition;
  const visiblePinState: OverridePinState = visibleSolved ? "locked" : pinState;
  return (
    <div
      ref={sceneRef}
      className={styles.bilingualOverrideScene}
      data-controller="shared-control"
      data-input-mode={inputMode}
      data-motion={visibleSolved ? "still" : "opposed"}
      data-pin-state={visiblePinState}
      data-pin-x={visiblePin.x}
      data-pin-y={visiblePin.y}
      data-ring-transfers={ringTransfers}
      data-spatial-model="counter-rotating-bilingual-rings-shared-axle"
      data-speed-relation={speedRelation}
      data-testid="v2-scene-053"
      style={{ "--override-pin-x": `${visiblePin.x}%`, "--override-pin-y": `${visiblePin.y}%` } as React.CSSProperties}
    >
      <span className={styles.overridePaper} aria-hidden="true"><i /><b /></span>
      {ring("outer")}
      {ring("inner")}
      <span className={styles.overrideSharedAxle} data-testid="override-shared-axle-053" aria-hidden="true"><i /></span>
      <span className={styles.overrideMesh} aria-hidden="true"><i /><i /><i /><i /></span>
      <button
        type="button"
        className={styles.overrideLoosePin}
        aria-label={locale === "zh" ? "松开的纸轴钉" : "Loose paper axle pin"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          pinStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          setPinState("dragging");
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = pinStartRef.current;
          if (!start || start.pointerId !== event.pointerId || visibleSolved) return;
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
          const point = pointInScene(event.clientX, event.clientY);
          if (!point) return;
          discover();
          setInputMode("pointer-pin");
          writePinPosition(point);
          const distance = Math.hypot(point.x - 50, point.y - 50);
          setPinState(distance > 17 && distance < 38 ? "tilted" : "dragging");
        }}
        onPointerUp={(event) => {
          const start = pinStartRef.current;
          pinStartRef.current = null;
          if (!start || start.pointerId !== event.pointerId || visibleSolved) return;
          const point = pointInScene(event.clientX, event.clientY);
          if (!point || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) {
            setPinState("loose");
            writePinPosition(pinOrigin);
            return;
          }
          discover();
          setInputMode("pointer-pin");
          if (Math.hypot(point.x - 50, point.y - 50) <= 12) {
            complete("pointer-pin");
            return;
          }
          setPinState("tilted");
          writePinPosition(pinOrigin);
        }}
        onPointerCancel={() => {
          pinStartRef.current = null;
          setPinState("loose");
          writePinPosition(pinOrigin);
        }}
        onKeyDown={(event) => {
          const delta = event.key === "ArrowLeft" ? [-16, 0]
            : event.key === "ArrowRight" ? [16, 0]
              : event.key === "ArrowUp" ? [0, -16]
                : event.key === "ArrowDown" ? [0, 16]
                  : null;
          if (delta) {
            event.preventDefault();
            discover();
            setInputMode("keyboard-pin");
            setPinState("dragging");
            writePinPosition({ x: pinPositionRef.current.x + delta[0], y: pinPositionRef.current.y + delta[1] });
            return;
          }
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setInputMode("keyboard-pin");
          if (Math.hypot(pinPositionRef.current.x - 50, pinPositionRef.current.y - 50) <= 12) complete("keyboard-pin");
          else setPinState("tilted");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

const hundredGapPositions = [36, 50, 64, 78] as const;
const hundredPreviews = ["1.000", "10.00", "100.0", "1000."] as const;

function HundredCode({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const origin = { x: 20, y: 80 };
  const [dotPosition, setDotPosition] = useState(origin);
  const [selectedGap, setSelectedGap] = useState<number | null>(solved ? 1 : null);
  const [inputMode, setInputMode] = useState<"none" | "pointer-gap" | "keyboard-gap">("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const selectedGapRef = useRef<number | null>(solved ? 1 : null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const pointInScene = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return {
      x: (clientX - rect.left) / rect.width * 100,
      y: (clientY - rect.top) / rect.height * 100,
    };
  };

  const nearestGap = (point: { x: number; y: number }) => {
    if (Math.abs(point.y - 45) > 14) return -1;
    let nearest = -1;
    let distance = Number.POSITIVE_INFINITY;
    hundredGapPositions.forEach((x, index) => {
      const next = Math.abs(point.x - x);
      if (next <= 9 && next < distance) {
        nearest = index;
        distance = next;
      }
    });
    return nearest;
  };

  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const selectGap = (gap: number, mode: "pointer-gap" | "keyboard-gap") => {
    if (armedRef.current || solved) return;
    discover();
    selectedGapRef.current = gap;
    setSelectedGap(gap);
    setInputMode(mode);
    setDotPosition({ x: hundredGapPositions[gap], y: 45 });
    if (gap === 1) complete();
  };

  const visibleSolved = solved || completed;
  const visibleGap = visibleSolved ? 1 : selectedGap;
  const visiblePosition = visibleSolved ? { x: hundredGapPositions[1], y: 45 } : dotPosition;
  const preview = visibleGap === null ? "none" : hundredPreviews[visibleGap];

  return (
    <div
      ref={sceneRef}
      className={styles.hundredCodeScene}
      data-controller="shared-control"
      data-decimal-state={visibleGap === null ? "decoration" : "punctuation"}
      data-display-preview={preview}
      data-dot-state={visibleSolved ? "placed" : visibleGap === null ? "loose" : "preview"}
      data-input-mode={inputMode}
      data-selected-gap={visibleGap ?? "none"}
      data-spatial-model="loose-speck-becomes-decimal-in-number-strip"
      data-testid="v2-scene-056"
      style={{ "--hundred-dot-x": `${visiblePosition.x}%`, "--hundred-dot-y": `${visiblePosition.y}%` } as React.CSSProperties}
    >
      <span className={styles.hundredPaper} aria-hidden="true"><i /><b /></span>
      <div className={styles.hundredNumberStrip} aria-hidden="true">
        {["1", "0", "0", "0"].map((digit, index) => <span key={index} data-testid={`hundred-digit-${index}`}>{digit}</span>)}
      </div>
      <span className={styles.hundredGapRow} aria-hidden="true">
        {hundredGapPositions.map((position, index) => <i key={position} data-active={visibleGap === index ? "true" : "false"} data-testid={`hundred-gap-${index}`} style={{ left: `${position}%` }} />)}
      </span>
      <button
        type="button"
        className={styles.hundredLooseDot}
        aria-label={locale === "zh" ? "纸带下方的小墨点" : "Small ink speck below the strip"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          startRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = startRef.current;
          if (!start || start.pointerId !== event.pointerId || visibleSolved) return;
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
          const point = pointInScene(event.clientX, event.clientY);
          if (!point) return;
          discover();
          setInputMode("pointer-gap");
          setDotPosition({ x: Math.max(8, Math.min(92, Math.round(point.x))), y: Math.max(12, Math.min(88, Math.round(point.y))) });
          const gap = nearestGap(point);
          if (gap >= 0) {
            selectedGapRef.current = gap;
            setSelectedGap(gap);
          }
        }}
        onPointerUp={(event) => {
          const start = startRef.current;
          startRef.current = null;
          if (!start || start.pointerId !== event.pointerId || visibleSolved) return;
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
          const point = pointInScene(event.clientX, event.clientY);
          const gap = point ? nearestGap(point) : -1;
          if (gap >= 0) {
            selectGap(gap, "pointer-gap");
            return;
          }
          const previous = selectedGapRef.current;
          setDotPosition(previous === null ? origin : { x: hundredGapPositions[previous], y: 45 });
        }}
        onPointerCancel={() => {
          startRef.current = null;
          const previous = selectedGapRef.current;
          setDotPosition(previous === null ? origin : { x: hundredGapPositions[previous], y: 45 });
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          const current = selectedGapRef.current ?? (event.key === "ArrowRight" ? -1 : 4);
          selectGap(Math.max(0, Math.min(3, current + (event.key === "ArrowRight" ? 1 : -1))), "keyboard-gap");
        }}
      ><span aria-hidden="true" /></button>
    </div>
  );
}

const fiveBitFaces = [1, 0, 1, 1, 0] as const;

function FiveBitLatch({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [lightX, setLightX] = useState(solved ? 50 : 18);
  const [inputMode, setInputMode] = useState<"none" | "pointer-light" | "keyboard-light">("none");
  const [chipFeedback, setChipFeedback] = useState<"idle" | "sprung-back">("idle");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ pointerId: number; x: number; startLightX: number } | null>(null);
  const lightXRef = useRef(solved ? 50 : 18);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const complete = (mode: "pointer-light" | "keyboard-light") => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    setInputMode(mode);
    lightXRef.current = 50;
    setLightX(50);
    onArm();
  };

  const moveLight = (next: number, mode: "pointer-light" | "keyboard-light", final = false) => {
    if (armedRef.current || solved) return;
    const clamped = Math.max(12, Math.min(88, next));
    discover();
    setInputMode(mode);
    lightXRef.current = clamped;
    setLightX(clamped);
    if (final && Math.abs(clamped - 50) <= 5) complete(mode);
  };

  const visibleSolved = solved || completed;
  const visibleLightX = visibleSolved ? 50 : lightX;
  const distance = Math.abs(visibleLightX - 50);
  const latchedPairs = visibleSolved || distance <= 5 ? 2 : distance <= 18 ? 1 : 0;
  const lightState = visibleSolved || distance <= 5
    ? "centered"
    : distance <= 18
      ? "near-center"
      : visibleLightX < 50 ? "left-offset" : "right-offset";
  const compositeSequence = visibleSolved || distance <= 5 ? "10101" : distance <= 18 ? "forming" : "scrambled";
  const shadowShift = (visibleLightX - 50) * -.42;

  return (
    <div
      ref={sceneRef}
      className={styles.fiveBitLatchScene}
      data-chip-feedback={chipFeedback}
      data-composite-sequence={compositeSequence}
      data-controller="light-drag"
      data-face-sequence="10110"
      data-input-mode={inputMode}
      data-latched-pairs={latchedPairs}
      data-light-state={lightState}
      data-shadow-offset={visibleLightX === 50 ? "zero" : visibleLightX > 50 ? "positive" : "negative"}
      data-slot-state={visibleSolved ? "closed" : "open"}
      data-spatial-model="shared-light-aligns-palindromic-bit-shadows"
      data-testid="v2-scene-057"
      style={{
        "--five-light-x": `${visibleLightX}%`,
        "--five-shadow-shift": `${shadowShift}%`,
      } as React.CSSProperties}
    >
      <span className={styles.fiveBitPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.fiveBitLightRail} aria-hidden="true" />
      <button
        type="button"
        className={styles.fiveBitLight}
        aria-label={locale === "zh" ? "纸槽上方的共享光源" : "Shared light above the paper slot"}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          startRef.current = { pointerId: event.pointerId, x: event.clientX, startLightX: lightXRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = startRef.current;
          const rect = sceneRef.current?.getBoundingClientRect();
          if (!start || start.pointerId !== event.pointerId || !rect?.width || visibleSolved) return;
          if (Math.abs(event.clientX - start.x) <= 8) return;
          moveLight(start.startLightX + (event.clientX - start.x) / rect.width * 100, "pointer-light");
        }}
        onPointerUp={(event) => {
          const start = startRef.current;
          const rect = sceneRef.current?.getBoundingClientRect();
          startRef.current = null;
          if (!start || start.pointerId !== event.pointerId || !rect?.width || visibleSolved) return;
          if (Math.abs(event.clientX - start.x) <= 8) return;
          moveLight(start.startLightX + (event.clientX - start.x) / rect.width * 100, "pointer-light", true);
        }}
        onPointerCancel={() => { startRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = lightXRef.current + (event.key === "ArrowRight" ? 16 : -16);
          moveLight(next, "keyboard-light", Math.abs(next - 50) <= 5);
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.fiveBitBeam} aria-hidden="true" />
      <div className={styles.fiveBitSlot} aria-hidden="true">
        <span className={styles.fiveBitSlotTop} />
        <span className={styles.fiveBitSlotBottom} />
      </div>
      <div className={styles.fiveBitFaces}>
        {fiveBitFaces.map((bit, index) => {
          const pressed = latchedPairs === 2 ? index !== 2 : latchedPairs === 1 ? index === 0 || index === 4 : false;
          return (
            <button
              type="button"
              key={index}
              className={styles.fiveBitFace}
              aria-label={locale === "zh" ? `位元片 ${index + 1}` : `Bit tile ${index + 1}`}
              data-bit={bit}
              data-pressed={pressed ? "true" : "false"}
              data-testid={`five-bit-face-${index}`}
              onClick={() => {
                if (visibleSolved) return;
                discover();
                setChipFeedback("sprung-back");
              }}
            ><span aria-hidden="true"><i /><b /></span></button>
          );
        })}
      </div>
      <div className={styles.fiveBitShadows} aria-hidden="true">
        {[1, 0, 1, 0, 1].map((bit, index) => (
          <i key={index} data-bit={bit} data-testid={`five-bit-shadow-${index}`} />
        ))}
      </div>
    </div>
  );
}

function CipherReversal({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [flipProgress, setFlipProgress] = useState(solved ? 1 : 0);
  const [letterOffset, setLetterOffset] = useState<"none" | "disturbed">("none");
  const [inputMode, setInputMode] = useState<"none" | "pointer-letter" | "pointer-fold" | "keyboard-fold">("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const foldStartRef = useRef<{ pointerId: number; x: number } | null>(null);
  const glyphStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const flipProgressRef = useRef(solved ? 1 : 0);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const complete = (mode: "pointer-fold" | "keyboard-fold") => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    setInputMode(mode);
    flipProgressRef.current = 1;
    setFlipProgress(1);
    onArm();
  };

  const visibleSolved = solved || completed;
  const visibleProgress = visibleSolved ? 1 : flipProgress;
  const flipState = visibleSolved ? "back" : visibleProgress >= .3 ? "half" : "front";
  const frontGlyphs = locale === "zh" ? ["⌁", "◐", "≋", "◒"] : ["W", "O", "L", "S"];
  const rearGlyphs = locale === "zh" ? ["◒", "≋", "◐", "⌁"] : ["S", "L", "O", "W"];

  return (
    <div
      ref={sceneRef}
      className={styles.cipherReversalScene}
      data-controller="fold"
      data-flip-state={flipState}
      data-front-order="WOLS"
      data-input-mode={inputMode}
      data-letter-offset={letterOffset}
      data-reading-directions={visibleSolved ? "rear-forward" : flipState === "half" ? "both" : "front-and-rear-shadow"}
      data-rear-order="SLOW"
      data-shadow-legibility={letterOffset === "disturbed" ? "worse" : "readable-right-to-left"}
      data-spatial-model="one-transparent-strip-flips-as-a-whole"
      data-testid="v2-scene-058"
      data-visible-order={visibleSolved ? "SLOW" : "WOLS"}
      style={{ "--cipher-flip": visibleProgress } as React.CSSProperties}
    >
      <span className={styles.cipherPaper} aria-hidden="true"><i /><b /></span>
      <div className={styles.cipherRearShadow} data-testid="cipher-rear-shadow" aria-hidden="true">
        {locale === "zh" ? frontGlyphs.join("") : "WOLS"}
      </div>
      <div className={styles.cipherWholeStrip} aria-hidden="true">
        <span className={styles.cipherStripFront}>{frontGlyphs.map((glyph, index) => <i key={index}>{glyph}</i>)}</span>
        <span className={styles.cipherStripBack}>{rearGlyphs.map((glyph, index) => <i key={index}>{glyph}</i>)}</span>
      </div>
      <div className={styles.cipherGlyphHitRow}>
        {frontGlyphs.map((glyph, index) => (
          <button
            type="button"
            key={index}
            aria-label={locale === "zh" ? `透明字片 ${index + 1}` : `Transparent glyph ${index + 1}`}
            data-testid={`cipher-glyph-${index}`}
            onClick={() => undefined}
            onPointerDown={(event) => {
              if (visibleSolved) return;
              glyphStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const start = glyphStartRef.current;
              if (!start || start.pointerId !== event.pointerId || visibleSolved) return;
              if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
              discover();
              setInputMode("pointer-letter");
              setLetterOffset("disturbed");
            }}
            onPointerUp={() => { glyphStartRef.current = null; }}
            onPointerCancel={() => { glyphStartRef.current = null; }}
          ><span aria-hidden="true">{glyph}</span></button>
        ))}
      </div>
      <button
        type="button"
        className={styles.cipherFoldCorner}
        aria-label={locale === "zh" ? "透明词带的折角" : "Folded corner of the transparent word strip"}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          foldStartRef.current = { pointerId: event.pointerId, x: event.clientX };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = foldStartRef.current;
          const rect = sceneRef.current?.getBoundingClientRect();
          if (!start || start.pointerId !== event.pointerId || !rect?.width || visibleSolved) return;
          const distance = start.x - event.clientX;
          if (distance <= 10) return;
          discover();
          setInputMode("pointer-fold");
          const progress = Math.max(0, Math.min(1, distance / (rect.width * .55)));
          flipProgressRef.current = progress;
          setFlipProgress(progress);
        }}
        onPointerUp={(event) => {
          const start = foldStartRef.current;
          foldStartRef.current = null;
          if (!start || start.pointerId !== event.pointerId || visibleSolved) return;
          if (flipProgressRef.current >= .62) complete("pointer-fold");
          else {
            flipProgressRef.current = 0;
            setFlipProgress(0);
          }
        }}
        onPointerCancel={() => {
          foldStartRef.current = null;
          flipProgressRef.current = 0;
          setFlipProgress(0);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          discover();
          complete("keyboard-fold");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

const clockSumLengths = [2, 3, 5] as const;

function ClockfaceSum({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const solvedStarts = [0, 2, 5];
  const [starts, setStarts] = useState(solved ? solvedStarts : [0, 4, 8]);
  const [inputMode, setInputMode] = useState<"none" | "pointer-arc" | "keyboard-arc">("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const startsRef = useRef(solved ? solvedStarts : [0, 4, 8]);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; index: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const coverageFor = (nextStarts: number[]) => {
    const coverage = Array.from({ length: 10 }, () => 0);
    nextStarts.forEach((start, index) => {
      for (let step = 0; step < clockSumLengths[index]; step += 1) coverage[(start + step) % 10] += 1;
    });
    return coverage;
  };

  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const writeArc = (index: number, tick: number, mode: "pointer-arc" | "keyboard-arc") => {
    if (armedRef.current || solved) return;
    discover();
    const next = [...startsRef.current];
    next[index] = (tick + 10) % 10;
    startsRef.current = next;
    setStarts(next);
    setInputMode(mode);
    if (coverageFor(next).every((count) => count === 1)) complete();
  };

  const tickFromPoint = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    const x = clientX - (rect.left + rect.width / 2);
    const y = clientY - (rect.top + rect.height / 2);
    const degrees = (Math.atan2(y, x) * 180 / Math.PI + 450) % 360;
    return Math.round(degrees / 36) % 10;
  };

  const visibleSolved = solved || completed;
  const visibleStarts = starts;
  const coverage = coverageFor(visibleStarts);
  const joins = visibleStarts.reduce((count, start, index) => {
    const end = (start + clockSumLengths[index]) % 10;
    return count + (visibleStarts.some((otherStart, otherIndex) => otherIndex !== index && otherStart === end) ? 1 : 0);
  }, 0);
  const completeCycle = coverage.every((count) => count === 1);
  const coverageState = completeCycle ? "complete-cycle" : joins > 0 ? "forming" : "overlap-and-gaps";

  return (
    <div
      ref={sceneRef}
      className={styles.clockfaceSumScene}
      data-arc-lengths="2,3,5"
      data-arc-starts={visibleStarts.join(",")}
      data-controller="orbit"
      data-coverage-state={coverageState}
      data-input-mode={inputMode}
      data-merged-dots={completeCycle ? "10" : coverage.filter((count) => count === 1).length}
      data-spatial-model="three-arcs-cover-one-ten-tick-cycle"
      data-testid="v2-scene-059"
    >
      <span className={styles.clockfacePaper} aria-hidden="true"><i /><b /></span>
      <svg className={styles.clockfaceArcTracks} viewBox="0 0 200 200" aria-hidden="true">
        {clockSumLengths.map((length, index) => (
          <circle
            key={length}
            cx="100"
            cy="100"
            r="66"
            pathLength="100"
            data-arc={index}
            strokeDasharray={`${length * 10 - 1.8} ${100 - (length * 10 - 1.8)}`}
            style={{ transform: `rotate(${visibleStarts[index] * 36 - 90}deg)` }}
          />
        ))}
      </svg>
      <div className={styles.clockfaceTicks} aria-hidden="true">
        {coverage.map((count, index) => (
          <i
            key={index}
            data-count={count}
            data-testid={`clock-sum-tick-${index}`}
            style={{ "--clock-tick-angle": `${index * 36}deg` } as React.CSSProperties}
          />
        ))}
      </div>
      <span className={styles.clockfaceCenter} data-testid="clock-sum-center" aria-hidden="true">10</span>
      <div className={styles.clockfaceHandles}>
        {clockSumLengths.map((length, index) => (
          <button
            type="button"
            key={length}
            aria-label={locale === "zh" ? `${["两", "三", "五"][index]}格刻度弧片` : `${length}-tick arc strip`}
            data-testid={`clock-sum-arc-${index}`}
            style={{ "--clock-arc-angle": `${visibleStarts[index] * 36}deg` } as React.CSSProperties}
            onClick={() => undefined}
            onPointerDown={(event) => {
              if (visibleSolved) return;
              dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, index };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId || drag.index !== index || visibleSolved) return;
              if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 12) return;
              const tick = tickFromPoint(event.clientX, event.clientY);
              if (tick !== null) writeArc(index, tick, "pointer-arc");
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current;
              dragRef.current = null;
              if (!drag || drag.pointerId !== event.pointerId || drag.index !== index || visibleSolved) return;
              if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 12) return;
              const tick = tickFromPoint(event.clientX, event.clientY);
              if (tick !== null) writeArc(index, tick, "pointer-arc");
            }}
            onPointerCancel={() => { dragRef.current = null; }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              writeArc(index, startsRef.current[index] + (event.key === "ArrowRight" ? 1 : -1), "keyboard-arc");
            }}
          ><span aria-hidden="true">{length}</span></button>
        ))}
      </div>
    </div>
  );
}

function HingeLoop({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-hinge" | "keyboard-hinge";
  const [angle, setAngle] = useState(solved ? 180 : 0);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = (mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    discover();
    armedRef.current = true;
    setInputMode(mode);
    setAngle(180);
    setCompleted(true);
    onArm();
  };
  const visibleSolved = solved || completed;
  const visibleAngle = visibleSolved ? 180 : angle;
  const face = visibleAngle === 0 ? "front" : visibleAngle === 180 ? "back" : "turning";
  const ringState = visibleAngle === 0
    ? "same-direction-halves"
    : visibleAngle === 180
      ? "complete-loop"
      : "growing-across-hinge";

  return (
    <div
      className={styles.hingeLoopScene}
      data-controller="fold"
      data-flip-angle={Math.round(visibleAngle)}
      data-input-mode={inputMode}
      data-right-face={face}
      data-ring-state={ringState}
      data-spatial-model="two-board-shared-hinge-front-back-loop"
      data-testid="v2-scene-064"
      style={{ "--hinge-flip": visibleAngle } as React.CSSProperties}
    >
      <span className={styles.hingeLoopPaper} aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={`${styles.hingeLoopBoard} ${styles.hingeLoopLeft}`}
        aria-label={locale === "zh" ? "左侧铰链纸板" : "Left hinged board"}
        data-testid="hinge-loop-board-0"
        onClick={() => undefined}
      ><span className={styles.hingeLoopHalf} aria-hidden="true" /></button>
      <span className={styles.hingeLoopAxis} data-testid="hinge-loop-axis" aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={`${styles.hingeLoopBoard} ${styles.hingeLoopRight}`}
        aria-label={locale === "zh" ? "右侧铰链纸板" : "Right hinged board"}
        data-testid="hinge-loop-board-1"
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const inward = Math.max(0, drag.x - event.clientX);
          const next = Math.min(180, inward / 80 * 180);
          setAngle(next);
          if (next > 10) {
            setInputMode("pointer-hinge");
            discover();
          }
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const next = Math.min(180, Math.max(0, drag.x - event.clientX) / 80 * 180);
          if (next >= 115) complete("pointer-hinge");
          else setAngle(0);
        }}
        onPointerCancel={() => {
          dragRef.current = null;
          if (!visibleSolved) setAngle(0);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          complete("keyboard-hinge");
        }}
      >
        <span className={styles.hingeLoopFront} aria-hidden="true"><i className={styles.hingeLoopHalf} /></span>
        <span className={styles.hingeLoopBack} aria-hidden="true"><i className={styles.hingeLoopHalf} /></span>
      </button>
    </div>
  );
}

function SevenRelayVote({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-fold" | "keyboard-fold";
  const [progress, setProgress] = useState(solved ? 70 : 0);
  const progressRef = useRef(solved ? 70 : 0);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; progress: number; moved: boolean } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const inCompleteView = (value: number) => value >= 55 && value <= 88;
  const complete = (mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    progressRef.current = 70;
    setProgress(70);
    setInputMode(mode);
    setCompleted(true);
    onArm();
  };
  const moveFold = (next: number, mode: Exclude<InputMode, "none">, final = false) => {
    if (solved || armedRef.current) return;
    const clamped = Math.max(0, Math.min(100, next));
    progressRef.current = clamped;
    setProgress(clamped);
    setInputMode(mode);
    discover();
    if (final && inCompleteView(clamped)) complete(mode);
  };

  const visibleSolved = solved || completed;
  const visibleProgress = visibleSolved ? 70 : progress;
  const visibleVotes = visibleSolved || inCompleteView(visibleProgress) ? 7 : visibleProgress > 88 ? 6 : visibleProgress >= 12 ? 5 : 3;
  const visibleShadows = visibleSolved || inCompleteView(visibleProgress) ? 4 : visibleProgress > 88 ? 3 : visibleProgress >= 12 ? 2 : 0;
  const foldState = visibleSolved
    ? "balanced-open"
    : visibleProgress > 88 ? "overfolded" : visibleProgress >= 12 ? "partly-open" : "closed";
  const voteDirections = ["left", "right", "right", "right", "left", "right", "left"] as const;

  return (
    <div
      ref={sceneRef}
      className={styles.sevenVoteScene}
      data-controller="fold"
      data-fold-state={foldState}
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-majority={visibleSolved ? "right" : "concealed"}
      data-spatial-model="seven-votes-three-exposed-four-behind-one-adjustable-fold"
      data-testid="v2-scene-079"
      data-visible-shadows={visibleShadows}
      data-visible-votes={visibleVotes}
      style={{ "--seven-fold-progress": visibleProgress } as React.CSSProperties}
    >
      <span className={styles.sevenVotePaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.sevenVoteSwitch} aria-hidden="true"><i /></span>
      <div className={styles.sevenVoteLeaves}>
        {voteDirections.map((direction, index) => (
          <button
            type="button"
            className={styles.sevenVoteLeaf}
            data-direction={direction}
            data-revealed={index < visibleVotes ? "true" : "false"}
            data-testid={`countdown-vote-${index}`}
            key={index}
            aria-label={locale === "zh" ? `投票纸叶 ${index + 1}` : `Vote leaf ${index + 1}`}
            onClick={() => undefined}
            style={{ "--seven-vote-index": index } as React.CSSProperties}
          ><span aria-hidden="true"><i /><b /></span></button>
        ))}
      </div>
      <div className={styles.sevenVoteShadows} aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            data-visible={index < visibleShadows ? "true" : "false"}
            data-testid={`countdown-shadow-${index}`}
            key={index}
            style={{ "--seven-shadow-index": index } as React.CSSProperties}
          ><i /></span>
        ))}
      </div>
      <button
        type="button"
        className={styles.sevenVoteFold}
        data-testid="countdown-fold"
        aria-label={locale === "zh" ? "遮住投票叶的纸折页" : "Paper fold covering the vote leaves"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, progress: progressRef.current, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dx = drag.x - event.clientX;
          if (Math.abs(dx) <= 8) return;
          drag.moved = true;
          const width = sceneRef.current?.getBoundingClientRect().width ?? 0;
          moveFold(drag.progress + (width > 0 ? dx / width * 100 : dx / 2.5), "pointer-fold");
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || !drag.moved || visibleSolved) return;
          const width = sceneRef.current?.getBoundingClientRect().width ?? 0;
          const dx = drag.x - event.clientX;
          moveFold(drag.progress + (width > 0 ? dx / width * 100 : dx / 2.5), "pointer-fold", true);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = progressRef.current + (event.key === "ArrowLeft" ? 20 : -20);
          moveFold(next, "keyboard-fold", inCompleteView(next));
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.sevenVoteSeal} aria-hidden="true" />
    </div>
  );
}

function FoldController(props: ControllerProps) {
  return props.level.id === 10
    ? <FoldedCalibration {...props} />
    : props.level.id === 30
      ? <BrokenMeasure {...props} />
      : props.level.id === 51
        ? <ReadyCode {...props} />
        : props.level.id === 52
          ? <BendCommand {...props} />
          : props.level.id === 58
            ? <CipherReversal {...props} />
            : props.level.id === 64
              ? <HingeLoop {...props} />
              : props.level.id === 79
              ? <SevenRelayVote {...props} />
                : props.level.id === 88
                  ? <LiminalDevice {...props} />
                  : props.level.id === 91
                    ? <ModeFlip {...props} />
                    : props.level.id === 93
                      ? <SixBeatLock {...props} />
                      : <DiscreteController {...props} kind="fold" />;
}

function LiminalDevice({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type Piece = "inside" | "outside";
  type InputMode = "idle" | "pointer-fold" | "keyboard-fold" | "pointer-edge" | "keyboard-edge";
  const [folded, setFolded] = useState(false);
  const [lastCrossing, setLastCrossing] = useState("none");
  const [returnState, setReturnState] = useState<"idle" | "wrapped-unseated" | "seated-inside">("idle");
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; piece: Piece } | null>(null);
  const foldDragRef = useRef<{ pointerId: number; x: number } | null>(null);
  const suppressFoldClickRef = useRef(false);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };

  const flip = (mode: "pointer-fold" | "keyboard-fold") => {
    if (visibleSolved) return;
    discover();
    setFolded((value) => !value);
    setInputMode(mode);
    setReturnState("idle");
    setLastCrossing("none");
  };

  const crossEdge = (piece: Piece, mode: "pointer-edge" | "keyboard-edge") => {
    if (visibleSolved || armedRef.current) return;
    discover();
    setInputMode(mode);
    const edge = folded ? "reversed-edge" : "old-edge";
    setLastCrossing(`${piece}-${edge}`);
    if (folded && piece === "outside") {
      armedRef.current = true;
      setReturnState("seated-inside");
      setCompleted(true);
      onArm();
      return;
    }
    setReturnState("wrapped-unseated");
  };

  const piece = (kind: Piece) => {
    const text = locale === "zh" ? (kind === "inside" ? "内" : "外") : kind === "inside" ? "IN" : "OUT";
    const side = visibleSolved && kind === "outside" ? "slot" : folded ? (kind === "inside" ? "right" : "left") : kind === "inside" ? "left" : "right";
    return (
      <button
        type="button"
        className={`${styles.liminalPiece} ${kind === "inside" ? styles.liminalInside : styles.liminalOutside}`}
        aria-label={locale === "zh" ? `${text}侧纸片` : `${text} face paper`}
        data-kind={kind}
        data-side={side}
        data-testid={`liminal-${kind}-piece`}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, piece: kind };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || drag.piece !== kind || visibleSolved) return;
          if (Math.abs(event.clientX - drag.x) > 10) discover();
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || drag.piece !== kind || visibleSolved) return;
          if (event.clientX - drag.x > -70) return;
          crossEdge(kind, "pointer-edge");
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft") return;
          event.preventDefault();
          crossEdge(kind, "keyboard-edge");
        }}
      ><span aria-hidden="true">{text}</span></button>
    );
  };

  return (
    <div
      className={styles.liminalScene}
      data-controller="fold"
      data-edge-texture={folded ? "reversed" : "front"}
      data-fold-state={folded ? "back" : "front"}
      data-input-mode={inputMode}
      data-last-crossing={lastCrossing}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-operation-modes="fold,edge-drag"
      data-return-state={visibleSolved ? "seated-inside" : returnState}
      data-spatial-model="inside-outside-pieces-central-reversible-fold-and-redefined-return-edge"
      data-testid="v2-scene-088"
    >
      <span className={styles.liminalPaper} aria-hidden="true"><i /><b /></span>
      <span className={`${styles.liminalEdge} ${styles.liminalEdgeLeft}`} data-testid="liminal-edge-left" aria-hidden="true" />
      <span className={`${styles.liminalEdge} ${styles.liminalEdgeRight}`} data-testid="liminal-edge-right" aria-hidden="true" />
      <span className={styles.liminalReturnSlot} data-testid="liminal-return-slot" aria-hidden="true" />
      {piece("inside")}
      {piece("outside")}
      <button
        type="button"
        className={styles.liminalFold}
        data-testid="liminal-fold"
        aria-label={locale === "zh" ? "中央双面折页" : "Central reversible fold"}
        onClick={() => {
          if (suppressFoldClickRef.current) {
            suppressFoldClickRef.current = false;
            return;
          }
          flip("pointer-fold");
        }}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          foldDragRef.current = { pointerId: event.pointerId, x: event.clientX };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerUp={(event) => {
          const drag = foldDragRef.current;
          foldDragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          if (Math.abs(event.clientX - drag.x) < 24) return;
          suppressFoldClickRef.current = true;
          flip("pointer-fold");
        }}
        onPointerCancel={() => { foldDragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          flip("keyboard-fold");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.liminalReturnTrace} aria-hidden="true" />
      <span className={styles.liminalSeal} aria-hidden="true" />
    </div>
  );
}

function AlternatingRing({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [orientations, setOrientations] = useState([0, 1, 0]);
  const orientationsRef = useRef([0, 1, 0]);
  const pointerStarts = useRef<Record<number, number>>({});
  const suppressClicks = useRef<Record<number, boolean>>({});
  const armedRef = useRef(false);

  const toggle = (index: number) => {
    if (solved || armedRef.current) return;
    onDiscover();
    const next = orientationsRef.current.map((value, position) => position === index ? (value === 0 ? 1 : 0) : value);
    orientationsRef.current = next;
    setOrientations(next);
    if (!next.every((value) => value === 0)) return;
    armedRef.current = true;
    onArm();
  };

  const pattern = solved ? "000" : orientations.join("");

  return (
    <div
      className={`${styles.alternatingRingScene} ${pattern === "000" ? styles.alternatingRingComplete : ""}`}
      data-controller="flip"
      data-ring-pattern={pattern}
      data-spatial-model="three-alternating-arcs"
      data-testid="v2-scene-015"
    >
      <span className={styles.ringCenter} aria-hidden="true" />
      {orientations.map((orientation, index) => (
        <button
          type="button"
          key={index}
          className={`${styles.alternatingArc} ${styles[`alternatingArc${index + 1}`]} ${orientation === 1 ? styles.alternatingArcReversed : ""}`}
          aria-label={locale === "zh" ? `圆弧纸片 ${index + 1}` : `Arc paper piece ${index + 1}`}
          data-orientation={orientation}
          onPointerDown={(event) => {
            pointerStarts.current[index] = event.clientY;
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerUp={(event) => {
            const start = pointerStarts.current[index];
            delete pointerStarts.current[index];
            if (start === undefined) return;
            const delta = Math.abs(event.clientY - start);
            if (delta > 18 || delta <= 6) {
              suppressClicks.current[index] = true;
              toggle(index);
            }
          }}
          onPointerCancel={() => { delete pointerStarts.current[index]; }}
          onClick={() => {
            if (suppressClicks.current[index]) {
              suppressClicks.current[index] = false;
              return;
            }
            toggle(index);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            toggle(index);
          }}
        ><span aria-hidden="true"><i /><b /></span></button>
      ))}
      <i className={styles.ringSeam} aria-hidden="true" />
    </div>
  );
}

function InvertedNibble({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [flips, setFlips] = useState([0, 0, 0, 0]);
  const flipsRef = useRef([0, 0, 0, 0]);
  const pointerStarts = useRef<Record<number, number>>({});
  const suppressClicks = useRef<Record<number, boolean>>({});
  const armedRef = useRef(false);
  const glyphs = ["2", "3", "5", "8"];

  const toggle = (index: number) => {
    if (solved || armedRef.current) return;
    onDiscover();
    const next = flipsRef.current.map((value, position) => position === index ? (value === 0 ? 1 : 0) : value);
    flipsRef.current = next;
    setFlips(next);
    if (next.join("") !== "0010") return;
    armedRef.current = true;
    onArm();
  };

  const pattern = solved ? "0010" : flips.join("");
  const seam = pattern === "0010" ? "continuous" : "broken";

  return (
    <div
      className={`${styles.invertedNibbleScene} ${seam === "continuous" ? styles.invertedNibbleComplete : ""}`}
      data-controller="flip"
      data-nibble-pattern={pattern}
      data-seam={seam}
      data-spatial-model="four-mirrored-half-glyphs"
      data-testid="v2-scene-017"
    >
      <span className={styles.nibblePaperLine} aria-hidden="true" />
      {flips.map((flipped, index) => {
        const repaired = index === 2 && (flipped === 1 || solved);
        const crease = index === 2 && !repaired ? "contrary" : "regular";
        const grain = index === 2 && !repaired ? "reversed" : "continuous";
        return (
          <button
            type="button"
            key={index}
            className={`${styles.nibbleTile} ${index === 2 ? styles.nibbleOdd : ""} ${flipped === 1 || solved && index === 2 ? styles.nibbleFlipped : ""}`}
            aria-label={locale === "zh" ? `上下半字纸片 ${index + 1}` : `Half-glyph paper tile ${index + 1}`}
            data-crease={crease}
            data-grain={grain}
            data-flipped={flipped}
            onPointerDown={(event) => {
              pointerStarts.current[index] = event.clientY;
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerUp={(event) => {
              const start = pointerStarts.current[index];
              delete pointerStarts.current[index];
              if (start === undefined) return;
              const delta = Math.abs(event.clientY - start);
              if (delta > 18 || delta <= 6) {
                suppressClicks.current[index] = true;
                toggle(index);
              }
            }}
            onPointerCancel={() => { delete pointerStarts.current[index]; }}
            onClick={() => {
              if (suppressClicks.current[index]) {
                suppressClicks.current[index] = false;
                return;
              }
              toggle(index);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              toggle(index);
            }}
          >
            <span className={styles.nibbleGlyph} aria-hidden="true"><b>{glyphs[index]}</b><i>{glyphs[index]}</i></span>
            <span className={styles.nibbleCrease} aria-hidden="true" />
            <span className={styles.nibbleGrain} aria-hidden="true"><i /><b /></span>
          </button>
        );
      })}
      <i className={styles.nibbleSeam} aria-hidden="true" />
    </div>
  );
}

function LandscapeNudge({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [angle, setAngle] = useState(90);
  const [hingeRevealed, setHingeRevealed] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [wrongRotations, setWrongRotations] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const armedRef = useRef(false);
  const angleRef = useRef(90);
  const visibleAngle = solved ? 0 : angle;
  const baseline = Math.abs(visibleAngle) <= 15 ? "joined" : Math.abs(visibleAngle) <= 35 ? "approaching" : "split";

  const setNextAngle = (next: number) => {
    const bounded = Math.max(-15, Math.min(105, Math.round(next)));
    angleRef.current = bounded;
    setAngle(bounded);
    if (Math.abs(90 - bounded) > 6) {
      setHingeRevealed(true);
      onDiscover();
    }
    return bounded;
  };

  const armStrip = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    angleRef.current = 0;
    setAngle(0);
    setHingeRevealed(true);
    onDiscover();
    onArm();
  };

  const moveFromPointer = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return angleRef.current;
    const hingeX = rect.left + rect.width * .48;
    const hingeY = rect.top + rect.height * .54;
    return setNextAngle(Math.atan2(clientY - hingeY, clientX - hingeX) * 180 / Math.PI);
  };

  const finish = () => {
    draggingRef.current = false;
    if (Math.abs(angleRef.current) <= 15) {
      armStrip();
      return;
    }
    setWrongRotations((current) => current + 1);
  };

  return (
    <div
      ref={sceneRef}
      className={styles.landscapeNudgeScene}
      data-baseline={baseline}
      data-clicks={clicks}
      data-controller="flip"
      data-device-orientations="0"
      data-hinge={hingeRevealed || solved ? "revealed" : "concealed"}
      data-spatial-model="two-title-halves-one-hinge"
      data-strip-angle={visibleAngle}
      data-testid="v2-scene-032"
      data-title-halves="2"
      data-wrong-rotations={wrongRotations}
      style={{ "--title-strip-angle": `${visibleAngle}deg` } as React.CSSProperties}
    >
      <span className={styles.landscapeCrease} aria-hidden="true" />
      <span className={styles.landscapeFirstHalf} aria-hidden="true">
        <b>{locale === "zh" ? "时间" : "TIME"}</b><i />
      </span>
      <span className={styles.landscapeHinge} aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={styles.landscapeStripControl}
        aria-label={locale === "zh" ? "竖向的后半标题纸条" : "Vertical second title strip"}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          setClicks((current) => current + 1);
        }}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          draggingRef.current = true;
          pointerStartRef.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current || armedRef.current || solved) return;
          const start = pointerStartRef.current;
          if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 6) return;
          moveFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current || armedRef.current || solved) return;
          const start = pointerStartRef.current;
          pointerStartRef.current = null;
          draggingRef.current = false;
          if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) {
            suppressClickRef.current = true;
            setClicks((current) => current + 1);
            return;
          }
          suppressClickRef.current = true;
          moveFromPointer(event.clientX, event.clientY);
          finish();
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
          pointerStartRef.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            armStrip();
            return;
          }
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = setNextAngle(angleRef.current + (event.key === "ArrowRight" ? -15 : 15));
          if (Math.abs(next) <= 15) armStrip();
        }}
      >
        <span className={styles.landscapeSecondHalf} aria-hidden="true">
          <b>{locale === "zh" ? "会弯" : "BENDS"}</b><i />
        </span>
      </button>
      {wrongRotations > 0 ? <span key={wrongRotations} className={styles.landscapeRebound} aria-hidden="true" /> : null}
    </div>
  );
}

function RelayQuorum({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-flip" | "keyboard-flip";
  const initialFaces = ["o", "o", "o", "c", "c"] as const;
  const initialShadows = ["o", "c", "o", "c", "c"] as const;
  const solvedFlips = [0, 0, 1, 0, 0];
  const [flips, setFlips] = useState<number[]>(solved ? solvedFlips : [0, 0, 0, 0, 0]);
  const flipsRef = useRef(flips);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const toggle = (index: number, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    const next = flipsRef.current.map((value, position) => position === index ? (value === 0 ? 1 : 0) : value);
    flipsRef.current = next;
    setFlips(next);
    setInputMode(mode);
    discover();
    if (next.join("") === solvedFlips.join("")) {
      armedRef.current = true;
      setCompleted(true);
      onArm();
    }
  };

  const visibleSolved = solved || completed;
  const visibleFlips = visibleSolved ? solvedFlips : flips;
  const toggleVote = (value: string, flipped: number) => flipped ? (value === "o" ? "c" : "o") : value;
  const facePattern = initialFaces.map((value, index) => toggleVote(value, visibleFlips[index])).join("");
  const shadowPattern = initialShadows.map((value, index) => toggleVote(value, visibleFlips[index])).join("");
  const majority = (pattern: string) => pattern.split("").filter((value) => value === "o").length >= 3 ? "open" : "closed";
  const faceMajority = majority(facePattern);
  const shadowMajority = majority(shadowPattern);

  return (
    <div
      className={styles.relayQuorumScene}
      data-controller="flip"
      data-face-majority={faceMajority}
      data-face-pattern={facePattern}
      data-flip-pattern={visibleFlips.join("")}
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-shadow-majority={shadowMajority}
      data-shadow-pattern={shadowPattern}
      data-spatial-model="five-paper-votes-face-shadow-and-crease"
      data-testid="v2-scene-076"
      data-vote-state={visibleSolved ? "unanimous-tilt" : faceMajority === shadowMajority ? "accidental-majority" : "split-majority"}
    >
      <span className={styles.relayQuorumPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.relayQuorumBaseline} aria-hidden="true" />
      <div className={styles.relayQuorumVotes}>
        {visibleFlips.map((flipped, index) => {
          const face = facePattern[index] === "o" ? "open" : "closed";
          const shadow = shadowPattern[index] === "o" ? "open" : "closed";
          return (
            <span className={styles.relayQuorumVote} key={index} style={{ "--quorum-index": index } as React.CSSProperties}>
              <span
                className={styles.relayQuorumShadow}
                data-state={shadow}
                data-testid={`quorum-shadow-${index}`}
                aria-hidden="true"
              />
              <button
                type="button"
                className={styles.relayQuorumLeaf}
                data-crease={index === 2 ? "contrary" : "regular"}
                data-flipped={flipped}
                data-state={face}
                data-testid={`quorum-leaf-${index}`}
                aria-label={locale === "zh" ? `纸叶 ${index + 1}` : `Paper leaf ${index + 1}`}
                onClick={() => toggle(index, "pointer-flip")}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  toggle(index, "keyboard-flip");
                }}
              ><span aria-hidden="true"><i /><b /></span></button>
            </span>
          );
        })}
      </div>
      <span className={styles.relayQuorumSeal} aria-hidden="true" />
    </div>
  );
}

function SplitOperator({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-stroke" | "keyboard-stroke";
  const initial = { x: 50, y: 50 };
  const target = { x: 62, y: 50 };
  const [slash, setSlash] = useState(solved ? target : initial);
  const slashRef = useRef(solved ? target : initial);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; start: { x: number; y: number }; moved: boolean } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const atTarget = (point: { x: number; y: number }) => Math.abs(point.x - target.x) <= 8 && Math.abs(point.y - target.y) <= 10;
  const complete = (mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    slashRef.current = target;
    setSlash(target);
    setInputMode(mode);
    setCompleted(true);
    onArm();
  };
  const moveSlash = (next: { x: number; y: number }, mode: Exclude<InputMode, "none">, final = false) => {
    if (solved || armedRef.current) return;
    const clamped = { x: Math.max(18, Math.min(84, next.x)), y: Math.max(20, Math.min(80, next.y)) };
    slashRef.current = clamped;
    setSlash(clamped);
    setInputMode(mode);
    discover();
    if (final && atTarget(clamped)) complete(mode);
  };

  const visibleSolved = solved || completed;
  const visibleSlash = visibleSolved ? target : slash;
  const removed = Math.hypot(visibleSlash.x - initial.x, visibleSlash.y - initial.y) > 6;
  const operatorState = visibleSolved ? "arrow" : removed ? "equals" : "not-equal";

  return (
    <div
      ref={sceneRef}
      className={styles.splitOperatorScene}
      data-controller="shared-control"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-number-state="fixed"
      data-operator-state={operatorState}
      data-preview-state={visibleSolved ? "slowing" : "normal"}
      data-spatial-model="fixed-numbers-three-stroke-relation-and-arrow-groove"
      data-testid="v2-scene-077"
      style={{ "--operator-slash-x": `${visibleSlash.x}%`, "--operator-slash-y": `${visibleSlash.y}%` } as React.CSSProperties}
    >
      <span className={styles.splitOperatorPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.splitOperatorNumber} data-testid="operator-number-left">9.95</span>
      <span className={`${styles.splitOperatorNumber} ${styles.splitOperatorNumberRight}`} data-testid="operator-number-right">10.00</span>
      <span className={`${styles.splitOperatorStroke} ${styles.splitOperatorUpper}`} data-testid="operator-stroke-upper" aria-hidden="true" />
      <span className={`${styles.splitOperatorStroke} ${styles.splitOperatorLower}`} data-testid="operator-stroke-lower" aria-hidden="true" />
      <span className={styles.splitOperatorArrowGroove} data-testid="operator-arrow-groove" aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={styles.splitOperatorSlash}
        data-testid="operator-stroke-slash"
        aria-label={locale === "zh" ? "关系符号的斜纸笔画" : "Diagonal paper stroke in the relation symbol"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: slashRef.current, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (Math.hypot(dx, dy) <= 8) return;
          drag.moved = true;
          const rect = sceneRef.current?.getBoundingClientRect();
          moveSlash({
            x: drag.start.x + (rect?.width ? dx / rect.width * 100 : dx / 3),
            y: drag.start.y + (rect?.height ? dy / rect.height * 100 : dy / 3),
          }, "pointer-stroke");
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || !drag.moved || visibleSolved) return;
          const rect = sceneRef.current?.getBoundingClientRect();
          const point = {
            x: drag.start.x + (rect?.width ? (event.clientX - drag.x) / rect.width * 100 : (event.clientX - drag.x) / 3),
            y: drag.start.y + (rect?.height ? (event.clientY - drag.y) / rect.height * 100 : (event.clientY - drag.y) / 3),
          };
          moveSlash(point, "pointer-stroke", true);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (!event.key.startsWith("Arrow")) return;
          event.preventDefault();
          const next = {
            x: slashRef.current.x + (event.key === "ArrowRight" ? 7 : event.key === "ArrowLeft" ? -7 : 0),
            y: slashRef.current.y + (event.key === "ArrowDown" ? 7 : event.key === "ArrowUp" ? -7 : 0),
          };
          moveSlash(next, "keyboard-stroke", atTarget(next));
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.splitOperatorSeal} aria-hidden="true" />
    </div>
  );
}

function ModeFlip({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [faces, setFaces] = useState<["front" | "back", "front" | "back"]>(["front", "back"]);
  const [cardFlips, setCardFlips] = useState(0);
  const [backingState, setBackingState] = useState<"flat" | "covering-cards">("flat");
  const [inputMode, setInputMode] = useState<"idle" | "card-toggle" | "pointer-backing" | "keyboard-backing">("idle");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; y: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const toggleCard = (index: number) => {
    if (visibleSolved) return;
    discover();
    setCardFlips((count) => count + 1);
    setInputMode("card-toggle");
    setFaces((current) => index === 0
      ? [current[0] === "front" ? "back" : "front", current[1] === "front" ? "back" : "front"]
      : [current[0] === "front" ? "back" : "front", current[1] === "front" ? "back" : "front"]);
  };
  const liftBacking = (mode: "pointer-backing" | "keyboard-backing") => {
    if (visibleSolved || armedRef.current) return;
    discover();
    armedRef.current = true;
    setBackingState("covering-cards");
    setInputMode(mode);
    setCompleted(true);
    onArm();
  };

  return (
    <div
      className={styles.modeFlipScene}
      data-backing-state={visibleSolved ? "covering-cards" : backingState}
      data-card-faces={faces.join(",")}
      data-card-flips={cardFlips}
      data-controller="flip"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-page-speed={visibleSolved ? "slow" : "normal"}
      data-spatial-model="two-mutually-cancelling-mode-cards-over-one-shared-blank-backing-sheet"
      data-testid="v2-scene-091"
    >
      <span className={styles.modeFlipPaper} aria-hidden="true"><i /><b /></span>
      {(["normal", "slow"] as const).map((kind, index) => (
        <button
          type="button"
          className={`${styles.modeFlipCard} ${index === 0 ? styles.modeFlipNormal : styles.modeFlipSlow}`}
          data-face={faces[index]}
          data-testid={`mode-card-${kind}`}
          key={kind}
          aria-label={locale === "zh" ? `${kind === "normal" ? "正常" : "缓慢"}模式纸牌` : `${kind} mode paper card`}
          onClick={() => toggleCard(index)}
        ><span>{locale === "zh" ? (kind === "normal" ? "正常" : "缓慢") : kind === "normal" ? "NORMAL" : "SLOW"}</span></button>
      ))}
      <button
        type="button"
        className={styles.modeBackingSheet}
        data-testid="mode-backing-sheet"
        aria-label={locale === "zh" ? "共用空白衬纸" : "Shared blank backing sheet"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          if (drag.y - event.clientY > 10) discover();
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          if (drag.y - event.clientY >= 50) liftBacking("pointer-backing");
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          liftBacking("keyboard-backing");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.modeSlowShadow} aria-hidden="true" />
      <span className={styles.modeFlipSeal} aria-hidden="true" />
    </div>
  );
}

function FlipController(props: ControllerProps) {
  if (props.level.id === 15) return <AlternatingRing {...props} />;
  if (props.level.id === 17) return <InvertedNibble {...props} />;
  if (props.level.id === 32) return <LandscapeNudge {...props} />;
  if (props.level.id === 76) return <RelayQuorum {...props} />;
  return <DiscreteController {...props} kind="flip" />;
}

const wakeBeadAngles = [-90, 30, 150] as const;

function normalizeAngle(angle: number) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function angleDistance(left: number, right: number) {
  return Math.abs(normalizeAngle(left - right));
}

function CatchWake({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [beadIndex, setBeadIndex] = useState(0);
  const [wakeAngle, setWakeAngle] = useState(-90);
  const [ringEngaged, setRingEngaged] = useState(false);
  const [chaseAttempts, setChaseAttempts] = useState(0);
  const [locallyArmed, setLocallyArmed] = useState(false);
  const wakeAngleRef = useRef(-90);
  const dragStart = useRef<{ pointerAngle: number; wakeAngle: number } | null>(null);
  const armedRef = useRef(false);
  const suppressClick = useRef(false);
  const targetAngle = wakeBeadAngles[(beadIndex + 1) % wakeBeadAngles.length];
  const effectiveWakeAngle = solved ? targetAngle : wakeAngle;
  const distance = angleDistance(effectiveWakeAngle, targetAngle);
  const rebound = solved || locallyArmed ? "sealed" : distance <= 45 ? "narrow" : "wide";

  useEffect(() => {
    if (solved || ringEngaged) return;
    const timer = window.setInterval(() => setBeadIndex((current) => (current + 1) % wakeBeadAngles.length), 1_200);
    return () => window.clearInterval(timer);
  }, [ringEngaged, solved]);

  const setNextWake = (next: number) => {
    const normalized = normalizeAngle(next);
    wakeAngleRef.current = normalized;
    setWakeAngle(normalized);
  };

  const finishRotation = (next = wakeAngleRef.current) => {
    dragStart.current = null;
    if (armedRef.current || angleDistance(next, targetAngle) > 15) return;
    armedRef.current = true;
    setLocallyArmed(true);
    wakeAngleRef.current = targetAngle;
    setWakeAngle(targetAngle);
    onArm();
  };

  const escape = () => {
    if (solved || armedRef.current) return;
    onDiscover();
    setChaseAttempts((current) => current + 1);
    setBeadIndex((current) => (current + 1) % wakeBeadAngles.length);
  };

  const pointStyle = (angle: number, radius = 42) => {
    const radians = angle * Math.PI / 180;
    return {
      "--point-x": `${50 + Math.cos(radians) * radius}%`,
      "--point-y": `${50 + Math.sin(radians) * radius}%`,
    } as React.CSSProperties;
  };

  return (
    <div
      className={`${styles.catchWakeScene} ${styles[`catchWake_${rebound}`]}`}
      data-chase-attempts={chaseAttempts}
      data-controller="rotate"
      data-motion-model="smooth-three-stop-orbit"
      data-rebound={rebound}
      data-snap-zone-degrees="30"
      data-spatial-model="moving-bead-adjustable-wake"
      data-target-angle={targetAngle}
      data-testid="v2-scene-016"
      data-wake-angle={Math.round(effectiveWakeAngle)}
    >
      <span className={styles.wakeStops} aria-hidden="true">
        {wakeBeadAngles.map((angle) => <i key={angle} style={pointStyle(angle)} />)}
      </span>
      <button
        type="button"
        className={styles.wakeRing}
        aria-label={locale === "zh" ? "可旋转的尾迹外环" : "Rotatable wake ring"}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const pointerAngle = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
          dragStart.current = { pointerAngle, wakeAngle: wakeAngleRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragStart.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const pointerAngle = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
          const delta = normalizeAngle(pointerAngle - dragStart.current.pointerAngle);
          if (Math.abs(delta) <= 4) return;
          setRingEngaged(true);
          onDiscover();
          setNextWake(dragStart.current.wakeAngle + delta);
        }}
        onPointerUp={() => finishRotation()}
        onPointerCancel={() => { dragStart.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          setRingEngaged(true);
          onDiscover();
          const next = normalizeAngle(wakeAngleRef.current + (event.key === "ArrowRight" ? 30 : -30));
          setNextWake(next);
          finishRotation(next);
        }}
      >
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <circle className={styles.wakeTrack} cx="120" cy="120" r="91" />
          <g className={styles.wakeTrail} style={{ "--wake-angle": `${effectiveWakeAngle}deg` } as React.CSSProperties}>
            <path d="M120 29 A91 91 0 0 1 211 120" />
            <circle cx="211" cy="120" r="8" />
          </g>
        </svg>
      </button>
      <span className={styles.wakePrediction} style={pointStyle(targetAngle)} aria-hidden="true"><i /></span>
      <button
        type="button"
        className={styles.wakeBead}
        style={pointStyle(wakeBeadAngles[beadIndex])}
        aria-label={locale === "zh" ? "会逃开的纸珠" : "Escaping paper bead"}
        onPointerDown={() => {
          suppressClick.current = true;
          escape();
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          escape();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          escape();
        }}
      ><span aria-hidden="true" /></button>
      <i className={styles.wakeSeal} aria-hidden="true" style={pointStyle(targetAngle)} />
    </div>
  );
}

function DoubleHousing({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [outerAngle, setOuterAngle] = useState(0);
  const outerAngleRef = useRef(0);
  const dragStart = useRef<{ pointerAngle: number; outerAngle: number } | null>(null);
  const armedRef = useRef(false);

  const separationFor = (angle: number) => Math.abs(normalizeAngle(angle * 2));
  const setNextAngle = (next: number) => {
    const normalized = normalizeAngle(next);
    outerAngleRef.current = normalized;
    setOuterAngle(normalized);
    onDiscover();
    return normalized;
  };
  const finish = (next = outerAngleRef.current) => {
    dragStart.current = null;
    if (separationFor(next) < 150 || armedRef.current) return;
    armedRef.current = true;
    outerAngleRef.current = 90;
    setOuterAngle(90);
    onArm();
  };
  const step = (delta: number) => {
    const next = setNextAngle(outerAngleRef.current + delta);
    finish(next);
  };

  const effectiveOuter = solved ? 90 : outerAngle;
  const effectiveInner = -effectiveOuter;
  const separation = separationFor(effectiveOuter);
  const ink = solved || separation >= 150 ? "closed" : separation >= 90 ? "growing" : "faint";

  return (
    <div
      className={`${styles.doubleHousingScene} ${styles[`housingInk_${ink}`]}`}
      data-controller="rotate"
      data-gap-separation={Math.round(separation)}
      data-inner-angle={Math.round(effectiveInner)}
      data-layer-ink={ink}
      data-outer-angle={Math.round(effectiveOuter)}
      data-snap-zone-degrees="60"
      data-spatial-model="counter-rotating-shell-gaps"
      data-testid="v2-scene-019"
    >
      <button
        type="button"
        className={styles.housingDial}
        aria-label={locale === "zh" ? "可反向联动的外层纸壳" : "Counter-linked outer paper shell"}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          dragStart.current = {
            pointerAngle: Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI,
            outerAngle: outerAngleRef.current,
          };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragStart.current) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const pointerAngle = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
          const delta = normalizeAngle(pointerAngle - dragStart.current.pointerAngle);
          if (Math.abs(delta) <= 4) return;
          setNextAngle(dragStart.current.outerAngle + delta);
        }}
        onPointerUp={() => finish()}
        onPointerCancel={() => { dragStart.current = null; }}
        onWheel={(event) => {
          event.preventDefault();
          step(event.deltaY >= 0 ? 15 : -15);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          step(event.key === "ArrowRight" ? 15 : -15);
        }}
      >
        <svg viewBox="0 0 240 240" aria-hidden="true">
          <circle className={styles.housingInterlayer} cx="120" cy="120" r="72" />
          <g className={styles.housingOuter} style={{ "--housing-angle": `${effectiveOuter}deg` } as React.CSSProperties}>
            <circle cx="120" cy="120" r="91" />
          </g>
          <g className={styles.housingInner} style={{ "--housing-angle": `${effectiveInner}deg` } as React.CSSProperties}>
            <circle cx="120" cy="120" r="54" />
          </g>
        </svg>
      </button>
      <i className={styles.housingSeal} aria-hidden="true" />
    </div>
  );
}

const windowTiltTarget = -12;
const windowTiltTolerance = 6;

function WindowTilt({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [paperAngle, setPaperAngle] = useState(0);
  const [clicks, setClicks] = useState(0);
  const [wrongRotations, setWrongRotations] = useState(0);
  const angleRef = useRef(0);
  const dragRef = useRef<{ x: number; angle: number } | null>(null);
  const armedRef = useRef(false);
  const visibleAngle = solved ? windowTiltTarget : paperAngle;
  const distance = Math.abs(visibleAngle - windowTiltTarget);
  const plumbOffset = Math.round(distance * 2);
  const levelState = distance <= windowTiltTolerance
    ? "true"
    : visibleAngle === 0
      ? "misleading"
      : distance < Math.abs(windowTiltTarget)
        ? "closer"
        : "worse";

  const setNextAngle = (next: number) => {
    const bounded = Math.max(-24, Math.min(24, Math.round(next)));
    angleRef.current = bounded;
    setPaperAngle(bounded);
    onDiscover();
    return bounded;
  };

  const armPaper = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    angleRef.current = windowTiltTarget;
    setPaperAngle(windowTiltTarget);
    onArm();
  };

  const finish = (next = angleRef.current) => {
    if (Math.abs(next - windowTiltTarget) <= windowTiltTolerance) {
      armPaper();
      return;
    }
    setWrongRotations((current) => current + 1);
  };

  return (
    <div
      className={styles.windowTiltScene}
      data-clicks={clicks}
      data-controller="rotate"
      data-direction-events="0"
      data-level-state={levelState}
      data-paper-angle={visibleAngle}
      data-plumb-offset={plumbOffset}
      data-spatial-model="misleading-frame-fixed-plumb-line"
      data-target-angle={windowTiltTarget}
      data-testid="v2-scene-033"
      data-texture-slope="8"
      data-tolerance-degrees={windowTiltTolerance}
      data-wrong-rotations={wrongRotations}
      style={{
        "--window-paper-angle": `${visibleAngle}deg`,
        "--plumb-offset": `${plumbOffset}px`,
      } as React.CSSProperties}
    >
      <button
        type="button"
        className={styles.windowPaperControl}
        aria-label={locale === "zh" ? "带窗框的整张场景纸" : "Whole scene paper with window frame"}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          dragRef.current = { x: event.clientX, angle: angleRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = dragRef.current;
          if (!start || armedRef.current || solved || Math.abs(event.clientX - start.x) <= 8) return;
          setNextAngle(start.angle + (event.clientX - start.x) / 8);
        }}
        onPointerUp={(event) => {
          const start = dragRef.current;
          dragRef.current = null;
          if (!start || armedRef.current || solved) return;
          const delta = event.clientX - start.x;
          if (Math.abs(delta) <= 8) {
            setClicks((current) => current + 1);
            return;
          }
          const next = setNextAngle(start.angle + delta / 8);
          finish(next);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          if (armedRef.current || solved) return;
          const next = setNextAngle(angleRef.current + (event.key === "ArrowLeft" ? -4 : 4));
          if (Math.abs(next - windowTiltTarget) <= windowTiltTolerance) armPaper();
          else if (event.key === "ArrowRight") setWrongRotations((current) => current + 1);
        }}
      >
        <span className={styles.windowPaper} aria-hidden="true">
          <span className={styles.windowFrame}><i /><b /><em /></span>
          <span className={styles.windowTexture} />
          <span className={styles.windowNotch} />
        </span>
      </button>
      <span className={styles.worldPlumb} aria-hidden="true"><i /><b /></span>
      {wrongRotations > 0 ? <span key={wrongRotations} className={styles.windowTiltRebound} aria-hidden="true" /> : null}
    </div>
  );
}

function TripleActuator({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type Dial = "left" | "center" | "right";
  type InputMode = "none" | "pointer-dial" | "wheel-dial" | "keyboard-dial";
  type Angles = Record<Dial, number>;

  const lockedAngles: Angles = { left: 90, center: 60, right: 270 };
  const [angles, setAngles] = useState<Angles>(solved ? lockedAngles : { left: 30, center: 0, right: 330 });
  const [beltState, setBeltState] = useState<"none" | "left-only" | "right-only" | "both">(solved ? "both" : "none");
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const anglesRef = useRef(angles);
  const dragRef = useRef<{ pointerId: number; x: number; dial: Dial; angles: Angles; moved: boolean } | null>(null);
  const wheelTimerRef = useRef<number | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => () => {
    if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
  }, []);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const normalizeDialAngle = (angle: number) => Math.round(((angle % 360) + 360) % 360);
  const normalizeAngles = (next: Angles): Angles => ({
    left: normalizeDialAngle(next.left),
    center: normalizeDialAngle(next.center),
    right: normalizeDialAngle(next.right),
  });
  const beltFor = (dial: Dial) => dial === "center" ? "both" : `${dial}-only` as const;
  const transformAngles = (base: Angles, dial: Dial, delta: number): Angles => {
    if (dial === "left") return normalizeAngles({ ...base, left: base.left + delta, center: base.center + delta });
    if (dial === "right") return normalizeAngles({ ...base, right: base.right + delta, center: base.center + delta });
    return normalizeAngles({ left: base.left + delta, center: base.center + delta, right: base.right - delta });
  };
  const applyAngles = (next: Angles, dial: Dial, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    anglesRef.current = next;
    setAngles(next);
    setBeltState(beltFor(dial));
    setInputMode(mode);
    discover();
  };
  const isAligned = (next: Angles) => angleDistance(next.left, 90) <= 10 && angleDistance(next.right, 270) <= 10;
  const complete = (mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    anglesRef.current = lockedAngles;
    setAngles(lockedAngles);
    setBeltState("both");
    setInputMode(mode);
    setCompleted(true);
    onArm();
  };
  const settle = (dial: Dial, mode: Exclude<InputMode, "none">) => {
    if (dial === "center" && isAligned(anglesRef.current)) complete(mode);
  };
  const moveBy = (dial: Dial, delta: number, mode: Exclude<InputMode, "none">) => {
    applyAngles(transformAngles(anglesRef.current, dial, delta), dial, mode);
  };
  const grooveState = (dial: "left" | "right") => {
    if (solved || completed) return "seated";
    return angleDistance(angles[dial], dial === "left" ? 90 : 270) <= 10 ? "aligned" : "open";
  };
  const visibleSolved = solved || completed;

  const dial = (side: Dial) => (
    <button
      type="button"
      className={`${styles.tripleDial} ${side === "center" ? styles.tripleDialCenter : styles.tripleDialSide} ${side === "left" ? styles.tripleDialLeft : side === "right" ? styles.tripleDialRight : ""}`}
      data-testid={`triple-dial-${side}`}
      aria-label={locale === "zh" ? `${side === "left" ? "左" : side === "center" ? "中" : "右"}侧纸质表盘` : `${side} paper dial`}
      style={{ "--triple-dial-angle": `${angles[side]}deg` } as React.CSSProperties}
      onClick={() => undefined}
      onPointerDown={(event) => {
        if (visibleSolved) return;
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, dial: side, angles: anglesRef.current, moved: false };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId || drag.dial !== side || visibleSolved) return;
        const delta = event.clientX - drag.x;
        if (Math.abs(delta) > 8) drag.moved = true;
        if (drag.moved) applyAngles(transformAngles(drag.angles, side, delta), side, "pointer-dial");
      }}
      onPointerUp={(event) => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag || drag.pointerId !== event.pointerId || drag.dial !== side || !drag.moved || visibleSolved) return;
        settle(side, "pointer-dial");
      }}
      onPointerCancel={() => { dragRef.current = null; }}
      onWheel={(event) => {
        if (visibleSolved) return;
        event.preventDefault();
        moveBy(side, event.deltaY < 0 ? 15 : -15, "wheel-dial");
        if (wheelTimerRef.current !== null) window.clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = window.setTimeout(() => settle(side, "wheel-dial"), 180);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          settle(side, "keyboard-dial");
          return;
        }
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        moveBy(side, event.key === "ArrowRight" ? 15 : -15, "keyboard-dial");
      }}
    >
      <span aria-hidden="true"><i /><b /></span>
    </button>
  );

  return (
    <div
      className={styles.tripleActuatorScene}
      data-belt-state={beltState}
      data-controller="rotate"
      data-input-mode={inputMode}
      data-left-angle={visibleSolved ? 90 : angles.left}
      data-left-groove={grooveState("left")}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-right-angle={visibleSolved ? 270 : angles.right}
      data-right-groove={grooveState("right")}
      data-spatial-model="three-dials-two-one-way-belts-shared-center"
      data-testid="v2-scene-071"
    >
      <span className={styles.tripleActuatorPaper} aria-hidden="true"><i /><b /></span>
      <span className={`${styles.tripleBelt} ${styles.tripleBeltLeft}`} data-testid="triple-belt-left" aria-hidden="true" />
      <span className={`${styles.tripleBelt} ${styles.tripleBeltRight}`} data-testid="triple-belt-right" aria-hidden="true" />
      <span className={`${styles.tripleGroove} ${styles.tripleGrooveLeft}`} data-testid="triple-groove-left" aria-hidden="true" />
      <span className={`${styles.tripleGroove} ${styles.tripleGrooveRight}`} data-testid="triple-groove-right" aria-hidden="true" />
      {dial("left")}
      {dial("center")}
      {dial("right")}
      <span className={styles.tripleActuatorSeal} aria-hidden="true" />
    </div>
  );
}

function TripleGravity({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type GravitySlot = "down" | "right" | "up";
  const route: GravitySlot[] = ["down", "right", "up"];
  const [currentSlot, setCurrentSlot] = useState<GravitySlot | "diagonal">("diagonal");
  const [routeProgress, setRouteProgress] = useState(0);
  const [retainedTraces, setRetainedTraces] = useState<GravitySlot[]>([]);
  const [shadowLine, setShadowLine] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [inputMode, setInputMode] = useState<"idle" | "pointer-frame" | "keyboard-frame">("idle");
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;

  const choose = (slot: GravitySlot, mode: "pointer-frame" | "keyboard-frame") => {
    if (visibleSolved || armedRef.current) return;
    setCurrentSlot(slot);
    setInputMode(mode);
    onDiscover();
    if (route[routeProgress] !== slot) {
      setRouteProgress(0);
      setRetainedTraces([]);
      setShadowLine(true);
      return;
    }
    const next = routeProgress + 1;
    setShadowLine(false);
    setRouteProgress(next);
    setRetainedTraces(route.slice(0, next));
    if (next === route.length) {
      armedRef.current = true;
      setCompleted(true);
      onArm();
    }
  };

  const angle = currentSlot === "down" ? 90 : currentSlot === "right" ? 0 : currentSlot === "up" ? -90 : 38;

  return (
    <div
      className={styles.tripleGravityScene}
      data-controller="rotate"
      data-current-slot={currentSlot}
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-retained-traces={retainedTraces.join(",")}
      data-route-progress={visibleSolved ? 3 : routeProgress}
      data-shadow-line={shadowLine ? "visible" : "hidden"}
      data-slot-count="3"
      data-spatial-model="one-rotatable-frame-three-gravity-beads-three-slot-broken-u-groove"
      data-testid="v2-scene-087"
      data-u-state={visibleSolved ? "joined" : "broken"}
      style={{ "--gravity-angle": `${angle}deg` } as React.CSSProperties}
    >
      <span className={styles.tripleGravityPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.tripleGravityGrooves} aria-hidden="true">
        {route.map((slot, index) => <i key={slot} data-retained={retainedTraces.includes(slot) ? "true" : "false"} data-testid={`gravity-groove-${index}`} />)}
      </span>
      <span className={styles.tripleGravityShadow} aria-hidden="true" />
      <button
        type="button"
        className={styles.tripleGravityFrame}
        data-testid="triple-gravity-frame"
        aria-label={locale === "zh" ? "独立重力纸框" : "Independent gravity frame"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 10) onDiscover();
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (Math.hypot(dx, dy) < 40) return;
          choose(Math.abs(dx) > Math.abs(dy) ? "right" : dy > 0 ? "down" : "up", "pointer-frame");
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowRight" && event.key !== "ArrowUp") return;
          event.preventDefault();
          choose(event.key === "ArrowDown" ? "down" : event.key === "ArrowRight" ? "right" : "up", "keyboard-frame");
        }}
      >
        <span aria-hidden="true">
          {[0, 1, 2].map((index) => <i key={index} data-testid={`gravity-bead-${index}`}><b /></i>)}
        </span>
      </button>
      <span className={styles.tripleGravitySeal} aria-hidden="true" />
    </div>
  );
}

function RotateController(props: ControllerProps) {
  if (props.level.id === 16) return <CatchWake {...props} />;
  if (props.level.id === 19) return <DoubleHousing {...props} />;
  if (props.level.id === 33) return <WindowTilt {...props} />;
  if (props.level.id === 71) return <TripleActuator {...props} />;
  if (props.level.id === 87) return <TripleGravity {...props} />;
  if (props.level.id === 98) return <QuadPhase {...props} />;
  return <DiscreteController {...props} kind="rotate" />;
}

function OuterOnes({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [ringSize, setRingSize] = useState(20);
  const ringSizeRef = useRef(20);
  const [markAngles, setMarkAngles] = useState([-150, 30]);
  const markAnglesRef = useRef([-150, 30]);
  const markDrags = useRef<Record<number, { pointerAngle: number; markAngle: number }>>({});
  const ringPointers = useRef(new Map<number, { x: number; y: number }>());
  const resizeGesture = useRef<{ baseSize: number; startRadius?: number; startDistance?: number } | null>(null);
  const armedRef = useRef(false);

  const setNextSize = (next: number) => {
    const bounded = Math.max(0, Math.min(100, next));
    ringSizeRef.current = bounded;
    setRingSize(bounded);
    onDiscover();
    return bounded;
  };

  const finishSize = (next = ringSizeRef.current) => {
    if (next < 70 || armedRef.current) return;
    armedRef.current = true;
    ringSizeRef.current = 80;
    setRingSize(80);
    onArm();
  };

  const moveMark = (index: number, nextAngle: number) => {
    onDiscover();
    const next = markAnglesRef.current.map((angle, position) => position === index ? normalizeAngle(nextAngle) : angle);
    markAnglesRef.current = next;
    setMarkAngles(next);
  };

  const pointStyle = (angle: number) => {
    const radians = angle * Math.PI / 180;
    return {
      "--mark-x": `${50 + Math.cos(radians) * 41}%`,
      "--mark-y": `${50 + Math.sin(radians) * 41}%`,
      "--mark-rotation": `${angle + 90}deg`,
    } as React.CSSProperties;
  };

  const effectiveSize = solved ? 80 : ringSize;
  const boundaryState = effectiveSize >= 70 ? "inside" : "outside";
  const markGap = Math.round(angleDistance(markAngles[0] ?? 0, markAngles[1] ?? 0));

  return (
    <div
      className={`${styles.outerOnesScene} ${boundaryState === "inside" ? styles.outerOnesInside : ""}`}
      data-boundary-state={boundaryState}
      data-controller="resize"
      data-mark-gap={markGap}
      data-ring-size={Math.round(effectiveSize)}
      data-size-target="70-100"
      data-spatial-model="fixed-cuts-resizable-boundary"
      data-testid="v2-scene-018"
      style={{ "--inner-diameter": `${7 + effectiveSize * .11}rem` } as React.CSSProperties}
    >
      <span className={styles.outerPaperField} aria-hidden="true" />
      <button
        type="button"
        className={styles.resizableInnerRing}
        aria-label={locale === "zh" ? "可改变大小的内环" : "Resizable inner ring"}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          ringPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const points = [...ringPointers.current.values()];
          resizeGesture.current = points.length >= 2
            ? { baseSize: ringSizeRef.current, startDistance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) }
            : { baseSize: ringSizeRef.current, startRadius: Math.hypot(event.clientX - center.x, event.clientY - center.y) };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!ringPointers.current.has(event.pointerId) || !resizeGesture.current) return;
          ringPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          const rect = event.currentTarget.getBoundingClientRect();
          const points = [...ringPointers.current.values()];
          if (points.length >= 2 && resizeGesture.current.startDistance !== undefined) {
            const distance = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
            setNextSize(resizeGesture.current.baseSize + (distance - resizeGesture.current.startDistance) / 1.2);
            return;
          }
          if (resizeGesture.current.startRadius === undefined) return;
          const radius = Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2));
          setNextSize(resizeGesture.current.baseSize + (radius - resizeGesture.current.startRadius) / 1.2);
        }}
        onPointerUp={(event) => {
          ringPointers.current.delete(event.pointerId);
          if (ringPointers.current.size === 0) {
            resizeGesture.current = null;
            finishSize();
          }
        }}
        onPointerCancel={(event) => {
          ringPointers.current.delete(event.pointerId);
          if (ringPointers.current.size === 0) resizeGesture.current = null;
        }}
        onKeyDown={(event) => {
          const grow = event.key === "+" || event.key === "=" || event.key === "ArrowUp" || event.key === "ArrowRight";
          const shrink = event.key === "-" || event.key === "_" || event.key === "ArrowDown" || event.key === "ArrowLeft";
          if (!grow && !shrink) return;
          event.preventDefault();
          const next = setNextSize(ringSizeRef.current + (grow ? 20 : -20));
          finishSize(next);
        }}
      ><span aria-hidden="true" /><i aria-hidden="true" /></button>
      {markAngles.map((angle, index) => (
        <button
          type="button"
          key={index}
          className={styles.outerCutMark}
          style={pointStyle(angle)}
          aria-label={locale === "zh" ? `环外刻痕 ${index + 1}` : `Outer cut mark ${index + 1}`}
          onPointerDown={(event) => {
            const scene = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-018']")?.getBoundingClientRect();
            if (!scene) return;
            markDrags.current[index] = {
              pointerAngle: Math.atan2(event.clientY - (scene.top + scene.height / 2), event.clientX - (scene.left + scene.width / 2)) * 180 / Math.PI,
              markAngle: markAnglesRef.current[index] ?? 0,
            };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = markDrags.current[index];
            if (!start) return;
            const scene = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-018']")?.getBoundingClientRect();
            if (!scene) return;
            const pointerAngle = Math.atan2(event.clientY - (scene.top + scene.height / 2), event.clientX - (scene.left + scene.width / 2)) * 180 / Math.PI;
            moveMark(index, start.markAngle + normalizeAngle(pointerAngle - start.pointerAngle));
          }}
          onPointerUp={() => { delete markDrags.current[index]; }}
          onPointerCancel={() => { delete markDrags.current[index]; }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();
            moveMark(index, (markAnglesRef.current[index] ?? 0) + (event.key === "ArrowRight" ? 15 : -15));
          }}
        ><span aria-hidden="true" /></button>
      ))}
      <i className={styles.innerBoundarySeal} aria-hidden="true" />
    </div>
  );
}

function EscapeHatch({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [windowWidth, setWindowWidth] = useState(44);
  const [circleOffset, setCircleOffset] = useState(0);
  const [circleDrags, setCircleDrags] = useState(0);
  const [frameMisses, setFrameMisses] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const frameDraggingRef = useRef(false);
  const circleStartRef = useRef<number | null>(null);
  const windowWidthRef = useRef(44);
  const armedRef = useRef(false);
  const visibleWidth = solved ? 68 : windowWidth;
  const circleState = visibleWidth >= 68 ? "closed" : visibleWidth >= 60 ? "seams-touch" : "cropped";

  const resizeFrame = (next: number) => {
    const bounded = Math.max(36, Math.min(78, Math.round(next)));
    windowWidthRef.current = bounded;
    setWindowWidth(bounded);
    onDiscover();
    return bounded;
  };

  const armFrame = () => {
    if (armedRef.current || solved || windowWidthRef.current < 68) return;
    armedRef.current = true;
    windowWidthRef.current = 68;
    setWindowWidth(68);
    onArm();
  };

  const resizeFromPointer = (clientX: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width) return windowWidthRef.current;
    return resizeFrame(Math.abs(clientX - (rect.left + rect.width / 2)) * 2 / rect.width * 100);
  };

  const finishFrame = () => {
    if (windowWidthRef.current >= 68) {
      armFrame();
      return;
    }
    if (windowWidthRef.current < 44) setFrameMisses((current) => current + 1);
  };

  return (
    <div
      ref={sceneRef}
      className={styles.escapeHatchScene}
      data-browser-resizes="0"
      data-circle-drags={circleDrags}
      data-circle-offset={circleOffset}
      data-circle-state={circleState}
      data-controller="resize"
      data-frame-misses={frameMisses}
      data-spatial-model="fixed-circle-inside-resizable-window"
      data-target-width="68"
      data-testid="v2-scene-031"
      data-window-width={visibleWidth}
      style={{
        "--escape-window": `${visibleWidth}%`,
        "--escape-edge": `${50 + visibleWidth / 2}%`,
        "--circle-offset": `${circleOffset}px`,
      } as React.CSSProperties}
    >
      <span className={styles.escapePaperField} aria-hidden="true" />
      <span className={styles.escapeWindow} aria-hidden="true">
        <span className={styles.escapeCircle}><i /></span>
        <span className={styles.escapeSeamLeft} />
        <span className={styles.escapeSeamRight} />
      </span>
      <button
        type="button"
        className={styles.escapeCircleControl}
        aria-label={locale === "zh" ? "被裁切的纸圆" : "Cropped paper circle"}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          circleStartRef.current = event.clientX;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = circleStartRef.current;
          if (start === null || armedRef.current || solved) return;
          const delta = Math.max(-28, Math.min(28, event.clientX - start));
          setCircleOffset(delta);
          if (Math.abs(delta) > 12) onDiscover();
        }}
        onPointerUp={(event) => {
          const start = circleStartRef.current;
          circleStartRef.current = null;
          if (start === null || armedRef.current || solved) return;
          if (Math.abs(event.clientX - start) > 12) setCircleDrags((current) => current + 1);
          setCircleOffset(0);
        }}
        onPointerCancel={() => {
          circleStartRef.current = null;
          setCircleOffset(0);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          onDiscover();
          setCircleOffset(event.key === "ArrowRight" ? 18 : -18);
          setCircleDrags((current) => current + 1);
          window.setTimeout(() => setCircleOffset(0), 120);
        }}
      ><span aria-hidden="true" /></button>
      <button
        type="button"
        role="slider"
        aria-label={locale === "zh" ? "可调节的右窗框" : "Adjustable right window edge"}
        aria-valuemin={36}
        aria-valuemax={78}
        aria-valuenow={visibleWidth}
        className={styles.escapeFrameEdge}
        onPointerDown={(event) => {
          if (armedRef.current || solved) return;
          frameDraggingRef.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!frameDraggingRef.current) return;
          resizeFromPointer(event.clientX);
        }}
        onPointerUp={(event) => {
          if (!frameDraggingRef.current) return;
          resizeFromPointer(event.clientX);
          frameDraggingRef.current = false;
          finishFrame();
        }}
        onPointerCancel={() => { frameDraggingRef.current = false; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const next = resizeFrame(windowWidthRef.current + (event.key === "ArrowRight" ? 8 : -8));
          if (next >= 68) armFrame();
          else if (event.key === "ArrowLeft") setFrameMisses((current) => current + 1);
        }}
      ><span aria-hidden="true"><i /><i /><i /></span></button>
      {frameMisses > 0 ? <span key={frameMisses} className={styles.escapeFrameRebound} aria-hidden="true" /> : null}
    </div>
  );
}

function ResizeController(props: ControllerProps) {
  return props.level.id === 18
    ? <OuterOnes {...props} />
    : props.level.id === 31
      ? <EscapeHatch {...props} />
      : props.level.id === 89
        ? <DeviceBraid {...props} />
        : <DragRelation {...props} kind="resize" />;
}

function DeviceBraid({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type Layout = "wide" | "narrow";
  type InputMode = "idle" | "pointer-viewport" | "keyboard-viewport" | "pointer-clip" | "keyboard-clip";
  const [layout, setLayout] = useState<Layout>("wide");
  const [clipState, setClipState] = useState<"open" | "empty-clamp" | "holding-dotted">("open");
  const [retainedLayer, setRetainedLayer] = useState<"none" | "dotted">("none");
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number } | null>(null);
  const layoutRef = useRef<Layout>("wide");
  const retainedRef = useRef<"none" | "dotted">("none");
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const chooseLayout = (next: Layout, mode: "pointer-viewport" | "keyboard-viewport") => {
    if (visibleSolved || armedRef.current) return;
    discover();
    layoutRef.current = next;
    setLayout(next);
    setInputMode(mode);
    if (next !== "wide" || retainedRef.current !== "dotted") return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };
  const clamp = (mode: "pointer-clip" | "keyboard-clip") => {
    if (visibleSolved || armedRef.current) return;
    discover();
    setInputMode(mode);
    if (layoutRef.current !== "narrow") {
      setClipState("empty-clamp");
      return;
    }
    retainedRef.current = "dotted";
    setRetainedLayer("dotted");
    setClipState("holding-dotted");
  };

  const visibleLayout = visibleSolved ? "wide" : layout;
  const visibleRetained = visibleSolved ? "dotted" : retainedLayer;

  return (
    <div
      className={styles.deviceBraidScene}
      data-braid-state={visibleSolved ? "woven" : "separate"}
      data-browser-resizes="0"
      data-clip-state={visibleSolved ? "holding-dotted" : clipState}
      data-controller="resize"
      data-input-mode={inputMode}
      data-layer-order={visibleSolved ? "dotted-over-continuous" : "separate"}
      data-layout={visibleLayout}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-retained-layer={visibleRetained}
      data-spatial-model="resizable-paper-viewport-one-clip-and-one-ribbon-reflowing-between-continuous-and-dotted"
      data-testid="v2-scene-089"
      style={{ "--braid-viewport-width": visibleLayout === "wide" ? "88%" : "52%" } as React.CSSProperties}
    >
      <span className={styles.deviceBraidPaper} aria-hidden="true"><i /><b /></span>
      <div className={styles.deviceBraidViewport} data-testid="braid-paper-viewport">
        <span className={styles.braidContinuousRibbon} data-testid="braid-continuous-ribbon" aria-hidden="true"><i /></span>
        <span className={styles.braidDottedRibbon} data-testid="braid-dotted-ribbon" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <i key={index} />)}</span>
        <span className={styles.braidRetainedTrace} aria-hidden="true" />
        <button
          type="button"
          className={styles.braidPaperClip}
          data-testid="braid-paper-clip"
          aria-label={locale === "zh" ? "中央纸夹" : "Central paper clip"}
          onClick={() => clamp("pointer-clip")}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            clamp("keyboard-clip");
          }}
        ><span aria-hidden="true"><i /><b /></span></button>
        <button
          type="button"
          role="slider"
          aria-label={locale === "zh" ? "纸视口宽度边缘" : "Paper viewport width edge"}
          aria-valuemin={52}
          aria-valuemax={88}
          aria-valuenow={visibleLayout === "wide" ? 88 : 52}
          className={styles.braidViewportHandle}
          data-testid="braid-viewport-handle"
          onClick={() => undefined}
          onPointerDown={(event) => {
            if (visibleSolved) return;
            dragRef.current = { pointerId: event.pointerId, x: event.clientX };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
            const dx = event.clientX - drag.x;
            if (Math.abs(dx) > 10) discover();
            if (Math.abs(dx) >= 55) chooseLayout(dx < 0 ? "narrow" : "wide", "pointer-viewport");
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            dragRef.current = null;
            if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
            const dx = event.clientX - drag.x;
            if (Math.abs(dx) < 55) return;
            chooseLayout(dx < 0 ? "narrow" : "wide", "pointer-viewport");
          }}
          onPointerCancel={() => { dragRef.current = null; }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            chooseLayout(event.key === "ArrowLeft" ? "narrow" : "wide", "keyboard-viewport");
          }}
        ><span aria-hidden="true"><i /><i /><i /></span></button>
      </div>
      <span className={styles.deviceBraidSeal} aria-hidden="true" />
    </div>
  );
}

function DiscreteController({ level, locale, solved, onDiscover, onArm, kind }: ControllerProps & { kind: "fold" | "flip" | "rotate" }) {
  const targetSteps = kind === "flip" ? 1 : 2 + (level.id % 2);
  const [step, setStep] = useState(0);
  const advance = () => {
    onDiscover();
    const next = Math.min(targetSteps, step + 1);
    setStep(next);
    if (next === targetSteps) onArm();
  };
  return <div className={`${styles.discreteBoard} ${styles[`kind_${kind}`]}`} data-controller={kind} style={{ "--step": solved ? targetSteps : step } as React.CSSProperties}>
    <button type="button" onClick={advance} aria-label={locale === "zh" ? `${kind === "fold" ? "折叠" : kind === "flip" ? "翻转" : "旋转"}标记纸片` : `${kind} the marked paper`}><span aria-hidden="true" /><i aria-hidden="true" /></button>
    <b aria-hidden="true" /><em aria-hidden="true" />
  </div>;
}

function GenericRhythmController({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [beats, setBeats] = useState<number[]>([]);
  const tap = () => {
    const now = performance.now(); onDiscover();
    const recent = [...beats, now].filter((time) => now - time < 2_600).slice(-4);
    setBeats(recent);
    if (recent.length >= 3) {
      const gaps = recent.slice(1).map((time, index) => time - recent[index]);
      const average = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      if (gaps.every((gap) => Math.abs(gap - average) < 260)) onArm();
    }
  };
  return <div className={`${styles.rhythmBoard} ${solved ? styles.isSolved : ""}`} data-controller="rhythm"><i /><i /><i /><button type="button" onClick={tap} aria-label={locale === "zh" ? "回应画面中的节拍" : "Answer the visible rhythm"}><span /></button></div>;
}

const warmupBeatDurationMs = 1_800;
const warmupHitWindowMs = 700;
const warmupWindowStartMs = (warmupBeatDurationMs - warmupHitWindowMs) / 2;

function ThreeBeatWarmup({ locale, onDiscover, onArm }: ControllerProps) {
  const [activeDot, setActiveDot] = useState(-1);
  const [breathPhase, setBreathPhase] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [bounceCount, setBounceCount] = useState(0);
  const [bounceEdge, setBounceEdge] = useState(0);
  const activeDotRef = useRef(-1);
  const hitCountRef = useRef(0);
  const armedRef = useRef(false);

  useEffect(() => {
    const startedAt = performance.now();
    const update = () => {
      const elapsed = performance.now() - startedAt;
      const beatPosition = elapsed % warmupBeatDurationMs;
      const dot = Math.floor(elapsed / warmupBeatDurationMs) % 3;
      const crossing = beatPosition >= warmupWindowStartMs
        && beatPosition <= warmupWindowStartMs + warmupHitWindowMs
        ? dot
        : -1;
      activeDotRef.current = crossing;
      setActiveDot(crossing);
      setBreathPhase(beatPosition / warmupBeatDurationMs);
    };
    update();
    const interval = window.setInterval(update, 50);
    return () => window.clearInterval(interval);
  }, []);

  const respond = () => {
    if (armedRef.current) return;
    onDiscover();
    const expected = hitCountRef.current;
    if (activeDotRef.current !== expected) {
      setBounceEdge(activeDotRef.current >= 0 ? activeDotRef.current : expected % 3);
      setBounceCount((current) => current + 1);
      return;
    }
    const next = expected + 1;
    hitCountRef.current = next;
    setHitCount(next);
    if (next < 3) return;
    armedRef.current = true;
    onArm();
  };

  return (
    <div
      className={styles.threeBeatScene}
      data-active-dot={activeDot}
      data-bounce-count={bounceCount}
      data-bounce-edge={bounceEdge}
      data-controller="rhythm"
      data-hit-count={hitCount}
      data-hit-window-ms={warmupHitWindowMs}
      data-spatial-model="fixed-ink-references-against-breathing-frame"
      data-testid="v2-scene-021"
      style={{ "--warmup-phase": breathPhase } as React.CSSProperties}
    >
      <button
        type="button"
        className={styles.warmupSurface}
        aria-label={locale === "zh" ? "回应纸框与墨点的交会" : "Answer the frame and ink-dot crossings"}
        onClick={respond}
        onKeyDown={(event) => {
          if (event.key !== " ") return;
          event.preventDefault();
          respond();
        }}
      >
        <span className={styles.warmupFrame} aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <i key={index} className={styles.warmupEdge} data-edge={index} data-crossing={activeDot === index ? "true" : "false"} />
          ))}
        </span>
        {[0, 1, 2].map((index) => (
          <i
            key={index}
            className={`${styles.warmupDot} ${hitCount > index ? styles.warmupDotHit : ""}`}
            data-crossing={activeDot === index ? "true" : "false"}
            data-dot={index}
            data-fixed-reference="true"
            data-testid={`warmup-dot-${index}`}
            aria-hidden="true"
          />
        ))}
        {bounceCount > 0 ? <b key={bounceCount} className={styles.warmupBounce} data-edge={bounceEdge} aria-hidden="true" /> : null}
      </button>
    </div>
  );
}

const missingDropCycleMs = 2_400;
const missingDropHitWindowMs = 900;
const missingDropRippleCenterMs = 1_600;

function MissingDrop({ locale, onDiscover, onArm }: ControllerProps) {
  const [phase, setPhase] = useState(0);
  const [rippleActive, setRippleActive] = useState(false);
  const [observedRounds, setObservedRounds] = useState(0);
  const [splashCount, setSplashCount] = useState(0);
  const [splashLane, setSplashLane] = useState(0);
  const [restored, setRestored] = useState(false);
  const rippleActiveRef = useRef(false);
  const observedRoundsRef = useRef(0);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => {
    const startedAt = performance.now();
    const update = () => {
      const elapsed = performance.now() - startedAt;
      const cyclePosition = elapsed % missingDropCycleMs;
      const active = Math.abs(cyclePosition - missingDropRippleCenterMs) <= missingDropHitWindowMs / 2;
      const rounds = Math.floor(elapsed / missingDropCycleMs);
      rippleActiveRef.current = active;
      observedRoundsRef.current = rounds;
      setPhase(cyclePosition / missingDropCycleMs);
      setRippleActive(active);
      setObservedRounds(rounds);
      if (active && !discoveredRef.current) {
        discoveredRef.current = true;
        onDiscover();
      }
    };
    update();
    const interval = window.setInterval(update, 50);
    return () => window.clearInterval(interval);
  }, [onDiscover]);

  const splash = (lane: number) => {
    setSplashLane(lane);
    setSplashCount((current) => current + 1);
  };

  const chooseLane = (lane: number) => {
    if (armedRef.current) return;
    onDiscover();
    if (lane !== 2 || !rippleActiveRef.current || observedRoundsRef.current < 1) {
      splash(lane);
      return;
    }
    armedRef.current = true;
    setRestored(true);
    onArm();
  };

  return (
    <div
      className={styles.missingDropScene}
      data-controller="rhythm"
      data-hit-window-ms={missingDropHitWindowMs}
      data-missing-drop={restored ? "restored" : "missing"}
      data-observed-rounds={observedRounds}
      data-ripple-active={rippleActive}
      data-spatial-model="four-drop-lanes-with-one-ripple-without-a-drop"
      data-splash-count={splashCount}
      data-testid="v2-scene-022"
      style={{ "--drop-y": `${12 + phase * 58}%` } as React.CSSProperties}
    >
      {[0, 1, 2, 3].map((index) => {
        const hasDrop = index !== 2 || restored;
        return (
          <button
            type="button"
            key={index}
            className={styles.dropLane}
            aria-label={locale === "zh" ? `落水线 ${index + 1}` : `Drop lane ${index + 1}`}
            data-has-drop={hasDrop}
            data-ripple-active={rippleActive}
            data-testid={`drop-lane-${index}`}
            onClick={() => chooseLane(index)}
            onKeyDown={(event) => {
              if (event.key !== " " && event.key !== "Enter") return;
              event.preventDefault();
              chooseLane(index);
            }}
          >
            <i className={styles.dropGuide} aria-hidden="true" />
            {hasDrop ? <span className={styles.inkDrop} aria-hidden="true" /> : <span className={styles.missingDropGhost} aria-hidden="true" />}
            <b className={styles.dropRipple} aria-hidden="true" />
            {splashCount > 0 && splashLane === index ? <em key={splashCount} className={styles.dropSplash} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

const precisionFivePoints = [
  { x: 12, y: 62 },
  { x: 28, y: 48 },
  { x: 52, y: 20 },
  { x: 66, y: 34 },
  { x: 91, y: 69 },
] as const;
const precisionFiveIntervals = [420, 720, 420, 720] as const;

function PrecisionFive({ locale, onDiscover, onArm }: ControllerProps) {
  const [stage, setStage] = useState<"trace" | "beat">("trace");
  const [tracePoints, setTracePoints] = useState<TracePoint[]>([]);
  const [tracePointCount, setTracePointCount] = useState(0);
  const [beatCount, setBeatCount] = useState(0);
  const [failures, setFailures] = useState(0);
  const tracingRef = useRef(false);
  const tracedRef = useRef(false);
  const tracePointCountRef = useRef(0);
  const tapStart = useRef<TracePoint | null>(null);
  const keyRoute = useRef<string[]>([]);
  const beatTimes = useRef<number[]>([]);
  const beatIntervals = useRef<number[]>([]);
  const armedRef = useRef(false);

  const nearPoint = (point: TracePoint, index: number) => Math.hypot(
    point.x - precisionFivePoints[index].x,
    point.y - precisionFivePoints[index].y,
  ) <= 15;

  const rejectBeats = () => {
    beatTimes.current = [];
    beatIntervals.current = [];
    setBeatCount(0);
    setFailures((current) => current + 1);
  };

  const recordBeat = () => {
    if (!tracedRef.current || armedRef.current) return;
    onDiscover();
    const now = performance.now();
    if (beatTimes.current.length === 0) {
      beatTimes.current = [now];
      beatIntervals.current = [];
      setBeatCount(1);
      return;
    }
    const intervalIndex = beatTimes.current.length - 1;
    const gap = now - (beatTimes.current.at(-1) ?? now);
    const expected = precisionFiveIntervals[intervalIndex];
    const minimum = expected * .65;
    const maximum = expected * 1.35;
    if (gap < minimum || gap > maximum) {
      rejectBeats();
      return;
    }
    const nextTimes = [...beatTimes.current, now];
    const nextIntervals = [...beatIntervals.current, gap];
    beatTimes.current = nextTimes;
    beatIntervals.current = nextIntervals;
    if (nextTimes.length < 5) {
      setBeatCount(nextTimes.length);
      return;
    }
    const shortAverage = (nextIntervals[0] + nextIntervals[2]) / 2;
    const longAverage = (nextIntervals[1] + nextIntervals[3]) / 2;
    if (longAverage / shortAverage < 1.25) {
      rejectBeats();
      return;
    }
    armedRef.current = true;
    setBeatCount(5);
    onArm();
  };

  const beginTrace = (point: TracePoint) => {
    tracingRef.current = true;
    const startsAtTail = nearPoint(point, 0);
    tracePointCountRef.current = startsAtTail ? 1 : 0;
    setTracePointCount(startsAtTail ? 1 : 0);
    setTracePoints([point]);
  };

  const continueTrace = (point: TracePoint) => {
    if (!tracingRef.current) return;
    setTracePoints((current) => [...current, point]);
    const expected = tracePointCountRef.current;
    if (expected >= precisionFivePoints.length || !nearPoint(point, expected)) return;
    tracePointCountRef.current = expected + 1;
    setTracePointCount(expected + 1);
    if (expected === 1) onDiscover();
  };

  const finishTrace = () => {
    tracingRef.current = false;
    if (tracePointCountRef.current >= precisionFivePoints.length) {
      tracedRef.current = true;
      setStage("beat");
      setTracePoints([]);
      return;
    }
    tracePointCountRef.current = 0;
    setTracePointCount(0);
    setTracePoints([]);
  };

  return (
    <div
      className={`${styles.precisionFiveScene} ${failures > 0 ? styles.precisionFiveReplay : ""}`}
      data-beat-count={beatCount}
      data-controller="rhythm"
      data-failures={failures}
      data-long-range-ms="468-972"
      data-long-short-ratio-min="1.25"
      data-short-range-ms="273-567"
      data-spatial-model="curve-distance-encodes-beat-intervals"
      data-stage={stage}
      data-testid="v2-scene-024"
      data-trace-points={tracePointCount}
    >
      <svg
        className={styles.precisionFiveCanvas}
        viewBox="0 0 100 100"
        role="application"
        tabIndex={0}
        aria-label={locale === "zh" ? "描过五点并按路程打拍" : "Trace five points and beat their distances"}
        onPointerDown={(event) => {
          const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          event.currentTarget.setPointerCapture?.(event.pointerId);
          if (tracedRef.current) tapStart.current = point;
          else beginTrace(point);
        }}
        onPointerMove={(event) => {
          if (tracedRef.current) return;
          continueTrace(pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()));
        }}
        onPointerUp={(event) => {
          if (!tracedRef.current) {
            finishTrace();
            return;
          }
          const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          const start = tapStart.current;
          tapStart.current = null;
          if (start && Math.hypot(point.x - start.x, point.y - start.y) <= 5) recordBeat();
        }}
        onPointerCancel={() => {
          tracingRef.current = false;
          tapStart.current = null;
          setTracePoints([]);
        }}
        onKeyDown={(event) => {
          if (!tracedRef.current && event.key.startsWith("Arrow")) {
            event.preventDefault();
            const expected = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown"];
            const next = [...keyRoute.current, event.key].slice(-expected.length);
            keyRoute.current = next;
            setTracePointCount(Math.min(5, next.length + 1));
            if (next.join("|") === expected.join("|")) {
              tracedRef.current = true;
              setStage("beat");
              setTracePointCount(5);
              onDiscover();
            }
            return;
          }
          if (tracedRef.current && event.key === " ") {
            event.preventDefault();
            recordBeat();
          }
        }}
      >
        <path className={styles.precisionTail} d="M3 72 C7 69 9 66 12 62" />
        <polyline className={styles.precisionRoute} points={precisionFivePoints.map(({ x, y }) => `${x},${y}`).join(" ")} />
        {precisionFivePoints.map(({ x, y }, index) => <circle key={index} className={styles.precisionPoint} cx={x} cy={y} r="3.3" data-visited={tracePointCount > index || beatCount > index} />)}
        {beatCount > 0 ? <circle className={styles.precisionBead} cx={precisionFivePoints[Math.min(4, beatCount - 1)].x} cy={precisionFivePoints[Math.min(4, beatCount - 1)].y} r="5" /> : null}
        <polyline className={styles.precisionScratch} points={tracePoints.map(({ x, y }) => `${x},${y}`).join(" ")} />
      </svg>
    </div>
  );
}

const darkBeatCycleMs = 2_400;
const darkBeatWindowMs = 800;

function DarkBeat({ locale, onDiscover, onArm }: ControllerProps) {
  const [phase, setPhase] = useState(0);
  const [darkActive, setDarkActive] = useState(false);
  const [beaconFlash, setBeaconFlash] = useState(true);
  const [beaconEchoes, setBeaconEchoes] = useState(0);
  const [darkMisses, setDarkMisses] = useState(0);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => {
    const startedAt = performance.now();
    const update = () => {
      const cyclePosition = (performance.now() - startedAt) % darkBeatCycleMs;
      const active = Math.abs(cyclePosition - darkBeatCycleMs / 2) <= darkBeatWindowMs / 2;
      const flashing = cyclePosition <= 220 || cyclePosition >= darkBeatCycleMs - 220;
      setPhase(cyclePosition / darkBeatCycleMs);
      setDarkActive(active);
      setBeaconFlash(flashing);
      if (active && !discoveredRef.current) {
        discoveredRef.current = true;
        onDiscover();
      }
    };
    update();
    const interval = window.setInterval(update, 50);
    return () => window.clearInterval(interval);
  }, [onDiscover]);

  const echoBeacon = () => {
    if (armedRef.current) return;
    onDiscover();
    setBeaconEchoes((current) => current + 1);
  };

  const answerDark = () => {
    if (armedRef.current) return;
    onDiscover();
    if (!darkActive) {
      setDarkMisses((current) => current + 1);
      return;
    }
    armedRef.current = true;
    onArm();
  };

  return (
    <div
      className={styles.darkBeatScene}
      data-beacon-echoes={beaconEchoes}
      data-beacon-flash={beaconFlash}
      data-controller="rhythm"
      data-dark-beat={darkActive ? "active" : "waiting"}
      data-dark-misses={darkMisses}
      data-hit-window-ms={darkBeatWindowMs}
      data-spatial-model="silent-midpoint-between-synchronous-beacons"
      data-testid="v2-scene-025"
      style={{ "--dark-phase": phase } as React.CSSProperties}
    >
      <span className={styles.darkBeatBridge} aria-hidden="true" />
      {[0, 1].map((index) => (
        <button
          type="button"
          key={index}
          className={styles.brightBeacon}
          aria-label={locale === "zh" ? `亮信标 ${index + 1}` : `Bright beacon ${index + 1}`}
          data-flashing={beaconFlash}
          onClick={echoBeacon}
        ><span aria-hidden="true" /><i key={beaconEchoes} aria-hidden="true" /></button>
      ))}
      <button
        type="button"
        className={styles.darkBead}
        aria-label={locale === "zh" ? "中间暗珠" : "Middle dark bead"}
        data-outline-cue={darkActive ? "thick" : "thin"}
        onClick={answerDark}
        onKeyDown={(event) => {
          if (event.key !== " ") return;
          event.preventDefault();
          answerDark();
        }}
      ><span aria-hidden="true" /><i key={darkMisses} aria-hidden="true" /></button>
    </div>
  );
}

function FiveBeatDivider({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [split, setSplit] = useState(4);
  const [wrongGroups, setWrongGroups] = useState(0);
  const [slotWidth, setSlotWidth] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const splitRef = useRef(4);
  const draggingRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSplit = solved ? 2 : split;

  const moveDivider = (next: number) => {
    const bounded = Math.max(1, Math.min(4, Math.round(next)));
    if (bounded !== splitRef.current) onDiscover();
    splitRef.current = bounded;
    setSplit(bounded);
  };

  const finish = () => {
    if (armedRef.current) return;
    onDiscover();
    if (splitRef.current !== 2) {
      setWrongGroups((current) => current + 1);
      return;
    }
    armedRef.current = true;
    onArm();
  };

  const moveFromPointer = (clientX: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    setSlotWidth(Math.round(rect.width / 5));
    moveDivider(((clientX - rect.left) / rect.width) * 5);
  };

  return (
    <div
      ref={sceneRef}
      className={styles.fiveBeatDividerScene}
      data-controller="shared-control"
      data-grouping={visibleSplit === 2 ? "two-plus-three" : `${visibleSplit}-plus-${5 - visibleSplit}`}
      data-left-notches="2"
      data-right-notches="3"
      data-slot-width-px={slotWidth}
      data-spatial-model="divider-reveals-two-plus-three"
      data-split={visibleSplit}
      data-wrong-groups={wrongGroups}
      data-testid="v2-scene-026"
      style={{ "--divider-slot": visibleSplit } as React.CSSProperties}
    >
      <span className={styles.dividerPaper} aria-hidden="true" />
      <span className={styles.dividerLeftGroup} aria-hidden="true" />
      <span className={styles.dividerRightGroup} aria-hidden="true" />
      {[0, 1, 2, 3, 4].map((index) => (
        <i key={index} className={styles.dividerInkDot} aria-hidden="true" style={{ left: `${10 + index * 20}%` }} />
      ))}
      <button
        type="button"
        role="slider"
        aria-label={locale === "zh" ? "透明分隔片" : "Transparent divider"}
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={visibleSplit}
        className={styles.dividerBlade}
        onPointerDown={(event) => {
          draggingRef.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          moveFromPointer(event.clientX);
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current) return;
          moveFromPointer(event.clientX);
          draggingRef.current = false;
          finish();
        }}
        onPointerCancel={() => { draggingRef.current = false; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          moveDivider(splitRef.current + (event.key === "ArrowRight" ? 1 : -1));
          finish();
        }}
      >
        <span className={styles.dividerGlass} aria-hidden="true" />
        <span className={styles.dividerNotchesLeft} aria-hidden="true"><i /><i /></span>
        <span className={styles.dividerNotchesRight} aria-hidden="true"><i /><i /><i /></span>
      </button>
      {wrongGroups > 0 ? <span key={wrongGroups} className={styles.dividerReject} aria-hidden="true" /> : null}
    </div>
  );
}

const pulseGapIndex = 5;
const pulseGapPosition = { x: 60, y: 60 } as const;

function PulseChecker({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [inspected, setInspected] = useState(false);
  const [rulerPosition, setRulerPosition] = useState({ x: 50, y: 18 });
  const [sparePosition, setSparePosition] = useState({ x: 14, y: 84 });
  const [wrongDrops, setWrongDrops] = useState(0);
  const [rulerMisses, setRulerMisses] = useState(0);
  const rulerPositionRef = useRef(rulerPosition);
  const sparePositionRef = useRef(sparePosition);
  const rulerDraggingRef = useRef(false);
  const spareDraggingRef = useRef(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const armedRef = useRef(false);

  const pointFromScene = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return {
      x: Math.max(4, Math.min(96, (clientX - rect.left) / rect.width * 100)),
      y: Math.max(8, Math.min(92, (clientY - rect.top) / rect.height * 100)),
    };
  };

  const moveRuler = (next: { x: number; y: number }) => {
    rulerPositionRef.current = next;
    setRulerPosition(next);
    onDiscover();
  };

  const inspect = (position = rulerPositionRef.current) => {
    if (inspected || solved) return;
    if (position.y < 45 || position.y > 75 || Math.abs(position.x - 50) > 25) {
      setRulerMisses((current) => current + 1);
      return;
    }
    const snapped = { x: 50, y: 60 };
    rulerPositionRef.current = snapped;
    setRulerPosition(snapped);
    setInspected(true);
  };

  const moveSpare = (next: { x: number; y: number }) => {
    sparePositionRef.current = next;
    setSparePosition(next);
    onDiscover();
  };

  const isGapDrop = (position: { x: number; y: number }) => (
    Math.abs(position.x - pulseGapPosition.x) <= 8
    && Math.abs(position.y - pulseGapPosition.y) <= 15
  );

  const placeSpare = (countFailure = true) => {
    if (armedRef.current || solved) return;
    if (!inspected || !isGapDrop(sparePositionRef.current)) {
      if (countFailure) {
        setWrongDrops((current) => current + 1);
        const origin = { x: 14, y: 84 };
        sparePositionRef.current = origin;
        setSparePosition(origin);
      }
      return;
    }
    armedRef.current = true;
    setSparePosition(pulseGapPosition);
    onArm();
  };

  return (
    <div
      ref={sceneRef}
      className={styles.pulseCheckerScene}
      data-controller="shared-control"
      data-drop-tolerance-x="8"
      data-drop-tolerance-y="15"
      data-gap-index={pulseGapIndex}
      data-matched-ticks={inspected ? "hidden" : "visible"}
      data-ruler-misses={rulerMisses}
      data-ruler-overlap={inspected}
      data-spatial-model="comparison-ruler-reveals-one-missing-pulse"
      data-stage={solved ? "complete" : inspected ? "fill" : "compare"}
      data-visible-gap={inspected ? pulseGapIndex : "none"}
      data-wrong-drops={wrongDrops}
      data-testid="v2-scene-029"
    >
      <span className={styles.pulseStrip} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => index === pulseGapIndex ? null : (
          <i key={index} className={styles.pulseMark} style={{ left: `${10 + index * 10}%` }} />
        ))}
      </span>
      <span className={styles.pulseGap} aria-hidden="true" style={{ left: `${pulseGapPosition.x}%` }} />
      <button
        type="button"
        className={styles.pulseRuler}
        aria-label={locale === "zh" ? "透明检查尺" : "Transparent inspection ruler"}
        aria-disabled={inspected}
        style={{ left: `${rulerPosition.x}%`, top: `${rulerPosition.y}%` }}
        onPointerDown={(event) => {
          if (inspected) return;
          rulerDraggingRef.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!rulerDraggingRef.current) return;
          const point = pointFromScene(event.clientX, event.clientY);
          if (point) moveRuler(point);
        }}
        onPointerUp={(event) => {
          if (!rulerDraggingRef.current) return;
          const point = pointFromScene(event.clientX, event.clientY);
          if (point) moveRuler(point);
          rulerDraggingRef.current = false;
          inspect(point ?? rulerPositionRef.current);
        }}
        onPointerCancel={() => { rulerDraggingRef.current = false; }}
        onKeyDown={(event) => {
          if (inspected || !event.key.startsWith("Arrow")) return;
          event.preventDefault();
          const next = {
            x: Math.max(20, Math.min(80, rulerPositionRef.current.x + (event.key === "ArrowRight" ? 20 : event.key === "ArrowLeft" ? -20 : 0))),
            y: Math.max(18, Math.min(78, rulerPositionRef.current.y + (event.key === "ArrowDown" ? 20 : event.key === "ArrowUp" ? -20 : 0))),
          };
          moveRuler(next);
          if (next.y >= 45 && next.y <= 75 && Math.abs(next.x - 50) <= 25) inspect(next);
        }}
      >
        <span aria-hidden="true" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <i key={index} data-gap={index === pulseGapIndex} aria-hidden="true" style={{ left: `${10 + index * 10}%` }} />
        ))}
      </button>
      <button
        type="button"
        className={styles.pulseSpare}
        aria-label={locale === "zh" ? "备用墨点" : "Spare ink dot"}
        style={{ left: `${sparePosition.x}%`, top: `${sparePosition.y}%` }}
        onPointerDown={(event) => {
          spareDraggingRef.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!spareDraggingRef.current) return;
          const point = pointFromScene(event.clientX, event.clientY);
          if (point) moveSpare(point);
        }}
        onPointerUp={(event) => {
          if (!spareDraggingRef.current) return;
          const point = pointFromScene(event.clientX, event.clientY);
          if (point) moveSpare(point);
          spareDraggingRef.current = false;
          placeSpare(true);
        }}
        onPointerCancel={() => { spareDraggingRef.current = false; }}
        onKeyDown={(event) => {
          if (!event.key.startsWith("Arrow") && event.key !== " " && event.key !== "Enter") return;
          event.preventDefault();
          if (event.key === " " || event.key === "Enter") {
            placeSpare(true);
            return;
          }
          const next = {
            x: Math.max(5, Math.min(95, sparePositionRef.current.x + (event.key === "ArrowRight" ? 15 : event.key === "ArrowLeft" ? -15 : 0))),
            y: Math.max(10, Math.min(90, sparePositionRef.current.y + (event.key === "ArrowDown" ? 17 : event.key === "ArrowUp" ? -17 : 0))),
          };
          moveSpare(next);
          placeSpare(false);
        }}
      ><span aria-hidden="true" /></button>
      {wrongDrops > 0 ? <span key={`drop-${wrongDrops}`} className={styles.pulseReject} aria-hidden="true" style={{ left: `${sparePosition.x}%`, top: `${sparePosition.y}%` }} /> : null}
    </div>
  );
}

const beaconTargetAngle = 270;
const beaconToleranceDegrees = 10.8;

function normalizeBeaconAngle(angle: number) {
  return (angle % 360 + 360) % 360;
}

function roundAngle(angle: number) {
  return Math.round(normalizeBeaconAngle(angle) * 10) / 10;
}

function beaconPointStyle(angle: number) {
  const radians = angle * Math.PI / 180;
  return {
    left: `${50 + Math.cos(radians) * 38}%`,
    top: `${50 + Math.sin(radians) * 38}%`,
    animationDelay: `${-angle / 360 * 4.8}s`,
  } as React.CSSProperties;
}

function BeaconMetronome({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [lateAngle, setLateAngle] = useState(300);
  const [beamReplays, setBeamReplays] = useState(0);
  const [misses, setMisses] = useState(0);
  const sceneRef = useRef<HTMLDivElement>(null);
  const lateAngleRef = useRef(300);
  const draggingRef = useRef(false);
  const armedRef = useRef(false);
  const visibleAngle = solved ? beaconTargetAngle : lateAngle;
  const gapBefore = roundAngle(visibleAngle - 180);
  const gapAfter = roundAngle(360 - visibleAngle);

  const moveLatePoint = (next: number) => {
    if (armedRef.current) return;
    const rounded = roundAngle(next);
    lateAngleRef.current = rounded;
    setLateAngle(rounded);
    setBeamReplays((current) => current + 1);
    onDiscover();
  };

  const finish = () => {
    if (armedRef.current) return;
    const distance = Math.abs(lateAngleRef.current - beaconTargetAngle);
    if (distance > beaconToleranceDegrees) {
      setMisses((current) => current + 1);
      return;
    }
    lateAngleRef.current = beaconTargetAngle;
    setLateAngle(beaconTargetAngle);
    armedRef.current = true;
    onArm();
  };

  const moveFromPointer = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    moveLatePoint(Math.atan2(clientY - centerY, clientX - centerX) * 180 / Math.PI);
  };

  return (
    <div
      ref={sceneRef}
      className={styles.beaconMetronomeScene}
      data-beam-replays={beamReplays}
      data-completion-band-deg="21.6"
      data-controller="orbit"
      data-gap-after={gapAfter}
      data-gap-before={gapBefore}
      data-late-angle={visibleAngle}
      data-misses={misses}
      data-point-angles={`0,90,180,${visibleAngle}`}
      data-spatial-model="constant-sweep-with-one-long-angular-gap"
      data-tolerance-percent="12"
      data-testid="v2-scene-027"
    >
      <span className={styles.beaconOrbitTrack} aria-hidden="true" />
      <span key={`beam-${beamReplays}`} className={styles.beaconSweep} aria-hidden="true"><i /></span>
      <span className={styles.beaconDiscreteSpokes} aria-hidden="true"><i /><i /><i /><i /></span>
      {[0, 90, 180].map((angle, index) => (
        <i key={angle} className={styles.beaconPaperPoint} data-point={index} aria-hidden="true" style={beaconPointStyle(angle)} />
      ))}
      <button
        type="button"
        role="slider"
        aria-label={locale === "zh" ? "迟到的纸点" : "Late paper point"}
        aria-valuemin={180}
        aria-valuemax={360}
        aria-valuenow={visibleAngle}
        className={styles.beaconLatePoint}
        style={beaconPointStyle(visibleAngle)}
        onPointerDown={(event) => {
          draggingRef.current = true;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) return;
          moveFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (!draggingRef.current) return;
          moveFromPointer(event.clientX, event.clientY);
          draggingRef.current = false;
          finish();
        }}
        onPointerCancel={() => { draggingRef.current = false; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          moveLatePoint(lateAngleRef.current + (event.key === "ArrowRight" ? 10 : -10));
          finish();
        }}
      ><span aria-hidden="true" /><i aria-hidden="true" /></button>
      {misses > 0 ? <span key={`miss-${misses}`} className={styles.beaconGapEcho} aria-hidden="true" style={beaconPointStyle(visibleAngle)} /> : null}
    </div>
  );
}

function RhythmController(props: ControllerProps) {
  if (props.level.id === 21) return <ThreeBeatWarmup {...props} />;
  if (props.level.id === 22) return <MissingDrop {...props} />;
  if (props.level.id === 24) return <PrecisionFive {...props} />;
  if (props.level.id === 25) return <DarkBeat {...props} />;
  return <GenericRhythmController {...props} />;
}

const quietCircuitNodes = [
  { x: 20, y: 72 },
  { x: 50, y: 28 },
  { x: 82, y: 66 },
] as const;

function QuietCircuit({ locale, onDiscover, onArm }: ControllerProps) {
  const [routeLength, setRouteLength] = useState(0);
  const [centerFaults, setCenterFaults] = useState(0);
  const [faultPulse, setFaultPulse] = useState(false);
  const routeLengthRef = useRef(0);
  const tracing = useRef(false);
  const lastPointerNode = useRef<number | null>(null);
  const armedRef = useRef(false);

  const visit = (index: number) => {
    if (armedRef.current) return;
    onDiscover();
    const current = routeLengthRef.current;
    const next = index === current ? current + 1 : index === current - 1 ? current : index === 0 ? 1 : 0;
    routeLengthRef.current = next;
    setRouteLength(next);
    if (next !== quietCircuitNodes.length) return;
    armedRef.current = true;
    onArm();
  };

  const breakCircuit = () => {
    if (armedRef.current) return;
    onDiscover();
    routeLengthRef.current = 0;
    setRouteLength(0);
    setCenterFaults((current) => current + 1);
    setFaultPulse(false);
    window.requestAnimationFrame(() => setFaultPulse(true));
  };

  const visitPointer = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = (clientX - rect.left) / rect.width * 100;
    const y = (clientY - rect.top) / rect.height * 100;
    const index = quietCircuitNodes.findIndex((node) => Math.hypot(node.x - x, node.y - y) <= 17);
    if (index < 0 || lastPointerNode.current === index) return;
    lastPointerNode.current = index;
    visit(index);
  };

  return (
    <div
      className={`${styles.quietCircuitScene} ${faultPulse ? styles.quietCircuitFault : ""}`}
      role="application"
      tabIndex={-1}
      aria-label={locale === "zh" ? "绕开中心的外围线路" : "Outer circuit route around the centers"}
      data-center-faults={centerFaults}
      data-channel-width="44"
      data-controller="focus-route"
      data-route-length={routeLength}
      data-spatial-model="halo-route-around-button-centers"
      data-testid="v2-scene-020"
      style={{ "--route-length": routeLength } as React.CSSProperties}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("[data-node-center]")) return;
        tracing.current = true;
        lastPointerNode.current = null;
        visitPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!tracing.current) return;
        visitPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
      }}
      onPointerUp={() => {
        tracing.current = false;
        lastPointerNode.current = null;
      }}
      onPointerCancel={() => {
        tracing.current = false;
        lastPointerNode.current = null;
      }}
    >
      <svg className={styles.quietCircuitLine} viewBox="0 0 100 100" aria-hidden="true">
        <path d="M20 72 L50 28 L82 66" pathLength="3" />
      </svg>
      {quietCircuitNodes.map((node, index) => (
        <button
          type="button"
          key={`halo-${index}`}
          className={styles.quietHalo}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          aria-label={locale === "zh" ? `外围光晕 ${index + 1}` : `Outer halo ${index + 1}`}
          onFocus={() => visit(index)}
          onPointerEnter={() => {
            if (!tracing.current && window.matchMedia?.("(hover: hover)").matches) visit(index);
          }}
        ><span aria-hidden="true" /></button>
      ))}
      {quietCircuitNodes.map((node, index) => (
        <button
          type="button"
          key={`center-${index}`}
          className={styles.quietCenter}
          style={{ left: `${node.x}%`, top: `${node.y}%` }}
          aria-label={locale === "zh" ? `节点中心 ${index + 1}` : `Node center ${index + 1}`}
          data-node-center
          tabIndex={-1}
          onClick={breakCircuit}
        ><span aria-hidden="true" /></button>
      ))}
      <i className={styles.quietCircuitSeal} aria-hidden="true" />
    </div>
  );
}

function GenericFocusRoute({ locale, onDiscover, onArm }: ControllerProps) {
  const route = useRef<number[]>([]);
  const visit = (index: number) => {
    onDiscover();
    const current = route.current;
    const next = current.at(-1) === index ? current : [...current, index].slice(-3);
    route.current = next;
    if (next.join("") === "012") queueMicrotask(onArm);
  };
  return <div className={styles.focusBoard} data-controller="focus-route">{[0, 1, 2].map((index) => <button key={index} type="button" onFocus={() => visit(index)} onPointerEnter={() => visit(index)} aria-label={locale === "zh" ? `安静纸片 ${index + 1}` : `Quiet paper ${index + 1}`}><span /></button>)}</div>;
}

const archiveRouteTabs = [
  { x: 20, y: 65, role: "seed" },
  { x: 51, y: 28, role: "relay" },
  { x: 81, y: 64, role: "seal" },
] as const;

function ArchiveRoute({ locale, solved, spatialPilot, onDiscover, onArm }: ControllerProps) {
  const [routeLength, setRouteLength] = useState(0);
  const [routeState, setRouteState] = useState<"idle" | "following" | "broken" | "complete">("idle");
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [openedTabs, setOpenedTabs] = useState(0);
  const [deadEnds, setDeadEnds] = useState(0);
  const [deadEndTab, setDeadEndTab] = useState<number | null>(null);
  const [inputMode, setInputMode] = useState<"none" | "focus" | "hover" | "held-attention">("none");
  const [completed, setCompleted] = useState(false);
  const routeRef = useRef(0);
  const armedRef = useRef(false);
  const tracing = useRef(false);
  const lastPointerTab = useRef<number | null>(null);
  const continuityTimer = useRef<number | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const pointerPress = useRef(false);

  const clearContinuity = () => {
    if (continuityTimer.current === null) return;
    window.clearTimeout(continuityTimer.current);
    continuityTimer.current = null;
  };

  const clearHover = () => {
    if (hoverTimer.current === null) return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };

  useEffect(() => () => {
    clearContinuity();
    clearHover();
  }, []);

  const breakRoute = (index: number | null = null) => {
    if (armedRef.current || solved) return;
    clearContinuity();
    routeRef.current = 0;
    setRouteLength(0);
    setRouteState("broken");
    setActiveTab(null);
    setDeadEndTab(index);
    setDeadEnds((count) => count + 1);
  };

  const scheduleBreak = () => {
    clearContinuity();
    continuityTimer.current = window.setTimeout(() => breakRoute(activeTab), 1_700);
  };

  const visit = (index: number, mode: "focus" | "hover" | "held-attention") => {
    if (armedRef.current || solved) return;
    const current = routeRef.current;
    if (index === current - 1) return;
    if (index !== current) {
      breakRoute(index);
      return;
    }
    const next = current + 1;
    routeRef.current = next;
    setRouteLength(next);
    setRouteState(next === archiveRouteTabs.length ? "complete" : "following");
    setActiveTab(index);
    setDeadEndTab(null);
    setInputMode(mode);
    onDiscover();
    clearContinuity();
    if (next === archiveRouteTabs.length) {
      if (!armedRef.current) {
        armedRef.current = true;
        setCompleted(true);
        onArm();
      }
      return;
    }
    scheduleBreak();
  };

  const visitPointer = (clientX: number, clientY: number, rect: DOMRect) => {
    const point = {
      x: (clientX - rect.left) / rect.width * 100,
      y: (clientY - rect.top) / rect.height * 100,
    };
    const index = archiveRouteTabs.findIndex((tab) => Math.hypot(tab.x - point.x, tab.y - point.y) <= 17);
    if (index < 0 || index === lastPointerTab.current) return;
    lastPointerTab.current = index;
    visit(index, "held-attention");
  };

  const visibleSolved = solved || completed;
  const visibleBands = visibleSolved ? 2 : Math.min(routeLength, 2);
  return (
    <div
      className={`${styles.archiveRouteScene} ${routeState === "broken" ? styles.archiveRouteBroken : ""}`}
      data-active-tab={activeTab ?? "none"}
      data-controller="focus-route"
      data-dead-end-tab={deadEndTab ?? "none"}
      data-dead-ends={deadEnds}
      data-input-mode={inputMode}
      data-opened-tabs={openedTabs}
      data-route-length={visibleSolved ? 3 : routeLength}
      data-route-state={visibleSolved ? "complete" : routeState}
      data-spatial-pilot={spatialPilot ? "true" : "false"}
      data-spatial-model="attention-draws-route"
      data-testid="v2-scene-043"
      data-visible-bands={visibleBands}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        tracing.current = true;
        lastPointerTab.current = null;
        setInputMode("held-attention");
        event.currentTarget.setPointerCapture?.(event.pointerId);
        visitPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
      }}
      onPointerMove={(event) => {
        if (!tracing.current || visibleSolved) return;
        visitPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
      }}
      onPointerUp={() => {
        tracing.current = false;
        lastPointerTab.current = null;
      }}
      onPointerCancel={() => {
        tracing.current = false;
        lastPointerTab.current = null;
        breakRoute();
      }}
    >
      {spatialPilot ? <svg className={styles.archiveRouteSpatialDepth} viewBox="0 0 100 100" preserveAspectRatio="none" data-testid="archive-route-spatial-depth" aria-hidden="true">
        <path data-band="0" d="M20 65 C30 59 38 38 51 28" />
        <path data-band="1" d="M51 28 C64 34 70 55 81 64" />
      </svg> : null}
      <svg className={styles.archiveRouteBands} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path data-band="0" d="M20 65 C30 59 38 38 51 28" />
        <path data-band="1" d="M51 28 C64 34 70 55 81 64" />
        <path className={styles.archiveRouteDeadBand} d={`M${archiveRouteTabs[deadEndTab ?? 0].x} ${archiveRouteTabs[deadEndTab ?? 0].y} l8 -8`} />
      </svg>
      {archiveRouteTabs.map((tab, index) => (
        <button
          type="button"
          key={tab.role}
          className={styles.archiveRouteTab}
          aria-label={locale === "zh" ? `档案页签 ${index + 1}` : `Archive tab ${index + 1}`}
          data-archive-tab={index}
          data-route-role={tab.role}
          style={{ left: `${tab.x}%`, top: `${tab.y}%` }}
          onPointerDown={() => {
            pointerPress.current = true;
            clearHover();
          }}
          onPointerUp={() => {
            window.setTimeout(() => { pointerPress.current = false; }, 0);
          }}
          onPointerCancel={() => { pointerPress.current = false; }}
          onFocus={() => {
            if (!pointerPress.current) visit(index, "focus");
          }}
          onPointerEnter={() => {
            if (tracing.current || pointerPress.current || !window.matchMedia?.("(hover: hover)").matches) return;
            clearHover();
            hoverTimer.current = window.setTimeout(() => visit(index, "hover"), 220);
          }}
          onPointerLeave={clearHover}
          onClick={() => {
            setOpenedTabs((count) => count + 1);
            breakRoute(index);
          }}
        >
          <span aria-hidden="true"><i /><b /><em /></span>
        </button>
      ))}
      <span className={styles.archiveRouteSeal} aria-hidden="true" />
    </div>
  );
}

const focusOrbitTarget = { x: 74, y: 38 } as const;

function FocusOrbit({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [lensPosition, setLensPosition] = useState({ x: 18, y: 75 });
  const [localClear, setLocalClear] = useState(false);
  const [orbitRipples, setOrbitRipples] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "moving" | "miss" | "snapped">("idle");
  const [completed, setCompleted] = useState(false);
  const positionRef = useRef({ x: 18, y: 75 });
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const armedRef = useRef(false);

  const updatePosition = (next: { x: number; y: number }) => {
    const bounded = {
      x: Math.max(8, Math.min(92, Math.round(next.x))),
      y: Math.max(12, Math.min(88, Math.round(next.y))),
    };
    positionRef.current = bounded;
    setLensPosition(bounded);
    return bounded;
  };

  const complete = () => {
    updatePosition(focusOrbitTarget);
    setLocalClear(true);
    setFeedback("snapped");
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const keyboardMove = (dx: number, dy: number) => {
    if (armedRef.current || solved) return;
    const next = updatePosition({ x: positionRef.current.x + dx, y: positionRef.current.y + dy });
    setLocalClear(true);
    setFeedback("moving");
    onDiscover();
    if (Math.abs(next.x - focusOrbitTarget.x) <= 10 && Math.abs(next.y - focusOrbitTarget.y) <= 8) complete();
  };

  const visibleSolved = solved || completed;
  return (
    <div
      className={`${styles.focusOrbitScene} ${feedback === "miss" ? styles.focusOrbitMiss : ""}`}
      data-controller="focus-route"
      data-ghost-layers="3"
      data-ghost-state={visibleSolved ? "aligned" : "misaligned"}
      data-last-feedback={visibleSolved ? "snapped" : feedback}
      data-lens-position={panelPingPair(lensPosition)}
      data-local-clarity={visibleSolved || localClear ? "clear" : "blurred"}
      data-orbit-ripples={orbitRipples}
      data-orbit-visibility="visible"
      data-spatial-model="lens-over-ghost-decimal"
      data-testid="v2-scene-044"
      style={{ "--focus-lens-x": `${lensPosition.x}%`, "--focus-lens-y": `${lensPosition.y}%` } as React.CSSProperties}
    >
      <span className={styles.focusOrbitPaper} aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={styles.focusOrbitTarget}
        data-testid="focus-orbit-target"
        aria-label={locale === "zh" ? "错位小数点轨道" : "Misaligned decimal orbit"}
        onClick={() => setOrbitRipples((count) => count + 1)}
      >
        <span className={styles.focusOrbitRing} aria-hidden="true" />
        <span className={styles.focusOrbitGhostOne} aria-hidden="true" />
        <span className={styles.focusOrbitGhostTwo} aria-hidden="true" />
        <span className={styles.focusOrbitGhostThree} aria-hidden="true" />
        {orbitRipples > 0 ? <i key={orbitRipples} className={styles.focusOrbitRipple} aria-hidden="true" /> : null}
      </button>
      <button
        type="button"
        className={styles.focusOrbitLens}
        aria-label={locale === "zh" ? "透明焦点片" : "Transparent focus lens"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          drag.current = { x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || visibleSolved) return;
          const travel = Math.hypot(event.clientX - start.x, event.clientY - start.y);
          if (travel <= 16) return;
          if (!start.moved) {
            start.moved = true;
            setLocalClear(true);
            onDiscover();
          }
          const scene = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-044']");
          const rect = scene?.getBoundingClientRect();
          if (!rect?.width || !rect.height) return;
          updatePosition({
            x: (event.clientX - rect.left) / rect.width * 100,
            y: (event.clientY - rect.top) / rect.height * 100,
          });
          setFeedback("moving");
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          if (!start?.moved || visibleSolved) return;
          const target = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-044']")
            ?.querySelector<HTMLElement>("[data-testid='focus-orbit-target']");
          const rect = target?.getBoundingClientRect();
          const withinTarget = Boolean(rect
            && Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + rect.height / 2)) <= 44);
          if (withinTarget) complete();
          else setFeedback("miss");
        }}
        onPointerCancel={() => { drag.current = null; setFeedback("miss"); }}
        onKeyDown={(event) => {
          const move = event.key === "ArrowLeft" ? [-14, 0]
            : event.key === "ArrowRight" ? [14, 0]
              : event.key === "ArrowUp" ? [0, -12]
                : event.key === "ArrowDown" ? [0, 12]
                  : null;
          if (!move) return;
          event.preventDefault();
          keyboardMove(move[0], move[1]);
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

const focusCascadeLayers = [
  { x: 66, y: 61, depth: "front", glyph: "0" },
  { x: 38, y: 48, depth: "upper-middle", glyph: "." },
  { x: 62, y: 32, depth: "lower-middle", glyph: "0" },
  { x: 34, y: 67, depth: "deepest", glyph: "10" },
] as const;

function FocusCascade({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [routeDepth, setRouteDepth] = useState(0);
  const [clearLayers, setClearLayers] = useState<number[]>([]);
  const [previewLayer, setPreviewLayer] = useState<number | null>(null);
  const [wrongTransfers, setWrongTransfers] = useState(0);
  const [moves, setMoves] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "transferred" | "returned" | "miss" | "complete">("idle");
  const [lensPosition, setLensPosition] = useState({ x: 50, y: 86 });
  const [keyboardLayer, setKeyboardLayer] = useState(0);
  const [inputMode, setInputMode] = useState<"pointer-lens" | "keyboard-layer-focus">("pointer-lens");
  const [completed, setCompleted] = useState(false);
  const routeRef = useRef(0);
  const armedRef = useRef(false);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const visibleSolved = solved || completed;

  const selectLayer = (index: number, mode: "pointer-lens" | "keyboard-layer-focus") => {
    if (armedRef.current || solved) return;
    setInputMode(mode);
    setMoves((count) => count + 1);
    const expected = 3 - routeRef.current;
    if (index !== expected) {
      setWrongTransfers((count) => count + 1);
      setFeedback("returned");
      return;
    }
    const nextDepth = routeRef.current + 1;
    routeRef.current = nextDepth;
    setRouteDepth(nextDepth);
    setClearLayers((current) => current.includes(index) ? current : [...current, index]);
    setFeedback(nextDepth === 4 ? "complete" : "transferred");
    if (nextDepth !== 4 || armedRef.current) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const layerAt = (clientX: number, clientY: number, scene: HTMLElement) => {
    const layers = Array.from(scene.querySelectorAll<HTMLElement>("[data-cascade-layer]"));
    let nearest = -1;
    let distance = Number.POSITIVE_INFINITY;
    layers.forEach((layer, index) => {
      const rect = layer.getBoundingClientRect();
      const next = Math.hypot(clientX - (rect.left + rect.width / 2), clientY - (rect.top + rect.height / 2));
      if (next < distance && next <= Math.max(34, Math.max(rect.width, rect.height) * .72)) {
        nearest = index;
        distance = next;
      }
    });
    return nearest;
  };

  const moveKeyboardLayer = (direction: number) => {
    if (visibleSolved) return;
    const next = (keyboardLayer + direction + focusCascadeLayers.length) % focusCascadeLayers.length;
    setKeyboardLayer(next);
    setPreviewLayer(next);
    setLensPosition({ x: focusCascadeLayers[next].x, y: focusCascadeLayers[next].y });
    setInputMode("keyboard-layer-focus");
    onDiscover();
  };

  const clarityState = visibleSolved ? "complete" : routeDepth > 0 ? "partial" : "blurred";
  return (
    <div
      className={`${styles.focusCascadeScene} ${feedback === "returned" ? styles.focusCascadeReturned : ""}`}
      data-clarity-state={clarityState}
      data-clear-layers={clearLayers.length ? clearLayers.join(",") : "none"}
      data-controller="focus-route"
      data-handoff-to={routeDepth < 4 ? 3 - routeDepth : "complete"}
      data-input-mode={inputMode}
      data-last-feedback={visibleSolved ? "complete" : feedback}
      data-layer-count="4"
      data-moves={moves}
      data-preview-clarity={previewLayer === null ? "none" : "current-clear-next-blurred"}
      data-preview-layer={previewLayer ?? "none"}
      data-route-depth={visibleSolved ? 4 : routeDepth}
      data-spatial-model="stacked-clarity-transfer"
      data-testid="v2-scene-045"
      data-wrong-transfers={wrongTransfers}
      style={{ "--cascade-lens-x": `${lensPosition.x}%`, "--cascade-lens-y": `${lensPosition.y}%` } as React.CSSProperties}
    >
      <span className={styles.focusCascadeBackdrop} aria-hidden="true" />
      {focusCascadeLayers.map((layer, index) => (
        <button
          type="button"
          key={layer.depth}
          className={styles.focusCascadeLayer}
          aria-label={locale === "zh" ? `描图纸片 ${index + 1}` : `Tracing sheet ${index + 1}`}
          data-cascade-layer={index}
          data-clear={visibleSolved || clearLayers.includes(index) ? "true" : "false"}
          data-depth={layer.depth}
          data-preview={previewLayer === index ? "true" : "false"}
          data-testid={`focus-cascade-layer-${index}`}
          style={{ left: `${layer.x}%`, top: `${layer.y}%`, "--cascade-z": 4 - index } as React.CSSProperties}
          onClick={() => undefined}
        ><span aria-hidden="true"><i>{layer.glyph}</i><b /><em /></span></button>
      ))}
      <button
        type="button"
        className={styles.focusCascadeLens}
        aria-label={locale === "zh" ? "描图焦点片" : "Tracing focus lens"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          drag.current = { x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || visibleSolved) return;
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) return;
          if (!start.moved) {
            start.moved = true;
            onDiscover();
          }
          const scene = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-045']");
          const rect = scene?.getBoundingClientRect();
          if (!scene || !rect?.width || !rect.height) return;
          setLensPosition({
            x: Math.max(5, Math.min(95, Math.round((event.clientX - rect.left) / rect.width * 100))),
            y: Math.max(8, Math.min(92, Math.round((event.clientY - rect.top) / rect.height * 100))),
          });
          setPreviewLayer(layerAt(event.clientX, event.clientY, scene));
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          if (!start?.moved || visibleSolved) return;
          const scene = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-045']");
          if (!scene) return;
          const index = layerAt(event.clientX, event.clientY, scene);
          if (index < 0) {
            setFeedback("miss");
            return;
          }
          setPreviewLayer(index);
          selectLayer(index, "pointer-lens");
        }}
        onPointerCancel={() => { drag.current = null; setFeedback("miss"); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            moveKeyboardLayer(event.key === "ArrowRight" ? 1 : -1);
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectLayer(keyboardLayer, "keyboard-layer-focus");
          }
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

const silentHandoffPoints = [
  { x: 24, y: 66 },
  { x: 36, y: 46 },
  { x: 50, y: 35 },
  { x: 64, y: 46 },
  { x: 76, y: 66 },
] as const;

function SilentHandoff({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [progress, setProgress] = useState(0);
  const [lightPosition, setLightPosition] = useState(0);
  const [palmPresses, setPalmPresses] = useState(0);
  const [routeBreaks, setRouteBreaks] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "carrying" | "broken" | "complete">("idle");
  const [inputMode, setInputMode] = useState<"none" | "hover" | "held-trail" | "keyboard-bridge">("none");
  const [completed, setCompleted] = useState(false);
  const progressRef = useRef(0);
  const tracingRef = useRef<"hover" | "held-trail" | null>(null);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;

  const resetRoute = (broken = true) => {
    if (armedRef.current || solved) return;
    progressRef.current = 0;
    tracingRef.current = null;
    setProgress(0);
    setLightPosition(0);
    setFeedback(broken ? "broken" : "idle");
    if (broken) setRouteBreaks((count) => count + 1);
  };

  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    tracingRef.current = null;
    progressRef.current = 4;
    setProgress(4);
    setLightPosition(4);
    setFeedback("complete");
    onArm();
  };

  const advanceTo = (index: number, mode: "hover" | "held-trail") => {
    if (armedRef.current || solved) return;
    if (tracingRef.current === null) {
      if (index !== 0) return;
      tracingRef.current = mode;
      setInputMode(mode);
      setFeedback("carrying");
      return;
    }
    const expected = progressRef.current + 1;
    if (index === progressRef.current || index < expected) return;
    if (index !== expected) {
      resetRoute();
      return;
    }
    progressRef.current = index;
    setProgress(index);
    setLightPosition(index);
    setFeedback("carrying");
    setInputMode(mode);
    if (index === 1) onDiscover();
    if (index === silentHandoffPoints.length - 1) complete();
  };

  const routeIndexAt = (clientX: number, clientY: number, scene: HTMLElement) => {
    const rect = scene.getBoundingClientRect();
    if (!rect.width || !rect.height) return -1;
    const x = (clientX - rect.left) / rect.width * 100;
    const y = (clientY - rect.top) / rect.height * 100;
    let nearest = -1;
    let distance = Number.POSITIVE_INFINITY;
    silentHandoffPoints.forEach((point, index) => {
      const next = Math.hypot(x - point.x, y - point.y);
      if (next < distance && next <= 15.5) {
        nearest = index;
        distance = next;
      }
    });
    return nearest;
  };

  const pressPalm = () => {
    if (visibleSolved) return;
    setPalmPresses((count) => count + 1);
    resetRoute(false);
    setFeedback("broken");
  };

  const visibleProgress = visibleSolved ? 4 : progress;
  const routeState = visibleSolved ? "complete" : feedback;
  const handsState = visibleSolved ? "received" : feedback === "broken" ? "retracted" : "waiting";
  const light = silentHandoffPoints[visibleSolved ? 4 : lightPosition];
  return (
    <div
      className={styles.silentHandoffScene}
      data-channel-width="48"
      data-colored-segments={visibleProgress}
      data-controller="shared-control"
      data-hands-state={handsState}
      data-input-mode={inputMode}
      data-light-position={visibleSolved ? 4 : lightPosition}
      data-palm-presses={palmPresses}
      data-route-breaks={routeBreaks}
      data-route-progress={visibleProgress}
      data-route-state={routeState}
      data-spatial-model="paper-hands-shallow-bridge"
      data-testid="v2-scene-046"
      role="application"
      tabIndex={0}
      aria-label={locale === "zh" ? "纸手与浅桥" : "Paper hands and shallow bridge"}
      style={{ "--handoff-light-x": `${light.x}%`, "--handoff-light-y": `${light.y}%` } as React.CSSProperties}
      onPointerDown={(event) => {
        if (visibleSolved || (event.target as HTMLElement).closest("button")) return;
        const index = routeIndexAt(event.clientX, event.clientY, event.currentTarget);
        if (index !== 0) {
          resetRoute();
          return;
        }
        tracingRef.current = "held-trail";
        setInputMode("held-trail");
        setFeedback("carrying");
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (visibleSolved || (event.target as HTMLElement).closest("button")) return;
        const isHeld = tracingRef.current === "held-trail" || event.buttons > 0 || event.pointerType === "touch";
        const mode = isHeld ? "held-trail" : "hover";
        const index = routeIndexAt(event.clientX, event.clientY, event.currentTarget);
        if (index >= 0) advanceTo(index, mode);
      }}
      onPointerUp={(event) => {
        if ((event.target as HTMLElement).closest("button") || tracingRef.current !== "held-trail") return;
        if (!armedRef.current && !solved) resetRoute();
      }}
      onPointerCancel={() => {
        if (tracingRef.current === "held-trail" && !visibleSolved) resetRoute();
      }}
      onPointerLeave={() => {
        if (tracingRef.current === "hover" && !visibleSolved) resetRoute();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || visibleSolved) return;
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const next = Math.max(0, progressRef.current - 1);
          progressRef.current = next;
          setProgress(next);
          setLightPosition(next);
          setInputMode("keyboard-bridge");
          setFeedback(next > 0 ? "carrying" : "idle");
          return;
        }
        if (event.key !== "ArrowRight") return;
        event.preventDefault();
        const next = Math.min(4, progressRef.current + 1);
        progressRef.current = next;
        setProgress(next);
        setLightPosition(next);
        setInputMode("keyboard-bridge");
        setFeedback("carrying");
        if (next === 1) onDiscover();
        if (next === 4) complete();
      }}
    >
      <svg className={styles.silentHandoffBridge} viewBox="0 0 100 100" aria-hidden="true">
        {silentHandoffPoints.slice(0, -1).map((point, index) => {
          const next = silentHandoffPoints[index + 1];
          return <line
            key={index}
            data-lit={index < visibleProgress ? "true" : "false"}
            data-testid={`silent-handoff-segment-${index}`}
            x1={point.x}
            y1={point.y}
            x2={next.x}
            y2={next.y}
          />;
        })}
      </svg>
      <button
        type="button"
        className={`${styles.silentHandoffPalm} ${styles.silentHandoffPalmLeft}`}
        aria-label={locale === "zh" ? "左边纸手" : "Left paper hand"}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={pressPalm}
      ><span aria-hidden="true"><i /><i /><i /><b /></span></button>
      <button
        type="button"
        className={`${styles.silentHandoffPalm} ${styles.silentHandoffPalmRight}`}
        aria-label={locale === "zh" ? "右边纸手" : "Right paper hand"}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={pressPalm}
      ><span aria-hidden="true"><i /><i /><i /><b /></span></button>
      <span className={styles.silentHandoffLight} aria-hidden="true" />
      <span className={styles.silentHandoffClock} aria-hidden="true"><i /><b /></span>
    </div>
  );
}

const targetRoutePositions = [
  { x: 18, y: 68 },
  { x: 48, y: 22 },
  { x: 82, y: 37 },
  { x: 72, y: 78 },
  { x: 36, y: 82 },
] as const;

const targetRouteOrders = [
  [2, 4, 1, 3, 0],
  [4, 2, 0, 3, 1],
  [1, 3, 0, 4, 2],
  [3, 0, 2, 4, 1],
  [2, 0, 4, 1, 3],
  [4, 1, 3, 0, 2],
] as const;

const targetRouteLabels = [
  ["MOSS", "GLASS", "TIDE", "EMBER", "LINEN"],
  ["VALE", "PINE", "SILT", "DAWN", "PEARL"],
  ["REED", "FOAM", "CLAY", "DUSK", "BLOOM"],
] as const;

function TargetGuidedRoute({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "focus" | "hover" | "held-attention";
  const [routeOrder, setRouteOrder] = useState<number[]>([...targetRouteOrders[0]]);
  const [layoutReady, setLayoutReady] = useState(false);
  const [layoutVariant, setLayoutVariant] = useState(0);
  const [labelPhase, setLabelPhase] = useState(0);
  const [routeLength, setRouteLength] = useState(solved ? 5 : 0);
  const [routeState, setRouteState] = useState<"idle" | "following" | "broken" | "complete">(solved ? "complete" : "idle");
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [deadEndTab, setDeadEndTab] = useState<number | null>(null);
  const [openedTabs, setOpenedTabs] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const progressRef = useRef(solved ? 5 : 0);
  const routeRef = useRef<number[]>([...targetRouteOrders[0]]);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const tracingRef = useRef(false);
  const lastPointerTab = useRef<number | null>(null);
  const pointerPress = useRef(false);
  const pointerMoved = useRef(false);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pointerStartTab = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    let variant = Math.floor(Math.random() * targetRouteOrders.length);
    try {
      const previous = Number(window.sessionStorage.getItem("timehacker:v2:target-route-variant"));
      if (Number.isInteger(previous) && previous >= 0 && previous < targetRouteOrders.length) {
        variant = (previous + 1) % targetRouteOrders.length;
      }
      window.sessionStorage.setItem("timehacker:v2:target-route-variant", String(variant));
    } catch {
      // Session storage is only a repeat-layout guard; the puzzle remains playable without it.
    }
    const next = [...targetRouteOrders[variant]];
    const layoutTimer = window.setTimeout(() => {
      routeRef.current = next;
      setRouteOrder(next);
      setLayoutVariant(variant);
      setLayoutReady(true);
    }, 0);
    const timer = window.setInterval(() => setLabelPhase((phase) => (phase + 1) % targetRouteLabels.length), 800);
    return () => {
      window.clearTimeout(layoutTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => () => {
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
  }, []);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const breakRoute = (index: number | null) => {
    if (solved || armedRef.current) return;
    progressRef.current = 0;
    setRouteLength(0);
    setRouteState("broken");
    setDeadEndTab(index);
    setActiveTab(index);
  };
  const visit = (index: number, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    discover();
    setInputMode(mode);
    const expected = routeRef.current[progressRef.current];
    if (index !== expected) {
      breakRoute(index);
      return;
    }
    const next = progressRef.current + 1;
    progressRef.current = next;
    setRouteLength(next);
    setActiveTab(index);
    setDeadEndTab(null);
    if (next < routeRef.current.length) {
      setRouteState("following");
      return;
    }
    armedRef.current = true;
    setCompleted(true);
    setRouteState("complete");
    onArm();
  };
  const tabAt = (clientX: number, clientY: number, rect: DOMRect) => {
    if (!rect.width || !rect.height) return null;
    const x = (clientX - rect.left) / rect.width * 100;
    const y = (clientY - rect.top) / rect.height * 100;
    const index = targetRoutePositions.findIndex((point) => Math.hypot(point.x - x, point.y - y) <= 15);
    return index < 0 ? null : index;
  };
  const visitPointer = (clientX: number, clientY: number, rect: DOMRect) => {
    const index = tabAt(clientX, clientY, rect);
    if (index === null || index === lastPointerTab.current) return;
    lastPointerTab.current = index;
    visit(index, "held-attention");
  };
  const visibleSolved = solved || completed;
  const kept = visibleSolved ? routeOrder : routeOrder.slice(0, routeLength);
  const terminal = routeOrder.at(-1) ?? 0;
  const colorNames = locale === "zh"
    ? ["琥珀档案标签", "薄荷档案标签", "珊瑚档案标签", "丁香档案标签", "湖蓝档案标签"]
    : ["Amber archive label", "Mint archive label", "Coral archive label", "Lilac archive label", "Blue archive label"];

  return (
    <div
      className={styles.targetRouteScene}
      data-active-tab={activeTab ?? "none"}
      data-controller="focus-route"
      data-dead-end-tab={deadEndTab ?? "none"}
      data-input-mode={inputMode}
      data-label-phase={labelPhase}
      data-layout-ready={layoutReady ? "true" : "false"}
      data-layout-variant={layoutVariant}
      data-opened-tabs={openedTabs}
      data-route-length={visibleSolved ? 5 : routeLength}
      data-route-order={routeOrder.join(",")}
      data-route-state={visibleSolved ? "complete" : routeState}
      data-spatial-model="five-changing-labels-stable-shadow-route"
      data-terminal-outgoing="none"
      data-testid="v2-scene-065"
      onPointerDown={(event) => {
        if (visibleSolved) return;
        tracingRef.current = true;
        pointerPress.current = true;
        pointerMoved.current = false;
        pointerStart.current = { x: event.clientX, y: event.clientY };
        pointerStartTab.current = tabAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
        lastPointerTab.current = null;
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!tracingRef.current || visibleSolved) return;
        const start = pointerStart.current;
        if (start && !pointerMoved.current && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
          pointerMoved.current = true;
          if (pointerStartTab.current !== null) {
            visit(pointerStartTab.current, "held-attention");
            lastPointerTab.current = pointerStartTab.current;
          }
        }
        if (!pointerMoved.current) return;
        visitPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
      }}
      onPointerUp={() => {
        if (!pointerMoved.current && pointerStartTab.current !== null) {
          suppressClick.current = true;
          setOpenedTabs((count) => count + 1);
          breakRoute(pointerStartTab.current);
        }
        tracingRef.current = false;
        pointerStart.current = null;
        pointerStartTab.current = null;
        lastPointerTab.current = null;
        window.setTimeout(() => { pointerPress.current = false; }, 0);
      }}
      onPointerCancel={() => {
        tracingRef.current = false;
        pointerPress.current = false;
        pointerMoved.current = false;
        pointerStart.current = null;
        pointerStartTab.current = null;
        lastPointerTab.current = null;
        breakRoute(null);
      }}
    >
      <span className={styles.targetRoutePaper} aria-hidden="true"><i /><b /></span>
      {routeOrder.map((index) => {
        const point = targetRoutePositions[index];
        const step = routeOrder.indexOf(index);
        const target = step < routeOrder.length - 1 ? routeOrder[step + 1] : null;
        const next = target === null ? null : targetRoutePositions[target];
        const angle = next ? Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI : 0;
        const distance = next ? Math.hypot(next.x - point.x, next.y - point.y) : 0;
        return (
          <button
            type="button"
            key={index}
            className={styles.targetRouteTab}
            aria-label={colorNames[index]}
            data-kept={kept.includes(index) ? "true" : "false"}
            data-shadow-target={target ?? "none"}
            data-testid={`target-route-tab-${index}`}
            data-x={point.x}
            data-y={point.y}
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              "--target-shadow-angle": `${angle}deg`,
              "--target-shadow-length": `${distance * .22}rem`,
            } as React.CSSProperties}
            onFocus={() => {
              if (!pointerPress.current) visit(index, "focus");
            }}
            onPointerEnter={() => {
              if (tracingRef.current || pointerPress.current || !window.matchMedia?.("(hover: hover)").matches) return;
              if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
              setActiveTab(index);
              discover();
              hoverTimer.current = window.setTimeout(() => visit(index, "hover"), 220);
            }}
            onPointerLeave={() => {
              if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
              hoverTimer.current = null;
            }}
            onClick={() => {
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              if (pointerMoved.current) {
                pointerMoved.current = false;
                return;
              }
              setOpenedTabs((count) => count + 1);
              breakRoute(index);
            }}
          >
            <span className={styles.targetRouteCard} aria-hidden="true">
              <i data-testid={`target-route-label-${index}`}>{targetRouteLabels[labelPhase][index]}</i>
              <b /><em />
            </span>
            {target === null ? null : <span
              className={styles.targetRouteShadow}
              data-testid={`target-route-shadow-${index}`}
              aria-hidden="true"
            />}
          </button>
        );
      })}
      <span className={styles.targetRouteSeal} data-terminal={terminal} aria-hidden="true" />
    </div>
  );
}

function FocusRouteController(props: ControllerProps) {
  return props.level.id === 20
    ? <QuietCircuit {...props} />
    : props.level.id === 43
      ? <ArchiveRoute {...props} />
      : props.level.id === 44
        ? <FocusOrbit {...props} />
        : props.level.id === 45
          ? <FocusCascade {...props} />
          : props.level.id === 65
            ? <TargetGuidedRoute {...props} />
            : <GenericFocusRoute {...props} />;
}

function WheelEcho({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "wheel" | "swipe" | "keyboard-wheel";
  const gapAngle = 300;
  const [solidAngle, setSolidAngle] = useState(solved ? gapAngle : 120);
  const [echoAngle, setEchoAngle] = useState(solved ? gapAngle : 120);
  const [solidState, setSolidState] = useState<"resting" | "moving" | "dispersed">(solved ? "dispersed" : "resting");
  const [echoState, setEchoState] = useState<"resting" | "waiting" | "returned" | "magnetic">(solved ? "magnetic" : "resting");
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const solidRef = useRef(solved ? gapAngle : 120);
  const echoTargetRef = useRef(solved ? gapAngle : 120);
  const swipeRef = useRef<{ pointerId: number; y: number } | null>(null);
  const timersRef = useRef<number[]>([]);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  const normalize = (angle: number) => (angle % 360 + 360) % 360;
  const atGap = (angle: number) => Math.abs(((angle - gapAngle + 540) % 360) - 180) <= 12;
  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = () => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    setCompleted(true);
    setEchoState("magnetic");
    onArm();
  };
  const move = (direction: 1 | -1, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    discover();
    setInputMode(mode);
    const nextSolid = normalize(solidRef.current + direction * 45);
    solidRef.current = nextSolid;
    setSolidAngle(nextSolid);
    setSolidState(atGap(nextSolid) ? "dispersed" : "moving");
    const nextEcho = normalize(echoTargetRef.current - direction * 45);
    echoTargetRef.current = nextEcho;
    setEchoState("waiting");
    const timer = window.setTimeout(() => {
      setEchoAngle(nextEcho);
      if (atGap(nextEcho)) complete();
      else setEchoState("returned");
    }, 120);
    timersRef.current.push(timer);
  };
  const visibleSolved = solved || completed;

  return (
    <div
      className={styles.wheelEchoScene}
      data-controller="wheel-echo"
      data-echo-angle={visibleSolved ? gapAngle : echoAngle}
      data-echo-state={visibleSolved ? "magnetic" : echoState}
      data-gap-state={visibleSolved ? "echo-filled" : "open"}
      data-input-mode={inputMode}
      data-scroll-scope="puzzle-only"
      data-solid-angle={solidAngle}
      data-solid-state={solidState}
      data-spatial-model="paper-wheel-translucent-gap-opposed-delayed-echo"
      data-testid="v2-scene-067"
      role="application"
      tabIndex={0}
      aria-label={locale === "zh" ? "纸轮与反向回声" : "Paper wheel and returning echo"}
      style={{
        "--wheel-solid-angle": `${solidAngle}deg`,
        "--wheel-echo-angle": `${visibleSolved ? gapAngle : echoAngle}deg`,
      } as React.CSSProperties}
      onClick={() => undefined}
      onWheel={(event) => {
        event.preventDefault();
        move(event.deltaY >= 0 ? 1 : -1, "wheel");
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        event.preventDefault();
        move(event.key === "ArrowDown" ? 1 : -1, "keyboard-wheel");
      }}
      onPointerDown={(event) => {
        if (visibleSolved) return;
        swipeRef.current = { pointerId: event.pointerId, y: event.clientY };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        const swipe = swipeRef.current;
        swipeRef.current = null;
        if (!swipe || swipe.pointerId !== event.pointerId || visibleSolved) return;
        const delta = event.clientY - swipe.y;
        if (Math.abs(delta) < 24) return;
        const turns = Math.max(1, Math.min(4, Math.round(Math.abs(delta) / 27)));
        const direction = delta > 0 ? 1 : -1;
        for (let turn = 0; turn < turns; turn += 1) move(direction, "swipe");
      }}
      onPointerCancel={() => { swipeRef.current = null; }}
    >
      <span className={styles.wheelEchoPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.wheelEchoRing} aria-hidden="true"><i /><b /></span>
      <span className={styles.wheelEchoGap} data-material="translucent" data-testid="wheel-echo-gap" aria-hidden="true"><i /></span>
      <span className={styles.wheelEchoSolid} data-material="solid" data-testid="wheel-echo-solid" aria-hidden="true"><i /><b /></span>
      <span className={styles.wheelEchoReturn} data-material="translucent" data-testid="wheel-echo-return" aria-hidden="true"><i /><b /></span>
    </div>
  );
}

function CounterclockwiseBreach({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "rim-sweep" | "wheel" | "keyboard-rim";
  const [arcStage, setArcStage] = useState(solved ? 3 : 0);
  const [lastDirection, setLastDirection] = useState<"none" | "counterclockwise" | "clockwise">("none");
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [retractions, setRetractions] = useState(0);
  const [completed, setCompleted] = useState(false);
  const stageRef = useRef(solved ? 3 : 0);
  const swipeRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = () => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };
  const moveArc = (direction: "counterclockwise" | "clockwise", mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    discover();
    setInputMode(mode);
    setLastDirection(direction);
    const next = direction === "counterclockwise"
      ? Math.min(3, stageRef.current + 1)
      : Math.max(0, stageRef.current - 1);
    if (direction === "clockwise") setRetractions((current) => current + 1);
    stageRef.current = next;
    setArcStage(next);
    if (next === 3) complete();
  };
  const sceneGeometry = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return rect.width && rect.height
      ? { centerX: rect.left + rect.width / 2, centerY: rect.top + rect.height / 2, scale: Math.min(rect.width, rect.height) }
      : { centerX: 150, centerY: 150, scale: 150 };
  };
  const visibleSolved = solved || completed;

  return (
    <div
      className={styles.counterclockwiseBreachScene}
      data-arc-layer={visibleSolved ? "front" : "back"}
      data-arc-stage={visibleSolved ? 3 : arcStage}
      data-controller="orbit"
      data-gap-state={visibleSolved ? "sealed" : "open"}
      data-input-mode={inputMode}
      data-last-direction={lastDirection}
      data-retractions={retractions}
      data-scroll-scope="puzzle-only"
      data-spatial-model="broken-clock-rim-backside-arc"
      data-testid="v2-scene-068"
      role="application"
      tabIndex={0}
      aria-label={locale === "zh" ? "缺弧纸钟面" : "Paper clock rim with a missing arc"}
      style={{ "--breach-stage": visibleSolved ? 3 : arcStage } as React.CSSProperties}
      onClick={() => undefined}
      onWheel={(event) => {
        event.preventDefault();
        moveArc(event.deltaY < 0 ? "counterclockwise" : "clockwise", "wheel");
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        moveArc(event.key === "ArrowLeft" ? "counterclockwise" : "clockwise", "keyboard-rim");
      }}
      onPointerDown={(event) => {
        if (visibleSolved) return;
        swipeRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerUp={(event) => {
        const swipe = swipeRef.current;
        swipeRef.current = null;
        if (!swipe || swipe.pointerId !== event.pointerId || visibleSolved) return;
        const geometry = sceneGeometry(event.currentTarget);
        const startX = swipe.x - geometry.centerX;
        const startY = swipe.y - geometry.centerY;
        const endX = event.clientX - geometry.centerX;
        const endY = event.clientY - geometry.centerY;
        const startRadius = Math.hypot(startX, startY);
        const endRadius = Math.hypot(endX, endY);
        const minimumRadius = geometry.scale * .34;
        const maximumRadius = geometry.scale * .84;
        const distance = Math.hypot(event.clientX - swipe.x, event.clientY - swipe.y);
        if (distance < 24 || startRadius < minimumRadius || endRadius < minimumRadius || startRadius > maximumRadius || endRadius > maximumRadius) return;
        const cross = startX * endY - startY * endX;
        if (Math.abs(cross) < geometry.scale * 3) return;
        moveArc(cross < 0 ? "counterclockwise" : "clockwise", "rim-sweep");
      }}
      onPointerCancel={() => { swipeRef.current = null; }}
    >
      <span className={styles.breachPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.breachRim} aria-hidden="true"><i /><b /></span>
      <span className={styles.breachBackPocket} aria-hidden="true" />
      <span className={styles.breachGap} data-material="translucent-cut" data-testid="breach-gap-068" aria-hidden="true"><i /></span>
      <span className={styles.breachArc} data-material="backside-paper" data-testid="breach-arc-068" aria-hidden="true"><i /><b /></span>
      <span className={styles.breachPin} aria-hidden="true" />
    </div>
  );
}

function TabReturn({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [discovered, setDiscovered] = useState(false);
  const discoveredRef = useRef(false);
  const [ticketFeedback, setTicketFeedback] = useState<"still" | "dodged" | "cutout-found">("still");
  const [ticketDodges, setTicketDodges] = useState(0);
  const [ticketOffset, setTicketOffset] = useState(0);
  const [hiddenCycle, setHiddenCycle] = useState<"idle" | "hidden" | "expired" | "returned">("idle");
  const [creaseCount, setCreaseCount] = useState(0);
  const [returned, setReturned] = useState(false);
  const [coverProgress, setCoverProgress] = useState(0);
  const coverProgressRef = useRef(0);
  const [coverState, setCoverState] = useState<"open" | "covered" | "returned">("open");
  const ticketStart = useRef<number | null>(null);
  const foldStart = useRef<{ x: number; progress: number } | null>(null);
  const hiddenAt = useRef<number | null>(null);
  const hiddenAfterDiscovery = useRef(false);
  const lingerTimer = useRef<number | null>(null);
  const armedRef = useRef(false);
  const visibleReturned = solved || returned;

  const complete = useCallback((route: "visibility" | "cover") => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setReturned(true);
    if (route === "visibility") setHiddenCycle("returned");
    else setCoverState("returned");
    onArm();
  }, [onArm, solved]);

  const reveal = useCallback(() => {
    if (discoveredRef.current || solved) return;
    discoveredRef.current = true;
    setDiscovered(true);
    setTicketFeedback("cutout-found");
    setTicketOffset(0);
    onDiscover();
  }, [onDiscover, solved]);

  const clearLinger = () => {
    if (lingerTimer.current === null) return;
    window.clearTimeout(lingerTimer.current);
    lingerTimer.current = null;
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt.current = Date.now();
        hiddenAfterDiscovery.current = discoveredRef.current;
        setHiddenCycle("hidden");
        return;
      }
      if (hiddenAt.current === null) return;
      const elapsed = Date.now() - hiddenAt.current;
      const wasDiscovered = hiddenAfterDiscovery.current;
      hiddenAt.current = null;
      hiddenAfterDiscovery.current = false;
      if (!wasDiscovered) {
        setCreaseCount((count) => count + 1);
        setHiddenCycle("idle");
      } else if (elapsed <= 30_000) complete("visibility");
      else setHiddenCycle("expired");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [complete]);

  useEffect(() => () => clearLinger(), []);

  const startLinger = () => {
    clearLinger();
    lingerTimer.current = window.setTimeout(() => {
      lingerTimer.current = null;
      reveal();
    }, 700);
  };

  const setNextCoverProgress = (progress: number) => {
    const bounded = Math.max(0, Math.min(100, Math.round(progress)));
    coverProgressRef.current = bounded;
    setCoverProgress(bounded);
    return bounded;
  };

  const settleCover = (progress: number) => {
    if (!discoveredRef.current || visibleReturned) {
      setNextCoverProgress(0);
      setCoverState("open");
      if (!discoveredRef.current) setCreaseCount((count) => count + 1);
      return;
    }
    if (coverState === "open") {
      if (progress >= 82) {
        setNextCoverProgress(100);
        setCoverState("covered");
      } else {
        setNextCoverProgress(0);
        setCoverState("open");
      }
      return;
    }
    if (coverState === "covered" && progress <= 18) {
      setNextCoverProgress(0);
      complete("cover");
    } else setNextCoverProgress(100);
  };

  return (
    <div
      className={styles.tabReturnScene}
      data-controller="cover-return"
      data-cover-progress={visibleReturned ? 0 : coverProgress}
      data-cover-state={visibleReturned && coverState !== "covered" ? "returned" : coverState}
      data-crease-count={creaseCount}
      data-discovered={discovered ? "true" : "false"}
      data-hidden-cycle={hiddenCycle}
      data-initial-visibility-count="0"
      data-return-state={visibleReturned ? "returned" : "partial"}
      data-spatial-model="edge-ticket-cover-return"
      data-testid="v2-scene-040"
      data-ticket-cutout={discovered ? "revealed" : "concealed"}
      data-ticket-dodges={ticketDodges}
      data-ticket-feedback={ticketFeedback}
      style={{
        "--tab-return-cover": `${visibleReturned ? 0 : coverProgress}%`,
        "--tab-return-ticket": `${ticketOffset}px`,
      } as React.CSSProperties}
    >
      <span className={styles.tabReturnPaper} aria-hidden="true"><i /><b /><em /></span>
      <span className={styles.tabReturnCrease} aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={styles.tabReturnTicket}
        aria-label={locale === "zh" ? "半张回转纸票" : "Half return ticket"}
        onClick={() => undefined}
        onPointerEnter={startLinger}
        onPointerLeave={clearLinger}
        onPointerDown={(event) => {
          if (visibleReturned) return;
          ticketStart.current = event.clientX;
          startLinger();
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = ticketStart.current;
          if (start === null || visibleReturned) return;
          const dx = event.clientX - start;
          if (Math.abs(dx) <= 8) return;
          clearLinger();
          if (dx > 0) {
            setTicketOffset(Math.min(24, dx * .35));
            if (dx >= 24) reveal();
          } else {
            setTicketFeedback("dodged");
            setTicketOffset(Math.min(28, Math.abs(dx) * .4));
          }
        }}
        onPointerUp={(event) => {
          clearLinger();
          const start = ticketStart.current;
          ticketStart.current = null;
          if (start === null || visibleReturned) return;
          const dx = event.clientX - start;
          if (dx >= 24) reveal();
          else if (dx <= -12) {
            setTicketFeedback("dodged");
            setTicketDodges((count) => count + 1);
            setTicketOffset(0);
          } else setTicketOffset(0);
        }}
        onPointerCancel={() => {
          clearLinger();
          ticketStart.current = null;
          setTicketOffset(0);
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight") return;
          event.preventDefault();
          reveal();
        }}
      ><span aria-hidden="true"><i /><b /><em /></span></button>
      <span className={styles.tabReturnCoverSheet} aria-hidden="true"><i /><b /></span>
      <button
        type="button"
        className={styles.tabReturnFold}
        aria-label={locale === "zh" ? "折页" : "Page fold"}
        onPointerDown={(event) => {
          if (visibleReturned) return;
          foldStart.current = { x: event.clientX, progress: coverProgressRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = foldStart.current;
          if (!start || visibleReturned) return;
          const distance = coverState === "covered" ? event.clientX - start.x : start.x - event.clientX;
          const progress = coverState === "covered" ? start.progress - distance / 1.45 : start.progress + distance / 1.45;
          setNextCoverProgress(progress);
        }}
        onPointerUp={() => {
          const start = foldStart.current;
          foldStart.current = null;
          if (!start || visibleReturned) return;
          settleCover(coverProgressRef.current);
        }}
        onPointerCancel={() => {
          foldStart.current = null;
          settleCover(coverProgressRef.current);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (!discoveredRef.current) {
            setCreaseCount((count) => count + 1);
            return;
          }
          if (coverState === "open") {
            setNextCoverProgress(100);
            setCoverState("covered");
          } else if (coverState === "covered") {
            setNextCoverProgress(0);
            complete("cover");
          }
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

function GenericCoverReturn({ level, locale, onDiscover, onArm }: ControllerProps) {
  const [covered, setCovered] = useState(false);
  const [discovered, setDiscovered] = useState(false);
  useEffect(() => {
    if (level.id !== 40) return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { setCovered(true); setDiscovered(true); onDiscover(); }
      else if (document.visibilityState === "visible" && covered && discovered) onArm();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [covered, discovered, level.id, onArm, onDiscover]);
  const toggle = () => {
    if (!covered) { setCovered(true); setDiscovered(true); onDiscover(); }
    else { setCovered(false); if (discovered) onArm(); }
  };
  return <div className={`${styles.coverBoard} ${covered ? styles.isCovered : ""}`} data-controller="cover-return"><span aria-hidden="true" /><button type="button" onClick={toggle} aria-label={locale === "zh" ? (covered ? "揭开纸页" : "盖住纸页") : (covered ? "Uncover the paper" : "Cover the paper")}><i /></button></div>;
}

function GhostSession({ locale, solved, resetEpoch, ghostAnchor, onGhostAnchorChange, onDiscover, onArm }: ControllerProps) {
  const [dotAnchor, setDotAnchor] = useState<"start" | "left" | "right" | "ungrounded">("start");
  const [inputMode, setInputMode] = useState<"idle" | "pointer-position" | "keyboard-position">("idle");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const shadowAnchor = resetEpoch > 0 ? ghostAnchor : null;

  const choose = (anchor: "left" | "right" | "ungrounded", mode: "pointer-position" | "keyboard-position") => {
    if (visibleSolved || armedRef.current) return;
    setInputMode(mode);
    setDotAnchor(anchor);
    onDiscover();
    if (anchor === "ungrounded") {
      onGhostAnchorChange(null);
      return;
    }
    if (shadowAnchor && shadowAnchor !== anchor) {
      armedRef.current = true;
      setCompleted(true);
      onArm();
      return;
    }
    if (!shadowAnchor) onGhostAnchorChange(anchor);
  };

  return (
    <div
      className={styles.ghostSessionScene}
      data-circle-state={visibleSolved ? "complete" : "open"}
      data-controller="cover-return"
      data-dot-anchor={visibleSolved ? (shadowAnchor === "left" ? "right" : "left") : dotAnchor}
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-reset-count={Math.min(resetEpoch, 1)}
      data-shadow-anchor={shadowAnchor ?? "none"}
      data-shadow-persistence="session-only"
      data-spatial-model="one-returning-dot-two-complementary-imprints-one-session-shadow"
      data-testid="v2-scene-084"
    >
      <span className={styles.ghostSessionPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.ghostSessionTrace} aria-hidden="true" />
      {(["left", "right"] as const).map((anchor, index) => (
        <span
          key={anchor}
          className={`${styles.ghostSessionImprint} ${anchor === "left" ? styles.ghostSessionLeft : styles.ghostSessionRight}`}
          data-shadowed={shadowAnchor === anchor ? "true" : "false"}
          data-testid={`ghost-imprint-${index}`}
          aria-hidden="true"
        ><i /></span>
      ))}
      <button
        type="button"
        className={styles.ghostSessionDot}
        data-testid="ghost-session-dot"
        aria-label={locale === "zh" ? "可移动纸点" : "Movable paper dot"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (Math.hypot(dx, dy) > 10) onDiscover();
          if (Math.abs(dy) > 44) setDotAnchor("ungrounded");
          else if (dx <= -40) setDotAnchor("left");
          else if (dx >= 40) setDotAnchor("right");
          else setDotAnchor("start");
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          choose(Math.abs(dy) > 44 ? "ungrounded" : dx <= -40 ? "left" : dx >= 40 ? "right" : "ungrounded", "pointer-position");
        }}
        onPointerCancel={() => { dragRef.current = null; setDotAnchor("start"); }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          choose(event.key === "ArrowLeft" ? "left" : "right", "keyboard-position");
        }}
      ><span aria-hidden="true"><i /></span></button>
      <span className={styles.ghostSessionEdgeNote} data-visible={!shadowAnchor && dotAnchor !== "start" ? "true" : "false"} aria-hidden="true">
        {locale === "zh" ? "纸会重来，压痕不会" : "Paper returns. Imprints remain."}
      </span>
      <span className={styles.ghostSessionSeal} aria-hidden="true" />
    </div>
  );
}

function PhaseReturn({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [coverState, setCoverState] = useState<"open" | "covered">("open");
  const [coverProgress, setCoverProgress] = useState(0);
  const [hiddenElapsed, setHiddenElapsed] = useState(0);
  const [differenceShadow, setDifferenceShadow] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [inputMode, setInputMode] = useState<"idle" | "pointer-cover" | "keyboard-cover">("idle");
  const dragRef = useRef<{ pointerId: number; y: number; progress: number } | null>(null);
  const coveredAt = useRef<number | null>(null);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const complementary = hiddenElapsed >= 1_800 && hiddenElapsed <= 3_600;

  useEffect(() => {
    if (coverState !== "covered" || coveredAt.current === null || visibleSolved) return;
    const update = () => setHiddenElapsed(Date.now() - coveredAt.current!);
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [coverState, visibleSolved]);

  const cover = (mode: "pointer-cover" | "keyboard-cover") => {
    if (visibleSolved) return;
    setInputMode(mode);
    setCoverProgress(100);
    setCoverState("covered");
    setHiddenElapsed(0);
    setDifferenceShadow(false);
    coveredAt.current = Date.now();
    onDiscover();
  };

  const uncover = (mode: "pointer-cover" | "keyboard-cover") => {
    if (visibleSolved || coverState !== "covered" || coveredAt.current === null) return;
    const elapsed = Date.now() - coveredAt.current;
    coveredAt.current = null;
    setInputMode(mode);
    setHiddenElapsed(elapsed);
    setCoverProgress(0);
    setCoverState("open");
    if (elapsed >= 1_800 && elapsed <= 3_600) {
      armedRef.current = true;
      setCompleted(true);
      onArm();
    } else setDifferenceShadow(true);
  };

  return (
    <div
      className={styles.phaseReturnScene}
      data-circle-state={visibleSolved ? "full" : "split"}
      data-controller="cover-return"
      data-cover-state={visibleSolved ? "returned" : coverState}
      data-difference-shadow={differenceShadow ? "visible" : "hidden"}
      data-hidden-elapsed-ms={hiddenElapsed}
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-phase-state={visibleSolved || complementary ? "complementary" : "passing"}
      data-spatial-model="moving-moon-under-page-cover-with-one-edge-window-and-complementary-notch"
      data-testid="v2-scene-085"
      data-window-ms="1800"
      style={{
        "--phase-cover": `${visibleSolved ? 0 : coverProgress}%`,
        "--phase-shift": `${Math.min(1, hiddenElapsed / 3_600)}`,
      } as React.CSSProperties}
    >
      <span className={styles.phaseReturnPaper} aria-hidden="true"><i /><b /></span>
      <button type="button" className={styles.phaseReturnMoon} data-testid="phase-return-moon" aria-label={locale === "zh" ? "转动的月相纸盘" : "Moving moon phase"} onClick={() => undefined}><span aria-hidden="true"><i /></span></button>
      <span className={styles.phaseReturnNotch} aria-hidden="true"><i /></span>
      <span className={styles.phaseReturnDifference} aria-hidden="true" />
      <span className={styles.phaseReturnCoverSheet} aria-hidden="true"><i /><b /></span>
      <span className={styles.phaseReturnWindow} data-testid="phase-return-window" aria-hidden="true"><i /></span>
      <button
        type="button"
        className={styles.phaseReturnCoverHandle}
        data-testid="phase-return-cover"
        aria-label={locale === "zh" ? "页面盖纸" : "Page cover"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, y: event.clientY, progress: coverState === "covered" ? 100 : 0 };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const next = Math.max(0, Math.min(100, drag.progress + (event.clientY - drag.y) * 1.45));
          setCoverProgress(next);
          if (Math.abs(event.clientY - drag.y) > 10) onDiscover();
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dy = event.clientY - drag.y;
          if (coverState === "open" && dy >= 48) cover("pointer-cover");
          else if (coverState === "covered" && dy <= -48) uncover("pointer-cover");
          else setCoverProgress(coverState === "covered" ? 100 : 0);
        }}
        onPointerCancel={() => { dragRef.current = null; setCoverProgress(coverState === "covered" ? 100 : 0); }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (coverState === "open") cover("keyboard-cover");
          else uncover("keyboard-cover");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.phaseReturnSeal} aria-hidden="true" />
    </div>
  );
}

function EclipseSession({ solved, menuOpen, eclipseOffset, onDiscover, onArm }: ControllerProps) {
  const [completed, setCompleted] = useState(false);
  const [closeResult, setCloseResult] = useState<"none" | "miss" | "carried-shadow">("none");
  const wasOpen = useRef(false);
  const alignedSeen = useRef(false);
  const armedRef = useRef(false);
  const aligned = eclipseOffset >= 60 && eclipseOffset <= 84;
  const visibleSolved = solved || completed;

  useEffect(() => {
    if (visibleSolved) return;
    if (menuOpen) {
      if (!wasOpen.current) alignedSeen.current = false;
      wasOpen.current = true;
      if (aligned) {
        alignedSeen.current = true;
        onDiscover();
      }
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    if (alignedSeen.current) {
      if (armedRef.current) return;
      armedRef.current = true;
      setCloseResult("carried-shadow");
      setCompleted(true);
      onArm();
    } else setCloseResult("miss");
  }, [aligned, menuOpen, onArm, onDiscover, visibleSolved]);

  return (
    <div
      className={styles.eclipseSessionScene}
      data-close-result={closeResult}
      data-controller="shared-control"
      data-eclipse-state={menuOpen && aligned ? "corona" : visibleSolved ? "carried" : "separate"}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-menu-cutout={menuOpen && aligned ? "aligned" : menuOpen ? "separate" : "closed"}
      data-spatial-model="real-menu-paper-cutout-crosses-page-sun-and-carries-shadow-to-decimal"
      data-testid="v2-scene-086"
    >
      <span className={styles.eclipseSessionPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.eclipsePageSun} data-testid="eclipse-page-sun" aria-hidden="true"><i /></span>
      <span className={styles.eclipseCorona} aria-hidden="true" />
      <span className={styles.eclipseDecimalShadow} data-testid="eclipse-decimal-shadow" data-visible={visibleSolved ? "true" : "false"} aria-hidden="true" />
      <span className={styles.eclipseSessionSeal} aria-hidden="true" />
    </div>
  );
}

interface V2EclipseMenuLayerProps {
  offset: number;
  aligned: boolean;
  onOffsetChange: (offset: number) => void;
}

export function V2EclipseMenuLayer({ offset, aligned, onOffsetChange }: V2EclipseMenuLayerProps) {
  const { locale } = useLocale();
  const dragRef = useRef<{ pointerId: number; y: number; offset: number } | null>(null);
  const move = (next: number) => onOffsetChange(Math.max(0, Math.min(96, Math.round(next))));
  return (
    <div
      className={styles.eclipseMenuLayer}
      data-aligned={aligned ? "true" : "false"}
      data-settings-access="preserved"
      data-testid="eclipse-menu-paper"
      style={{ "--eclipse-menu-offset": `${offset}px` } as React.CSSProperties}
    >
      <span className={styles.eclipseMenuPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.eclipseMenuHole} aria-hidden="true"><i /></span>
      <button
        type="button"
        className={styles.eclipseMenuHandle}
        data-testid="eclipse-menu-paper-handle"
        aria-label={locale === "zh" ? "菜单纸层边缘" : "Menu paper edge"}
        onPointerDown={(event) => {
          dragRef.current = { pointerId: event.pointerId, y: event.clientY, offset };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          move(drag.offset + drag.y - event.clientY);
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId) return;
          move(drag.offset + drag.y - event.clientY);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          move(offset + (event.key === "ArrowUp" ? 24 : -24));
        }}
      ><span aria-hidden="true"><i /></span></button>
    </div>
  );
}

function CoverReturn(props: ControllerProps) {
  return props.level.id === 40
    ? <TabReturn {...props} />
    : props.level.id === 84
      ? <GhostSession {...props} />
      : props.level.id === 85
        ? <PhaseReturn {...props} />
      : <GenericCoverReturn {...props} />;
}

const helpLoopNodes = [
  { x: 45, y: 13 }, { x: 64, y: 16 }, { x: 78, y: 28 }, { x: 80, y: 44 }, { x: 70, y: 57 }, { x: 57, y: 65 },
  { x: 55, y: 78 }, { x: 43, y: 78 }, { x: 42, y: 62 }, { x: 51, y: 50 }, { x: 61, y: 43 }, { x: 61, y: 31 },
  { x: 50, y: 26 }, { x: 39, y: 31 }, { x: 34, y: 43 }, { x: 22, y: 40 }, { x: 24, y: 25 }, { x: 34, y: 16 },
] as const;

function HelpLoop({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [routeState, setRouteState] = useState<"idle" | "tracing" | "faded" | "complete">("idle");
  const [routeProgress, setRouteProgress] = useState(0);
  const [routeFaults, setRouteFaults] = useState(0);
  const [innerClicks, setInnerClicks] = useState(0);
  const [dotRipples, setDotRipples] = useState(0);
  const [keyboardBead, setKeyboardBead] = useState(0);
  const tracing = useRef(false);
  const startNode = useRef<number | null>(null);
  const lastNode = useRef<number | null>(null);
  const direction = useRef<-1 | 0 | 1>(0);
  const steps = useRef(0);
  const keyboardDirection = useRef<-1 | 0 | 1>(0);
  const keyboardSteps = useRef(0);
  const armedRef = useRef(false);
  const visibleComplete = solved || routeState === "complete";

  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setRouteState("complete");
    setRouteProgress(helpLoopNodes.length + 1);
    onArm();
  };

  const resetTrace = (fault = false) => {
    startNode.current = null;
    lastNode.current = null;
    direction.current = 0;
    steps.current = 0;
    setRouteProgress(0);
    setRouteState(fault ? "faded" : "idle");
    if (fault) setRouteFaults((count) => count + 1);
  };

  const visitNode = (index: number) => {
    if (visibleComplete) return;
    if (startNode.current === null) {
      startNode.current = index;
      lastNode.current = index;
      steps.current = 1;
      setRouteProgress(1);
      setRouteState("tracing");
      return;
    }
    const previous = lastNode.current;
    if (previous === null || previous === index) return;
    const nodeCount = helpLoopNodes.length;
    const clockwise = (previous + 1) % nodeCount;
    const counterClockwise = (previous - 1 + nodeCount) % nodeCount;
    if (direction.current === 0) {
      if (index === clockwise) direction.current = 1;
      else if (index === counterClockwise) direction.current = -1;
      else {
        resetTrace(true);
        return;
      }
    }
    const expected = (previous + direction.current + nodeCount) % nodeCount;
    if (index !== expected) {
      resetTrace(true);
      return;
    }
    lastNode.current = index;
    steps.current += 1;
    setRouteProgress(steps.current);
    setRouteState("tracing");
    if (steps.current >= 3) onDiscover();
    if (steps.current >= nodeCount + 1 && index === startNode.current) complete();
  };

  const visitPointer = (clientX: number, clientY: number, rect: DOMRect) => {
    const point = {
      x: (clientX - rect.left) / rect.width * 100,
      y: (clientY - rect.top) / rect.height * 100,
    };
    if (point.x >= 43 && point.x <= 55 && point.y >= 32 && point.y <= 45) {
      resetTrace(true);
      return;
    }
    let nearest = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    helpLoopNodes.forEach((node, index) => {
      const distance = Math.hypot(point.x - node.x, point.y - node.y);
      if (distance < nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    if (nearestDistance <= 15) visitNode(nearest);
    else if (steps.current > 0) resetTrace(true);
  };

  const disturb = () => {
    if (visibleComplete) return;
    setInnerClicks((count) => count + 1);
    setDotRipples((count) => count + 1);
    resetTrace(true);
  };

  const moveKeyboard = (nextDirection: -1 | 1) => {
    if (visibleComplete) return;
    if (keyboardDirection.current !== 0 && keyboardDirection.current !== nextDirection) keyboardSteps.current = 0;
    keyboardDirection.current = nextDirection;
    const next = (keyboardBead + nextDirection + helpLoopNodes.length) % helpLoopNodes.length;
    setKeyboardBead(next);
    keyboardSteps.current += 1;
    setRouteState("tracing");
    setRouteProgress(Math.min(helpLoopNodes.length, keyboardSteps.current));
    if (keyboardSteps.current >= 3) onDiscover();
    if (keyboardSteps.current >= helpLoopNodes.length) complete();
  };

  const bead = helpLoopNodes[keyboardBead];
  return (
    <div
      className={styles.helpLoopScene}
      data-channel-width="28"
      data-connector={visibleComplete ? "connected" : "absent"}
      data-controller="orbit"
      data-dot-ripples={dotRipples}
      data-inner-clicks={innerClicks}
      data-keyboard-bead={visibleComplete ? 0 : keyboardBead}
      data-route-faults={routeFaults}
      data-route-progress={visibleComplete ? helpLoopNodes.length + 1 : routeProgress}
      data-route-state={visibleComplete ? "complete" : routeState}
      data-spatial-model="question-mark-outer-rim"
      data-testid="v2-scene-041"
      style={{
        "--help-bead-x": `${bead.x}%`,
        "--help-bead-y": `${bead.y}%`,
        "--help-route-progress": `${Math.min(1, routeProgress / (helpLoopNodes.length + 1))}`,
      } as React.CSSProperties}
    >
      <span className={styles.helpLoopPaper} aria-hidden="true"><i /><b /></span>
      <svg
        className={styles.helpLoopTrack}
        viewBox="0 0 100 100"
        role="application"
        tabIndex={0}
        aria-label={locale === "zh" ? "问号外缘纸轨" : "Outer question-mark paper rim"}
        onPointerDown={(event) => {
          if (visibleComplete) return;
          tracing.current = true;
          resetTrace();
          visitPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!tracing.current || visibleComplete) return;
          visitPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
        }}
        onPointerUp={() => { tracing.current = false; }}
        onPointerCancel={() => { tracing.current = false; resetTrace(); }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          moveKeyboard(event.key === "ArrowRight" ? 1 : -1);
        }}
      >
        <path className={styles.helpLoopOuterPath} d="M45 13 C64 12 79 23 80 40 C81 54 70 59 58 66 C54 69 57 78 49 79 C39 80 40 69 43 61 C46 54 61 49 62 39 C63 30 56 25 48 26 C39 27 38 44 29 44 C18 44 19 29 25 22 C30 16 37 13 45 13 Z" />
        <path className={styles.helpLoopTrailPath} pathLength="1" d="M45 13 C64 12 79 23 80 40 C81 54 70 59 58 66 C54 69 57 78 49 79 C39 80 40 69 43 61 C46 54 61 49 62 39 C63 30 56 25 48 26 C39 27 38 44 29 44 C18 44 19 29 25 22 C30 16 37 13 45 13 Z" />
      </svg>
      <button type="button" className={styles.helpLoopInside} aria-label={locale === "zh" ? "问号内侧" : "Inside the question mark"} onClick={disturb}><span aria-hidden="true" /></button>
      <button type="button" className={styles.helpLoopDot} aria-label={locale === "zh" ? "安静圆点" : "Quiet dot"} onClick={disturb}><span aria-hidden="true" /></button>
      <span className={styles.helpLoopBead} aria-hidden="true" />
      <span className={styles.helpLoopConnector} aria-hidden="true" />
      {dotRipples > 0 ? <span key={dotRipples} className={styles.helpLoopRipple} aria-hidden="true" /> : null}
    </div>
  );
}

const panelPingLayout = { left: 22, top: 18, width: 68, height: 66 } as const;
const panelPingSource = { x: 16, y: 62 } as const;

function panelPingPair(point: { x: number; y: number }) {
  return `${Number(point.x.toFixed(1))},${Number(point.y.toFixed(1))}`;
}

function PanelPing({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);
  const [echoLocal, setEchoLocal] = useState<{ x: number; y: number } | null>(null);
  const [echoVisibility, setEchoVisibility] = useState<"none" | "pulse" | "imprint">("none");
  const [pingCount, setPingCount] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [feedback, setFeedback] = useState<"idle" | "ping" | "drifting" | "rebounded" | "aligned">("idle");
  const [completed, setCompleted] = useState(false);
  const echoRef = useRef<{ x: number; y: number } | null>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; offset: { x: number; y: number }; moved: boolean } | null>(null);
  const armedRef = useRef(false);
  const pulseTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
  }, []);

  const visibleSolved = solved || completed;
  const effectiveOffset = offset;
  const currentEcho = echoLocal;
  const echoWorld = currentEcho
    ? {
        x: panelPingLayout.left + effectiveOffset.x + currentEcho.x * panelPingLayout.width / 100,
        y: panelPingLayout.top + effectiveOffset.y + currentEcho.y * panelPingLayout.height / 100,
      }
    : null;
  const aligned = visibleSolved || Boolean(echoWorld
    && Math.abs(echoWorld.x - panelPingSource.x) <= 6
    && Math.abs(echoWorld.y - panelPingSource.y) <= 8);

  const updateOffset = (next: { x: number; y: number }) => {
    const bounded = {
      x: Math.max(-55, Math.min(25, Math.round(next.x))),
      y: Math.max(-35, Math.min(35, Math.round(next.y))),
    };
    offsetRef.current = bounded;
    setOffset(bounded);
    return bounded;
  };

  const echoAt = (nextOffset: { x: number; y: number }) => {
    const local = echoRef.current;
    if (!local) return null;
    return {
      x: panelPingLayout.left + nextOffset.x + local.x * panelPingLayout.width / 100,
      y: panelPingLayout.top + nextOffset.y + local.y * panelPingLayout.height / 100,
    };
  };

  const isAligned = (nextOffset: { x: number; y: number }) => {
    const world = echoAt(nextOffset);
    return Boolean(world
      && Math.abs(world.x - panelPingSource.x) <= 6
      && Math.abs(world.y - panelPingSource.y) <= 8);
  };

  const complete = (nextOffset: { x: number; y: number }) => {
    updateOffset(nextOffset);
    setFeedback("aligned");
    setEchoVisibility("imprint");
    if (armedRef.current || solved) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const makeProbe = (clientX?: number, clientY?: number, rect?: DOMRect) => {
    if (visibleSolved) return;
    const local = rect && clientX !== undefined && clientY !== undefined
      ? {
          x: Math.max(0, Math.min(100, Math.round((clientX - rect.left) / rect.width * 100))),
          y: Math.max(0, Math.min(100, Math.round((clientY - rect.top) / rect.height * 100))),
        }
      : { x: 70, y: 35 };
    const mirrored = { x: 100 - local.x, y: 100 - local.y };
    echoRef.current = mirrored;
    setProbe(local);
    setEchoLocal(mirrored);
    setPingCount((count) => count + 1);
    setEchoVisibility("pulse");
    setFeedback("ping");
    onDiscover();
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setEchoVisibility("imprint"), 650);
  };

  const rebound = () => {
    updateOffset({ x: 0, y: 0 });
    setFeedback("rebounded");
  };

  const moveKeyboard = (x: number, y: number) => {
    const next = updateOffset({ x: offsetRef.current.x + x, y: offsetRef.current.y + y });
    if (isAligned(next)) complete(next);
    else setFeedback("drifting");
  };

  return (
    <div
      className={`${styles.panelPingScene} ${aligned ? styles.panelPingAligned : ""} ${feedback === "rebounded" ? styles.panelPingRebounded : ""}`}
      data-active-echoes={currentEcho ? 1 : 0}
      data-controller="layer-stack"
      data-edge-visibility={aligned ? "revealed" : "sliver"}
      data-echo-local={currentEcho ? panelPingPair(currentEcho) : "none"}
      data-echo-visibility={currentEcho ? echoVisibility : "none"}
      data-echo-world={echoWorld ? panelPingPair(echoWorld) : "none"}
      data-last-feedback={feedback}
      data-panel-offset={panelPingPair(effectiveOffset)}
      data-ping-count={pingCount}
      data-ping-mode="single-replacing"
      data-probe-local={probe ? panelPingPair(probe) : "none"}
      data-probed={probe ? "true" : "false"}
      data-source-world={panelPingPair(panelPingSource)}
      data-spatial-model="frosted-panel-mirrored-echo"
      data-testid="v2-scene-042"
      style={{
        "--panel-ping-x": `${effectiveOffset.x}%`,
        "--panel-ping-y": `${effectiveOffset.y}%`,
        "--panel-echo-x": `${echoWorld?.x ?? panelPingSource.x}%`,
        "--panel-echo-y": `${echoWorld?.y ?? panelPingSource.y}%`,
      } as React.CSSProperties}
    >
      <span className={styles.panelPingColorEdge} data-testid="panel-ping-color-edge" aria-hidden="true" />
      <span className={styles.panelPingSourceHalo} aria-hidden="true" />
      <button
        type="button"
        className={styles.panelPingPaper}
        aria-label={locale === "zh" ? "磨砂侧纸" : "Frosted side paper"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          drag.current = { x: event.clientX, y: event.clientY, offset: offsetRef.current, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || visibleSolved) return;
          const scene = event.currentTarget.closest<HTMLElement>("[data-testid='v2-scene-042']");
          const rect = scene?.getBoundingClientRect();
          if (!rect?.width || !rect.height) return;
          const dx = (event.clientX - start.x) / rect.width * 100;
          const dy = (event.clientY - start.y) / rect.height * 100;
          if (Math.hypot(dx, dy) > 3) start.moved = true;
          if (!start.moved) return;
          updateOffset({ x: start.offset.x + dx, y: start.offset.y + dy });
          setFeedback("drifting");
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          if (!start || visibleSolved) return;
          if (!start.moved) {
            makeProbe(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
            return;
          }
          if (isAligned(offsetRef.current)) complete(offsetRef.current);
          else rebound();
        }}
        onPointerCancel={() => { drag.current = null; rebound(); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            makeProbe();
            return;
          }
          const direction = event.key === "ArrowLeft" ? [-8, 0]
            : event.key === "ArrowRight" ? [8, 0]
              : event.key === "ArrowUp" ? [0, -8]
                : event.key === "ArrowDown" ? [0, 8]
                  : null;
          if (!direction) return;
          event.preventDefault();
          if (!echoRef.current) {
            setFeedback("rebounded");
            return;
          }
          moveKeyboard(direction[0], direction[1]);
        }}
      >
        <span className={styles.panelPingGrain} aria-hidden="true" />
        <span className={styles.panelPingClearEdge} aria-hidden="true" />
      </button>
      {currentEcho ? <span className={`${styles.panelPingEcho} ${echoVisibility === "pulse" ? styles.panelPingEchoPulse : ""}`} aria-hidden="true" /> : null}
    </div>
  );
}

function distanceToZero(point: TracePoint) {
  const normalizedX = (point.x - 50) / 27;
  const normalizedY = (point.y - 50) / 35;
  const angle = Math.atan2(normalizedY, normalizedX);
  const target = { x: 50 + Math.cos(angle) * 27, y: 50 + Math.sin(angle) * 35 };
  return Math.hypot(point.x - target.x, point.y - target.y);
}

function zeroSector(point: TracePoint) {
  const angle = Math.atan2((point.y - 50) / 35, (point.x - 50) / 27);
  return Math.floor((((angle + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 8) % 8;
}

function evaluateZeroTrace(points: readonly TracePoint[]) {
  if (points.length < 8) return false;
  const near = points.filter((point) => distanceToZero(point) <= 13);
  const sectors = new Set(near.map(zeroSector));
  const first = points[0];
  const last = points.at(-1);
  return Boolean(
    first
    && last
    && near.length / points.length >= .75
    && sectors.size >= 7
    && Math.hypot(last.x - first.x, last.y - first.y) <= 18,
  );
}

function MistZero({ locale, onDiscover, onArm }: ControllerProps) {
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [revealedSectors, setRevealedSectors] = useState<Set<number>>(new Set());
  const [traceValid, setTraceValid] = useState<"idle" | "true" | "false">("idle");
  const drawing = useRef(false);
  const pointsRef = useRef<TracePoint[]>([]);
  const keyRoute = useRef<string[]>([]);

  const revealPoint = (point: TracePoint) => {
    if (distanceToZero(point) > 13) return;
    setRevealedSectors((current) => {
      const next = new Set(current);
      next.add(zeroSector(point));
      return next;
    });
  };

  const finish = () => {
    drawing.current = false;
    if (evaluateZeroTrace(pointsRef.current)) {
      setTraceValid("true");
      setRevealedSectors(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
      onArm();
      return;
    }
    setTraceValid("false");
    window.setTimeout(() => {
      pointsRef.current = [];
      setPoints([]);
      setRevealedSectors(new Set());
    }, 260);
  };

  return (
    <div
      className={`${styles.mistZeroScene} ${traceValid === "false" ? styles.mistTraceWrong : ""}`}
      data-controller="trace"
      data-revealed-sectors={revealedSectors.size}
      data-spatial-model="concealed-zero"
      data-trace-valid={traceValid}
      data-testid="v2-scene-006"
    >
      <svg
        className={styles.mistCanvas}
        viewBox="0 0 100 100"
        role="application"
        tabIndex={0}
        aria-label={locale === "zh" ? "擦出隐藏的零形" : "Rub out the hidden zero"}
        onPointerDown={(event) => {
          drawing.current = true;
          setTraceValid("idle");
          const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          pointsRef.current = [point];
          setPoints([point]);
          setRevealedSectors(new Set());
          revealPoint(point);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          const next = [...pointsRef.current, point];
          pointsRef.current = next;
          setPoints(next);
          revealPoint(point);
          if (next.length === 3) onDiscover();
        }}
        onPointerUp={finish}
        onPointerCancel={() => { drawing.current = false; }}
        onKeyDown={(event) => {
          if (!event.key.startsWith("Arrow")) return;
          event.preventDefault();
          onDiscover();
          const expected = ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"];
          const next = [...keyRoute.current, event.key].slice(-expected.length);
          keyRoute.current = next;
          setRevealedSectors(new Set(Array.from({ length: Math.min(8, next.length * 2) }, (_, index) => index)));
          if (next.join("|") === expected.join("|")) {
            setTraceValid("true");
            setRevealedSectors(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
            onArm();
          }
        }}
      >
        <rect className={styles.mistPaper} x="3" y="3" width="94" height="94" rx="18" />
        <ellipse className={styles.mistZeroGhost} cx="50" cy="50" rx="27" ry="35" pathLength="8" style={{ "--revealed": revealedSectors.size } as React.CSSProperties} />
        <polyline className={styles.mistScratch} points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />
      </svg>
    </div>
  );
}

function CornerZigzag({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type Edge = "top" | "right" | "bottom" | "left";
  const edges: Edge[] = ["top", "right", "bottom", "left"];
  const corners = ["top-left", "top-right", "bottom-right", "bottom-left", "top-left"];
  const positions = [{ x: 18, y: 18 }, { x: 82, y: 18 }, { x: 82, y: 82 }, { x: 18, y: 82 }, { x: 18, y: 18 }];
  const [stage, setStage] = useState(solved ? 4 : 0);
  const [lastEdge, setLastEdge] = useState("none");
  const [inputMode, setInputMode] = useState<"none" | "pointer-edge" | "keyboard-edge">("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; moved: boolean } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const attempt = (edge: Edge, mode: "pointer-edge" | "keyboard-edge") => {
    if (solved || completed) return;
    setInputMode(mode);
    if (edge !== edges[stage]) {
      setLastEdge(`${edge}-rejected`);
      return;
    }
    discover();
    const next = stage + 1;
    setStage(next);
    setLastEdge(`${edge}-kept`);
    if (next === 4 && !armedRef.current) {
      armedRef.current = true;
      setCompleted(true);
      onArm();
    }
  };
  const edgeAt = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    const x = (clientX - rect.left) / rect.width * 100;
    const y = (clientY - rect.top) / rect.height * 100;
    const touched: Edge[] = [];
    if (y <= 7) touched.push("top");
    if (x >= 93) touched.push("right");
    if (y >= 93) touched.push("bottom");
    if (x <= 7) touched.push("left");
    return touched.includes(edges[stage]) ? edges[stage] : touched[0] ?? null;
  };
  const visibleStage = solved ? 4 : stage;
  const head = positions[visibleStage];

  return (
    <div
      ref={sceneRef}
      className={styles.cornerZigzagScene}
      data-active-corner={corners[visibleStage]}
      data-controller="trace"
      data-cut-orientation="clockwise-forward-slash"
      data-input-mode={inputMode}
      data-kept-segments={visibleStage}
      data-last-edge={lastEdge}
      data-route-stage={visibleStage}
      data-route-state={visibleStage === 4 ? "closed" : "broken"}
      data-spatial-model="four-corner-cuts-turn-one-broken-zigzag"
      data-testid="v2-scene-063"
      style={{ "--zigzag-head-x": `${head.x}%`, "--zigzag-head-y": `${head.y}%` } as React.CSSProperties}
    >
      <span className={styles.cornerZigzagPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.cornerZigzagCuts} aria-hidden="true">
        {corners.slice(0, 4).map((corner, index) => <i key={corner} data-corner={corner} data-testid={`corner-zigzag-cut-${index}`} />)}
      </span>
      <svg className={styles.cornerZigzagSeams} viewBox="0 0 100 100" aria-hidden="true">
        {[
          "M18 18 L82 18", "M82 18 L82 82", "M82 82 L18 82", "M18 82 L18 18",
        ].map((path, index) => <path key={path} d={path} data-kept={visibleStage > index ? "true" : "false"} data-testid={`corner-zigzag-segment-${index}`} />)}
      </svg>
      <button
        type="button"
        className={styles.cornerZigzagHead}
        aria-label={locale === "zh" ? "折线活动端" : "Loose zigzag end"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleStage === 4) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 12) drag.moved = true;
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || !drag.moved) return;
          const edge = edgeAt(event.clientX, event.clientY);
          if (edge) attempt(edge, "pointer-edge");
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          const edge = event.key === "ArrowUp" ? "top"
            : event.key === "ArrowRight" ? "right"
              : event.key === "ArrowDown" ? "bottom"
                : event.key === "ArrowLeft" ? "left"
                  : null;
          if (!edge) return;
          event.preventDefault();
          attempt(edge, "keyboard-edge");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
    </div>
  );
}

function ArchiveFigureEight({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type Lobe = "left" | "right";
  type InputMode = "none" | "continuous-ink" | "keyboard-pen";
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [retainedLobes, setRetainedLobes] = useState<Lobe[]>([]);
  const [leftClosed, setLeftClosed] = useState(solved);
  const [rightClosed, setRightClosed] = useState(solved);
  const [crossings, setCrossings] = useState(solved ? 2 : 0);
  const [strokeState, setStrokeState] = useState<"idle" | "drawing" | "broken" | "sealed">(solved ? "sealed" : "idle");
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const drawingRef = useRef(false);
  const pointsRef = useRef<TracePoint[]>([]);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const keyboardPenRef = useRef(false);
  const keyboardLobesRef = useRef<Set<Lobe>>(new Set());

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = () => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    setLeftClosed(true);
    setRightClosed(true);
    setCrossings(2);
    setStrokeState("sealed");
    onArm();
  };
  const zone = ({ x }: TracePoint) => x < 42 ? "left" : x > 58 ? "right" : "center";
  const compressedZones = (trace: TracePoint[]) => trace.reduce<Array<Lobe | "center">>((zones, point) => {
    const next = zone(point);
    if (zones.at(-1) !== next) zones.push(next);
    return zones;
  }, []);
  const lobeEvidence = (trace: TracePoint[], lobe: Lobe, zones: Array<Lobe | "center">) => {
    const sidePoints = trace.filter((point) => zone(point) === lobe);
    const verticalSpan = sidePoints.length ? Math.max(...sidePoints.map(({ y }) => y)) - Math.min(...sidePoints.map(({ y }) => y)) : 0;
    const route = zones.join(",");
    return verticalSpan >= 34 && (route.includes(`center,${lobe},center`) || route.includes(`${lobe},center,${lobe}`));
  };
  const finish = () => {
    drawingRef.current = false;
    const trace = pointsRef.current;
    const zones = compressedZones(trace);
    const left = lobeEvidence(trace, "left", zones);
    const right = lobeEvidence(trace, "right", zones);
    const route = zones.join(",");
    const topology = route.includes("center,left,center,right,center")
      || route.includes("center,right,center,left,center")
      || route.includes("left,center,right,center,left")
      || route.includes("right,center,left,center,right");
    const endpointDistance = trace.length ? Math.hypot((trace.at(-1)?.x ?? 0) - trace[0].x, (trace.at(-1)?.y ?? 0) - trace[0].y) : Number.POSITIVE_INFINITY;
    if (left && right && topology && endpointDistance <= 18) {
      complete();
      return;
    }
    setCrossings(0);
    setStrokeState("broken");
    setRetainedLobes((current) => {
      const next = new Set(current);
      if (left) next.add("left");
      if (right) next.add("right");
      return [...next];
    });
    pointsRef.current = [];
    setPoints([]);
  };
  const keyboardLobe = (lobe: Lobe) => {
    if (!keyboardPenRef.current || armedRef.current || solved) return;
    discover();
    setInputMode("keyboard-pen");
    keyboardLobesRef.current.add(lobe);
    if (lobe === "left") setLeftClosed(true); else setRightClosed(true);
    setCrossings(keyboardLobesRef.current.size);
    setStrokeState("drawing");
    if (keyboardLobesRef.current.size === 2) complete();
  };
  const visibleSolved = solved || strokeState === "sealed";
  const retained = retainedLobes.join(",") || "none";

  return (
    <div
      className={styles.archiveEightScene}
      data-controller="trace"
      data-crossings={visibleSolved ? 2 : crossings}
      data-input-mode={inputMode}
      data-left-lobe={visibleSolved || leftClosed ? "closed" : retainedLobes.includes("left") ? "fading" : "open"}
      data-retained-lobes={retained}
      data-right-lobe={visibleSolved || rightClosed ? "closed" : retainedLobes.includes("right") ? "fading" : "open"}
      data-spatial-model="two-broken-stamp-lobes-one-crossing"
      data-stroke-state={visibleSolved ? "sealed" : strokeState}
      data-testid="v2-scene-069"
    >
      <span className={styles.archiveEightPaper} aria-hidden="true"><i /><b /></span>
      <svg
        className={styles.archiveEightCanvas}
        data-testid="archive-eight-canvas-069"
        viewBox="0 0 100 100"
        role="application"
        tabIndex={0}
        aria-label={locale === "zh" ? "共享中心的双瓣档案印" : "Two archive stamp lobes sharing one center"}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          drawingRef.current = true;
          pointsRef.current = [point];
          setPoints([point]);
          setInputMode("continuous-ink");
          setStrokeState("drawing");
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current || visibleSolved) return;
          const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          const next = [...pointsRef.current, point];
          pointsRef.current = next;
          setPoints(next);
          if (next.length === 3) discover();
        }}
        onPointerUp={finish}
        onPointerCancel={() => { drawingRef.current = false; setStrokeState("broken"); }}
        onKeyDown={(event) => {
          if (event.key === " ") {
            event.preventDefault();
            keyboardPenRef.current = true;
            setInputMode("keyboard-pen");
            setStrokeState("drawing");
            return;
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            keyboardLobe(event.key === "ArrowLeft" ? "left" : "right");
          }
        }}
      >
        <path className={styles.archiveEightLobe} data-break={visibleSolved ? "sealed" : "open"} data-testid="archive-eight-left-lobe" d="M50 50 C36 23 18 17 10 42 C3 65 26 82 50 50" />
        <path className={styles.archiveEightLobe} data-break={visibleSolved ? "sealed" : "open"} data-testid="archive-eight-right-lobe" d="M50 50 C64 23 82 17 90 42 C97 65 74 82 50 50" />
        <circle className={styles.archiveEightCrossing} data-shared="true" data-testid="archive-eight-crossing" cx="50" cy="50" r="5" />
        {retainedLobes.includes("left") && !visibleSolved ? <path className={styles.archiveEightRetained} d="M50 50 C36 23 18 17 10 42 C3 65 26 82 50 50" /> : null}
        {retainedLobes.includes("right") && !visibleSolved ? <path className={styles.archiveEightRetained} d="M50 50 C64 23 82 17 90 42 C97 65 74 82 50 50" /> : null}
        <polyline className={styles.archiveEightInk} points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />
      </svg>
    </div>
  );
}

function GenericTraceController({ level, locale, onDiscover, onArm }: ControllerProps) {
  const [points, setPoints] = useState<TracePoint[]>([]);
  const drawing = useRef(false);
  const pointsRef = useRef<TracePoint[]>([]);
  const keyRoute = useRef<string[]>([]);
  const finish = () => {
    drawing.current = false;
    const xs = pointsRef.current.map(({ x }) => x);
    const ys = pointsRef.current.map(({ y }) => y);
    const spanX = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    const spanY = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
    const endpointDistance = pointsRef.current.length ? Math.hypot((pointsRef.current.at(-1)?.x ?? 0) - pointsRef.current[0].x, (pointsRef.current.at(-1)?.y ?? 0) - pointsRef.current[0].y) : 0;
    const valid = level.id === 6
        ? pointsRef.current.length >= 8 && spanX > 40 && spanY > 40 && endpointDistance < 26
        : pointsRef.current.length >= 6 && endpointDistance > 45;
    if (valid) onArm(); else window.setTimeout(() => { pointsRef.current = []; setPoints([]); }, 260);
  };
  return <svg className={styles.traceBoard} viewBox="0 0 100 100" role="application" tabIndex={0} aria-label={locale === "zh" ? "画出一条连续路线" : "Draw one continuous route"} data-controller="trace"
    onPointerDown={(event) => { drawing.current = true; const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()); pointsRef.current = [point]; setPoints([point]); event.currentTarget.setPointerCapture?.(event.pointerId); }}
    onPointerMove={(event) => { if (!drawing.current) return; const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()); const next = [...pointsRef.current, point]; pointsRef.current = next; setPoints(next); if (next.length === 3) onDiscover(); }}
    onPointerUp={finish}
    onKeyDown={(event) => {
      if (!event.key.startsWith("Arrow")) return;
      event.preventDefault(); onDiscover();
      keyRoute.current = [...keyRoute.current, event.key].slice(-4);
      const expected = level.id === 6
        ? ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"]
        : ["ArrowRight", "ArrowDown", "ArrowRight"];
      if (keyRoute.current.slice(-expected.length).join("|") === expected.join("|")) onArm();
    }}
  ><path d="M8 70 C25 15 42 85 58 28 S80 68 94 20" /><polyline points={points.map(({ x, y }) => `${x},${y}`).join(" ")} /></svg>;
}

const tenThousandPoints = [
  { x: 28, y: 58 },
  { x: 35, y: 28 },
  { x: 62, y: 20 },
  { x: 78, y: 52 },
  { x: 58, y: 76 },
] as const;

function TenThousandGlyph({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [routeProgress, setRouteProgress] = useState(0);
  const [inkedPoints, setInkedPoints] = useState<number[]>([]);
  const [tracePoints, setTracePoints] = useState<TracePoint[]>([]);
  const [breaks, setBreaks] = useState(0);
  const [inputMode, setInputMode] = useState<"none" | "page-trace" | "keyboard-track">("none");
  const [completed, setCompleted] = useState(false);
  const drawingRef = useRef(false);
  const lastIndexRef = useRef(-1);
  const pointsRef = useRef<TracePoint[]>([]);
  const armedRef = useRef(false);

  const resetTrace = (countBreak = true) => {
    if (armedRef.current || solved) return;
    drawingRef.current = false;
    lastIndexRef.current = -1;
    pointsRef.current = [];
    setTracePoints([]);
    setRouteProgress(0);
    setInkedPoints([]);
    if (countBreak) setBreaks((count) => count + 1);
  };

  const complete = () => {
    if (armedRef.current || solved) return;
    armedRef.current = true;
    drawingRef.current = false;
    setCompleted(true);
    setRouteProgress(5);
    setInkedPoints([0, 1, 2, 3, 4]);
    onArm();
  };

  const nearestIndex = (point: TracePoint) => {
    let nearest = -1;
    let distance = Number.POSITIVE_INFINITY;
    tenThousandPoints.forEach((target, index) => {
      const next = Math.hypot(point.x - target.x, point.y - target.y);
      if (next <= 16 && next < distance) {
        nearest = index;
        distance = next;
      }
    });
    return nearest;
  };

  const begin = (point: TracePoint) => {
    if (armedRef.current || solved) return;
    const index = nearestIndex(point);
    if (index !== 0) {
      resetTrace();
      return;
    }
    drawingRef.current = true;
    lastIndexRef.current = 0;
    pointsRef.current = [point];
    setTracePoints([point]);
    setInkedPoints([0]);
    setRouteProgress(1);
    setInputMode("page-trace");
  };

  const move = (point: TracePoint) => {
    if (!drawingRef.current || armedRef.current || solved) return;
    const nextPoints = [...pointsRef.current, point];
    pointsRef.current = nextPoints;
    setTracePoints(nextPoints);
    const index = nearestIndex(point);
    if (index < 0 || index === lastIndexRef.current) return;
    const expected = lastIndexRef.current === 4 ? 0 : lastIndexRef.current + 1;
    if (index !== expected) {
      resetTrace();
      return;
    }
    if (lastIndexRef.current === 4 && index === 0) {
      complete();
      return;
    }
    lastIndexRef.current = index;
    setRouteProgress(index + 1);
    setInkedPoints((current) => current.includes(index) ? current : [...current, index]);
    if (index === 1) onDiscover();
  };

  const keyboardStep = () => {
    if (armedRef.current || solved) return;
    setInputMode("keyboard-track");
    if (lastIndexRef.current < 0) {
      lastIndexRef.current = 1;
      setRouteProgress(2);
      setInkedPoints([0, 1]);
      onDiscover();
      return;
    }
    if (lastIndexRef.current === 4) {
      complete();
      return;
    }
    const next = lastIndexRef.current + 1;
    lastIndexRef.current = next;
    setRouteProgress(next + 1);
    setInkedPoints((current) => current.includes(next) ? current : [...current, next]);
  };

  const visibleSolved = solved || completed;
  return (
    <div
      className={styles.tenThousandScene}
      data-breaks={breaks}
      data-camera-route="optional"
      data-closed={visibleSolved ? "true" : "false"}
      data-controller="trace"
      data-inked-points={inkedPoints.length ? inkedPoints.join(",") : "none"}
      data-input-mode={inputMode}
      data-point-count="5"
      data-route-progress={visibleSolved ? 5 : routeProgress}
      data-spatial-model="five-engraved-points-open-loop"
      data-testid="v2-scene-049"
      data-tolerance="16"
    >
      <svg
        className={styles.tenThousandCanvas}
        viewBox="0 0 100 100"
        role="application"
        tabIndex={0}
        aria-label={locale === "zh" ? "五点纸纤维" : "Five-point paper fiber"}
        onPointerDown={(event) => {
          const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          begin(point);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current) return;
          move(pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()));
        }}
        onPointerUp={() => {
          if (drawingRef.current && !armedRef.current) resetTrace();
        }}
        onPointerCancel={() => resetTrace()}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            keyboardStep();
          } else if (event.key.startsWith("Arrow")) {
            event.preventDefault();
            resetTrace();
            setInputMode("keyboard-track");
          }
        }}
      >
        <rect className={styles.tenThousandPaper} x="2" y="2" width="96" height="96" rx="12" />
        {tenThousandPoints.map((point, index) => {
          const next = tenThousandPoints[(index + 1) % tenThousandPoints.length];
          return <line key={`fiber-${index}`} className={styles.tenThousandFiber} data-lit={visibleSolved || routeProgress > index + 1 ? "true" : "false"} x1={point.x} y1={point.y} x2={next.x} y2={next.y} />;
        })}
        {tenThousandPoints.map((point, index) => <circle
          key={index}
          className={styles.tenThousandPoint}
          data-inked={visibleSolved || inkedPoints.includes(index) ? "true" : "false"}
          data-testid={`ten-thousand-point-${index}`}
          cx={point.x}
          cy={point.y}
          r="1.25"
        />)}
        <polyline className={styles.tenThousandInk} points={tracePoints.map(({ x, y }) => `${x},${y}`).join(" ")} />
      </svg>
    </div>
  );
}

function TraceController(props: ControllerProps) {
  return props.level.id === 6
    ? <MistZero {...props} />
    : props.level.id === 49
      ? <TenThousandGlyph {...props} />
      : props.level.id === 63
        ? <CornerZigzag {...props} />
        : props.level.id === 69
          ? <ArchiveFigureEight {...props} />
          : <GenericTraceController {...props} />;
}

function Constellation({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type ClusterSide = "left" | "right";
  type InputMode = "idle" | "pointer-clusters" | "keyboard-clusters" | "pointer-v-trace" | "keyboard-v-hold";
  const route = [{ x: 20, y: 18 }, { x: 50, y: 80 }, { x: 80, y: 18 }];
  const [gathered, setGathered] = useState({ left: false, right: false });
  const [clusterOffsets, setClusterOffsets] = useState({ left: 0, right: 0 });
  const [tracePoints, setTracePoints] = useState<TracePoint[]>([]);
  const [traceProgress, setTraceProgress] = useState(0);
  const [keyboardStars, setKeyboardStars] = useState<number[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const clusterDrag = useRef<{ pointerId: number; side: ClusterSide; x: number } | null>(null);
  const traceRef = useRef<{ pointerId: number; progress: number; pathLength: number; last: TracePoint } | null>(null);
  const keyboardStarsRef = useRef<number[]>([]);
  const holdTimer = useRef<number | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const visibleGathered = visibleSolved ? { left: true, right: true } : gathered;
  const gatheredCount = Number(visibleGathered.left) + Number(visibleGathered.right);
  const negativeSpace = gatheredCount === 2 ? "open-v" : gatheredCount === 1 ? "half-open" : "closed";

  useEffect(() => () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
  }, []);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = (mode: "pointer-v-trace" | "keyboard-v-hold") => {
    if (armedRef.current) return;
    armedRef.current = true;
    setInputMode(mode);
    setTraceProgress(3);
    setCompleted(true);
    onArm();
  };
  const gather = (side: ClusterSide, mode: "pointer-clusters" | "keyboard-clusters") => {
    if (visibleSolved || gathered[side]) return;
    discover();
    setInputMode(mode);
    setClusterOffsets((current) => ({ ...current, [side]: 0 }));
    setGathered((current) => ({ ...current, [side]: true }));
  };
  const pointInTrace = (clientX: number, clientY: number, rect: DOMRect): TracePoint => {
    if (!rect.width || !rect.height) return { x: clientX, y: clientY };
    return { x: (clientX - rect.left) / rect.width * 100, y: (clientY - rect.top) / rect.height * 100 };
  };
  const near = (point: TracePoint, target: TracePoint) => Math.hypot(point.x - target.x, point.y - target.y) <= 16;

  return (
    <div
      className={styles.silentConstellationScene}
      data-camera-route="optional"
      data-color-only="false"
      data-controller="constellation"
      data-flashing="false"
      data-gathered-clusters={gatheredCount}
      data-input-mode={inputMode}
      data-keyboard-stars={keyboardStars.join(",")}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-negative-space={negativeSpace}
      data-spatial-model="two-three-star-clusters-gathered-to-reveal-a-negative-space-v-then-traced-through-three-structural-stars"
      data-testid="v2-scene-100"
      data-trace-progress={visibleSolved ? 3 : traceProgress}
      data-trace-state={visibleSolved ? "complete-v" : traceProgress > 0 ? "forming" : "idle"}
    >
      <span className={styles.silentSkyPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.silentNegativeWing} data-side="left" aria-hidden="true" />
      <span className={styles.silentNegativeWing} data-side="right" aria-hidden="true" />
      {(["left", "right"] as const).map((side) => (
        <button
          type="button"
          aria-label={locale === "zh" ? `${side === "left" ? "左" : "右"}侧三星纸群` : `${side} three-star paper cluster`}
          className={styles.silentStarCluster}
          data-gathered={visibleGathered[side] ? "true" : "false"}
          data-side={side}
          data-testid={`constellation-${side}-cluster`}
          key={side}
          onClick={() => undefined}
          onPointerDown={(event) => {
            if (visibleSolved || gathered[side]) return;
            clusterDrag.current = { pointerId: event.pointerId, side, x: event.clientX };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const drag = clusterDrag.current;
            if (!drag || drag.pointerId !== event.pointerId || drag.side !== side || visibleSolved) return;
            const dx = event.clientX - drag.x;
            setClusterOffsets((current) => ({ ...current, [side]: Math.max(-78, Math.min(78, dx)) }));
            if (Math.abs(dx) > 10) discover();
          }}
          onPointerUp={(event) => {
            const drag = clusterDrag.current;
            clusterDrag.current = null;
            if (!drag || drag.pointerId !== event.pointerId || drag.side !== side || visibleSolved) return;
            const dx = event.clientX - drag.x;
            if ((side === "left" && dx >= 55) || (side === "right" && dx <= -55)) gather(side, "pointer-clusters");
            else setClusterOffsets((current) => ({ ...current, [side]: 0 }));
          }}
          onPointerCancel={() => {
            clusterDrag.current = null;
            setClusterOffsets((current) => ({ ...current, [side]: 0 }));
          }}
          onKeyDown={(event) => {
            if ((side === "left" && event.key !== "ArrowRight") || (side === "right" && event.key !== "ArrowLeft")) return;
            event.preventDefault();
            gather(side, "keyboard-clusters");
          }}
          style={{ "--silent-cluster-offset": `${visibleGathered[side] ? (side === "left" ? 58 : -58) : clusterOffsets[side]}px` } as React.CSSProperties}
        >
          {[0, 1, 2].map((star) => <i data-testid={`constellation-star-${side === "left" ? star : star + 3}`} key={star}><b /></i>)}
        </button>
      ))}
      {gatheredCount === 2 ? (
        <div
          className={styles.silentTraceField}
          data-testid="constellation-trace"
          role="application"
          tabIndex={0}
          aria-label={locale === "zh" ? "星群之间的空白轨迹" : "Empty route between the star groups"}
          onPointerDown={(event) => {
            if (visibleSolved) return;
            const point = pointInTrace(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
            const progress = near(point, route[0]) ? 1 : 0;
            traceRef.current = { pointerId: event.pointerId, progress, pathLength: 0, last: point };
            setTraceProgress(progress);
            setTracePoints([point]);
            setInputMode("pointer-v-trace");
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const trace = traceRef.current;
            if (!trace || trace.pointerId !== event.pointerId || visibleSolved) return;
            const point = pointInTrace(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
            trace.pathLength += Math.hypot(point.x - trace.last.x, point.y - trace.last.y);
            trace.last = point;
            if (trace.progress > 0 && trace.progress < 3 && near(point, route[trace.progress])) trace.progress += 1;
            setTraceProgress(trace.progress);
            setTracePoints((current) => [...current, point]);
          }}
          onPointerUp={(event) => {
            const trace = traceRef.current;
            traceRef.current = null;
            if (!trace || trace.pointerId !== event.pointerId || visibleSolved) return;
            if (trace.progress === 3 && trace.pathLength >= 105) complete("pointer-v-trace");
            else {
              setTraceProgress(0);
              setTracePoints([]);
            }
          }}
          onPointerCancel={() => {
            traceRef.current = null;
            setTraceProgress(0);
            setTracePoints([]);
          }}
          onKeyDown={(event) => {
            if (event.key.toLowerCase() !== "v" || event.repeat || visibleSolved || keyboardStarsRef.current.join(",") !== "0,1,2") return;
            event.preventDefault();
            setInputMode("keyboard-v-hold");
            if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
            holdTimer.current = window.setTimeout(() => {
              holdTimer.current = null;
              complete("keyboard-v-hold");
            }, 700);
          }}
          onKeyUp={(event) => {
            if (event.key.toLowerCase() !== "v" || holdTimer.current === null) return;
            window.clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true"><polyline points={tracePoints.map(({ x, y }) => `${x},${y}`).join(" ")} /></svg>
          {route.map((point, index) => (
            <button
              type="button"
              aria-label={locale === "zh" ? `结构星 ${index + 1}` : `Structural star ${index + 1}`}
              className={styles.silentRouteStar}
              data-selected={keyboardStars.includes(index) ? "true" : "false"}
              data-testid={`constellation-route-star-${index}`}
              key={index}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                const current = keyboardStarsRef.current;
                const next = index === current.length ? [...current, index] : [];
                keyboardStarsRef.current = next;
                setKeyboardStars(next);
              }}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            ><i aria-hidden="true" /></button>
          ))}
        </div>
      ) : null}
      <span className={styles.silentConstellationSeal} aria-hidden="true" />
    </div>
  );
}

function PressureSingularity({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "none" | "pointer-radial" | "keyboard-radial" | "center-press";
  const [loosenedLayers, setLoosenedLayers] = useState(solved ? 3 : 0);
  const loosenedRef = useRef(solved ? 3 : 0);
  const [pullDistance, setPullDistance] = useState(solved ? 72 : 0);
  const [centerPresses, setCenterPresses] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    unitX: number;
    unitY: number;
    distance: number;
  } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const layersAt = (distance: number) => distance >= 64 ? 3 : distance >= 42 ? 2 : distance >= 20 ? 1 : 0;
  const complete = (mode: Exclude<InputMode, "none" | "center-press">) => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    loosenedRef.current = 3;
    setLoosenedLayers(3);
    setPullDistance(72);
    setInputMode(mode);
    setCompleted(true);
    onArm();
  };
  const exposeLayers = (distance: number, mode: "pointer-radial" | "keyboard-radial") => {
    const nextLayers = Math.max(loosenedRef.current, layersAt(distance));
    loosenedRef.current = nextLayers;
    setLoosenedLayers(nextLayers);
    setPullDistance((current) => Math.max(current, Math.min(72, distance)));
    setInputMode(mode);
    if (nextLayers > 0) discover();
  };

  const visibleSolved = solved || completed;
  const visibleLayers = visibleSolved ? 3 : loosenedLayers;
  const centerState = visibleSolved ? "open" : centerPresses > 0 ? "tighter" : "compressed";

  return (
    <div
      ref={sceneRef}
      className={styles.singularityScene}
      data-center-presses={centerPresses}
      data-center-state={centerState}
      data-controller="orbit"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-loosened-layers={visibleLayers}
      data-spatial-model="compressed-concentric-paper-rings-outer-fibers-and-released-center"
      data-tension-state={visibleSolved ? "released" : visibleLayers > 0 ? "loosening" : "tight"}
      data-testid="v2-scene-080"
      style={{ "--singularity-pull": `${visibleSolved ? 72 : pullDistance}px` } as React.CSSProperties}
    >
      <span className={styles.singularityPaper} aria-hidden="true"><i /><b /></span>
      <div className={styles.singularityFibers} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <i data-testid={`singularity-fiber-${index}`} key={index} style={{ "--singularity-fiber": index } as React.CSSProperties} />
        ))}
      </div>
      <div className={styles.singularityRings}>
        {[11.5, 8.8, 6.2, 3.9].map((size, index) => (
          <button
            type="button"
            aria-label={locale === "zh" ? `纸环 ${index + 1}` : `Paper ring ${index + 1}`}
            className={styles.singularityRing}
            data-loose={index > 0 && visibleLayers >= 4 - index ? "true" : "false"}
            data-outer={index === 0 ? "true" : "false"}
            data-testid={`singularity-ring-${index}`}
            key={index}
            onClick={() => undefined}
            onPointerDown={index === 0 ? (event) => {
              if (visibleSolved) return;
              const rect = sceneRef.current?.getBoundingClientRect();
              const centerX = rect && rect.width > 0 ? rect.left + rect.width / 2 : event.clientX - 1;
              const centerY = rect && rect.height > 0 ? rect.top + rect.height / 2 : event.clientY;
              const vectorX = event.clientX - centerX;
              const vectorY = event.clientY - centerY;
              const length = Math.hypot(vectorX, vectorY) || 1;
              dragRef.current = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                unitX: vectorX / length,
                unitY: vectorY / length,
                distance: 0,
              };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            } : undefined}
            onPointerMove={index === 0 ? (event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
              const distance = Math.max(0, (event.clientX - drag.x) * drag.unitX + (event.clientY - drag.y) * drag.unitY);
              drag.distance = distance;
              exposeLayers(distance, "pointer-radial");
            } : undefined}
            onPointerUp={index === 0 ? (event) => {
              const drag = dragRef.current;
              dragRef.current = null;
              if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
              if (drag.distance >= 64) complete("pointer-radial");
            } : undefined}
            onPointerCancel={index === 0 ? () => { dragRef.current = null; } : undefined}
            onKeyDown={index === 0 ? (event) => {
              if (!event.key.startsWith("Arrow") || visibleSolved) return;
              event.preventDefault();
              const nextLayers = Math.min(3, loosenedRef.current + 1);
              const distance = nextLayers === 3 ? 64 : nextLayers === 2 ? 42 : 20;
              exposeLayers(distance, "keyboard-radial");
              if (nextLayers === 3) complete("keyboard-radial");
            } : undefined}
            style={{ width: `${size}rem`, height: `${size}rem`, zIndex: 4 + index } as React.CSSProperties}
          ><span aria-hidden="true"><i /><b /></span></button>
        ))}
      </div>
      <button
        type="button"
        className={styles.singularityCenter}
        data-testid="singularity-center"
        aria-label={locale === "zh" ? "受压的纸面中心" : "Compressed paper center"}
        onClick={() => {
          if (visibleSolved) return;
          discover();
          setInputMode("center-press");
          setCenterPresses((count) => count + 1);
        }}
      ><span aria-hidden="true" /></button>
      <span className={styles.singularitySeal} aria-hidden="true" />
    </div>
  );
}

function PointerMajority({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type Candidate = "none" | "between" | "minority" | "majority";
  type InputMode = "none" | "pointer-drag" | "keyboard-pointer";
  const [visited, setVisited] = useState<Candidate>(solved ? "majority" : "none");
  const [visitCount, setVisitCount] = useState(0);
  const [position, setPosition] = useState({ x: 52, y: 76 });
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const majorityPoint = { x: 30, y: 62 };
  const minorityPoint = { x: 74, y: 36 };

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const complete = (mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    armedRef.current = true;
    setPosition(majorityPoint);
    setVisited("majority");
    setInputMode(mode);
    setCompleted(true);
    onArm();
  };
  const choose = (candidate: Exclude<Candidate, "none">, mode: Exclude<InputMode, "none">) => {
    if (solved || armedRef.current) return;
    discover();
    setInputMode(mode);
    setVisited(candidate);
    if (candidate === "minority") {
      setPosition(minorityPoint);
      setVisitCount((count) => count + 1);
      return;
    }
    if (candidate === "majority") {
      complete(mode);
      return;
    }
  };
  const pointFromEvent = (clientX: number, clientY: number) => {
    const rect = sceneRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height) return null;
    return {
      x: Math.max(6, Math.min(94, (clientX - rect.left) / rect.width * 100)),
      y: Math.max(8, Math.min(92, (clientY - rect.top) / rect.height * 100)),
    };
  };
  const candidateAt = (clientX: number, clientY: number): Exclude<Candidate, "none"> => {
    const point = pointFromEvent(clientX, clientY);
    if (point) {
      if (Math.hypot(point.x - majorityPoint.x, point.y - majorityPoint.y) <= 17) return "majority";
      if (Math.hypot(point.x - minorityPoint.x, point.y - minorityPoint.y) <= 17) return "minority";
      return "between";
    }
    const drag = dragRef.current;
    if (!drag) return "between";
    const dx = clientX - drag.x;
    const dy = clientY - drag.y;
    if (dx <= -45 && Math.abs(dy) <= 60) return "majority";
    if (dx >= 45 && dy <= -15) return "minority";
    return "between";
  };

  const visibleSolved = solved || completed;
  const visibleVisited = visibleSolved ? "majority" : visited;
  const shortened = visibleVisited === "majority" ? "110" : visibleVisited === "minority" ? "001" : "000";

  return (
    <div
      ref={sceneRef}
      className={styles.pointerMajorityScene}
      data-controller="shared-control"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-merge-state={visibleSolved ? "merged" : "separate"}
      data-shortened-shadows={shortened}
      data-spatial-model="one-solid-pointer-three-arrow-shadows-two-candidate-wells"
      data-testid="v2-scene-082"
      data-visit-count={visitCount}
      data-visited={visibleVisited}
      style={{ "--majority-pointer-x": `${position.x}%`, "--majority-pointer-y": `${position.y}%` } as React.CSSProperties}
    >
      <span className={styles.pointerMajorityPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.pointerMajorityShadows} aria-hidden="true">
        {["majority", "majority", "minority"].map((target, index) => (
          <i data-shortened={shortened[index] === "1" ? "true" : "false"} data-target={target} data-testid={`majority-shadow-${index}`} key={index}><b /></i>
        ))}
      </span>
      {[majorityPoint, minorityPoint].map((point, index) => (
        <button
          type="button"
          className={styles.pointerMajorityWell}
          data-testid={`majority-well-${index}`}
          key={index}
          aria-label={locale === "zh" ? `浅纸窝 ${index + 1}` : `Shallow paper well ${index + 1}`}
          onClick={() => undefined}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        ><span aria-hidden="true" /></button>
      ))}
      <button
        type="button"
        className={styles.pointerMajoritySolid}
        data-testid="majority-pointer"
        aria-label={locale === "zh" ? "实心纸指针" : "Solid paper pointer"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) discover();
          const point = pointFromEvent(event.clientX, event.clientY);
          if (point) setPosition(point);
          const candidate = candidateAt(event.clientX, event.clientY);
          setVisited(candidate);
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const candidate = candidateAt(event.clientX, event.clientY);
          dragRef.current = null;
          choose(candidate, "pointer-drag");
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          choose(event.key === "ArrowLeft" ? "majority" : "minority", "keyboard-pointer");
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.pointerMajoritySeal} aria-hidden="true" />
    </div>
  );
}

function ArchiveLabyrinth({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "idle" | "pointer-map" | "keyboard-map";
  const target = { x: 68, y: 40 };
  const [position, setPosition] = useState({ x: 20, y: 72 });
  const positionRef = useRef({ x: 20, y: 72 });
  const [visibleSegments, setVisibleSegments] = useState(0);
  const [routeState, setRouteState] = useState<"hidden" | "dead-end" | "connected">("hidden");
  const [openedCells, setOpenedCells] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; start: { x: number; y: number } } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const assess = (next: { x: number; y: number }, mode: Exclude<InputMode, "idle">, settle: boolean) => {
    if (visibleSolved || armedRef.current) return;
    const bounded = { x: Math.max(12, Math.min(84, next.x)), y: Math.max(18, Math.min(82, next.y)) };
    positionRef.current = bounded;
    setPosition(bounded);
    setInputMode(mode);
    discover();
    const distance = Math.hypot(bounded.x - target.x, bounded.y - target.y);
    const segments = distance <= 10 ? 3 : distance <= 24 ? 2 : bounded.x >= 34 && bounded.y <= 72 ? 1 : 0;
    setVisibleSegments(segments);
    setRouteState(segments === 3 ? "connected" : segments > 0 ? "dead-end" : "hidden");
    if (!settle || segments !== 3) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const cellPositions = [
    { x: 12, y: 20 }, { x: 42, y: 14 }, { x: 78, y: 23 },
    { x: 18, y: 72 }, { x: 52, y: 78 }, { x: 86, y: 66 },
  ];

  return (
    <div
      ref={sceneRef}
      className={styles.archiveLabyrinthScene}
      data-controller="shared-control"
      data-date-dependency="none"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-map-position={`${Math.round(position.x)},${Math.round(position.y)}`}
      data-opened-cells={openedCells}
      data-route-state={visibleSolved ? "connected" : routeState}
      data-spatial-model="scattered-archive-textures-one-transparent-map-window-and-three-route-segments"
      data-testid="v2-scene-090"
      data-visible-segments={visibleSolved ? 3 : visibleSegments}
      style={{ "--labyrinth-map-x": `${position.x}%`, "--labyrinth-map-y": `${position.y}%` } as React.CSSProperties}
    >
      <span className={styles.archiveLabyrinthPaper} aria-hidden="true"><i /><b /></span>
      {cellPositions.map((cell, index) => (
        <button
          type="button"
          className={styles.labyrinthCell}
          data-testid={`labyrinth-cell-${index}`}
          key={index}
          aria-label={locale === "zh" ? `档案浅格 ${index + 1}` : `Archive texture cell ${index + 1}`}
          onClick={() => setOpenedCells((count) => count + 1)}
          style={{ left: `${cell.x}%`, top: `${cell.y}%` }}
        ><span aria-hidden="true"><i /><b /></span></button>
      ))}
      <button
        type="button"
        className={styles.labyrinthMap}
        data-testid="labyrinth-map-window"
        aria-label={locale === "zh" ? "透明路线地图窗" : "Transparent route map window"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: positionRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const rect = sceneRef.current?.getBoundingClientRect();
          assess({
            x: drag.start.x + (rect?.width ? (event.clientX - drag.x) / rect.width * 100 : (event.clientX - drag.x) / 3.125),
            y: drag.start.y + (rect?.height ? (event.clientY - drag.y) / rect.height * 100 : (event.clientY - drag.y) / 2.5),
          }, "pointer-map", false);
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const rect = sceneRef.current?.getBoundingClientRect();
          assess({
            x: drag.start.x + (rect?.width ? (event.clientX - drag.x) / rect.width * 100 : (event.clientX - drag.x) / 3.125),
            y: drag.start.y + (rect?.height ? (event.clientY - drag.y) / rect.height * 100 : (event.clientY - drag.y) / 2.5),
          }, "pointer-map", true);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          const vectors: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
          const vector = vectors[event.key];
          if (!vector) return;
          event.preventDefault();
          assess({ x: positionRef.current.x + vector[0], y: positionRef.current.y + vector[1] }, "keyboard-map", true);
        }}
      >
        <svg viewBox="0 0 100 70" aria-hidden="true">
          <path data-testid="labyrinth-route-segment-0" d="M4 56 C24 52 28 22 45 22" />
          <path data-testid="labyrinth-route-segment-1" d="M45 22 C58 22 58 47 72 47" />
          <path data-testid="labyrinth-route-segment-2" d="M72 47 C84 47 88 27 97 23" />
        </svg>
        <span aria-hidden="true"><i /><b /></span>
      </button>
      <span className={styles.archiveLabyrinthSeal} aria-hidden="true" />
    </div>
  );
}

function FiveFingerEcho({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "idle" | "pointer-touch" | "keyboard-center";
  const [attemptCount, setAttemptCount] = useState(0);
  const [echoCount, setEchoCount] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const fieldRef = useRef<HTMLButtonElement>(null);
  const pointerRef = useRef<number | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const soundEcho = (count: number, mode: Exclude<InputMode, "idle">) => {
    if (visibleSolved || armedRef.current) return;
    discover();
    setAttemptCount((current) => current + 1);
    setEchoCount(count);
    setInputMode(mode);
    if (count !== 5) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };
  const echoesAt = (clientX: number, clientY: number) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    const centerX = rect?.width ? rect.left + rect.width / 2 : 100;
    const centerY = rect?.height ? rect.top + rect.height / 2 : 100;
    const scale = rect?.width ? Math.min(rect.width, rect.height) / 200 : 1;
    const distance = Math.hypot(clientX - centerX, clientY - centerY) / Math.max(scale, .01);
    return distance <= 12 ? 5 : distance <= 30 ? 4 : distance <= 48 ? 3 : distance <= 66 ? 2 : 1;
  };

  return (
    <div
      className={styles.fiveEchoScene}
      data-attempt-count={attemptCount}
      data-controller="shared-control"
      data-crossed-layers={visibleSolved ? 5 : echoCount}
      data-echo-count={visibleSolved ? 5 : echoCount}
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-multitouch-required="false"
      data-spatial-model="five-nested-hollow-paper-rings-one-shared-unglowing-center-and-depth-dependent-echoes"
      data-testid="v2-scene-092"
    >
      <span className={styles.fiveEchoPaper} aria-hidden="true"><i /><b /></span>
      <button
        ref={fieldRef}
        type="button"
        className={styles.fiveEchoField}
        data-testid="five-echo-field"
        aria-label={locale === "zh" ? "五层纸环回声场" : "Five-layer paper echo field"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          pointerRef.current = event.pointerId;
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerUp={(event) => {
          if (pointerRef.current !== event.pointerId || visibleSolved) return;
          pointerRef.current = null;
          soundEcho(echoesAt(event.clientX, event.clientY), "pointer-touch");
        }}
        onPointerCancel={() => { pointerRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          soundEcho(5, "keyboard-center");
        }}
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <span
            className={styles.fiveEchoRing}
            data-ring={index + 1}
            data-testid={`five-echo-ring-${index}`}
            key={index}
            style={{ "--echo-ring": index } as React.CSSProperties}
            aria-hidden="true"
          />
        ))}
        <span className={styles.fiveEchoCenter} data-glow="false" data-testid="five-echo-center" aria-hidden="true" />
        {Array.from({ length: visibleSolved ? 5 : echoCount }, (_, index) => (
          <i
            className={styles.fiveEchoWave}
            data-testid={`five-echo-wave-${index}`}
            key={`${attemptCount}-${index}`}
            style={{ "--echo-wave": index } as React.CSSProperties}
            aria-hidden="true"
          />
        ))}
      </button>
      <span className={styles.fiveEchoSeal} aria-hidden="true" />
    </div>
  );
}

function SixBeatLock({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "idle" | "pointer-fold" | "keyboard-fold";
  const [folded, setFolded] = useState<number[]>([]);
  const [reboundCount, setReboundCount] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; index: number } | null>(null);
  const foldedRef = useRef(new Set<number>());
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const segments = [
    { angle: -10, length: "long" },
    { angle: 50, length: "short" },
    { angle: 110, length: "long" },
    { angle: 170, length: "short" },
    { angle: 230, length: "long" },
    { angle: 290, length: "short" },
  ] as const;

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const fold = (index: number, mode: Exclude<InputMode, "idle">) => {
    if (visibleSolved || armedRef.current || foldedRef.current.has(index)) return;
    discover();
    foldedRef.current.add(index);
    const next = [...foldedRef.current];
    setFolded(next);
    setInputMode(mode);
    if (next.length !== 6) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };
  const center = () => {
    const rect = sceneRef.current?.getBoundingClientRect();
    return rect?.width
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: 160, y: 130 };
  };

  return (
    <div
      ref={sceneRef}
      className={styles.sixBeatScene}
      data-controller="fold"
      data-endpoint-overlap={visibleSolved ? 6 : folded.length}
      data-fold-order={folded.join(",")}
      data-folded-count={visibleSolved ? 6 : folded.length}
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-rebound-count={reboundCount}
      data-spatial-model="six-radial-long-short-paper-beats-folding-their-outer-endpoints-onto-one-shared-center-stamp"
      data-stamp-state={visibleSolved ? "single-thick-beat" : "separate-beats"}
      data-testid="v2-scene-093"
    >
      <span className={styles.sixBeatPaper} aria-hidden="true"><i /><b /></span>
      {segments.map((segment, index) => {
        const isFolded = visibleSolved || folded.includes(index);
        return (
          <button
            type="button"
            className={styles.sixBeatSegment}
            data-folded={isFolded ? "true" : "false"}
            data-length={segment.length}
            data-testid={`six-beat-segment-${index}`}
            key={index}
            aria-label={locale === "zh" ? `纸带折线 ${index + 1}` : `Paper beat fold ${index + 1}`}
            onClick={() => undefined}
            onPointerDown={(event) => {
              if (visibleSolved || foldedRef.current.has(index)) return;
              dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, index };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current;
              dragRef.current = null;
              if (!drag || drag.pointerId !== event.pointerId || drag.index !== index || visibleSolved) return;
              const target = center();
              const startDistance = Math.hypot(drag.x - target.x, drag.y - target.y);
              const endDistance = Math.hypot(event.clientX - target.x, event.clientY - target.y);
              if (startDistance - endDistance >= 32 && endDistance <= 64) {
                fold(index, "pointer-fold");
                return;
              }
              discover();
              setInputMode("pointer-fold");
              setReboundCount((count) => count + 1);
            }}
            onPointerCancel={() => { dragRef.current = null; }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              fold(index, "keyboard-fold");
            }}
            style={{ "--six-beat-angle": `${segment.angle}deg`, "--six-beat-length": segment.length === "long" ? "8.8rem" : "5.8rem" } as React.CSSProperties}
          >
            <span aria-hidden="true">
              <i />
              <b><strong /></b>
              <em data-position="midpoint" data-testid={`six-beat-fold-line-${index}`} />
            </span>
          </button>
        );
      })}
      <span className={styles.sixBeatStamp} data-layer-count={visibleSolved ? 6 : folded.length} aria-hidden="true">
        {Array.from({ length: visibleSolved ? 6 : folded.length }, (_, index) => <i key={index} style={{ "--stamp-layer": index } as React.CSSProperties} />)}
      </span>
      {reboundCount > 0 ? <span key={reboundCount} className={styles.sixBeatRebound} aria-hidden="true" /> : null}
      <span className={styles.sixBeatSeal} aria-hidden="true" />
    </div>
  );
}

function BeaconSaturation({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "idle" | "pointer-shade" | "keyboard-shade";
  const [position, setPosition] = useState({ x: 14, y: 74 });
  const positionRef = useRef({ x: 14, y: 74 });
  const [saturation, setSaturation] = useState(100);
  const [patternVisibility, setPatternVisibility] = useState<"hidden" | "emerging" | "clear">("hidden");
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; start: { x: number; y: number }; last: { x: number; y: number } | null } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const textures = ["diagonal-hatch", "cross-grid", "paper-dots", "concentric-grooves"];

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const assess = (next: { x: number; y: number }, mode: Exclude<InputMode, "idle">, settle: boolean) => {
    if (visibleSolved || armedRef.current) return;
    const bounded = { x: Math.max(8, Math.min(92, next.x)), y: Math.max(10, Math.min(90, next.y)) };
    const distance = Math.hypot(bounded.x - 50, bounded.y - 50);
    const nextVisibility = distance <= 10 ? "clear" : distance <= 32 ? "emerging" : "hidden";
    positionRef.current = bounded;
    setPosition(bounded);
    setSaturation(distance <= 10 ? 0 : Math.min(100, Math.round(distance * 2)));
    setPatternVisibility(nextVisibility);
    setInputMode(mode);
    discover();
    if (!settle || nextVisibility !== "clear") return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  const shownPosition = visibleSolved ? { x: 50, y: 50 } : position;
  return (
    <div
      ref={sceneRef}
      className={styles.beaconSaturationScene}
      data-clock-state={visibleSolved ? "visible-texture" : "concealed"}
      data-color-only="false"
      data-controller="light-drag"
      data-flashing="false"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-pattern-visibility={visibleSolved ? "clear" : patternVisibility}
      data-saturation={visibleSolved ? 0 : saturation}
      data-shade-position={`${Math.round(shownPosition.x)},${Math.round(shownPosition.y)}`}
      data-spatial-model="overlapping-colored-texture-papers-one-white-desaturation-shade-and-one-hidden-texture-clock-at-the-saturated-center"
      data-testid="v2-scene-094"
      style={{ "--shade-x": `${shownPosition.x}%`, "--shade-y": `${shownPosition.y}%`, "--texture-reveal": visibleSolved ? 1 : patternVisibility === "clear" ? 1 : patternVisibility === "emerging" ? .48 : .08 } as React.CSSProperties}
    >
      <span className={styles.saturationPaper} aria-hidden="true"><i /><b /></span>
      {textures.map((texture, index) => (
        <span
          className={styles.saturationLayer}
          data-layer={index}
          data-testid={`saturation-layer-${index}`}
          data-texture={texture}
          key={texture}
          aria-hidden="true"
        ><i /></span>
      ))}
      <span className={styles.saturationClock} data-testid="saturation-texture-clock" aria-hidden="true"><i /><b /><em /></span>
      <button
        type="button"
        className={styles.saturationShade}
        data-testid="saturation-shade"
        aria-label={locale === "zh" ? "白色遮光纸片" : "White paper shade"}
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, start: positionRef.current, last: null };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const rect = sceneRef.current?.getBoundingClientRect();
          const next = {
            x: drag.start.x + (rect?.width ? (event.clientX - drag.x) / rect.width * 100 : (event.clientX - drag.x) / 3.2),
            y: drag.start.y + (rect?.height ? (event.clientY - drag.y) / rect.height * 100 : (event.clientY - drag.y) / 2.4),
          };
          drag.last = next;
          assess(next, "pointer-shade", false);
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const rect = sceneRef.current?.getBoundingClientRect();
          const next = drag.last ?? {
            x: drag.start.x + (rect?.width ? (event.clientX - drag.x) / rect.width * 100 : (event.clientX - drag.x) / 3.2),
            y: drag.start.y + (rect?.height ? (event.clientY - drag.y) / rect.height * 100 : (event.clientY - drag.y) / 2.4),
          };
          dragRef.current = null;
          assess(next, "pointer-shade", true);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          const vectors: Record<string, [number, number]> = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
          const vector = vectors[event.key];
          if (!vector) return;
          event.preventDefault();
          assess({ x: positionRef.current.x + vector[0], y: positionRef.current.y + vector[1] }, "keyboard-shade", true);
        }}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.saturationSeal} aria-hidden="true" />
    </div>
  );
}

function TriplePhase({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type Phase = "past" | "present" | "future";
  type InputMode = "idle" | "pointer-layer" | "keyboard-layer";
  const phases: Array<{ phase: Phase; gap: number; emboss: number }> = [
    { phase: "past", gap: 30, emboss: 1 },
    { phase: "present", gap: 150, emboss: 2 },
    { phase: "future", gap: 270, emboss: 3 },
  ];
  const initialPositions: Record<Phase, { x: number; y: number }> = {
    past: { x: 24, y: 27 },
    present: { x: 76, y: 28 },
    future: { x: 25, y: 75 },
  };
  const [positions, setPositions] = useState(initialPositions);
  const [stackOrder, setStackOrder] = useState<Phase[]>([]);
  const stackRef = useRef<Phase[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; phase: Phase } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const correctOrder: Phase[] = ["past", "present", "future"];

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const updateLayer = (phase: Phase, point: { x: number; y: number }, mode: Exclude<InputMode, "idle">, settle: boolean) => {
    if (visibleSolved || armedRef.current) return;
    const bounded = { x: Math.max(14, Math.min(86, point.x)), y: Math.max(17, Math.min(83, point.y)) };
    const atCenter = Math.hypot(bounded.x - 50, bounded.y - 50) <= 13;
    const settledPoint = settle && !atCenter ? initialPositions[phase] : bounded;
    setPositions((current) => ({ ...current, [phase]: atCenter ? { x: 50, y: 50 } : settledPoint }));
    setInputMode(mode);
    discover();
    if (!settle) return;
    const next = atCenter
      ? [...stackRef.current.filter((item) => item !== phase), phase]
      : stackRef.current.filter((item) => item !== phase);
    stackRef.current = next;
    setStackOrder(next);
    if (next.length !== 3 || !next.every((item, index) => item === correctOrder[index])) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };
  const unstack = (phase: Phase) => {
    if (visibleSolved) return;
    const next = stackRef.current.filter((item) => item !== phase);
    stackRef.current = next;
    setStackOrder(next);
    setPositions((current) => ({ ...current, [phase]: initialPositions[phase] }));
    setInputMode("keyboard-layer");
    discover();
  };
  const shownOrder = visibleSolved ? correctOrder : stackOrder;
  const orderIsPrefix = shownOrder.every((phase, index) => phase === correctOrder[index]);
  const ghostCount = shownOrder.length === 0 ? 3 : orderIsPrefix ? Math.max(0, 3 - shownOrder.length) : Math.max(1, shownOrder.length - 1);
  const ringState = visibleSolved
    ? "complete-single-ring"
    : shownOrder.length === 0
      ? "separate"
      : orderIsPrefix
        ? "incomplete"
        : "ghosted";

  return (
    <div
      ref={sceneRef}
      className={styles.triplePhaseScene}
      data-color-only="false"
      data-controller="layer-stack"
      data-flashing="false"
      data-ghost-count={ghostCount}
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-overlap-count={shownOrder.length}
      data-ring-state={ringState}
      data-spatial-model="three-translucent-time-slices-with-complementary-ring-gaps-and-edge-embossing-stacked-past-present-future"
      data-stack-order={shownOrder.join(",")}
      data-testid="v2-scene-095"
    >
      <span className={styles.triplePhasePaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.triplePhaseWell} aria-hidden="true" />
      {phases.map(({ phase, gap, emboss }, index) => {
        const stackedIndex = shownOrder.indexOf(phase);
        const point = visibleSolved ? { x: 50, y: 50 } : positions[phase];
        return (
          <button
            type="button"
            className={styles.triplePhaseCard}
            data-edge-emboss={emboss}
            data-gap-angle={gap}
            data-phase={phase}
            data-stacked={stackedIndex >= 0 ? "true" : "false"}
            data-testid={`triple-phase-${phase}`}
            key={phase}
            aria-label={locale === "zh" ? `${["过去", "现在", "未来"][index]}时间片` : `${phase} time slice`}
            onClick={() => undefined}
            onPointerDown={(event) => {
              if (visibleSolved) return;
              dragRef.current = { pointerId: event.pointerId, phase };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId || drag.phase !== phase || visibleSolved) return;
              const rect = sceneRef.current?.getBoundingClientRect();
              updateLayer(phase, {
                x: rect?.width ? (event.clientX - rect.left) / rect.width * 100 : event.clientX / 3.2,
                y: rect?.height ? (event.clientY - rect.top) / rect.height * 100 : event.clientY / 2.4,
              }, "pointer-layer", false);
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current;
              dragRef.current = null;
              if (!drag || drag.pointerId !== event.pointerId || drag.phase !== phase || visibleSolved) return;
              const rect = sceneRef.current?.getBoundingClientRect();
              updateLayer(phase, {
                x: rect?.width ? (event.clientX - rect.left) / rect.width * 100 : event.clientX / 3.2,
                y: rect?.height ? (event.clientY - rect.top) / rect.height * 100 : event.clientY / 2.4,
              }, "pointer-layer", true);
            }}
            onPointerCancel={() => { dragRef.current = null; }}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp") {
                event.preventDefault();
                updateLayer(phase, { x: 50, y: 50 }, "keyboard-layer", true);
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                unstack(phase);
              }
            }}
            style={{
              "--phase-gap": `${gap}deg`,
              "--phase-x": `${point.x}%`,
              "--phase-y": `${point.y}%`,
              "--phase-z": stackedIndex >= 0 ? 7 + stackedIndex : 4 + index,
            } as React.CSSProperties}
          >
            <span aria-hidden="true"><i /><b /><em /></span>
            <span className={styles.triplePhaseEmboss} aria-hidden="true">{Array.from({ length: emboss }, (_, mark) => <i key={mark} />)}</span>
          </button>
        );
      })}
      <span className={styles.triplePhaseGhost} data-count={ghostCount} aria-hidden="true"><i /><b /></span>
      <span className={styles.triplePhaseSeal} aria-hidden="true" />
    </div>
  );
}

function SevenBeatNull({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "idle" | "pointer-beat" | "keyboard-beat";
  const beatPositions = [20, 55, 72.5, 81.25, 82.2, 85.625, 87.8125];
  const gapsBefore = [0, 35, 17.5, 8.75, .95, 3.425, 2.1875];
  const [inspectedPoint, setInspectedPoint] = useState<number | null>(null);
  const inspectedRef = useRef<number | null>(null);
  const [returnedPoint, setReturnedPoint] = useState<number | null>(null);
  const [offsets, setOffsets] = useState<Record<number, { x: number; y: number }>>({});
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; index: number; x: number; y: number; primed: boolean } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const inspect = (index: number, mode: Exclude<InputMode, "idle">) => {
    inspectedRef.current = index;
    setInspectedPoint(index);
    setReturnedPoint(null);
    setInputMode(mode);
    discover();
  };
  const attemptRemoval = (index: number, primed: boolean, mode: Exclude<InputMode, "idle">) => {
    inspect(index, mode);
    setOffsets((current) => ({ ...current, [index]: { x: 0, y: 0 } }));
    if (index !== 4 || !primed) {
      setReturnedPoint(index);
      return;
    }
    if (armedRef.current) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  return (
    <div
      className={styles.sevenBeatNullScene}
      data-color-only="false"
      data-controller="shadow-sort"
      data-distance-curve={visibleSolved ? "smooth-halving" : "broken"}
      data-flashing="false"
      data-input-mode={inputMode}
      data-inspected-point={inspectedPoint ?? "none"}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-removed-point={visibleSolved ? "4" : "none"}
      data-returned-point={returnedPoint ?? "none"}
      data-spatial-model="seven-ink-beats-converging-by-halved-gaps-with-one-two-sided-null-break-and-a-zero-point"
      data-testid="v2-scene-096"
      data-visible-beats={visibleSolved ? 6 : 7}
    >
      <span className={styles.nullBeatPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.nullBeatAxis} aria-hidden="true" />
      {beatPositions.map((position, index) => {
        if (visibleSolved && index === 4) return null;
        const offset = offsets[index] ?? { x: 0, y: 0 };
        const before = gapsBefore[index];
        const after = index === beatPositions.length - 1 ? 91 - position : beatPositions[index + 1] - position;
        return (
          <button
            type="button"
            aria-label={locale === "zh" ? `墨点 ${index + 1}` : `Ink beat ${index + 1}`}
            className={styles.nullBeat}
            data-gap-after={after}
            data-gap-before={before}
            data-inspected={inspectedPoint === index ? "true" : "false"}
            data-ratio-state={index === 4 ? "expanding" : "converging"}
            data-returned={returnedPoint === index ? "true" : "false"}
            data-testid={`null-beat-${index}`}
            key={index}
            onClick={() => undefined}
            onPointerDown={(event) => {
              if (visibleSolved) return;
              dragRef.current = {
                pointerId: event.pointerId,
                index,
                x: event.clientX,
                y: event.clientY,
                primed: inspectedRef.current === index,
              };
              event.currentTarget.setPointerCapture?.(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag || drag.pointerId !== event.pointerId || drag.index !== index || visibleSolved) return;
              const next = { x: event.clientX - drag.x, y: event.clientY - drag.y };
              setOffsets((current) => ({ ...current, [index]: next }));
              if (Math.hypot(next.x, next.y) > 8) inspect(index, "pointer-beat");
            }}
            onPointerUp={(event) => {
              const drag = dragRef.current;
              dragRef.current = null;
              if (!drag || drag.pointerId !== event.pointerId || drag.index !== index || visibleSolved) return;
              const displacement = { x: event.clientX - drag.x, y: event.clientY - drag.y };
              if (Math.abs(displacement.y) >= 52 || Math.abs(displacement.x) >= 92) {
                attemptRemoval(index, drag.primed, "pointer-beat");
              } else {
                setOffsets((current) => ({ ...current, [index]: { x: 0, y: 0 } }));
              }
            }}
            onPointerCancel={() => {
              dragRef.current = null;
              setOffsets((current) => ({ ...current, [index]: { x: 0, y: 0 } }));
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                inspect(index, "keyboard-beat");
              } else if (event.key === "Delete" || event.key === "Backspace") {
                event.preventDefault();
                attemptRemoval(index, inspectedRef.current === index, "keyboard-beat");
              }
            }}
            style={{
              "--null-beat-x": `${position}%`,
              "--null-offset-x": `${offset.x}px`,
              "--null-offset-y": `${offset.y}px`,
              "--null-gap-before": `${Math.max(3, before * 2.2)}px`,
              "--null-gap-after": `${Math.max(3, after * 2.2)}px`,
              "--null-z": index === 4 ? 12 : 5 + index,
            } as React.CSSProperties}
          >
            <span aria-hidden="true" />
            {inspectedPoint === index ? <i className={styles.nullBeatFibers} aria-hidden="true"><b /><em /></i> : null}
          </button>
        );
      })}
      <span className={styles.nullZeroPoint} data-testid="null-zero-point" aria-hidden="true"><i /></span>
      <span className={styles.nullBeatCurve} aria-hidden="true"><i /><b /></span>
      <span className={styles.nullBeatSeal} aria-hidden="true" />
    </div>
  );
}

function SevenfoldAck({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "idle" | "pointer-clasp" | "keyboard-clasp";
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const [pageFlips, setPageFlips] = useState(0);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; y: number; pull: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const visiblePull = visibleSolved ? 70 : pull;
  const liftedPages = visiblePull >= 64 ? 7 : Math.min(6, Math.floor(visiblePull / 12));
  const shadowAlignment = visibleSolved
    ? "shared-center"
    : visiblePull > 82
      ? "overshot"
      : visiblePull >= 64
        ? "shared-center"
        : visiblePull > 0
          ? "partial"
          : pageFlips > 0
            ? "covered"
            : "separate";

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const updatePull = (next: number, mode: Exclude<InputMode, "idle">) => {
    const bounded = Math.max(0, Math.min(100, next));
    pullRef.current = bounded;
    setPull(bounded);
    setInputMode(mode);
    if (bounded > 5) discover();
    return bounded;
  };
  const complete = () => {
    if (armedRef.current) return;
    armedRef.current = true;
    pullRef.current = 70;
    setPull(70);
    setCompleted(true);
    onArm();
  };
  const settle = (value: number) => {
    if (value >= 64 && value <= 82) complete();
  };

  return (
    <div
      className={styles.sevenfoldScene}
      data-color-only="false"
      data-controller="coupled-drag"
      data-flashing="false"
      data-input-mode={inputMode}
      data-lifted-pages={liftedPages}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-page-flips={pageFlips}
      data-shadow-alignment={shadowAlignment}
      data-spatial-model="seven-folded-leaves-on-one-spine-raised-sequentially-by-one-shared-clasp-at-a-single-embossed-notch"
      data-testid="v2-scene-097"
    >
      <span className={styles.sevenfoldPaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.sevenfoldSpine} aria-hidden="true"><i /></span>
      {Array.from({ length: 7 }, (_, index) => (
        <button
          type="button"
          aria-label={locale === "zh" ? `折页 ${index + 1}` : `Folded leaf ${index + 1}`}
          className={styles.sevenfoldPage}
          data-lifted={index < liftedPages ? "true" : "false"}
          data-testid={`sevenfold-page-${index}`}
          key={index}
          onClick={() => {
            if (visibleSolved) return;
            discover();
            setPageFlips((count) => count + 1);
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            if (visibleSolved) return;
            discover();
            setPageFlips((count) => count + 1);
          }}
          style={{
            "--sevenfold-index": index,
            "--sevenfold-lift": index < liftedPages ? 1 : 0,
          } as React.CSSProperties}
        ><span aria-hidden="true"><i /><b /></span></button>
      ))}
      <span className={styles.sevenfoldNotch} data-testid="sevenfold-notch" aria-hidden="true"><i /></span>
      <button
        type="button"
        aria-label={locale === "zh" ? "书脊纸扣" : "Spine paper clasp"}
        className={styles.sevenfoldClasp}
        data-testid="sevenfold-clasp"
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, y: event.clientY, pull: pullRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          updatePull(drag.pull + event.clientY - drag.y, "pointer-clasp");
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          settle(updatePull(drag.pull + event.clientY - drag.y, "pointer-clasp"));
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          if (visibleSolved) return;
          const next = updatePull(pullRef.current + (event.key === "ArrowDown" ? 18 : -18), "keyboard-clasp");
          settle(next);
        }}
        style={{ "--sevenfold-pull": visiblePull } as React.CSSProperties}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.sevenfoldSharedShadow} aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ "--sevenfold-shadow": index } as React.CSSProperties} />)}</span>
      <span className={styles.sevenfoldSeal} aria-hidden="true" />
    </div>
  );
}

function QuadPhase({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "idle" | "pointer-cross" | "wheel-cross" | "keyboard-cross";
  const orders = [
    [0, 2, 3, 1],
    [2, 3, 1, 0],
    [0, 1, 2, 3],
    [3, 2, 0, 1],
  ];
  const times = ["2.50", "5.00", "7.50", "10.00"];
  const [rotationStep, setRotationStep] = useState(0);
  const stepRef = useRef(0);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; step: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const visibleStep = visibleSolved ? 2 : rotationStep;
  const order = orders[visibleStep];
  const completeEdges = order.reduce((count, time, index) => count + (order[(index + 1) % 4] === (time + 1) % 4 ? 1 : 0), 0);

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const rotateTo = (next: number, mode: Exclude<InputMode, "idle">) => {
    if (visibleSolved || armedRef.current) return;
    const normalized = (next % 4 + 4) % 4;
    stepRef.current = normalized;
    setRotationStep(normalized);
    setInputMode(mode);
    discover();
    if (normalized !== 2) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  return (
    <div
      className={styles.quadPhaseScene}
      data-color-only="false"
      data-complete-edges={completeEdges}
      data-controller="rotate"
      data-flashing="false"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-path-state={visibleSolved ? "continuous-loop" : completeEdges > 0 ? "partial" : "broken"}
      data-quadrant-order={order.join(",")}
      data-rotation-step={visibleStep}
      data-spatial-model="four-stopwatch-moments-in-coupled-quadrants-reordered-only-by-one-central-quarter-turn-cross"
      data-testid="v2-scene-098"
    >
      <span className={styles.quadPhasePaper} aria-hidden="true"><i /><b /></span>
      <span className={styles.quadPhaseGrid} aria-hidden="true"><i /><b /></span>
      {times.map((time, timeIndex) => {
        const slot = order.indexOf(timeIndex);
        return (
          <button
            type="button"
            aria-label={locale === "zh" ? `${time} 秒的纸片` : `${time} second paper`}
            className={styles.quadMoment}
            data-slot={slot}
            data-time={time}
            data-testid={`quad-moment-${timeIndex}`}
            key={time}
            onClick={() => undefined}
            onPointerDown={() => undefined}
            onKeyDown={() => undefined}
          ><span>{time}</span><i aria-hidden="true" /></button>
        );
      })}
      <span className={styles.quadEdgePaths} aria-hidden="true">
        {order.map((time, index) => <i key={index} data-active={order[(index + 1) % 4] === (time + 1) % 4 ? "true" : "false"} />)}
      </span>
      <button
        type="button"
        aria-label={locale === "zh" ? "中央联动十字" : "Coupled central cross"}
        className={styles.quadCross}
        data-testid="quad-cross"
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, step: stepRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          if (Math.abs(event.clientX - drag.x) > 10) discover();
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          const dx = event.clientX - drag.x;
          if (Math.abs(dx) < 32) return;
          const turns = Math.max(1, Math.min(3, Math.round(Math.abs(dx) / 55)));
          rotateTo(drag.step + (dx > 0 ? turns : -turns), "pointer-cross");
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onWheel={(event) => {
          event.preventDefault();
          rotateTo(stepRef.current + (event.deltaY > 0 ? 1 : -1), "wheel-cross");
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          rotateTo(stepRef.current + (event.key === "ArrowRight" ? 1 : -1), "keyboard-cross");
        }}
        style={{ "--quad-turn": visibleStep } as React.CSSProperties}
      ><span aria-hidden="true"><i /><b /></span></button>
      <span className={styles.quadPhaseSeal} aria-hidden="true" />
    </div>
  );
}

function RelayPolyrhythm({ locale, solved, onDiscover, onArm }: ControllerProps) {
  type InputMode = "idle" | "pointer-band" | "keyboard-band";
  const [bandPosition, setBandPosition] = useState(15);
  const positionRef = useRef(15);
  const [inputMode, setInputMode] = useState<InputMode>("idle");
  const [completed, setCompleted] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; position: number } | null>(null);
  const discoveredRef = useRef(false);
  const armedRef = useRef(false);
  const visibleSolved = solved || completed;
  const visiblePosition = visibleSolved ? 52 : bandPosition;
  const error = Math.abs(visiblePosition - 52);
  const alignedHoles = error <= 4 ? 6 : error <= 11 ? 3 : 0;
  const cycleState = visibleSolved
    ? "shared-six-point-cycle"
    : alignedHoles === 6
      ? "shared-six-point-cycle"
      : alignedHoles > 0
        ? "approaching"
        : "separate";

  const discover = () => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;
    onDiscover();
  };
  const moveBand = (next: number, mode: Exclude<InputMode, "idle">, settle: boolean) => {
    if (visibleSolved || armedRef.current) return;
    const bounded = Math.max(0, Math.min(100, next));
    positionRef.current = bounded;
    setBandPosition(bounded);
    setInputMode(mode);
    discover();
    if (!settle || Math.abs(bounded - 52) > 4) return;
    armedRef.current = true;
    setCompleted(true);
    onArm();
  };

  return (
    <div
      className={styles.polyrhythmScene}
      data-aligned-holes={alignedHoles}
      data-audio-required="false"
      data-band-position={Math.round(visiblePosition)}
      data-color-only="false"
      data-controller="wave-align"
      data-cycle-state={cycleState}
      data-flashing="false"
      data-input-mode={inputMode}
      data-lock-state={visibleSolved ? "locked" : "open"}
      data-spatial-model="two-division-and-three-division-paper-waves-filtered-together-by-one-six-hole-inspection-band"
      data-testid="v2-scene-099"
    >
      <span className={styles.polyrhythmPaper} aria-hidden="true"><i /><b /></span>
      <button type="button" className={`${styles.polyrhythmWave} ${styles.polyrhythmWaveTwo}`} data-testid="polyrhythm-wave-2" aria-label={locale === "zh" ? "二分纸波" : "Two-division paper wave"} onClick={() => undefined}>
        <svg viewBox="0 0 360 100" aria-hidden="true"><path d="M0 50 C30 4 60 4 90 50 S150 96 180 50 S240 4 270 50 S330 96 360 50" /></svg>
      </button>
      <button type="button" className={`${styles.polyrhythmWave} ${styles.polyrhythmWaveThree}`} data-testid="polyrhythm-wave-3" aria-label={locale === "zh" ? "三分纸波" : "Three-division paper wave"} onClick={() => undefined}>
        <svg viewBox="0 0 360 100" aria-hidden="true"><path d="M0 50 C20 10 40 10 60 50 S100 90 120 50 S160 10 180 50 S220 90 240 50 S280 10 300 50 S340 90 360 50" /></svg>
      </button>
      <span className={styles.polyrhythmIntersections} aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span>
      <button
        type="button"
        aria-label={locale === "zh" ? "六孔透明检查带" : "Six-hole transparent inspection band"}
        className={styles.polyrhythmBand}
        data-testid="polyrhythm-inspection-band"
        onClick={() => undefined}
        onPointerDown={(event) => {
          if (visibleSolved) return;
          dragRef.current = { pointerId: event.pointerId, x: event.clientX, position: positionRef.current };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          moveBand(drag.position + (event.clientX - drag.x) / 3.2, "pointer-band", false);
        }}
        onPointerUp={(event) => {
          const drag = dragRef.current;
          dragRef.current = null;
          if (!drag || drag.pointerId !== event.pointerId || visibleSolved) return;
          moveBand(drag.position + (event.clientX - drag.x) / 3.2, "pointer-band", true);
        }}
        onPointerCancel={() => { dragRef.current = null; }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
          event.preventDefault();
          moveBand(positionRef.current + (event.key === "ArrowRight" ? 12 : -12), "keyboard-band", true);
        }}
        style={{ "--polyrhythm-band-shift": `${(visiblePosition - 52) * 1.8}px` } as React.CSSProperties}
      >{Array.from({ length: 6 }, (_, index) => <span data-aligned={index < alignedHoles ? "true" : "false"} data-testid={`polyrhythm-hole-${index}`} key={index}><i aria-hidden="true" /></span>)}</button>
      <span className={styles.polyrhythmSeal} aria-hidden="true" />
    </div>
  );
}

function Controller(props: ControllerProps) {
  switch (props.level.controller) {
    case "corner-repair": return <CornerRepair {...props} />;
    case "patient-hold": return <PatientHold {...props} />;
    case "word-shift": return <WordShift {...props} />;
    case "shadow-sort": return <ShadowSort {...props} />;
    case "light-drag": return <LightDrag {...props} />;
    case "frame-drag": return <FrameDrag {...props} />;
    case "orbit": return props.level.id === 27
      ? <BeaconMetronome {...props} />
      : props.level.id === 41
        ? <HelpLoop {...props} />
        : props.level.id === 59
          ? <ClockfaceSum {...props} />
          : props.level.id === 68
            ? <CounterclockwiseBreach {...props} />
            : props.level.id === 80
              ? <PressureSingularity {...props} />
            : <DragRelation {...props} kind={props.level.controller} />;
    case "edge-route": return props.level.id === 38
      ? <ReturnTicket {...props} />
      : <DragRelation {...props} kind={props.level.controller} />;
    case "shared-control": return props.level.id === 26
      ? <FiveBeatDivider {...props} />
      : props.level.id === 29
        ? <PulseChecker {...props} />
        : props.level.id === 35
          ? <HorizonShift {...props} />
          : props.level.id === 36
            ? <PortableHorizon {...props} />
            : props.level.id === 46
              ? <SilentHandoff {...props} />
              : props.level.id === 53
                ? <BilingualOverride {...props} />
                : props.level.id === 56
                  ? <HundredCode {...props} />
                  : props.level.id === 61
                    ? <ReverseSweep {...props} />
                    : props.level.id === 62
                      ? <PointerEcho {...props} />
              : props.level.id === 77
                        ? <SplitOperator {...props} />
                      : props.level.id === 82
                        ? <PointerMajority {...props} />
                        : props.level.id === 86
                          ? <EclipseSession {...props} />
                          : props.level.id === 90
                            ? <ArchiveLabyrinth {...props} />
                            : props.level.id === 92
                              ? <FiveFingerEcho {...props} />
                              : <DragRelation {...props} kind={props.level.controller} />;
    case "resize": return <ResizeController {...props} />;
    case "coupled-drag": return <CoupledDrag {...props} />;
    case "wave-align": return <WaveAlign {...props} />;
    case "trace": return <TraceController {...props} />;
    case "layer-stack": return <LayerStack {...props} />;
    case "fold": return <FoldController {...props} />;
    case "flip": return <FlipController {...props} />;
    case "rotate": return <RotateController {...props} />;
    case "focus-route": return <FocusRouteController {...props} />;
    case "rhythm": return <RhythmController {...props} />;
    case "wheel-echo": return <WheelEcho {...props} />;
    case "cover-return": return <CoverReturn {...props} />;
    case "constellation": return <Constellation {...props} />;
  }
}

export function V2PuzzleScene({ slug, armed, hintLevel, spatialPilot = false, resetEpoch = 0, ghostAnchor = null, onGhostAnchorChange = () => undefined, menuOpen = false, eclipseOffset = 0, onDiscover, onArm }: V2PuzzleSceneProps) {
  const { locale } = useLocale();
  const level = V2_LEVEL_BY_SLUG.get(slug);
  const [timerRect, setTimerRect] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const announced = useRef(false);
  const discover = useCallback(() => {
    if (announced.current) return;
    announced.current = true;
    onDiscover();
  }, [onDiscover]);
  const palette = useMemo(() => ({
    "--level-hue": `${(level?.id ?? 1) * 37 % 360}`,
    "--level-seed": `${(level?.id ?? 1) % 7}`,
  }) as React.CSSProperties, [level?.id]);
  useLayoutEffect(() => {
    const timer = document.querySelector<HTMLElement>(".stopwatch-card");
    if (!timer) return;
    const update = () => {
      const rect = timer.getBoundingClientRect();
      setTimerRect({ top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left });
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(timer);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [slug]);

  if (!level) throw new RangeError(`Missing V2 production level for ${slug}`);
  const hints = controllerHints[level.controller][locale];
  const sceneStyle = {
    ...palette,
    "--timer-top": `${timerRect.top}px`,
    "--timer-right": `${timerRect.right}px`,
    "--timer-bottom": `${timerRect.bottom}px`,
    "--timer-left": `${timerRect.left}px`,
  } as React.CSSProperties;
  return (
    <section className={`${styles.scene} ${styles[`chapter${level.chapter}`]} ${armed ? styles.isArmed : ""}`} style={sceneStyle} data-layout-ready={timerRect.bottom > 0 ? "true" : "false"} data-spatial-pilot={spatialPilot ? "true" : "false"} data-testid="puzzle-scene" data-scene-id={`v2-${String(level.id).padStart(3, "0")}-${slug}`} data-v2-level={String(level.id).padStart(3, "0")} data-v2-slug={slug}>
      <div className={styles.sceneTexture} aria-hidden="true" />
      {level.id <= 100 ? null : <div className={styles.ambientMarks} aria-hidden="true">{level.visual.marks.map((mark, index) => <i
        key={index}
        data-shape={mark.shape}
        style={{ left: `${mark.x}%`, top: `${mark.y}%`, width: `${mark.size}px`, height: `${mark.size}px`, transform: `rotate(${mark.rotation}deg)` }}
      />)}</div>}
      <header className={styles.levelHeader}>
        <span>{String(level.id).padStart(3, "0")}</span>
        {armed ? <h2>{locale === "zh" ? level.title.zh : level.title.en}</h2> : null}
      </header>
      <Controller level={level} locale={locale} solved={armed} resetEpoch={resetEpoch} ghostAnchor={ghostAnchor} onGhostAnchorChange={onGhostAnchorChange} menuOpen={menuOpen} eclipseOffset={eclipseOffset} spatialPilot={spatialPilot} onDiscover={discover} onArm={onArm} />
      {hintLevel > 0 && !armed ? <aside className={styles.hint} role="status"><span>{hints[0]}</span>{hintLevel > 1 ? <b>{hints[1]}</b> : null}{hintLevel > 2 ? <em>{locale === "zh" ? `答案：${level.solve}` : `Answer: ${hints[1]}`}</em> : null}</aside> : null}
      <p className={styles.solvedNote} aria-live="polite">{armed ? (locale === "zh" ? "抓到时间的破绽了" : "You found the crack in time") : ""}</p>
    </section>
  );
}
