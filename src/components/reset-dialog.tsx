"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ResetDialogProps {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ResetDialog({ open, busy, onCancel, onConfirm }: ResetDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="dialog-close" type="button" onClick={onCancel} aria-label="Close reset dialog"><X aria-hidden="true" size={18} /></button>
        <AlertTriangle aria-hidden="true" className="dialog-alert" size={28} />
        <p>Destructive local operation</p>
        <h2 id="reset-title">Reset your field record?</h2>
        <p>This removes your game records, level, wins, best error, and recovered cheats. Your anonymous ID and nickname stay intact. No other player is affected.</p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy}>Keep progress</button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={busy}>{busy ? "Resetting…" : "Reset my progress"}</button>
        </div>
      </section>
    </div>
  );
}
