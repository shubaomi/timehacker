import type { CheatDefinition, CheatTriggerConfig } from "./cheats";
import type { EventPattern } from "./types";

type Revision = Partial<Pick<CheatDefinition,
  "name" | "nameZh" | "description" | "descriptionZh" | "hint" | "hintZh" | "category" | "triggerConfig"
>>;

const sequence = (pattern: EventPattern[], windowMs = 8_000): CheatTriggerConfig => ({
  kind: "sequence",
  pattern,
  windowMs,
});

const values = (type: string, entries: Array<string | number>, windowMs = 8_000): CheatTriggerConfig =>
  sequence(entries.map((value) => ({ type, value })), windowMs);

const timed = (
  pattern: EventPattern[],
  intervals: Array<[number, number]>,
): CheatTriggerConfig => ({
  kind: "timedSequence",
  pattern,
  intervals: intervals.map(([minMs, maxMs]) => ({ minMs, maxMs })),
});

const fallback = (
  primary: EventPattern[],
  alternative: EventPattern[],
  windowMs = 15_000,
): CheatTriggerConfig => ({
  kind: "fallback",
  primary: { kind: "sequence", pattern: primary, windowMs },
  fallback: { kind: "sequence", pattern: alternative, windowMs },
});

const orientationRoundTrip = (command: string): CheatTriggerConfig => fallback(
  [
    { type: "ORIENTATION", value: "portrait" },
    { type: "ORIENTATION", value: "landscape" },
    { type: "ORIENTATION", value: "portrait" },
  ],
  command.split("").map((value) => ({ type: "KEY", value })),
  30_000,
);

const inspectFallback = (route: string[]): CheatTriggerConfig => fallback(
  route.map((value) => ({ type: "FOCUS", value })),
  route.map((value) => ({ type: "INSPECT", value })),
);

/**
 * Curated second-pass changes. Slugs stay stable so existing UserCheat rows keep
 * their foreign-key identity while the canonical ritual can evolve safely.
 */
