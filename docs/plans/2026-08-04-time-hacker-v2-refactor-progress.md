# Time Hacker V2 改造进度与交接

> 更新时间：2026-08-11
>
> 当前阶段：逐关设计保真重构完成；001–100 工程验收通过，进入全量回归与发布前检查
>
> 仓库：`E:\Projects\timehacker` / `main`

> **2026-08-09 纠正说明：** 此文档此前把“100 个配置可渲染、22 类控制器可触发”误记为“001–100 生产实现完成”。源码复核与实机截图证明，多数关卡被压缩为通用模板，未忠实执行逐关场景、发现和破解合同。原第 2、3、6 节只保留为失败实现的历史记录，不再作为完成证据。当前状态以《[逐关实施与验收台账](./2026-08-09-time-hacker-v2-sequential-implementation-log.md)》为准。

## 1. 当前结论

Time Hacker V2 已从旧版通用三物件谜题正式切换到根路由 `/`。正式首页继续遵守 `docs/DESIGN.md`：左上品牌、右上默认关闭菜单、当前关整页场景、秒表、一个主按钮和简洁结果；语言、模式、难度、三级提示、进度、作弊收藏、排行、玩家资料、昵称和重置继续隐藏在右侧菜单。

本次完成的是“100 关生产代码与技术验收”，不是“100 关真人可玩性已验证”。当前找不到未知答案玩家，真人盲测按 Goal 明确延期；不得用自动化结果替代可推理性、趣味性和首次发现体验的真人证据。

## 2. 100 关实现状态

- 001–100 编号连续，100 个 slug 唯一，并与现有 `CheatMethod` 数据库身份一一对应。
- `src/game/v2-levels.generated.ts` 是从设计圣经和多样性矩阵生成的生产注册表；每关包含中英标题、章节、控制器、独立视觉标记、发现、破解、反馈、跨端和验收契约。
- `src/components/v2-puzzle-scene.tsx` 使用 22 个显式控制器家族；switch 穷尽类型，没有 generic fallback。
- 每关具有独立视觉签名，不再使用统一三个物体换颜色/坐标，也没有统一小星星、问号入口、任务弹窗、答案输入框或步骤计数器。
- 001–012 有完整浏览器关键路径；001、003、012、040、069、100 有桌面与 360px 手机截图证据。
- 合理操作立即触发视觉反馈；破解后发出 `V2_PUZZLE_DISCOVERED` 与 `V2_PUZZLE_ARMED`，服务端仍以分配的稳定 slug 校验结果。

## 3. 控制器覆盖

| 控制器 | 关卡数 | 代表关 |
| --- | ---: | --- |
| corner-repair | 1 | 001 |
| patient-hold | 7 | 002、011、012、028 |
| word-shift | 1 | 003 |
| shadow-sort | 5 | 004、009、023 |
| light-drag | 4 | 005、057、075 |
| trace | 4 | 006、049、063、069 |
| frame-drag | 2 | 007、078 |
| layer-stack | 13 | 008、034、037、039 |
| fold | 10 | 010、030、051、052 |
| wave-align | 2 | 013、099 |
| coupled-drag | 4 | 014、054、081、097 |
| flip | 4 | 015、017、032、076 |
| rotate | 6 | 016、019、033、071 |
| resize | 3 | 018、031、089 |
| focus-route | 5 | 020、043、044、045 |
| rhythm | 4 | 021、022、024、025 |
| shared-control | 14 | 026、029、035、036 |
| orbit | 5 | 027、041、059、068 |
| edge-route | 1 | 038 |
| cover-return | 3 | 040、084、085 |
| wheel-echo | 1 | 067 |
| constellation | 1 | 100 |

共享控制器只复用输入与反馈基础设施。关卡自己的场景契约、视觉标记、发现规则、破解规则和认知转变仍由注册表逐关定义；不可忠实共享的机制使用专用控制器。

## 4. 统一游戏规则

未破解时为普通计时。破解后计时仍正常前进到 `9.50`；此后每个真实秒只增加 `0.10` 显示秒；`10.00` 连续保持 3 秒，玩家仍必须亲自按停止。所有秒表、误差和分享卡片统一显示两位小数。该着陆区规则于 2026-08-27 经产品负责人根据反应时间实测显式修订。

右侧菜单提供三级提示：观察方向、因果方向、明确答案。摄像头、传感器、切换标签页等权限或页面外能力不得成为唯一解；生产控制器保留页面内、触摸或键盘替代路线。

## 5. 数据库结论

2026-08-09 初次执行只读 `pnpm db:check`：

```json
{"cheats":100,"codeDefinitions":100,"slugMappingComplete":true,"missing":[],"unexpected":[],"users":15,"games":3,"unlocks":1,"puzzleScenes":100}
```

结论：

- 本次不需要 Prisma schema migration。
- 需要同步 100 条 `CheatMethod` 配置数据，但不需要 Prisma schema migration。
- 每条记录保留稳定 slug 和数据库 UUID；`pnpm db:sync-catalog` 仅通过 `INSERT ... ON CONFLICT (slug) DO UPDATE` 更新名称、文案、难度、分类、发现/破解配置与计时效果，不删除记录，也不改写已有玩家关系。
- `triggerConfig.v2Level` 保存完整 V2 关卡元数据并带 `schemaVersion: 2`；旧 `triggerConfig.puzzleScene` 暂时保留，保证数据库同步到 PM2 切换期间旧进程仍可兼容。
- `deploy.sh` 先完成全部无写入验收并准备、验证 staging 运行包，再执行幂等目录同步，并用 `db:check` 对 100 关的所有同步字段逐项严格比对，随后立即切换运行目录与 PM2；校验失败时不会切换运行版本。配置无差异时 upsert 不更新行或刷新 `updatedAt`。
- 默认 `verify` 和 E2E 仍不写共享数据库。`pnpm test:integration`、`pnpm test:e2e:database`、`pnpm db:migrate` 只允许在明确隔离或单独批准的数据库运行。

