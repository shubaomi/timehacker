"use client";

import { useEffect, useRef } from "react";
import {
  isSpatialPilotSlug,
  type SpatialVisualPhase,
} from "@/game/spatial-pilot";
import { FULL_SPATIAL_REVIEW_BY_SLUG } from "@/game/full-spatial-review";
import styles from "./spatial-time-field.module.css";

interface SpatialTimeFieldProps {
  armed: boolean;
  allowUnlisted?: boolean;
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

function drawBreathField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const open = armed || phase === "success";
  const gap = open ? 0.2 : phase === "running" ? 0.06 : 0.025;
  for (let layer = 4; layer >= 0; layer -= 1) {
    const depth = (layer - 2) * 8;
    const scale = 0.66 + layer * 0.075 + (phase === "idle" ? motion * 0.004 : 0);
    strokeEllipse(context, layout, scale, depth, layer % 2 ? palette.butter : palette.mint, 0.035 + layer * 0.014, 4 + layer, Math.PI * (1 + gap), Math.PI * (2 - gap));
    strokeEllipse(context, layout, scale, depth, layer % 2 ? palette.butter : palette.mint, 0.035 + layer * 0.014, 4 + layer, Math.PI * gap, Math.PI * (1 - gap));
  }

  if (!open) return;
  const membraneY = layout.centerY - layout.radiusY * 1.06;
  context.save();
  context.fillStyle = `rgba(${palette.butter}, .13)`;
  context.strokeStyle = `rgba(${palette.ink}, .07)`;
  context.lineWidth = 2;
  [-1, 1].forEach((side) => {
    context.beginPath();
    context.ellipse(
      layout.centerX + side * layout.radiusX * 0.28,
      membraneY,
      layout.radiusX * 0.26,
      Math.max(12, layout.radiusY * 0.105),
      side * -0.035,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
  });
  context.restore();
  context.save();
  context.translate(layout.centerX, membraneY);
  context.fillStyle = `rgba(${palette.mint}, .18)`;
  context.shadowColor = `rgba(${palette.mint}, .18)`;
  context.shadowBlur = 18;
  context.beginPath();
  context.ellipse(0, 0, 15, 15, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawRelayField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const locked = armed || phase === "success";
  const split = locked ? 0 : 0.08 + Math.abs(motion) * 0.006;
  for (let layer = 4; layer >= 0; layer -= 1) {
    const depth = (layer - 2) * 10;
    const scale = 0.7 + layer * 0.072;
    const shellAlpha = locked ? 0.105 + layer * 0.018 : 0.045 + layer * 0.014;
    const shellWidth = locked ? 8 + layer : 5 + layer;
    strokeEllipse(context, layout, scale, depth, palette.coral, shellAlpha, shellWidth, Math.PI * (0.5 + split), Math.PI * 1.5);
    strokeEllipse(context, layout, scale, depth, palette.coral, shellAlpha, shellWidth, -Math.PI * 0.5, Math.PI * (0.5 - split));
  }

  context.save();
  context.translate(layout.centerX, layout.centerY + (locked ? 0 : motion * 1.5));
  context.scale(1, 0.62);
  context.strokeStyle = `rgba(${palette.mint}, ${locked ? .32 : .1})`;
  context.lineWidth = 4;
  context.shadowColor = `rgba(${palette.mint}, .16)`;
  context.shadowBlur = locked ? 15 : 6;
  context.beginPath();
  context.ellipse(0, 0, layout.radiusX * 0.58, layout.radiusY * 0.58, 0, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function drawWordField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const locked = armed || phase === "success";
  const tileWidth = Math.min(78, layout.radiusX * .22);
  const gap = Math.min(18, layout.radiusX * .05);
  const totalWidth = tileWidth * 4 + gap * 3;
  const startX = layout.centerX - totalWidth / 2;
  for (let layer = 3; layer >= 0; layer -= 1) {
    const depth = (layer - 1.5) * 9;
    const alpha = locked ? .08 + layer * .018 : .035 + layer * .014;
    for (let tile = 0; tile < 4; tile += 1) {
      const drift = locked ? 0 : Math.sin(tile * 1.7 + motion * .3) * 4;
      context.save();
      context.translate(0, depth);
      context.fillStyle = `rgba(${tile % 2 ? palette.sky : palette.butter}, ${alpha})`;
      context.shadowColor = `rgba(${palette.ink}, .07)`;
      context.shadowBlur = 12;
      context.fillRect(startX + tile * (tileWidth + gap), layout.centerY - layout.radiusY * .72 + drift, tileWidth, layout.radiusY * 1.44);
      context.restore();
    }
  }
}

function drawCrossField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const locked = armed || phase === "success";
  const gap = locked ? 0 : Math.max(14, 30 - Math.abs(motion) * 1.2);
  for (let layer = 3; layer >= 0; layer -= 1) {
    const depth = (layer - 1.5) * 9;
    context.save();
    context.translate(0, depth);
    context.lineWidth = 5 + layer * 1.8;
    context.strokeStyle = `rgba(${layer % 2 ? palette.coral : palette.mint}, ${locked ? .11 : .045 + layer * .014})`;
    context.shadowColor = `rgba(${palette.ink}, .08)`;
    context.shadowBlur = 10;
    context.beginPath();
    context.moveTo(layout.centerX - layout.radiusX, layout.centerY);
    context.lineTo(layout.centerX - gap, layout.centerY);
    context.moveTo(layout.centerX + gap, layout.centerY);
    context.lineTo(layout.centerX + layout.radiusX, layout.centerY);
    context.moveTo(layout.centerX, layout.centerY - layout.radiusY);
    context.lineTo(layout.centerX, layout.centerY - gap * .65);
    context.moveTo(layout.centerX, layout.centerY + gap * .65);
    context.lineTo(layout.centerX, layout.centerY + layout.radiusY);
    context.stroke();
    context.restore();
  }
}

function drawShadowField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const locked = armed || phase === "success";
  const positions = [-0.54, 0, 0.54];
  const radii = [24, 18, 13];
  const shadowLengths = locked ? [42, 68, 92] : [92, 42, 68];
  for (let layer = 3; layer >= 0; layer -= 1) {
    const depth = (layer - 1.5) * 9;
    positions.forEach((position, index) => {
      const x = layout.centerX + layout.radiusX * position;
      const y = layout.centerY + layout.radiusY * 0.2 + depth;
      context.save();
      context.translate(x + shadowLengths[index] * 0.26, y + radii[index] * 1.15);
      context.scale(1, 0.32);
      context.fillStyle = `rgba(${palette.ink}, ${0.018 + layer * 0.012})`;
      context.beginPath();
      context.ellipse(0, 0, shadowLengths[index], radii[index] * 0.8, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.save();
      context.translate(x, y - Math.abs(motion) * 0.7);
      context.fillStyle = `rgba(${index === 1 ? palette.mint : palette.butter}, ${locked ? 0.13 : 0.055 + layer * 0.012})`;
      context.shadowColor = `rgba(${palette.ink}, .08)`;
      context.shadowBlur = 12;
      context.beginPath();
      context.ellipse(0, 0, radii[index], radii[index], 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    });
  }
}

function drawLightField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const locked = armed || phase === "success";
  const lampX = layout.centerX + (locked ? 0 : layout.radiusX * 0.48);
  const lampY = layout.centerY - layout.radiusY * 0.82 + (locked ? 0 : motion * 2);
  const targets = [-0.52, 0, 0.52];
  for (let layer = 3; layer >= 0; layer -= 1) {
    const depth = (layer - 1.5) * 8;
    targets.forEach((position, index) => {
      const targetX = layout.centerX + layout.radiusX * position;
      const targetY = layout.centerY + layout.radiusY * 0.48 + depth;
      context.save();
      context.strokeStyle = `rgba(${index === 1 ? palette.mint : palette.butter}, ${locked ? 0.085 + layer * 0.018 : 0.025 + layer * 0.012})`;
      context.lineWidth = 3 + layer * 1.2;
      context.shadowColor = `rgba(${palette.butter}, .12)`;
      context.shadowBlur = 12;
      context.beginPath();
      context.moveTo(lampX, lampY + depth);
      context.lineTo(targetX, targetY);
      context.stroke();
      context.restore();

      context.save();
      context.translate(targetX, targetY);
      context.fillStyle = `rgba(${palette.coral}, ${0.045 + layer * 0.014})`;
      context.fillRect(-18 + index * 2, -8, 36 - index * 4, 16);
      context.restore();
    });
  }
  context.save();
  context.translate(lampX, lampY);
  context.fillStyle = `rgba(${palette.butter}, ${locked ? .3 : .16})`;
  context.shadowColor = `rgba(${palette.butter}, .22)`;
  context.shadowBlur = 22;
  context.beginPath();
  context.ellipse(0, 0, 17, 17, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawFocusField(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const locked = armed || phase === "success";
  for (let layer = 3; layer >= 0; layer -= 1) {
    const depth = locked ? 0 : (layer - 1.5) * 11;
    const spread = locked ? 0 : (layer - 1.5) * 8;
    const scale = .46 + layer * .085;
    strokeEllipse(
      context,
      { ...layout, centerX: layout.centerX + spread, centerY: layout.centerY - spread * .35 },
      scale,
      depth,
      layer === 1 ? palette.coral : layer === 2 ? palette.mint : palette.sky,
      locked ? .16 : .045 + layer * .018,
      3 + layer,
    );
  }
  if (!locked) {
    context.save();
    context.translate(layout.centerX - layout.radiusX * .48, layout.centerY + layout.radiusY * .52 + motion * 2);
    context.fillStyle = `rgba(${palette.mint}, .055)`;
    context.strokeStyle = `rgba(${palette.ink}, .1)`;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(0, 0, 38, 31, -.18, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }
}

function drawRecipeMarks(
  context: CanvasRenderingContext2D,
  layout: FieldLayout,
  slug: string,
  phase: SpatialVisualPhase,
  armed: boolean,
  motion: number,
) {
  const recipe = FULL_SPATIAL_REVIEW_BY_SLUG.get(slug);
  if (!recipe) return;
  const colors = [palette.butter, palette.coral, palette.mint, palette.sky];
  const locked = armed || phase === "success";
  for (const [index, mark] of recipe.marks.entries()) {
    const x = layout.centerX + (mark.x - 50) / 50 * layout.radiusX * 1.38;
    const y = layout.centerY + (mark.y - 50) / 50 * layout.radiusY * 1.22;
    const size = Math.max(9, mark.size * .26);
    const depth = (index - (recipe.marks.length - 1) / 2) * 7;
    context.save();
    context.translate(x, y + depth + (locked ? 0 : motion * (index % 2 ? 1.1 : -.8)));
    context.rotate(mark.rotation * Math.PI / 180);
    context.strokeStyle = `rgba(${colors[(recipe.id + index) % colors.length]}, ${locked ? .18 : .07 + index * .012})`;
    context.fillStyle = `rgba(${colors[(recipe.chapter + index) % colors.length]}, ${locked ? .12 : .035 + index * .009})`;
    context.lineWidth = Math.max(2, size * .12);
    context.shadowColor = `rgba(${palette.ink}, .08)`;
    context.shadowBlur = 12;
    context.beginPath();
    if (mark.shape === "dot") context.ellipse(0, 0, size * .48, size * .48, 0, 0, Math.PI * 2);
    else if (mark.shape === "ring") context.ellipse(0, 0, size * .62, size * .62, 0, 0, Math.PI * 2);
    else if (mark.shape === "arc") context.ellipse(0, 0, size * .72, size * .72, 0, -.25 * Math.PI, 1.15 * Math.PI);
    else if (mark.shape === "line") { context.moveTo(-size, 0); context.lineTo(size, 0); }
    else context.roundRect(-size * .72, -size * .48, size * 1.44, size * .96, Math.max(4, size * .22));
    if (mark.shape === "dot" || mark.shape === "paper") context.fill();
    context.stroke();
    context.restore();
  }
}

function renderField(
  context: CanvasRenderingContext2D,
  slug: string,
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
  else if (slug === "breath-gap") drawBreathField(context, layout, phase, armed, motion);
  else if (slug === "relay-sandwich") drawRelayField(context, layout, phase, armed, motion);
  else if (slug === "slow-command") drawWordField(context, layout, phase, armed, motion);
  else if (slug === "target-knock") drawShadowField(context, layout, phase, armed, motion);
  else if (slug === "amber-triangle") drawLightField(context, layout, phase, armed, motion);
  else if (slug === "corner-cross") drawCrossField(context, layout, phase, armed, motion);
  else if (slug === "focus-orbit") drawFocusField(context, layout, phase, armed, motion);
  else if (slug === "archive-route") drawArchiveField(context, layout, phase, armed, motion);
  else {
    const controller = FULL_SPATIAL_REVIEW_BY_SLUG.get(slug)?.controller;
    if (controller === "patient-hold" || controller === "wave-align" || controller === "rhythm") drawBreathField(context, layout, phase, armed, motion);
    else if (controller === "word-shift" || controller === "flip") drawWordField(context, layout, phase, armed, motion);
    else if (controller === "shadow-sort" || controller === "rotate") drawShadowField(context, layout, phase, armed, motion);
    else if (controller === "light-drag" || controller === "constellation") drawLightField(context, layout, phase, armed, motion);
    else if (controller === "focus-route") drawFocusField(context, layout, phase, armed, motion);
    else if (controller === "trace" || controller === "edge-route") drawArchiveField(context, layout, phase, armed, motion);
    else if (controller === "coupled-drag" || controller === "shared-control") drawCrossField(context, layout, phase, armed, motion);
    else if (controller === "corner-repair" || controller === "fold") drawCornerField(context, layout, phase, armed, motion);
    else if (controller === "layer-stack" || controller === "frame-drag") drawRelayField(context, layout, phase, armed, motion);
    else drawDualField(context, layout, phase, armed, motion);
  }
  drawRecipeMarks(context, layout, slug, phase, armed, motion);

  const ripple = phase === "success" ? Math.min(1, age / 0.8) : 0;
  if (ripple > 0 && ripple < 1) {
    strokeEllipse(context, layout, 0.7 + ripple * 0.45, 0, palette.butter, (1 - ripple) * 0.2, 5);
  }
}

export function SpatialTimeField({ armed, allowUnlisted = false, enabled, phase, slug }: SpatialTimeFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled || (!allowUnlisted && !isSpatialPilotSlug(slug))) return;
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
  }, [allowUnlisted, armed, enabled, phase, slug]);

  if (!enabled || (!allowUnlisted && !isSpatialPilotSlug(slug))) return null;
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
