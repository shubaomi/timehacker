# Time Hacker FULL/100 空间视觉几何修正合同

> 状态：`FROZEN_FOR_CORRECTION`
>
> 范围：只修正隔离原型 `/playtest-v2/spatial` 的空间视觉层、锚点绑定与评审测试。正式游戏规则、计时、判定、关卡定义、状态机、数据库、分析、路由和生产默认均不在范围内。
>
> 上游事实来源：`docs/DESIGN.md`、`2026-08-30-time-hacker-full-100-spatial-design-execution-contract.md`、十份 `TH-SP-001`–`TH-SP-100` 逐关设计文档、`src/game/v2-levels.generated.ts`。发生冲突时，玩法合同优先，本文件只拥有视觉修正权。

## 1. 修正原因与证据

本轮针对用户在真实页面观察到的两类缺陷：空间对象被计时卡截断，以及半透明复制体与真实对象轮廓不重合。2026-08-30 的 DOM 几何审计进一步证明这不是单关问题：桌面 `1440×900` 下有 56 关的宽交互命中区域与计时卡相交，71 关的空间体积与计时卡相交；45 关的设计 `anchorCount` 与实现 selector 数量不一致；27 关使用整个场景容器作为锚点；100 关成功态均被实现成同一种 `converge`。这些证据使原状态 `PROTOTYPED_AUTOMATED` 不再成立，修正完成前统一标记为 `CORRECTION_REQUIRED`。

## 2. 不可改变项

- 不修改任何 `V2_LEVELS` 发现动作、破解动作、输入种类、顺序、阈值、完成条件、失败条件或提示时机。
- 不修改正式计时器、10.00 秒平台、判定窗口、分数、结果或进度。
- 不移动真实可交互元素来迁就空间效果，不改变其命中区域、键盘顺序或触控路径。
- 空间层继续 `aria-hidden`、`pointer-events:none`，只读取既有 DOM 几何与状态。
- 初始态不得新增目标框、答案轮廓、发光热区、连接线或操作说明。
- 本轮不进入生产页面，不提交、不推送、不部署。

## 3. 硬性修正编号

| ID | 要求 | 可观察验收 |
| --- | --- | --- |
| `VIS-GEO-001` | 计时卡表面不得再遮住真实谜题对象。卡面位于谜题对象之后，数字、单位、状态文字与主按钮仍位于谜题对象之前。 | 真实对象在卡面交叠区仍可见；数字和按钮保持可读；空间层不进入点击命中。 |
| `VIS-GEO-002` | 空间体积必须绑定到精确对象，不得用整个 `v2-scene` 生成大矩形复制体。 | 100 关没有 selector 以本关场景根作为唯一锚点；精确锚点缺失时该体积关闭，不回退。 |
| `VIS-GEO-003` | 空间体积只表现同一对象的后缘/厚度，不绘制第二个完整对象。 | 默认无整面半透明填充、无游离副本；体积位置随真实对象更新。 |
| `VIS-GEO-004` | 空间体积与计时数字、状态文字或主按钮相交时自动关闭该体积。 | 四个冻结视口中，可见体积与三个保护区相交数为 0。 |
| `VIS-GEO-005` | 成功态以真实控制器完成几何为准，视觉体积不得另行向平均中心移动。 | 001 纸角、043 路线端点、081 双半环等继续由原控制器闭合；空间层只锁定 Z 深度。 |
| `VIS-GEO-006` | 成功组合必须服从控制器因果，不再 100 关全部 `converge`。 | `lock/stack/fold/orbit/trace` 均有覆盖，且每个控制器映射稳定。 |
| `UX-DIFF-001` | idle 与未发现 running 不显示连接线、中心封印或答案聚合方向。 | `data-revealed=false` 时连接线、封印、空间体积均不可见；提示仍只由原提示系统触发。 |
| `UX-DIFF-002` | 发现后反馈只强化玩家已经触发的因果，不预演下一步。 | 只有 `discovered/armed/success` 允许微弱后缘；miss 不重置发现状态、不增加等待。 |
| `QA-GEO-001` | 几何门覆盖 `1440×900`、`768×1024`、`390×844`、`360×800`，另保留短屏 `590×698`、`734×876`。 | 100 关均通过锚点绑定、保护区、横向溢出、可达性检查。 |
| `QA-GEO-002` | 视觉开关不改变原玩法。 | 同一输入序列在空间层 on/off 下得到相同 `armed` 和关卡结果。 |
| `QA-GEO-003` | 自动证据不冒充真人体验。 | 自动门通过后仍保留 `UNVERIFIED_HUMAN` 与 `UNVERIFIED_DEVICE`。 |

