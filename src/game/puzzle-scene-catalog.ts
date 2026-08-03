import type { PuzzleMechanic, PuzzleSceneConfig, PuzzleTargetZone } from "./puzzle-scenes";

type Palette = PuzzleSceneConfig["palette"];
type CameraGesture = NonNullable<PuzzleSceneConfig["cameraGesture"]>;

interface AuthoredSceneSeed {
  slug: string;
  mechanic: PuzzleMechanic;
  unlock: PuzzleMechanic;
  zone: PuzzleTargetZone;
  palette: Palette;
  composition: string;
  motifEn: string;
  motifZh: string;
  glyphs: [string, string, string];
  cameraGesture?: CameraGesture;
}

const mechanicCopy: Record<PuzzleMechanic, { en: string; zh: string }> = {
  tap: { en: "A quiet mark responds to a deliberate touch.", zh: "安静的记号会回应一次有意的触碰。" },
  "double-tap": { en: "One echo is decoration; two reveal the rhythm.", zh: "一次回声像装饰，两次才显出节奏。" },
  hold: { en: "Some shadows only settle when patience outweighs motion.", zh: "有些影子只有在耐心胜过动作时才会落定。" },
  drag: { en: "The loose piece belongs where the spacing feels incomplete.", zh: "松动的物件属于那处间距不完整的位置。" },
  align: { en: "Separate edges describe one continuous horizon.", zh: "分开的边缘其实描绘着同一条地平线。" },
  rotate: { en: "The odd angle is the only one not following the light.", zh: "那个奇怪角度是唯一没有追随光线的方向。" },
  trace: { en: "A broken route can be restored without adding a new line.", zh: "断开的路线无需新增线条也能被续上。" },
  orbit: { en: "The small bodies remember which way the larger one travels.", zh: "小小星体记得较大星体运行的方向。" },
  rub: { en: "The cloudy layer is thinner than the pattern beneath it.", zh: "浑浊表层比它下面的图案更薄。" },
  rhythm: { en: "The repeated spacing is meant to be heard as well as seen.", zh: "重复的间隔既可以看见，也可以听见。" },
  interval: { en: "The gaps, rather than the marks, carry the message.", zh: "真正传递信息的是空隙，而不是记号。" },
  wait: { en: "The scene has a cycle that does not need help.", zh: "这个场景有一个不需要帮忙的自然周期。" },
  focus: { en: "Attention can travel even when nothing is pressed.", zh: "即使没有按下任何东西，注意力也可以移动。" },
  keyboard: { en: "The visible initials form a route for another kind of hand.", zh: "可见的首字母为另一种操作方式组成了路径。" },
  wheel: { en: "The layered paper disagrees about which direction is forward.", zh: "层叠纸片对哪边才是向前有不同意见。" },
  orientation: { en: "Gravity is the only object that has not moved yet.", zh: "重力是这里唯一还没有移动的物件。" },
  visibility: { en: "A missing view may be more useful than another look.", zh: "短暂看不见，也许比多看一眼更有用。" },
  locale: { en: "Two languages share one shape but not the same order.", zh: "两种语言共享一个形状，却不共享同一顺序。" },
  camera: { en: "The empty air is part of the drawing surface.", zh: "空中的留白也是画布的一部分。" },
  sequence: { en: "The objects disagree in position but agree in time.", zh: "物件的位置互不相同，时间顺序却彼此一致。" },
  toggle: { en: "The paired states are not opposites; they are a cadence.", zh: "成对状态并非对立，而是一段节拍。" },
  balance: { en: "The center appears only when both sides carry equal weight.", zh: "只有两侧重量相等时，中心才会出现。" },
  assemble: { en: "Three fragments leave exactly one sensible silhouette.", zh: "三块碎片只会留下一个合理轮廓。" },
  sort: { en: "The shadows reveal an order the colors try to hide.", zh: "阴影揭示了颜色试图藏住的顺序。" },
  resize: { en: "The frame, not its contents, is the adjustable instrument.", zh: "可以调节的仪器不是内容，而是边框。" },
};

const alternatives = {
  mobile: { en: "Use the same scene objects with touch; a reachable fallback appears after opening Hint.", zh: "可直接触摸相同的场景物件；主动打开提示后会提供可触达的替代方式。" },
  keyboard: { en: "Tab through the scene objects and use Enter, Space, or arrow keys to perform the same relation.", zh: "用 Tab 浏览场景物件，并通过回车、空格或方向键完成相同关系。" },
  reduced: { en: "Motion is replaced by a stable outline and a short status announcement.", zh: "动画会替换为稳定轮廓和简短状态播报。" },
};

function humanize(slug: string) {
  return slug.split("-").map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(" ");
}

