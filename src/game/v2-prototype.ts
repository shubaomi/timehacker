export const PROTOTYPE_PHASES = [
  "DORMANT",
  "DISCOVERED",
  "ARMED",
  "RUNNING_NORMAL",
  "RUNNING_ASSISTED",
  "RESULT",
] as const;

export type PrototypePhase = (typeof PROTOTYPE_PHASES)[number];
export type PrototypeLevel = "001" | "003" | "100";

export interface TracePoint {
  x: number;
  y: number;
}

export interface PrototypeTimerSnapshot {
  time: string;
  delta: string | null;
}

export const SLOW_WORD_CANDIDATES = [
  ["F", "M", "S", "P"],
  ["A", "L", "I", "O"],
  ["S", "R", "O", "W"],
  ["T", "E", "W", "N"],
] as const;

export function nextSlowWordLetter(index: number, current: string, direction: number): string {
  const candidates = SLOW_WORD_CANDIDATES[index];
  if (!candidates) return current;
  const currentIndex = Math.max(0, candidates.findIndex((letter) => letter === current));
  const nextIndex = (currentIndex + direction + candidates.length * 4) % candidates.length;
  return candidates[nextIndex];
}

export function getPrototypeTimer(
  phase: PrototypePhase,
  assistedResult: boolean,
): PrototypeTimerSnapshot {
  switch (phase) {
    case "RUNNING_NORMAL":
      return { time: "6.28", delta: null };
    case "RUNNING_ASSISTED":
      return { time: "9.98", delta: null };
    case "RESULT":
      return assistedResult
        ? { time: "10.00", delta: "+0.00" }
        : { time: "8.42", delta: "−1.58" };
    default:
      return { time: "0.00", delta: null };
  }
}

function distance(a: TracePoint, b: TracePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function evaluateVTrace(points: readonly TracePoint[]): boolean {
  if (points.length < 5) return false;
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return false;

  const bottomIndex = points.reduce(
    (bestIndex, point, index) => (point.y > points[bestIndex].y ? index : bestIndex),
    0,
  );
  const bottom = points[bottomIndex];
  const leftLeg = points.slice(0, bottomIndex + 1);
  const rightLeg = points.slice(bottomIndex);
  const hasUsefulSpan = last.x - first.x >= 55 && bottom.y - Math.min(first.y, last.y) >= 45;
  const startsHighLeft = first.x <= 35 && first.y <= 40;
  const turnsLowNearCenter = bottom.x >= 28 && bottom.x <= 72 && bottom.y >= 62;
  const endsHighRight = last.x >= 65 && last.y <= 40;
  const leftDirection = leftLeg.filter((point, index) => index > 0 && point.x >= leftLeg[index - 1].x - 8).length;
  const rightDirection = rightLeg.filter((point, index) => index > 0 && point.x >= rightLeg[index - 1].x - 8).length;

  return (
    hasUsefulSpan &&
    startsHighLeft &&
    turnsLowNearCenter &&
    endsHighRight &&
    leftDirection >= Math.max(1, leftLeg.length - 2) &&
    rightDirection >= Math.max(1, rightLeg.length - 2)
  );
}

export function evaluateFigureEightTrace(points: readonly TracePoint[]): boolean {
  if (points.length < 8) return false;
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || distance(first, last) > 18) return false;

  const visitsLeft = points.some((point) => point.x <= 30);
  const visitsRight = points.some((point) => point.x >= 70);
  const centerVisits = points.filter((point) => distance(point, { x: 50, y: 50 }) <= 14).length;
  const visitsTop = points.some((point) => point.y <= 30);
  const visitsBottom = points.some((point) => point.y >= 70);
  return visitsLeft && visitsRight && visitsTop && visitsBottom && centerVisits >= 3;
}

export function pointFromPointer(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
): TracePoint {
  return {
    x: Math.max(0, Math.min(100, ((clientX - rect.left) / Math.max(rect.width, 1)) * 100)),
    y: Math.max(0, Math.min(100, ((clientY - rect.top) / Math.max(rect.height, 1)) * 100)),
  };
}