## 4. 分层与遮挡合同

从后到前的固定层序为：舞台背板 `1` → 计时卡纸面 `3` → 空间后缘 `4` → 真实谜题对象 `5` → 计时数字和状态文字 `7` → 主按钮 `8` → 评审控件 `30`。计时卡 DOM 本身不得创建阻止子层穿插的 stacking context；卡面改由伪元素承担。任何空间体积命中 `.timerValue`、计时状态文字或 `.primary` 的保护矩形时都设为隐藏。该隐藏只影响 `aria-hidden` 装饰，不移动或修改真实对象。

## 5. 体积与状态合同

- `idle`：连接线、封印和对象体积不可见；只保留不指向答案的远景时间场。
- `running + undiscovered`：仍不显示对象级空间线索。
- `running + discovered`：显示透明后缘与短投影，不显示目标方向；连续运动可暂停。
- `stopped`：先由现有停止流程冻结结果，再暂停当前空间帧。
- `success`：真实对象先完成；视觉层仅增加 `translateZ`、接缝锁定色和一次短释放，不改变 X/Y。
- `miss`：对象后缘克制回弹，立即允许重试，不清除已经发现的结构。
- `reduced-motion`：删除连续动画，保留静态层序、后缘和结果颜色；所有保护区与绑定门仍执行。

## 6. 成功组合映射

| 组合 | 控制器 | 含义 |
| --- | --- | --- |
| `lock` | `corner-repair`、`patient-hold`、`frame-drag`、`coupled-drag`、`resize`、`shared-control` | 保持真实对象坐标，只做深度锁定。 |
| `stack` | `word-shift`、`shadow-sort`、`layer-stack` | 按真实层序稳定，不向共同中心漂移。 |
| `fold` | `fold`、`flip`、`cover-return` | 沿真实折轴收束，不生成第二张纸。 |
| `orbit` | `orbit`、`wheel-echo`、`rotate`、`constellation` | 保持共享中心和轨道关系，不更改半径。 |
| `trace` | `light-drag`、`trace`、`wave-align`、`focus-route`、`rhythm`、`edge-route` | 只描现有路径或端点，不补画答案路径。 |

## 7. 逐关修正矩阵

下表是十份逐关设计文档的修正增量，不替代其中的规则、五状态、响应式和完成几何。所有关统一执行“初始不显示对象级线索、保护区命中则关闭体积、成功不改 X/Y”。“替换整场景锚点”必须绑定到真实交互对象或已有稳定几何节点；不允许退回场景根。

