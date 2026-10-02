"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Clock3, RotateCcw, Undo2 } from "lucide-react";
import { effectElapsedTime, type CheatEffectConfig } from "@/game/effects";
import { measureGame } from "@/game/timer";
import {
  REASONING_LEVELS, TRANSFERS, applyMove, findSolution, isSolved, moveLabel, projectLayers,
} from "@/game/reasoning-lab";
import styles from "./reasoning-lab.module.css";

const ASSIST: CheatEffectConfig = { type: "FULL_DILATION", timeScale: 0.5, label: "Research assist", labelZh: "研究辅助" };
type Phase = "idle" | "running" | "success" | "miss";
type TimingCue = "" | "landing" | "target" | "passed";
type Feedback = { kind: "source" } | { kind: "capacity" } | { kind: "undo" } | { kind: "move"; action: number; before: number[] };
type Snapshot = { values: number[]; history: number[][]; feedback: Feedback | null };

export function ReasoningLab() {
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [levelIndex, setLevelIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>({ values: [...REASONING_LEVELS[0].initial], history: [], feedback: null });
  const [hint, setHint] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<{ success: boolean; error: number } | null>(null);
  const [cue, setCue] = useState<TimingCue>("");
  const cueRef = useRef<TimingCue>("");
  const [flat, setFlat] = useState(false);
  const timer = useRef<HTMLOutputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const run = useRef<{ start: number; assist: boolean } | null>(null);
  const level = REASONING_LEVELS[levelIndex];
  const zh = locale === "zh";
  const solved = isSolved(level, snapshot.values);
  const projection = projectLayers(level, snapshot.values);
  const locked = phase !== "idle";
  const say = (cn: string, en: string) => zh ? cn : en;
  const feedback = snapshot.feedback;
  const feedbackText = !feedback ? "" : feedback.kind === "capacity"
    ? say("装不下了。接收的一格会超过 16。", "No room. The receiving well would exceed 16.")
    : feedback.kind === "source"
      ? say("送不出这么多。来源的一格不够。", "The source well does not hold enough.")
      : feedback.kind === "undo"
        ? say("回到了上一步。", "Restored the previous state.")
        : level.kind === "transfer"
          ? `${moveLabel(level, feedback.action, locale)}. ${feedback.before.join(" / ")} → ${snapshot.values.join(" / ")}`
          : `${moveLabel(level, feedback.action, locale)}. ${say("投影留下", "Projection leaves")} ${projection.lit.flatMap((lit, i) => lit ? [i] : []).join(", ") || say("无", "none")}`;
  const resultText = !result ? "" : result.success ? say("停住了。", "You stopped it.")
    : `${say("相差", "Difference")} ${(result.error / 1000).toFixed(3)}s`;

  useEffect(() => {
    if (phase !== "running") return;
    let frame = 0;
    const draw = () => {
      if (!run.current || document.hidden) return;
      const value = effectElapsedTime(performance.now() - run.current.start, run.current.assist ? ASSIST : null);
      if (timer.current) timer.current.textContent = (value / 1000).toFixed(2);
      // Semantic threshold changes only, never frame-by-frame React state.
      const nextCue = value > 10000 ? "passed" : value === 10000 ? "target" : value >= 9500 ? "landing" : "";
      if (nextCue !== cueRef.current) {
        cueRef.current = nextCue;
        setCue(nextCue);
      }
      frame = requestAnimationFrame(draw);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) draw();
    };
    draw();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [phase]);

  const reset = (index = levelIndex) => {
    run.current = null;
    setLevelIndex(index);
    setSnapshot({ values: [...REASONING_LEVELS[index].initial], history: [], feedback: null });
    setPhase("idle");
    setResult(null);
    cueRef.current = "";
    setCue("");
    setHint(0);
    if (timer.current) timer.current.textContent = "0.00";
    if (index !== levelIndex) heading.current?.focus();
  };

  const move = (action: number) => {
    if (locked) return;
    setSnapshot((current) => {
      const next = applyMove(level, current.values, action);
      if (next.blocked) return { ...current, feedback: { kind: next.blocked === "capacity" ? "capacity" : "source" } };
      return { values: next.state, history: [...current.history, current.values], feedback: { kind: "move", action, before: current.values } };
    });
  };

  const undo = () => {
    if (locked) return;
    setSnapshot((current) => current.history.length ? {
      values: current.history[current.history.length - 1],
      history: current.history.slice(0, -1),
      feedback: { kind: "undo" },
    } : current);
  };

  const mainAction = () => {
    if (phase === "running" && run.current) {
      // Measure synchronously from the event time, never from a displayed frame.
      const elapsed = effectElapsedTime(performance.now() - run.current.start, run.current.assist ? ASSIST : null);
      const measurement = measureGame(elapsed);
      run.current = null;
      if (timer.current) timer.current.textContent = (elapsed / 1000).toFixed(2);
      setResult({ success: measurement.success, error: measurement.absoluteErrorMs });
      setPhase(measurement.success ? "success" : "miss");
    } else if (phase === "success") {
      reset((levelIndex + 1) % REASONING_LEVELS.length);
    } else if (phase === "miss") {
      setPhase("idle");
      setResult(null);
      cueRef.current = "";
      setCue("");
      if (timer.current) timer.current.textContent = "0.00";
    } else {
      run.current = { start: performance.now(), assist: solved };
      setResult(null);
      cueRef.current = "";
      setCue("");
      setPhase("running");
    }
  };

  const solution = hint === 3 ? findSolution(level, snapshot.values) : null;
  const hintText = hint === 3
    ? solution === null
      ? say("当前无解，可以撤销或重置。", "No solution from here. Undo or reset.")
      : solution.length === 0
        ? say("关系已经成立，可以尝试停表。", "The relation holds. Try the timer.")
        : solution.map((action) => moveLabel(level, action, locale)).join(" → ")
    : hint > 0 ? level.hints[hint - 1][locale] : "";

  return (
    <main className={styles.root} data-flat={flat} lang={zh ? "zh-Hans" : "en"}>
      <header className={styles.header}>
        <span className={styles.brand}><Clock3 aria-hidden="true" size={21} />TIME HACKER</span>
        <button type="button" className={styles.textButton} onClick={() => setLocale(zh ? "en" : "zh")}>{zh ? "English" : "中文"}</button>
      </header>
      <div className={styles.intro}>
        <h1 ref={heading} tabIndex={-1}>{level.title[locale]}</h1>
        <p>{level.kind === "transfer"
          ? say("让三处时间都落在 10。", "Bring all three wells to 10.")
          : say("让最后的投影只留下 10。", "Leave only 10 in the final projection.")}</p>
      </div>
      <section className={styles.table} aria-label={say("时间装置", "Time mechanism")} data-solved={solved}>
        <div className={styles.scene}>
          {level.kind === "transfer" ? (
            <>
              <div className={styles.wells}>
                {snapshot.values.map((value, index) => (
                  <div className={styles.well} key={index} style={{ "--fill": value / 16 } as CSSProperties} data-aligned={value === 10}>
                    <div className={styles.wellTop}><b>{"ABC"[index]}</b><span>{say("上限", "max")} 16</span></div>
                    <div className={styles.vessel} aria-hidden="true"><i /><span className={styles.targetMark}>10</span></div>
                    <output aria-label={`${"ABC"[index]} ${say("储格", "well")}`} className={styles.value}>{value}<small>s</small></output>
                  </div>
                ))}
              </div>
              <div className={styles.transfers}>
                {TRANSFERS.map((edge, index) => (
                  <button type="button" key={index} disabled={locked} onClick={() => move(index)} aria-label={moveLabel(level, index, locale)}>
                    <span>{"ABC"[edge.from]}<ArrowRight size={18} aria-hidden="true" />{"ABC"[edge.to]}</span>
                    <b>{edge.amount}<small>s</small></b>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.layers}>
              <div className={styles.ruler} aria-hidden="true"><span />{Array.from({ length: 12 }, (_, i) => <span key={i}>{i}</span>)}</div>
              {projection.masks.map((mask, row) => (
                <div className={styles.layerGroup} key={row}>
                  <div className={styles.paperRow} role="img" aria-label={`${say("纸层", "Layer")} ${"ABC"[row]}: ${Array.from({ length: 12 }, (_, i) => (mask >> i) & 1 ? i : null).filter((i) => i !== null).join(", ")}`}>
                    <b>{"ABC"[row]}</b>{Array.from({ length: 12 }, (_, bit) => <i key={bit} data-lit={Boolean((mask >> bit) & 1)} aria-hidden="true" />)}
                  </div>
                  <div className={styles.shiftControls}>
                    <button type="button" aria-label={moveLabel(level, row * 2, locale)} disabled={locked} onClick={() => move(row * 2)}><ArrowLeft aria-hidden="true" size={18} />{say("左移", "Left")}</button>
                    <button type="button" aria-label={moveLabel(level, row * 2 + 1, locale)} disabled={locked} onClick={() => move(row * 2 + 1)}>{say("右移", "Right")}<ArrowRight aria-hidden="true" size={18} /></button>
                  </div>
                </div>
              ))}
              <div className={styles.projectionLabel}>{say("投影 · 数字表示叠加数量", "Projection · numbers count overlapping signals")}</div>
              <div className={styles.ruler} aria-hidden="true"><span />{Array.from({ length: 12 }, (_, i) => <span key={i}>{i}</span>)}</div>
              <div className={styles.projected} role="img" aria-label={`${say("投影亮起的位置", "Lit projection slots")}: ${projection.lit.flatMap((value, i) => value ? [i] : []).join(", ") || say("无", "none")}. ${say("各位置叠加数量", "Signal counts by slot")}: ${projection.counts.map((count, i) => `${i}: ${count}`).join(", ")}`}>
                <b aria-hidden="true">Σ</b>{projection.lit.map((value, i) => <span key={i} data-lit={Boolean(value)} data-target={i === 10} aria-hidden="true">{projection.counts[i]}</span>)}
              </div>
            </div>
          )}
        </div>
        <div className={styles.observation} role="status" aria-live="polite">
          {solved ? say("关系成立。时间可以慢下来了。", "The relation holds. Time can now slow down.") : feedbackText || "\u00a0"}
        </div>
        <div className={styles.tools}>
          <button type="button" onClick={undo} disabled={locked || snapshot.history.length === 0}><Undo2 size={17} aria-hidden="true" />{say("撤销", "Undo")}</button>
          <button type="button" onClick={() => reset()} disabled={phase === "running"}><RotateCcw size={16} aria-hidden="true" />{say("重置", "Reset")}</button>
          <button type="button" onClick={() => setHint((value) => Math.min(3, value + 1))} disabled={hint === 3 || phase === "running"}>
            {hint === 0 ? say("线索", "Hint") : hint === 1 ? say("再想一想", "Another hint") : say("显示答案", "Reveal answer")}
          </button>
        </div>
        {hint > 0 ? <aside className={styles.hint} aria-label={say("主动请求的提示", "Requested hint")}><p>{hintText}</p><button type="button" onClick={() => setHint(0)}>{say("收起", "Hide")}</button></aside> : null}
        <div className={styles.timerBlock}>
          <div className={styles.clock}>
            <span>{say("停在", "Stop at")} 10.00</span>
            <div><output ref={timer} aria-label={say("计时器", "Timer")} aria-live="off">0.00</output><small>s</small></div>
          </div>
          <button type="button" className={styles.mainAction} onClick={mainAction}>
            {phase === "running" ? say("停止", "Stop") : phase === "success" ? say("下一个样本", "Next sample") : phase === "miss" ? say("重试", "Retry") : say("开始", "Start")}
          </button>
          <p className={styles.result} role="status">{resultText || (phase === "running" ? say("谜面暂时固定，专心停表。", "The mechanism is fixed during this run.") : "\u00a0")}</p>
          <span className={styles.srOnly} role="status" aria-live="assertive">{phase === "running" ? cue === "passed" ? say("已超过 10", "Past 10") : cue === "target" ? "10.00" : cue === "landing" ? say("接近 10", "Approaching 10") : "" : ""}</span>
        </div>
      </section>
      <footer className={styles.review}>
        <p>{say("隔离玩法样本，不记录正式成绩。", "Isolated gameplay samples. No official scores are saved.")}</p>
        <nav aria-label={say("研究样本", "Research samples")}>
          {REASONING_LEVELS.map((item, index) => <button type="button" key={item.id} aria-pressed={index === levelIndex} disabled={phase === "running"} onClick={() => reset(index)}>{item.id} {item.title[locale]}</button>)}
        </nav>
        <label><input type="checkbox" checked={flat} onChange={(event) => setFlat(event.target.checked)} />{say("关闭空间外观", "Disable depth styling")}</label>
      </footer>
    </main>
  );
}
