"use client";

import { Check, LockKeyhole } from "lucide-react";
import type { CollectionEntry } from "@/types/api";

export function CollectionPanel({ collection }: { collection: CollectionEntry[] }) {
  const unlocked = collection.filter((entry) => entry.unlocked).length;
  return (
    <section className="intel-panel collection-panel" aria-labelledby="collection-title">
      <header className="panel-heading">
        <div><p>Recovered exploits</p><h2 id="collection-title">Cheat archive</h2></div>
        <strong>{String(unlocked).padStart(2, "0")} / 20</strong>
      </header>
      <div className="collection-grid">
        {collection.map((entry, index) => (
          <article className={entry.unlocked ? "unlocked" : "locked"} key={entry.slug}>
            <div className="archive-index">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <span>{entry.category} · D{entry.difficulty}</span>
              <h3>{entry.name}</h3>
              <p>{entry.description ?? "Complete its classified ritual to reveal this file."}</p>
            </div>
            {entry.unlocked ? <Check aria-label="Unlocked" size={18} /> : <LockKeyhole aria-label="Locked" size={16} />}
          </article>
        ))}
      </div>
    </section>
  );
}
