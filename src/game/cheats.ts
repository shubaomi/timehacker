import { z } from "zod";
import { ADDITIONAL_CHEAT_DEFINITIONS } from "./cheat-catalog";
import { CHEAT_REVISIONS } from "./cheat-revisions";
import {
  cheatEffectConfigSchema,
  makeCatalogEffect,
  type CheatEffectConfig,
} from "./effects";
import type { CheatCategory, CheatEvent, EventPattern } from "./types";

const eventPatternSchema = z.object({
  type: z.string().min(1),
  value: z.union([z.string(), z.number()]).optional(),
});

const sequenceSchema = z.object({
  kind: z.literal("sequence"),
  pattern: z.array(eventPatternSchema).min(1),
  windowMs: z.number().positive().optional(),
});

const countSchema = z.object({
  kind: z.literal("count"),
  eventType: z.string().min(1),
  count: z.number().int().positive(),
  windowMs: z.number().positive(),
});

const holdSchema = z.object({
  kind: z.literal("hold"),
  eventType: z.string().min(1),
  minDurationMs: z.number().positive(),
});

const alternatingSchema = z.object({
  kind: z.literal("alternating"),
  first: eventPatternSchema,
  second: eventPatternSchema,
  cycles: z.number().int().positive(),
  windowMs: z.number().positive(),
});

const rhythmSchema = z.object({
  kind: z.literal("rhythm"),
  eventType: z.string().min(1),
  count: z.number().int().min(3),
  maxDeviationMs: z.number().nonnegative(),
  windowMs: z.number().positive(),
});

const waitSchema = z.object({
  kind: z.literal("wait"),
  eventType: z.string().min(1),
  minDurationMs: z.number().positive(),
});

const timedSequenceSchema = z.object({
  kind: z.literal("timedSequence"),
  pattern: z.array(eventPatternSchema).min(2),
  intervals: z.array(z.object({
    minMs: z.number().nonnegative(),
    maxMs: z.number().positive(),
  })).min(1),
});

const waitRangeSchema = z.object({
  kind: z.literal("waitRange"),
  eventType: z.string().min(1),
  minDurationMs: z.number().nonnegative(),
  maxDurationMs: z.number().positive(),
});

const simpleTriggerSchema = z.discriminatedUnion("kind", [
  sequenceSchema,
  countSchema,
  holdSchema,
  alternatingSchema,
  rhythmSchema,
  waitSchema,
  timedSequenceSchema,
  waitRangeSchema,
]);

const fallbackSchema = z.object({
  kind: z.literal("fallback"),
  primary: sequenceSchema,
  fallback: sequenceSchema,
});

const accessibleHoldSchema = z.object({
  kind: z.literal("accessibleHold"),
  eventType: z.string().min(1),
  minDurationMs: z.number().positive().max(2_500),
  alternative: sequenceSchema,
});

export const SECRET_GESTURES = ["up", "down", "left", "right", "tap", "hold"] as const;
export type SecretGesture = (typeof SECRET_GESTURES)[number];

const secretGestureExtension = z.object({
  secretGesture: z.array(z.enum(SECRET_GESTURES)).min(3).max(5),
});

export const cheatTriggerConfigSchema = z.intersection(z.union([
  simpleTriggerSchema,
  fallbackSchema,
  accessibleHoldSchema,
]), secretGestureExtension.partial());

export type CheatTriggerConfig = z.infer<typeof cheatTriggerConfigSchema>;
export { cheatEffectConfigSchema } from "./effects";
export type { CheatEffectConfig } from "./effects";

export interface CheatDefinition {
  slug: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  hint: string;
  hintZh: string;
  difficulty: number;
  category: CheatCategory;
  triggerConfig: CheatTriggerConfig;
  effectConfig: CheatEffectConfig;
  enabled: boolean;
}

function sequence(
  pattern: EventPattern[],
  windowMs?: number,
): CheatTriggerConfig {
  return { kind: "sequence", pattern, windowMs };
}

