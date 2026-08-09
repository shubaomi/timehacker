"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluateFigureEightTrace, evaluateVTrace, pointFromPointer, type TracePoint } from "@/game/v2-prototype";
import { V2_LEVEL_BY_SLUG, type V2ControllerKind, type V2LevelDefinition } from "@/game/v2-levels.generated";
import type { Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";
import styles from "./v2-puzzle-scene.module.css";

interface V2PuzzleSceneProps {
  slug: string;
  armed: boolean;
  hintLevel: 0 | 1 | 2 | 3;
  onDiscover: () => void;
  onArm: () => void;
}

interface ControllerProps {
  level: V2LevelDefinition;
  locale: Locale;
  solved: boolean;
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

function CornerRepair(props: ControllerProps) {
  return <DragRelation {...props} kind="corner-repair" />;
}

function ShadowSort({ locale, solved, onDiscover, onArm }: ControllerProps) {
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

function PatientHold({ level, locale, solved, onDiscover, onArm }: ControllerProps) {
  const exactBreath = level.id === 2;
  const [ready, setReady] = useState(!exactBreath);
  const [holding, setHolding] = useState(false);
  const holdStart = useRef(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  useEffect(() => {
    if (!exactBreath || solved) return;
    const reveal = window.setTimeout(() => { setReady(true); onDiscover(); }, 2_500);
    return () => window.clearTimeout(reveal);
  }, [exactBreath, onDiscover, solved]);
  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
    if (performance.now() - holdStart.current < (exactBreath ? 1_200 : 850)) onDiscover();
  };
  return (
    <div className={`${styles.breathBoard} ${ready ? styles.isReady : ""} ${holding ? styles.isHolding : ""}`} data-controller="patient-hold">
      <span className={styles.breathLeaf} aria-hidden="true" /><span className={styles.breathLeaf} aria-hidden="true" />
      {ready ? <button
        type="button"
        className={styles.breathCore}
        aria-label={locale === "zh" ? "按住安静的中心" : "Hold the quiet center"}
        onPointerDown={() => {
          holdStart.current = performance.now(); setHolding(true); onDiscover();
          timer.current = window.setTimeout(onArm, exactBreath ? 1_200 : level.id === 12 ? 1_400 : 1_000);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={(event) => {
          if (event.key !== " " || event.repeat) return;
          event.preventDefault(); holdStart.current = performance.now(); setHolding(true); onDiscover();
          timer.current = window.setTimeout(onArm, exactBreath ? 1_200 : level.id === 12 ? 1_400 : 1_000);
        }}
        onKeyUp={(event) => { if (event.key === " ") stop(); }}
      /> : null}
    </div>
  );
}

const WORD_COLUMNS = [["F", "T", "S", "R"], ["A", "I", "L", "E"], ["S", "M", "O", "N"], ["T", "E", "W", "R"]] as const;
function WordShift({ locale, solved, onDiscover, onArm }: ControllerProps) {
  const [letters, setLetters] = useState(["F", "A", "S", "T"]);
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
  return <div className={styles.wordBoard} data-controller="word-shift">{visible.map((letter, index) => <button
    type="button" key={index} className={letter === "SLOW"[index] ? styles.isLetterRight : ""}
    aria-label={locale === "zh" ? `字牌 ${index + 1}：${letter}` : `Letter ${index + 1}: ${letter}`}
    onClick={() => turn(index)}
    onWheel={(event) => { event.preventDefault(); turn(index, event.deltaY >= 0 ? 1 : -1); }}
    onKeyDown={(event) => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault(); turn(index, event.key === "ArrowDown" ? 1 : -1);
    }}
  >{letter}<i aria-hidden="true" /></button>)}</div>;
}

function LayerStack({ level, locale, solved, onDiscover, onArm, kind = "layer-stack" }: ControllerProps & { kind?: V2ControllerKind }) {
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

function RhythmController({ locale, solved, onDiscover, onArm }: ControllerProps) {
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

function FocusRoute({ locale, onDiscover, onArm }: ControllerProps) {
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

function WheelEcho({ locale, onDiscover, onArm }: ControllerProps) {
  const [echo, setEcho] = useState(0);
  const move = (direction: number) => {
    onDiscover();
    setEcho((current) => {
      const next = Math.max(-2, Math.min(3, current + direction));
      if (next >= 3) queueMicrotask(onArm);
      return next;
    });
  };
  return <div className={styles.echoBoard} data-controller="wheel-echo" tabIndex={0} role="application" aria-label={locale === "zh" ? "反向回声轮" : "Reverse echo wheel"}
    style={{ "--echo": echo } as React.CSSProperties}
    onWheel={(event) => { event.preventDefault(); move(event.deltaY > 0 ? 1 : -1); }}
    onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); move(event.key === "ArrowDown" ? 1 : -1); } }}
    onPointerDown={(event) => { (event.currentTarget as HTMLElement).dataset.y = String(event.clientY); }}
    onPointerUp={(event) => { const y = Number((event.currentTarget as HTMLElement).dataset.y ?? event.clientY); move(event.clientY > y ? 1 : -1); }}
  ><span /><i /><b /></div>;
}

function CoverReturn({ level, locale, onDiscover, onArm }: ControllerProps) {
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

function TraceController({ level, locale, onDiscover, onArm }: ControllerProps) {
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
    const valid = level.id === 69
      ? evaluateFigureEightTrace(pointsRef.current)
      : level.id === 6
        ? pointsRef.current.length >= 8 && spanX > 40 && spanY > 40 && endpointDistance < 26
        : pointsRef.current.length >= 6 && endpointDistance > 45;
    if (valid) onArm(); else window.setTimeout(() => { pointsRef.current = []; setPoints([]); }, 260);
  };
  return <svg className={`${styles.traceBoard} ${level.id === 69 ? styles.figureEight : ""}`} viewBox="0 0 100 100" role="application" tabIndex={0} aria-label={locale === "zh" ? "画出一条连续路线" : "Draw one continuous route"} data-controller="trace"
    onPointerDown={(event) => { drawing.current = true; const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()); pointsRef.current = [point]; setPoints([point]); event.currentTarget.setPointerCapture?.(event.pointerId); }}
    onPointerMove={(event) => { if (!drawing.current) return; const point = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()); const next = [...pointsRef.current, point]; pointsRef.current = next; setPoints(next); if (next.length === 3) onDiscover(); }}
    onPointerUp={finish}
    onKeyDown={(event) => {
      if (!event.key.startsWith("Arrow")) return;
      event.preventDefault(); onDiscover();
      keyRoute.current = [...keyRoute.current, event.key].slice(-4);
      const expected = level.id === 69 || level.id === 6
        ? ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"]
        : ["ArrowRight", "ArrowDown", "ArrowRight"];
      if (keyRoute.current.slice(-expected.length).join("|") === expected.join("|")) onArm();
    }}
  ><path d={level.id === 69 ? "M50 50 C20 0 0 30 10 55 C18 78 38 72 50 50 C62 28 82 22 90 45 C100 70 80 100 50 50" : "M8 70 C25 15 42 85 58 28 S80 68 94 20"} /><polyline points={points.map(({ x, y }) => `${x},${y}`).join(" ")} /></svg>;
}

function Constellation({ locale, onDiscover, onArm }: ControllerProps) {
  const [clusters, setClusters] = useState(0);
  const [points, setPoints] = useState<TracePoint[]>([]);
  const drawing = useRef(false);
  const pointsRef = useRef<TracePoint[]>([]);
  const gather = () => { const next = Math.min(2, clusters + 1); setClusters(next); onDiscover(); };
  return <div className={`${styles.constellationBoard} ${clusters >= 2 ? styles.isGathered : ""}`} data-controller="constellation">
    <button type="button" className={styles.starLeft} onClick={gather} onKeyDown={(event) => { if (event.key === "ArrowRight") gather(); }} aria-label={locale === "zh" ? "把左侧星群移向中心" : "Move left stars inward"}><i /><i /><i /></button>
    <button type="button" className={styles.starRight} onClick={gather} onKeyDown={(event) => { if (event.key === "ArrowLeft") gather(); }} aria-label={locale === "zh" ? "把右侧星群移向中心" : "Move right stars inward"}><i /><i /><i /></button>
    {clusters >= 2 ? <svg viewBox="0 0 100 100" role="application" tabIndex={0} aria-label={locale === "zh" ? "描出空白中的 V" : "Draw the empty V"}
      onPointerDown={(event) => { drawing.current = true; const p = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()); pointsRef.current = [p]; setPoints([p]); event.currentTarget.setPointerCapture?.(event.pointerId); }}
      onPointerMove={(event) => { if (!drawing.current) return; const p = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()); const next = [...pointsRef.current, p]; pointsRef.current = next; setPoints(next); }}
      onPointerUp={() => { drawing.current = false; if (evaluateVTrace(pointsRef.current)) onArm(); }}
      onKeyDown={(event) => { if (event.key.toLowerCase() === "v") onArm(); }}
    ><path d="M12 16 L50 82 L88 16" /><polyline points={points.map(({ x, y }) => `${x},${y}`).join(" ")} /></svg> : null}
  </div>;
}

