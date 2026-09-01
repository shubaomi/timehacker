"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FULL_SPATIAL_REVIEW_RECIPES,
  fullSpatialReviewRecipe,
  reviewTimerElapsed,
  type FullSpatialReviewRecipe,
  type SpatialReviewPhase,
} from "@/game/full-spatial-review";
import { V2EclipseMenuLayer, V2PuzzleScene } from "@/components/v2-puzzle-scene";
import { useLocale } from "@/i18n/locale-provider";
import styles from "./full-spatial-review-lab.module.css";

const phases: readonly SpatialReviewPhase[] = ["idle", "running", "stopped", "success", "miss"];

interface FullSpatialReviewLabProps {
  initialLevel: number;
}

function formatTimer(milliseconds: number) {
  return (milliseconds / 1000).toFixed(2);
}

function SpatialSculpture({ recipe, phase, armed, active }: { recipe: FullSpatialReviewRecipe; phase: SpatialReviewPhase; armed: boolean; active: boolean }) {
  return (
    <div
      className={styles.sculpture}
      data-accent={recipe.accent}
      data-armed={armed ? "true" : "false"}
      data-field={recipe.field}
      data-material={recipe.material}
      data-phase={phase}
      data-rendering={active ? "active" : "paused"}
      aria-hidden="true"
    >
      <div className={styles.fieldPlane} />
      <div className={styles.fieldPlane} />
      <div className={styles.fieldPlane} />
      {recipe.marks.map((mark, index) => (
        <i
          className={`${styles.fieldMark} ${styles[`shape_${mark.shape}`]}`}
          key={`${recipe.id}-${index}`}
          style={{
            "--mark-x": `${mark.x}%`,
            "--mark-y": `${mark.y}%`,
            "--mark-size": `${Math.max(18, mark.size * .72)}px`,
            "--mark-rotation": `${mark.rotation}deg`,
            "--mark-depth": `${(index - recipe.marks.length / 2) * 14}px`,
            "--mark-delay": `${index * -0.72}s`,
          } as React.CSSProperties}
        />
      ))}
      <span className={styles.fieldCore} />
    </div>
  );
}

