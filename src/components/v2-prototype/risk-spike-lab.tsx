"use client";

import { Check, CircleDashed, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { evaluateFigureEightTrace, pointFromPointer, type TracePoint } from "@/game/v2-prototype";
import type { Locale } from "@/i18n/config";
import styles from "./prototype-lab.module.css";

function SpikeShell({ id, title, risk, done, children }: {
  id: string;
  title: string;
  risk: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className={`${styles.spikeCard} ${done ? styles.spikeCardDone : ""}`} data-testid={`spike-${id}`}>
      <header>
        <span>{id}</span>
        <div><h3>{title}</h3><p>{risk}</p></div>
        {done ? <Check aria-label="Verified / 通过" size={18} /> : <CircleDashed aria-hidden="true" size={18} />}
      </header>
      <div className={styles.spikeSurface}>{children}</div>
    </article>
  );
}

function RangeSpike({ id, title, risk, label, target = 50, visual }: {
  id: string;
  title: string;
  risk: string;
  label: string;
  target?: number;
  visual: "cross" | "horizon" | "lens" | "rhythm";
}) {
  const [value, setValue] = useState(12);
  const done = Math.abs(value - target) <= 5;
  return (
    <SpikeShell id={id} title={title} risk={risk} done={done}>
      <div className={`${styles.spikeVisual} ${styles[`spike_${visual}`]}`} style={{ "--spike-value": `${value}%` } as React.CSSProperties} aria-hidden="true"><i /><b /><em /></div>
      <label>{label}<input type="range" min="0" max="100" value={value} onChange={(event) => setValue(Number(event.target.value))} /></label>
    </SpikeShell>
  );
}

function BeatSpike({ locale }: { locale: Locale }) {
  const [beats, setBeats] = useState(0);
  return (
    <SpikeShell id="021" title={locale === "zh" ? "三拍热身" : "Three-Beat Warmup"} risk={locale === "zh" ? "视觉节拍是否可读" : "Readable visual timing"} done={beats >= 3}>
      <div className={styles.beatFrame} aria-hidden="true"><i /><i /><i /></div>
      <button type="button" onClick={() => setBeats((value) => Math.min(3, value + 1))}>{locale === "zh" ? `回应交会 ${beats}/3` : `Meet the frame ${beats}/3`}</button>
    </SpikeShell>
  );
}

function CoverSpike({ locale }: { locale: Locale }) {
  const [covered, setCovered] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <SpikeShell id="040" title={locale === "zh" ? "标签返回" : "Tab Return"} risk={locale === "zh" ? "页面内路线不能丢进度" : "In-page route keeps state"} done={done}>
      <div className={`${styles.coverTicket} ${covered ? styles.coverTicketCovered : ""}`} aria-hidden="true"><span>↩</span><i /></div>
      <button type="button" onClick={() => {
        if (covered) setDone(true);
        setCovered((value) => !value);
      }}>{covered ? (locale === "zh" ? "揭开纸页" : "Uncover") : (locale === "zh" ? "盖住纸页" : "Cover page")}</button>
    </SpikeShell>
  );
}

function ConcurrentSpike({ locale }: { locale: Locale }) {
  const [held, setHeld] = useState(false);
  const [turns, setTurns] = useState(0);
  const done = turns >= 3;
  return (
    <SpikeShell id="054" title={locale === "zh" ? "双输入纸轴" : "Hybrid Console"} risk={locale === "zh" ? "并发输入不能形成死路" : "Concurrent input has no dead end"} done={done}>
      <div className={`${styles.axle} ${held ? styles.axleHeld : ""}`} aria-hidden="true"><i /></div>
      <div className={styles.spikeButtons}>
        <button
          type="button"
          aria-pressed={held}
          onPointerDown={() => setHeld(true)}
          onPointerUp={() => setHeld(false)}
          onPointerCancel={() => setHeld(false)}
          onKeyDown={(event) => { if (event.key === " ") setHeld(true); }}
          onKeyUp={(event) => { if (event.key === " ") setHeld(false); }}
        >{locale === "zh" ? "按住纸轴" : "Hold axle"}</button>
        <button type="button" onClick={() => held && setTurns((value) => Math.min(3, value + 1))}>{locale === "zh" ? `绕行 ${turns}/3` : `Wind ${turns}/3`}</button>
      </div>
    </SpikeShell>
  );
}