function Controller(props: ControllerProps) {
  switch (props.level.controller) {
    case "corner-repair": return <CornerRepair {...props} />;
    case "patient-hold": return <PatientHold {...props} />;
    case "word-shift": return <WordShift {...props} />;
    case "shadow-sort": return <ShadowSort {...props} />;
    case "light-drag":
    case "frame-drag":
    case "coupled-drag":
    case "wave-align":
    case "orbit":
    case "resize":
    case "edge-route":
    case "shared-control": return <DragRelation {...props} kind={props.level.controller} />;
    case "trace": return <TraceController {...props} />;
    case "layer-stack": return <LayerStack {...props} />;
    case "fold": return <DiscreteController {...props} kind="fold" />;
    case "flip": return <DiscreteController {...props} kind="flip" />;
    case "rotate": return <DiscreteController {...props} kind="rotate" />;
    case "focus-route": return <FocusRoute {...props} />;
    case "rhythm": return <RhythmController {...props} />;
    case "wheel-echo": return <WheelEcho {...props} />;
    case "cover-return": return <CoverReturn {...props} />;
    case "constellation": return <Constellation {...props} />;
  }
}

export function V2PuzzleScene({ slug, armed, hintLevel, onDiscover, onArm }: V2PuzzleSceneProps) {
  const { locale } = useLocale();
  const level = V2_LEVEL_BY_SLUG.get(slug);
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

  if (!level) throw new RangeError(`Missing V2 production level for ${slug}`);
  const hints = controllerHints[level.controller][locale];
  return (
    <section className={`${styles.scene} ${styles[`chapter${level.chapter}`]} ${armed ? styles.isArmed : ""}`} style={palette} data-testid="puzzle-scene" data-scene-id={`v2-${String(level.id).padStart(3, "0")}-${slug}`} data-v2-level={String(level.id).padStart(3, "0")} data-v2-slug={slug}>
      <div className={styles.sceneTexture} aria-hidden="true" />
      <div className={styles.ambientMarks} aria-hidden="true">{level.visual.marks.map((mark, index) => <i
        key={index}
        data-shape={mark.shape}
        style={{ left: `${mark.x}%`, top: `${mark.y}%`, width: `${mark.size}px`, height: `${mark.size}px`, transform: `rotate(${mark.rotation}deg)` }}
      />)}</div>
      <header className={styles.levelHeader}><span>{String(level.id).padStart(3, "0")}</span><h2>{locale === "zh" ? level.title.zh : level.title.en}</h2></header>
      <Controller level={level} locale={locale} solved={armed} onDiscover={discover} onArm={onArm} />
      {hintLevel > 0 && !armed ? <aside className={styles.hint} role="status"><span>{hints[0]}</span>{hintLevel > 1 ? <b>{hints[1]}</b> : null}{hintLevel > 2 ? <em>{locale === "zh" ? `答案：${level.solve}` : `Answer: ${hints[1]}`}</em> : null}</aside> : null}
      <p className={styles.solvedNote} aria-live="polite">{armed ? (locale === "zh" ? "抓到时间的破绽了" : "You found the crack in time") : ""}</p>
    </section>
  );
}
