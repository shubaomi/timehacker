"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIRECTOR_EVIDENCE_BY_LEVEL,
  type DirectorEvidenceDefinition,
} from "@/game/director-evidence";
import styles from "./director-evidence-gate.module.css";

type DirectorEvidenceGateProps = {
  levelNumber: number;
  locale: "zh" | "en";
  hintLevel: 0 | 1 | 2 | 3;
  visualEnabled: boolean;
  onDiscover: () => void;
  onComplete: () => void;
};

function evidenceFor(levelNumber: number): DirectorEvidenceDefinition {
  const definition = DIRECTOR_EVIDENCE_BY_LEVEL.get(levelNumber);
  if (!definition) throw new RangeError(`Missing Director evidence definition for level ${levelNumber}`);
  return definition;
}

export function DirectorEvidenceGate({
  levelNumber,
  locale,
  hintLevel,
  visualEnabled,
  onDiscover,
  onComplete,
}: DirectorEvidenceGateProps) {
  const definition = evidenceFor(levelNumber);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const [observed, setObserved] = useState<readonly string[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const completionTimerRef = useRef<number | null>(null);
  const rejectionTimerRef = useRef<number | null>(null);
  const expectedId = definition.sequence[step] ?? null;
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
      }, 320);
      return;
    }

    const nextStep = stepRef.current + 1;
    if (nextStep < definition.sequence.length) {
      stepRef.current = nextStep;
      setStep(nextStep);
      setRejected(null);
      return;
    }

    setLocking(true);
    setRejected(null);
    setAnnouncement(definition.completion[locale]);
    completionTimerRef.current = window.setTimeout(() => {
      onComplete();
      completionTimerRef.current = null;
    }, 260);
  };

  return (
    <section
      className={styles.gate}
      data-family={definition.family}
      data-hint={hintLevel === 1 ? "visual" : "none"}
      data-level={String(levelNumber).padStart(2, "0")}
      data-locking={locking ? "true" : "false"}
      data-spatial={visualEnabled ? "on" : "off"}
      data-step={step}
      data-testid="director-evidence-gate"
      aria-label={locale === "zh" ? "可观察的纸面关系" : "Observable paper relationships"}
    >
      <div className={styles.field} aria-hidden="true">
        <span className={styles.fieldPlane} />
        <span className={styles.fieldAxis} />
        <span className={styles.fieldShadow} />
      </div>
      <div className={styles.probes}>
        {definition.probes.map((probe, index) => (
          <button
            key={probe.id}
            type="button"
            className={styles.probe}
            data-expected={hintLevel === 1 && expectedId === probe.id ? "true" : "false"}
            data-observed={observedSet.has(probe.id) ? "true" : "false"}
            data-rejected={rejected === probe.id ? "true" : "false"}
            data-role={probe.role}
            data-testid={`director-evidence-probe-${probe.id}`}
            aria-label={probe.label[locale]}
            onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
              }
              activateProbe(probe.id);
            }}
            onClick={(event) => {
              if (event.detail === 0) activateProbe(probe.id);
            }}
            style={{ "--probe-index": index } as React.CSSProperties}
          >
            <span aria-hidden="true"><i /><b /><em /></span>
          </button>
        ))}
      </div>
      <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p>
    </section>
  );
}
