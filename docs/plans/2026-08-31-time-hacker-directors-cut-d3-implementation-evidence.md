# Time Hacker Director's Cut D3 实现与验证证据

> 状态：`D3_AUTOMATED_ACCEPTED__BLIND_TEST_PENDING`
>
> 日期：2026-08-31
>
> 范围：`TH-DC-001..036`
>
> 发布状态：仅默认关闭的本地隔离路由；未接正式首页、未部署、未创建 PR/Release。
>
> 认知完成度以 `2026-08-31-time-hacker-directors-cut-36-level-cognitive-audit.md` 与 D3.2-D3.5 冻结合同为准；当前只证明自动合同通过，真人盲测仍是下一门。

## 1. 事实来源

1. `2026-08-31-time-hacker-directors-cut-product-contract.md`
2. 三份 `2026-08-31-time-hacker-directors-cut-level-specs-001-036.md`
3. `src/game/director-campaign.ts` 的冻结 36 关映射
4. 现有稳定 `V2PuzzleScene` controller 与 Legacy ID/slug

实现没有重编号、迁移或覆盖 Legacy 100 与 SOFT_LAUNCH 12。Director 使用新的公开序号与追踪键，内部复用稳定 Legacy 场景语法。

## 2. D3 实现内容

- `/playtest-v2/director?level=1..36` 可在本地隔离打开全部 36 关。
- 6 章标题、公开序号、追踪键、Legacy controller 和 H1-H3 提示由冻结注册表驱动。
- HTML 计时数字、开始/停止/重试/下一关和结果保持语义控件；停止后先提交判定，再进入视觉结果状态。
- Canvas 保持 `aria-hidden`、`pointer-events:none`，可完全关闭；关闭后关卡解锁与计时路径不变。
- 第 1 关旧的“双亮黄色候选”方案已被 D3.1 否决。当前改为 Director 专用独立控制器：“检查缺口证据 → 修复纸面”；共享 Legacy `V2PuzzleScene` 不变。
- 第 2-36 关均先完成独立证据序列；证据成立后才挂载共享最终操作场景，避免直接动作捷径与隐藏布局测量污染。
- 初始证据层不显示动作答案、箭头、虚线投放框或持续高亮；短反馈只表达可观察关系。
- 第 30 关在本关一次重置内保留 session-only 留影，换关清理。
- 第 31 关复用现有语义化菜单纸层，并提供键盘等价路径；不改变正式菜单。
- Director 桌面获得独立横向安全区；第 7/22 关使用 Director-only 局部偏移。移动端标题和所有 puzzle control 使用正常滚动与可达安全区。

## 3. 追踪矩阵

| 合同 | 实现 | 自动证据 |
| --- | --- | --- |
| TH-DC-A01..A03 | 36 项、6×6、唯一 Legacy 映射，旧发行轨不变 | `tests/unit/director-campaign.test.ts` |
| TH-DC-A04..A07 | evidence/hypotheses/reasoning/feedback/H0-H3 与已知答案窗口 | `tests/unit/director-campaign.test.ts`；三份逐关规格 |
| TH-DC-A08 | Canvas 可关闭、键盘仍可解锁；reduced-motion 保留结果 | component + Playwright |
| TH-DC-A09 | stopped 同步出现，result 在后续任务进入 success/miss | `director-chapter-lab.test.tsx` |
| TH-DC-A10 | 36 关全部可交互控件不越界、不压主按钮、不进入计时卡 | 1440、360、390、768、WebKit、reduced-motion Playwright |
| TH-DC-A11 | Director 只在隔离路由和可选 props 接线 | diff、完整回归、生产构建 |
| TH-DC-A12 | 外部未知答案盲测 | **未验证；仍是 D4 门禁** |

## 4. D3 技术基线的历史验证结果

> 以下数字是 D3.1 纠偏前的技术基线，不证明当前 36 关认知重构完成；D3.1 的新验证证据在纠偏完成后追加。

- `pnpm test`：34 files / 695 tests passed。
- Director 聚焦：2 files / 15 tests passed。
- `pnpm lint`：通过；只有 Babel 对超 500KB 既有场景文件的非失败提示。
- `pnpm typecheck`：通过。
- `pnpm build`：通过；隔离路由与正式路由共同编译。
- Playwright 36 关几何扫描：desktop 1440、mobile 360、mobile 390、tablet 768、reduced-motion、WebKit 全部通过。
- reduced-motion：5 passed / 1 screenshot-only skipped。
- WebKit：4 passed / 2 project-specific skipped。
- 最终视觉截图：`artifacts/screenshots/director-campaign/` 的 desktop/mobile/tablet 第 1 与第 36 关。
- Impeccable 检测器：发现一处粗侧边提示卡告警；已改为克制的 1px 纸张上沿色差。

## 5. D3.2-D3.5 最终自动验收（2026-08-31）

- 聚焦 ESLint：通过。
- `pnpm typecheck`：通过。
- Director unit/component：3 files / 19 tests passed。
- 完整非 E2E：35 files / 699 tests passed。
- `pnpm build`：通过；正式路由与三个 playtest 路由共同编译。
- 双阶段几何：desktop 1440、mobile 360、mobile 390、tablet 768、reduced-motion、WebKit 的 001-036 全部通过。
- 真实输入：desktop 的 002-036 全证据序列 3/3 通过；WebKit 的语义键盘、Canvas 关闭和计时 miss/retry 3/3 通过。
- reduced-motion 静态反馈：1/1 通过，无持续动画。
- 最终截图：desktop/mobile-390/tablet-768 均生成 001 idle、036 evidence、036 final。
- 视觉抽查：未发现计时卡遮挡、装置截断、明显答案文案或品牌颜色漂移。

## 6. 未验证与禁止外推

自动化证明结构、兼容、可达性、基本交互与构建，不证明未知答案玩家会认为每关公平、有趣、足够难，也不证明留存、付费或全球传播。D4 仍需 8-12 名不知道答案的目标玩家，按章记录首解时长、假设、提示、放弃点与顿悟评价。

在 D4 和新的用户批准之前：

- 不切换正式默认路径；
- 不写入 Director 正式进度或分析；
- 不修改数据库；
- 不部署、不创建 PR/Release。