function authoredScene(seed: AuthoredSceneSeed, index: number): PuzzleSceneConfig {
  const clue = mechanicCopy[seed.mechanic];
  const unlockClue = mechanicCopy[seed.unlock];
  const difficulty = Math.floor(index / 20) + 1;
  const unlockStepCount = seed.unlock === "camera" ? 1 : difficulty === 1 ? 1 : difficulty <= 3 ? 2 : 3;
  return {
    version: 1,
    slug: seed.slug,
    sceneId: `time-garden-${String(index + 1).padStart(3, "0")}-${seed.slug}`,
    title: { en: humanize(seed.slug), zh: seed.motifZh },
    difficulty,
    primaryMechanic: seed.mechanic,
    targetZone: seed.zone,
    palette: seed.palette,
    composition: seed.composition,
    motif: { en: seed.motifEn, zh: seed.motifZh },
    objects: seed.glyphs.map((glyph, objectIndex) => ({
      id: `${seed.slug}-${["first", "second", "third"][objectIndex]}`,
      glyph,
      label: {
        en: `${humanize(seed.slug)} object ${objectIndex + 1}`,
        zh: `${seed.motifZh}物件${objectIndex + 1}`,
      },
      shape: (["orb", "tile", "arc"] as const)[objectIndex],
    })) as PuzzleSceneConfig["objects"],
    discoveryRule: {
      mechanic: seed.mechanic,
      target: `${seed.slug}-first`,
      gesture: `discover-${seed.slug}`,
      steps: [`notice-${seed.slug}`],
      ...(seed.mechanic === "hold" ? { minDurationMs: 650 } : {}),
    },
    unlockRule: {
      mechanic: seed.unlock,
      target: `${seed.slug}-second`,
      gesture: `resolve-${seed.slug}`,
      steps: Array.from({ length: unlockStepCount }, (_, step) => `resolve-${seed.slug}-${step + 1}`),
      ...(seed.unlock === "hold" ? { minDurationMs: 650 } : {}),
    },
    feedback: {
      en: `${humanize(seed.slug)} settles into the slower current.`,
      zh: `${seed.motifZh}已经落入更缓慢的时间流。`,
    },
    hints: {
      observation: clue,
      logic: {
        en: `${seed.motifEn} ${unlockClue.en}`,
        zh: `${seed.motifZh}${unlockClue.zh}`,
      },
    },
    mobileAlternative: alternatives.mobile,
    keyboardAlternative: alternatives.keyboard,
    reducedMotionAlternative: alternatives.reduced,
    expectedSeconds: 18 + difficulty * 12,
    signature: `${seed.slug}:${seed.composition}:${seed.mechanic}>${seed.unlock}`,
    antiCopyReview: {
      en: "Uses Time Hacker's abstract clock, light, paper, and spatial grammar; no character, brick room, key, door, or platform solution.",
      zh: "仅使用 Time Hacker 自有的时钟、光影、纸片与空间语言，不含人物、砖墙房间、钥匙、门或平台跳跃答案。",
    },
    ratings: difficulty === 5 ? [5, 4, 5, 5, 4, 4, 5] : [4, 4, 4, 5, 5, 4, 5],
    ...(seed.cameraGesture ? { cameraGesture: seed.cameraGesture } : {}),
  };
}

