/** R100: deterministic finite-state puzzles. No timers, DOM, storage or analytics. */
export type Text = { zh: string; en: string };
export type Condition = { cell: number; min: number; max: number };
export type Flow = { kind: "flow"; initial: number[]; target: number[]; capacity: number[]; edges: { from: number; to: number; amount: number; when?: Condition }[] };
export type Paper = { kind: "paper"; initial: number[]; masks: number[]; target: number; coupling?: number[][]; targetCount?: number };
export type Gears = { kind: "gears"; initial: number[]; target: number[]; vectors: number[][] };
export type Weave = { kind: "weave"; initial: number[]; target: number; size: number; masks: number[] };
export type Route = { kind: "route"; initial: number[]; rows: string[]; finalMask: number };
export type Order = { kind: "order"; initial: number[]; target: number[]; cycles: number[][] };
export type Puzzle = Flow | Paper | Gears | Weave | Route | Order;
export type Level = { ordinal: number; title: Text; lesson: Text; misconception: Text; counter: Text; puzzle: Puzzle };
export type Block = "source" | "capacity" | "condition" | "wall" | "invalid" | null;
export const mod = (value: number, base: number) => ((value % base) + base) % base;
export const rotate = (mask: number, offset: number) => {
  const shift = mod(offset, 12);
  return ((mask << shift) | (mask >>> (12 - shift))) & 4095;
};
export function projection(puzzle: Paper, state: readonly number[]) {
  const masks = puzzle.masks.map((mask, index) => rotate(mask, state[index]));
  const counts = Array.from({ length: 12 }, (_, bit) => masks.reduce((sum, mask) => sum + ((mask >>> bit) & 1), 0));
  return { masks, counts, mask: masks.reduce((a, b) => a ^ b, 0) };
}
export function actions(puzzle: Puzzle): number[] {
  const count = puzzle.kind === "flow" ? puzzle.edges.length : puzzle.kind === "gears" ? puzzle.vectors.length * 2 : puzzle.kind === "weave" ? puzzle.masks.length : puzzle.kind === "route" ? 4 : puzzle.kind === "order" ? puzzle.cycles.length : puzzle.initial.length * 2;
  return Array.from({ length: count }, (_, i) => i);
}
export function solved(puzzle: Puzzle, state: readonly number[]): boolean {
  if (state.length !== puzzle.initial.length || state.some((n) => !Number.isInteger(n))) return false;
  if (puzzle.kind === "flow" || puzzle.kind === "gears" || puzzle.kind === "order") return puzzle.target.every((value, i) => state[i] === value);
  if (puzzle.kind === "weave") return state[0] === puzzle.target;
  if (puzzle.kind === "route") return state[0] === puzzle.rows.join("").indexOf("E") && state[1] === puzzle.finalMask;
  const result = projection(puzzle, state);
  return result.mask === puzzle.target && (!puzzle.targetCount || result.counts.every((count, bit) => !(puzzle.target & (1 << bit)) || count === puzzle.targetCount));
}
export function transition(puzzle: Puzzle, state: readonly number[], action: number): { state: number[]; blocked: Block } {
  const next = [...state];
  if (!Number.isInteger(action) || !actions(puzzle).includes(action) || next.length !== puzzle.initial.length) return { state: next, blocked: "invalid" };
  if (puzzle.kind === "flow") {
    const { from, to, amount, when } = puzzle.edges[action];
    if (when && (next[when.cell] < when.min || next[when.cell] > when.max)) return { state: next, blocked: "condition" };
    if (next[from] < amount) return { state: next, blocked: "source" };
    if (next[to] + amount > puzzle.capacity[to]) return { state: next, blocked: "capacity" };
    next[from] -= amount;
    next[to] += amount;
  } else if (puzzle.kind === "paper") {
    const row = Math.floor(action / 2);
    const direction = action % 2 ? 1 : -1;
    for (let index = 0; index < next.length; index++) next[index] = mod(next[index] + direction * (puzzle.coupling?.[row][index] ?? (row === index ? 1 : 0)), 12);
  } else if (puzzle.kind === "gears") {
    const vector = puzzle.vectors[Math.floor(action / 2)];
    for (let i = 0; i < next.length; i++) next[i] = mod(next[i] + (action % 2 ? 1 : -1) * vector[i], 12);
  } else if (puzzle.kind === "weave") {
    next[0] ^= puzzle.masks[action];
  } else if (puzzle.kind === "order") {
    const cycle = puzzle.cycles[action];
    cycle.forEach((position, i) => { next[cycle[(i+1) % cycle.length]] = state[position]; });
  } else {
    const width = puzzle.rows[0].length;
    const row = Math.floor(state[0] / width) + [-1,0,1,0][action];
    const col = state[0] % width + [0,1,0,-1][action];
    const cell = puzzle.rows[row]?.[col];
    if (row < 0 || col < 0 || col >= width || !cell || cell === "#") return { state: next, blocked: "wall" };
    if ("ABC".includes(cell) && !(state[1] & (1 << "ABC".indexOf(cell)))) return { state: next, blocked: "condition" };
    next[0] = row * width + col;
    if ("abc".includes(cell)) next[1] ^= 1 << "abc".indexOf(cell);
  }
  return { state: next, blocked: null };
}
/** Offline authoring/test oracle; never called by production rendering. */
export function solve(puzzle: Puzzle, initial: readonly number[] = puzzle.initial, limit = 100_000): number[] | null {
  const queue = [{ state: [...initial], parent: -1, action: -1 }];
  const seen = new Set([initial.join(",")]);
  const moves = actions(puzzle);
  for (let i = 0; i < queue.length && i < limit; i++) {
    if (solved(puzzle, queue[i].state)) {
      const path: number[] = [];
      for (let j = i; queue[j].parent >= 0; j = queue[j].parent) path.push(queue[j].action);
      return path.reverse();
    }
    for (const action of moves) {
      const next = transition(puzzle, queue[i].state, action);
      const key = next.state.join(",");
      if (next.blocked || seen.has(key)) continue;
      seen.add(key);
      queue.push({ state: next.state, parent: i, action });
    }
  }
  return null;
}
