import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FULL_SPATIAL_ANCHOR_CONTRACT_BY_ID } from "../src/game/full-spatial-anchor-contract";
import { FULL_SPATIAL_LEVEL_DIRECTION_BY_ID } from "../src/game/full-spatial-level-direction";
import { V2_LEVELS, type V2ControllerKind } from "../src/game/v2-levels.generated";

const outputPath = resolve("docs/contracts/2026-08-31-time-hacker-full-100-cognitive-contract.md");

const falseHypotheses: Record<V2ControllerKind, readonly [string, string]> = {
  "corner-repair": ["最显眼的角本身就是按钮", "只要把任何黄色物体移到边缘就会解锁"],
  "patient-hold": ["连续操作可以强行打开结构", "只需立刻长按最显眼的中心"],
  "word-shift": ["只要移动整组文字的位置", "按视觉顺序重排字符即可"],
  "shadow-sort": ["按物体外形或颜色直接配对", "最大的对象应进入最大的容器"],
  "light-drag": ["移动被照亮的对象本身", "把光源拖到画面中心即可"],
  trace: ["沿最短直线连接所有节点", "从最亮的节点开始描边即可"],
  "frame-drag": ["移动框内对象而不是边界", "把窗口拖到视觉中心即可"],
  "layer-stack": ["按面积从大到小堆叠", "所有纸层重合就会完成"],
  fold: ["沿最明显折线折一次即可", "把纸面折到最小就是答案"],
  "coupled-drag": ["两个对象需要分别独立对齐", "只需拖动最显眼的一条轴"],
  "wave-align": ["让最高波峰重合", "让相同颜色的节点重合"],
  flip: ["翻开所有可翻面对象", "只翻最亮的一块即可"],
  orbit: ["把对象拖进中心", "沿完整圆周转一圈即可"],
  resize: ["拖动对象跨过边界", "把所有东西缩到最小即可"],
  "focus-route": ["依次点击所有节点", "持续按住中心即可"],
  rhythm: ["快速重复点击直到触发", "照视觉大小而不是节拍排序"],
  "wheel-echo": ["只看当前指针位置", "快速旋满一圈即可"],
  "cover-return": ["遮住对象本身就会完成", "离开页面一次便自动解锁"],
  rotate: ["让缺口或刻线完全重合", "把对象旋转整整一圈即可"],
  "edge-route": ["从中心穿过是最短路径", "直接点击终点即可"],
  "shared-control": ["每个对象都需要独立控制", "只完成其中一侧即可"],
  constellation: ["按亮度连接所有星点", "任意封闭图形都会完成"],
};

function chapterFor(id: number) {
  if (id <= 12) return { name: "发现页面异常", hypotheses: 2, steps: 2, target: "30–120 秒" };
  if (id <= 36) return { name: "建立关系语法", hypotheses: 3, steps: 3, target: "45–180 秒" };
  if (id <= 60) return { name: "跨层因果", hypotheses: 3, steps: 3, target: "60–240 秒" };
  if (id <= 84) return { name: "浏览器与时间记忆", hypotheses: 3, steps: 3, target: "75–300 秒" };
  return { name: "组合与精通", hypotheses: 3, steps: 4, target: "90–360 秒" };
}

function section(id: number) {
  const level = V2_LEVELS[id - 1];
  const spatial = FULL_SPATIAL_LEVEL_DIRECTION_BY_ID.get(id);
  const anchors = FULL_SPATIAL_ANCHOR_CONTRACT_BY_ID.get(id);
  if (!level || !spatial || !anchors) throw new Error(`Missing frozen input for level ${id}`);
  const chapter = chapterFor(id);
  const [falseA, falseB] = falseHypotheses[level.controller];
  const number = String(id).padStart(3, "0");
  return `## TH-CR-${number} · ${level.title.zh}

- **稳定映射**：Legacy ${number} / \`${level.slug}\` / \`${level.controller}\`。不改 ID、slug、数据库进度或正式判定。
- **第一屏异常**：${level.scene}
- **合理假设**：A. ${falseA}；B. ${falseB}；C. ${level.cognitiveShift}。
- **证据实验**：先允许玩家低成本验证 A，并用“${level.feedback}”形成可逆反证；随后观察“${level.discovery}”，再把观察与 C 建立关系。开场、H0、H1 不显示完整操作答案。
- **依赖推理链**：${id <= 12 ? "观察异常 → 得到一次反证" : "观察异常 → 排除表层假设 → 建立跨对象关系"}${id > 84 ? " → 复用此前学过的页面语法" : ""} → 进入原机制并完成“${level.solve}”。至少 ${chapter.hypotheses} 个合理假设、${chapter.steps} 个依赖推理节点。
- **最终玩法动作**：严格复用现有 \`${level.controller}\` 控制器与“${level.input}”；证据层只决定何时揭开正式谜面，不能直接触发 \`onArm\`、计时、判定或进度。
- **提示梯度**：H0 仅呈现异常；H1 只以局部边缘/深度变化指出观察区域；H2 说明“${level.cognitiveShift}”这条关系但不说动作；H3 才允许揭示“${level.solve}”，并沿用现有 assisted 语义。
- **空间因果证明**：${spatial.spatialThesis}。签名轮廓为“${spatial.signatureSilhouette}”；完成几何：${spatial.completionGeometry}
- **语义锚点**：${anchors.anchorRoles.map((role) => `\`${role}\``).join("、")}；视觉层仅绑定这些现有对象，\`aria-hidden\`、\`pointer-events:none\`，不得生成可点击替身。
- **输入与动效等价**：${level.crossPlatform} reduced-motion 下移除持续位移、视差和呼吸，只保留静态层级、反证状态、已发现状态和最终结果。
- **难度目标**：未知答案首解研究假设 ${chapter.target}；知道答案后不增加精确命中、强制等待或重复劳动。难度来自假设辨别，不来自操作摩擦。
- **可观察验收**：${level.acceptance} 同时必须满足：反证 150ms 内出现、错误可立即重试、证据层未完成时不能误解锁、证据层关闭时原关卡/计时/结果完全等价、360/390px 不被计时区遮挡。
- **主要风险**：${level.risk}。用触控目标 ≥44px、正常文档滚动、键盘等价控制与 WebKit 实测控制风险。
`;
}