function EchoSpike({ locale }: { locale: Locale }) {
  const [echo, setEcho] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);
  return (
    <SpikeShell id="067" title={locale === "zh" ? "滚轮回声" : "Wheel Echo"} risk={locale === "zh" ? "局部滚动不能锁住整页" : "Local wheel must not trap page"} done={echo}>
      <div
        className={`${styles.echoWell} ${echo ? styles.echoWellDone : ""}`}
        tabIndex={0}
        role="application"
        aria-label={locale === "zh" ? "在此滚动或上下滑动" : "Wheel or swipe here"}
        onWheel={(event) => {
          event.preventDefault();
          if (timer.current !== null) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setEcho(true), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") setEcho(true);
        }}
      ><i /><b /></div>
    </SpikeShell>
  );
}

function FigureEightSpike({ locale }: { locale: Locale }) {
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [done, setDone] = useState(false);
  const drawing = useRef(false);
  const pointsRef = useRef<TracePoint[]>([]);
  const path = useMemo(() => points.map((point) => `${point.x},${point.y}`).join(" "), [points]);
  return (
    <SpikeShell id="069" title={locale === "zh" ? "档案八字" : "Archive Figure Eight"} risk={locale === "zh" ? "识别拓扑而不是像素描摹" : "Topology, not pixel matching"} done={done}>
      <svg
        className={styles.eightTrace}
        viewBox="0 0 100 100"
        role="application"
        aria-label={locale === "zh" ? "一笔画过左右两个闭合环" : "Draw both closed loops in one stroke"}
        tabIndex={0}
        onPointerDown={(event) => {
          drawing.current = true;
          const firstPoint = pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
          pointsRef.current = [firstPoint];
          setPoints([firstPoint]);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const nextPoints = [...pointsRef.current, pointFromPointer(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())];
          pointsRef.current = nextPoints;
          setPoints(nextPoints);
        }}
        onPointerUp={() => {
          drawing.current = false;
          setDone(evaluateFigureEightTrace(pointsRef.current));
        }}
      >
        <path d="M50 50 C20 0 0 30 10 55 C18 78 38 72 50 50 C62 28 82 22 90 45 C100 70 80 100 50 50" />
        <polyline points={path} />
      </svg>
      <button type="button" onClick={() => { pointsRef.current = []; setPoints([]); setDone(false); }}><RotateCcw size={14} aria-hidden="true" />{locale === "zh" ? "清除墨迹" : "Clear ink"}</button>
    </SpikeShell>
  );
}

function BraidSpike({ locale }: { locale: Locale }) {
  const [layers, setLayers] = useState(["down", "up", "down"]);
  const done = layers.join("-") === "up-down-up";
  return (
    <SpikeShell id="074" title={locale === "zh" ? "句子编织" : "Sentence Braid"} risk={locale === "zh" ? "透明层级必须快速可辨" : "Transparent layers stay legible"} done={done}>
      <div className={styles.sentenceBraid} aria-hidden="true">{layers.map((layer, index) => <i key={index} data-layer={layer}>{["FOLLOW", "THE", "GAP"][index]}</i>)}</div>
      <div className={styles.spikeButtons}>{layers.map((layer, index) => <button type="button" key={index} onClick={() => setLayers((current) => current.map((value, i) => i === index ? (value === "up" ? "down" : "up") : value))}>{index + 1} · {layer === "up" ? "↑" : "↓"}</button>)}</div>
    </SpikeShell>
  );
}

function PhaseSpike({ locale }: { locale: Locale }) {
  const [covered, setCovered] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!covered) return;
    const timer = window.setTimeout(() => setReady(true), 1_500);
    return () => window.clearTimeout(timer);
  }, [covered]);
  return (
    <SpikeShell id="085" title={locale === "zh" ? "相位返回" : "Phase Return"} risk={locale === "zh" ? "遮挡期间仍要看出时间继续" : "Time continues while covered"} done={done}>
      <div className={`${styles.moonPhase} ${covered ? styles.moonCovered : ""} ${ready ? styles.moonReady : ""}`} aria-hidden="true"><i /><b /></div>
      <button type="button" disabled={covered && !ready} onClick={() => {
        if (covered && ready) setDone(true);
        setCovered((value) => !value);
      }}>{covered ? (ready ? (locale === "zh" ? "现在揭开" : "Reveal now") : (locale === "zh" ? "相位仍在走…" : "Phase is moving…")) : (locale === "zh" ? "拉下盖纸" : "Pull cover")}</button>
    </SpikeShell>
  );
}

