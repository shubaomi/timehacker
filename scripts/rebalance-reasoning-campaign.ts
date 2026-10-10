/** Offline authoring tool. No database, random runtime puzzles or production solver. */
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { actions, solve, solved, transition, type Level, type Puzzle } from "../src/game/reasoning-campaign/engine";

const baseline = execFileSync("git", ["show", "279d709:src/game/reasoning-campaign/catalog.ts"], { encoding: "utf8" });
const original = JSON.parse(baseline.slice(baseline.indexOf("[\n"), baseline.lastIndexOf("]") + 1).replace(/,\s*([}\]])/g, "$1")) as Level[];
const sequence = [
  1,2,31,4,41,61,51,3,9,32,
  6,42,21,62,52,33,12,5,43,13,
  22,34,63,53,14,44,23,35,15,64,
  54,45,24,36,16,65,55,46,25,17,
  37,56,26,47,66,18,27,38,57,48,
  19,67,28,39,49,58,8,29,68,50,
  71,76,30,59,69,84,72,81,77,70,
  60,85,73,82,79,93,74,86,83,91,
  75,87,40,88,97,92,78,89,94,96,
  80,95,98,10,90,11,99,20,7,100,
];
if (new Set(sequence).size !== 100) throw new Error("Invalid authored order");
const ranges: Record<Puzzle["kind"], number[][]> = {
  flow: [[3,6],[4,8],[5,10],[6,12],[7,14]],
  paper: [[2,4],[4,6],[5,8],[6,10],[7,12]],
  gears: [[2,4],[4,6],[5,8],[6,10],[7,12]],
  weave: [[2,3],[3,4],[4,5],[4,6],[5,7]],
  route: [[4,7],[6,10],[9,13],[10,16],[12,20]],
  order: [[2,3],[3,4],[4,6],[5,7],[6,9]],
};
const letters = "ABCD";
const routeNames = ["向上", "向右", "向下", "向左"];
function moveName(p: Puzzle, action: number, en = false) {
  if (p.kind === "flow") { const e = p.edges[action]; return `${letters[e.from]} → ${letters[e.to]} (${e.amount}s)`; }
  if (p.kind === "paper") return `${letters[Math.floor(action/2)]} ${en ? action%2 ? "right" : "left" : action%2 ? "右移" : "左移"}`;
  if (p.kind === "gears") return `${en ? "axle" : "轴"} ${Math.floor(action/2)+1} ${action%2 ? "+" : "−"}`;
  if (p.kind === "order") return [...p.cycles[action], p.cycles[action][0]].map(i=>i+1).join(" → ");
  if (p.kind === "weave") return `${en ? "cell" : "格"} ${action+1}`;
  return en ? ["up", "right", "down", "left"][action] : routeNames[action];
}
function masks(size: number, style: "wrap" | "row" | "offset" | "opposite") {
  return Array.from({length:size*size}, (_,i) => {
    const r=Math.floor(i/size), c=i%size;
    const cells = new Set<number>([i]);
    if(style === "row" || style === "offset") for(let k=0;k<size;k++){cells.add(r*size+k);if(style==="offset")cells.add(k*size+(c+1)%size);}
    else for(const [dr,dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      if(style==="wrap" && size===3 && (dr<0 || dc<0))continue;
      if(style==="wrap")cells.add(((r+dr+size)%size)*size+(c+dc+size)%size);
      else if(r+dr>=0&&r+dr<size&&c+dc>=0&&c+dc<size)cells.add((r+dr)*size+c+dc);
    }
    if(style==="opposite")cells.add(size*size-1-i);
    return [...cells].reduce((a,j)=>a|(1<<j),0);
  });
}
function refine(p: Puzzle, source: number) {
  if(p.kind === "flow") {
    if(source===2) p.capacity=[16,12,16];
    if(source===3) p.edges=[{from:0,to:1,amount:2},{from:1,to:2,amount:1},{from:2,to:0,amount:3}];
    if(source===12) p.edges[3]={from:3,to:1,amount:2};
    // These late puzzles used to repeat a short early solution with an inert
    // condition. Conditions are now placed on routes the solution must use.
    if([10,11,71,73,75,78,80].includes(source)) {
      const edge = p.edges.find(e=>e.when) ?? p.edges[0];
      edge.when = { cell: p.initial.length-1, min: 8, max: 12 };
    }
    if(source===10)p.edges[1].when={cell:0,min:6,max:14};
  }
  if(p.kind === "gears" && source===31) {
    p.initial=[8,9]; p.target=[10,10]; p.vectors=[[1,1],[1,0]];
  }
  if(p.kind === "order" && source===61) {
    p.initial=[3,1,2];p.target=[1,2,3];p.cycles=[[0,1],[1,2]];
  }
  if(p.kind === "route" && source===52) { p.rows=["SaA","##a","E.."];p.initial=[0,0];p.finalMask=0; }
  if(p.kind === "route" && source===53) { p.rows=["S..a","###A","E..."];p.initial=[0,0];p.finalMask=1; }
  if(p.kind === "weave") {
    if(source===42)p.masks=masks(3,"wrap");
    if(source===43)p.masks=masks(3,"row");
    if(source===49)p.masks=masks(4,"offset");
    if(source===84)p.masks=masks(4,"wrap");
    if(source===86)p.masks=masks(4,"opposite");
    if(source===96) {p.masks=masks(4,"opposite").map((m,i)=>m^(1<<((i+5)%16)));}
  }
}

// Explore predecessor states, so every candidate has a constructive route to
// its goal. Selection is deterministic and exported as fixed authored data.
function candidates(p: Puzzle, end: number[], depth: number) {
  const queue=[{state:end,depth:0}], seen=new Set([end.join(",")]);
  for(let i=0;i<queue.length && queue.length<100000;i++) {
    const item=queue[i]; if(item.depth>=depth)continue;
    for(const action of actions(p)) {
      let prev=[...item.state];
      if(p.kind==="flow") {const e=p.edges[action];prev[e.from]+=e.amount;prev[e.to]-=e.amount;if(prev.some((n,j)=>n<0||n>p.capacity[j]))continue;}
      else if(p.kind==="order") {const c=p.cycles[action];c.forEach((at,j)=>{prev[at]=item.state[c[(j+1)%c.length]];});}
      else if(p.kind==="route") continue;
      else prev=transition(p,item.state,p.kind==="weave"?action:action^1).state;
      const check=transition(p,prev,action);
      if(check.blocked || check.state.join(",")!==item.state.join(","))continue;
      const key=prev.join(",");if(seen.has(key))continue;
      seen.add(key);queue.push({state:prev,depth:item.depth+1});
    }
  }
  return queue;
}
function conditionMatters(p: Puzzle) {
  if(p.kind!=="flow" || !p.edges.some(e=>e.when))return true;
  const plain={...p,edges:p.edges.map(({from,to,amount})=>({from,to,amount}))};
  const shortcut=solve(plain);if(!shortcut)return false;
  let state=p.initial;
  return shortcut.some(action=>{const next=transition(p,state,action);state=next.state;return next.blocked==="condition";});
}
const levels: Level[]=[];
const audit: string[]=[];
for(const [index, source] of sequence.entries()) {
  const l=structuredClone(original[source-1]); l.ordinal=index+1;
  if(source===42)l.title={zh:"边界接回来",en:"Across the boundary"};
  if(source===86)l.title={zh:"对面的回声",en:"Echoes opposite"};
  const p=l.puzzle;refine(p,source);
  const tier=Math.floor(index/20), [lo,hi]=ranges[p.kind][tier];
  let path=solve(p);
  if(source!==1 && source!==100 && p.kind!=="route" && (!path || path.length<lo || path.length>hi || !conditionMatters(p))) {
    let end=p.kind==="flow"||p.kind==="gears"||p.kind==="order" ? p.target : p.kind==="weave" ? [p.target] : null;
    if(!end && path){end=p.initial;for(const a of path)end=transition(p,end,a).state;}
    if(!end)throw new Error(`Missing goal ${source}`);
    const wanted=Math.min(hi,lo+index%3);
    const choices=candidates(p,end,hi).filter(c=>c.depth>=lo&&c.depth<=hi).sort((a,b)=>Math.abs(a.depth-wanted)-Math.abs(b.depth-wanted));
    const choice=choices.find(c=>{
      if(source===2 && p.kind==="flow" && !c.state.some((n,j)=>n===p.capacity[j]))return false;
      const candidate={...p,initial:c.state};
      const solution=solve(candidate);
      return solution && solution.length>=lo && solution.length<=hi && conditionMatters(candidate);
    });
    if(!choice)throw new Error(`Cannot tune source ${source}, tier ${tier+1}`);
    p.initial=choice.state;path=solve(p);
  }
  if(!path || path.length<2 || solved(p,p.initial))throw new Error(`Invalid ${index+1}`);
  const target="target" in p && Array.isArray(p.target) ? p.target.join(" / ") : "";
  const explanation = p.kind==="flow" ? [`各格目标为 ${target}；转移量固定，腾出的空位也属于解法。`, `Targets: ${target}. Transfers are fixed amounts; free capacity is part of the solution.`]
    : p.kind==="gears" ? [`目标刻度 ${target}。每条轴标明所有联动量；跨过 11 会回到 0。`, `Target marks: ${target}. Read every axle's coupled changes; after 11 comes 0.`]
    : p.kind==="paper" ? [p.coupling ? "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。" : "先将两层的共同墨点相消，只留下目标位置；偶数次重叠会消失。", p.coupling ? "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection." : "Cancel shared ink and leave only the target marks. Even overlaps disappear."]
    : p.kind==="weave" ? [`观察格 ${path[0]+1} 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。`, `Inspect cell ${path[0]+1}'s affected cells. Overlaps flipped twice return to their original state; do not fix cells independently.`]
    : p.kind==="order" ? [`页片沿箭头循环；目标顺序为 ${target}。可以暂时移动已经归位的页片。`, `Pages cycle along each arrow. Target order: ${target}. A correct page may need to move temporarily.`]
    : [`先看 ${p.rows.join("").includes("b") ? "多组" : "同字母"}开关与门；走到 E 还必须满足下方最终门状态。`, "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."];
  l.lesson={zh:explanation[0],en:explanation[1]};
  l.counter={zh:`从初始布局可先尝试 ${moveName(p,path[0])}，再考虑 ${moveName(p,path[1])}。观察两步之间的关系；这不是自动解答。`,en:`From the initial layout, try ${moveName(p,path[0],true)}, then consider ${moveName(p,path[1],true)}. Compare their effects; the puzzle still needs your solution.`};
  l.misconception={zh:"只追求眼前对齐，忽略其他位置的联动或最终约束。",en:"A locally correct move can disturb another position or the final constraints."};
  levels.push(l);
  audit.push(`| ${l.ordinal} | ${l.title.zh} | ${p.kind} | ${source} | ${path.length} | ${tier+1} |`);
}
const rules=new Set<string>();
for(const l of levels) {
  const {initial: _initial,target: _target,...rule}=l.puzzle as Puzzle & {target?: unknown};
  void _initial;void _target;
  const key=JSON.stringify(rule);
  if(rules.has(key))throw new Error(`Repeated rule ${l.ordinal}`);rules.add(key);
}
console.log(audit.join("\n"));
if(process.argv.includes("--write")) {
  await writeFile("src/game/reasoning-campaign/catalog.ts", `import type { Level } from "./engine";\n\n/** Fixed authored curriculum. See docs/contracts/reasoning-100-revised/. */\nexport const REASONING_CAMPAIGN: readonly Level[] = ${JSON.stringify(levels,null,2)};\n`);
  await mkdir("docs/contracts/reasoning-100-revised",{recursive:true});
  for(let chapter=0;chapter<10;chapter++) await writeFile(`docs/contracts/reasoning-100-revised/chapter-${String(chapter+1).padStart(2,"0")}.md`, `# 第 ${chapter+1} 组：交错复习与逐步联动\n\n固定关卡定义；原历史数值见 reasoning-100，当前验收以本版为准。\n\n`+levels.slice(chapter*10,chapter*10+10).map(l=>`## ${l.ordinal} ${l.title.zh}\n\n规则解释：${l.lesson.zh}\n\n第三级提示：${l.counter.zh}\n\n\`\`\`json\n${JSON.stringify(l.puzzle)}\n\`\`\`\n`).join("\n"));
  await writeFile("docs/contracts/reasoning-100-revised/audit.md", `# 全量编排清单\n\n来源：279d709 的100关；原序号仅用于追踪题目来源，线上slug及数据库ID仍对应现序号，旧解锁保留。六种规则族，不宣称100种玩法。步数是最短操作数，不是人类难度评分。\n\n| 现序号 | 名称 | 规则族 | 原题 | 最短步数 | 梯度段 |\n| --- | --- | --- | --- | --- | --- |\n${audit.join("\n")}\n`);
}
