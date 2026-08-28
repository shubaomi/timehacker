"use client";

import { useEffect, useRef } from "react";
import {
  isSpatialPilotSlug,
  type SpatialPilotSlug,
  type SpatialVisualPhase,
} from "@/game/spatial-pilot";
import styles from "./spatial-time-field.module.css";

interface SpatialTimeFieldProps {
  armed: boolean;
  enabled: boolean;
  phase: SpatialVisualPhase;
  slug: string;
}

interface FieldLayout {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
}

const palette = {
  ink: "32, 36, 63",
  coral: "255, 111, 97",
  butter: "255, 217, 106",
  mint: "110, 219, 181",
  sky: "132, 205, 231",
};

function fieldLayout(width: number, height: number): FieldLayout {
  const timer = document.querySelector<HTMLElement>(".stopwatch-card")?.getBoundingClientRect();
  if (!timer || timer.width === 0) {
    return { centerX: width / 2, centerY: height * 0.55, radiusX: Math.min(width * 0.36, 420), radiusY: Math.min(height * 0.24, 220) };
  }
  return {
    centerX: (timer.left + timer.right) / 2,
    centerY: (timer.top + timer.bottom) / 2,
    radiusX: Math.max(timer.width * 0.62, Math.min(width * 0.34, 280)),
    radiusY: Math.max(timer.height * 0.66, Math.min(height * 0.19, 170)),
  };
}

function strokeEllipse(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  scale: number,
  depth: number,
  color: string,
  alpha: number,
  lineWidth: number,
  start = 0,
  end = Math.PI * 2,
) {
  context.save();
  context.translate(layout.centerX, layout.centerY + depth);
  context.scale(1, 0.62);
  context.beginPath();
  context.ellipse(0, 0, layout.radiusX * scale, layout.radiusY * scale, 0, start, end);
  context.strokeStyle = `rgba(${color}, ${alpha})`;
  context.lineWidth = lineWidth;
  context.shadowColor = `rgba(${color}, ${alpha * 0.55})`;
  context.shadowBlur = Math.max(2, lineWidth * 1.6);
  context.stroke();
  context.restore();
}

function drawCornerField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const locked = armed || phase === "success";
  for (let layer = 3; layer >= 0; layer -= 1) {
    const depth = (layer - 1.5) * 12;
    const inset = layer * 13 + (phase === "running" ? motion * 5 : 0);
    const left = layout.centerX - layout.radiusX + inset;
    const right = layout.centerX + layout.radiusX - inset;
    const top = layout.centerY - layout.radiusY + inset * 0.35 + depth;
    const bottom = layout.centerY + layout.radiusY - inset * 0.35 + depth;
    const gap = locked ? 0 : 34 + layer * 4;
    context.save();
    context.strokeStyle = `rgba(${layer % 2 ? palette.sky : palette.butter}, ${0.08 + layer * 0.025})`;
    context.lineWidth = 3 + layer * 1.5;
    context.shadowColor = `rgba(${palette.ink}, .08)`;
    context.shadowBlur = 14;
    context.beginPath();
    context.moveTo(left, top);
    context.lineTo(right - gap, top);
    if (locked) context.lineTo(right, top + gap * 0.15);
    context.moveTo(right, top + gap);
    context.lineTo(right, bottom);
    context.lineTo(left, bottom);
    context.lineTo(left, top);
    context.stroke();
    context.restore();
  }
  if (!locked) {
    context.save();
    context.translate(layout.centerX + layout.radiusX * 0.62, layout.centerY - layout.radiusY * 0.78 + motion * 3);
    context.rotate(-0.18);
    context.fillStyle = `rgba(${palette.butter}, .28)`;
    context.shadowColor = `rgba(${palette.ink}, .14)`;
    context.shadowBlur = 18;
    context.beginPath();
    context.moveTo(-28, -28);
    context.lineTo(28, -28);
    context.lineTo(28, 28);
    context.closePath();
    context.fill();
    context.restore();
  }
}

function drawArchiveField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const points = [
    { x: layout.centerX - layout.radiusX * 1.08, y: layout.centerY + layout.radiusY * 0.54 },
    { x: layout.centerX, y: layout.centerY - layout.radiusY * 0.92 },
    { x: layout.centerX + layout.radiusX * 1.08, y: layout.centerY + layout.radiusY * 0.5 },
  ];
  const visibleSegments = armed || phase === "success" ? 2 : phase === "running" || phase === "stopped" ? 2 : 0;
  for (let layer = 3; layer >= 0; layer -= 1) {
    const depth = (layer - 1.5) * 8;
    context.save();
    context.lineCap = "round";
    context.lineWidth = 13 - layer * 1.5;
    context.strokeStyle = `rgba(${layer === 0 ? palette.sky : palette.mint}, ${visibleSegments ? 0.1 + layer * 0.026 : 0.03})`;
    context.shadowColor = `rgba(${palette.ink}, .12)`;
    context.shadowBlur = 15;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y + depth);
    context.bezierCurveTo(
      layout.centerX - layout.radiusX * 0.76,
      layout.centerY - layout.radiusY * 0.34 + motion * 3 + depth,
      layout.centerX - layout.radiusX * 0.34,
      points[1].y + depth,
      points[1].x,
      points[1].y + depth,
    );
    if (visibleSegments > 1) {
      context.bezierCurveTo(
        layout.centerX + layout.radiusX * 0.34,
        points[1].y + depth,
        layout.centerX + layout.radiusX * 0.76,
        layout.centerY - layout.radiusY * 0.34 + motion * 3 + depth,
        points[2].x,
        points[2].y + depth,
      );
    }
    context.stroke();
    context.restore();
  }
  points.forEach((point, index) => {
    const radius = 16 + index * 3;
    context.save();
    context.translate(point.x, point.y);
    context.rotate((index - 1) * 0.12);
    context.fillStyle = `rgba(${index === 1 ? palette.butter : palette.mint}, .23)`;
    context.shadowColor = `rgba(${palette.ink}, .12)`;
    context.shadowBlur = 16;
    context.fillRect(-radius * 1.3, -radius * 0.72, radius * 2.6, radius * 1.44);
    context.restore();
  });
}

