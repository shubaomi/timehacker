"use client";

import { FlaskConical, Languages, PanelTop, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import {
  getPrototypeTimer,
  PROTOTYPE_PHASES,
  type PrototypeLevel,
  type PrototypePhase,
} from "@/game/v2-prototype";
import { useLocale } from "@/i18n/locale-provider";
import { RepresentativeScene } from "./representative-scenes";
import { RiskSpikeLab } from "./risk-spike-lab";
import styles from "./prototype-lab.module.css";

const levelNames = {
  zh: { "001": "破损纸框", "003": "漂动字牌", "100": "暮色星群" },
  en: { "001": "Broken frame", "003": "Drifting type", "100": "Twilight stars" },
} as const;

export function PrototypeLab() {
  const { locale, setLocale } = useLocale();
  const [view, setView] = useState<"scenes" | "spikes">("scenes");
  const [level, setLevel] = useState<PrototypeLevel>("001");
  const [phase, setPhase] = useState<PrototypePhase>("DORMANT");
  const [assistedResult, setAssistedResult] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const zh = locale === "zh";

  const resetScene = useCallback((nextLevel: PrototypeLevel = level) => {
    setLevel(nextLevel);
    setPhase("DORMANT");
    setAssistedResult(false);
    setResetKey((value) => value + 1);
  }, [level]);

  const setReviewPhase = (nextPhase: PrototypePhase) => {
    setPhase(nextPhase);
    setAssistedResult(nextPhase === "RUNNING_ASSISTED" || nextPhase === "RESULT");
  };

  const handleDiscover = useCallback(() => {
    setPhase((current) => current === "DORMANT" ? "DISCOVERED" : current);
  }, []);

  const handleArm = useCallback(() => {
    setAssistedResult(true);
    setPhase("ARMED");
  }, []);

  const handleMainAction = () => {
    if (phase === "ARMED") {
      setAssistedResult(true);
      setPhase("RUNNING_ASSISTED");
      return;
    }
    if (phase === "RUNNING_NORMAL" || phase === "RUNNING_ASSISTED") {
      setPhase("RESULT");
      return;
    }
    if (phase === "RESULT") {
      resetScene();
      return;
    }
    setAssistedResult(false);
    setPhase("RUNNING_NORMAL");
  };

  return (
    <main className={styles.labRoot}>
      <header className={styles.labHeader}>
        <div>
          <span className={styles.eyebrow}>TIME HACKER V2 · PLAYTEST</span>
          <h1>Gate B · {zh ? "代表关原型" : "Representative prototypes"}</h1>
          <p>{zh ? "独立视觉与交互评审，不连接生产数据。" : "An isolated visual and interaction review. No production data."}</p>
        </div>
        <button className={styles.localeButton} type="button" onClick={() => setLocale(zh ? "en" : "zh")}>
          <Languages aria-hidden="true" size={17} />
          {zh ? "EN" : "中文"}
        </button>
      </header>

      <nav className={styles.viewTabs} aria-label={zh ? "原型视图" : "Prototype views"}>
        <button type="button" aria-pressed={view === "scenes"} onClick={() => setView("scenes")}>
          <PanelTop aria-hidden="true" size={17} />{zh ? "代表关场景" : "Scene prototypes"}
        </button>
        <button type="button" aria-pressed={view === "spikes"} onClick={() => setView("spikes")}>
          <FlaskConical aria-hidden="true" size={17} />{zh ? "交互实验" : "Interaction spikes"}
        </button>
      </nav>

      {view === "scenes" ? (
        <>
          <section className={styles.reviewRail} aria-label={zh ? "原型检查控制" : "Prototype review controls"}>
            <div className={styles.levelPicker}>
              {(["001", "003", "100"] as const).map((number) => (
                <button key={number} type="button" aria-pressed={level === number} onClick={() => resetScene(number)}>
                  <b>{zh ? `关卡 ${number}` : `Level ${number}`}</b>
                  <span>{levelNames[locale][number]}</span>
                </button>
              ))}
            </div>
            <div className={styles.phasePicker} aria-label={zh ? "六个评审状态" : "Six review states"}>
              {PROTOTYPE_PHASES.map((item) => (
                <button key={item} type="button" aria-pressed={phase === item} aria-label={item} onClick={() => setReviewPhase(item)}>
                  <span>{item.replace("RUNNING_", "")}</span>
                </button>
              ))}
            </div>
            <p className={styles.reviewNote}><Sparkles aria-hidden="true" size={15} />{zh ? "状态按钮仅供评审；舞台内的发现与破解仍可自然推进。" : "State controls are for review; discovery still progresses naturally inside the stage."}</p>
          </section>

          <RepresentativeScene
            level={level}
            locale={locale}
            phase={phase}
            timer={getPrototypeTimer(phase, assistedResult)}
            resetKey={resetKey}
            assistedResult={assistedResult}
            onDiscover={handleDiscover}
            onArm={handleArm}
            onMainAction={handleMainAction}
          />
        </>
      ) : <RiskSpikeLab locale={locale} />}

      <footer className={styles.labFooter}>
        <span>ISOLATED PROTOTYPE</span>
        <p>{zh ? "未替换正式首页 · 未写入数据库 · 未启用遥测" : "No homepage replacement · No database writes · No telemetry"}</p>
      </footer>
    </main>
  );
}
