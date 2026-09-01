# Time Hacker 空间视觉 Batch A 实施与验收记录

> 状态：本地实现及自动验证完成，等待产品负责人视觉验收。
>
> 范围：`003 slow-command`、`014 corner-cross`、`044 focus-orbit`。
>
> 明确未授权：Batch B/C、修改玩法规则、生产默认开启、提交、推送、部署、Release 或 PR。

## 1. 需求追踪

| 追踪键 | 原规则（保持不变） | 本次视觉材料 | 实现位置 | 验证 |
|---|---|---|---|---|
| TH-SX-003 | `FAST → TIME → SLOW`，第二次机械遍历后稳定 400ms；点击、划动、滚轮、上下键等价 | 四枚厚纸字模、共用排字床、字面 z 层和 `SLOW` 压印 | `v2-puzzle-scene.tsx`、`v2-puzzle-scene.module.css`、`spatial-time-field.tsx` | 单元/组件规则测试、开关命中矩形等价、全视口 E2E |
| TH-SX-014 | 双轴 35% 联动；两轴同时进入 36px 中心区；单指交替与键盘等价 | 前后纸带、纸下联动结构、中心无接缝压印 | 同上 | 单轴不完成/键盘完成、成功几何、开关命中矩形等价、全视口 E2E |
| TH-SX-044 | 轨道点击只涟漪；透镜点击或 `<16px` 移动无效；44px 目标；键盘等价 | 前置厚透镜、三层焦面、局部折射和光轴锁定 | 同上 | 无效输入与键盘路径、中心公差、开关命中矩形等价、全视口 E2E |

## 2. 架构边界

- `NEXT_PUBLIC_TIME_HACKER_SPATIAL_PILOT=1` 且 slug 位于精确白名单时才挂载空间层；默认构建不挂载 Batch A 的 Canvas 或深度 DOM。
- HTML 按钮、字模、纸带、透镜、计时数字和结果仍是唯一语义与交互层；测试 ID、事件处理器、正式 transform 和控制器阈值不因空间层改变。
- 新增深度节点全部 `aria-hidden="true"`、无焦点、无输入处理；CSS 明确 `pointer-events:none`。
- Canvas 继续 `aria-hidden="true"`、`pointer-events:none`，只读取 slug、正式阶段和已有状态；不调用 `onArm`、计时、判定、进度、API、数据库或分析函数。
- 逐帧绘制使用既有 Canvas 循环，不用 React state 跟踪粒子、鼠标或动画值；页面不可见、场景离屏或不活跃时沿用既有暂停路径。
- reduced-motion 关闭循环动画与过渡，但保留字模厚度、纸带前后层和透镜焦面等静态状态区别。

## 3. 几何细节要求

### 003

- 字模正面保持完全可读，厚度与背板仅由子层和伪元素表达；不可倾斜真实按钮或缩放其命中矩形。
- 第一次形成 `TIME` 只显示短暂对齐，不完成；第二次形成 `SLOW` 后共用排字床锁定，400ms 正式稳定窗口仍由原控制器拥有。
- 移动端四列不得横向滚动；短屏允许自然纵向展开，但不得覆盖主按钮。

### 014

- 水平带为前层、垂直带为后层；装饰联动结构必须位于纸带下方，不成为新的目标框。
- 成功时两带共享中心，不能出现重复边、错位连接线或可见裂缝；几何测试要求完成态成立。
- 视觉层不得从倾斜后的包围盒反推正式 36px 命中区。

### 044

- 透镜的真实 44px 目标和正式拖动节点保持原几何；厚度、内圈和焦面只添加在其视觉子层或不可交互装饰节点。
- idle 不发光指向目标；轨道点击只允许一次短反馈；成功时透镜、残影和目标共享光轴。
- 移动端纸板直接作为纸上光学台，不建立卡片内滚动；390×590 仍能自然滚动到完整透镜与焦面。

## 4. 验证证据

### 自动检查