| 关卡 | 控制器 | 锚点修正 | 成功组合 |
| --- | --- | --- | --- |
| 001 | `corner-repair` | 保留精确锚点 | lock |
| 002 | `patient-hold` | 保留精确锚点 | lock |
| 003 | `word-shift` | 保留精确锚点 | stack |
| 004 | `shadow-sort` | 保留精确锚点 | stack |
| 005 | `light-drag` | 保留精确锚点 | trace |
| 006 | `trace` | 替换整场景锚点 | trace |
| 007 | `frame-drag` | 保留精确锚点 | lock |
| 008 | `layer-stack` | 保留精确锚点 | stack |
| 009 | `shadow-sort` | 保留精确锚点 | stack |
| 010 | `fold` | 替换整场景锚点 | fold |
| 011 | `patient-hold` | 替换整场景锚点 | lock |
| 012 | `patient-hold` | 保留精确锚点 | lock |
| 013 | `wave-align` | 保留精确锚点 | trace |
| 014 | `coupled-drag` | 保留精确锚点 | lock |
| 015 | `flip` | 替换整场景锚点 | fold |
| 016 | `rotate` | 替换整场景锚点 | orbit |
| 017 | `flip` | 替换整场景锚点 | fold |
| 018 | `resize` | 替换整场景锚点 | lock |
| 019 | `rotate` | 替换整场景锚点 | orbit |
| 020 | `focus-route` | 替换整场景锚点 | trace |
| 021 | `rhythm` | 保留精确锚点 | trace |
| 022 | `rhythm` | 保留精确锚点 | trace |
| 023 | `shadow-sort` | 保留精确锚点 | stack |
| 024 | `rhythm` | 替换整场景锚点 | trace |
| 025 | `rhythm` | 替换整场景锚点 | trace |
| 026 | `shared-control` | 替换整场景锚点 | lock |
| 027 | `orbit` | 替换整场景锚点 | orbit |
| 028 | `patient-hold` | 替换整场景锚点 | lock |
| 029 | `shared-control` | 替换整场景锚点 | lock |
| 030 | `fold` | 替换整场景锚点 | fold |
| 031 | `resize` | 替换整场景锚点 | lock |
| 032 | `flip` | 替换整场景锚点 | fold |
| 033 | `rotate` | 替换整场景锚点 | orbit |
| 034 | `layer-stack` | 保留精确锚点 | stack |
| 035 | `shared-control` | 替换整场景锚点 | lock |
| 036 | `shared-control` | 保留精确锚点 | lock |
| 037 | `layer-stack` | 替换整场景锚点 | stack |
| 038 | `edge-route` | 保留精确锚点 | trace |
| 039 | `layer-stack` | 保留精确锚点 | stack |
| 040 | `cover-return` | 替换整场景锚点 | fold |
| 041 | `orbit` | 替换整场景锚点 | orbit |
| 042 | `layer-stack` | 替换整场景锚点 | stack |
| 043 | `focus-route` | 保留精确锚点 | trace |
| 044 | `focus-route` | 保留精确锚点 | trace |
| 045 | `focus-route` | 保留精确锚点 | trace |
| 046 | `shared-control` | 保留精确锚点 | lock |
| 047 | `patient-hold` | 保留精确锚点 | lock |
| 048 | `patient-hold` | 替换整场景锚点 | lock |
| 049 | `trace` | 替换整场景锚点 | trace |
| 050 | `layer-stack` | 保留精确锚点 | stack |
| 051 | `fold` | 保留精确锚点 | fold |
| 052 | `fold` | 保留精确锚点 | fold |
| 053 | `shared-control` | 保留精确锚点 | lock |
| 054 | `coupled-drag` | 替换整场景锚点 | lock |
| 055 | `layer-stack` | 保留精确锚点 | stack |
| 056 | `shared-control` | 保留精确锚点 | lock |
| 057 | `light-drag` | 保留精确锚点 | trace |
| 058 | `fold` | 保留精确锚点 | fold |
| 059 | `orbit` | 保留精确锚点 | orbit |
| 060 | `layer-stack` | 保留精确锚点 | stack |
| 061 | `shared-control` | 保留精确锚点 | lock |
| 062 | `shared-control` | 保留精确锚点 | lock |
| 063 | `trace` | 保留精确锚点 | trace |
| 064 | `fold` | 保留精确锚点 | fold |
| 065 | `focus-route` | 保留精确锚点 | trace |
| 066 | `layer-stack` | 保留精确锚点 | stack |
| 067 | `wheel-echo` | 保留精确锚点 | orbit |
| 068 | `orbit` | 保留精确锚点 | orbit |
| 069 | `trace` | 保留精确锚点 | trace |
| 070 | `layer-stack` | 保留精确锚点 | stack |
| 071 | `rotate` | 保留精确锚点 | orbit |
| 072 | `layer-stack` | 保留精确锚点 | stack |
| 073 | `shadow-sort` | 保留精确锚点 | stack |
| 074 | `layer-stack` | 保留精确锚点 | stack |
| 075 | `light-drag` | 保留精确锚点 | trace |
| 076 | `flip` | 保留精确锚点 | fold |
| 077 | `shared-control` | 保留精确锚点 | lock |
| 078 | `frame-drag` | 保留精确锚点 | lock |
| 079 | `fold` | 保留精确锚点 | fold |
| 080 | `orbit` | 保留精确锚点 | orbit |
| 081 | `coupled-drag` | 保留精确锚点 | lock |
| 082 | `shared-control` | 保留精确锚点 | lock |
| 083 | `patient-hold` | 保留精确锚点 | lock |
| 084 | `cover-return` | 保留精确锚点 | fold |
| 085 | `cover-return` | 保留精确锚点 | fold |
| 086 | `shared-control` | 保留精确锚点 | lock |
| 087 | `rotate` | 保留精确锚点 | orbit |
| 088 | `fold` | 保留精确锚点 | fold |
| 089 | `resize` | 保留精确锚点 | lock |
| 090 | `shared-control` | 保留精确锚点 | lock |
| 091 | `fold` | 保留精确锚点 | fold |
| 092 | `shared-control` | 保留精确锚点 | lock |
| 093 | `fold` | 保留精确锚点 | fold |
| 094 | `light-drag` | 保留精确锚点 | trace |
| 095 | `layer-stack` | 保留精确锚点 | stack |
| 096 | `shadow-sort` | 保留精确锚点 | stack |
| 097 | `coupled-drag` | 保留精确锚点 | lock |
| 098 | `rotate` | 保留精确锚点 | orbit |
| 099 | `wave-align` | 保留精确锚点 | trace |
| 100 | `constellation` | 保留精确锚点 | orbit |

