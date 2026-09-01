# Time Hacker FULL/100 空间视觉设计与防漂移执行合同

> 状态：`FROZEN`
>
> 授权日期：2026-08-30
>
> 范围：100 关详细设计冻结与隔离可交互原型；不授权正式首页扩展、默认开启、提交、推送、部署、Release 或 PR

## 1. 目标与非目标

目标是让 100 关既有作弊规则在“日光纸上剧场”的 2.5D/3D 空间中变得更可感、更有身体感和更有创意。空间设计必须解释每关原有因果，而不是为所有关卡附加同一个背景效果。

非目标包括重新设计作弊规则、增加输入步骤、改计时和成功条件、增加明显答案提示、把全关卡统一成拖拽，以及修改路由、API、数据库、进度、分析或生产配置。

## 2. 事实来源与冲突裁决

按以下顺序裁决冲突：

1. 产品负责人确认的不可变合同与 `docs/DESIGN.md`。
2. `src/components/v2-puzzle-scene.tsx` 的当前控制器行为及对应组件/E2E 测试。
3. `src/game/v2-levels.generated.ts` 的稳定 ID、slug、发现、破解、输入、风险和验收。
4. `docs/plans/2026-08-08-time-hacker-v2-100-level-design-bible.md`。
5. `docs/plans/2026-08-29-time-hacker-full-100-spatial-feedback-matrix.md`。

较低层文档不得覆盖较高层真实行为。发现不一致时标记 `BLOCKED_BY_CONTRACT`，不得凭设计判断自行选择。

## 3. 追踪键与状态

每关使用稳定追踪键 `TH-SP-###`。状态只能按以下顺序前进：

```text
DRAFT
-> RULE_VERIFIED
-> DESIGN_REVIEWED
-> FROZEN
-> PROTOTYPED
-> VERIFIED
```

- `RULE_VERIFIED`：真实控制器、阈值、输入和测试已经交叉核对。
- `DESIGN_REVIEWED`：空间构图、状态、响应式、无障碍、性能和提示均有可观察标准。
- `FROZEN`：没有未解决的玩法冲突，可以进入实现。
- `PROTOTYPED`：只表示隔离原型存在，不表示正式游戏已经修改。
- `VERIFIED`：规则忠实度、视觉、响应式、reduced-motion、WebKit 和 on/off 等价证据闭合。

禁止跳级。实现提交必须在代码或测试中引用 `TH-SP-###`。

## 4. 单关详细设计必填结构

每个 `TH-SP-###` 必须包含以下完整字段：

1. **规则身份证**：ID、slug、章节、控制器、输入与当前阈值。
2. **玩家因果**：初始异常、发现动作、破解动作、失败动作和完成条件。
3. **保留/强化/视觉调整**：明确哪些对象和交互完全保留，哪些只增加空间证据。
4. **第一屏构图**：前景、中景、后景、时间场、主焦点和不允许遮挡的 HTML 区域。
5. **状态表**：`idle`、`running`、`stopped`、`success`、`miss`，以及 `dormant/discovered/solving/armed` 的关卡状态。
6. **发现与提示梯度**：初始不泄题；长时间未发现后，提示只按观察范围、关系、近操作三级递进。
7. **响应式**：1440、平板、390、360、短屏和内容极值。
8. **reduced-motion 与无障碍**：静态证据、焦点、键盘、触摸和非颜色表达。
9. **实现边界**：语义 HTML、CSS/SVG、Canvas2D、可选 WebGL 的职责与完全关闭路径。
10. **几何与完成态**：连接误差、重叠、闭合、唯一对象、遮挡和副本数量。
11. **性能预算**：DPR、循环、暂停、降级和延迟加载。
12. **验收与证据**：规则负例、已知答案路径、五状态截图、响应式、WebKit、reduced-motion、on/off 等价。

任何字段缺失时，该关保持 `DRAFT`，不能实现。

## 5. 视觉系统锁

- Redesign mode：Preserve。
- `DESIGN_VARIANCE: 8`、`MOTION_INTENSITY: 8`、`VISUAL_DENSITY: 3`。
- 保留浅蓝、珊瑚红、黄色、薄荷绿、深蓝文字和纸质几何。
- 每关只有一个主空间命题、一个主要因果焦点和最多一个持续环境动效。
- 不使用通用黑色科技风、AI 紫色、外发光答案、全页玻璃卡片、自由相机、空间导航或 Three.js 展厅。
- ThreeUI 只提供空间构图、运动逻辑和状态反馈参考，不复制品牌、结构、源码或视觉身份。

## 6. 玩法与提示锁

- 原控制器独占完成判定。视觉层没有 `onArm`、`onStop`、计时、结果、进度、API、数据库或分析写权限。
- 开始、停止、重试、下一关、数字和结果继续使用语义 HTML。
- 初始不得显示操作说明、目标虚线框、答案小字、发光热区或可直接推断作弊方式的完成轮廓。
- 第一级提示只指向观察区域；第二级指出对象关系；第三级才接近操作，不自动演示答案。
- `stopped` 必须在现有停止和判定完成后读取；`success/miss` 不能被视觉层预测。
- `miss` 不增加等待、惩罚或清空已发现关系，立即允许原有重试。

## 7. 实现边界

