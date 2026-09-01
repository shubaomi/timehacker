# Time Hacker 002 / 008 空间试点实施规格

> 状态：产品负责人已批准本地正式实现，并在代码、自动验证与截图复核完成后明确批准 002/008 的视觉体验和单向空间层架构。该批准关闭本地试点门，但不覆盖提交、推送、部署、Release、PR 或扩展到其他关卡。

## 1. 为什么是 002 与 008

- `002 breath-gap` 验证最克制的 3D 是否能服务“不操作也是操作”，同时不把答案做成提示按钮。
- `008 relay-sandwich` 验证最明显的网页级空间层级、透明材质、折射与遮挡，且不把三层组装退化为统一拖拽。
- 两关共同覆盖等待、连续长按、三层拖放、错误顺序、键盘、触摸、移动端和 reduced-motion，能在较小范围内检验空间升级是否真的与玩法融合。

现有 001/043/081 本地正式试点架构继续复用；不建立第二套开关、状态机或 Canvas 生命周期。

## 2. 事实来源与不可改变项

优先级：用户不可变合同 → `docs/DESIGN.md` → `src/game/v2-levels.generated.ts` → `src/components/v2-puzzle-scene.tsx` → 当前自动测试。

### 002 正式合同

1. 普通鼠标移动不算打扰。
2. pointer down、按键、滚轮、touch 等有意义输入将安静窗口重置为 0。
3. 前台安静 1 秒进入呼吸，累计前台安静 2.5 秒才显示气泡。
4. 页面隐藏时暂停剩余安静时间，返回不能直接完成。
5. 气泡出现后连续长按 1.2 秒完成；650ms 等短按无效，气泡仍可立即重试。
6. pointer cancel、窗口 blur、按键释放及卸载取消本次长按；页面隐藏继续按当前浏览器的 blur 路径处理，不另行发明完成或取消规则。

### 008 正式合同

1. 三个独立语义按钮仍是左壳、透明中层和右壳。
2. 移动透明中层超过 12px 才产生发现反馈并使两壳回应。
3. 外壳先进入中心必须在 180ms 克制弹回，不能锁定或完成。
4. 透明中层先置中后，左右外壳才可分别锁定；正确一侧在另一侧失败时继续保留。
5. 两壳均锁定时才调用现有 `onArm`；视觉接触、折射完成或动画结束都不能调用它。
6. pointer、touch 和现有键盘方向/Enter/Space 路线保持不变。

### 共同不可改变项

- `src/game/timer.ts`、`effects.ts`、`cheats.ts`、`progress.ts`、`soft-launch.ts`、生成关卡定义、API、server、Prisma、分析合同、部署脚本与路由。
- 开始、停止、重试、结果与下一关顺序；9.50 后离散慢速、10.00 三秒平台、判定窗口、分数和数据。
- 按钮名称、测试 ID、分析事件、字段、匿名数据语义、FULL/100 和 SOFT_LAUNCH 顺序。

## 3. 可追踪要求

| ID | 要求 | 预期文件 | 验证证据 |
| --- | --- | --- | --- |
| SX-001 | 继续使用现有默认关闭 `NEXT_PUBLIC_TIME_HACKER_SPATIAL_PILOT` | `.env.example`、`src/game/spatial-pilot.ts` | 默认构建无新增空间节点或资源 |
| SX-002 | 只在批准后把 002/008 加入现有白名单 | `src/game/spatial-pilot.ts` | 白名单单元测试为 5 个精确 slug |
| SX-003 | 现有 GameStatus 单向映射保持不变 | `src/game/spatial-pilot.ts`、`time-hacker-app.tsx` | 状态映射单元测试；stop 网络顺序 E2E |
| SX-004 | Canvas/WebGL 不可交互、不可聚焦、对无障碍隐藏 | 空间视觉组件 | `aria-hidden`、无 `tabindex`、computed pointer-events |
| SX-005 | 002 的安静和长按阈值、取消条件完全不变 | `v2-puzzle-scene.tsx` 只允许装饰节点/CSS | 现有正反例 on/off 全部通过 |
| SX-006 | 002 初始不强化气泡位置，不提前显示可按目标 | 002 样式与截图 | 0ms、1s、2.5s 三状态截图和 DOM 断言 |
| SX-007 | 008 的中层先行和左右壳锁定顺序完全不变 | 008 样式与可选装饰节点 | 外壳先放、错误键、单侧保留、完整顺序正反例 |
| SX-008 | 008 的 3D 材质不制造第二套可点击物或重复圆壳 | 008 样式/光学叶 | 元素数量、命中和完成几何断言 |
| SX-009 | running、stopped、success、miss 只影响时间场 | `spatial-time-field.tsx` | 开关 on/off 相同请求、结果、分析事件 |
| SX-010 | reduced-motion、移动和 WebGL 失败均保留完整规则证据 | CSS/Canvas/WebGL fallback | 五浏览器项目、强制 context failure、reduced 截图 |
| SX-011 | 隐藏、离屏、非活跃、BFCache 时暂停视觉循环 | 空间叶生命周期 | RAF 取消/恢复单元与浏览器检查 |
| SX-012 | 正式实现只触碰批准文件，保留其他未提交工作 | Git 审计 | 精确 diff、`git diff --check`、状态报告 |