const BASE_CHEAT_DEFINITIONS = [
  {
    slug: "five-finger-echo",
    name: "Five-Finger Echo",
    description: "The faceplate remembers a rapid knock better than it remembers time.",
    hint: "The glass is listening. Knock five times before launch.",
    difficulty: 1,
    category: "OPERATION",
    triggerConfig: { kind: "count", eventType: "TIMER_TAP", count: 5, windowMs: 2_000 },
    effectConfig: { timeScale: 0.42, label: "Echo damping engaged" },
    enabled: true,
  },
  {
    slug: "pressure-delay",
    name: "Pressure Delay",
    description: "Holding the actuator preloads a delay into the timing circuit.",
    hint: "Do not press and release. Let the control feel your patience.",
    difficulty: 1,
    category: "OPERATION",
    triggerConfig: { kind: "hold", eventType: "CONTROL_HOLD", minDurationMs: 1_400 },
    effectConfig: { timeScale: 0.38, label: "Pressure buffer charged" },
    enabled: true,
  },
  {
    slug: "slow-command",
    name: "Slow Command",
    description: "A maintenance mnemonic slips past the public control layer.",
    hint: "The lab accepts one four-letter instruction from a keyboard.",
    difficulty: 1,
    category: "META",
    triggerConfig: sequence(
      ["S", "L", "O", "W"].map((value) => ({ type: "KEY", value })),
      3_000,
    ),
    effectConfig: { timeScale: 0.45, label: "SLOW command accepted" },
    enabled: true,
  },
  {
    slug: "four-corner-breach",
    name: "Four-Corner Breach",
    description: "A clockwise diagnostic sweep opens an undocumented service route.",
    hint: "Trace the housing from north-west, clockwise.",
    difficulty: 1,
    category: "VISUAL",
    triggerConfig: sequence(
      ["NW", "NE", "SE", "SW"].map((value) => ({ type: "CORNER_TAP", value })),
      4_000,
    ),
    effectConfig: { timeScale: 0.35, label: "Housing loop bypassed" },
    enabled: true,
  },
  {
    slug: "signal-oscillation",
    name: "Signal Oscillation",
    description: "Alternating between evidence and instrument destabilizes the clock source.",
    hint: "Glass, clue, glass, clue — repeat the contradiction.",
    difficulty: 1,
    category: "OPERATION",
    triggerConfig: {
      kind: "alternating",
      first: { type: "TIMER_TAP" },
      second: { type: "CLUE_TAP" },
      cycles: 3,
      windowMs: 4_000,
    },
    effectConfig: { timeScale: 0.48, label: "Oscillation captured" },
    enabled: true,
  },
  {
    slug: "triple-actuator",
    name: "Triple Actuator",
    description: "Three idle actuator tests leave the relay in a permissive state.",
    hint: "Test the main control three times while the chamber is idle.",
    difficulty: 2,
    category: "OPERATION",
    triggerConfig: { kind: "count", eventType: "CONTROL_TAP", count: 3, windowMs: 1_200 },
    effectConfig: { timeScale: 0.34, label: "Relay permissive state" },
    enabled: true,
  },
  {
    slug: "calibration-101",
    name: "Calibration 101",
    description: "A binary service code reroutes the display oscillator.",
    hint: "The smallest useful lesson is written 1–0–1.",
    difficulty: 2,
    category: "VISUAL",
    triggerConfig: sequence(
      [1, 0, 1].map((value) => ({ type: "CALIBRATION_TAP", value })),
      3_000,
    ),
    effectConfig: { timeScale: 0.3, label: "Binary calibration loaded" },
    enabled: true,
  },
  {
    slug: "status-rebound",
    name: "Status Rebound",
    description: "The status lamp rebounds when acknowledged twice in one beat.",
    hint: "Acknowledge the live status twice — quickly.",
    difficulty: 2,
    category: "RHYTHM",
    triggerConfig: { kind: "count", eventType: "STATUS_TAP", count: 2, windowMs: 500 },
    effectConfig: { timeScale: 0.4, label: "Status rebound detected" },
    enabled: true,
  },
  {
    slug: "patient-zero",
    name: "Patient Zero",
    description: "An untouched chamber drifts out of specification after five seconds.",
    hint: "Wait in READY. Do absolutely nothing for five seconds.",
    difficulty: 2,
    category: "RHYTHM",
    triggerConfig: { kind: "wait", eventType: "READY_WAIT", minDurationMs: 5_000 },
    effectConfig: { timeScale: 0.32, label: "Idle drift harvested" },
    enabled: true,
  },
  {
    slug: "mode-flip",
    name: "Mode Flip",
    description: "Rapid mode negotiation leaves both governors partially active.",
    hint: "Change your mind three times before the lab can settle.",
    difficulty: 2,
    category: "META",
    triggerConfig: { kind: "count", eventType: "MODE_TOGGLE", count: 3, windowMs: 2_400 },
    effectConfig: { timeScale: 0.44, label: "Governor conflict active" },
    enabled: true,
  },
  {
    slug: "metronome-leak",
    name: "Metronome Leak",
    description: "Four evenly spaced pulses synchronize with the internal divider.",
    hint: "Tap a steady four-beat measure on the rhythm port.",
    difficulty: 3,
    category: "RHYTHM",
    triggerConfig: {
      kind: "rhythm",
      eventType: "RHYTHM_TAP",
      count: 4,
      maxDeviationMs: 150,
      windowMs: 4_000,
    },
    effectConfig: { timeScale: 0.36, label: "Metronome phase locked" },
    enabled: true,
  },
  {
    slug: "reverse-sweep",
    name: "Reverse Sweep",
    description: "A down-up-down scan reverses the calibration bus for one run.",
    hint: "Sweep down, back up, then down across the instrument.",
    difficulty: 3,
    category: "OPERATION",
    triggerConfig: sequence(
      ["down", "up", "down"].map((value) => ({ type: "WHEEL", value })),
      3_000,
    ),
    effectConfig: { timeScale: 0.28, label: "Calibration bus reversed" },
    enabled: true,
  },
  {
    slug: "archive-route",
    name: "Archive Route",
    description: "A particular tour through archived intelligence reopens the game clock.",
    hint: "Visit Cheats, then Ranks, then return to Game.",
    difficulty: 3,
    category: "META",
    triggerConfig: sequence(
      ["cheats", "ranks", "game"].map((value) => ({ type: "PANEL_OPEN", value })),
      8_000,
    ),
    effectConfig: { timeScale: 0.39, label: "Archive route authenticated" },
    enabled: true,
  },
  {
    slug: "clue-cipher",
    name: "Clue Cipher",
    description: "Three highlighted words form a sentence the timer was built to obey.",
    hint: "Read only the marked words: TIME / BENDS / HERE.",
    difficulty: 3,
    category: "VISUAL",
    triggerConfig: sequence(
      ["time", "bends", "here"].map((value) => ({ type: "CLUE_TOKEN", value })),
      5_000,
    ),
    effectConfig: { timeScale: 0.26, label: "Cipher phrase resolved" },
    enabled: true,
  },
  {
    slug: "tab-return",
    name: "Tab Return",
    description: "A returning browser tab carries stale clock authority with it.",
    hint: "Leave and return — or type BACK if your device cannot.",
    difficulty: 4,
    category: "DEVICE",
    triggerConfig: {
      kind: "fallback",
      primary: { kind: "sequence", pattern: [{ type: "VISIBILITY_RETURN" }], windowMs: 10_000 },
      fallback: {
        kind: "sequence",
        pattern: ["B", "A", "C", "K"].map((value) => ({ type: "KEY", value })),
        windowMs: 3_000,
      },
    },
    effectConfig: { timeScale: 0.31, label: "Stale tab authority accepted" },
    enabled: true,
  },
  {
    slug: "horizon-shift",
    name: "Horizon Shift",
    description: "A landscape sensor reading changes the chamber's assumed gravity.",
    hint: "Turn the horizon — or spell HORIZON from a keyboard.",
    difficulty: 4,
    category: "DEVICE",
    triggerConfig: {
      kind: "fallback",
      primary: {
        kind: "sequence",
        pattern: [{ type: "ORIENTATION", value: "landscape" }],
        windowMs: 10_000,
      },
      fallback: {
        kind: "sequence",
        pattern: "HORIZON".split("").map((value) => ({ type: "KEY", value })),
        windowMs: 5_000,
      },
    },
    effectConfig: { timeScale: 0.24, label: "Gravity assumption rotated" },
    enabled: true,
  },
  {
    slug: "escape-hatch",
    name: "Escape Hatch",
    description: "The oldest keyboard exit sequence still controls the lab shell.",
    hint: "Escape. Enter. Escape again.",
    difficulty: 4,
    category: "META",
    triggerConfig: sequence(
      ["ESCAPE", "ENTER", "ESCAPE"].map((value) => ({ type: "KEY", value })),
      3_000,
    ),
    effectConfig: { timeScale: 0.22, label: "Shell escape hatch open" },
    enabled: true,
  },
  {
    slug: "mirrored-input",
    name: "Mirrored Input",
    description: "Alternating pointer and keyboard signals creates a doubled control identity.",
    hint: "Pointer, keyboard, pointer, keyboard — mirror the operator.",
    difficulty: 4,
    category: "OPERATION",
    triggerConfig: {
      kind: "alternating",
      first: { type: "INPUT_SOURCE", value: "pointer" },
      second: { type: "INPUT_SOURCE", value: "keyboard" },
      cycles: 2,
      windowMs: 4_000,
    },
    effectConfig: { timeScale: 0.2, label: "Dual operator identity" },
    enabled: true,
  },
  {
    slug: "ten-thousand-glyph",
    name: "Ten-Thousand Glyph",
    description: "The target itself becomes a service code when entered digit by digit.",
    hint: "Touch the target as five separate glyphs: 1 0 0 0 0.",
    difficulty: 5,
    category: "VISUAL",
    triggerConfig: sequence(
      [1, 0, 0, 0, 0].map((value) => ({ type: "GLYPH_TAP", value })),
      5_000,
    ),
    effectConfig: { timeScale: 0.18, label: "Target glyph override" },
    enabled: true,
  },
  {
    slug: "quiet-circuit",
    name: "Quiet Circuit",
    description: "A focus-only inspection route arms the timer without touching a control.",
    hint: "Focus Target, Mode, then Control. Do not activate them.",
    difficulty: 5,
    category: "META",
    triggerConfig: sequence(
      ["target", "mode", "control"].map((value) => ({ type: "FOCUS", value })),
      6_000,
    ),
    effectConfig: { timeScale: 0.16, label: "Quiet circuit armed" },
    enabled: true,
  },
] as const;

