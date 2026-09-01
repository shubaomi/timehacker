# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- 新玩家从浏览器直接进入 `SOFT_LAUNCH`，需要在数秒内理解并开始“让时间停在 10.00 秒”的挑战。
- 既有玩家继续使用 `FULL` 100 关路径，并保留原有进度、记录与数据。
- 玩家可能使用键盘、触控、手机、平板、Chromium 或 WebKit，也可能开启 reduced-motion。

## Product Purpose

Time Hacker 是一个双语网页计时解谜游戏。玩家可以直接挑战精确停表，也可以观察页面异常、发现隐藏规则并让时间进入辅助状态。成功仍由玩家亲自按下停止完成。

## Positioning

产品的差异不只是精确秒表，而是让页面、文字、边缘、留白和浏览器状态成为可推理的谜面。隐藏规则改变时间体验，但不替代玩家的最终操作。

## Operating Context

- 正式首页保持极简游戏壳，次级功能位于默认关闭的右侧抽屉。
- 新玩家使用冻结的 12 关顺序；既有玩家使用完整 100 关目录。
- 关卡包含 idle、running、stopped、success、miss 等可观察游戏状态，以及每关既有的发现、解谜、武装和辅助计时路径。
- 项目使用匿名、隐私最小化的软启动事件统计评估行为，不记录设备指纹、摄像头内容或输入轨迹。

## Capabilities and Constraints

- 核心目标、开始/停止/重试/下一关顺序、计时算法、精度、成功窗口、分数、结果与进度逻辑均为冻结合同。
- `SOFT_LAUNCH` 12 关顺序与 `FULL` 100 关代码、数据库记录、历史玩家数据均需保持兼容。
- 路由、API、数据库、持久化、匿名分析事件语义、测试 ID、表单字段与现有测试合同不得因视觉升级改变。
- 视觉增强只能单向读取游戏状态，不能控制状态机、计时、判定或关卡进度；关闭视觉层后玩法与结果必须完全相同。
- 本轮不新增关卡、支付、广告、订阅、体力、签到、摄像头、设备指纹或输入轨迹采集。
- 2026-08-31 的最初研究阶段不授权部署；随后产品负责人已明确授权完整 100 关认知/空间重构在全部验证通过后提交、同步并部署生产。仍不创建 Release 或 PR。

## Brand Commitments

- 产品名称与字标为 `TIME HACKER`。
- 保留浅蓝、珊瑚红、黄色、深蓝文字和数字，以及明亮几何图形与“日光纸上剧场”语言。
- 不转为通用黑色科技风，不使用 AI 紫色、过量外发光、全页玻璃卡片或通用 Three.js 展厅。
- ThreeUI 只作为空间构图、运动逻辑和状态反馈的参考，不复制品牌、页面结构、Pro 源码或视觉身份。

## Evidence on Hand

- 产品与视觉合同：`docs/DESIGN.md`、`docs/design-brief.md`。
- 软启动合同：`docs/plans/2026-08-22-time-hacker-soft-launch-implementation.md`。
- 100 关定义与审计：`src/game/v2-levels.generated.ts`、`src/game/puzzle-scene-catalog.ts`、`docs/puzzle-level-audit.md`。
- 行为、响应式、可访问性与浏览器测试：`tests/unit/`、`tests/components/`、`tests/e2e/`。
- 本轮尚无用户批准的空间视觉方向；隔离原型不能视为正式设计授权。

## Product Principles

1. 玩法合同优先于视觉表达。
2. 空间效果必须把计时状态变得更可感知，而不是增加新操作。
3. 每关独立谜面与既有操作路径优先于统一 3D 模板。
4. 渐进增强必须可关闭、可降级、可验证。
5. 自动测试、真实浏览器、真实设备与人工审美证据必须分层报告。

## Accessibility & Inclusion

- 开始、停止、数字和结果继续使用语义 HTML，键盘和触控路径保持等价。
- Canvas 必须 `aria-hidden`、`pointer-events: none` 且不进入焦点顺序。
- 所有真实控件保留可见焦点、可读名称、实用触摸目标与 WCAG AA 对比度。
- reduced-motion 下移除空间运动，但保留完整状态、结果与不依赖颜色的反馈。
