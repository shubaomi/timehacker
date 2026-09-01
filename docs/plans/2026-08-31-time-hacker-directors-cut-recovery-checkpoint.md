# Time Hacker Director's Cut 恢复 checkpoint

> 保存时间：2026-08-31（应用重启前）
>
> 工作区：`E:\Projects\timehacker`
>
> 分支：`main`
>
> HEAD：`357992951c254dd3433140ace5c219036741ae73`
>
> 远端：`origin = git@github.com:shubaomi/timehacker.git`

## 当前目标

以兼容方式把 Time Hacker 重构为更有思考空间、更高难度和更强可玩性的浏览器原生规则破坏益智游戏；保留 Legacy 100、SOFT_LAUNCH 12、计时/判定/数据库/历史玩家合同，并把空间视觉限制为正式状态的单向因果反馈层。

## 本轮非目标

- 不部署、不创建 Release 或 PR。
- 不直接覆盖 Legacy 100 或冻结的 SOFT_LAUNCH 顺序。
- 不在设计冻结前修改正式状态机、计时器、API、数据库和分析语义。
- 不把自动测试冒充未知答案玩家的趣味性/商业验证。

## 已完成

1. 只读复核当前目录、100 关生成注册表、SOFT_LAUNCH 路径、既有 100 关设计索引和测试脚本。
2. 确认旧 100 关纸面规则已有高级素材；主要问题是实现/呈现压缩假设空间，而不是所有规则都需要增加机械步骤。
3. 冻结兼容重构方案：新增 36 关 Director's Cut（6 章 × 6 关），内部映射稳定 Legacy ID/slug；Legacy 100 与 SOFT_LAUNCH 12 保留。
4. 写入产品与重构合同：
   - `docs/plans/2026-08-31-time-hacker-directors-cut-product-contract.md`
5. 写入全部 36 关逐关规格：
   - `docs/plans/2026-08-31-time-hacker-directors-cut-level-specs-001-012.md`
   - `docs/plans/2026-08-31-time-hacker-directors-cut-level-specs-013-024.md`
   - `docs/plans/2026-08-31-time-hacker-directors-cut-level-specs-025-036.md`
6. 每关已包含 Legacy 映射、第一屏异常、合理假设、推理链、负例反馈、解法宽容、H0-H3 提示、空间反馈、输入等价和可观察验收。

## 已完成验证

- PowerShell 结构检查：3 个逐关规格文件。
- `TH-DC` 标题：36 个。
- 唯一 `TH-DC` 标题：36 个。
- 首尾连续边界：`TH-DC-001` 到 `TH-DC-036`。
- Git 根/分支/HEAD 已重新核对。

当前只验证了文档结构；未运行 lint、typecheck、unit、component、build、Playwright、真实移动设备、WebKit 或未知答案玩家盲测，因为代码接线尚未开始。

## 工作区保护

工作区在本轮开始前已有大量未提交的空间原型、修正、截图和测试文件。它们全部属于现有资产，本轮没有回退、清理、提交或推送。

本轮新增且尚未提交的文件仅为上述 4 份冻结文档和本 checkpoint。正式 diff 仍与用户既有未提交工作混合，后续必须按精确文件范围操作，禁止 `git add -A`。

## 剩余工作（按顺序）

1. 新增 `src/game/director-campaign.ts`：36 项纯数据注册表，映射 Legacy ID/slug，包含章节、角色、假设、推理步、提示与验收元数据；不接正式页面。
2. 新增 `tests/unit/director-campaign.test.ts`：验证 36 唯一项、6×6、Legacy 映射、认知下限、H0/H1 不泄题、FULL/100 与 SOFT_LAUNCH/12 不变。
3. 运行聚焦单测、lint/typecheck；修复数据层问题。
4. 只在默认关闭的隔离路径实现第一章垂直切片；在正式页面接线前重新检查当前脏文件重叠。
5. 完成桌面 1440、移动 360/390、平板、键盘、触控、WebKit、reduced-motion、Canvas 关闭和 tab-hidden 暂停验证。
6. 形成外部未知答案玩家盲测计划；在真实证据前不宣称商业难度/留存已验证。

## 下一条准确操作

重启恢复后先执行只读检查：

```powershell
git status --short
Get-ChildItem -LiteralPath docs/plans -Filter '2026-08-31-time-hacker-directors-cut-*.md'
```

确认 5 份文件仍在且工作区没有意外变化后，使用 `apply_patch` 新增 `src/game/director-campaign.ts` 和聚焦测试；不要修改正式状态机或数据库。