type LegacyTranslation = {
  nameZh: string;
  descriptionZh: string;
  hintZh: string;
  labelZh: string;
};

const LEGACY_TRANSLATIONS: Record<
  (typeof BASE_CHEAT_DEFINITIONS)[number]["slug"],
  LegacyTranslation
> = {
  "five-finger-echo": { nameZh: "五指回声", descriptionZh: "面板记住快速敲击的能力，比记住时间更强。", hintZh: "玻璃正在监听。启动前快速敲击五次。", labelZh: "回声阻尼已接入" },
  "pressure-delay": { nameZh: "压力延迟", descriptionZh: "长按执行器会把延迟预载到计时电路中。", hintZh: "不要立即松开，让控制器感受到你的耐心。", labelZh: "压力缓存已充能" },
  "slow-command": { nameZh: "慢速命令", descriptionZh: "一条维护助记命令能绕过公共控制层。", hintZh: "实验室接受一条四字母键盘指令。", labelZh: "SLOW 命令已接受" },
  "four-corner-breach": { nameZh: "四角突破", descriptionZh: "顺时针诊断扫描会打开未记录的服务路线。", hintZh: "从西北角开始，沿顺时针描摹外壳。", labelZh: "外壳回路已绕过" },
  "signal-oscillation": { nameZh: "信号振荡", descriptionZh: "在证据与仪器之间交替操作会扰乱时钟源。", hintZh: "玻璃、线索、玻璃、线索——重复这个矛盾。", labelZh: "振荡信号已捕获" },
  "triple-actuator": { nameZh: "三重执行器", descriptionZh: "三次待机测试会让继电器进入宽松状态。", hintZh: "计时舱空闲时，测试主控制三次。", labelZh: "继电器宽松状态已开启" },
  "calibration-101": { nameZh: "校准 101", descriptionZh: "一段二进制服务码会重定向显示振荡器。", hintZh: "最小的有效课程写作 1—0—1。", labelZh: "二进制校准已加载" },
  "status-rebound": { nameZh: "状态回弹", descriptionZh: "在同一拍内确认两次，状态灯就会回弹。", hintZh: "快速确认两次实时状态。", labelZh: "检测到状态回弹" },
  "patient-zero": { nameZh: "零号耐心", descriptionZh: "无人触碰的计时舱会在五秒后偏离规格。", hintZh: "在就绪状态等待五秒，什么都不要做。", labelZh: "空闲漂移已收集" },
  "mode-flip": { nameZh: "模式翻转", descriptionZh: "快速切换模式会让两个调速器同时部分生效。", hintZh: "在系统稳定前连续改变三次主意。", labelZh: "调速器冲突已激活" },
  "metronome-leak": { nameZh: "节拍器泄漏", descriptionZh: "四次均匀脉冲会与内部时钟分频器同步。", hintZh: "在节奏端口敲出稳定的四拍。", labelZh: "节拍相位已锁定" },
  "reverse-sweep": { nameZh: "反向扫描", descriptionZh: "下、上、下的扫描会让校准总线反向运行一次。", hintZh: "在仪器上向下、向上、再向下滚动。", labelZh: "校准总线已反转" },
  "archive-route": { nameZh: "档案路线", descriptionZh: "穿过情报档案的特定路线会重新打开游戏时钟。", hintZh: "访问作弊档案、排行榜，再回到实验。", labelZh: "档案路线已认证" },
  "clue-cipher": { nameZh: "线索密文", descriptionZh: "三个高亮词会组成一句计时器必须服从的话。", hintZh: "只读标记词：TIME / BENDS / HERE。", labelZh: "密文短句已解析" },
  "tab-return": { nameZh: "标签返回", descriptionZh: "返回的浏览器标签页会携带旧时钟权限。", hintZh: "切走再回来；设备不支持时可输入 BACK。", labelZh: "旧标签权限已接受" },
  "horizon-shift": { nameZh: "地平线偏移", descriptionZh: "横屏传感器读数会改变计时舱对重力的假设。", hintZh: "转动地平线，或使用键盘输入 HORIZON。", labelZh: "重力假设已旋转" },
  "escape-hatch": { nameZh: "逃生舱门", descriptionZh: "最古老的键盘退出序列仍控制着实验室外壳。", hintZh: "按 Escape、Enter、再按 Escape。", labelZh: "外壳逃生舱已打开" },
  "mirrored-input": { nameZh: "镜像输入", descriptionZh: "交替使用指针和键盘会制造双重控制身份。", hintZh: "指针、键盘、指针、键盘——镜像操作员。", labelZh: "双重操作身份已建立" },
  "ten-thousand-glyph": { nameZh: "一万字形", descriptionZh: "逐位输入目标数字时，目标本身会变成服务码。", hintZh: "把目标作为五个独立数字点击：1 0 0 0 0。", labelZh: "目标字形已覆盖" },
  "quiet-circuit": { nameZh: "静默电路", descriptionZh: "只移动焦点的检查路线能在不触碰控制器时启动计时器。", hintZh: "依次聚焦目标、模式、主控制，不要激活。", labelZh: "静默电路已启动" },
};

