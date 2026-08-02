"use client";

import { Medal, ShieldCheck, Target } from "lucide-react";
import { formatDuration, formatSignedError } from "@/game/timer";
import type { RankingsData } from "@/types/api";

interface RankingsPanelProps {
  rankings: RankingsData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function EmptyRank() {
  return <p className="empty-rank">No verified field reports yet. Be the first.</p>;
}

export function RankingsPanel({ rankings, loading, error, onRetry }: RankingsPanelProps) {
  if (loading) return <section className="intel-panel panel-state" aria-busy="true">Decrypting rank channels…</section>;
  if (error || !rankings) {
    return (
      <section className="intel-panel panel-state error-state" role="alert">
        <p>{error ?? "Rank channel unavailable."}</p>
        <button type="button" onClick={onRetry}>Retry channel</button>
      </section>
    );
  }
  return (
    <section className="intel-panel rankings-panel" aria-labelledby="rankings-title">
      <header className="panel-heading">
        <div><p>Public field records</p><h2 id="rankings-title">Global ranks</h2></div>
        <span className="live-chip"><i /> LIVE</span>
      </header>
      <div className="rank-columns">
        <article>
          <h3><Medal aria-hidden="true" size={17} /> Time Hackers</h3>
          {rankings.timeHackers.length === 0 ? <EmptyRank /> : <ol>{rankings.timeHackers.slice(0, 8).map((entry) => (
            <li key={`${entry.rank}-${entry.displayName}`}><b>{String(entry.rank).padStart(2, "0")}</b><span>{entry.displayName}</span><em>L{entry.level} · {entry.successes} wins</em></li>
          ))}</ol>}
        </article>
        <article>
          <h3><Target aria-hidden="true" size={17} /> Perfect Timing</h3>
          {rankings.perfectTiming.length === 0 ? <EmptyRank /> : <ol>{rankings.perfectTiming.slice(0, 8).map((entry) => (
            <li key={`${entry.rank}-${entry.displayName}-${entry.completedAt}`}><b>{String(entry.rank).padStart(2, "0")}</b><span>{entry.displayName}</span><em>{formatDuration(entry.durationMs)} · {formatSignedError(entry.errorMs)}</em></li>
          ))}</ol>}
        </article>
        <article>
          <h3><ShieldCheck aria-hidden="true" size={17} /> Cheat Masters</h3>
          {rankings.cheatMasters.length === 0 ? <EmptyRank /> : <ol>{rankings.cheatMasters.slice(0, 8).map((entry) => (
            <li key={`${entry.rank}-${entry.displayName}`}><b>{String(entry.rank).padStart(2, "0")}</b><span>{entry.displayName}</span><em>{entry.unlockedCheats}/20 · D{entry.highestDifficulty}</em></li>
          ))}</ol>}
        </article>
      </div>
      <p className="rank-boundary">Anonymous V1 ranks are for casual competition and are not professional anti-cheat verified.</p>
    </section>
  );
}