export const CHEAT_REVISIONS: Readonly<Record<string, Revision>> = {
  "five-finger-echo": {
    hint: "Knock the glass five times, or use the Echo Latch once.",
    hintZh: "敲击玻璃五次，或单击一次“回声锁存”。",
    triggerConfig: fallback(
      Array.from({ length: 5 }, () => ({ type: "TIMER_TAP" })),
      [{ type: "ACCESS_LATCH", value: "echo" }],
      3_000,
    ),
  },
  "pressure-delay": {
    hint: "Hold START briefly, or lock the pressure buffer with one tap.",
    hintZh: "短暂长按开始，或单击压力锁存来充能。",
    triggerConfig: {
      kind: "accessibleHold",
      eventType: "CONTROL_HOLD",
      minDurationMs: 1_400,
      alternative: {
        kind: "sequence",
        pattern: [{ type: "ACCESS_LATCH", value: "pressure" }],
        windowMs: 8_000,
      },
    },
  },
  "triple-actuator": {
    hint: "Test Relay three times; the acknowledgements need not be fast.",
    hintZh: "测试继电器三次，不需要快速连点。",
    triggerConfig: { kind: "count", eventType: "CONTROL_TAP", count: 3, windowMs: 3_000 },
  },
  "status-rebound": {
    hint: "Acknowledge Status twice, or arm the two-step Status Latch.",
    hintZh: "确认状态两次，或使用两步状态锁存。",
    triggerConfig: fallback(
      [{ type: "STATUS_TAP" }, { type: "STATUS_TAP" }],
      [{ type: "ACCESS_LATCH", value: "status-1" }, { type: "ACCESS_LATCH", value: "status-2" }],
      1_500,
    ),
  },
  "mode-flip": {
    name: "Mode Paradox",
    nameZh: "模式悖论",
    description: "A trip from Hacker to Pure and back leaves one governor out of phase.",
    descriptionZh: "从黑客模式切到纯净模式再返回，会让一个调速器脱离相位。",
    hint: "Leave Hacker for Pure, then return to Hacker before the trace cools.",
    hintZh: "从黑客切到纯净，再在线路冷却前返回黑客模式。",
    triggerConfig: values("MODE_TOGGLE", ["pure", "hacker"], 8_000),
  },
  "reverse-sweep": {
    hint: "Sweep down, up, down with the wheel or the service sweep keys.",
    hintZh: "用滚轮或服务扫描键完成下、上、下。",
    triggerConfig: fallback(
      ["down", "up", "down"].map((value) => ({ type: "WHEEL", value })),
      ["down", "up", "down"].map((value) => ({ type: "SERVICE_SWEEP", value })),
    ),
  },
  "escape-hatch": {
    hint: "Escape, Enter, Escape — keyboard or the three service keys.",
    hintZh: "Escape、Enter、Escape；可用键盘或三个服务键。",
    triggerConfig: fallback(
      ["ESCAPE", "ENTER", "ESCAPE"].map((value) => ({ type: "KEY", value })),
      ["ESCAPE", "ENTER", "ESCAPE"].map((value) => ({ type: "SERVICE_KEY", value })),
    ),
  },
  "ten-thousand-glyph": {
    hint: "Touch the five target positions from left to right.",
    hintZh: "从左到右依次触碰目标的五个数字位置。",
    triggerConfig: values("GLYPH_POSITION", [0, 1, 2, 3, 4]),
  },
  "quiet-circuit": {
    hint: "Inspect Target, Mode, Control without activating them.",
    hintZh: "依次检查目标、模式、主控制，不要激活它们。",
    triggerConfig: inspectFallback(["target", "mode", "control"]),
  },
  "double-relay": {
    name: "Relay Morse Alpha", nameZh: "继电摩斯甲",
    description: "A short-long relay signature opens the first maintenance channel.",
    descriptionZh: "一短一长的继电脉冲会打开第一维护通道。",
    hint: "Send SHORT, then LONG on the pulse keys.", hintZh: "在脉冲键依次发送短、长。",
    category: "OPERATION", triggerConfig: values("RITUAL_PULSE", ["short", "long"]),
  },
  "slow-clap": {
    name: "Falling Intervals", nameZh: "递减拍距",
    description: "Four beats that accelerate wake a divider which ignores steady tempo.",
    descriptionZh: "逐拍加速的四次脉冲会唤醒一个无视等拍的分频器。",
    hint: "Tap four beats, each gap shorter than the last.", hintZh: "敲四拍，让每一拍间隔都比上一拍更短。",
    triggerConfig: timed(
      Array.from({ length: 4 }, () => ({ type: "RHYTHM_TAP" })),
      [[800, 1_200], [500, 800], [220, 500]],
    ),
  },
  "breath-gap": {
    triggerConfig: { kind: "wait", eventType: "READY_WAIT", minDurationMs: 3_000 },
  },
  "window-peek": {
    name: "Locale Relay", nameZh: "语言继电",
    description: "The shell leaks a clock token when English returns through Chinese.",
    descriptionZh: "英文经由中文再返回时，外壳会泄露一枚时钟令牌。",
    hint: "Switch English → 中文 → English.", hintZh: "按 English → 中文 → English 切换。",
    category: "META", triggerConfig: values("LOCALE_TOGGLE", ["zh", "en"]),
  },
  "landscape-nudge": {
    name: "Amber Capture", nameZh: "琥珀捕获",
    description: "Acknowledging the beacon during its amber scan captures a spare phase.",
    descriptionZh: "在信标扫过琥珀相位时确认，会捕获一段备用相位。",
    hint: "Press Status while its scan reads AMBER.", hintZh: "状态扫描显示“琥珀”时按下状态灯。",
    category: "VISUAL", triggerConfig: values("STATUS_PHASE_CAPTURE", ["amber"]),
  },
  "deep-pressure": {
    name: "Pressure Interlock", nameZh: "压力联锁",
    description: "A latched relay turns the next START test into a pressure bypass.",
    descriptionZh: "锁存继电器后，下一次开始测试会变成压力旁路。",
    hint: "Latch Relay, then tap START.", hintZh: "先锁存继电器，再单击开始。",
    triggerConfig: sequence([{ type: "ACCESS_LATCH", value: "relay" }, { type: "CONTROL_TAP" }]),
  },
  "outer-ones": {
    hint: "Touch the two outside target positions, then the center.",
    hintZh: "触碰目标最外侧的两个位置，再触碰中央位置。",
    triggerConfig: values("GLYPH_POSITION", [0, 4, 2]),
  },
  "double-horizon": {
    name: "Gravity Round Trip", nameZh: "重力往返",
    description: "A complete portrait-landscape-portrait trip returns with a spare gravity sample.",
    descriptionZh: "完成竖屏、横屏、竖屏往返，会带回一份备用重力样本。",
    hint: "Portrait → landscape → portrait, or enter TILT.", hintZh: "竖屏 → 横屏 → 竖屏，或输入 TILT。",
    triggerConfig: orientationRoundTrip("TILT"),
  },
  "return-ticket": {
    name: "Channel Ticket", nameZh: "通道换票",
    description: "A language change between pointer and keyboard reissues the input ticket.",
    descriptionZh: "在指针与键盘之间切换语言，会重新签发输入票。",
    hint: "Pointer, change language, Keyboard; or enter RETURN.", hintZh: "指针、切换语言、键盘；或输入 RETURN。",
    triggerConfig: fallback(
      [{ type: "INPUT_SOURCE", value: "pointer" }, { type: "LOCALE_TOGGLE" }, { type: "INPUT_SOURCE", value: "keyboard" }],
      "RETURN".split("").map((value) => ({ type: "KEY", value })),
    ),
  },
  "silent-handoff": {
    hint: "Inspect Mode, then Control. Keyboard focus follows the same route.",
    hintZh: "依次检查模式、主控制；键盘焦点也可走同一路线。",
    triggerConfig: inspectFallback(["mode", "control"]),
  },
  "pause-word": {
    name: "Quiet Relay Window", nameZh: "静默继电窗口",
    description: "A relay knock between two and four seconds catches the idle handoff.",
    descriptionZh: "在静默两到四秒之间敲击继电器，会截获空闲交接。",
    hint: "After READY, wait 2–4 seconds, then tap Relay.", hintZh: "进入就绪后等待 2–4 秒，再点继电器。",
    category: "RHYTHM",
    triggerConfig: timed([{ type: "READY_MARK" }, { type: "CONTROL_TAP" }], [[2_000, 4_000]]),
  },
  "relay-quorum": {
    name: "Relay Morse Beta", nameZh: "继电摩斯乙",
    description: "A long-short-long relay word authorizes the second governor.",
    descriptionZh: "长、短、长的继电字会授权第二调速器。",
    hint: "Send LONG, SHORT, LONG.", hintZh: "依次发送长、短、长。",
    category: "OPERATION", triggerConfig: values("RITUAL_PULSE", ["long", "short", "long"]),
  },
  "precision-five": {
    name: "Rising Intervals", nameZh: "递增拍距",
    description: "Four beats that slow down reveal the oscillator's expanding seam.",
    descriptionZh: "逐拍放慢的四次脉冲会显露振荡器不断扩张的接缝。",
    hint: "Tap four beats, each gap longer than the last.", hintZh: "敲四拍，让每一拍间隔都比上一拍更长。",
    triggerConfig: timed(
      Array.from({ length: 4 }, () => ({ type: "RHYTHM_TAP" })),
      [[220, 500], [500, 800], [800, 1_200]],
    ),
  },
  "fourfold-ack": {
    name: "Offbeat Beacon", nameZh: "反拍信标",
    description: "A beacon between two rhythm beats occupies the divider's missing beat.",
    descriptionZh: "夹在两次节奏之间的信标会占据分频器缺失的反拍。",
    hint: "Rhythm, then Status halfway, then Rhythm.", hintZh: "节奏、半拍处状态、再节奏。",
    triggerConfig: timed(
      [{ type: "RHYTHM_TAP" }, { type: "STATUS_TAP" }, { type: "RHYTHM_TAP" }],
      [[350, 650], [350, 650]],
    ),
  },
  "pulse-checker": {
    name: "Echo Gap", nameZh: "回声间隙",
    description: "Two pulses separated by one narrow gap reveal a hidden echo chamber.",
    descriptionZh: "两次脉冲落在一个窄间隔内，会显露隐藏回声舱。",
    hint: "Tap Rhythm twice with a 0.6–0.9 second gap.", hintZh: "两次节奏点击间隔保持在 0.6–0.9 秒。",
    triggerConfig: timed([{ type: "RHYTHM_TAP" }, { type: "RHYTHM_TAP" }], [[600, 900]]),
  },
  "ghost-session": {
    name: "Ghost Acknowledgement", nameZh: "幽灵确认",
    description: "A status acknowledgement just after one tab return signs for the ghost session.",
    descriptionZh: "标签返回后立即确认状态，会替幽灵会话签收。",
    hint: "Return once, then press Status within two seconds.", hintZh: "返回标签页一次，并在两秒内按状态灯。",
    category: "META",
    triggerConfig: timed([{ type: "VISIBILITY_RETURN" }, { type: "STATUS_TAP" }], [[0, 2_000]]),
  },
  "hinge-loop": {
    hint: "Landscape, return to the tab, then portrait; or enter FLIP.",
    hintZh: "横屏、返回标签页、再竖屏；或输入 FLIP。",
    triggerConfig: fallback(
      [{ type: "ORIENTATION", value: "landscape" }, { type: "VISIBILITY_RETURN" }, { type: "ORIENTATION", value: "portrait" }],
      "FLIP".split("").map((value) => ({ type: "KEY", value })),
      30_000,
    ),
  },
  "hybrid-console": {
    name: "Locale Mirror", nameZh: "语言镜像台",
    description: "A pointer signature reflected through another language returns as keyboard authority.",
    descriptionZh: "指针签名穿过另一种语言后，会以键盘权限返回。",
    hint: "Pointer, switch language, Keyboard, switch back.", hintZh: "指针、切换语言、键盘、切回语言。",
    category: "META",
    triggerConfig: sequence([
      { type: "INPUT_SOURCE", value: "pointer" }, { type: "LOCALE_TOGGLE" },
      { type: "INPUT_SOURCE", value: "keyboard" }, { type: "LOCALE_TOGGLE" },
    ]),
  },
  "portable-horizon": {
    hint: "Landscape, portrait, then return to the tab; or enter PORTAL.",
    hintZh: "横屏、竖屏，再返回标签页；或输入 PORTAL。",
    triggerConfig: fallback(
      [{ type: "ORIENTATION", value: "landscape" }, { type: "ORIENTATION", value: "portrait" }, { type: "VISIBILITY_RETURN" }],
      "PORTAL".split("").map((value) => ({ type: "KEY", value })),
      30_000,
    ),
  },
  "focus-orbit": { triggerConfig: inspectFallback(["target", "control", "mode", "target"]) },
  "long-archive-route": {
    name: "Target-Guided Route", nameZh: "目标导引路线",
    description: "A target digit points to the archive that must be visited before returning.",
    descriptionZh: "目标数字会指出返回实验前必须访问的档案。",
    hint: "Touch the first target position, open Ranks, then return.", hintZh: "触碰目标首位，打开排行榜，再返回实验。",
    category: "VISUAL",
    triggerConfig: sequence([{ type: "GLYPH_POSITION", value: 0 }, { type: "PANEL_OPEN", value: "ranks" }, { type: "PANEL_OPEN", value: "game" }]),
  },
  "pressure-vault": {
    name: "Beacon Vault", nameZh: "信标保险库",
    description: "Two relay knocks prepare a vault that opens only in amber phase.",
    descriptionZh: "两次继电敲击会准备保险库，但它只在琥珀相位打开。",
    hint: "Relay twice, then capture the amber Status phase.", hintZh: "点两次继电器，再捕获状态灯的琥珀相位。",
    triggerConfig: sequence([{ type: "CONTROL_TAP" }, { type: "CONTROL_TAP" }, { type: "STATUS_PHASE_CAPTURE", value: "amber" }]),
  },
  "wheel-echo": {
    hint: "Sweep up, down, up, down with the wheel or service keys.",
    hintZh: "用滚轮或服务键完成上、下、上、下。",
    triggerConfig: fallback(
      ["up", "down", "up", "down"].map((value) => ({ type: "WHEEL", value })),
      ["up", "down", "up", "down"].map((value) => ({ type: "SERVICE_SWEEP", value })),
    ),
  },
  "six-beat-lock": {
    name: "Morse Minute", nameZh: "分钟摩斯",
    description: "A short-short-long pulse word addresses the minute register.",
    descriptionZh: "短、短、长的脉冲字会寻址分钟寄存器。",
    hint: "Send SHORT, SHORT, LONG.", hintZh: "依次发送短、短、长。",
    triggerConfig: values("RITUAL_PULSE", ["short", "short", "long"]),
  },
  "beacon-saturation": {
    name: "Amber Scanline", nameZh: "琥珀扫描线",
    description: "Capturing two amber passes saturates the beacon without repeated tapping.",
    descriptionZh: "捕获两次琥珀扫描，无需快速连点也能让信标饱和。",
    hint: "Capture AMBER, wait for it to pass, then capture AMBER again.", hintZh: "捕获琥珀相位，等待扫过，再捕获一次。",
    triggerConfig: values("STATUS_PHASE_CAPTURE", ["amber", "amber"], 10_000),
  },
  "triple-phase": {
    name: "Two-One Syncopation", nameZh: "二加一切分",
    description: "A short pair followed by a long gap splits the beacon phrase two plus one.",
    descriptionZh: "短促双拍接一段长间隔，会把信标短句切成二加一。",
    hint: "Status, Rhythm quickly; pause; then Status.", hintZh: "快速点状态、节奏；停顿；再点状态。",
    triggerConfig: timed(
      [{ type: "STATUS_TAP" }, { type: "RHYTHM_TAP" }, { type: "STATUS_TAP" }],
      [[200, 500], [800, 1_300]],
    ),
  },
  "phase-return": {
    name: "Return Deadline", nameZh: "返回时限",
    description: "A relay acknowledgement before a returning tab cools catches its stale phase.",
    descriptionZh: "标签返回后冷却前确认继电器，会截获它的旧相位。",
    hint: "Return once, then tap Relay within 1.5 seconds.", hintZh: "返回一次，并在 1.5 秒内点击继电器。",
    category: "META",
    triggerConfig: timed([{ type: "VISIBILITY_RETURN" }, { type: "CONTROL_TAP" }], [[0, 1_500]]),
  },
  "parallax-window": {
    hint: "Landscape, portrait, then return once; or enter PARALLAX.",
    hintZh: "横屏、竖屏，再返回一次；或输入 PARALLAX。",
    triggerConfig: fallback(
      [{ type: "ORIENTATION", value: "landscape" }, { type: "ORIENTATION", value: "portrait" }, { type: "VISIBILITY_RETURN" }],
      "PARALLAX".split("").map((value) => ({ type: "KEY", value })),
      30_000,
    ),
  },
  "override-command": {
    name: "Bilingual Override", nameZh: "双语覆盖",
    description: "TIME is accepted only after the shell crosses into its other language.",
    descriptionZh: "只有外壳切到另一种语言后，TIME 才会被接受。",
    hint: "Switch language, then enter TIME.", hintZh: "先切换语言，再输入 TIME。",
    triggerConfig: sequence([{ type: "LOCALE_TOGGLE" }, ..."TIME".split("").map((value) => ({ type: "KEY", value }))]),
  },
  "archive-figure-eight": {
    name: "Archive Fragments", nameZh: "档案碎片",
    description: "A clue fragment collected in each archive completes a two-part checksum.",
    descriptionZh: "在两个档案各收集一枚线索碎片，会完成两段校验和。",
    hint: "Cheats, TIME, Ranks, HERE, then Experiment.", hintZh: "作弊档案、TIME、排行榜、HERE，再回实验。",
    triggerConfig: sequence([
      { type: "PANEL_OPEN", value: "cheats" }, { type: "CLUE_TOKEN", value: "time" },
      { type: "PANEL_OPEN", value: "ranks" }, { type: "CLUE_TOKEN", value: "here" },
      { type: "PANEL_OPEN", value: "game" },
    ], 15_000),
  },
  "focus-cascade": {
    hint: "Inspect Control, Mode, Target, Control in one cascade.",
    hintZh: "按主控制、模式、目标、主控制完成检查级联。",
    triggerConfig: inspectFallback(["control", "mode", "target", "control"]),
  },
  "seven-relay-vote": {
    name: "Countdown Relay", nameZh: "倒数继电",
    description: "Target positions and relay votes interleave as a three-step countdown.",
    descriptionZh: "目标位置与继电票交织成三步倒数。",
    hint: "Target position 3, Relay, position 2, Relay, position 1.", hintZh: "目标第 3 位、继电器、第 2 位、继电器、第 1 位。",
    triggerConfig: sequence([
      { type: "GLYPH_POSITION", value: 2 }, { type: "CONTROL_TAP" },
      { type: "GLYPH_POSITION", value: 1 }, { type: "CONTROL_TAP" },
      { type: "GLYPH_POSITION", value: 0 },
    ]),
  },
  "pressure-singularity": {
    name: "Corner Interlock", nameZh: "角点联锁",
    description: "Two opposite housing safeties make the next START test collapse the budget.",
    descriptionZh: "两个对角外壳保险会让下一次开始测试压缩时间预算。",
    hint: "Touch NW, SE, then tap START.", hintZh: "依次触碰西北、东南，再点开始。",
    triggerConfig: sequence([{ type: "CORNER_TAP", value: "NW" }, { type: "CORNER_TAP", value: "SE" }, { type: "CONTROL_TAP" }]),
  },
  "double-housing-loop": {
    name: "Housing Mirror", nameZh: "外壳镜像",
    description: "A clockwise half-trace reflected backward cancels the housing checksum.",
    descriptionZh: "顺时针半圈再反向镜像，会抵消外壳校验和。",
    hint: "NW, NE, SE, then NE, NW.", hintZh: "依次触碰西北、东北、东南、东北、西北。",
    triggerConfig: values("CORNER_TAP", ["NW", "NE", "SE", "NE", "NW"]),
  },
  "hundred-code": {
    description: "The seven-bit 1100100 pattern identifies decimal one hundred.",
    descriptionZh: "七位二进制 1100100 正确对应十进制一百。",
    hint: "Enter Calibration 1, 1, 0, 0, 1, 0, 0.",
    hintZh: "在校准区输入 1、1、0、0、1、0、0。",
    triggerConfig: values("CALIBRATION_TAP", [1, 1, 0, 0, 1, 0, 0], 9_000),
  },
  "seven-beat-null": {
    name: "Null Accelerando", nameZh: "归零渐快",
    description: "A guided accelerating phrase drains the oscillator without blind precision.",
    descriptionZh: "有轨道提示的渐快短句会耗尽振荡器，而非要求盲猜精度。",
    hint: "Follow four beats as the guide accelerates.", hintZh: "跟随引导敲四拍，间隔会逐步加快。",
    triggerConfig: timed(
      Array.from({ length: 4 }, () => ({ type: "RHYTHM_TAP" })),
      [[700, 950], [450, 700], [220, 450]],
    ),
  },
  "sevenfold-ack": {
    name: "Binary Beacon", nameZh: "二进制信标",
    description: "Status and rhythm encode the visible 10101 beacon word.",
    descriptionZh: "状态与节奏会编码可见的 10101 信标字。",
    hint: "Status, Rhythm, Status, Rhythm, Status.", hintZh: "依次点击状态、节奏、状态、节奏、状态。",
    triggerConfig: sequence([
      { type: "STATUS_TAP" }, { type: "RHYTHM_TAP" }, { type: "STATUS_TAP" },
      { type: "RHYTHM_TAP" }, { type: "STATUS_TAP" },
    ]),
  },
  "quad-phase": {
    name: "Broken Waltz", nameZh: "破碎华尔兹",
    description: "A one-one-two interval phrase bends the phase without adding more taps.",
    descriptionZh: "一、一、二的间隔短句不用增加点击，也能扭曲相位。",
    hint: "Tap Rhythm with gaps 1, 1, then 2.", hintZh: "敲四次节奏，间隔依次为一、一、二。",
    triggerConfig: timed(
      Array.from({ length: 4 }, () => ({ type: "RHYTHM_TAP" })),
      [[350, 650], [350, 650], [800, 1_200]],
    ),
  },
  "eclipse-session": {
    name: "Eclipse Return", nameZh: "日食返回",
    description: "Leaving during the beacon's dark phase lets one return eclipse the live clock.",
    descriptionZh: "在信标暗相位离开，一次返回就能遮蔽实时钟。",
    hint: "Capture DARK, then leave and return once.", hintZh: "捕获“暗”相位，再离开并返回一次。",
    triggerConfig: fallback(
      [{ type: "STATUS_PHASE_CAPTURE", value: "dark" }, { type: "VISIBILITY_RETURN" }],
      "ECLIPSE".split("").map((value) => ({ type: "KEY", value })),
      20_000,
    ),
  },
  "triple-gravity": {
    name: "Gravity Round Trip II", nameZh: "重力往返二式",
    description: "An expert portrait-landscape-portrait trace closes the gravity circuit.",
    descriptionZh: "专家级竖屏、横屏、竖屏轨迹会闭合重力电路。",
    hint: "Portrait → landscape → portrait, or enter GRAVITY.", hintZh: "竖屏 → 横屏 → 竖屏，或输入 GRAVITY。",
    triggerConfig: orientationRoundTrip("GRAVITY"),
  },
  "liminal-device": {
    hint: "Landscape, portrait, return, then switch language; or enter LIMINAL.",
    hintZh: "横屏、竖屏、返回，再切换语言；或输入 LIMINAL。",
    triggerConfig: fallback(
      [
        { type: "ORIENTATION", value: "landscape" }, { type: "ORIENTATION", value: "portrait" },
        { type: "VISIBILITY_RETURN" }, { type: "LOCALE_TOGGLE" },
      ],
      "LIMINAL".split("").map((value) => ({ type: "KEY", value })),
      35_000,
    ),
  },
  "device-braid": {
    name: "Locale Input Braid", nameZh: "语言输入编织",
    description: "Pointer and keyboard authority braid around one language transition.",
    descriptionZh: "指针与键盘权限围绕一次语言切换完成编织。",
    hint: "Pointer, switch language, then Keyboard.", hintZh: "指针、切换语言、再键盘。",
    category: "META",
    triggerConfig: sequence([
      { type: "INPUT_SOURCE", value: "pointer" }, { type: "LOCALE_TOGGLE" },
      { type: "INPUT_SOURCE", value: "keyboard" },
    ]),
  },
  "chronos-command": {
    name: "Clockface Sum", nameZh: "钟面求和",
    description: "Three target positions whose indices total ten unlock the old clockface bus.",
    descriptionZh: "三个索引之和为十的目标位置会解锁旧钟面总线。",
    hint: "Touch target positions 2, 3, and 5.", hintZh: "依次触碰目标第 2、3、5 位。",
    category: "VISUAL", triggerConfig: values("GLYPH_POSITION", [1, 2, 4]),
  },
  "archive-labyrinth": {
    name: "Daily Archive Route", nameZh: "每日档案路线",
    description: "Today's visible checksum selects a compact three-stop archive route.",
    descriptionZh: "今日可见校验码会选出一条紧凑的三站档案路线。",
    hint: "Follow the displayed route: Ranks, Cheats, Experiment.", hintZh: "按显示路线访问：排行榜、作弊档案、实验。",
    triggerConfig: values("PANEL_OPEN", ["ranks", "cheats", "game"], 12_000),
  },
  "silent-constellation": {
    hint: "Inspect Target, Mode, Control; then Target, Control, Mode.",
    hintZh: "检查目标、模式、主控制；再检查目标、主控制、模式。",
    triggerConfig: inspectFallback(["target", "mode", "control", "target", "control", "mode"]),
  },
};