const PRE_REVISION_CHEATS: readonly CheatDefinition[] = [
  ...BASE_CHEAT_DEFINITIONS.map((definition) => {
    const translation = LEGACY_TRANSLATIONS[definition.slug];
    return {
      ...definition,
      nameZh: translation.nameZh,
      descriptionZh: translation.descriptionZh,
      hintZh: translation.hintZh,
      triggerConfig: cheatTriggerConfigSchema.parse(definition.triggerConfig),
      effectConfig: makeCatalogEffect(
        definition.slug,
        definition.difficulty,
        definition.effectConfig.label,
        translation.labelZh,
      ),
    };
  }),
  ...ADDITIONAL_CHEAT_DEFINITIONS,
];

function makeSecretGesture(index: number, difficulty: number): SecretGesture[] {
  const base = SECRET_GESTURES.length;
  const pattern: SecretGesture[] = [
    SECRET_GESTURES[Math.floor(index / (base * base)) % base],
    SECRET_GESTURES[Math.floor(index / base) % base],
    SECRET_GESTURES[index % base],
  ];
  if (difficulty >= 3) pattern.push(SECRET_GESTURES[(index + difficulty) % base]);
  if (difficulty >= 5) pattern.push(SECRET_GESTURES[(base - 1 - (index % base) + base) % base]);
  return pattern;
}