function drawDualField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const locked = armed || phase === "success";
  const split = locked ? 0 : 0.12 + motion * 0.012;
  for (let layer = 4; layer >= 0; layer -= 1) {
    const depth = (layer - 2) * 9;
    const scale = 0.74 + layer * 0.075 - (phase === "running" ? Math.min(0.08, motion * 0.01) : 0);
    strokeEllipse(context, layout, scale, depth, palette.mint, 0.055 + layer * 0.018, 5 + layer, Math.PI * (0.5 + split), Math.PI * 1.5);
    strokeEllipse(context, layout, scale, depth, palette.coral, 0.052 + layer * 0.017, 5 + layer, -Math.PI * 0.5, Math.PI * (0.5 - split));
  }
  const socketHeight = Math.max(42, layout.radiusY * 0.4);
  context.save();
  context.translate(layout.centerX, layout.centerY);
  context.strokeStyle = `rgba(${locked ? palette.mint : palette.ink}, ${locked ? .32 : .12})`;
  context.lineWidth = 5;
  context.shadowColor = `rgba(${palette.mint}, .2)`;
  context.shadowBlur = locked ? 16 : 4;
  context.beginPath();
  context.roundRect(-10, -socketHeight / 2, 20, socketHeight, 10);
  context.stroke();
  context.restore();
}

function renderField(
  context: CanvasRenderingContext2D,
  slug: SpatialPilotSlug,
  phase: SpatialVisualPhase,
  armed: boolean,
  width: number,
  height: number,
  age: number,
  reducedMotion: boolean,
) {
  context.clearRect(0, 0, width, height);
  const layout = fieldLayout(width, height);
  const motion = reducedMotion
    ? 0
    : phase === "idle"
      ? Math.sin(age * 0.72)
      : phase === "running"
        ? Math.min(8, age * 0.7) + Math.sin(age * 1.6) * 0.28
        : phase === "success"
          ? Math.sin(Math.min(1, age / 0.75) * Math.PI)
          : phase === "miss"
            ? Math.sin(age * 18) * Math.exp(-age * 4.6)
            : 0;

  if (slug === "four-corner-breach") drawCornerField(context, layout, phase, armed, motion);
  else if (slug === "archive-route") drawArchiveField(context, layout, phase, armed, motion);
  else drawDualField(context, layout, phase, armed, motion);

  const ripple = phase === "success" ? Math.min(1, age / 0.8) : 0;
  if (ripple > 0 && ripple < 1) {
    strokeEllipse(context, layout, 0.7 + ripple * 0.45, 0, palette.butter, (1 - ripple) * 0.2, 5);
  }
}

export function SpatialTimeField({ armed, enabled, phase, slug }: SpatialTimeFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || !isSpatialPilotSlug(slug)) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = reducedQuery.matches;
    let visible = !document.hidden;
    let intersecting = true;
    let frame = 0;
    let width = 0;
    let height = 0;
    let startedAt = performance.now();

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const mobile = width <= 680;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.dataset.dpr = dpr.toFixed(2);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderField(context, slug, phase, armed, width, height, 0, reducedMotion);
    };

    const shouldContinue = (age: number) => !reducedMotion && (
      phase === "idle"
      || phase === "running"
      || (phase === "success" && age < 0.9)
      || (phase === "miss" && age < 0.75)
    );
    const draw = (now: number) => {
      frame = 0;
      if (!visible || !intersecting) return;
      const age = Math.max(0, (now - startedAt) / 1000);
      renderField(context, slug, phase, armed, width, height, age, reducedMotion);
      if (shouldContinue(age)) frame = window.requestAnimationFrame(draw);
    };
    const start = () => {
      if (frame || !visible || !intersecting) return;
      startedAt = performance.now();
      frame = window.requestAnimationFrame(draw);
    };
    const stop = () => {
      if (!frame) return;
      window.cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) start();
      else stop();
    };
    const onReducedMotion = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      stop();
      renderField(context, slug, phase, armed, width, height, 0, reducedMotion);
      if (!reducedMotion) start();
    };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? true;
      if (intersecting) start();
      else stop();
    });

    resize();
    observer?.observe(canvas);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    reducedQuery.addEventListener?.("change", onReducedMotion);
    start();

    return () => {
      stop();
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      reducedQuery.removeEventListener?.("change", onReducedMotion);
    };
  }, [armed, enabled, phase, slug]);

  if (!enabled || !isSpatialPilotSlug(slug)) return null;
  return (
    <canvas
      ref={canvasRef}
      className={styles.field}
      aria-hidden="true"
      data-armed={armed ? "true" : "false"}
      data-phase={phase}
      data-spatial-pilot={slug}
      data-testid="spatial-time-field"
    />
  );
}
