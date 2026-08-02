"use client";

import { Check, LockKeyhole } from "lucide-react";
import type { MessageKey } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";
import type { CollectionEntry } from "@/types/api";

export function CollectionPanel({ collection }: { collection: CollectionEntry[] }) {
  const { locale, t } = useLocale();
  const unlocked = collection.filter((entry) => entry.unlocked).length;
  const categoryMessages: Record<string, MessageKey> = {
    OPERATION: "categoryOperation",
    VISUAL: "categoryVisual",
    RHYTHM: "categoryRhythm",
    DEVICE: "categoryDevice",
    META: "categoryMeta",
  };
  const category = (value: string) => t(categoryMessages[value] ?? "categoryMeta");
  return (
    <section className="intel-panel collection-panel" aria-labelledby="collection-title">
      <header className="panel-heading">
        <div><p>{t("recoveredExploits")}</p><h2 id="collection-title">{t("cheatArchive")}</h2></div>
        <strong>{String(unlocked).padStart(2, "0")} / {collection.length}</strong>
      </header>
      <div className="collection-grid">
        {collection.map((entry, index) => (
          <article className={entry.unlocked ? "unlocked" : "locked"} key={entry.slug}>
            <div className="archive-index">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <span>{category(entry.category)} · D{entry.difficulty}</span>
              <h3>{locale === "zh" ? entry.nameZh : entry.name}</h3>
              <p>{(locale === "zh" ? entry.descriptionZh : entry.description) ?? t("classifiedDescription")}</p>
            </div>
            {entry.unlocked ? <Check aria-label={t("unlocked")} size={18} /> : <LockKeyhole aria-label={t("locked")} size={16} />}
          </article>
        ))}
      </div>
    </section>
  );
}