const header = `# Time Hacker 001–100 认知重构冻结合同

状态：\`D4_AUTOMATED_ACCEPTED__PRODUCTION_AUTHORIZED\`
日期：2026-09-01
设计模式：Preserve
DESIGN_VARIANCE：8
MOTION_INTENSITY：8
VISUAL_DENSITY：3

## 1. 目的

这份文件是 100 关正式实施的逐关事实来源。重构把难度放在“观察异常、提出假设、用低成本实验排除错误解释、利用真正规则”上；不修改停在 10.00 秒的核心目标、计时算法、成功窗口、结果、分数、FULL/100 与 SOFT_LAUNCH/12 顺序、数据库记录、路由、API 或分析事件语义。

## 2. 统一运行时合同

1. 每关先呈现无文字答案的认知证据层，再揭开原始 V2 控制器；认知层不能调用 \`onArm\`。
2. 001–012 至少两个合理假设和两步推理；013–084 至少三个假设和三步推理；085–100 至少三个假设和四个依赖节点或一次已学语法组合。
3. 错误实验必须可逆，并在 150ms 内产生能排除一种假设的局部反馈；不能增加生命、惩罚、等待或精确像素操作。
4. 开场不显示关卡说明、操作动词、箭头、虚线答案框或持续聚光。H1 只指出区域，H2 说明关系，H3 才揭示完整动作。
5. 证据层完成后仍必须按原关卡完成作弊规则，随后由玩家使用现有语义 HTML 开始/停止计时。
6. 100 关空间层单向读取 \`slug/armed/status\` 和冻结锚点；Canvas 必须 \`aria-hidden\`、\`pointer-events:none\`，关闭后玩法与结果完全相同。
7. 标签页隐藏、页面离屏或游戏不活跃时暂停渲染；移动端限制 DPR；reduced-motion 移除持续空间运动但保留完整状态反馈。
8. 设计与实现通过 \`TH-CR-001..100\`、\`TH-SP-001..100\`、Legacy ID 和 slug 四重追踪。任何偏离都必须先更新本合同并说明原因。

## 3. 章节难度曲线

| 范围 | 认知目标 | 假设下限 | 推理下限 | 未知答案首解假设 |
| --- | --- | ---: | ---: | --- |
| 001–012 | 发现页面异常 | 2 | 2 | 30–120 秒 |
| 013–036 | 建立关系语法 | 3 | 3 | 45–180 秒 |
| 037–060 | 跨层因果 | 3 | 3 | 60–240 秒 |
| 061–084 | 浏览器与时间记忆 | 3 | 3 | 75–300 秒 |
| 085–100 | 组合与精通 | 3 | 4 | 90–360 秒 |

首解时间是盲测假设，不是自动测试能够证明的结果，也不能靠强制等待灌水。

## 4. 逐关冻结

`;

const footer = `## 5. 全量发布验收

- 100 条认知合同、100 条空间合同、100 个稳定 slug 均唯一且完整。
- 每关都先产生至少一次可读反证，再进入原控制器；开场 DOM 中不出现 H3 答案文本。
- FULL 仍是 100 关，SOFT_LAUNCH 仍是冻结 12 关；既有数据库 ID、历史记录与进度无需迁移。
- 正式停止操作仍先提交现有 duration/wallDuration/events 并取得判定，空间冻结仅随后响应状态。
- 桌面 1440、手机 360/390、平板 768、Chromium、WebKit、键盘、触控、Canvas 关闭和 reduced-motion 全部通过。
- 自动化只能证明结构和行为合同；真实趣味、首解难度、留存和付费仍需要未知答案玩家与生产数据验证。
`;

async function main() {
  const body = `${header}${V2_LEVELS.map((level) => section(level.id)).join("\n")}${footer}`;
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, body, "utf8");
  process.stdout.write(`Wrote ${V2_LEVELS.length} cognitive contracts to ${outputPath}\n`);
}

await main();