## 8. 验证与停止门

实施顺序固定为：先让合同测试因上述缺陷失败，再修改隔离视觉层，再运行 100 关多视口几何门、组件/单元测试、lint、typecheck、build 和有界截图复核。若修复需要移动真实对象、改变控制器或修改玩法规则，立即停止并记录偏差，不得自行实现。

自动门通过只允许恢复为 `PROTOTYPED_AUTOMATED_CORRECTED`。未知答案玩家是否仍觉得过于简单，必须通过空间层 off/on 的盲测对比判断；在 off 版本仍过于简单之前，不以增加动作数量制造假难度。

## 9. 2026-08-30 实施与证据记录

状态：`PROTOTYPED_AUTOMATED_CORRECTED`。

- `VIS-GEO-001`–`006`：隔离原型已改为卡面/谜题/计时文字夹层；35 关的整场景或辅助深度锚点改为真实控制对象；成功态不再改写 X/Y，并按控制器分配 `lock/stack/fold/orbit/trace`。
- `UX-DIFF-001`–`002`：未发现时对象体积、连接线与中心封印不可见；发现后才允许微弱后缘，命中计时文字、状态文字或主按钮的体积自动关闭。
- `QA-GEO-001`：100 关在 `1440×900`、`768×1024`、`390×844`、`360×800` 的可达、横向 containment 与保护区门通过；`590×698`、`734×876` 的短屏门通过。
- 精度证据：reduced-motion 冻结状态下，100 关可测锚点的 X/Y/宽/高与真实对象 DOM 几何最大允许误差 `0.11px`，测试通过。
- 行为证据：081 双半环闭合 `<1px`、running 解锁不重启计时、stopped 冻结当前帧、空间层 on/off 键盘结果等价、reduced-motion 与 WebKit 路径通过。
- 完整评审文件：52 个实际执行用例通过，32 个按浏览器项目条件跳过；单元/组件 680 个测试通过；lint、typecheck、生产 build 和 Impeccable detector 通过。
- 保持未验证：`UNVERIFIED_HUMAN`、`UNVERIFIED_DEVICE`。本记录不是正式游戏替换、发布、真人难度或真实设备审美证明。
