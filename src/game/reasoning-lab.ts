/** TH-R: independent research rules; never imported by the production campaign. */
type Text = { zh: string; en: string };
export interface ReasoningLevel {
  id: string;
  kind: "transfer" | "layers";
  title: Text;
  initial: readonly number[];
  masks?: readonly number[];
  hints: readonly [Text, Text];
}

const transferHints = [
  { zh: "操作一次，比较前后两个储格。", en: "Make one move. Compare both affected wells." },
  { zh: "总量没有变。有时要先离开 10，才能让三处一起到达。", en: "The total stays the same. A well may need to leave 10 before all three can reach it." },
] as const;
const layerHints = [
  { zh: "看一看投影上的数量和亮暗之间有什么关系。", en: "Compare each projected count with whether that slot is lit." },
  { zh: "两个信号相互抵消，三个会留下一个。最后只让 10 留下。", en: "Two signals cancel; three leave one. Leave only slot 10 lit." },
] as const;

export const REASONING_LEVELS: readonly ReasoningLevel[] = [
  { id: "A1", kind: "transfer", title: { zh: "借来的秒", en: "Borrowed seconds" }, initial: [8, 14, 8], hints: transferHints },
  { id: "A2", kind: "transfer", title: { zh: "满格之后", en: "No room left" }, initial: [6, 8, 16], hints: transferHints },
  { id: "B1", kind: "layers", title: { zh: "重叠的回声", en: "Overlapping echoes" }, initial: [0, 0, 0], masks: [73, 146, 194], hints: layerHints },
  { id: "B2", kind: "layers", title: { zh: "第三层", en: "The third layer" }, initial: [0, 0, 0], masks: [131, 13, 3176], hints: layerHints },
];

export const TRANSFERS = [
  { from: 0, to: 1, amount: 2 },
  { from: 1, to: 2, amount: 3 },
  { from: 2, to: 0, amount: 4 },
] as const;
export const WELL_CAPACITY = 16;

export function rotateMask(mask: number, offset: number): number {
  const shift = ((offset % 12) + 12) % 12;
  return ((mask << shift) | (mask >>> (12 - shift))) & 4095;
}

export function projectLayers(level: ReasoningLevel, state: readonly number[]) {
  const masks = (level.masks ?? []).map((mask, index) => rotateMask(mask, state[index]));
  const counts = Array.from({ length: 12 }, (_, bit) => masks.reduce((sum, mask) => sum + ((mask >>> bit) & 1), 0));
  return { masks, counts, lit: counts.map((count) => count % 2) };
}

export function isSolved(level: ReasoningLevel, state: readonly number[]): boolean {
  if (level.kind === "transfer") return state.length === 3 && state.every((value) => value === 10);
  return projectLayers(level, state).lit.every((value, index) => value === (index === 10 ? 1 : 0));
}

export function availableMoves(level: ReasoningLevel): number[] {
  return Array.from({ length: level.kind === "transfer" ? 3 : 6 }, (_, index) => index);
}

export function moveLabel(level: ReasoningLevel, move: number, locale: "zh" | "en"): string {
  if (level.kind === "transfer") {
    const edge = TRANSFERS[move];
    return `${"ABC"[edge.from]} → ${"ABC"[edge.to]} · ${edge.amount}s`;
  }
  return `${"ABC"[Math.floor(move / 2)]} ${locale === "zh" ? (move % 2 === 0 ? "左移" : "右移") : (move % 2 === 0 ? "left" : "right")}`;
}

export function applyMove(level: ReasoningLevel, state: readonly number[], move: number): { state: number[]; blocked: "source" | "capacity" | "invalid" | null } {
  const next = [...state];
  if (!availableMoves(level).includes(move)) return { state: next, blocked: "invalid" };
  if (level.kind === "transfer") {
    const { from, to, amount } = TRANSFERS[move];
    if (next[from] < amount) return { state: next, blocked: "source" };
    if (next[to] + amount > WELL_CAPACITY) return { state: next, blocked: "capacity" };
    next[from] -= amount;
    next[to] += amount;
  } else {
    const row = Math.floor(move / 2);
    next[row] = (next[row] + (move % 2 === 0 ? 11 : 1)) % 12;
  }
  return { state: next, blocked: null };
}

/** Bounded complete state search. Only requested by tests or an explicit answer request. */
export function findSolution(level: ReasoningLevel, initial: readonly number[]): number[] | null {
  const queue: { state: number[]; parent: number; move: number }[] = [{ state: [...initial], parent: -1, move: -1 }];
  const seen = new Set([initial.join(",")]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (isSolved(level, current.state)) {
      const path: number[] = [];
      for (let at = index; queue[at].parent !== -1; at = queue[at].parent) path.push(queue[at].move);
      return path.reverse();
    }
    for (const move of availableMoves(level)) {
      const next = applyMove(level, current.state, move);
      const key = next.state.join(",");
      if (next.blocked || seen.has(key)) continue;
      seen.add(key);
      queue.push({ state: next.state, parent: index, move });
    }
  }
  return null;
}
