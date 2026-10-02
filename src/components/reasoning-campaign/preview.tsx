"use client";
import { useState } from "react";
import { REASONING_CAMPAIGN } from "@/game/reasoning-campaign/catalog";
import { ReasoningScene } from "./scene";
export function ReasoningCampaignPreview() {
  const [index, setIndex] = useState(0);
  const [locale, setLocale] = useState<"zh" | "en">("zh");
  const [hint, setHint] = useState(0);
  return <main style={{ padding: "24px 14px", minHeight: "100dvh", background: "#dff4ff" }}>
    <nav aria-label="研究关卡" style={{ maxWidth: 720, margin: "auto", display: "flex", gap: 12, flexWrap: "wrap" }}>
      <label>TIME HACKER <select aria-label="关卡" style={{ minHeight: 44, maxWidth: "100%" }} value={index} onChange={(event) => { setIndex(Number(event.target.value)); setHint(0); }}>{REASONING_CAMPAIGN.map((level, i) => <option key={i} value={i}>{String(i+1).padStart(3,"0")} {level.title[locale]}</option>)}</select></label>
      <button style={{ minHeight: 44 }} onClick={() => setLocale(locale === "zh" ? "en" : "zh")}>{locale === "zh" ? "English" : "中文"}</button>
      <button style={{ minHeight: 44 }} onClick={() => setHint(Math.min(3, hint+1))}>{locale === "zh" ? "线索" : "Hint"} {hint}/3</button>
    </nav>
    <ReasoningScene key={index} level={REASONING_CAMPAIGN[index]} locale={locale} armed={false} hintLevel={hint} onDiscover={() => {}} onArm={() => {}} />
    <p style={{ maxWidth: 720, margin: "auto", color: "#4c596f", fontSize: 13 }}>独立规则验收页，不记录正式成绩。</p>
  </main>;
}