export const CHEAT_DEFINITIONS: readonly CheatDefinition[] = PRE_REVISION_CHEATS.map((definition, index) => {
  const revision = CHEAT_REVISIONS[definition.slug];
  const revised = revision ? { ...definition, ...revision } : definition;
  return {
    ...revised,
    triggerConfig: {
      ...revised.triggerConfig,
      secretGesture: makeSecretGesture(index, revised.difficulty),
    },
    effectConfig: makeCatalogEffect(
      revised.slug,
      revised.difficulty,
      `${revised.name} engaged`,
      `${revised.nameZh}已接入`,
    ),
  };
});

function matchesPattern(event: CheatEvent, pattern: EventPattern): boolean {
  return (
    event.type === pattern.type &&
    (pattern.value === undefined || event.value === pattern.value)
  );
}

function evaluateSequence(
  config: z.infer<typeof sequenceSchema>,
  events: readonly CheatEvent[],
): boolean {
  const relevantTypes = new Set(config.pattern.map(({ type }) => type));
  const relevantEvents = events.filter(({ type }) => relevantTypes.has(type));
  if (relevantEvents.length < config.pattern.length) return false;
  for (
    let start = 0;
    start <= relevantEvents.length - config.pattern.length;
    start += 1
  ) {
    const candidate = relevantEvents.slice(start, start + config.pattern.length);
    const matches = candidate.every((event, index) =>
      matchesPattern(event, config.pattern[index]),
    );
    if (
      matches &&
      (config.windowMs === undefined ||
        candidate.at(-1)!.at - candidate[0].at <= config.windowMs)
    ) {
      return true;
    }
  }
  return false;
}

