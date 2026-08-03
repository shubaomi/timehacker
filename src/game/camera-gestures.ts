export const CAMERA_GESTURES = [
  "air-loop",
  "air-zigzag",
  "open-palm",
  "fist-open",
  "victory",
  "pinch-drag",
] as const;

export type CameraGesture = (typeof CAMERA_GESTURES)[number];

export interface CameraPoint {
  x: number;
  y: number;
}

export interface CameraGestureFrame {
  at: number;
  label?: string;
  score?: number;
  landmarks?: readonly CameraPoint[];
}

export interface CameraGestureState {
  points: CameraPoint[];
  lastSeenAt: number | null;
  stableSince: number | null;
  phase: "idle" | "primed";
  origin: CameraPoint | null;
  progress: number;
  complete: boolean;
}

export const INITIAL_CAMERA_GESTURE_STATE: CameraGestureState = {
  points: [],
  lastSeenAt: null,
  stableSince: null,
  phase: "idle",
  origin: null,
  progress: 0,
  complete: false,
};

function pointDistance(a: CameraPoint, b: CameraPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathLength(points: readonly CameraPoint[]) {
  return points.slice(1).reduce((sum, point, index) => sum + pointDistance(points[index], point), 0);
}

function bounds(points: readonly CameraPoint[]) {
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

function axisChanges(points: readonly CameraPoint[], axis: "x" | "y") {
  let previous = 0;
  let changes = 0;
  for (let index = 1; index < points.length; index += 1) {
    const delta = points[index][axis] - points[index - 1][axis];
    if (Math.abs(delta) < 0.025) continue;
    const direction = Math.sign(delta);
    if (previous && direction !== previous) changes += 1;
    previous = direction;
  }
  return changes;
}

function trackedPoints(state: CameraGestureState, tip: CameraPoint) {
  const previous = state.points.at(-1);
  if (previous && pointDistance(previous, tip) < 0.012) return state.points;
  return [...state.points, { x: tip.x, y: tip.y }].slice(-90);
}

function stableGesture(
  state: CameraGestureState,
  frame: CameraGestureFrame,
  label: string,
  durationMs: number,
) {
  if (frame.label !== label || (frame.score ?? 0) < 0.55) {
    return { ...state, stableSince: null, progress: 0 };
  }
  const stableSince = state.stableSince ?? frame.at;
  const progress = Math.min(1, (frame.at - stableSince) / durationMs);
  return { ...state, stableSince, progress, complete: progress >= 1 };
}

export function advanceCameraGesture(
  gesture: CameraGesture,
  state: CameraGestureState,
  frame: CameraGestureFrame,
): CameraGestureState {
  if (state.complete) return state;

  if (gesture === "open-palm") return stableGesture(state, frame, "Open_Palm", 650);
  if (gesture === "victory") return stableGesture(state, frame, "Victory", 650);

  if (gesture === "fist-open") {
    if (state.phase === "idle") {
      const priming = stableGesture(state, frame, "Closed_Fist", 350);
      return priming.complete
        ? { ...INITIAL_CAMERA_GESTURE_STATE, phase: "primed", progress: 0.5 }
        : { ...priming, progress: priming.progress * 0.5 };
    }
    const opening = stableGesture(state, frame, "Open_Palm", 450);
    return { ...opening, phase: "primed", progress: 0.5 + opening.progress * 0.5 };
  }

  if (gesture === "pinch-drag") {
    const thumb = frame.landmarks?.[4];
    const index = frame.landmarks?.[8];
    if (!thumb || !index) return { ...state, progress: state.phase === "primed" ? 0.45 : 0 };
    const pinched = pointDistance(thumb, index) < 0.07;
    const midpoint = { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
    if (state.phase === "idle") {
      return pinched ? { ...state, phase: "primed", origin: midpoint, progress: 0.45 } : state;
    }
    if (!pinched || !state.origin) return INITIAL_CAMERA_GESTURE_STATE;
    const distance = pointDistance(state.origin, midpoint);
    return { ...state, progress: Math.min(1, 0.45 + distance * 2.75), complete: distance >= 0.2 };
  }

  const tip = frame.landmarks?.[8];
  if (!tip) {
    return state.lastSeenAt !== null && frame.at - state.lastSeenAt > 500
      ? INITIAL_CAMERA_GESTURE_STATE
      : state;
  }
  const points = trackedPoints(state, tip);
  if (points.length < 4) {
    return { ...state, points, lastSeenAt: frame.at, progress: Math.min(0.2, points.length / 20) };
  }
  const travel = pathLength(points);
  const area = bounds(points);

  if (gesture === "air-loop") {
    const closure = pointDistance(points[0], points.at(-1)!);
    const shapeProgress = Math.min(0.92, travel / 1.35);
    const complete = points.length >= 18 && travel >= 1.05 && area.width >= 0.17 && area.height >= 0.17 && closure <= 0.13;
    return { ...state, points, lastSeenAt: frame.at, progress: complete ? 1 : shapeProgress, complete };
  }

  const xChanges = axisChanges(points, "x");
  const yChanges = axisChanges(points, "y");
  const complete = points.length >= 10 && travel >= 0.72 && area.width >= 0.18 && area.height >= 0.1 && xChanges >= 3 && yChanges >= 2;
  const progress = Math.min(0.95, (xChanges + yChanges) / 6);
  return { ...state, points, lastSeenAt: frame.at, progress: complete ? 1 : progress, complete };
}
