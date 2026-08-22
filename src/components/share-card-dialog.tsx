"use client";

import { Copy, Download, LoaderCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useState } from "react";
import {
  createShareCardBlob,
  createShareCardDataUrl,
  downloadShareCard,
  type ShareCardPayload,
} from "@/game/share-card";
import type { Locale, MessageKey } from "@/i18n/config";

interface ShareCardDialogProps {
  open: boolean;
  payload: ShareCardPayload | null;
  locale: Locale;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  onClose: () => void;
  onExport?: (action: "save" | "copy") => void;
}

export function ShareCardDialog({ open, payload, locale, t, onClose, onExport }: ShareCardDialogProps) {
  return (
    <AnimatePresence>
      {open && payload ? (
        <ShareCardDialogContent
          key={`${locale}-${payload.durationMs}-${payload.errorMs}`}
          payload={payload}
          locale={locale}
          t={t}
          onClose={onClose}
          onExport={onExport}
        />
      ) : null}
    </AnimatePresence>
  );
}

function ShareCardDialogContent({
  payload,
  locale,
  t,
  onClose,
  onExport,
}: Omit<ShareCardDialogProps, "open" | "payload"> & { payload: ShareCardPayload }) {
  const titleId = useId();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"copy" | "download" | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createShareCardDataUrl(payload, locale)
      .then((url) => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setStatus(t("shareCardFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, payload, t]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const canCopyImage = typeof navigator !== "undefined"
    && typeof ClipboardItem !== "undefined"
    && Boolean(navigator.clipboard?.write);

  const createBlob = async () => {
    return createShareCardBlob(payload, locale);
  };

  const copyImage = async () => {
    try {
      setBusyAction("copy");
      setStatus(null);
      const blob = await createBlob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      onExport?.("copy");
      setStatus(t("shareCardCopied"));
    } catch {
      setStatus(t("shareCardFailed"));
    } finally {
      setBusyAction(null);
    }
  };

  const downloadImage = async () => {
    try {
      setBusyAction("download");
      setStatus(null);
      const blob = await createBlob();
      downloadShareCard(blob, `time-hacker-${payload.durationMs}.png`);
      onExport?.("save");
      setStatus(t("shareCardSaved"));
    } catch {
      setStatus(t("shareCardFailed"));
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <motion.div
          className="share-card-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={onClose}
        >
          <motion.section
            className="share-card-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <h2 id={titleId}>{t("shareCardPanelTitle")}</h2>
                <p>{t("shareCardPanelSubtitle")}</p>
              </div>
              <button type="button" onClick={onClose} aria-label={t("shareCardClose")}>
                <X aria-hidden="true" size={20} />
              </button>
            </header>

            <div className="share-card-preview">
              {loading ? (
                <div className="share-card-placeholder" aria-busy="true">
                  <LoaderCircle aria-hidden="true" size={28} />
                  <span>{t("shareCardLoading")}</span>
                </div>
              ) : imageUrl ? (
                // A data URL is required so the generated card can be previewed before saving.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={t("shareCardPreviewAlt")} draggable={false} />
              ) : (
                <div className="share-card-placeholder error" role="alert">{t("shareCardFailed")}</div>
              )}
            </div>

            <p className="share-card-hint">{t("shareCardHint")}</p>

            <footer>
              {canCopyImage ? (
                <button type="button" className="secondary" disabled={Boolean(busyAction) || loading} onClick={() => void copyImage()}>
                  {busyAction === "copy" ? <LoaderCircle aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
                  {busyAction === "copy" ? t("shareCardCopying") : t("shareCardCopy")}
                </button>
              ) : null}
              <button type="button" className="primary" disabled={Boolean(busyAction) || loading} onClick={() => void downloadImage()}>
                {busyAction === "download" ? <LoaderCircle aria-hidden="true" size={18} /> : <Download aria-hidden="true" size={18} />}
                {busyAction === "download" ? t("shareCardDownloading") : t("shareCardDownload")}
              </button>
            </footer>
            <div className="share-card-status" aria-live="polite">{status}</div>
          </motion.section>
    </motion.div>
  );
}
