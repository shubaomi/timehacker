"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FullCognitiveLevelDefinition } from "@/game/full-cognitive-campaign";
import { V2_LEVELS } from "@/game/v2-levels.generated";
import styles from "./cognitive-evidence-gate.module.css";

interface CognitiveEvidenceGateProps {
  definition: FullCognitiveLevelDefinition;
  locale: "zh" | "en";
  hintLevel: 0 | 1 | 2 | 3;
  visualEnabled: boolean;
  onDiscover: () => void;
  onComplete: () => void;
}

export function CognitiveEvidenceGate({
  definition,
  locale,
  hintLevel,
  visualEnabled,
  onDiscover,
  onComplete,
}: CognitiveEvidenceGateProps) {
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const [observed, setObserved] = useState<readonly string[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const completionTimerRef = useRef<number | null>(null);
  const rejectionTimerRef = useRef<number | null>(null);
  const expectedId = definition.sequence[step] ?? null;
  const visualMarks = V2_LEVELS[definition.id - 1].visual.marks;
  const observedSet = useMemo(() => new Set(observed), [observed]);

  useEffect(() => () => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current);
    if (rejectionTimerRef.current !== null) window.clearTimeout(rejectionTimerRef.current);
  }, []);

  const activateProbe = (probeId: string) => {
    if (locking) return;
    const selected = definition.probes.find((probe) => probe.id === probeId);
    if (!selected) return;
    onDiscover();
    setAnnouncement(selected.response[locale]);
    setObserved((current) => current.includes(probeId) ? current : [...current, probeId]);
    if (probeId !== definition.sequence[stepRef.current]) {
      setRejected(probeId);
      stepRef.current = 0;
      setStep(0);
      if (rejectionTimerRef.current !== null) window.clearTimeout(rejectionTimerRef.current);
      rejectionTimerRef.current = window.setTimeout(() => {
        setRejected(null);
        rejectionTimerRef.current = null;
      }, 150);
      return;
    }
    const next = stepRef.current + 1;
    if (next < definition.sequence.length) {
      stepRef.current = next;
      setStep(next);
      setRejected(null);
      return;
    }
    setLocking(true);
    setRejected(null);
    setAnnouncement(definition.completion[locale]);
    completionTimerRef.current = window.setTimeout(() => {
      onComplete();
      completionTimerRef.current = null;
    }, 180);
  };

  const visibleHint = hintLevel === 3
    ? definition.answer[locale]
    : hintLevel === 2
      ? definition.relationship[locale]
      : null;

  return (
    <section
      className={styles.gate}
      data-family={definition.family}
      data-hint={hintLevel === 1 ? "visual" : "none"}
      data-level={String(definition.id).padStart(3, "0")}
      data-locking={locking ? "true" : "false"}
      data-spatial={visualEnabled ? "on" : "off"}
      data-step={step}
      data-testid="cognitive-evidence-gate"
      aria-label={locale === "zh" ? "观察页面异常" : "Observe the page anomaly"}
    >
      <div className={styles.field} aria-hidden="true">
        <span /><span /><span /><i />
      </div>
      <div className={styles.probes}>
        {definition.probes.map((probe, index) => {
          const sourceMark = visualMarks[index % visualMarks.length];
          const slots = definition.probes.length === 4
            ? [[20, 62], [43, 25], [78, 45], [57, 76]]
            : [[21, 65], [50, 27], [79, 65]];
          const slot = slots[index];
          const mark = {
            ...sourceMark,
            x: slot[0] + (sourceMark.x % 9) - 4,
            y: slot[1] + (sourceMark.y % 7) - 3,
            size: Math.max(44, Math.min(58, sourceMark.size)),
          };
          return (
            <button
              key={probe.id}
              type="button"
              className={styles.probe}
              data-expected={hintLevel === 1 && expectedId === probe.id ? "true" : "false"}
              data-observed={observedSet.has(probe.id) ? "true" : "false"}
              data-rejected={rejected === probe.id ? "true" : "false"}
              data-role={probe.role}
              data-shape={mark.shape}
              data-testid={`cognitive-probe-${probe.id}`}
              aria-label={probe.label[locale]}
              onClick={() => activateProbe(probe.id)}
            style={{
              "--probe-index": index,
              "--probe-x": `${mark.x}%`,
              "--probe-y": `${mark.y}%`,
              "--probe-size": `${mark.size}px`,
              "--probe-rotation": `${mark.rotation}deg`,
            } as React.CSSProperties}
              >
              <span aria-hidden="true"><i /><b /><em /></span>
            </button>
          );
        })}
      </div>
      {visibleHint ? <p className={styles.hintCopy}>{visibleHint}</p> : null}
      <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p>
    </section>
  );
}
