# 规则校验修订记录

- 004/009 初稿起点误为解态，改为非解位移；009 掩码算术笔误修正；007 显式要求目标三层叠加。
- 020/078/100 初稿 C=15 且全部入出量为偶数，无法到10。改初始 B=4/C=14，维持总量40、容量、条件与规划命题，不改规则来放过错误。
- 024 初稿用了研究B1的有效解位移。起点改为[5,8,1]，保留共同位移机制，禁止初始通过。

上述均由失败测试发现，先修订冻结配置再同步实现。不改变已批准认知目标和验收标准。
# Independent finish review corrections

- Route 51–60, 91–92 and98: repeated review found gates could be bypassed. Frozen maps now require crossing a gate; 52/58/92 require closing gates from the far side. Same lowercase letter denotes linked switches. No new gesture or invisible prerequisite.
- Finale100: A→B is unavailable until C is at most12 (previously18). This forces preparing C before using a required conditional path; the chapter20 shortcut now fails.
- Acceptance added: replacing all route gates by walls must make the puzzle unsolvable; removing the finale's conditional A→B edge must make it unsolvable. These are causal checks, not a claim that step counts prove fun.
- Production events: V3 keeps only DISCOVERED/ARMED, not raw exploration keys. Preparing any new V3 round remounts the board with cleared events. Paper goals expose zero-based target slots and overlap as text.