function secretGestureSequence(config: CheatTriggerConfig) {
  return config.secretGesture
    ? {
        kind: "sequence" as const,
        pattern: config.secretGesture.map((value) => ({ type: "SECRET_GESTURE", value })),
        windowMs: 15_000,
      }
    : null;
}

function evaluateSimpleTrigger(
  config: z.infer<typeof simpleTriggerSchema>,
  events: readonly CheatEvent[],
): boolean {
  switch (config.kind) {
    case "sequence":
      return evaluateSequence(config, events);
    case "count": {
      const matching = events.filter((event) => event.type === config.eventType);
      if (matching.length < config.count) return false;
      const tail = matching.slice(-config.count);
      return tail.at(-1)!.at - tail[0].at <= config.windowMs;
    }
    case "hold":
    case "wait":
      return events.some(
        (event) =>
          event.type === config.eventType &&
          (event.durationMs ?? 0) >= config.minDurationMs,
      );
    case "alternating": {
      const expected = Array.from({ length: config.cycles * 2 }, (_, index) =>
        index % 2 === 0 ? config.first : config.second,
      );
      return evaluateSequence(
        { kind: "sequence", pattern: expected, windowMs: config.windowMs },
        events,
      );
    }
    case "rhythm": {
      const matching = events
        .filter((event) => event.type === config.eventType)
        .slice(-config.count);
      if (matching.length < config.count) return false;
      if (matching.at(-1)!.at - matching[0].at > config.windowMs) return false;
      const intervals = matching.slice(1).map((event, index) => event.at - matching[index].at);
      const average = intervals.reduce((total, interval) => total + interval, 0) / intervals.length;
      return intervals.every(
        (interval) => Math.abs(interval - average) <= config.maxDeviationMs,
      );
    }
    case "timedSequence": {
      if (config.intervals.length !== config.pattern.length - 1) return false;
      const relevantTypes = new Set(config.pattern.map(({ type }) => type));
      const relevantEvents = events.filter(({ type }) => relevantTypes.has(type));
      if (relevantEvents.length < config.pattern.length) return false;
      for (let start = 0; start <= relevantEvents.length - config.pattern.length; start += 1) {
        const candidate = relevantEvents.slice(start, start + config.pattern.length);
        if (!candidate.every((event, index) => matchesPattern(event, config.pattern[index]))) continue;
        const intervalsMatch = config.intervals.every(({ minMs, maxMs }, index) => {
          const interval = candidate[index + 1].at - candidate[index].at;
          return interval >= minMs && interval <= maxMs;
        });
        if (intervalsMatch) return true;
      }
      return false;
    }
    case "waitRange":
      return events.some((event) => {
        const duration = event.durationMs ?? -1;
        return event.type === config.eventType && duration >= config.minDurationMs && duration <= config.maxDurationMs;
      });
  }
}