// These rows are the authored level contract. Mechanics, zones, composition, motif,
// object vocabulary and solve pair are deliberately explicit so edits are reviewable.
const AUTHORED_SCENES: readonly AuthoredSceneSeed[] = [
  { slug: "five-finger-echo", mechanic: "tap", unlock: "rhythm", zone: "stopwatch", palette: "sunrise", composition: "five hollow rings stepping from the lower-left toward the timer", motifEn: "Five echoes shrink toward a silent center.", motifZh: "五道回声向安静的中心收拢。", glyphs: ["◯", "◌", "·"] },
  { slug: "pressure-delay", mechanic: "double-tap", unlock: "hold", zone: "left", palette: "lagoon", composition: "a soft pressure field pinned between two unequal discs", motifEn: "A pressed tide leaves two close ripples.", motifZh: "受压的潮汐留下两圈靠近的涟漪。", glyphs: ["●", "◍", "≈"] },
  { slug: "slow-command", mechanic: "hold", unlock: "keyboard", zone: "right", palette: "sorbet", composition: "four paper initials hanging beside an elongated shadow", motifEn: "Four initials stretch one shadow longer than the others.", motifZh: "四个首字母把一道影子拉得格外漫长。", glyphs: ["S", "L", "—"] },
  { slug: "four-corner-breach", mechanic: "drag", unlock: "trace", zone: "top", palette: "meadow", composition: "a broken frame with one loose corner floating above it", motifEn: "The frame is missing the corner that already escaped.", motifZh: "边框缺少的角，早已漂到了外面。", glyphs: ["⌜", "⌝", "□"] },
  { slug: "signal-oscillation", mechanic: "align", unlock: "toggle", zone: "bottom", palette: "lilac", composition: "two offset wave strips beneath a fixed center pin", motifEn: "Two waves nearly share the same zero crossing.", motifZh: "两道波纹几乎共享同一个零点。", glyphs: ["∿", "~", "•"] },
  { slug: "triple-actuator", mechanic: "rotate", unlock: "sequence", zone: "title", palette: "apricot", composition: "three small dials interrupting the title baseline", motifEn: "Only one of three dials casts an upright shadow.", motifZh: "三枚表盘中只有一枚投下竖直影子。", glyphs: ["◴", "◷", "◶"] },
  { slug: "calibration-101", mechanic: "trace", unlock: "assemble", zone: "border", palette: "sky", composition: "a binary seam broken across the outer page border", motifEn: "A zero-shaped gap sits between two straight marks.", motifZh: "两道直线记号之间留着一个零形缺口。", glyphs: ["1", "0", "1"] },
  { slug: "status-rebound", mechanic: "orbit", unlock: "double-tap", zone: "decor", palette: "paper", composition: "a status bead circling a larger translucent rebound ring", motifEn: "The smallest bead is moving against its own wake.", motifZh: "最小的珠子正逆着自己的尾迹移动。", glyphs: ["•", "◯", "↺"] },
  { slug: "patient-zero", mechanic: "rub", unlock: "wait", zone: "stopwatch", palette: "tide", composition: "a misted zero overlaying a patient horizontal line", motifEn: "The zero is visible only where the mist is thinnest.", motifZh: "只有雾气最薄处能看清那个零。", glyphs: ["0", "≋", "—"] },
  { slug: "mode-flip", mechanic: "rhythm", unlock: "toggle", zone: "left", palette: "dusk", composition: "two mode tiles suspended at unequal beat intervals", motifEn: "The gaps between the tiles repeat short, long, short.", motifZh: "方片之间的间隔重复着短、长、短。", glyphs: ["I", "O", "I"] },
  { slug: "metronome-leak", mechanic: "interval", unlock: "rhythm", zone: "right", palette: "sunrise", composition: "four droplets falling through increasingly even gaps", motifEn: "The leak becomes orderly just before it disappears.", motifZh: "漏滴在消失之前突然变得整齐。", glyphs: ["•", "··", "···"] },
  { slug: "reverse-sweep", mechanic: "wait", unlock: "wheel", zone: "top", palette: "lagoon", composition: "a slow cloud shadow crossing a reversed ruler", motifEn: "The ruler changes direction when the shadow reaches its notch.", motifZh: "云影抵达缺口时，刻度会改变方向。", glyphs: ["☁", "╱", "↕"] },
  { slug: "archive-route", mechanic: "focus", unlock: "sequence", zone: "bottom", palette: "sorbet", composition: "three page tabs linked only by their focus halos", motifEn: "The quiet route is drawn by attention, not ink.", motifZh: "安静的路线由注意力而不是墨水画成。", glyphs: ["A", "B", "C"] },
  { slug: "clue-cipher", mechanic: "keyboard", unlock: "sort", zone: "title", palette: "meadow", composition: "three displaced letters whose shadows spell a second order", motifEn: "The letters lie; their shadows keep the original order.", motifZh: "字母会说谎，影子却保留原来的顺序。", glyphs: ["T", "M", "E"] },
  { slug: "tab-return", mechanic: "wheel", unlock: "visibility", zone: "border", palette: "lilac", composition: "stacked paper edges escaping through the right page border", motifEn: "One page edge continues beyond the visible sheet.", motifZh: "有一张纸的边缘延伸到了可见页面之外。", glyphs: ["▱", "▰", "↫"] },
  { slug: "horizon-shift", mechanic: "orientation", unlock: "align", zone: "decor", palette: "apricot", composition: "two floating horizons divided by a tilted sun", motifEn: "The sun is level with neither of its horizons.", motifZh: "太阳与两条地平线都没有对齐。", glyphs: ["☼", "╱", "━"] },
  { slug: "escape-hatch", mechanic: "visibility", unlock: "resize", zone: "stopwatch", palette: "sky", composition: "a cropped arc that completes only outside the viewport", motifEn: "The arc is larger than the window that contains it.", motifZh: "圆弧比容纳它的窗口还要大。", glyphs: ["◜", "◝", "□"] },
  { slug: "mirrored-input", mechanic: "locale", unlock: "keyboard", zone: "left", palette: "paper", composition: "mirrored punctuation suspended between bilingual fragments", motifEn: "The punctuation reads correctly from the other language.", motifZh: "从另一种语言看，标点才是正确的。", glyphs: ["?", "？", "↔"] },
  { slug: "ten-thousand-glyph", mechanic: "camera", unlock: "trace", zone: "right", palette: "tide", composition: "an empty sky frame surrounded by five tiny decimal marks", motifEn: "Five marks wait for a line that is not on the screen.", motifZh: "五个记号等待一条不在屏幕上的线。", glyphs: ["1", "0", "∞"], cameraGesture: "air-loop" },
  { slug: "quiet-circuit", mechanic: "sequence", unlock: "camera", zone: "top", palette: "dusk", composition: "three silent nodes connected by a line that avoids every control", motifEn: "The circuit closes without pressing any visible control.", motifZh: "不按下任何可见控件，回路也能闭合。", glyphs: ["○", "◇", "□"], cameraGesture: "open-palm" },
  { slug: "double-relay", mechanic: "toggle", unlock: "double-tap", zone: "bottom", palette: "sunrise", composition: "paired relay leaves flipping around a coral axis", motifEn: "Both leaves briefly show the same face.", motifZh: "两片叶片会短暂露出同一面。", glyphs: ["◐", "◑", "│"] },
  { slug: "amber-triangle", mechanic: "balance", unlock: "align", zone: "title", palette: "lagoon", composition: "three amber weights hanging from the headline", motifEn: "The title tilts toward its lightest corner.", motifZh: "标题向最轻的那个角倾斜。", glyphs: ["△", "▲", "▽"] },
  { slug: "binary-blink", mechanic: "assemble", unlock: "toggle", zone: "border", palette: "sorbet", composition: "three binary fragments nested in a broken circular frame", motifEn: "The empty center is the missing binary piece.", motifZh: "空白中心就是缺失的二进制碎片。", glyphs: ["0", "1", "◌"] },
  { slug: "target-knock", mechanic: "sort", unlock: "tap", zone: "decor", palette: "meadow", composition: "three target discs ordered by shadow rather than size", motifEn: "Their shadows grow while the discs shrink.", motifZh: "圆盘越小，影子反而越长。", glyphs: ["⊙", "◉", "◎"] },
  { slug: "three-beat-warmup", mechanic: "resize", unlock: "rhythm", zone: "stopwatch", palette: "lilac", composition: "a breathing frame with three fixed beat marks", motifEn: "The frame breathes, but the three marks stay equally spaced.", motifZh: "边框在呼吸，三枚节拍点却始终等距。", glyphs: ["·", "·", "·"] },

  { slug: "slow-clap", mechanic: "tap", unlock: "interval", zone: "left", palette: "apricot", composition: "three broad sound petals opening toward the page center", motifEn: "The broadest petal arrives after the longest silence.", motifZh: "最宽的声瓣总在最长的安静之后抵达。", glyphs: ["）", "))", ")))" ] },
  { slug: "beacon-beat", mechanic: "double-tap", unlock: "rhythm", zone: "right", palette: "sky", composition: "a beacon pair blinking around an unlit middle bead", motifEn: "The dark bead divides two matching flashes.", motifZh: "暗珠把两次相同闪烁分开。", glyphs: ["●", "○", "●"] },
  { slug: "breath-gap", mechanic: "hold", unlock: "wait", zone: "top", palette: "paper", composition: "a paper lung opening around a narrow blue gap", motifEn: "The gap widens only while the page is left undisturbed.", motifZh: "只有不去打扰，纸间的呼吸缝才会变宽。", glyphs: ["〔", "〕", " "] },
  { slug: "window-peek", mechanic: "drag", unlock: "visibility", zone: "bottom", palette: "tide", composition: "a small window shadow detached from its frame", motifEn: "The shadow belongs just beyond the frame, not inside it.", motifZh: "这道窗影属于边框之外，而不是里面。", glyphs: ["▣", "▢", "↗"] },
  { slug: "landscape-nudge", mechanic: "align", unlock: "orientation", zone: "title", palette: "dusk", composition: "a title baseline split into portrait and landscape halves", motifEn: "One half of the sentence obeys a different horizon.", motifZh: "句子的一半服从另一条地平线。", glyphs: ["▯", "▭", "—"] },
  { slug: "dual-device", mechanic: "rotate", unlock: "keyboard", zone: "border", palette: "sunrise", composition: "a pointer arrow and keycap orbiting a shared input ring", motifEn: "Two tools share one socket but approach from opposite sides.", motifZh: "两种工具共用一个插口，却从相反方向靠近。", glyphs: ["↖", "K", "◯"] },
  { slug: "tab-doubleback", mechanic: "trace", unlock: "visibility", zone: "decor", palette: "lagoon", composition: "a ribbon route folding behind two page tabs", motifEn: "The ribbon vanishes twice before reaching its own beginning.", motifZh: "丝带两次消失后才回到起点。", glyphs: ["↝", "▱", "▱"] },
  { slug: "help-loop", mechanic: "orbit", unlock: "focus", zone: "stopwatch", palette: "sorbet", composition: "a question curve circling a calm timer dot", motifEn: "The question never touches the answer at its center.", motifZh: "问号始终没有碰到中心的答案。", glyphs: ["?", "•", "↻"] },
  { slug: "panel-ping", mechanic: "rub", unlock: "toggle", zone: "left", palette: "meadow", composition: "a frosted side panel concealing a second colored edge", motifEn: "The panel is brighter where fingerprints should have faded.", motifZh: "面板上本该被指纹磨暗的地方反而更亮。", glyphs: ["▤", "≈", "│"] },
  { slug: "ready-code", mechanic: "rhythm", unlock: "keyboard", zone: "right", palette: "lilac", composition: "five letter tiles hung at alternating heights", motifEn: "The heights divide READY into a visible beat.", motifZh: "字母高度把 READY 分成了一段可见节拍。", glyphs: ["R", "D", "Y"] },
  { slug: "relay-sandwich", mechanic: "interval", unlock: "assemble", zone: "top", palette: "apricot", composition: "two relay wafers enclosing a translucent timer slice", motifEn: "The transparent slice belongs between two identical shells.", motifZh: "透明薄片应夹在两片相同外壳之间。", glyphs: ["▰", "◷", "▰"] },
  { slug: "deep-pressure", mechanic: "wait", unlock: "hold", zone: "bottom", palette: "sky", composition: "a deepening shadow well beneath a floating pressure stone", motifEn: "The stone descends only after its ripple becomes still.", motifZh: "涟漪静止之后，石块才会继续下沉。", glyphs: ["●", "◡", "↓"] },
  { slug: "relay-beacon-weave", mechanic: "focus", unlock: "sequence", zone: "title", palette: "paper", composition: "relay and beacon threads woven through the headline counters", motifEn: "The weave alternates warm thread and empty eyelets.", motifZh: "编织纹在暖色线与空眼之间交替。", glyphs: ["⌁", "•", "⌁"] },
  { slug: "inverted-nibble", mechanic: "keyboard", unlock: "toggle", zone: "border", palette: "tide", composition: "four binary tiles reflected across the lower border", motifEn: "The reflection completes a pattern the tiles do not.", motifZh: "倒影补全了方片本身没有完成的图案。", glyphs: ["0", "1", "↧"] },
  { slug: "corner-zigzag", mechanic: "wheel", unlock: "trace", zone: "decor", palette: "dusk", composition: "folded paper corners forming an alternating vertical path", motifEn: "Each fold points to the next corner across the page.", motifZh: "每一道折痕都指向页面另一侧的下一个角。", glyphs: ["⌜", "⌟", "⌝"] },
  { slug: "outer-ones", mechanic: "orientation", unlock: "balance", zone: "stopwatch", palette: "sunrise", composition: "two tall marks counterweighting three tiny center beads", motifEn: "The outer marks become equal only on a level horizon.", motifZh: "只有地平线水平时，两侧直线才会等重。", glyphs: ["1", "000", "1"] },
  { slug: "five-beat-divider", mechanic: "visibility", unlock: "rhythm", zone: "left", palette: "lagoon", composition: "five pulses continuing behind an opaque side curtain", motifEn: "The missing pulse is hidden by the page, not absent.", motifZh: "缺失的脉冲只是藏在页面后面，并未消失。", glyphs: ["••", "▮", "•••"] },
  { slug: "beacon-metronome", mechanic: "locale", unlock: "interval", zone: "right", palette: "sorbet", composition: "bilingual beat words wrapped around a blinking beacon", motifEn: "Both words name one tempo from opposite reading directions.", motifZh: "两种文字从相反阅读方向说出同一个速度。", glyphs: ["拍", "•", "BEAT"] },
  { slug: "double-horizon", mechanic: "orientation", unlock: "align", zone: "top", palette: "meadow", composition: "two sky lines waiting for a hand-drawn bridge", motifEn: "The air between two horizons is shaped like a shallow loop.", motifZh: "两条地平线之间的空气像一个浅环。", glyphs: ["━", "∪", "━"] },
  { slug: "return-ticket", mechanic: "sequence", unlock: "visibility", zone: "bottom", palette: "lilac", composition: "three ticket stubs whose notches point out and back", motifEn: "The notches describe departure, absence, and return.", motifZh: "票根缺口依次描述离开、缺席与返回。", glyphs: ["▱", "·", "▰"] },
  { slug: "pointer-majority", mechanic: "toggle", unlock: "balance", zone: "title", palette: "apricot", composition: "two pointer votes outweighing a single key above the title", motifEn: "The ballot tilts until two matching tools agree.", motifZh: "两件相同工具达成一致时，票盘才会倾斜。", glyphs: ["↖", "↖", "K"] },
  { slug: "window-tilt", mechanic: "balance", unlock: "orientation", zone: "border", palette: "sky", composition: "a window frame hanging from one off-center hinge", motifEn: "The frame wants gravity to pass through its lone hinge.", motifZh: "窗框希望重力正好穿过唯一铰链。", glyphs: ["□", "•", "╱"] },
  { slug: "archive-knot", mechanic: "assemble", unlock: "sequence", zone: "decor", palette: "paper", composition: "three paper loops whose cut ends can form one knot", motifEn: "The loose ends share matching paper grain.", motifZh: "松开的末端拥有相同纸张纹理。", glyphs: ["⌒", "∞", "⌢"] },
  { slug: "silent-handoff", mechanic: "sort", unlock: "focus", zone: "stopwatch", palette: "tide", composition: "three control shadows ordered by softness around the timer", motifEn: "The softest shadow received attention most recently.", motifZh: "最柔和的影子刚刚才接到注意力。", glyphs: ["◉", "◎", "○"] },
  { slug: "pause-word", mechanic: "resize", unlock: "keyboard", zone: "left", palette: "dusk", composition: "a stretched word whose center gap matches the page margin", motifEn: "PA USE becomes whole when the frame narrows.", motifZh: "边框收窄时，PA USE 才会重新合为一词。", glyphs: ["PA", " ", "USE"] },

  { slug: "glass-relay-oscillator", mechanic: "tap", unlock: "toggle", zone: "right", palette: "sunrise", composition: "glass and relay discs alternating along a spring line", motifEn: "The glass disc rings where the spring changes color.", motifZh: "弹簧变色的位置会让玻璃圆片发声。", glyphs: ["◯", "⌁", "■"] },
  { slug: "pointer-echo", mechanic: "double-tap", unlock: "keyboard", zone: "top", palette: "lagoon", composition: "a pointer shadow repeated beside a single keycap", motifEn: "The second pointer is only an echo of the first.", motifZh: "第二个指针只是第一个留下的回声。", glyphs: ["↖", "K", "↖"] },
  { slug: "relay-quorum", mechanic: "hold", unlock: "balance", zone: "bottom", palette: "sorbet", composition: "five relay beads crowding one side of a soft scale", motifEn: "The crowded vote needs one sustained counterweight.", motifZh: "拥挤的投票需要一个持续的配重。", glyphs: ["•••", "⚖", "••"] },
  { slug: "corner-cross", mechanic: "drag", unlock: "align", zone: "title", palette: "meadow", composition: "two diagonal ribbons missing their shared crossing", motifEn: "Both ribbons are complete except for the same center.", motifZh: "两条丝带都只缺少同一个中心。", glyphs: ["╲", "◇", "╱"] },
  { slug: "five-bit-latch", mechanic: "align", unlock: "assemble", zone: "border", palette: "lilac", composition: "five bit tiles clipped to a misaligned outer rail", motifEn: "The rail's notches fit a five-part word exactly once.", motifZh: "轨道缺口只能完整容纳一次五位字。", glyphs: ["11", "00", "1"] },
  { slug: "alternating-target", mechanic: "rotate", unlock: "toggle", zone: "decor", palette: "apricot", composition: "alternating targets around a dial with one reversed face", motifEn: "Every second target faces inward except one.", motifZh: "每隔一个靶面都会朝内，只有一个例外。", glyphs: ["⊙", "◎", "⊙"] },
  { slug: "precision-five", mechanic: "trace", unlock: "rhythm", zone: "stopwatch", palette: "sky", composition: "five pinpricks making a shallow arc beneath the digits", motifEn: "The points are evenly spaced along a curve, not a line.", motifZh: "五个点沿曲线等距，而不是沿直线。", glyphs: ["··", "·", "··"] },
  { slug: "fourfold-ack", mechanic: "orbit", unlock: "sequence", zone: "left", palette: "paper", composition: "four acknowledgement petals revolving around an empty seal", motifEn: "Each petal points to the next clockwise absence.", motifZh: "每片花瓣都指向顺时针方向的下一处留白。", glyphs: ["✤", "○", "↻"] },
  { slug: "pulse-checker", mechanic: "rub", unlock: "sort", zone: "right", palette: "tide", composition: "a misted checker pattern with three pulse columns beneath", motifEn: "The pulse columns continue the checker under the haze.", motifZh: "脉冲列把雾下的棋盘纹继续延伸。", glyphs: ["▦", "≈", "▥"] },
  { slug: "ghost-session", mechanic: "rhythm", unlock: "visibility", zone: "top", palette: "dusk", composition: "three translucent page ghosts arriving at equal beats", motifEn: "The palest page returns on the same cadence as the others.", motifZh: "最淡的页面与其他页面按同一节拍返回。", glyphs: ["▱", "▱", "▱"] },
  { slug: "hinge-loop", mechanic: "interval", unlock: "orientation", zone: "bottom", palette: "sunrise", composition: "two horizon panels separated by a looping hinge gap", motifEn: "The hinge has two equal pauses in one rotation.", motifZh: "铰链每转一圈会出现两次等长停顿。", glyphs: ["▭", "∞", "▯"] },
  { slug: "hybrid-console", mechanic: "wait", unlock: "keyboard", zone: "title", palette: "lagoon", composition: "pointer and key shadows slowly overlapping across the title", motifEn: "The two shadows meet without either tool moving.", motifZh: "两道影子会在工具都不移动时相遇。", glyphs: ["↖", "K", "◐"] },
  { slug: "portable-horizon", mechanic: "focus", unlock: "orientation", zone: "border", palette: "sorbet", composition: "a tiny horizon passed between three border handles", motifEn: "The horizon travels wherever attention lands next.", motifZh: "注意力落到哪里，地平线就会被带到哪里。", glyphs: ["━", "○", "▭"] },
  { slug: "bend-command", mechanic: "keyboard", unlock: "resize", zone: "decor", palette: "meadow", composition: "four rigid letters following a visibly curved guide", motifEn: "The straight letters spell the action their guide performs.", motifZh: "笔直字母写出了曲线正在做的动作。", glyphs: ["B", "D", "⌒"] },
  { slug: "focus-orbit", mechanic: "wheel", unlock: "focus", zone: "stopwatch", palette: "lilac", composition: "three focus rings nested around the timer at different depths", motifEn: "The rings change depth in a repeating inward route.", motifZh: "焦点环按照重复的向内路线改变深度。", glyphs: ["◎", "◉", "⊙"] },
  { slug: "long-archive-route", mechanic: "orientation", unlock: "sequence", zone: "left", palette: "apricot", composition: "four paper landmarks arranged on a folding map", motifEn: "The map route becomes continuous after one fold.", motifZh: "地图折叠一次后，四处地标会连成连续路线。", glyphs: ["A", "R", "C"] },
  { slug: "pressure-vault", mechanic: "visibility", unlock: "hold", zone: "right", palette: "sky", composition: "a vault shadow revealed only behind a closing side panel", motifEn: "The protected circle appears while the page is disappearing.", motifZh: "页面消失的过程中，受保护的圆才会出现。", glyphs: ["◉", "▮", "⌾"] },
  { slug: "clue-relay-braid", mechanic: "locale", unlock: "assemble", zone: "top", palette: "paper", composition: "two language ribbons crossing a relay-shaped gap", motifEn: "The ribbons exchange sides at every translated word.", motifZh: "每遇到一个译词，两条语言丝带就交换位置。", glyphs: ["文", "⌁", "A"] },
  { slug: "wheel-echo", mechanic: "wheel", unlock: "orbit", zone: "bottom", palette: "tide", composition: "concentric air rings above a paper wheel", motifEn: "The absent hand should draw the wheel's returning echo.", motifZh: "缺席的手应该画出滚轮返回的回声。", glyphs: ["◎", "↕", "◌"] },
  { slug: "counterclockwise-breach", mechanic: "sequence", unlock: "orbit", zone: "title", palette: "dusk", composition: "four headline cuts pointing against the printed clock", motifEn: "The cuts tell a route opposite to the familiar clock.", motifZh: "标题缺口指出了一条与熟悉时钟相反的路线。", glyphs: ["⌝", "⌜", "↺"] },
  { slug: "nineteen-code", mechanic: "toggle", unlock: "sort", zone: "border", palette: "sunrise", composition: "five border shutters alternating open and closed", motifEn: "The nineteenth notch is encoded by which shutters admit light.", motifZh: "第十九道缺口由哪些百叶透光来编码。", glyphs: ["▮", "□", "▮"] },
  { slug: "twin-gates", mechanic: "balance", unlock: "toggle", zone: "decor", palette: "lagoon", composition: "paired paper gates balancing around a single zero", motifEn: "Both sides open only when the center remains empty.", motifZh: "只有中心保持空白，两侧纸门才会同时打开。", glyphs: ["11", "0", "11"] },
  { slug: "cipher-reversal", mechanic: "assemble", unlock: "sort", zone: "stopwatch", palette: "sorbet", composition: "three clue fragments mirrored beneath the timer baseline", motifEn: "The seams align only when the phrase reads backward.", motifZh: "只有倒序阅读，三道接缝才会对齐。", glyphs: ["TIME", "BENDS", "HERE"] },
  { slug: "six-beat-lock", mechanic: "sort", unlock: "rhythm", zone: "left", palette: "meadow", composition: "six lock pins ordered by the length of their sound shadows", motifEn: "The shortest pin casts the longest audible shadow.", motifZh: "最短的锁针投下最长的声音影子。", glyphs: ["••", "••", "••"] },
  { slug: "beacon-saturation", mechanic: "resize", unlock: "balance", zone: "right", palette: "lilac", composition: "a beacon glow overflowing a frame that is slightly too small", motifEn: "The glow becomes a perfect circle only in a wider frame.", motifZh: "只有边框变宽，溢出的光才会成为完整圆形。", glyphs: ["●", "◌", "□"] },

  { slug: "triple-phase", mechanic: "tap", unlock: "sequence", zone: "top", palette: "apricot", composition: "three phase moons crossing a thin upper rail", motifEn: "The middle moon touches both phases but belongs to neither.", motifZh: "中间月相碰到两边，却不属于任何一边。", glyphs: ["◐", "◑", "◒"] },
  { slug: "broken-measure", mechanic: "double-tap", unlock: "assemble", zone: "bottom", palette: "sky", composition: "a broken music measure split by one paper clue", motifEn: "The paper strip occupies exactly one missing beat.", motifZh: "纸条恰好占据一个缺失节拍。", glyphs: ["••", "▱", "•"] },
  { slug: "phase-return", mechanic: "hold", unlock: "visibility", zone: "title", palette: "paper", composition: "a returning phase shadow caught under the headline", motifEn: "The shadow waits beneath the word after its object has gone.", motifZh: "物件离开后，影子仍停留在标题下面。", glyphs: ["◒", "—", "↫"] },
  { slug: "parallax-window", mechanic: "drag", unlock: "orientation", zone: "border", palette: "tide", composition: "two window layers drifting at different speeds inside the border", motifEn: "The distant pane moves less but reaches the notch first.", motifZh: "远处窗格移动更少，却更早抵达缺口。", glyphs: ["▣", "▢", "↔"] },
  { slug: "override-command", mechanic: "align", unlock: "keyboard", zone: "decor", palette: "dusk", composition: "eight letter shadows aligned along an overriding coral stroke", motifEn: "The stroke crosses every letter except the ones that name it.", motifZh: "横线划过所有字母，只有说出它名字的字母例外。", glyphs: ["OVER", "RIDE", "━"] },
  { slug: "archive-figure-eight", mechanic: "rotate", unlock: "orbit", zone: "stopwatch", palette: "sunrise", composition: "two paper orbits crossing beneath the timer", motifEn: "The paired archives share one figure-eight crossing.", motifZh: "两份图鉴共享一个八字交点。", glyphs: ["○", "∞", "○"] },
  { slug: "focus-cascade", mechanic: "trace", unlock: "focus", zone: "left", palette: "lagoon", composition: "four descending focus pools joined by a hairline path", motifEn: "Attention falls downhill through four quiet basins.", motifZh: "注意力沿坡落入四个安静水池。", glyphs: ["◉", "◎", "○"] },
  { slug: "split-operator", mechanic: "orbit", unlock: "camera", zone: "right", palette: "sorbet", composition: "mirrored operator halves circling an empty hand frame", motifEn: "Two mirrored halves wait for one open-hand silhouette.", motifZh: "两半镜像正在等待一只张开的手。", glyphs: ["P", "K", "↔"], cameraGesture: "fist-open" },
  { slug: "fourfold-oscillation", mechanic: "rub", unlock: "rhythm", zone: "top", palette: "meadow", composition: "four hazy waves woven through a glass strip", motifEn: "The fourth wave is hidden beneath the frosted glass.", motifZh: "第四道波纹藏在磨砂玻璃下面。", glyphs: ["∿", "≈", "∿"] },
  { slug: "seven-relay-vote", mechanic: "rhythm", unlock: "sort", zone: "bottom", palette: "lilac", composition: "seven ballot beads falling into uneven time slots", motifEn: "The votes become fair when their arrival gaps match.", motifZh: "投票抵达的间隔一致时，结果才公平。", glyphs: ["•••", "•", "•••"] },
  { slug: "pressure-singularity", mechanic: "interval", unlock: "camera", zone: "title", palette: "apricot", composition: "a pinched gravity well deforming the title baseline", motifEn: "The empty center asks for a pinch drawn through the air.", motifZh: "凹陷中心等待一次穿过空气的捏合。", glyphs: ["◉", "⌁", "•"], cameraGesture: "pinch-drag" },
  { slug: "double-housing-loop", mechanic: "wait", unlock: "orbit", zone: "border", palette: "sky", composition: "two housing loops slowly phasing around the page edge", motifEn: "The loops naturally overlap at one patient instant.", motifZh: "耐心等待时，两道外壳环会自然重合一次。", glyphs: ["◯", "◯", "↻"] },
  { slug: "hundred-code", mechanic: "focus", unlock: "keyboard", zone: "decor", palette: "paper", composition: "seven tiny bits arranged around a large century ring", motifEn: "Reading only the focused bits spells a century register.", motifZh: "只读获得焦点的位，就能拼出世纪寄存器。", glyphs: ["110", "010", "1"] },
  { slug: "cipher-knot", mechanic: "keyboard", unlock: "camera", zone: "stopwatch", palette: "tide", composition: "a folded clue ribbon surrounding an empty zigzag channel", motifEn: "The fold leaves a zigzag path in the air between words.", motifZh: "折叠线索在词语之间留下空中的折线路径。", glyphs: ["TIME", "⌁", "HERE"], cameraGesture: "air-zigzag" },
  { slug: "seven-beat-null", mechanic: "wheel", unlock: "rhythm", zone: "left", palette: "dusk", composition: "seven pulse marks on a scrollable null ribbon", motifEn: "The ribbon returns to zero after seven equal passages.", motifZh: "丝带经过七段等距路程后会回到零点。", glyphs: ["•••", "0", "••••"] },
  { slug: "sevenfold-ack", mechanic: "orientation", unlock: "sequence", zone: "right", palette: "sunrise", composition: "seven acknowledgement flags hanging toward different gravity", motifEn: "All seven flags agree only when the page finds their down.", motifZh: "页面找到它们的下方时，七面旗才会方向一致。", glyphs: ["⚑", "⚐", "⚑"] },
  { slug: "quad-phase", mechanic: "visibility", unlock: "toggle", zone: "top", palette: "lagoon", composition: "four phase plates appearing in alternating page visits", motifEn: "No single visit reveals all four phases.", motifZh: "任何一次停留都无法看见全部四个相位。", glyphs: ["◐", "◑", "◒"] },
  { slug: "relay-polyrhythm", mechanic: "locale", unlock: "rhythm", zone: "bottom", palette: "sorbet", composition: "two language rhythms sharing five relay dividers", motifEn: "The translations divide the same five beats differently.", motifZh: "两种译文用不同方式切分相同的五拍。", glyphs: ["拍", "■", "BEAT"] },
  { slug: "eclipse-session", mechanic: "visibility", unlock: "balance", zone: "title", palette: "meadow", composition: "a dark disc waiting to cover five pale session moons", motifEn: "An open palm can become the missing eclipse.", motifZh: "一只张开的手可以成为缺失的日食。", glyphs: ["●", "○", "○"] },
  { slug: "triple-gravity", mechanic: "sequence", unlock: "orientation", zone: "border", palette: "lilac", composition: "three gravity arrows embedded in different page edges", motifEn: "Each arrow names a new down in chronological order.", motifZh: "三支箭头按时间顺序指定了三个新的下方。", glyphs: ["↓", "→", "↑"] },
  { slug: "liminal-device", mechanic: "toggle", unlock: "visibility", zone: "decor", palette: "apricot", composition: "a device silhouette caught between two page states", motifEn: "The silhouette exists only between present and absent.", motifZh: "设备轮廓只存在于出现与消失之间。", glyphs: ["▯", "◐", "▭"] },
  { slug: "device-braid", mechanic: "balance", unlock: "keyboard", zone: "stopwatch", palette: "sky", composition: "pointer and key strands braided evenly around the timer", motifEn: "Neither input strand may outweigh the other.", motifZh: "任何一股输入线都不能比另一股更重。", glyphs: ["↖", "⌁", "K"] },
  { slug: "chronos-command", mechanic: "assemble", unlock: "keyboard", zone: "left", palette: "paper", composition: "seven ancient letter fragments around a modern clock face", motifEn: "The oldest clock name is scattered around the newest one.", motifZh: "最古老的时钟名字散落在最新的表盘周围。", glyphs: ["CHR", "ONO", "S"] },
  { slug: "archive-labyrinth", mechanic: "sort", unlock: "sequence", zone: "right", palette: "tide", composition: "six paper landmarks whose shadows form one non-crossing route", motifEn: "The pages look tangled; their shadows never cross.", motifZh: "纸片看似纠缠，影子路线却从不相交。", glyphs: ["A", "R", "C"] },
  { slug: "silent-constellation", mechanic: "resize", unlock: "camera", zone: "stopwatch", palette: "dusk", composition: "six quiet stars framed around an empty hand-sized constellation", motifEn: "The final constellation is the negative space between six stars.", motifZh: "最终星座是六颗星之间的负空间。", glyphs: ["✦", "✧", "✦"], cameraGesture: "victory" },
];

export const PUZZLE_SCENES: readonly PuzzleSceneConfig[] = AUTHORED_SCENES.map(authoredScene);