2026-08-09 已执行一次 `pnpm db:sync-catalog`，随后严格检查结果为：

```json
{"cheats":100,"codeDefinitions":100,"slugMappingComplete":true,"catalogSynchronized":true,"missing":[],"unexpected":[],"mismatches":[],"users":15,"games":3,"unlocks":1,"puzzleScenes":100,"v2Levels":100}
```

同步前后 100 条 slug→UUID 映射的 SHA-256 摘要均为 `6c7cd6eda874bac89933500fd223d8a48cc218b6633ef809ada4830df6781e06`，用户、成绩、解锁计数也分别保持 15、3、1。

## 6. 已通过的技术验收

| 命令/检查 | 结果 |
| --- | --- |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm test` | 20 文件、614 项通过，其中逐关组件合同 504 项 |
| `pnpm test:integration:safe` | 1 文件、3 项通过，无数据库写入 |
| `pnpm build` | Next.js 生产构建通过 |
| `pnpm db:sync-catalog` + `pnpm db:check` | 2026-08-09 已完成 100 关同步；2026-08-11 经 SSH 隧道只读复核：100 条目录、100 个代码定义、100 个谜题场景与 100 个 V2 关卡全部同步，缺失、意外项和字段差异均为 0，无需再次写入 |
| 完整 Playwright | 生产构建服务连续执行 630 个跨项目项：210 通过、420 条件跳过、0 失败；001–100 均在 `desktop-1440` 与 `mobile-390` 分别通过专属真实交互合同 |
| 100 关桌面遍历 | 100/100 无 fallback、溢出或主按钮拦截 |
| 100 关跨端稳定布局审计 | 2026-08-11 在 1536×800、1440×900、390×844 三种视口逐关检查 300 个组合；发现并修复 003、010、011 的短桌面侧边场景及 028、036 的手机场景，修复后操作元素均未离开视口或遮挡挑战标题、计时读数、主按钮 |
| 受影响关卡真实交互复测 | 003、010、011、028、036 在 `desktop-1440` 与 `mobile-390` 共 10/10 通过，解谜路线与 ARMED 结果未改变 |
| 001–012 关键路径 | 12/12 通过 |
| 代表关视觉审计 | 001、003、012、040、069、100 在 1440 与 360 视口 2/2 通过 |
| 响应式/浏览器 | 完整页面用户旅程在 1440、768、390、360、reduced-motion、WebKit 6/6 通过 |
| 可访问性 | 无 serious/critical Axe 违规；键盘与焦点路径通过 |

代表截图位于本地 `artifacts/screenshots/v2-production/`，作为验收产物不提交 Git。

旧版“22 类通用控制器快捷到 ARMED”聚合测试已明确跳过：它依赖 `Interactive scene piece`、瞬时 `V` 等已被逐关设计保真实现淘汰的统一入口。其验收责任由 100 个专属组件合同与逐关桌面/手机真实浏览器路径承担，不再为通过旧脚本而恢复通用玩法。Playwright 改用生产构建服务后，完整 `pnpm test:e2e` 已形成一次性汇总并通过；420 个跳过项来自项目条件筛选及上述已淘汰聚合测试，不计作通过。

## 7. 人工部署步骤

本任务不自动部署。服务器继续使用：源码 `/data/claude_project/timehacker`、运行目录 `/data/prod/timehacker`、PM2 应用 `timehacker`、端口 `3008`、域名 `timehacker.hihongrun.com`。

1. 登录服务器并更新源码：

   ```bash
   cd /data/claude_project/timehacker
   git status --short
   git pull --ff-only origin main
   ```

2. 确认 `/data/prod/timehacker/.env.production` 存在。不要在源码目录创建 `.env.local`：

   ```env
   DATABASE_URL="postgresql://timehacker:生产密码@localhost:5432/timehacker"
   PORT=3008
   HOSTNAME=127.0.0.1
   NODE_ENV=production
   ```

3. 执行部署脚本。脚本会安装锁定依赖、静态/单元验证、构建、安全集成、准备并验证 staging 运行包、幂等同步 100 关数据库配置、逐字段严格检查、立即切换 PM2、健康检查和失败回滚；不会执行 schema migration、删除目录记录或改写关卡 UUID：

   ```bash
   cd /data/claude_project/timehacker
   bash deploy.sh
   ```

4. 若 Nginx 尚未安装本项目配置，再执行；已有配置且未变化则无需重复复制：

   ```bash
   sudo cp docs/nginx-timehacker.conf /etc/nginx/conf.d/timehacker.conf
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. 验证运行状态：

   ```bash
   pm2 status timehacker
   pm2 logs timehacker --lines 100 --nostream
   curl --fail --silent http://127.0.0.1:3008/ > /dev/null
   curl --fail --silent https://timehacker.hihongrun.com/ > /dev/null
   ```

## 8. 剩余风险与停止边界

- 未完成：3–5 名未知答案玩家的首次发现、提示率、完成率、趣味性和成就感盲测；物理手机触摸手感也仍需人工体验。
- 已完成的自动化证明代码路径、跨端技术可达性、视觉边界与回归安全，不证明玩家无需读答案就能推理出 100 关。
- 部署后先人工抽测 001、003、012、040、069、100，再决定是否对外逐步放量；不因代码已完成就宣称全部 100 关商业验证通过。
- 后续只修复硬性失败。纯动画、颜色或措辞还有提升空间时记录观察，不继续无限重构。