export interface CheatProgress {
  matched: boolean;
  currentStep: number;
  totalSteps: number;
  resetReason: "sequence-reset" | "timing-reset" | null;
  rhythmDeviation: number | null;
  armed: boolean;
}

function sequenceProgress(
  pattern: EventPattern[],
  events: readonly CheatEvent[],
): Pick<CheatProgress, "currentStep" | "totalSteps" | "resetReason"> {
  const relevantTypes = new Set(pattern.map(({ type }) => type));
  const relevant = events.filter(({ type }) => relevantTypes.has(type));
  let currentStep = 0;
  for (let length = Math.min(pattern.length, relevant.length); length > 0; length -= 1) {
    const tail = relevant.slice(-length);
    if (tail.every((event, index) => matchesPattern(event, pattern[index]))) {
      currentStep = length;
      break;
    }
  }
  return {
    currentStep,
    totalSteps: pattern.length,
    resetReason: relevant.length > 0 && currentStep === 0 ? "sequence-reset" : null,
  };
}

export function evaluateCheatProgress(rawConfig: unknown, events: readonly CheatEvent[]): CheatProgress {
  const config = cheatTriggerConfigSchema.parse(rawConfig);
  const matched = evaluateCheatTrigger(config, events);
  let currentStep = 0;
  let totalSteps = 1;
  let resetReason: CheatProgress["resetReason"] = null;
  let rhythmDeviation: number | null = null;

  const secretSequence = secretGestureSequence(config);
  const hasSecretGestureInput = events.some(({ type }) => type === "SECRET_GESTURE");
  if (secretSequence && hasSecretGestureInput) {
    ({ currentStep, totalSteps, resetReason } = sequenceProgress(secretSequence.pattern, events));
    if (matched) currentStep = totalSteps;
    return { matched, currentStep, totalSteps, resetReason, rhythmDeviation, armed: matched };
  }

  if (config.kind === "sequence" || config.kind === "timedSequence") {
    ({ currentStep, totalSteps, resetReason } = sequenceProgress(config.pattern, events));
    if (config.kind === "timedSequence" && currentStep > 1) {
      const matching = events.filter((event) => config.pattern.some(({ type }) => type === event.type)).slice(-currentStep);
      const deviations = matching.slice(1).map((event, index) => {
        const interval = event.at - matching[index].at;
        const expected = config.intervals[index];
        if (!expected) return 0;
        if (interval < expected.minMs) return expected.minMs - interval;
        if (interval > expected.maxMs) return interval - expected.maxMs;
        return 0;
      });
      rhythmDeviation = deviations.length ? Math.max(...deviations) : null;
      if (rhythmDeviation && rhythmDeviation > 0) resetReason = "timing-reset";
    }
  } else if (config.kind === "fallback") {
    const primary = sequenceProgress(config.primary.pattern, events);
    const alternative = sequenceProgress(config.fallback.pattern, events);
    ({ currentStep, totalSteps, resetReason } = primary.currentStep >= alternative.currentStep ? primary : alternative);
  } else if (config.kind === "accessibleHold") {
    const holdEvent = events.filter(({ type }) => type === config.eventType).at(-1);
    const alternative = sequenceProgress(config.alternative.pattern, events);
    totalSteps = Math.max(1, Math.round(config.minDurationMs));
    currentStep = Math.max(
      Math.min(totalSteps, Math.round(holdEvent?.durationMs ?? 0)),
      alternative.currentStep === alternative.totalSteps ? totalSteps : 0,
    );
  } else if (config.kind === "count") {
    totalSteps = config.count;
    currentStep = Math.min(totalSteps, events.filter(({ type }) => type === config.eventType).length);
  } else if (config.kind === "alternating") {
    const pattern = Array.from({ length: config.cycles * 2 }, (_, index) => index % 2 === 0 ? config.first : config.second);
    ({ currentStep, totalSteps, resetReason } = sequenceProgress(pattern, events));
  } else if (config.kind === "rhythm") {
    totalSteps = config.count;
    const matching = events.filter(({ type }) => type === config.eventType).slice(-config.count);
    currentStep = matching.length;
    if (matching.length > 2) {
      const intervals = matching.slice(1).map((event, index) => event.at - matching[index].at);
      const average = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      rhythmDeviation = Math.max(...intervals.map((interval) => Math.abs(interval - average)));
      if (rhythmDeviation > config.maxDeviationMs) resetReason = "timing-reset";
    }
  } else {
    const minimum = config.minDurationMs;
    totalSteps = Math.max(1, Math.round(minimum));
    const latest = events.filter(({ type }) => type === config.eventType).at(-1);
    currentStep = Math.min(totalSteps, Math.round(latest?.durationMs ?? 0));
  }

  if (matched) currentStep = totalSteps;
  return { matched, currentStep, totalSteps, resetReason, rhythmDeviation, armed: matched };
}

