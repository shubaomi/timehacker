"use client";

import { useRef, useState } from "react";
import styles from "./director-corner-repair.module.css";

type DirectorCornerRepairProps = {
  locale: "zh" | "en";
  solved: boolean;
  onDiscover: () => void;
  onArm: () => void;
};

export function DirectorCornerRepair({ locale, solved, onDiscover, onArm }: DirectorCornerRepairProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [keyPosition, setKeyPosition] = useState({ x: 0, y: 0 });
  const [edgeProbed, setEdgeProbed] = useState(false);
  const [rejected, setRejected] = useState(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const targetRef = useRef<HTMLButtonElement>(null);

  const probeEdge = () => {
    if (solved) return;
    setEdgeProbed(true);
    setRejected(false);
    onDiscover();
  };

  const rejectPlacement = () => {
    setOffset({ x: 0, y: 0 });
    setKeyPosition({ x: 0, y: 0 });
    setRejected(true);
  };

  const finishPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const moved = Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y);
    dragStart.current = null;
    if (moved <= 12) return;

    const rect = targetRef.current?.getBoundingClientRect();
    const hit = Boolean(
      rect
      && event.clientX >= rect.left - 18
      && event.clientX <= rect.right + 18
      && event.clientY >= rect.top - 18
      && event.clientY <= rect.bottom + 18,
    );
    if (hit && edgeProbed) {
      setRejected(false);
      onArm();
      return;
    }
    rejectPlacement();
  };

  const moveWithKeyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    onDiscover();
    const next = {
      x: Math.max(0, Math.min(3, keyPosition.x + (event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0))),
      y: Math.max(0, Math.min(1, keyPosition.y + (event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0))),
    };
    const reachedGap = next.x === 3 && next.y === 1;
    if (reachedGap && !edgeProbed) {
      rejectPlacement();
      return;
    }
    setKeyPosition(next);
    setOffset({ x: next.x * 48, y: next.y * 32 });
    setRejected(false);
    if (reachedGap) onArm();
  };

  return (
    <div
      className={styles.scene}
      data-controller="corner-repair"
      data-edge-probed={edgeProbed ? "true" : "false"}
      data-rejected-candidate={rejected ? "unprobed" : "none"}
      data-solved={solved ? "true" : "false"}
      data-testid="v2-scene-001"
      data-v2-level="001"
    >
      <span className={styles.frame} aria-hidden="true" />
      <button
        ref={targetRef}
        type="button"
        className={styles.gap}
        aria-label={locale === "zh" ? "纸页缺口" : "Page gap"}
        onClick={probeEdge}
        onKeyDown={(event) => {
          if (!["Enter", " "].includes(event.key)) return;
          event.preventDefault();
          probeEdge();
        }}
      />
      <button
        type="button"
        className={styles.fragment}
        aria-label={locale === "zh" ? "页边的纸片" : "Paper fragment by the page"}
        style={{ transform: solved ? undefined : `translate(${offset.x}px, ${offset.y}px)` }}
        onClick={onDiscover}
        onKeyDown={moveWithKeyboard}
        onPointerDown={(event) => {
          dragStart.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!dragStart.current) return;
          const x = event.clientX - dragStart.current.x;
          const y = event.clientY - dragStart.current.y;
          if (Math.hypot(x, y) > 12) onDiscover();
          setOffset({ x, y });
        }}
        onPointerUp={finishPointer}
        onPointerCancel={() => {
          dragStart.current = null;
          rejectPlacement();
        }}
      >
        <span aria-hidden="true" />
      </button>
      {rejected || (edgeProbed && !solved) ? (
        <p className={styles.srOnly} role="status">
          {rejected
            ? (locale === "zh" ? "纸面仍未闭合。" : "The page is still open.")
            : (locale === "zh" ? "纸页边缘显出与碎片同向的纤维。" : "The page edge reveals fibers aligned with the fragment.")}
        </p>
      ) : null}
    </div>
  );
}