function ViewportSpike({ locale }: { locale: Locale }) {
  const [step, setStep] = useState(0);
  const actions = locale === "zh" ? ["收窄视口", "夹住点线", "展开视口"] : ["Narrow", "Clip dots", "Expand"];
  return (
    <SpikeShell id="089" title={locale === "zh" ? "设备编织" : "Device Braid"} risk={locale === "zh" ? "内部响应式重排必须稳定" : "Stable internal reflow"} done={step >= 3}>
      <div className={`${styles.paperViewport} ${step >= 1 ? styles.paperViewportNarrow : ""} ${step >= 3 ? styles.paperViewportWide : ""}`} aria-hidden="true"><i /><b /></div>
      <button type="button" onClick={() => setStep((value) => Math.min(3, value + 1))}>{actions[Math.min(step, 2)]}</button>
    </SpikeShell>
  );
}

function FinalSpike({ locale }: { locale: Locale }) {
  return (
    <SpikeShell id="100" title={locale === "zh" ? "静默星座" : "Silent Constellation"} risk={locale === "zh" ? "页面路线优先，摄像头只能增强" : "Page route first; camera optional"} done>
      <div className={styles.finalSpike} aria-hidden="true"><i /><i /><i /><b /></div>
      <p>{locale === "zh" ? "V 轨迹与 700ms 键盘路线已接入代表关；权限失败不会阻塞。" : "V trace and 700ms keyboard route live in the representative scene; permission failure never blocks."}</p>
    </SpikeShell>
  );
}

export function RiskSpikeLab({ locale }: { locale: Locale }) {
  const label = locale === "zh";
  return (
    <section className={styles.spikeLab} aria-labelledby="spike-lab-title">
      <div className={styles.spikeIntro}>
        <span>INTERACTION SPIKES</span>
        <h2 id="spike-lab-title">{label ? "高风险交互实验" : "High-risk interaction spikes"}</h2>
        <p>{label ? "这里只验证识别、容差和跨端路线，不代表最终关卡画面。" : "These test recognition, tolerance and cross-device routes—not final level art."}</p>
      </div>
      <div className={styles.spikeGrid}>
        <RangeSpike id="014" title={label ? "角点十字" : "Corner Cross"} risk={label ? "耦合双目标吸附" : "Coupled dual-target snap"} label={label ? "移动一条，两条共同接近中心" : "Move one; both approach center"} visual="cross" />
        <BeatSpike locale={locale} />
        <RangeSpike id="035" title={label ? "地平线偏移" : "Horizon Shift"} risk={label ? "视差不能变成像素微调" : "Parallax without pixel hunting"} label={label ? "移动观察高度" : "Move the viewpoint"} visual="horizon" />
        <CoverSpike locale={locale} />
        <RangeSpike id="044" title={label ? "焦点轨道" : "Focus Orbit"} risk={label ? "至少 44px 的观察吸附区" : "44px observation target"} label={label ? "移动透明焦点片" : "Move the focus lens"} target={76} visual="lens" />
        <ConcurrentSpike locale={locale} />
        <EchoSpike locale={locale} />
        <FigureEightSpike locale={locale} />
        <BraidSpike locale={locale} />
        <PhaseSpike locale={locale} />
        <ViewportSpike locale={locale} />
        <RangeSpike id="099" title={label ? "两种节奏的共同点" : "Relay Polyrhythm"} risk={label ? "视觉交点代替听觉考试" : "Visual intersections, no audio test"} label={label ? "移动六孔检查带" : "Move the six-hole strip"} target={62} visual="rhythm" />
        <FinalSpike locale={locale} />
      </div>
    </section>
  );
}
