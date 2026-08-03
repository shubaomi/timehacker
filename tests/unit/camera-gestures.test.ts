import { describe, expect, it } from "vitest";
import {
  advanceCameraGesture,
  INITIAL_CAMERA_GESTURE_STATE,
  type CameraGesture,
  type CameraGestureFrame,
  type CameraGestureState,
} from "@/game/camera-gestures";

function run(gesture: CameraGesture, frames: CameraGestureFrame[]) {
  return frames.reduce<CameraGestureState>(
    (state, frame) => advanceCameraGesture(gesture, state, frame),
    INITIAL_CAMERA_GESTURE_STATE,
  );
}

function landmarks(index: { x: number; y: number }, thumb = { x: 0.8, y: 0.8 }) {
  return Array.from({ length: 21 }, (_, landmarkIndex) => (
    landmarkIndex === 8 ? index : landmarkIndex === 4 ? thumb : { x: 0.5, y: 0.5 }
  ));
}

describe("camera gesture recognition", () => {
  it("recognizes a closed air loop from fingertip landmarks", () => {
    const frames = Array.from({ length: 25 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 24;
      return {
        at: index * 100,
        landmarks: landmarks({ x: 0.5 + Math.cos(angle) * 0.2, y: 0.5 + Math.sin(angle) * 0.2 }),
      };
    });
    expect(run("air-loop", frames).complete).toBe(true);
  });

  it("recognizes an air zigzag without accepting a short straight movement", () => {
    const zigzag = [
      [0.18, 0.3], [0.35, 0.24], [0.52, 0.18], [0.37, 0.33], [0.22, 0.48],
      [0.4, 0.37], [0.58, 0.26], [0.41, 0.42], [0.24, 0.57], [0.43, 0.45], [0.62, 0.34],
    ].map(([x, y], index) => ({ at: index * 100, landmarks: landmarks({ x, y }) }));
    const straight = [0.2, 0.3, 0.4, 0.5, 0.6].map((x, index) => ({
      at: index * 100,
      landmarks: landmarks({ x, y: 0.4 }),
    }));
    expect(run("air-zigzag", zigzag).complete).toBe(true);
    expect(run("air-zigzag", straight).complete).toBe(false);
  });

  it.each([
    ["open-palm", "Open_Palm"],
    ["victory", "Victory"],
  ] as const)("requires a stable %s pose", (gesture, label) => {
    expect(run(gesture, [
      { at: 0, label, score: 0.9 },
      { at: 700, label, score: 0.9 },
    ]).complete).toBe(true);
    expect(run(gesture, [
      { at: 0, label, score: 0.9 },
      { at: 200, label: "None", score: 0.9 },
    ]).complete).toBe(false);
  });

  it("requires a fist followed by an open palm", () => {
    expect(run("fist-open", [
      { at: 0, label: "Closed_Fist", score: 0.9 },
      { at: 400, label: "Closed_Fist", score: 0.9 },
      { at: 500, label: "Open_Palm", score: 0.9 },
      { at: 1_000, label: "Open_Palm", score: 0.9 },
    ]).complete).toBe(true);
  });

  it("requires a held pinch that travels across the frame", () => {
    expect(run("pinch-drag", [
      { at: 0, landmarks: landmarks({ x: 0.3, y: 0.4 }, { x: 0.31, y: 0.4 }) },
      { at: 200, landmarks: landmarks({ x: 0.55, y: 0.4 }, { x: 0.56, y: 0.4 }) },
    ]).complete).toBe(true);
    expect(run("pinch-drag", [
      { at: 0, landmarks: landmarks({ x: 0.3, y: 0.4 }, { x: 0.31, y: 0.4 }) },
      { at: 200, landmarks: landmarks({ x: 0.55, y: 0.4 }, { x: 0.8, y: 0.4 }) },
    ]).complete).toBe(false);
  });
});