## 4. 架构冻结

```text
现有 GameStatus + armed + activeRoundCheat.slug
                     |
                     v  只读映射
        SpatialTimeField(enabled, slug, phase, armed)
                     |
            Canvas2D 公共时间场

现有 002/008 控制器内部状态
          |
          +--> 原语义 HTML、原事件、原 onArm
          |
          +--> 同一 DOM 的 CSS 透视/正背/阴影
          +--> aria-hidden 装饰厚度或光学叶
```

- 不新增从空间视觉层回到 `TimeHackerApp` 或控制器的 callback。
- 不用 React state 保存逐帧粒子、鼠标位置、光线或动画值。
- 002/008 的可操作 HTML 自身获得深度；不在 Canvas 复制一个看似可操作的机关。
- 公共 Canvas 继续由现有动态 import 延迟加载。若 008 增加 WebGL 光学叶，它必须是第二个更小的 scene-local client leaf，等核心按钮可交互后再加载。
- WebGL 只绘制透明中层的折射、壳体内侧的光学回声和 success 短涟漪。不得查询或记录 GPU renderer、设备指纹、指针轨迹或输入历史。
- WebGL 初始化失败、context lost、移动端、reduced-motion 或页面隐藏时立即退回 CSS 3D + Canvas2D，不显示错误，不影响关卡。

## 5. 002 空间与状态规格

### 5.1 空间结构

- 两片现有 `.breathGapLeaf` 是同一折叠薄膜的左右瓣，使用 `transform-style: preserve-3d`、纸背色、1–3px 克制厚度和真实接缝阴影。
- closed 状态像被输入压扁的纸膜，不能出现按钮轮廓、外发光或目标圆。
- breathing 状态只把两瓣从相邻深度缓慢分离，运动幅度不能让玩家误以为已可点击。
- revealed 后，现有语义气泡从接缝深层升到可操作平面；气泡使用透明高光和内折射，但其真实命中区、label 与焦点轮廓不变。
- holding 只表现膜面受压、后层光线聚拢和气泡体积缓慢缩小。1.2 秒结束前不得出现成功锁定。
- releasedEarly 只做一次不超过 180ms 的回弹，气泡不消失、不增加等待。

### 5.2 正式状态映射

| 状态 | 视觉 |
| --- | --- |
| READY closed | 纸膜压扁，接缝漏一条温暖窄光；无可点击提示 |
| READY breathing | 1 秒后出现一次低幅度膜面呼吸；reduced-motion 只切换为较开静态状态 |
| READY revealed | 气泡升到语义按钮平面，纸膜留在后层 |
| READY holding | 压力沿两瓣传到共同接缝，进度不显示数字或圆环 |
| READY armed | 气泡成为稳定透镜；名称与既有 armed 文案按原规则出现 |
| RUNNING | 正式谜题场景仍按当前行为退出，公共时间场保留“锁定透镜”轮廓；不继续长按动画 |
| STOPPED | 判定请求之后冻结上一帧透镜与时间环 |
| SUCCESS | 600–800ms 内层环锁定后停止循环，不阻塞下一关 |
| MISS | 250ms 内克制回弹，重试按钮立即保持可用 |

### 5.3 002 禁止项

- 气泡在 2.5 秒前可见、发光、投影或拥有明显空位。
- 空间呼吸替代正式 2.5 秒前台安静计时。
- 视觉动画结束直接调用 `onDiscover` 或 `onArm`。
- running 时继续计算或恢复 READY 的安静/长按进度。

## 6. 008 空间与状态规格

### 6.1 空间结构

