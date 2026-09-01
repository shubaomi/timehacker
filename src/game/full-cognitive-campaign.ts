import { V2_LEVELS, type V2ControllerKind } from "./v2-levels.generated";

export type CognitiveEvidenceFamily = "breath" | "language" | "projection" | "layers" | "route" | "state";
export type CognitiveEvidenceRole = "counterexample" | "observation" | "relation" | "synthesis";

export interface CognitiveEvidenceProbe {
  id: string;
  role: CognitiveEvidenceRole;
  label: { zh: string; en: string };
  response: { zh: string; en: string };
}

export interface FullCognitiveLevelDefinition {
  id: number;
  traceKey: `TH-CR-${string}`;
  slug: string;
  controller: V2ControllerKind;
  family: CognitiveEvidenceFamily;
  probes: readonly CognitiveEvidenceProbe[];
  sequence: readonly string[];
  relationship: { zh: string; en: string };
  answer: { zh: string; en: string };
  completion: { zh: string; en: string };
}

const familyByController: Record<V2ControllerKind, CognitiveEvidenceFamily> = {
  "corner-repair": "layers",
  "patient-hold": "breath",
  "word-shift": "language",
  "shadow-sort": "projection",
  "light-drag": "projection",
  trace: "route",
  "frame-drag": "layers",
  "layer-stack": "layers",
  fold: "layers",
  "coupled-drag": "state",
  "wave-align": "projection",
  flip: "language",
  orbit: "route",
  resize: "layers",
  "focus-route": "route",
  rhythm: "state",
  "wheel-echo": "state",
  "cover-return": "state",
  rotate: "projection",
  "edge-route": "route",
  "shared-control": "state",
  constellation: "projection",
};

const surfaceHypothesis: Record<V2ControllerKind, string> = {
  "corner-repair": "轻压最显眼的角",
  "patient-hold": "连续操作最显眼的中心",
  "word-shift": "移动整组文字的位置",
  "shadow-sort": "按外形或颜色直接配对",
  "light-drag": "移动被照亮的对象本身",
  trace: "沿最短直线连接亮点",
  "frame-drag": "只移动框内对象",
  "layer-stack": "按面积堆叠所有纸层",
  fold: "沿最明显折线折一次",
  "coupled-drag": "分别独立对齐两个对象",
  "wave-align": "让最高波峰重合",
  flip: "翻开所有可翻面对象",
  orbit: "把运动对象拖入中心",
  resize: "拖动对象跨过边界",
  "focus-route": "依次点击所有节点",
  rhythm: "快速重复点击",
  "wheel-echo": "只看当前指针位置",
  "cover-return": "遮住最显眼的对象",
  rotate: "让缺口或刻线重合",
  "edge-route": "从中心走最短路径",
  "shared-control": "分别完成其中一侧",
  constellation: "按亮度连接所有星点",
};

function freezeText(zh: string, en: string) {
  return Object.freeze({ zh, en });
}

function defineLevel(level: (typeof V2_LEVELS)[number]): FullCognitiveLevelDefinition {
  const number = String(level.id).padStart(3, "0");
  const probes: CognitiveEvidenceProbe[] = [
    {
      id: `surface-${number}`,
      role: "counterexample",
      label: freezeText(surfaceHypothesis[level.controller], `Test the obvious surface cue in ${level.title.en}`),
      response: freezeText(level.feedback, `The obvious cue responds, but it does not establish the rule in ${level.title.en}.`),
    },
    {
      id: `anomaly-${number}`,
      role: "observation",
      label: freezeText(level.discovery, `Observe the anomaly in ${level.title.en}`),
      response: freezeText(`异常保持一致：${level.discovery}。`, `The anomaly remains consistent in ${level.title.en}.`),
    },
    {
      id: `relation-${number}`,
      role: "relation",
      label: freezeText(`比较关系：${level.cognitiveShift}`, `Compare the relationship in ${level.title.en}`),
      response: freezeText(`单个对象不足以解释页面，关系开始成立。`, `A single object is insufficient; the relationship now holds.`),
    },
  ];
  if (level.id >= 85) {
    probes.push({
      id: `synthesis-${number}`,
      role: "synthesis",
      label: freezeText(`把关系带回整张页面`, `Apply the relationship to the whole page`),
      response: freezeText(`此前的页面语法与本关异常合成同一条规则。`, `A learned page grammar and this anomaly now form one rule.`),
    });
  }
  return Object.freeze({
    id: level.id,
    traceKey: `TH-CR-${number}` as const,
    slug: level.slug,
    controller: level.controller,
    family: familyByController[level.controller],
    probes: Object.freeze(probes.map((probe) => Object.freeze(probe))),
    sequence: Object.freeze(probes.map(({ id }) => id)),
    relationship: freezeText(level.cognitiveShift, `The key relationship of ${level.title.en} is now visible.`),
    answer: freezeText(level.solve, level.walkthrough),
    completion: freezeText("关系成立。原来的页面机制现在可以被利用。", "The relationship holds. The original page mechanism can now be used."),
  });
}

export const FULL_COGNITIVE_CAMPAIGN = Object.freeze(V2_LEVELS.map(defineLevel));
export const FULL_COGNITIVE_BY_SLUG: ReadonlyMap<string, FullCognitiveLevelDefinition> = new Map(
  FULL_COGNITIVE_CAMPAIGN.map((level) => [level.slug, level]),
);

export function isFullCognitiveCoverageComplete() {
  return FULL_COGNITIVE_CAMPAIGN.length === 100
    && FULL_COGNITIVE_BY_SLUG.size === 100
    && new Set(FULL_COGNITIVE_CAMPAIGN.map(({ traceKey }) => traceKey)).size === 100
    && FULL_COGNITIVE_CAMPAIGN.every((level) => level.sequence.length >= 3);
}

export function isCognitiveRedesignEnabled(
  value = process.env.NEXT_PUBLIC_TIME_HACKER_COGNITIVE_REDESIGN,
) {
  return value === "1";
}
