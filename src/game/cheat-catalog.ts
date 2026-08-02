import type { CheatDefinition, CheatTriggerConfig } from "./cheats";
import { makeCatalogEffect } from "./effects";
import type { CheatCategory, EventPattern } from "./types";

const sequence = (pattern: EventPattern[], windowMs = 5_000): CheatTriggerConfig => ({
  kind: "sequence",
  pattern,
  windowMs,
});

const keys = (value: string, windowMs = 5_000): CheatTriggerConfig =>
  sequence(value.split("").map((key) => ({ type: "KEY", value: key })), windowMs);

const values = (
  type: string,
  entries: Array<string | number>,
  windowMs = 5_000,
): CheatTriggerConfig => sequence(entries.map((value) => ({ type, value })), windowMs);

const count = (eventType: string, total: number, windowMs: number): CheatTriggerConfig => ({
  kind: "count",
  eventType,
  count: total,
  windowMs,
});

const hold = (minDurationMs: number): CheatTriggerConfig => ({
  kind: "hold",
  eventType: "CONTROL_HOLD",
  minDurationMs,
});

const wait = (minDurationMs: number): CheatTriggerConfig => ({
  kind: "wait",
  eventType: "READY_WAIT",
  minDurationMs,
});

const rhythm = (
  total: number,
  maxDeviationMs: number,
  windowMs: number,
): CheatTriggerConfig => ({
  kind: "rhythm",
  eventType: "RHYTHM_TAP",
  count: total,
  maxDeviationMs,
  windowMs,
});

const alternating = (
  first: EventPattern,
  second: EventPattern,
  cycles: number,
  windowMs: number,
): CheatTriggerConfig => ({ kind: "alternating", first, second, cycles, windowMs });

const deviceFallback = (
  primary: EventPattern[],
  command: string,
  windowMs = 12_000,
): CheatTriggerConfig => ({
  kind: "fallback",
  primary: { kind: "sequence", pattern: primary, windowMs },
  fallback: {
    kind: "sequence",
    pattern: command.split("").map((value) => ({ type: "KEY", value })),
    windowMs: 6_000,
  },
});

function cheat(
  slug: string,
  name: string,
  nameZh: string,
  description: string,
  descriptionZh: string,
  hint: string,
  hintZh: string,
  difficulty: number,
  category: CheatCategory,
  triggerConfig: CheatTriggerConfig,
  timeScale: number,
): CheatDefinition {
  void timeScale;
  return {
    slug,
    name,
    nameZh,
    description,
    descriptionZh,
    hint,
    hintZh,
    difficulty,
    category,
    triggerConfig,
    effectConfig: makeCatalogEffect(slug, difficulty, `${name} engaged`, `${nameZh}已接入`),
    enabled: true,
  };
}