- 三个现有语义按钮是实际 3D 物件：透明中层为 z=0 的薄折射片，左右珊瑚壳分别从 z=+1 和 z=-1 的斜侧进入共享圆心。
- 壳体使用内外双材质：外表保持珊瑚红纸感，内缘使用浅蓝和薄荷反射，不使用金属黑、霓虹或过量外发光。
- 透明中层移动超过正式 12px 后，两壳只产生一次材质回声和轻微朝向变化，明确“它们共享中层”，不自动靠近中心。
- 中层进入现有目标区后才稳定在夹层；其折射只作用于 aria-hidden 光学图案，数字和按钮文本不被扭曲。
- 外壳先放的 180ms reject 使用沿原路退回的深度反弹，不增加红色报错、惩罚或等待。
- 一侧正确锁定后保持其深度和位置；另一侧失败不能使已锁侧松开。
- 完成后左右半圆在同一共享中心闭合，透明片仍位于中间，不能只画一个新圆覆盖三件正式物件。

### 6.2 正式状态映射

| 状态 | 视觉 |
| --- | --- |
| READY idle | 三层在三个清楚可辨的深度悬挂，保持全部按钮可达 |
| sheet moving | 中层折射背景纸纹，两壳产生材质回声但不位移 |
| sheet centered | 中层与中心薄光轴锁定，左右保留各自开放入口 |
| one shell locked | 正确一侧保持，未完成一侧仍可操作；无成功涟漪 |
| rejected | 当前错误壳沿 z 轴退回，180ms 后立即可再试 |
| READY armed | 三层形成一枚有夹层厚度的完整圆芯 |
| RUNNING | 公共时间场改为穿过圆芯的多层环带；HTML 数字在最上层保持锐利 |
| STOPPED | 正式判定提交后冻结当前折射帧 |
| SUCCESS | 圆芯短促锁定并释放一次内向到外向的折射波 |
| MISS | 双壳不解体，只让外围时间环克制回弹，立即允许重试 |

### 6.3 WebGL 可选光学叶

- 仅桌面非 reduced-motion 路径尝试，移动端直接使用 CSS 3D + Canvas2D。
- 不加载纹理文件、GLB、FBX、HDR 或后处理包；使用程序化平面、环和轻量 fragment shader。
- 目标上限：8 draw calls、20k triangles、DPR 1.5、无 bloom、无景深后处理、无自由相机、无鼠标视差。
- Canvas 位于语义 HTML 下方，`aria-hidden`、无 `tabindex`、`pointer-events:none`。
- context lost 后不重建循环超过一次；失败后保持 CSS fallback 至本次页面结束。

### 6.4 008 禁止项

- 把三件物体都拖进一个明显虚线框。
- 用 WebGL mesh 替换正式 HTML 按钮或接收 pointer raycast。
- 因折射造成数字、小数点、结果、提示或按钮模糊。
- completion 动画反向触发 `onArm`，或视觉圆已经闭合但正式状态尚未完成。

## 7. 提示与发现纪律

- 继续使用现有 hintLevel 与正式文案，不由空间层生成新提示。
- 初始不显示操作说明、步骤列表、箭头、目标框或“长按/先放中层”等答案。
- 002 的第一层证据是“输入使纸叶闭合”，008 的第一层证据是“移动透明片会让两壳共同回应”。
- 只有正式二、三级提示可以逐渐接近操作方法；空间材质永远不能比文案更早泄题。

## 8. 响应式与降级

| 环境 | 002 | 008 |
| --- | --- | --- |
| 1440×900 | 完整膜面深度和透镜 | CSS 3D + 可选 WebGL 折射 |
| 734×876 / 平板 | 降低透视角，不改变纸叶位置 | CSS 3D，降低折射层数，三按钮全部在视口 |
| 590×698 短屏 | 自然纵向滚动，固定视觉层不裁切气泡 | 机关位于文档流完整可滚到，不建立内部滚动 |
| 390×844 / 360×800 | CSS 2.5D + Canvas DPR≤1.25 | 禁用 WebGL，保留三层纸边、正背和锁定关系 |
| reduced-motion | closed/breathing/revealed 离散静态状态 | 三个固定 z 层与最终夹层，无漂移、旋转或折射波 |
| Canvas/WebGL 不可用 | 完整 HTML/CSS 规则与反馈 | 完整 HTML/CSS 规则与反馈 |

## 9. 验证矩阵

### 9.1 规则等价

分别在开关 off/on 下执行相同输入序列并比较：

- 002：普通 mousemove 不重置；2 秒后有意义输入重置；隐藏时间不累计；650ms 短按失败；1.2 秒连续长按成功；blur/pointercancel 取消。
- 008：外壳先放失败；中层移动触发双壳回应；中层先锁；左侧成功后右侧错误不清左侧；正确右侧完成；错误方向键失败。
- 每条序列比较 `onDiscover`/`onArm` 次数、armed 状态、正式 DOM 数据属性、开始/停止请求体、结果、下一关和匿名事件序列。

### 9.2 浏览器与视觉