- HTML/SVG 承担可操作对象、命中、焦点、键盘、触摸和轨迹判定。
- CSS 3D 承担纸厚、正背、折痕、层级、投影和简单透视。
- Canvas2D 仅承担时间场、粒子、回声、波面和非交互状态反馈，必须 `aria-hidden`、`pointer-events:none`、不可聚焦。
- WebGL 只允许用于折射、体积光、光学材质和高价值空间场；HTML 始终位于其上方。WebGL 失败时自动回退到 CSS/Canvas2D，不影响玩法。
- 禁止用 React state 跟踪逐帧指针、粒子或动画值；使用 Motion values、隔离 RAF 或 client leaf。
- 页面离屏、切换标签、游戏不活跃、进入 BFCache 时暂停渲染。

## 8. 单关实现前门禁

实现者在修改任何原型文件前必须完成以下检查：

```text
[ ] 对应 TH-SP-### 状态为 FROZEN
[ ] 文档中的 slug/controller 与生成注册表一致
[ ] 当前控制器和测试未发生未记录变化
[ ] 负例、阈值和完成条件已抄入验收清单
[ ] 初始提示不会泄题
[ ] 手机和键盘路径已定义
[ ] reduced-motion 静态证据已定义
[ ] 3D 完全关闭路径已定义
[ ] 几何闭合与完成态副本数量已定义
[ ] 性能与降级预算已定义
```

任一项未通过即停止。

## 9. 偏差记录

偏差记录使用以下格式，统一追加到对应逐关文档：

```text
偏差 ID：TH-SP-###-D##
原冻结要求：
拟偏离内容：
原因与证据：
玩法/视觉/响应式/测试影响：
替代方案：
是否需要产品重新批准：是/否
结论：拒绝/批准/待定
```

影响控制器、输入、顺序、阈值、提示、完成条件、视觉身份、主要构图或验收标准的偏差一律需要重新批准。技术实现细节只有在结果与验收完全等价且有证据时，才可由实现评审批准。

## 10. 验证矩阵

每关至少提供：

- 原规则的正路径和至少两个有意义负路径。
- 空间层关闭与开启的相同输入序列，DOM 几何误差不超过冻结规格。
- `idle/running/stopped/success/miss` 五状态截图。
- 1440×900、734×876、590×698、390×844、360×800。
- 中文和英文内容极值。
- keyboard、pointer/touch 等价路径。
- reduced-motion 静态完成证据。
- Chromium 与 WebKit。
- Canvas/WebGL 属性、延迟加载、暂停和降级检查。

自动证据不能替代真实手机和未知答案真人试玩；二者未完成时明确标记 `UNVERIFIED_HUMAN` 或 `UNVERIFIED_DEVICE`。

## 11. 集中交付

本次任务只在以下条件同时满足时提交最终集中验收：

1. 100/100 关均有 `FROZEN` 详细设计。
2. 100/100 的稳定 ID、slug、控制器和规则锚点覆盖检查通过。
3. 隔离原型不写生产数据，且严格按冻结文档实现。
4. 共享能力没有把不同作弊方式统一成同一种互动。
5. 浏览器、响应式、reduced-motion、性能、无障碍和 on/off 等价证据分层报告。
6. 独立设计审查和代码审查均按逐关追踪键闭合。

任何未通过项必须如实列出，不得把“有代码”“测试绿色”或“截图好看”表述为全部完成。

## 12. 隔离原型实现追踪记录

本节只记录设计冻结后的隔离实现，不改变第 1–11 节合同，也不授权正式页面扩容。

- `src/game/full-spatial-level-direction.ts`：逐条承接 `TH-SP-001`–`TH-SP-100` 的空间命题、签名剪影、完成几何、深度模式和五状态几何参数。单元测试逐字对照十份详细设计文档，任一漂移即失败。
- `src/game/full-spatial-anchor-contract.ts`：每关显式列出真实 V2 对象的稳定 selector、语义角色、签名轮廓 primitive 与 success 聚合方式。禁止在运行时改回按 DOM 顺序通用抽样；`allowFallback` 固定为 `false`。
- `src/components/v2-prototype/full-spatial-review-lab.tsx`：空间层只读 `V2PuzzleScene`。连续 pointer/style 几何只在隔离叶节点的 RAF 中直接写入 CSS variable、SVG path 与 `data-*` 证据，不进入 React state，不触发关卡父组件逐帧重渲染。
- 每关实际构图由“原控制器独特对象 + 显式语义 anchors + `paper/ring/ribbon/fold/portal/ray` 签名 primitive + `lock/converge/stack/fold/orbit/trace` success 组合”共同决定；命题、剪影和完成几何不能只作为审计标签。
- 计时卡和主按钮是硬避让层：保持不透明、语义 HTML、最高读数层级。空间线、体积和关卡对象不得穿透数字可读区或夺取停止按钮层级。
- `stopped` 复用 running 动画并暂停当前帧；`miss` 不清 discovery、不 reset；`success` 保留真实完成结构的可读度；reduced-motion 删除连续运动但保留静态层序与结果。
- `reviewTimerElapsed` 与 `armedRef` 保证 running 中解锁不重启时间，9.50 秒后的隔离减速单调且不回退；该行为仅属于隔离体验原型，不修改正式计时算法。

2026-08-30 几何复核曾把实现状态降为 `CORRECTION_REQUIRED`，原因是原自动证据未拦截计时卡遮挡、整场景锚点、通用复制体和成功态同质化。现已按 `2026-08-30-time-hacker-full-100-spatial-geometry-correction-contract.md` 完成自动修正门，状态为 `PROTOTYPED_AUTOMATED_CORRECTED`。正式首页、生产 API/DB/analytics、SOFT_LAUNCH 白名单均未扩展；真实手机与未知答案真人试玩继续标记 `UNVERIFIED_DEVICE`、`UNVERIFIED_HUMAN`。