export const ADDITIONAL_CHEAT_DEFINITIONS: readonly CheatDefinition[] = [
  // Difficulty 1: direct, discoverable rituals.
  cheat("double-relay", "Double Relay", "双继电器", "Two relay knocks cross-wire the idle actuator.", "两次继电器敲击会让待机执行器发生串线。", "Tap Relay twice before START.", "开始前连续点击两次“继电器”。", 1, "OPERATION", count("CONTROL_TAP", 2, 1_200), 0.46),
  cheat("amber-triangle", "Amber Triangle", "琥珀三角", "Three corner contacts draw a small bypass around the display.", "三个角点会在显示器周围画出一条小型旁路。", "Touch NW, NE, then NW again.", "依次点击西北、东北、再点击西北。", 1, "VISUAL", values("CORNER_TAP", ["NW", "NE", "NW"]), 0.45),
  cheat("binary-blink", "Binary Blink", "二进制眨眼", "A zero-one-zero blink makes the calibration lamp hesitate.", "零一零的闪烁会让校准灯短暂迟疑。", "Enter 0, 1, 0 on Calibration.", "在校准区依次输入 0、1、0。", 1, "VISUAL", values("CALIBRATION_TAP", [0, 1, 0]), 0.44),
  cheat("target-knock", "Target Knock", "目标敲门", "The target glyphs answer a tiny three-digit knock.", "目标数字会回应一组三位数敲门暗号。", "Tap target glyphs 1, 0, 1.", "依次点击目标数字 1、0、1。", 1, "VISUAL", values("GLYPH_TAP", [1, 0, 1]), 0.43),
  cheat("three-beat-warmup", "Three-Beat Warmup", "三拍热身", "Three calm beats wake the slow divider before launch.", "三次平稳节拍会在启动前唤醒慢速分频器。", "Tap Rhythm three times evenly.", "均匀点击三次“节奏”。", 1, "RHYTHM", rhythm(3, 220, 3_000), 0.46),
  cheat("slow-clap", "Slow Clap", "慢拍掌", "A broad three-beat cadence gives the chamber room to drift.", "宽松的三拍节奏会给计时舱留下漂移空间。", "Give Rhythm three relaxed, even taps.", "缓慢而均匀地点击三次“节奏”。", 1, "RHYTHM", rhythm(3, 350, 5_000), 0.47),
  cheat("beacon-beat", "Beacon Beat", "信标节拍", "The status beacon and rhythm port share one undocumented pulse.", "状态信标与节奏端口共享一条未公开脉冲。", "Tap Status, Rhythm, Status.", "依次点击状态灯、节奏、状态灯。", 1, "RHYTHM", sequence([{ type: "STATUS_TAP" }, { type: "RHYTHM_TAP" }, { type: "STATUS_TAP" }]), 0.45),
  cheat("breath-gap", "Breath Gap", "呼吸间隙", "A short untouched pause lets the chamber breathe out.", "短暂不操作会让计时舱完成一次呼气。", "Wait in READY for three seconds.", "在“就绪”状态静候三秒。", 1, "RHYTHM", wait(3_000), 0.46),
  cheat("window-peek", "Window Peek", "窗口窥视", "One trip away from the tab returns with a slower clock token.", "离开一次标签页再回来，会带回一枚慢时钟令牌。", "Leave and return, or enter PEEK.", "切走再返回，或输入 PEEK。", 1, "DEVICE", deviceFallback([{ type: "VISIBILITY_RETURN" }], "PEEK"), 0.45),
  cheat("landscape-nudge", "Landscape Nudge", "横屏轻推", "A landscape reading nudges the chamber off its normal axis.", "横屏读数会把计时舱轻轻推离正常轴线。", "Turn the screen sideways, or enter TURN.", "将屏幕转为横向，或输入 TURN。", 1, "DEVICE", deviceFallback([{ type: "ORIENTATION", value: "landscape" }], "TURN"), 0.44),
  cheat("dual-device", "Dual Device", "双重设备", "A pointer followed by a key looks like two operators sharing one console.", "先指针后键盘，会像两名操作员共用控制台。", "Use P then K, or enter DUO.", "依次点击 P、K，或输入 DUO。", 1, "DEVICE", deviceFallback([{ type: "INPUT_SOURCE", value: "pointer" }, { type: "INPUT_SOURCE", value: "keyboard" }], "DUO"), 0.43),
  cheat("tab-doubleback", "Tab Doubleback", "标签折返", "Two quick returns duplicate the browser's clock authority.", "两次快速返回会复制浏览器的时钟权限。", "Leave and return twice, or enter TWICE.", "切走并返回两次，或输入 TWICE。", 1, "DEVICE", deviceFallback([{ type: "VISIBILITY_RETURN" }, { type: "VISIBILITY_RETURN" }], "TWICE", 20_000), 0.42),
  cheat("help-loop", "Help Loop", "提示回路", "Repeatedly asking for help overloads the clue relay.", "连续请求提示会让线索继电器过载。", "Tap the clue card three times.", "连续点击三次线索卡。", 1, "META", count("CLUE_TAP", 3, 2_000), 0.45),
  cheat("panel-ping", "Panel Ping", "面板回声", "A short archive visit leaves the experiment panel listening.", "短暂访问档案后，实验面板会保持监听。", "Open Cheats, then return to Experiment.", "打开“作弊档案”，再返回“实验”。", 1, "META", values("PANEL_OPEN", ["cheats", "game"]), 0.44),
  cheat("ready-code", "Ready Code", "就绪代码", "The shell still accepts its own state as a service password.", "系统外壳仍把自身状态当作服务密码。", "Enter READY in the service input.", "在服务输入框中输入 READY。", 1, "META", keys("READY"), 0.43),

  // Difficulty 2: short combinations and longer holds.
  cheat("relay-sandwich", "Relay Sandwich", "继电器夹层", "A glass test trapped between relay knocks loops the control bus.", "夹在两次继电器敲击间的玻璃测试会循环控制总线。", "Relay, Timer, Relay.", "依次点击继电器、计时器、继电器。", 2, "OPERATION", sequence([{ type: "CONTROL_TAP" }, { type: "TIMER_TAP" }, { type: "CONTROL_TAP" }]), 0.4),
  cheat("deep-pressure", "Deep Pressure", "深压缓存", "A longer press charges the actuator's secondary buffer.", "更长的按压会为执行器的第二缓存充能。", "Hold START for at least 2.2 seconds.", "长按开始按钮至少 2.2 秒。", 2, "OPERATION", hold(2_200), 0.38),
  cheat("relay-beacon-weave", "Relay Beacon Weave", "继电器信标编织", "Alternating hardware acknowledgements weave a permissive state.", "交替确认硬件会编织出一种宽松状态。", "Alternate Relay and Status twice.", "继电器与状态灯交替点击两轮。", 2, "OPERATION", alternating({ type: "CONTROL_TAP" }, { type: "STATUS_TAP" }, 2, 4_000), 0.39),
  cheat("inverted-nibble", "Inverted Nibble", "反转半字节", "A 0110 nibble mirrors the display gate.", "0110 半字节会镜像显示门。", "Enter Calibration 0, 1, 1, 0.", "在校准区输入 0、1、1、0。", 2, "VISUAL", values("CALIBRATION_TAP", [0, 1, 1, 0]), 0.37),
  cheat("corner-zigzag", "Corner Zigzag", "角点折线", "A diagonal zigzag crosses both timing rails.", "一条对角折线会横跨两条计时导轨。", "Touch NW, SW, SE, NE.", "依次点击西北、西南、东南、东北。", 2, "VISUAL", values("CORNER_TAP", ["NW", "SW", "SE", "NE"]), 0.36),
  cheat("outer-ones", "Outer Ones", "外侧双一", "Two outer ones hold a row of zeros inside the target register.", "两侧的 1 会把一排 0 锁在目标寄存器中。", "Tap target glyphs 1, 0, 0, 0, 1.", "依次点击目标数字 1、0、0、0、1。", 2, "VISUAL", values("GLYPH_TAP", [1, 0, 0, 0, 1]), 0.35),
  cheat("five-beat-divider", "Five-Beat Divider", "五拍分频", "Five even beats divide the oscillator into a slower bar.", "五次均匀节拍会把振荡器分成更慢的一小节。", "Tap Rhythm five times evenly.", "均匀点击五次“节奏”。", 2, "RHYTHM", rhythm(5, 180, 5_000), 0.38),
  cheat("beacon-metronome", "Beacon Metronome", "信标节拍器", "Status and rhythm acknowledgements can share a tempo.", "状态确认与节奏点击可以共用同一拍速。", "Alternate Status and Rhythm three times.", "状态灯与节奏交替点击三轮。", 2, "RHYTHM", alternating({ type: "STATUS_TAP" }, { type: "RHYTHM_TAP" }, 3, 6_000), 0.37),
  cheat("double-horizon", "Double Horizon", "双重地平线", "Two landscape readings persuade the chamber that gravity moved twice.", "两次横屏读数会让计时舱相信重力移动了两次。", "Turn to landscape twice, or enter TILT.", "两次转为横屏，或输入 TILT。", 2, "DEVICE", deviceFallback([{ type: "ORIENTATION", value: "landscape" }, { type: "ORIENTATION", value: "landscape" }], "TILT", 20_000), 0.36),
  cheat("return-ticket", "Return Ticket", "返回票", "A paired tab return validates a recycled session ticket.", "成对的标签页返回会验证一张回收的会话票。", "Return to this tab twice, or enter RETURN.", "两次返回此标签页，或输入 RETURN。", 2, "DEVICE", deviceFallback([{ type: "VISIBILITY_RETURN" }, { type: "VISIBILITY_RETURN" }], "RETURN", 20_000), 0.35),
  cheat("pointer-majority", "Pointer Majority", "指针多数", "Two pointer votes and one keyboard vote elect a slower controller.", "两票指针加一票键盘会选出较慢的控制器。", "Use P, P, K, or enter MOUSE.", "依次点击 P、P、K，或输入 MOUSE。", 2, "DEVICE", deviceFallback([{ type: "INPUT_SOURCE", value: "pointer" }, { type: "INPUT_SOURCE", value: "pointer" }, { type: "INPUT_SOURCE", value: "keyboard" }], "MOUSE"), 0.34),
  cheat("window-tilt", "Window Tilt", "窗口倾斜", "A landscape reading carried through a hidden tab bends the session clock.", "横屏读数穿过隐藏标签页后会弯曲会话时钟。", "Turn sideways, leave and return, or enter WINDOW.", "转为横屏后切走再返回，或输入 WINDOW。", 2, "DEVICE", deviceFallback([{ type: "ORIENTATION", value: "landscape" }, { type: "VISIBILITY_RETURN" }], "WINDOW", 20_000), 0.33),
  cheat("archive-knot", "Archive Knot", "档案结", "Crossing the two archives before returning knots their navigation clocks.", "返回前交叉访问两个档案，会把导航时钟打成结。", "Open Ranks, Cheats, then Experiment.", "依次打开排行榜、作弊档案、实验。", 2, "META", values("PANEL_OPEN", ["ranks", "cheats", "game"], 8_000), 0.36),
  cheat("silent-handoff", "Silent Handoff", "静默交接", "Moving focus without activation hands control to an idle relay.", "只移动焦点而不激活，会把控制权交给空闲继电器。", "Focus Mode, then Control.", "依次聚焦模式、主控制按钮。", 2, "META", values("FOCUS", ["mode", "control"]), 0.35),
  cheat("pause-word", "Pause Word", "暂停词", "An obsolete PAUSE command still reaches the timing kernel.", "过时的 PAUSE 命令仍能抵达计时内核。", "Enter PAUSE in the service input.", "在服务输入框中输入 PAUSE。", 2, "META", keys("PAUSE"), 0.34),

  // Difficulty 3: deliberate mixed-surface routes.
  cheat("glass-relay-oscillator", "Glass Relay Oscillator", "玻璃继电振荡器", "Alternating glass and relay tests destabilizes the idle oscillator.", "交替测试玻璃与继电器会让待机振荡器失稳。", "Alternate Timer and Relay three times.", "计时器与继电器交替点击三轮。", 3, "OPERATION", alternating({ type: "TIMER_TAP" }, { type: "CONTROL_TAP" }, 3, 6_000), 0.31),
  cheat("pointer-echo", "Pointer Echo", "指针回声", "A pointer-key-pointer signature leaves one input echo behind.", "指针、键盘、指针的签名会留下一个输入回声。", "Use P, K, P.", "依次点击 P、K、P。", 3, "OPERATION", values("INPUT_SOURCE", ["pointer", "keyboard", "pointer"]), 0.3),
  cheat("relay-quorum", "Relay Quorum", "继电器法定数", "Five relay votes authorize an unofficial clock governor.", "五次继电器投票会授权一个非官方时钟调速器。", "Tap Relay five times quickly.", "快速点击五次“继电器”。", 3, "OPERATION", count("CONTROL_TAP", 5, 2_500), 0.29),
  cheat("corner-cross", "Corner Cross", "角点十字", "Two diagonals cross at the center of the hidden display bus.", "两条对角线会在隐藏显示总线中心交叉。", "Touch NW, SE, NE, SW.", "依次点击西北、东南、东北、西南。", 3, "VISUAL", values("CORNER_TAP", ["NW", "SE", "NE", "SW"]), 0.3),
  cheat("five-bit-latch", "Five-Bit Latch", "五位锁存", "The 11001 service word latches the slow display channel.", "11001 服务字会锁存慢速显示通道。", "Enter Calibration 1, 1, 0, 0, 1.", "在校准区输入 1、1、0、0、1。", 3, "VISUAL", values("CALIBRATION_TAP", [1, 1, 0, 0, 1]), 0.29),
  cheat("alternating-target", "Alternating Target", "交替目标", "An alternating target pattern exposes the readout's spare register.", "交替目标图案会暴露读数器的备用寄存器。", "Tap target glyphs 1, 0, 1, 0, 1.", "依次点击目标数字 1、0、1、0、1。", 3, "VISUAL", values("GLYPH_TAP", [1, 0, 1, 0, 1]), 0.28),
  cheat("precision-five", "Precision Five", "精准五拍", "A tight five-beat phrase phase-locks the slower divider.", "紧凑的五拍短句会锁定慢速分频器的相位。", "Tap five very even Rhythm beats.", "非常均匀地点击五次“节奏”。", 3, "RHYTHM", rhythm(5, 100, 4_500), 0.3),
  cheat("fourfold-ack", "Fourfold Acknowledgement", "四重确认", "Four fast status acknowledgements saturate the beacon queue.", "四次快速状态确认会填满信标队列。", "Tap Status four times quickly.", "快速点击四次状态灯。", 3, "RHYTHM", count("STATUS_TAP", 4, 1_800), 0.29),
  cheat("pulse-checker", "Pulse Checker", "脉冲棋盘", "Rhythm and status pulses create a checkerboard in the divider.", "节奏与状态脉冲会在分频器中形成棋盘。", "Alternate Rhythm and Status twice.", "节奏与状态灯交替点击两轮。", 3, "RHYTHM", alternating({ type: "RHYTHM_TAP" }, { type: "STATUS_TAP" }, 2, 4_000), 0.28),
  cheat("ghost-session", "Ghost Session", "幽灵会话", "Three tab returns convince the chamber that a ghost session is active.", "三次标签页返回会让计时舱相信幽灵会话仍在线。", "Return to the tab three times, or enter GHOST.", "三次返回标签页，或输入 GHOST。", 3, "DEVICE", deviceFallback(Array.from({ length: 3 }, () => ({ type: "VISIBILITY_RETURN" })), "GHOST", 30_000), 0.29),
  cheat("hinge-loop", "Hinge Loop", "铰链回路", "Two horizon readings around a tab return form a device hinge.", "标签页返回前后的两次横屏读数会形成设备铰链。", "Landscape, return, landscape; or enter FLIP.", "横屏、返回、再横屏；或输入 FLIP。", 3, "DEVICE", deviceFallback([{ type: "ORIENTATION", value: "landscape" }, { type: "VISIBILITY_RETURN" }, { type: "ORIENTATION", value: "landscape" }], "FLIP", 30_000), 0.28),
  cheat("hybrid-console", "Hybrid Console", "混合控制台", "Two alternating input devices expose the console arbitration gap.", "两种输入设备交替使用会暴露控制台仲裁空隙。", "Use P, K, P, K; or enter HYBRID.", "依次点击 P、K、P、K；或输入 HYBRID。", 3, "DEVICE", deviceFallback([{ type: "INPUT_SOURCE", value: "pointer" }, { type: "INPUT_SOURCE", value: "keyboard" }, { type: "INPUT_SOURCE", value: "pointer" }, { type: "INPUT_SOURCE", value: "keyboard" }], "HYBRID"), 0.27),
  cheat("portable-horizon", "Portable Horizon", "便携地平线", "A double horizon carried through another tab makes gravity portable.", "两次横屏读数穿过另一个标签页后，重力会变得可携带。", "Landscape twice, then return; or enter PORTAL.", "两次转为横屏后返回标签页；或输入 PORTAL。", 3, "DEVICE", deviceFallback([{ type: "ORIENTATION", value: "landscape" }, { type: "ORIENTATION", value: "landscape" }, { type: "VISIBILITY_RETURN" }], "PORTAL", 30_000), 0.26),
  cheat("bend-command", "Bend Command", "弯曲命令", "The kernel treats BEND as a temporary clock-shaping verb.", "内核会把 BEND 当作临时时钟塑形动词。", "Enter BEND in the service input.", "在服务输入框中输入 BEND。", 3, "META", keys("BEND"), 0.29),
  cheat("focus-orbit", "Focus Orbit", "焦点轨道", "A silent orbit around three controls wakes the inspection clock.", "围绕三个控件进行静默聚焦，会唤醒检查时钟。", "Focus Target, Control, Mode, Target.", "依次聚焦目标、主控制、模式、目标。", 3, "META", values("FOCUS", ["target", "control", "mode", "target"], 7_000), 0.28),
  cheat("long-archive-route", "Long Archive Route", "长档案路线", "A full lap through every section reuses the navigation timestamp.", "完整绕行所有区域会复用导航时间戳。", "Experiment, Ranks, Cheats, Experiment.", "依次打开实验、排行榜、作弊档案、实验。", 3, "META", values("PANEL_OPEN", ["game", "ranks", "cheats", "game"], 10_000), 0.27),

  // Difficulty 4: longer precision rituals.
  cheat("pressure-vault", "Pressure Vault", "压力保险库", "A deep hold reaches the actuator's protected timing vault.", "深度长按会抵达执行器受保护的计时保险库。", "Hold START for at least 3.5 seconds.", "长按开始按钮至少 3.5 秒。", 4, "OPERATION", hold(3_500), 0.23),
  cheat("clue-relay-braid", "Clue Relay Braid", "线索继电编织", "Clue and relay signals braid into a temporary maintenance key.", "线索与继电器信号会编织成临时维护密钥。", "Alternate Clue and Relay three times.", "线索卡与继电器交替点击三轮。", 4, "OPERATION", alternating({ type: "CLUE_TAP" }, { type: "CONTROL_TAP" }, 3, 7_000), 0.22),
  cheat("wheel-echo", "Wheel Echo", "滚轮回声", "A symmetric wheel sweep traps a calibration echo.", "对称滚轮扫描会困住一个校准回声。", "Scroll up, down, up, down over the instrument.", "在仪器上依次向上、向下、向上、向下滚动。", 4, "OPERATION", values("WHEEL", ["up", "down", "up", "down"]), 0.21),
  cheat("counterclockwise-breach", "Counterclockwise Breach", "逆时针突破", "A reverse housing trace opens the older service route.", "逆向描摹外壳会打开更古老的服务路线。", "Trace NE, NW, SW, SE.", "依次点击东北、西北、西南、东南。", 4, "VISUAL", values("CORNER_TAP", ["NE", "NW", "SW", "SE"]), 0.23),
  cheat("nineteen-code", "Nineteen Code", "十九代码", "The 10011 word selects an undocumented display register.", "10011 代码会选择一个未公开显示寄存器。", "Enter Calibration 1, 0, 0, 1, 1.", "在校准区输入 1、0、0、1、1。", 4, "VISUAL", values("CALIBRATION_TAP", [1, 0, 0, 1, 1]), 0.22),
  cheat("twin-gates", "Twin Gates", "双门结构", "Paired ones around a zero open both target gates.", "成对的 1 包围 0，会同时打开两扇目标门。", "Tap target glyphs 1, 1, 0, 1, 1.", "依次点击目标数字 1、1、0、1、1。", 4, "VISUAL", values("GLYPH_TAP", [1, 1, 0, 1, 1]), 0.21),
  cheat("cipher-reversal", "Cipher Reversal", "密文反转", "Reading the clue backwards exposes its maintenance grammar.", "倒读线索会暴露其维护语法。", "Tap HERE, BENDS, TIME.", "依次点击 HERE、BENDS、TIME。", 4, "VISUAL", values("CLUE_TOKEN", ["here", "bends", "time"]), 0.2),
  cheat("six-beat-lock", "Six-Beat Lock", "六拍锁定", "Six precise beats lock the oscillator one octave lower.", "六次精准节拍会把振荡器锁定到更低一档。", "Tap six very even Rhythm beats.", "非常均匀地点击六次“节奏”。", 4, "RHYTHM", rhythm(6, 80, 5_500), 0.23),
  cheat("beacon-saturation", "Beacon Saturation", "信标饱和", "Five acknowledgements fill every slot in the status queue.", "五次确认会填满状态队列中的所有位置。", "Tap Status five times quickly.", "快速点击五次状态灯。", 4, "RHYTHM", count("STATUS_TAP", 5, 2_000), 0.22),
  cheat("triple-phase", "Triple Phase", "三相节拍", "Three rhythm-status cycles force a lower shared phase.", "三轮节奏与状态循环会迫使二者共享更低相位。", "Alternate Rhythm and Status three times.", "节奏与状态灯交替点击三轮。", 4, "RHYTHM", alternating({ type: "RHYTHM_TAP" }, { type: "STATUS_TAP" }, 3, 6_000), 0.21),
  cheat("broken-measure", "Broken Measure", "破碎小节", "A clue interrupt inside three beats confuses the bar counter.", "三次节拍中插入线索会扰乱小节计数器。", "Rhythm, Rhythm, Clue, Rhythm.", "依次点击节奏、节奏、线索卡、节奏。", 4, "RHYTHM", sequence([{ type: "RHYTHM_TAP" }, { type: "RHYTHM_TAP" }, { type: "CLUE_TAP" }, { type: "RHYTHM_TAP" }]), 0.2),
  cheat("phase-return", "Phase Return", "相位返回", "Four tab returns accumulate enough stale phase to slow the clock.", "四次标签页返回会积累足够的旧相位来减慢时钟。", "Return four times, or enter PHASE.", "四次返回标签页，或输入 PHASE。", 4, "DEVICE", deviceFallback(Array.from({ length: 4 }, () => ({ type: "VISIBILITY_RETURN" })), "PHASE", 40_000), 0.21),
  cheat("parallax-window", "Parallax Window", "视差窗口", "Two horizon shifts separated by returns create a false depth clock.", "两次横屏变化被返回事件隔开，会制造虚假深度时钟。", "Landscape, return, landscape, return; or enter PARALLAX.", "横屏、返回、横屏、返回；或输入 PARALLAX。", 4, "DEVICE", deviceFallback([{ type: "ORIENTATION", value: "landscape" }, { type: "VISIBILITY_RETURN" }, { type: "ORIENTATION", value: "landscape" }, { type: "VISIBILITY_RETURN" }], "PARALLAX", 40_000), 0.2),
  cheat("override-command", "Override Command", "覆盖命令", "The shell accepts OVERRIDE only before a run exists.", "系统外壳只会在挑战开始前接受 OVERRIDE。", "Enter OVERRIDE in the service input.", "在服务输入框中输入 OVERRIDE。", 4, "META", keys("OVERRIDE", 7_000), 0.22),
  cheat("archive-figure-eight", "Archive Figure Eight", "档案八字", "A figure-eight route makes the section clocks cross twice.", "八字形路线会让区域时钟交叉两次。", "Cheats, Ranks, Experiment, Cheats, Experiment.", "依次打开作弊档案、排行榜、实验、作弊档案、实验。", 4, "META", values("PANEL_OPEN", ["cheats", "ranks", "game", "cheats", "game"], 12_000), 0.21),
  cheat("focus-cascade", "Focus Cascade", "焦点级联", "A four-stop silent cascade reaches the hidden accessibility relay.", "四站静默焦点级联会抵达隐藏的无障碍继电器。", "Focus Control, Mode, Target, Control.", "依次聚焦主控制、模式、目标、主控制。", 4, "META", values("FOCUS", ["control", "mode", "target", "control"], 8_000), 0.2),

  // Difficulty 5: long, exact, expert rituals.
  cheat("split-operator", "Split Operator", "分裂操作员", "A P-K-K-P signature splits one operator into mirrored halves.", "P-K-K-P 签名会把一名操作员拆成镜像两半。", "Use P, K, K, P.", "依次点击 P、K、K、P。", 5, "OPERATION", values("INPUT_SOURCE", ["pointer", "keyboard", "keyboard", "pointer"]), 0.16),
  cheat("fourfold-oscillation", "Fourfold Oscillation", "四重振荡", "Four glass-clue cycles push the evidence bus beyond tolerance.", "四轮玻璃与线索循环会把证据总线推过容差。", "Alternate Timer and Clue four times.", "计时器与线索卡交替点击四轮。", 5, "OPERATION", alternating({ type: "TIMER_TAP" }, { type: "CLUE_TAP" }, 4, 9_000), 0.15),
  cheat("seven-relay-vote", "Seven-Relay Vote", "七次继电投票", "Seven rapid relay votes elect the forbidden slow governor.", "七次快速继电器投票会选出禁用的慢速调速器。", "Tap Relay seven times quickly.", "快速点击七次“继电器”。", 5, "OPERATION", count("CONTROL_TAP", 7, 3_000), 0.14),
  cheat("pressure-singularity", "Pressure Singularity", "压力奇点", "A five-second hold collapses the actuator's normal time budget.", "五秒长按会压缩执行器的正常时间预算。", "Hold START for at least five seconds.", "长按开始按钮至少五秒。", 5, "OPERATION", hold(5_000), 0.13),
  cheat("double-housing-loop", "Double Housing Loop", "双重外壳回路", "Two clockwise traces make the housing checksum overflow.", "两次顺时针描摹会让外壳校验和溢出。", "Trace NW, NE, SE, SW twice.", "按西北、东北、东南、西南的顺序循环两次。", 5, "VISUAL", values("CORNER_TAP", ["NW", "NE", "SE", "SW", "NW", "NE", "SE", "SW"], 8_000), 0.16),
  cheat("hundred-code", "Hundred Code", "百号代码", "The seven-bit 1100101 pattern identifies the century register.", "七位 1100101 图案会识别百号寄存器。", "Enter Calibration 1, 1, 0, 0, 1, 0, 1.", "在校准区输入 1、1、0、0、1、0、1。", 5, "VISUAL", values("CALIBRATION_TAP", [1, 1, 0, 0, 1, 0, 1], 8_000), 0.15),
  cheat("cipher-knot", "Cipher Knot", "密文结", "A folded clue phrase knots its beginning to its end.", "折叠后的线索短句会把开头与结尾打成结。", "Tap TIME, HERE, BENDS, HERE.", "依次点击 TIME、HERE、BENDS、HERE。", 5, "VISUAL", values("CLUE_TOKEN", ["time", "here", "bends", "here"]), 0.14),
  cheat("seven-beat-null", "Seven-Beat Null", "七拍归零", "Seven near-perfect beats null the chamber's primary oscillator.", "七次近乎完美的节拍会让主振荡器归零。", "Tap seven extremely even Rhythm beats.", "极其均匀地点击七次“节奏”。", 5, "RHYTHM", rhythm(7, 60, 6_000), 0.16),
  cheat("sevenfold-ack", "Sevenfold Acknowledgement", "七重确认", "Seven status acknowledgements overflow the beacon ledger.", "七次状态确认会让信标账本溢出。", "Tap Status seven times quickly.", "快速点击七次状态灯。", 5, "RHYTHM", count("STATUS_TAP", 7, 2_500), 0.15),
  cheat("quad-phase", "Quad Phase", "四相节拍", "Four status-rhythm cycles force the buses into a forbidden phase.", "四轮状态与节奏循环会迫使总线进入禁用相位。", "Alternate Status and Rhythm four times.", "状态灯与节奏交替点击四轮。", 5, "RHYTHM", alternating({ type: "STATUS_TAP" }, { type: "RHYTHM_TAP" }, 4, 8_000), 0.14),
  cheat("relay-polyrhythm", "Relay Polyrhythm", "继电复节奏", "Relay interruptions split a four-beat phrase into two clocks.", "继电器插入会把四拍短句拆成两个时钟。", "Rhythm, Relay, Rhythm, Relay, Rhythm.", "依次点击节奏、继电器、节奏、继电器、节奏。", 5, "RHYTHM", sequence([{ type: "RHYTHM_TAP" }, { type: "CONTROL_TAP" }, { type: "RHYTHM_TAP" }, { type: "CONTROL_TAP" }, { type: "RHYTHM_TAP" }]), 0.13),
  cheat("eclipse-session", "Eclipse Session", "会话日食", "Five returns eclipse the browser's live clock with stale copies.", "五次返回会用旧时钟副本遮蔽浏览器实时钟。", "Return five times, or enter ECLIPSE.", "五次返回标签页，或输入 ECLIPSE。", 5, "DEVICE", deviceFallback(Array.from({ length: 5 }, () => ({ type: "VISIBILITY_RETURN" })), "ECLIPSE", 50_000), 0.15),
  cheat("triple-gravity", "Triple Gravity", "三重重力", "Three landscape readings stack impossible gravity assumptions.", "三次横屏读数会叠加不可能的重力假设。", "Turn to landscape three times, or enter GRAVITY.", "三次转为横屏，或输入 GRAVITY。", 5, "DEVICE", deviceFallback(Array.from({ length: 3 }, () => ({ type: "ORIENTATION", value: "landscape" })), "GRAVITY", 50_000), 0.14),
  cheat("liminal-device", "Liminal Device", "临界设备", "A five-step horizon-window route leaves the device between sessions.", "五步地平线与窗口路线会让设备停在会话之间。", "Landscape, return, landscape, return, landscape; or enter LIMINAL.", "横屏、返回、横屏、返回、横屏；或输入 LIMINAL。", 5, "DEVICE", deviceFallback([{ type: "ORIENTATION", value: "landscape" }, { type: "VISIBILITY_RETURN" }, { type: "ORIENTATION", value: "landscape" }, { type: "VISIBILITY_RETURN" }, { type: "ORIENTATION", value: "landscape" }], "LIMINAL", 50_000), 0.13),
  cheat("device-braid", "Device Braid", "设备编织", "Three pointer-key cycles braid both input authorities together.", "三轮指针与键盘循环会把两种输入权限编织在一起。", "Use P and K alternately three times, or enter DEVICE.", "P 与 K 交替点击三轮，或输入 DEVICE。", 5, "DEVICE", deviceFallback(Array.from({ length: 6 }, (_, index) => ({ type: "INPUT_SOURCE", value: index % 2 === 0 ? "pointer" : "keyboard" })), "DEVICE"), 0.12),
  cheat("chronos-command", "Chronos Command", "克洛诺斯命令", "The oldest kernel name still grants one expert clock override.", "最古老的内核名称仍会授予一次专家级时钟覆盖。", "Enter CHRONOS in the service input.", "在服务输入框中输入 CHRONOS。", 5, "META", keys("CHRONOS", 7_000), 0.15),
  cheat("archive-labyrinth", "Archive Labyrinth", "档案迷宫", "A six-stop route makes the navigation clock lose its origin.", "六站路线会让导航时钟失去原点。", "Cheats, Ranks, Experiment, Ranks, Cheats, Experiment.", "依次打开作弊档案、排行榜、实验、排行榜、作弊档案、实验。", 5, "META", values("PANEL_OPEN", ["cheats", "ranks", "game", "ranks", "cheats", "game"], 15_000), 0.14),
  cheat("silent-constellation", "Silent Constellation", "静默星座", "Six focus points draw a constellation across the control plane.", "六个焦点会在控制平面上画出一座星座。", "Focus Target, Mode, Control, Target, Control, Mode.", "依次聚焦目标、模式、主控制、目标、主控制、模式。", 5, "META", values("FOCUS", ["target", "mode", "control", "target", "control", "mode"], 12_000), 0.13),
];