- Chromium desktop 1440×900。
- Chromium mobile 390×844 与 360×800。
- 窄平板 734×876。
- Windows 125% 缩放对应 590×698 短视口，验证自然滚动后的实际解锁。
- WebKit desktop 和 mobile viewport。
- reduced-motion；强制 Canvas 2D 失败；强制 WebGL context lost。
- 每个项目检查：横向溢出≤1px、控制台零应用错误、axe serious/critical 为 0、主按钮和谜题按钮命中正确。

### 9.3 计时与顺序

- 视觉关闭和开启都验证未解锁纯净计时不变。
- 解锁后验证 9.50 起每真实秒走 0.10、10.00 保持三秒、平台后仍按同平均速率离开。
- 点击停止时先观察到现有 stop 请求与判定状态，再观察视觉 `stopped`；不得反序。
- success/miss 视觉不得延迟重试或进入下一关。

### 9.4 性能

- 开关关闭时不渲染空间节点；可选 WebGL chunk 不进入默认网络请求。
- 开关开启时核心开始按钮无需等待 Canvas/WebGL 初始化。
- 页面 hidden、Canvas 离屏、菜单/面板使游戏非活跃时 RAF 为 0。
- 桌面 1440×900 记录 10 秒 running 帧时间；若 p95 超过 16.7ms 或出现连续长帧，关闭 008 WebGL，保留 CSS/Canvas2D。
- 移动端不运行 008 WebGL，只审计 CSS/Canvas2D 帧率和内存稳定性。

## 10. 已批准的实现范围

本轮批准并实际触碰的范围：

- `docs/DESIGN.md`
- 本规格与 FULL/100 空间矩阵
- `src/game/spatial-pilot.ts`
- `src/components/spatial-time-field.tsx` 与样式模块
- `src/components/v2-puzzle-scene.tsx` 与样式模块，只增加 `spatialPilot` 下的装饰节点、数据呈现和 CSS 深度
- 对应单元、组件、E2E 与截图证据

可选 WebGL 光学叶本轮未实现：CSS 3D + 现有延迟 Canvas2D 已能表达三层关系，避免在首次局部试点中引入额外运行时和 context-loss 风险。

不允许修改任何玩法核心文件。若实现需要改变 002/008 的状态、阈值、事件顺序或输入所有权，立即停止并回到产品批准门。

## 11. 本地实现证据（2026-08-29）

- 白名单由 3 个精确 slug 扩展为 5 个：只新增 `breath-gap` 与 `relay-sandwich`。
- 002 只新增 `aria-hidden` 深度节点、纸叶 CSS 透视与 Canvas2D 膜面环；2.5 秒安静、1.2 秒长按、取消和发现逻辑没有改动。
- 008 只新增 `aria-hidden` 深度节点、现有三按钮的 CSS z 层与 Canvas2D 夹层环；12px 发现、180ms reject、中层先行和双壳锁定逻辑没有改动。
- `pnpm lint`、`pnpm typecheck`、`pnpm build` 通过；`pnpm test` 为 29 个文件、653 项通过。
- 默认开启的定向 E2E 在 1440×900、360×800、390×844、734×876、590×698、reduced-motion、WebKit 桌面及 WebKit 390×844 中通过；包括真实完成 002/008、HTML/Canvas 命中、完成几何、横向溢出与 axe serious/critical 检查。
- 默认关闭构建的独立 E2E 通过，空间 Canvas 与试点深度节点均不存在。
- 截图证据位于 `artifacts/screenshots/spatial-pilot/`，包含 idle、armed、success 和短屏/WebKit 手机状态。
- 组件级 Canvas 2D `getContext()` 返回 `null` 的降级路径已验证；浏览器级强制 context failure、真实物理手机触摸/性能、生产环境均未验证，不能由上述自动证据替代。
- WebKit 的规则路径、命中、几何、滚动和无障碍检查均通过；产品负责人已批准试点整体视觉方向，但当前 WebKit 截图中的计时数字呈现为空心字形，与 Chromium 的实心字形不同，仍作为生产前待处理的浏览器视觉差异保留，不能由本次批准自动豁免。

## 12. 回滚与批准门

- 单一现有环境开关继续默认关闭。关闭后 002/008 的 DOM、操作、请求、结果和事件应与当前 HEAD 等价。
- 出现计时差异、指针拦截、答案泄露、WebKit 问题、移动性能退化、reduced-motion 失败或真实用户无法理解层级时，关闭视觉开关即可回滚；不涉及数据迁移。
- 本轮本地实现、验证和视觉体验批准已完成，继续停在扩展门。后续可以编写分阶段扩展设计，但提交、推送、部署、Release、PR 与把空间层扩展到其他关卡仍需各自明确授权。
