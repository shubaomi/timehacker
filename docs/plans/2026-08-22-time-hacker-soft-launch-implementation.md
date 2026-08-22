# Time Hacker：12关商业软启动验证系统实施合同

> 状态：实现与本地/数据库验收完成，等待用户手动部署应用；事实来源为 `2026-08-08-time-hacker-v2-preimplementation-audit.md` 与冻结的12关评审稿

## 1. 范围与不变量

- 既有100关代码、数据库目录、slug、UUID、成绩和解锁关系保持不变。
- 迁移前已存在的玩家属于 `FULL`，继续使用100关完整目录。
- 应用部署后首次创建的玩家属于 `SOFT_LAUNCH`，仅按冻结顺序获得12关样板。
- 软启动不加入支付、广告、订阅、体力、签到、每日任务或新谜题。
- 统计只用于验证核心循环、提示、分享和回访，不用于设备指纹或身份识别。

## 2. 冻结的12关顺序

1. `four-corner-breach`
2. `breath-gap`
3. `slow-command`
4. `relay-sandwich`
5. `corner-cross`
6. `precision-five`
7. `horizon-shift`
8. `focus-orbit`
9. `wheel-echo`
10. `tab-return`
11. `archive-figure-eight`
12. `silent-constellation`

软启动服务端必须验证“下一关”资格，客户端不能通过提交其他 slug 跳过顺序。收藏只返回这12关；完整目录和种子仍保留100条。

## 3. 假名事件合同

冻结事件：`level_view`、`first_interaction`、`puzzle_discovered`、`hint_1_open`、`hint_2_open`、`answer_open`、`puzzle_armed`、`timer_started`、`timer_stopped`、`level_completed`、`next_level`、`share_card_open`、`share_card_exported`。

- 浏览器ID、会话ID和客户端事件ID均为随机UUID。
- 30分钟无活动后创建新会话。
- 服务端根据 slug 推导软启动关号，不接受客户端关号。
- `timer_stopped` 保存 `mode`、显示成绩、`success` 与 `puzzleSolved`。
- `level_completed` 仅记录成功停表，保存 `mode` 与 `puzzleSolved`。
- `share_card_exported` 仅接受成功的 `save` 或 `copy`。
- `entrySource` 仅允许 `direct`、`share`、`unknown`；不保存完整referrer。
- 不接收任意JSON metadata，不保存IP、完整User-Agent、设备指纹、摄像头画面、手势图像或输入轨迹。
- 原始事件30天后删除；每批事件接收、部署和报告时执行索引清理，并提供独立清理命令。
- 玩家重置时删除对应浏览器ID事件，并由客户端轮换本地分析ID和会话ID。

## 4. 迁移与回滚

- 新增 `ReleaseTrack`、`PlaytestEventName`、`PlaytestEntrySource`、`PlaytestMode`、`PlaytestShareAction` 枚举。
- `User.releaseTrack` 数据库默认值为 `FULL`，因此历史行和旧进程创建的行不受影响；新应用创建玩家时显式写入 `SOFT_LAUNCH`。
- 新增独立 `PlaytestEvent` 表，无用户外键且不修改既有业务表数据。
- 迁移是生产只向前的纯新增迁移。应用回滚时旧版本忽略新列与新表；不在故障回滚中删除事件表。若未来废弃，使用新的前向迁移删除。

## 5. 验收证据

- 单元：顺序/访问控制、事件严格校验、会话轮换、报告口径、30天截止时间。
- 集成：新玩家为软启动、历史/显式完整玩家仍为100关、服务端拒绝越权slug、事件幂等写入/删除/清理。
- E2E：桌面和手机均只看到12关目录；事件顺序、提示、破解、计时、分享导出可观察；第12关后不出现第13个谜题。
- 部署：锁定依赖、静态/单元/安全集成、构建、staging、`prisma migrate deploy`、目录同步、事件清理、数据库严格检查、PM2切换与健康检查。

2026-08-22 实际门禁结果：

- `prisma generate`、`prisma validate`、部署配置检查、ESLint、TypeScript 与 Next.js 生产构建通过。
- 单元/组件测试：27 个文件、633 项通过；无失败。
- 写入安全集成：2 个文件、5 项通过；真实 PostgreSQL 集成：3 个文件、13 项通过，测试夹具已清理。
- 完整 Playwright E2E：215 项实际执行通过、439 项按项目矩阵预期跳过；覆盖桌面、360/390 手机、平板、reduced-motion 与 WebKit，0 失败。
- 新增迁移已通过 SSH 隧道应用到现有数据库；目录严格校验为 100 个代码定义、100 条数据库记录、100 个 puzzleScene、100 个 V2 schema，缺失/意外/字段不一致均为 0。
- 迁移时已有 32 个玩家全部保持 `FULL`；匿名事件为 0。30 天清理删除 0 条，报告正确标记所有商业阈值为未达标，不能据此扩大开放范围。

自动报告不能替代5人未知答案盲测和至少10条具体反馈。报告只有在运行满7天、达到100个假名浏览器ID、第1至4项指标全部通过，且分享导出率/次日回访至少一项通过时，才把自动部分标为可扩展；是否开放30关仍需人工门通过。

## 6. 生产部署与数据库迁移步骤

1. 在数据库维护窗口先备份；不要在命令或日志中打印连接串。生产环境文件仍为 `/data/prod/timehacker/.env.production`，本功能不增加新的必填环境变量，只要求已有 `DATABASE_URL` 可用。
2. 在 `/data/claude_project/timehacker` 拉取已交付提交，确认 `git status --short` 没有会被覆盖的服务器本地修改。
3. 可先只读执行 `pnpm prisma:validate` 与 `pnpm check:deploy`。首次部署此版本时不要手工编辑数据库表。
4. 执行 `bash deploy.sh`。脚本在旧PM2进程仍运行时先完成构建和staging，再执行 `prisma migrate deploy`；迁移为纯新增，随后清理30天前事件、同步全部100条关卡目录并严格校验，最后切换PM2。
5. 检查 `pm2 status timehacker`、`pm2 logs timehacker --lines 100 --nostream`、`curl -I http://127.0.0.1:3008/` 和 `curl -I https://timehacker.hihongrun.com/`。
6. 执行 `pnpm analytics:report` 查看滚动30天JSON报告。数据不足7天/100个ID或人工反馈不足时，不得据此开放30关。
7. Nginx反向代理仍使用仓库中的 `docs/nginx-timehacker.conf` 与本机端口3008；已有站点无需重复安装或修改。若服务器尚未启用该配置，再复制到站点目录、建立enabled链接、运行 `nginx -t`，通过后才 reload。

应用回滚只需恢复上一版standalone并重启PM2；不要删除 `PlaytestEvent` 表或 `User.releaseTrack`。旧应用会忽略它们，后续修复用新的前向迁移完成。
