"use client";

import { Check, LockKeyhole } from "lucide-react";
import type { MessageKey } from "@/i18n/config";
import { useLocale } from "@/i18n/locale-provider";
import type { CollectionEntry } from "@/types/api";
import { REASONING_ORDINAL } from "@/game/reasoning-campaign/order";
import { REASONING_CAMPAIGN } from "@/game/reasoning-campaign/catalog";

export function CollectionPanel({ collection, reasoning = false }: { collection: CollectionEntry[]; reasoning?: boolean }) {
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
  const ordered = reasoning ? [...collection].sort((a, b) => (REASONING_ORDINAL.get(a.slug) ?? 101) - (REASONING_ORDINAL.get(b.slug) ?? 101)) : collection;
  const family = (slug: string) => {
    const level = REASONING_CAMPAIGN[(REASONING_ORDINAL.get(slug) ?? 0) - 1];
    const names = { flow: ["时间转移", "Transfers"], paper: ["叠影", "Overlaps"], gears: ["联动指针", "Coupled hands"], weave: ["翻转", "Flips"], route: ["开关通路", "Gate routes"], order: ["页片次序", "Page order"] };
    return level ? names[level.puzzle.kind][locale === "zh" ? 0 : 1] : "";
  };
  return (
    <section className="intel-panel collection-panel" aria-labelledby="collection-title">
      <header className="panel-heading">
        <div><h2 className="sr-only" id="collection-title">{t("cheatArchive")}</h2><p>{t("recoveredExploits")}</p></div>
        <strong>{String(unlocked).padStart(2, "0")} / {collection.length}</strong>
      </header>
      <div className="collection-grid">
        {ordered.map((entry, index) => (
          <article className={entry.unlocked ? "unlocked" : "locked"} key={entry.slug}>
            <div className="archive-index">{String(index + 1).padStart(2, "0")}</div>
            <div>
              <span>{reasoning ? family(entry.slug) : category(entry.category)} · D{entry.difficulty}</span>
              <h3>{entry.unlocked ? (locale === "zh" ? (entry.nameZh ?? entry.name) : entry.name) : t("classified")}</h3>
              {entry.unlocked ? <p>{(locale === "zh" ? entry.descriptionZh : entry.description) ?? ""}</p> : null}
            </div>
            {entry.unlocked ? <Check aria-label={t("unlocked")} size={18} /> : <LockKeyhole aria-label={t("locked")} size={16} />}
          </article>
        ))}
      </div>
    </section>
  );
}