export function evaluateCheatTrigger(
  rawConfig: unknown,
  events: readonly CheatEvent[],
): boolean {
  const config = cheatTriggerConfigSchema.parse(rawConfig);
  const secretSequence = secretGestureSequence(config);
  if (secretSequence && evaluateSequence(secretSequence, events)) return true;
  if (config.kind === "fallback") {
    return (
      evaluateSequence(config.primary, events) ||
      evaluateSequence(config.fallback, events)
    );
  }
  if (config.kind === "accessibleHold") {
    return events.some((event) => event.type === config.eventType && (event.durationMs ?? 0) >= config.minDurationMs) ||
      evaluateSequence(config.alternative, events);
  }
  return evaluateSimpleTrigger(config, events);
}

export function validateCheatDefinition(definition: CheatDefinition): CheatDefinition {
  cheatTriggerConfigSchema.parse(definition.triggerConfig);
  cheatEffectConfigSchema.parse(definition.effectConfig);
  if (!Number.isInteger(definition.difficulty) || definition.difficulty < 1 || definition.difficulty > 5) {
    throw new RangeError("Cheat difficulty must be an integer from 1 to 5");
  }
  for (const value of [definition.nameZh, definition.descriptionZh, definition.hintZh]) {
    if (value.trim().length === 0) throw new RangeError("Cheat translations are required");
  }
  if (definition.triggerConfig.kind === "timedSequence" && definition.triggerConfig.intervals.length !== definition.triggerConfig.pattern.length - 1) {
    throw new RangeError("Timed sequence must define one interval per transition");
  }
  if (definition.triggerConfig.kind === "waitRange" && definition.triggerConfig.maxDurationMs <= definition.triggerConfig.minDurationMs) {
    throw new RangeError("Wait range maximum must exceed its minimum");
  }
  return definition;
}