function spatialConnectorPath(centers: Array<readonly [number, number]>, mode: FullSpatialReviewRecipe["successComposition"]) {
  if (!centers.length) return "";
  const center = {
    x: centers.reduce((sum, item) => sum + item[0], 0) / centers.length,
    y: centers.reduce((sum, item) => sum + item[1], 0) / centers.length,
  };
  if (mode === "converge") return centers.map(([x, y]) => `M ${x} ${y} L ${center.x} ${center.y}`).join(" ");
  if (mode === "orbit" && centers.length > 2) return `${centers.map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ")} Z`;
  if (mode === "fold") return centers.map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y + (index % 2 ? -12 : 12)}`).join(" ");
  if (mode === "stack") return centers.map(([x, y], index) => `M ${x} ${y} L ${x + 10 + index * 2} ${y + 12 + index * 3}`).join(" ");
  if (mode === "trace" && centers.length > 1) return centers.map(([x, y], index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  return centers.map(([x, y]) => `M ${x - 9} ${y} L ${x + 9} ${y}`).join(" ");
}

function resolveSpatialAnchor(scene: HTMLElement, selector: string) {
  if (!selector.startsWith("@control:")) return scene.querySelector<HTMLElement>(selector);
  const index = Number(selector.slice("@control:".length));
  return scene.querySelectorAll<HTMLElement>('button,[role="application"],input,select').item(index);
}

function rectanglesIntersect(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function ObjectSpatialField({ recipe, phase, active, revealed, stageRef, sceneRef, resetEpoch }: {
  recipe: FullSpatialReviewRecipe;
  phase: SpatialReviewPhase;
  active: boolean;
  revealed: boolean;
  stageRef: React.RefObject<HTMLElement | null>;
  sceneRef: React.RefObject<HTMLDivElement | null>;
  resetEpoch: number;
}) {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const stage = stageRef.current;
    const scene = sceneRef.current?.querySelector<HTMLElement>('[data-testid="puzzle-scene"]');
    if (!field || !stage || !scene) return;
    const volumes = [...field.querySelectorAll<HTMLElement>('[data-anchor-index]')];
    const path = field.querySelector<SVGPathElement>("path");
    const seal = field.querySelector<HTMLElement>('[data-object-seal="true"]');
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (!active || document.visibilityState === "hidden") return;
      const stageRect = stage.getBoundingClientRect();
      const protectedRects = [...stage.querySelectorAll<HTMLElement>("[data-timer-protection]")]
        .map((element) => element.getBoundingClientRect());
      const matches = recipe.anchorSelectors.map((selector, index) => {
        const element = resolveSpatialAnchor(scene, selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || rect.width < 1 || rect.height < 1) return null;
        const oversized = rect.width > Math.min(320, stageRect.width * .48)
          || rect.height > 260
          || rect.width * rect.height > 72_000;
        return {
          index,
          role: recipe.anchorRoles[index],
          selector,
          x: rect.left - stageRect.left,
          y: rect.top - stageRect.top,
          width: rect.width,
          height: rect.height,
          tag: element.tagName.toLowerCase(),
          protected: protectedRects.some((protectedRect) => rectanglesIntersect(rect, protectedRect)),
          oversized,
        };
      }).filter((item): item is NonNullable<typeof item> => Boolean(item));
      const centers = matches.map((anchor) => [anchor.x + anchor.width / 2, anchor.y + anchor.height / 2] as const);
      const center = centers.length ? {
        x: centers.reduce((sum, item) => sum + item[0], 0) / centers.length,
        y: centers.reduce((sum, item) => sum + item[1], 0) / centers.length,
      } : null;

      for (const [index, volume] of volumes.entries()) {
        const anchor = matches.find((item) => item.index === index);
        const suppressed = !anchor
          ? "missing"
          : !revealed
            ? "unrevealed"
            : anchor.protected
              ? "protected"
              : anchor.oversized
                ? "oversized"
                : anchor.tag === "svg"
                  ? "svg-surface"
                  : "";
        volume.hidden = Boolean(suppressed);
        volume.dataset.suppressedReason = suppressed;
        if (!anchor || !center) continue;
        volume.dataset.anchorRole = anchor.role;
        volume.dataset.anchorSelector = anchor.selector;
        volume.style.setProperty("--anchor-x", `${Math.round(anchor.x * 10) / 10}px`);
        volume.style.setProperty("--anchor-y", `${Math.round(anchor.y * 10) / 10}px`);
        volume.style.setProperty("--anchor-width", `${Math.round(anchor.width * 10) / 10}px`);
        volume.style.setProperty("--anchor-height", `${Math.round(anchor.height * 10) / 10}px`);
        volume.dataset.anchorTag = anchor.tag;
      }
      field.dataset.boundAnchorCount = String(matches.length);
      field.dataset.bindingComplete = String(matches.length === recipe.anchorSelectors.length);
      field.dataset.suppressedAnchorCount = String(volumes.filter((volume) => volume.hidden).length);
      path?.setAttribute("d", spatialConnectorPath(centers, recipe.successComposition));
      if (seal && center) {
        seal.hidden = false;
        seal.style.left = `${center.x}px`;
        seal.style.top = `${center.y}px`;
      } else if (seal) {
        seal.hidden = true;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resizeObserver?.observe(stage);
    resizeObserver?.observe(scene);
    const mutationObserver = typeof MutationObserver === "undefined" ? null : new MutationObserver(schedule);
    mutationObserver?.observe(scene, { attributes: true, childList: true, subtree: true });
    scene.addEventListener("pointermove", schedule);
    scene.addEventListener("pointerup", schedule);
    scene.addEventListener("keyup", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      scene.removeEventListener("pointermove", schedule);
      scene.removeEventListener("pointerup", schedule);
      scene.removeEventListener("keyup", schedule);
    };
  }, [active, recipe, resetEpoch, revealed, sceneRef, stageRef]);

  return (
    <div
      ref={fieldRef}
      className={styles.objectField}
      data-completion={recipe.completionGeometry}
      data-connector={recipe.connector}
      data-depth-pattern={recipe.depthPattern}
      data-phase={phase}
      data-rendering={active ? "active" : "paused"}
      data-revealed={revealed ? "true" : "false"}
      data-signature={recipe.signatureSilhouette}
      data-silhouette={recipe.silhouettePrimitive}
      data-success-composition={recipe.successComposition}
      data-thesis={recipe.spatialThesis}
      data-trace-key={recipe.traceKey}
      aria-hidden="true"
      style={{
        "--idle-lift": `${recipe.stateGeometry.idleLift}px`,
        "--running-pull": `${recipe.stateGeometry.runningPull}px`,
        "--success-lock": `${recipe.stateGeometry.successLock}px`,
        "--miss-rebound": `${recipe.stateGeometry.missRebound}px`,
      } as React.CSSProperties}
    >
      <svg className={styles.objectConnector}>
        <path pathLength="1" />
      </svg>
      {recipe.anchorSelectors.map((selector, index) => (
        <i
          className={styles.objectVolume}
          data-anchor-index={index}
          data-anchor-role={recipe.anchorRoles[index]}
          data-anchor-selector={selector}
          key={`${recipe.id}-${selector}`}
          style={{
            "--anchor-index": index,
            "--anchor-z": `${(index - (recipe.anchorSelectors.length - 1) / 2) * 11}px`,
            "--anchor-rotation": `${((recipe.id + index * 3) % 7) - 3}deg`,
          } as React.CSSProperties}
        />
      ))}
      <b className={styles.objectSeal} data-object-seal="true" hidden />
    </div>
  );
}

function useReviewTimer(phase: SpatialReviewPhase, armed: boolean) {
  const timerRef = useRef<HTMLSpanElement>(null);
  const frozenRef = useRef(0);
  const armedRef = useRef(armed);

  useEffect(() => {
    armedRef.current = armed;
  }, [armed]);

  useEffect(() => {
    const node = timerRef.current;
    if (!node) return;
    if (phase === "idle") {
      frozenRef.current = 0;
      node.textContent = "0.00";
      return;
    }
    if (phase === "success") {
      frozenRef.current = 10_000;
      node.textContent = "10.00";
      return;
    }
    if (phase === "miss") {
      frozenRef.current = 9_860;
      node.textContent = "9.86";
      return;
    }
    if (phase === "stopped") {
      node.textContent = formatTimer(frozenRef.current || (armedRef.current ? 10_000 : 9_860));
      return;
    }

    frozenRef.current = 0;
    const startedAt = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      if (document.visibilityState !== "hidden") {
        const realElapsed = now - startedAt;
        const elapsed = reviewTimerElapsed(realElapsed, armedRef.current, frozenRef.current);
        frozenRef.current = elapsed;
        node.textContent = formatTimer(elapsed);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  return timerRef;
}

export function FullSpatialReviewLab({ initialLevel }: FullSpatialReviewLabProps) {
  const { locale, setLocale } = useLocale();
  const [levelId, setLevelId] = useState(initialLevel);
  const [phase, setPhase] = useState<SpatialReviewPhase>("idle");
  const [armed, setArmed] = useState(false);
  const [discovered, setDiscovered] = useState(false);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2 | 3>(0);
  const [resetEpoch, setResetEpoch] = useState(0);
  const [ghostAnchor, setGhostAnchor] = useState<"left" | "right" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [eclipseOffset, setEclipseOffset] = useState(18);
  const [visualEnabled, setVisualEnabled] = useState(true);
  const [renderActive, setRenderActive] = useState(true);
  const stageRef = useRef<HTMLElement>(null);
  const puzzlePlaneRef = useRef<HTMLDivElement>(null);
  const recipe = useMemo(() => fullSpatialReviewRecipe(levelId), [levelId]);
  const timerRef = useReviewTimer(phase, armed);
  const zh = locale === "zh";

  useEffect(() => {
    let intersecting = true;
    const sync = () => setRenderActive(intersecting && document.visibilityState !== "hidden");
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? true;
      sync();
    }, { threshold: .01 });
    if (stageRef.current) observer?.observe(stageRef.current);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const resetLevel = useCallback((nextId = levelId) => {
    setLevelId(nextId);
    setPhase("idle");
    setArmed(false);
    setDiscovered(false);
    setHintLevel(0);
    setResetEpoch((value) => value + 1);
    setMenuOpen(false);
    setEclipseOffset(18);
    if (nextId !== levelId) setGhostAnchor(null);
  }, [levelId]);

  const moveLevel = (delta: number) => {
    const next = Math.max(1, Math.min(100, levelId + delta));
    resetLevel(next);
  };

  const primaryAction = () => {
    if (phase === "idle" || phase === "stopped" || phase === "success" || phase === "miss") {
      setPhase("running");
      return;
    }
    setPhase("stopped");
  };

  const selectReviewPhase = (next: SpatialReviewPhase) => {
    if (next === "idle") {
      resetLevel();
      return;
    }
    if (next === "success") {
      setDiscovered(true);
      setArmed(true);
    }
    setPhase(next);
  };

  return (
    <main
      className={styles.root}
      data-armed={armed ? "true" : "false"}
      data-controller={recipe.controller}
      data-discovered={discovered ? "true" : "false"}
      data-phase={phase}
      data-spatial-enabled={visualEnabled ? "true" : "false"}
      style={{
        "--review-depth": `${recipe.depth}px`,
        "--review-perspective": `${recipe.perspective}px`,
        "--review-tilt-x": `${recipe.tiltX * .32}deg`,
        "--review-tilt-y": `${recipe.tiltY * .28}deg`,
      } as React.CSSProperties}
    >
      {visualEnabled ? <SpatialSculpture recipe={recipe} phase={phase} armed={armed} active={renderActive} /> : null}

      <header className={styles.header}>
        <a href="/playtest-v2" className={styles.brand} aria-label={zh ? "返回 Time Hacker 评审入口" : "Back to Time Hacker review"}>
          <span aria-hidden="true">10</span>
          <b>TIME HACKER</b>
        </a>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => setLocale(zh ? "en" : "zh")}>{zh ? "EN" : "中文"}</button>
          {levelId === 86 ? <button type="button" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>{zh ? "菜单纸层" : "Menu paper"}</button> : null}
        </div>
      </header>

      <section className={styles.challenge} aria-labelledby="spatial-review-title">
        <p>{String(levelId).padStart(3, "0")} / {recipe.traceKey}</p>
        <h1 id="spatial-review-title">{zh ? <><span>你能让时间停在</span><span>10.00 秒吗？</span></> : "Can you stop time at 10.00 seconds?"}</h1>
      </section>

      <section ref={stageRef} className={styles.stage} data-field={recipe.field} data-material={recipe.material}>
        <div className={styles.stageBack} aria-hidden="true" />

        {visualEnabled ? (
          <ObjectSpatialField
            recipe={recipe}
            phase={phase}
            active={renderActive}
            revealed={discovered || armed || phase === "success"}
            stageRef={stageRef}
            sceneRef={puzzlePlaneRef}
            resetEpoch={resetEpoch}
          />
        ) : null}

        <section className={`${styles.timerCard} stopwatch-card`} aria-label={zh ? "隔离计时状态" : "Isolated timer state"}>
          <div className={styles.timerValue} data-timer-protection="value"><span ref={timerRef}>0.00</span><small>s</small></div>
          <p aria-live="polite" data-timer-protection="status">{armed ? (zh ? "规则已经解锁。你仍需亲自停止时间。" : "Rule unlocked. You still stop time yourself.") : (zh ? "先观察，再试一试。" : "Observe first, then try.")}</p>
        </section>

        <div ref={puzzlePlaneRef} className={styles.puzzlePlane}>
          <V2PuzzleScene
            key={`${recipe.slug}-${resetEpoch}`}
            slug={recipe.slug}
            armed={armed}
            hintLevel={hintLevel}
            resetEpoch={resetEpoch}
            ghostAnchor={ghostAnchor}
            onGhostAnchorChange={setGhostAnchor}
            menuOpen={menuOpen}
            eclipseOffset={eclipseOffset}
            spatialPilot={visualEnabled}
            onDiscover={() => setDiscovered(true)}
            onArm={() => {
              setDiscovered(true);
              setArmed(true);
            }}
          />
        </div>

        <button className={styles.primary} data-timer-protection="primary" type="button" onClick={primaryAction}>
          {phase === "running" ? (zh ? "停止" : "Stop") : (zh ? "开始" : "Start")}
        </button>
      </section>

      <aside className={styles.reviewDock} aria-label={zh ? "隔离原型评审控制" : "Isolated prototype review controls"}>
        <div className={styles.levelControls}>
          <button type="button" onClick={() => moveLevel(-1)} disabled={levelId === 1}>{zh ? "上一关" : "Previous"}</button>
          <label>
            <span className={styles.srOnly}>{zh ? "选择关卡" : "Choose level"}</span>
            <select value={levelId} onChange={(event) => resetLevel(Number(event.target.value))}>
              {FULL_SPATIAL_REVIEW_RECIPES.map((item) => (
                <option key={item.id} value={item.id}>{String(item.id).padStart(3, "0")} {item.title[locale]}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => moveLevel(1)} disabled={levelId === 100}>{zh ? "下一关" : "Next"}</button>
        </div>
        <div className={styles.phaseControls}>
          {phases.map((item) => <button type="button" key={item} aria-pressed={phase === item} onClick={() => selectReviewPhase(item)}>{item}</button>)}
        </div>
        <div className={styles.utilityControls}>
          <button type="button" onClick={() => setHintLevel((value) => Math.min(3, value + 1) as 0 | 1 | 2 | 3)}>{zh ? `提示 ${hintLevel}/3` : `Hint ${hintLevel}/3`}</button>
          <button type="button" onClick={() => resetLevel()}>{zh ? "重置本关" : "Reset level"}</button>
          <button type="button" aria-pressed={visualEnabled} onClick={() => setVisualEnabled((value) => !value)}>{zh ? `空间层 ${visualEnabled ? "开" : "关"}` : `Spatial ${visualEnabled ? "on" : "off"}`}</button>
          <span>{recipe.controller} / {recipe.material}</span>
        </div>
      </aside>

      {levelId === 86 && menuOpen ? (
        <aside className={styles.eclipseMenu} aria-label={zh ? "关卡 086 菜单纸层" : "Level 086 menu paper"}>
          <V2EclipseMenuLayer
            offset={eclipseOffset}
            aligned={eclipseOffset >= 60 && eclipseOffset <= 84}
            onOffsetChange={setEclipseOffset}
          />
          <button type="button" onClick={() => setMenuOpen(false)}>{zh ? "关闭菜单" : "Close menu"}</button>
        </aside>
      ) : null}
    </main>
  );
}
