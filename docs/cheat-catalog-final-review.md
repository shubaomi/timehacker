# Time Hacker 100 条作弊方式最终复审

复审范围：以 `docs/cheat-catalog-audit.md` 的修改前逐条审核为基线，对 42 条 KEEP、12 条 TUNE、14 条 REWORK、32 条 REPLACE 的最终实现进行第二次静态与自动化复核。slug 全部保持稳定，因此旧 `UserCheat` 外键无需映射；本地基线当时为 0 个真实用户、0 个解锁。

## 结论

- 最终恰好 100 条 active canonical 作弊，D1–D5 各 20 条。
- 类别服从玩法质量而不再强行 5×5：OPERATION 20、VISUAL 23、RHYTHM 21、DEVICE 14、META 22。
- 自动分类得到 57 个体验原型，单一原型最多 5 条；67 条单表面短仪式、33 条跨表面仪式、33 条观察/规律/解谜玩法、10 条非等间隔节奏、38 条浏览器或界面状态玩法。
- 旧目录最明显的次数膨胀已拆为 Morse 长短脉冲、渐快/渐慢、切分节奏、等待窗口、状态相位、语言切换、目标位置、镜像路线和跨面板碎片收集。
- 快速连点只保留早期教学用途并提供锁存替代；长按保留 1.4 秒压力路径并提供单击替代。滚轮、键盘服务键、焦点和方向传感器均有显式单指或服务输入路径。
- 效果不再全部使用全程倍率：FULL_DILATION 26、FINAL_DILATION 21、TOLERANCE_ASSIST 25、BRAKE_PULSE 28。所有 10 秒目标的模拟现实用时不超过 25 秒。
- Pure Mode 始终按 ±10ms 判定；Hacker 效果由服务器在验证仪式事件后决定。记录保留现实用时、判定用时、容差与辅助类型，精准榜只读取无辅助 Pure 记录。

## 已知问题复核

- `mode-flip`：已改为 Hacker→Pure→Hacker 的模式悖论，跨模式记录事件，不再在临时进入 Pure 时清空轨迹。
- `breath-gap`：READY_WAIT 使用真实连续 elapsed，每 100ms 更新等待进度，3 秒提示与判定一致；任意玩家操作会重置静默起点。
- `hundred-code`：已修正为十进制 100 的七位二进制 `1100100`。
- `reverse-sweep` / `wheel-echo`：保留滚轮快捷路径，并提供 Sweep Up/Down 触控服务键。
- `escape-hatch`：键盘 Escape/Enter/Escape 与可点击服务键等价。
- `quiet-circuit`、`silent-handoff`、`focus-orbit`、`focus-cascade`、`silent-constellation`：键盘焦点与显式 Inspect 路线等价。
- `double-horizon` / `triple-gravity`：使用 portrait→landscape→portrait 完整往返；所有方向路线同时有服务口令。
- 重复组：标签返回、横屏、输入通道、等拍节奏和长按家族均已按审计建议拆分，不再只增加次数、长度或收紧毫秒误差。

## 最终 100 条索引

- D1：five-finger-echo、pressure-delay、slow-command、four-corner-breach、signal-oscillation、double-relay、amber-triangle、binary-blink、target-knock、three-beat-warmup、slow-clap、beacon-beat、breath-gap、window-peek、landscape-nudge、dual-device、tab-doubleback、help-loop、panel-ping、ready-code。
- D2：triple-actuator、calibration-101、status-rebound、patient-zero、mode-flip、relay-sandwich、deep-pressure、relay-beacon-weave、inverted-nibble、corner-zigzag、outer-ones、five-beat-divider、beacon-metronome、double-horizon、return-ticket、pointer-majority、window-tilt、archive-knot、silent-handoff、pause-word。
- D3：metronome-leak、reverse-sweep、archive-route、clue-cipher、glass-relay-oscillator、pointer-echo、relay-quorum、corner-cross、five-bit-latch、alternating-target、precision-five、fourfold-ack、pulse-checker、ghost-session、hinge-loop、hybrid-console、portable-horizon、bend-command、focus-orbit、long-archive-route。
- D4：tab-return、horizon-shift、escape-hatch、mirrored-input、pressure-vault、clue-relay-braid、wheel-echo、counterclockwise-breach、nineteen-code、twin-gates、cipher-reversal、six-beat-lock、beacon-saturation、triple-phase、broken-measure、phase-return、parallax-window、override-command、archive-figure-eight、focus-cascade。
- D5：ten-thousand-glyph、quiet-circuit、split-operator、fourfold-oscillation、seven-relay-vote、pressure-singularity、double-housing-loop、hundred-code、cipher-knot、seven-beat-null、sevenfold-ack、quad-phase、relay-polyrhythm、eclipse-session、triple-gravity、liminal-device、device-braid、chronos-command、archive-labyrinth、silent-constellation。

完整的修改前逐条评分、处置理由、替代输入与测试策略见 `docs/cheat-catalog-audit.md`；最终实现由 `src/game/cheat-revisions.ts`、`src/game/cheats.ts`、`src/game/effects.ts` 与对应测试共同约束。

## 证据边界

“创意性”和“好玩性”评分仍是设计评审判断。自动化可以证明数量、唯一性、可达性、时间窗口、效果计算、数据约束和 UI 基础可用性，但不能证明真实玩家一定觉得好玩。上线后最小验证应记录每条仪式的提示打开率、尝试率、完成率、放弃点与玩家主观评分；对完成率过低或“看懂但不想做”的条目继续替换，而不是继续增加数量。
