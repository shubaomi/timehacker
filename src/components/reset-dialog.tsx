"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useLocale } from "@/i18n/locale-provider";

interface ResetDialogProps {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ResetDialog({ open, busy, onCancel, onConfirm }: ResetDialogProps) {
  const { t } = useLocale();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);
  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="reset-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="dialog-close" type="button" onClick={onCancel} aria-label={t("closeResetDialog")}><X aria-hidden="true" size={18} /></button>
        <AlertTriangle aria-hidden="true" className="dialog-alert" size={28} />
        <p>{t("destructiveOperation")}</p>
        <h2 id="reset-title">{t("resetTitle")}</h2>
        <p>{t("resetDescription")}</p>
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={busy}>{t("keepProgress")}</button>
          <button type="button" className="danger-button" onClick={onConfirm} disabled={busy}>{busy ? t("resetting") : t("resetMine")}</button>
        </div>
      </section>
    </div>
  );
}