- `git diff --check`：通过。
- `pnpm typecheck`：通过。
- `pnpm lint`：通过；仅输出现有超大 TSX 的 Babel deopt 提示，无 lint 错误。
- `pnpm test`：29 个文件、662 项通过。
- `pnpm test:integration:safe`：2 个文件、5 项通过。
- `pnpm build`（空间 flag 未设置）：通过；默认生产构建不包含已启用空间试点状态。

### 浏览器与响应式

同一条 E2E 在空间 flag 开启时实际完成 `001 / 002 / 003 / 008 / 014 / 043 / 044 / 081`，其中 Batch A 还在运行时将本关 `data-spatial-pilot` 临时切换开/关，比较所有正式操作控件的 `left / top / width / height`，差异上限 `0.5px`。

| 环境 | 结果 |
|---|---|
| Chromium 1440px | 通过；idle / armed / success、可访问性、无横向溢出、命中几何等价 |
| Chromium 360px / 390px | 通过；三关完整、可滚动、无横向溢出 |
| Chromium 734×876 平板 | 通过 |
| Chromium 390×590 短屏 | 通过；003 / 014 / 044 idle / armed / success 均有截图 |
| Chromium reduced-motion | 通过；规则与状态完整，循环视觉运动关闭 |
| WebKit 桌面 + 390px | 通过；完整 8 关回归与 mobile 390 共 5.7 分钟；idle / armed / success 及 mobile 机关裁切均有截图 |
| 默认关闭构建 | 通过；三关新增 Canvas/深度节点不存在 |

WebKit 首轮失败源于 E2E 在既有“运行按钮短暂 disabled”窗口内连续点击；测试改为等待按钮恢复 enabled 后再次点击，复跑通过。未修改运行按钮或计时行为。

WebKit 还会忽略 `Azeret Mono Variable` 的 `wght` 轴，导致秒表和 003 字模在自动截图中呈细描边。实现保留原字体与尺寸，先显式声明 `font-variation-settings`，再用实际引擎验证只命中 WebKit 的 `@supports (-webkit-hyphens: none)` 做小幅字重补偿；Edge/Chromium 不进入该规则。最新桌面和移动截图经独立复验后通过。

WebKit 的 full-page 截图会在拼接固定元素时保留滚动伪影。移动证据因此改为每个状态先 `scrollTo(0, 0)` 再拍真实 390×844 viewport，并额外保存 `*-armed-mechanism.png` 的机关局部；页面本身的滚动、布局和交互没有为截图修改。

截图证据位于 `artifacts/screenshots/spatial-pilot/`，文件名格式为 `<viewport>-<level>-<state>.png`。

## 5. 审美检查与已知边界

- 最新截图确认三类深度来自规则物件：003 的活字与排字床、014 的前后耦合纸带、044 的透镜与焦平面，不依赖通用背景环才能成立。
- 360/390、390×590、平板与 WebKit 未见新增裁切、横向滚动或主按钮遮挡。
- 独立代码审查最终结论为 APPROVE；独立视觉审查在 WebKit 字重和截图滚动证据修复后由 FAIL 转为 PASS。
- 非阻断润色项：014/044 mobile armed 的发现反馈与物件略有重叠，044 armed 对比度偏轻；不影响操作、状态判断或下一步，本批不继续扩大视觉改动。
- Impeccable 检测器对整个既有 `v2-puzzle-scene.module.css` 报告旧关卡中的侧边强调边框、弹跳缓动和 layout property transition；Batch A 新增块没有命中这些规则。本轮不借机重构旧 100 关样式。
- 自动浏览器证据不能代替真实手机的手感、GPU 性能与审美批准；正式启用前仍需真实设备检查。

## 6. 回滚与下一道门

- 立即回滚路径：不设置或移除 `NEXT_PUBLIC_TIME_HACKER_SPATIAL_PILOT=1`，玩法与结果保持原样。
- 代码回滚只需移除三个 slug 的白名单与其 `aria-hidden` 深度节点/绘制分支；不触碰控制器、注册表、数据库或玩家数据。
- 产品负责人应先体验并批准 Batch A 的视觉与身体感；未批准前不得开始 Batch B，也不得把 flag 改为默认开启。
