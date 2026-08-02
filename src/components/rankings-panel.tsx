"use client";

import { Medal, ShieldCheck, Target } from "lucide-react";
import { formatDuration, formatSignedError } from "@/game/timer";
import { useLocale } from "@/i18n/locale-provider";
import type { RankingsData } from "@/types/api";

interface RankingsPanelProps {
  rankings: RankingsData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function EmptyRank({ label }: { label: string }) {
  return <p className="empty-rank">{label}</p>;
}

export function RankingsPanel({ rankings, loading, error, onRetry }: RankingsPanelProps) {
  const { t } = useLocale();
  if (loading) return <section className="intel-panel panel-state" aria-busy="true">{t("decryptingRanks")}</section>;
  if (error || !rankings) {
    return (
      <section className="intel-panel panel-state error-state" role="alert">
        <p>{error ?? t("rankUnavailable")}</p>
        <button type="button" onClick={onRetry}>{t("retryChannel")}</button>
      </section>
    );
  }
  return (
    <section className="intel-panel rankings-panel" aria-labelledby="rankings-title">
      <header className="panel-heading">
        <div><p>{t("publicRecords")}</p><h2 id="rankings-title">{t("globalRanks")}</h2></div>
        <span className="live-chip"><i /> {t("live")}</span>
      </header>
      <div className="rank-columns">
        <article>
          <h3><Medal aria-hidden="true" size={17} /> {t("timeHackers")}</h3>
          {rankings.timeHackers.length === 0 ? <EmptyRank label={t("noRecords")} /> : <ol>{rankings.timeHackers.slice(0, 8).map((entry) => (
            <li key={`${entry.rank}-${entry.displayName}`}><b>{String(entry.rank).padStart(2, "0")}</b><span>{entry.displayName}</span><em>L{entry.level} · {t("winsCount", { count: entry.successes })}</em></li>
          ))}</ol>}
        </article>
        <article>
          <h3><Target aria-hidden="true" size={17} /> {t("perfectTiming")}</h3>
          {rankings.perfectTiming.length === 0 ? <EmptyRank label={t("noRecords")} /> : <ol>{rankings.perfectTiming.slice(0, 8).map((entry) => (
            <li key={`${entry.rank}-${entry.displayName}-${entry.completedAt}`}><b>{String(entry.rank).padStart(2, "0")}</b><span>{entry.displayName}</span><em>{formatDuration(entry.durationMs)} · {formatSignedError(entry.errorMs)}</em></li>
          ))}</ol>}
        </article>
        <article>
          <h3><ShieldCheck aria-hidden="true" size={17} /> {t("cheatMasters")}</h3>
          {rankings.cheatMasters.length === 0 ? <EmptyRank label={t("noRecords")} /> : <ol>{rankings.cheatMasters.slice(0, 8).map((entry) => (
            <li key={`${entry.rank}-${entry.displayName}`}><b>{String(entry.rank).padStart(2, "0")}</b><span>{entry.displayName}</span><em>{entry.unlockedCheats}/100 · D{entry.highestDifficulty}</em></li>
          ))}</ol>}
        </article>
      </div>
      <p className="rank-boundary">{t("rankBoundary")}</p>
    </section>
  );
}
