"use client";

import { useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Undo2 } from "lucide-react";
import { projection, solved, transition, type Level, type Block } from "@/game/reasoning-campaign/engine";
import styles from "./scene.module.css";

type Props = { level: Level; locale: "zh" | "en"; armed: boolean; hintLevel: number; onDiscover: () => void; onArm: () => void; slug?: string };

/** R100: one normal-flow paper board; related state changes, not a discovery password.
 * Daylight blue, navy marks, yellow targets; motion explains a transfer only.
 * Finish: finite-state tests, mobile/keyboard evidence and independent review.
 */
export function ReasoningScene({ level, locale, armed, hintLevel, onDiscover, onArm, slug }: Props) {
  const [state, setState] = useState([...level.puzzle.initial]);
  const [history, setHistory] = useState<number[][]>([]);
  const [blocked, setBlocked] = useState<Block>(null);
  const [inspected, setInspected] = useState<number | null>(null);
  const discovered = useRef(false);
  const puzzle = level.puzzle;
  const zh = locale === "zh";
  const say = (cn: string, en: string) => zh ? cn : en;
  const complete = armed || solved(puzzle, state);
  function move(action: number) {
    if (complete) return;
    if (!discovered.current) { discovered.current = true; onDiscover(); }
    const next = transition(puzzle, state, action);
    setBlocked(next.blocked);
    if (next.blocked) return;
    setHistory((previous) => [...previous, state].slice(-200));
    setState(next.state);
    if (solved(puzzle, next.state)) onArm();
  }
  const output = puzzle.kind === "paper" ? projection(puzzle, state) : null;
  const positions = (mask: number, count: number) => Array.from({ length: count }, (_, i) => mask & (1 << i) ? i+1 : null).filter((v) => v !== null).join(", ");
  const goal = puzzle.kind === "flow" ? say("让所有时间抵达标记。", "Bring every well to its mark.") : puzzle.kind === "gears" ? say("让每支指针对上自己的刻度。", "Bring each hand to its own mark.") : puzzle.kind === "weave" ? say("深色是当前，轮廓是目标。", "Dark is current; outlines show the target.") : puzzle.kind === "order" ? say("让页码回到对应位置。", "Return the pages to their matching positions.") : puzzle.kind === "route" ? say("把墨点送到 E，并留下指定的门状态。", "Bring the ink to E with the required gate states.") : say("让投影与轮廓重合。", "Match the projection to the outlines.");
  return <section className={styles.board} data-v2-slug={slug} data-testid="reasoning-scene" data-solved={complete} aria-label={level.title[locale]}>
    <header className={styles.intro}><h2>{level.title[locale]}</h2><p>{goal}</p></header>
    {puzzle.kind === "flow" ? <>
      <div className={styles.wells} style={{ "--count": state.length } as CSSProperties}>
        {state.map((value, i) => <div className={styles.well} key={i}>
          <div className={styles.caption}><b>{"ABCD"[i]}</b><span>{say("容量", "Capacity")} {puzzle.capacity[i]}</span></div>
          <div className={styles.vessel} aria-hidden="true"><i style={{ transform: `scaleY(${value / puzzle.capacity[i]})` }} /><b style={{ bottom: `${100 * puzzle.target[i] / puzzle.capacity[i]}%` }}>{puzzle.target[i]}</b></div>
          <output aria-label={`${"ABCD"[i]}: ${value}, ${say("目标", "target")} ${puzzle.target[i]}`}>{value}<small> / {puzzle.target[i]}</small></output>
        </div>)}
      </div>
      <div className={styles.controls}>{puzzle.edges.map((edge, i) => <button key={i} data-testid={`reasoning-action-${i}`} onClick={() => move(i)} disabled={complete}>
        <span>{"ABCD"[edge.from]} <ArrowRight size={16} aria-hidden="true" /> {"ABCD"[edge.to]}</span><b>{edge.amount}s</b>
        {edge.when ? <small>{"ABCD"[edge.when.cell]}: {edge.when.min}-{edge.when.max}</small> : null}
      </button>)}</div>
    </> : output && puzzle.kind === "paper" ? <>
      <div className={styles.ruler} aria-hidden="true"><span />{Array.from({ length: 12 }, (_, i) => <span key={i}>{i}</span>)}</div>
      {output.masks.map((mask, row) => <div key={row} className={styles.layer}>
        <div className={styles.strip} role="img" aria-label={`${"ABC"[row]}: ${Array.from({ length: 12 }, (_, i) => mask & (1 << i) ? i : null).filter((n) => n !== null).join(", ")}`}><b>{"ABC"[row]}</b>{Array.from({ length: 12 }, (_, i) => <i key={i} data-ink={Boolean(mask & (1 << i))} />)}</div>
        <div className={styles.shift}>{puzzle.coupling ? <small>{say("右移联动", "Right shift")}: {puzzle.coupling[row].map((delta, i) => `${"ABC"[i]} ${delta >= 0 ? "+" : ""}${delta}`).join(" / ")}</small> : null}{[0, 1].map((direction) => <button key={direction} data-testid={`reasoning-action-${row * 2 + direction}`} disabled={complete} onClick={() => move(row * 2 + direction)} aria-label={`${"ABC"[row]} ${direction ? say("右移", "right") : say("左移", "left")}`}>{direction ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}<span>{"ABC"[row]}</span></button>)}</div>
      </div>)}
      <p className={styles.legend}>{say("目标位置", "Target positions")}: {Array.from({length:12},(_,i)=>puzzle.target & (1<<i) ? i : null).filter(n=>n!==null).join(", ") || say("全空", "all blank")}{puzzle.targetCount ? ` · ${say("每个目标叠加", "Overlap at each target")}: ${puzzle.targetCount}` : ""}</p>
      <div className={styles.projection} role="img" aria-label={`${say("投影数量", "Projected counts")}: ${output.counts.join(", ")}; ${say("亮起", "lit")}: ${output.counts.flatMap((n,i) => n % 2 ? [i] : []).join(", ")}`}><b aria-hidden="true" />{output.counts.map((n,i) => <span key={i} data-ink={Boolean(n % 2)} data-target={Boolean(puzzle.target & (1 << i))}>{n}</span>)}</div>
    </> : null}
    {puzzle.kind === "gears" ? <>
      <div className={styles.dials}>{state.map((value,i) => <div key={i} className={styles.dialGroup}><b>{"ABCD"[i]}</b><div className={styles.dial} aria-hidden="true">{Array.from({ length: 12 }, (_, n) => <i key={n} style={{ transform: `rotate(${n*30}deg)` }} />)}<span className={styles.goalHand} style={{ transform: `rotate(${puzzle.target[i]*30}deg)` }} /><span className={styles.hand} style={{ transform: `rotate(${value*30}deg)` }} /></div><output aria-label={`${"ABCD"[i]}: ${value}, ${say("目标", "target")} ${puzzle.target[i]}`}>{value} <small>/ {puzzle.target[i]}</small></output></div>)}</div>
      <div className={styles.axles}>{puzzle.vectors.map((vector,row) => <div key={row}><p>{say("轴", "Axle")} {row+1}: {vector.map((d,i) => `${"ABCD"[i]} ${d>=0?"+":""}${d}`).join(" / ")}</p><div className={styles.tools}>{[0,1].map(direction=><button key={direction} data-testid={`reasoning-action-${row*2+direction}`} disabled={complete} onClick={()=>move(row*2+direction)} aria-label={`${say("轴", "Axle")} ${row+1} ${direction ? "+" : "-"}`}>{direction ? <ArrowRight size={18}/> : <ArrowLeft size={18}/>} {direction ? "+" : "-"}</button>)}</div></div>)}</div>
    </> : null}
    {puzzle.kind === "weave" ? <>
      <div className={styles.weave} style={{ "--size": puzzle.size } as CSSProperties}>{puzzle.masks.map((mask,i) => <button key={i} data-testid={`reasoning-action-${i}`} data-ink={Boolean(state[0] & (1 << i))} data-target={Boolean(puzzle.target & (1 << i))} data-affected={inspected !== null && Boolean(puzzle.masks[inspected] & (1 << i))} disabled={complete} onFocus={()=>setInspected(i)} onClick={()=>{setInspected(i);move(i);}} aria-label={`${i+1}: ${state[0] & (1<<i) ? say("深色", "dark") : say("空白", "blank")}; ${say("目标", "target")}: ${puzzle.target & (1<<i) ? say("深色", "dark") : say("空白", "blank")}; ${say("翻转", "flips")}: ${positions(mask,puzzle.size*puzzle.size)}`}><span>{i+1}</span><small>{puzzle.target & (1<<i) ? say("留", "on") : say("空", "off")}</small></button>)}</div>
      <p className={styles.legend}>{inspected !== null ? `${say("这一格会翻转", "This cell flips")}: ${positions(puzzle.masks[inspected],puzzle.size*puzzle.size)}` : say("尝试一格，观察哪些纸面一起翻转。", "Try a cell and observe which faces flip together.")}</p>
    </> : null}
    {puzzle.kind === "order" ? <>
      <div className={styles.pages}>{state.map((value,i)=><div key={i} data-aligned={value===puzzle.target[i]}><small>{say("位置", "Place")} {puzzle.target[i]}</small><output aria-label={`${say("位置", "Place")} ${i+1}: ${value}`}>{value}</output></div>)}</div>
      <div className={styles.folds}>{puzzle.cycles.map((cycle,i)=><button key={i} data-testid={`reasoning-action-${i}`} disabled={complete} onClick={()=>move(i)}>{[...cycle,cycle[0]].map(n=>n+1).join(" → ")}</button>)}</div>
      <p className={styles.legend}>{say("折痕沿箭头传递页片；最后一张回到首位。", "Each crease passes pages along its arrows; the last returns to the first.")}</p>
    </> : null}
    {puzzle.kind === "route" ? <>
      <div className={styles.route} style={{ "--size": puzzle.rows[0].length } as CSSProperties} tabIndex={0} role="group" aria-label={say("墨点通路，可用方向键移动", "Ink route. Use arrow keys to move")} onKeyDown={event=>{const a=["ArrowUp","ArrowRight","ArrowDown","ArrowLeft"].indexOf(event.key);if(a>=0){event.preventDefault();move(a);}}}>
        {puzzle.rows.join("").split("").map((cell,i)=><div key={i} role="img" data-wall={cell==="#"} data-gate={"ABC".includes(cell)} data-open={"ABC".includes(cell) && Boolean(state[1] & (1<<"ABC".indexOf(cell)))} aria-label={`${Math.floor(i/puzzle.rows[0].length)+1},${i%puzzle.rows[0].length+1}: ${cell==="#"?say("墙","wall"):cell==="."?say("通路","path"):"ABC".includes(cell)?`${say("门","gate")} ${cell} ${state[1] & (1<<"ABC".indexOf(cell))?say("开","open"):say("关","closed")}`:"abc".includes(cell)?`${say("开关","switch")} ${cell}`:cell}${state[0]===i?say(" 墨点"," ink"):""}`}><span>{cell!=="."&&cell!=="#"?cell:""}</span>{state[0]===i?<i aria-hidden="true"/>:null}</div>)}
      </div>
      <p className={styles.legend}>{say("小写是开关，大写是门；进入开关会切换门。同字母开关控制同一扇门。", "Lowercase switches toggle their uppercase gates on entry. Matching switches share the same gate.")}</p>
      <div className={styles.gates}>{[..."abc"].filter(letter=>puzzle.rows.join("").includes(letter)).map(letter=>{const bit=1<<"abc".indexOf(letter);return <span key={letter}>{letter.toUpperCase()} {state[1]&bit?say("开", "open"):say("关", "closed")} / {say("目标", "target")} {puzzle.finalMask&bit?say("开", "open"):say("关", "closed")}</span>;})}</div>
      <div className={styles.tools}>{[ArrowUp,ArrowRight,ArrowDown,ArrowLeft].map((Icon,i)=><button key={i} data-testid={`reasoning-action-${i}`} disabled={complete} onClick={()=>move(i)} aria-label={(zh?["向上","向右","向下","向左"]:["Up","Right","Down","Left"])[i]}><Icon size={20}/></button>)}</div>
    </> : null}
    <p className={styles.feedback} role="status">{complete ? say("关系成立。", "The relationship holds.") : blocked === "source" ? say("来源不够。试试另一条通路。", "Not enough at the source. Try another route.") : blocked === "capacity" ? say("接收处装不下。需要先留出空间。", "No room at the destination. Make space first.") : blocked === "condition" ? say("通路条件尚未满足。", "The route condition is not met.") : blocked === "wall" ? say("这里没有通路。", "There is no path here.") : ""}<span className={styles.srOnly}>{!complete && history.length > 0 ? `${say("当前状态", "Current state")}: ${state.join(", ")}` : ""}</span></p>
    {!complete ? <div className={styles.tools}><button disabled={!history.length} onClick={() => { setState(history.at(-1)!); setHistory(history.slice(0,-1)); setBlocked(null); }}><Undo2 size={16} />{say("撤销", "Undo")}</button><button onClick={() => { setState([...puzzle.initial]); setHistory([]); setBlocked(null); }}><RotateCcw size={16} />{say("重置机关", "Reset puzzle")}</button></div> : null}
    {hintLevel > 0 ? <aside className={styles.hint}>{hintLevel === 1 ? say("比较一次操作前后，哪些位置一起改变了。", "Compare the positions affected by a single move.") : hintLevel === 2 ? level.lesson[locale] : level.counter[locale]}</aside> : null}
  </section>;
}
