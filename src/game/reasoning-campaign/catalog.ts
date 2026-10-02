import type { Level } from "./engine";

/** Authored R100 specifications; not randomly generated at runtime. */
export const REASONING_CAMPAIGN: readonly Level[] = [
  {
    "ordinal": 1,
    "title": {
      "zh": "借来的秒",
      "en": "Borrowed seconds"
    },
    "lesson": {
      "zh": "守恒：给一个储格加时间，另一个必然减少。",
      "en": "Transfers conserve time. Capacity and direction determine which moves are possible."
    },
    "misconception": {
      "zh": "只修好眼前的一格就够了",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "局部对齐可能必须暂时打破",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        8,
        14,
        8
      ],
      "target": [
        10,
        10,
        10
      ],
      "capacity": [
        16,
        16,
        16
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 2
        },
        {
          "from": 1,
          "to": 2,
          "amount": 3
        },
        {
          "from": 2,
          "to": 0,
          "amount": 4
        }
      ]
    }
  },
  {
    "ordinal": 2,
    "title": {
      "zh": "满格之后",
      "en": "No room left"
    },
    "lesson": {
      "zh": "容量：先让满格腾出空间，再安排中转。",
      "en": "Transfers conserve time. Capacity and direction determine which moves are possible."
    },
    "misconception": {
      "zh": "优先从最多的一格直接分完",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "不同输送量使释放空间和补齐相互制约",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        6,
        8,
        16
      ],
      "target": [
        10,
        10,
        10
      ],
      "capacity": [
        16,
        16,
        16
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 2
        },
        {
          "from": 1,
          "to": 2,
          "amount": 3
        },
        {
          "from": 2,
          "to": 0,
          "amount": 4
        }
      ]
    }
  },
  {
    "ordinal": 3,
    "title": {
      "zh": "一条回路",
      "en": "One circuit"
    },
    "lesson": {
      "zh": "巩固守恒：逆向思考最后一次操作的来源。",
      "en": "Transfers conserve time. Capacity and direction determine which moves are possible."
    },
    "misconception": {
      "zh": "只能让距离10越来越近",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "循环一圈并不回到原状态",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        14,
        9,
        7
      ],
      "target": [
        10,
        10,
        10
      ],
      "capacity": [
        16,
        16,
        16
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 2
        },
        {
          "from": 1,
          "to": 2,
          "amount": 3
        },
        {
          "from": 2,
          "to": 0,
          "amount": 4
        }
      ]
    }
  },
  {
    "ordinal": 4,
    "title": {
      "zh": "相遇的墨",
      "en": "Meeting ink"
    },
    "lesson": {
      "zh": "成对抵消：两个相同标记相遇后没有留下两份。",
      "en": "Overlapping pairs cancel; an odd number remains. Predict the whole projection."
    },
    "misconception": {
      "zh": "两层都对准目标就会更亮",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "投影逐槽显示叠加数量，偶数处消失",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        2,
        7
      ],
      "target": 1024,
      "masks": [
        9,
        1033
      ]
    }
  },
  {
    "ordinal": 5,
    "title": {
      "zh": "重叠的回声",
      "en": "Overlapping echoes"
    },
    "lesson": {
      "zh": "三层干涉：局部最佳位移不等于整体投影正确。",
      "en": "Overlapping pairs cancel; an odd number remains. Predict the whole projection."
    },
    "misconception": {
      "zh": "让每行各自最接近10即可",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "修正一处会在别处产生多余信号",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        0,
        0,
        0
      ],
      "target": 1024,
      "masks": [
        73,
        146,
        194
      ]
    }
  },
  {
    "ordinal": 6,
    "title": {
      "zh": "临时借位",
      "en": "Temporary room"
    },
    "lesson": {
      "zh": "四格中转：目标格也可以暂时当缓冲。",
      "en": "Transfers conserve time. Capacity and direction determine which moves are possible."
    },
    "misconception": {
      "zh": "已到10的格子再也不能动",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "经过正确格子的运输能帮助远端格子",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        12,
        8,
        14,
        6
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "capacity": [
        16,
        16,
        16,
        16
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 2
        },
        {
          "from": 1,
          "to": 2,
          "amount": 2
        },
        {
          "from": 2,
          "to": 3,
          "amount": 4
        },
        {
          "from": 3,
          "to": 0,
          "amount": 2
        }
      ]
    }
  },
  {
    "ordinal": 7,
    "title": {
      "zh": "第三层",
      "en": "The third layer"
    },
    "lesson": {
      "zh": "奇数保留：三份重合与两份重合不同。",
      "en": "Overlapping pairs cancel; an odd number remains. Predict the whole projection."
    },
    "misconception": {
      "zh": "只要重合就应该消掉",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "目标唯一有效解需要三份信号",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        0,
        0,
        0
      ],
      "target": 1024,
      "masks": [
        131,
        13,
        3176
      ],
      "targetCount": 3
    }
  },
  {
    "ordinal": 8,
    "title": {
      "zh": "窄口",
      "en": "Narrow mouth"
    },
    "lesson": {
      "zh": "容量不对称：先比较边界，再决定从哪里动。",
      "en": "Transfers conserve time. Capacity and direction determine which moves are possible."
    },
    "misconception": {
      "zh": "三个容器规则完全对称",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "B的较低容量阻止直觉中的首步",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        12,
        12,
        6
      ],
      "target": [
        10,
        10,
        10
      ],
      "capacity": [
        14,
        12,
        16
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 2
        },
        {
          "from": 1,
          "to": 2,
          "amount": 3
        },
        {
          "from": 2,
          "to": 0,
          "amount": 4
        }
      ]
    }
  },
  {
    "ordinal": 9,
    "title": {
      "zh": "留下两点",
      "en": "Two points remain"
    },
    "lesson": {
      "zh": "目标迁移：规则不变，目标变为两个时间槽。",
      "en": "Overlapping pairs cancel; an odd number remains. Predict the whole projection."
    },
    "misconception": {
      "zh": "永远只剩10就完成",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "第5和第10格都必须保留，其余全暗",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        3,
        9
      ],
      "target": 1056,
      "masks": [
        67,
        1123
      ]
    }
  },
  {
    "ordinal": 10,
    "title": {
      "zh": "返回之前",
      "en": "Before returning"
    },
    "lesson": {
      "zh": "章末组合：同时安排源量、容量和最后一次转移。",
      "en": "Transfers conserve time. Capacity and direction determine which moves are possible."
    },
    "misconception": {
      "zh": "按上一关按钮次数重复",
      "en": "Fixing one place alone is enough."
    },
    "counter": {
      "zh": "同一网络的新起点需要重新预测",
      "en": "Watch how changing one part affects the others."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        5,
        9
      ],
      "target": [
        10,
        10,
        10
      ],
      "capacity": [
        16,
        16,
        16
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 2
        },
        {
          "from": 1,
          "to": 2,
          "amount": 3
        },
        {
          "from": 2,
          "to": 0,
          "amount": 4
        }
      ]
    }
  },
{"ordinal":11,"title":{"zh":"第四个位置","en":"A fourth place"},"lesson":{"zh":"利用第四格中转，而不是只看相邻两格。","en":"Use the fourth well as a buffer, not just its neighbors."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"利用第四格中转，而不是只看相邻两格。先预测一次操作的其他影响，再检查剩余目标。","en":"Use the fourth well as a buffer, not just its neighbors. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[14,4,12,10],"target":[10,10,10,10],"capacity":[16,16,16,16],"edges":[{"from":0,"to":1,"amount":3},{"from":1,"to":2,"amount":2},{"from":2,"to":3,"amount":4},{"from":3,"to":0,"amount":1}]}},
{"ordinal":12,"title":{"zh":"不同的终点","en":"Different destinations"},"lesson":{"zh":"目标刻度并非都相同，守恒比平均分更重要。","en":"The marks differ. Conservation matters more than equal shares."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"目标刻度并非都相同，守恒比平均分更重要。先预测一次操作的其他影响，再检查剩余目标。","en":"The marks differ. Conservation matters more than equal shares. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[4,12,8,16],"target":[8,12,8,12],"capacity":[16,16,16,16],"edges":[{"from":0,"to":1,"amount":2},{"from":1,"to":2,"amount":2},{"from":2,"to":3,"amount":4},{"from":3,"to":0,"amount":2}]}},
{"ordinal":13,"title":{"zh":"岔流","en":"A fork in the flow"},"lesson":{"zh":"一处有两条出口，选择会改变另一处的余量。","en":"A fork changes where capacity remains."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"一处有两条出口，选择会改变另一处的余量。先预测一次操作的其他影响，再检查剩余目标。","en":"A fork changes where capacity remains. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[16,2,12],"target":[10,10,10],"capacity":[16,16,16],"edges":[{"from":0,"to":1,"amount":2},{"from":0,"to":2,"amount":3},{"from":1,"to":2,"amount":2},{"from":2,"to":0,"amount":1}]}},
{"ordinal":14,"title":{"zh":"回送","en":"Return channel"},"lesson":{"zh":"反向通路可以撤去过量，不需要全盘重置。","en":"Use the return channel to recover excess without resetting."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"反向通路可以撤去过量，不需要全盘重置。先预测一次操作的其他影响，再检查剩余目标。","en":"Use the return channel to recover excess without resetting. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[3,14,13],"target":[10,10,10],"capacity":[16,16,16],"edges":[{"from":0,"to":1,"amount":3},{"from":1,"to":0,"amount":2},{"from":1,"to":2,"amount":4},{"from":2,"to":0,"amount":1}]}},
{"ordinal":15,"title":{"zh":"空格不是浪费","en":"Empty space is useful"},"lesson":{"zh":"低容量中转格不能储存整批，先规划通过的顺序。","en":"A small buffer cannot hold a whole batch. Plan the order."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"低容量中转格不能储存整批，先规划通过的顺序。先预测一次操作的其他影响，再检查剩余目标。","en":"A small buffer cannot hold a whole batch. Plan the order. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[16,0,14],"target":[12,6,12],"capacity":[18,6,18],"edges":[{"from":0,"to":1,"amount":2},{"from":1,"to":2,"amount":3},{"from":2,"to":0,"amount":1}]}},
{"ordinal":16,"title":{"zh":"双环","en":"Two loops"},"lesson":{"zh":"两个回路共享一个储格，局部解决会占用另一回路的空间。","en":"Two loops share a well; fixing one uses space needed by the other."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"两个回路共享一个储格，局部解决会占用另一回路的空间。先预测一次操作的其他影响，再检查剩余目标。","en":"Two loops share a well; fixing one uses space needed by the other. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[14,4,16,6],"target":[10,10,10,10],"capacity":[18,14,18,14],"edges":[{"from":0,"to":1,"amount":2},{"from":1,"to":0,"amount":3},{"from":1,"to":2,"amount":2},{"from":2,"to":3,"amount":4},{"from":3,"to":1,"amount":1}]}},
{"ordinal":17,"title":{"zh":"跨过邻居","en":"Skip a neighbor"},"lesson":{"zh":"远端通路减少绕行，但会改变中间格的补给关系。","en":"A long channel bypasses a well and changes its supply."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"远端通路减少绕行，但会改变中间格的补给关系。先预测一次操作的其他影响，再检查剩余目标。","en":"A long channel bypasses a well and changes its supply. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[8,16,2,14],"target":[10,10,10,10],"capacity":[16,18,16,16],"edges":[{"from":0,"to":1,"amount":2},{"from":1,"to":3,"amount":3},{"from":3,"to":2,"amount":2},{"from":2,"to":0,"amount":1},{"from":1,"to":2,"amount":4}]}},
{"ordinal":18,"title":{"zh":"先出后进","en":"Out before in"},"lesson":{"zh":"两个紧容量格互相限制，必须先借用宽格。","en":"Two narrow wells constrain each other. Borrow space from the wide one."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"两个紧容量格互相限制，必须先借用宽格。先预测一次操作的其他影响，再检查剩余目标。","en":"Two narrow wells constrain each other. Borrow space from the wide one. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[12,12,6],"target":[10,10,10],"capacity":[12,12,18],"edges":[{"from":0,"to":1,"amount":3},{"from":1,"to":2,"amount":2},{"from":2,"to":0,"amount":2},{"from":0,"to":2,"amount":1}]}},
{"ordinal":19,"title":{"zh":"没有平均","en":"Not an average"},"lesson":{"zh":"不同目标仍守恒，不能把最大值一路倒向最小值。","en":"Unequal targets still conserve time. The smallest well is not always next."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"不同目标仍守恒，不能把最大值一路倒向最小值。先预测一次操作的其他影响，再检查剩余目标。","en":"Unequal targets still conserve time. The smallest well is not always next. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[2,16,6,16],"target":[6,8,12,14],"capacity":[16,16,18,18],"edges":[{"from":0,"to":1,"amount":2},{"from":1,"to":2,"amount":3},{"from":2,"to":3,"amount":2},{"from":3,"to":0,"amount":1},{"from":1,"to":3,"amount":4}]}},
{"ordinal":20,"title":{"zh":"留出十秒","en":"Room for ten"},"lesson":{"zh":"先倒推最后一条通路，再安排三个中转格。","en":"Work backward from the last transfer through three buffers."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"先倒推最后一条通路，再安排三个中转格。先预测一次操作的其他影响，再检查剩余目标。","en":"Work backward from the last transfer through three buffers. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"flow","initial":[18,4,14,4],"target":[10,10,10,10],"capacity":[18,14,18,14],"edges":[{"from":0,"to":1,"amount":3},{"from":1,"to":2,"amount":2},{"from":2,"to":3,"amount":4},{"from":3,"to":0,"amount":1},{"from":0,"to":2,"amount":2}]}},
{"ordinal":21,"title":{"zh":"缺口相消","en":"Cancelling gaps"},"lesson":{"zh":"不同形状也能通过重叠抵消。","en":"Different shapes can cancel at their overlaps."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"不同形状也能通过重叠抵消。先预测一次操作的其他影响，再检查剩余目标。","en":"Different shapes can cancel at their overlaps. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[3,8],"target":1024,"masks":[21,1045]}},
{"ordinal":22,"title":{"zh":"两处留白","en":"Two spaces"},"lesson":{"zh":"同时比较两个目标，不要把额外信号当装饰。","en":"Compare both target slots; stray marks count."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"同时比较两个目标，不要把额外信号当装饰。先预测一次操作的其他影响，再检查剩余目标。","en":"Compare both target slots; stray marks count. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[4,9],"target":1056,"masks":[137,1193]}},
{"ordinal":23,"title":{"zh":"三层并行","en":"Three in parallel"},"lesson":{"zh":"先固定两层之间的关系，再移动共同残差。","en":"Fix the relationship between two layers, then move their residue."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"先固定两层之间的关系，再移动共同残差。先预测一次操作的其他影响，再检查剩余目标。","en":"Fix the relationship between two layers, then move their residue. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[1,5,8],"target":1024,"masks":[37,146,1207]}},
{"ordinal":24,"title":{"zh":"一起移动","en":"Moving together"},"lesson":{"zh":"移动A也带动B；保持相对距离有时比绝对位置重要。","en":"A moves B too. Relative distance can matter more than position."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"移动A也带动B；保持相对距离有时比绝对位置重要。先预测一次操作的其他影响，再检查剩余目标。","en":"A moves B too. Relative distance can matter more than position. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[5,8,1],"target":1024,"masks":[73,146,194],"coupling":[[1,1,0],[0,1,0],[0,0,1]]}},
{"ordinal":25,"title":{"zh":"逆向纸边","en":"Opposite edges"},"lesson":{"zh":"一层前进时另一层后退，相消位置因此变化两格。","en":"Opposite motion changes the overlap twice as fast."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"一层前进时另一层后退，相消位置因此变化两格。先预测一次操作的其他影响，再检查剩余目标。","en":"Opposite motion changes the overlap twice as fast. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[1,4,9],"target":1024,"masks":[73,146,194],"coupling":[[1,-1,0],[0,1,0],[0,0,1]]}},
{"ordinal":26,"title":{"zh":"传递位移","en":"Passing motion"},"lesson":{"zh":"A带B、B带C，必须考虑间接影响。","en":"A carries B and B carries C. Account for indirect effects."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"A带B、B带C，必须考虑间接影响。先预测一次操作的其他影响，再检查剩余目标。","en":"A carries B and B carries C. Account for indirect effects. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[2,5,8],"target":1024,"masks":[11,208,1243],"coupling":[[1,1,0],[0,1,1],[0,0,1]]}},
{"ordinal":27,"title":{"zh":"整张纸","en":"The whole sheet"},"lesson":{"zh":"全体移动保留内部关系，只改变投影位置。","en":"A global shift preserves internal relationships but moves the projection."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"全体移动保留内部关系，只改变投影位置。先预测一次操作的其他影响，再检查剩余目标。","en":"A global shift preserves internal relationships but moves the projection. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[1,6,9],"target":1024,"masks":[131,13,3176],"coupling":[[1,1,1],[0,1,0],[0,0,1]]}},
{"ordinal":28,"title":{"zh":"双目标联动","en":"Coupled targets"},"lesson":{"zh":"共同移动与单层修正需要分开规划。","en":"Plan shared motion separately from single-layer corrections."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"共同移动与单层修正需要分开规划。先预测一次操作的其他影响，再检查剩余目标。","en":"Plan shared motion separately from single-layer corrections. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[2,6,10],"target":1056,"masks":[37,146,1175],"coupling":[[1,1,0],[0,1,1],[0,0,1]]}},
{"ordinal":29,"title":{"zh":"交叉之后","en":"After the crossing"},"lesson":{"zh":"负向联动不能按屏幕上从左到右逐层处理。","en":"Opposed coupling breaks a simple left-to-right approach."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"负向联动不能按屏幕上从左到右逐层处理。先预测一次操作的其他影响，再检查剩余目标。","en":"Opposed coupling breaks a simple left-to-right approach. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[5,3,8],"target":1024,"masks":[81,266,1371],"coupling":[[1,0,-1],[0,1,1],[0,0,1]]}},
{"ordinal":30,"title":{"zh":"纸层合奏","en":"Paper ensemble"},"lesson":{"zh":"先消去非目标信号，再调整共同位移。","en":"Cancel unwanted marks before adjusting the common shift."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"先消去非目标信号，再调整共同位移。先预测一次操作的其他影响，再检查剩余目标。","en":"Cancel unwanted marks before adjusting the common shift. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"paper","initial":[3,7,9],"target":1096,"masks":[67,290,1321],"coupling":[[1,1,1],[0,1,-1],[0,0,1]]}},
{"ordinal":31,"title":{"zh":"共享指针","en":"Shared hands"},"lesson":{"zh":"每个轴影响两支指针，逐支独立修正不可行。","en":"Each axle moves two hands, so independent corrections fail."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"每个轴影响两支指针，逐支独立修正不可行。先预测一次操作的其他影响，再检查剩余目标。","en":"Each axle moves two hands, so independent corrections fail. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[1,3,2],"target":[10,10,10],"vectors":[[1,1,0],[0,1,1],[1,0,1]]}},
{"ordinal":32,"title":{"zh":"反向齿轮","en":"Counter rotation"},"lesson":{"zh":"负齿比意味着看起来后退的指针也可能是正确变化。","en":"A negative ratio makes backward motion useful."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"负齿比意味着看起来后退的指针也可能是正确变化。先预测一次操作的其他影响，再检查剩余目标。","en":"A negative ratio makes backward motion useful. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[5,9,8],"target":[10,10,10],"vectors":[[1,-1,0],[0,1,1],[1,0,-1]]}},
{"ordinal":33,"title":{"zh":"大步小步","en":"Large and small"},"lesson":{"zh":"两格与三格的步长可组合出一格变化。","en":"Combine two- and three-tick movements to obtain one tick."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"两格与三格的步长可组合出一格变化。先预测一次操作的其他影响，再检查剩余目标。","en":"Combine two- and three-tick movements to obtain one tick. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[6,9,9],"target":[10,10,10],"vectors":[[2,1,0],[0,3,1],[1,0,2]]}},
{"ordinal":34,"title":{"zh":"整圈归来","en":"A full turn"},"lesson":{"zh":"走完一圈回到原位，可以在不损伤一支指针时修正另一支。","en":"A full turn restores one hand while another changes."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"走完一圈回到原位，可以在不损伤一支指针时修正另一支。先预测一次操作的其他影响，再检查剩余目标。","en":"A full turn restores one hand while another changes. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[8,9,2],"target":[10,10,10],"vectors":[[3,1,0],[0,4,1],[1,0,2]]}},
{"ordinal":35,"title":{"zh":"不同刻度","en":"Different marks"},"lesson":{"zh":"目标不再相同，先比较每支指针到各自标记的差。","en":"Each hand has its own mark. Compare their separate offsets."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"目标不再相同，先比较每支指针到各自标记的差。先预测一次操作的其他影响，再检查剩余目标。","en":"Each hand has its own mark. Compare their separate offsets. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[9,0,0],"target":[2,6,10],"vectors":[[1,1,0],[0,1,1],[1,0,0]]}},
{"ordinal":36,"title":{"zh":"第四支针","en":"The fourth hand"},"lesson":{"zh":"一根共享轴把远处两支指针联系起来。","en":"One axle connects two distant hands."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"一根共享轴把远处两支指针联系起来。先预测一次操作的其他影响，再检查剩余目标。","en":"One axle connects two distant hands. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[2,3,2,11],"target":[10,10,10,10],"vectors":[[1,1,0,0],[0,1,1,0],[0,0,1,1],[1,0,0,0]]}},
{"ordinal":37,"title":{"zh":"绕开中心","en":"Around the center"},"lesson":{"zh":"跨接轴不改变中间指针；利用不会改变的部分。","en":"A bypass leaves the middle hand still. Use that invariant."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"跨接轴不改变中间指针；利用不会改变的部分。先预测一次操作的其他影响，再检查剩余目标。","en":"A bypass leaves the middle hand still. Use that invariant. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[3,4,8],"target":[10,10,10],"vectors":[[1,0,2],[0,1,1],[1,1,0]]}},
{"ordinal":38,"title":{"zh":"互为反向","en":"Opposed pairs"},"lesson":{"zh":"一对指针的总偏移受约束，先寻找保持不变的量。","en":"Find the invariant offset of an opposed pair."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"一对指针的总偏移受约束，先寻找保持不变的量。先预测一次操作的其他影响，再检查剩余目标。","en":"Find the invariant offset of an opposed pair. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[4,11,9],"target":[10,10,10],"vectors":[[1,-1,0],[0,1,-1],[1,1,1]]}},
{"ordinal":39,"title":{"zh":"双倍回声","en":"Double echo"},"lesson":{"zh":"同一操作的倍数影响有共同周期，不要只数点击。","en":"Different ratios share a cycle. Predict it rather than counting clicks."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"同一操作的倍数影响有共同周期，不要只数点击。先预测一次操作的其他影响，再检查剩余目标。","en":"Different ratios share a cycle. Predict it rather than counting clicks. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[4,5,5,4],"target":[10,10,10,10],"vectors":[[2,1,0,0],[0,2,1,0],[0,0,2,1],[1,0,0,1]]}},
{"ordinal":40,"title":{"zh":"轴心不动","en":"A still center"},"lesson":{"zh":"先保留正确的一对，再用组合抵消剩余影响。","en":"Preserve one correct pair while cancelling the remaining effects."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"先保留正确的一对，再用组合抵消剩余影响。先预测一次操作的其他影响，再检查剩余目标。","en":"Preserve one correct pair while cancelling the remaining effects. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"gears","initial":[5,3,9,0],"target":[10,10,10,10],"vectors":[[1,1,-1,0],[0,1,1,-1],[1,0,0,1]]}},
{"ordinal":41,"title":{"zh":"一格的邻居","en":"Neighbors of a square"},"lesson":{"zh":"一次翻面改变自己与直邻，亮格不是独立按钮。","en":"A press flips itself and adjacent cells, not just one light."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"一次翻面改变自己与直邻，亮格不是独立按钮。先预测一次操作的其他影响，再检查剩余目标。","en":"A press flips itself and adjacent cells, not just one light. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":3,"initial":[273],"target":0,"masks":[11,23,38,89,186,308,200,464,416]}},
{"ordinal":42,"title":{"zh":"角落少一边","en":"Corners have fewer neighbors"},"lesson":{"zh":"边界减少影响范围，可用来隔离局部变化。","en":"Edges reduce the affected area and isolate changes."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"边界减少影响范围，可用来隔离局部变化。先预测一次操作的其他影响，再检查剩余目标。","en":"Edges reduce the affected area and isolate changes. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":3,"initial":[297],"target":0,"masks":[11,23,38,89,186,308,200,464,416]}},
{"ordinal":43,"title":{"zh":"留下一条线","en":"Leave a line"},"lesson":{"zh":"目标图案不是全暗，必须保留轮廓内的亮面。","en":"The target is a pattern, not darkness."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"目标图案不是全暗，必须保留轮廓内的亮面。先预测一次操作的其他影响，再检查剩余目标。","en":"The target is a pattern, not darkness. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":3,"initial":[320],"target":7,"masks":[11,23,38,89,186,308,200,464,416]}},
{"ordinal":44,"title":{"zh":"斜着相连","en":"Diagonal ties"},"lesson":{"zh":"斜向连接取代直邻，外观相近不能沿用旧邻接。","en":"Diagonal links replace straight neighbors."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"斜向连接取代直邻，外观相近不能沿用旧邻接。先预测一次操作的其他影响，再检查剩余目标。","en":"Diagonal links replace straight neighbors. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":3,"initial":[110],"target":0,"masks":[273,42,84,138,341,162,84,168,273]}},
{"ordinal":45,"title":{"zh":"整行整列","en":"Rows and columns"},"lesson":{"zh":"交点只翻一次；行与列共享一次操作。","en":"The intersection flips once while its row and column share a move."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"交点只翻一次；行与列共享一次操作。先预测一次操作的其他影响，再检查剩余目标。","en":"The intersection flips once while its row and column share a move. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":3,"initial":[273],"target":0,"masks":[79,151,295,121,186,316,457,466,484]}},
{"ordinal":46,"title":{"zh":"不动的中心","en":"The center stays"},"lesson":{"zh":"控制中心不翻面，只改变邻居。","en":"A control changes its neighbors but leaves its own cell still."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"控制中心不翻面，只改变邻居。先预测一次操作的其他影响，再检查剩余目标。","en":"A control changes its neighbors but leaves its own cell still. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":3,"initial":[297],"target":0,"masks":[10,21,34,81,170,276,136,336,160]}},
{"ordinal":47,"title":{"zh":"对面的自己","en":"Your opposite"},"lesson":{"zh":"相对位置成对翻转，先辨认配对。","en":"Opposite cells flip together. Identify the pairs."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"相对位置成对翻转，先辨认配对。先预测一次操作的其他影响，再检查剩余目标。","en":"Opposite cells flip together. Identify the pairs. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":3,"initial":[471],"target":0,"masks":[257,130,68,40,16,40,68,130,257]}},
{"ordinal":48,"title":{"zh":"更宽的纸","en":"A wider sheet"},"lesson":{"zh":"同样规则进入四乘四，需要分区而非逐个消除。","en":"The same rule on a larger sheet calls for regions, not single fixes."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"同样规则进入四乘四，需要分区而非逐个消除。先预测一次操作的其他影响，再检查剩余目标。","en":"The same rule on a larger sheet calls for regions, not single fixes. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":4,"initial":[19629],"target":0,"masks":[19,39,78,140,305,626,1252,2248,4880,10016,20032,35968,12544,29184,58368,51200]}},
{"ordinal":49,"title":{"zh":"亮面边框","en":"A lit border"},"lesson":{"zh":"先守住目标轮廓，再消除内侧残留。","en":"Protect the target border while removing interior residue."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"先守住目标轮廓，再消除内侧残留。先预测一次操作的其他影响，再检查剩余目标。","en":"Protect the target border while removing interior residue. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":4,"initial":[38125],"target":63903,"masks":[19,39,78,140,305,626,1252,2248,4880,10016,20032,35968,12544,29184,58368,51200]}},
{"ordinal":50,"title":{"zh":"翻面的和声","en":"A chorus of folds"},"lesson":{"zh":"一处翻两次会抵消，可先分析哪些操作需要奇数次。","en":"Two identical flips cancel. Reason about which operations need odd counts."},"misconception":{"zh":"把局部对齐当作全部完成。","en":"A locally correct piece means the whole puzzle is solved."},"counter":{"zh":"一处翻两次会抵消，可先分析哪些操作需要奇数次。先预测一次操作的其他影响，再检查剩余目标。","en":"Two identical flips cancel. Reason about which operations need odd counts. Predict the other effects of a move before checking the remaining targets."},"puzzle":{"kind":"weave","size":4,"initial":[2574],"target":1632,"masks":[4383,8751,17487,34959,4593,8946,17652,35064,7953,12066,20292,36744,61713,61986,62532,63624]}},
{"ordinal":51,"title":{"zh":"墨迹开路","en":"Ink opens a path"},"lesson":{"zh":"开关改变门，先绕行才能通过。","en":"A switch changes a gate; take a detour first."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"开关改变门，先绕行才能通过。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A switch changes a gate; take a detour first. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.a##",".#.##","..A.E","##..#","....."],"initial":[0,0],"finalMask":1}},
{"ordinal":52,"title":{"zh":"再次经过","en":"Passing again"},"lesson":{"zh":"重过开关会关闭门，回程也要规划。","en":"Revisiting a switch closes its gate. Plan the return."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"重过开关会关闭门，回程也要规划。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Revisiting a switch closes its gate. Plan the return. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.a#.",".###.","..AaE","####.","....."],"initial":[0,0],"finalMask":0}},
{"ordinal":53,"title":{"zh":"门在远处","en":"A distant gate"},"lesson":{"zh":"开关和门不相邻，但标签相同。","en":"A switch and its matching gate may be far apart."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"开关和门不相邻，但标签相同。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A switch and its matching gate may be far apart. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S....","###.#","a...#","###A#","....E"],"initial":[0,0],"finalMask":1}},
{"ordinal":54,"title":{"zh":"两扇门","en":"Two gates"},"lesson":{"zh":"不同开关独立控制门，不能只开最近的一扇。","en":"Separate switches control separate gates."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"不同开关独立控制门，不能只开最近的一扇。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Separate switches control separate gates. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.a#.",".#.#.","b#A#.","..B..","..#.E"],"initial":[0,0],"finalMask":3}},
{"ordinal":55,"title":{"zh":"借道返回","en":"Borrow the return path"},"lesson":{"zh":"开门后原路返回可能再次踩下开关，利用另一条路。","en":"Returning through a switch may close the gate. Find another route."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"开门后原路返回可能再次踩下开关，利用另一条路。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Returning through a switch may close the gate. Find another route. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.a#.",".#.#.","...A.","b###.","..B.E"],"initial":[0,0],"finalMask":3}},
{"ordinal":56,"title":{"zh":"先开哪扇","en":"Which gate first"},"lesson":{"zh":"一扇门后的开关才控制下一扇门。","en":"The switch beyond one gate controls the next."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"一扇门后的开关才控制下一扇门。允许暂时退回，比较下一步会开放或破坏的关系。","en":"The switch beyond one gate controls the next. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.a##",".##.#","..Ab.","##.#B","....E"],"initial":[0,0],"finalMask":3}},
{"ordinal":57,"title":{"zh":"保持敞开","en":"Keep it open"},"lesson":{"zh":"终点要求门仍打开，不能只到达终点。","en":"The gates must remain open at the destination."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"终点要求门仍打开，不能只到达终点。允许暂时退回，比较下一步会开放或破坏的关系。","en":"The gates must remain open at the destination. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S..a#","##.#.","..A..",".#B#.","b...E"],"initial":[0,0],"finalMask":3}},
{"ordinal":58,"title":{"zh":"来路也会改变","en":"The way back changes"},"lesson":{"zh":"终点要求恢复门，经过不等于完成。","en":"Restore the gates before finishing. Reaching the end is not enough."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"终点要求恢复门，经过不等于完成。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Restore the gates before finishing. Reaching the end is not enough. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.A.B","a#b#.","####.","a.b..","....E"],"initial":[0,0],"finalMask":0}},
{"ordinal":59,"title":{"zh":"交错通路","en":"Interlaced paths"},"lesson":{"zh":"两个开关在不同支路，选择交会点减少互相关闭。","en":"Switches lie on different branches. Plan where the paths meet."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"两个开关在不同支路，选择交会点减少互相关闭。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Switches lie on different branches. Plan where the paths meet. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["Sa...","##.#.","b.A..",".#B##","....E"],"initial":[0,0],"finalMask":3}},
{"ordinal":60,"title":{"zh":"墨水记得","en":"Ink remembers"},"lesson":{"zh":"位置与门状态一起构成局面，相同位置不一定相同机会。","en":"Position and gate state form the situation; the same square can offer different moves."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"位置与门状态一起构成局面，相同位置不一定相同机会。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Position and gate state form the situation; the same square can offer different moves. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.A.B","a#b#.","####c","E.C..","#####"],"initial":[0,0],"finalMask":7}},
{"ordinal":61,"title":{"zh":"相邻的页","en":"Neighboring pages"},"lesson":{"zh":"相邻交换会同时改变两张页的位置。","en":"An adjacent swap changes two positions."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"相邻交换会同时改变两张页的位置。允许暂时退回，比较下一步会开放或破坏的关系。","en":"An adjacent swap changes two positions. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[3,1,5,2,4],"target":[1,2,3,4,5],"cycles":[[0,1],[1,2],[2,3],[3,4]]}},
{"ordinal":62,"title":{"zh":"一折三页","en":"A fold of three"},"lesson":{"zh":"三页循环不是两页互换，最后一页会回到第一位。","en":"A three-page cycle wraps the last page to the first."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"三页循环不是两页互换，最后一页会回到第一位。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A three-page cycle wraps the last page to the first. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[4,2,5,1,3],"target":[1,2,3,4,5],"cycles":[[0,1,2],[2,3,4],[0,1]]}},
{"ordinal":63,"title":{"zh":"左右折口","en":"Folds on both sides"},"lesson":{"zh":"两组循环共享中间页，先规划重叠的位置。","en":"Two cycles share a middle page. Plan that overlap."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"两组循环共享中间页，先规划重叠的位置。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Two cycles share a middle page. Plan that overlap. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[2,5,1,3,4],"target":[1,2,3,4,5],"cycles":[[0,1,2],[2,3,4],[1,3]]}},
{"ordinal":64,"title":{"zh":"翻过整页","en":"Turn the whole sheet"},"lesson":{"zh":"整体循环保留相对顺序，可以先建立局部关系。","en":"A full cycle preserves relative order. Build a local relationship first."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"整体循环保留相对顺序，可以先建立局部关系。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A full cycle preserves relative order. Build a local relationship first. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[3,5,2,4,1],"target":[1,2,3,4,5],"cycles":[[0,1,2,3,4],[0,1],[2,3]]}},
{"ordinal":65,"title":{"zh":"远处的折痕","en":"A distant crease"},"lesson":{"zh":"不相邻的交换破坏直觉，依据连接而非距离。","en":"A distant swap follows its connection, not physical proximity."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"不相邻的交换破坏直觉，依据连接而非距离。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A distant swap follows its connection, not physical proximity. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[5,3,1,4,2],"target":[1,2,3,4,5],"cycles":[[0,2],[1,3],[2,4],[0,1]]}},
{"ordinal":66,"title":{"zh":"六页一册","en":"A book of six"},"lesson":{"zh":"分组整理后仍需用交界操作把两组接起来。","en":"Sorted groups still need a boundary operation to join them."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"分组整理后仍需用交界操作把两组接起来。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Sorted groups still need a boundary operation to join them. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[3,1,6,2,5,4],"target":[1,2,3,4,5,6],"cycles":[[0,1,2],[3,4,5],[2,3],[0,1]]}},
{"ordinal":67,"title":{"zh":"移动空隙","en":"Move the gap"},"lesson":{"zh":"局部正确的页也可以暂时借位，不要求每步都更有序。","en":"A correct page can temporarily yield its place."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"局部正确的页也可以暂时借位，不要求每步都更有序。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A correct page can temporarily yield its place. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[2,4,6,1,3,5],"target":[1,2,3,4,5,6],"cycles":[[0,1],[1,2,3],[3,4,5],[2,4]]}},
{"ordinal":68,"title":{"zh":"对折与绕行","en":"Fold and circle"},"lesson":{"zh":"短交换和长循环承担不同作用。","en":"A short swap and a long cycle serve different purposes."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"短交换和长循环承担不同作用。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A short swap and a long cycle serve different purposes. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[6,2,4,1,5,3],"target":[1,2,3,4,5,6],"cycles":[[0,1,2,3,4,5],[0,3],[1,2]]}},
{"ordinal":69,"title":{"zh":"三处重叠","en":"Three overlaps"},"lesson":{"zh":"多组共享页要通过中间状态传递，不存在独立分区。","en":"Shared pages transfer between cycles; there are no independent regions."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"多组共享页要通过中间状态传递，不存在独立分区。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Shared pages transfer between cycles; there are no independent regions. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[4,6,2,5,1,3],"target":[1,2,3,4,5,6],"cycles":[[0,1,2],[2,3,4],[4,5,0],[0,1]]}},
{"ordinal":70,"title":{"zh":"合上书脊","en":"Close the spine"},"lesson":{"zh":"先保留已经排好的相对顺序，再用循环移到目标位置。","en":"Preserve the relative order before cycling into final positions."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"先保留已经排好的相对顺序，再用循环移到目标位置。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Preserve the relative order before cycling into final positions. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[5,3,6,2,4,1],"target":[1,2,3,4,5,6],"cycles":[[0,1,2,3],[2,3,4,5],[0,5],[1,2]]}},
{"ordinal":71,"title":{"zh":"有条件的河","en":"A conditional river"},"lesson":{"zh":"通路取决于第三格，不是只看起点和终点。","en":"A route depends on a third well, not only its endpoints."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"通路取决于第三格，不是只看起点和终点。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A route depends on a third well, not only its endpoints. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"flow","initial":[8,14,8],"target":[10,10,10],"capacity":[16,16,16],"edges":[{"from":0,"to":1,"amount":2,"when":{"cell":2,"min":6,"max":12}},{"from":1,"to":2,"amount":3},{"from":2,"to":0,"amount":4}]}},
{"ordinal":72,"title":{"zh":"借到钥匙","en":"Borrow a condition"},"lesson":{"zh":"先改变条件格，才能使用原本关闭的通路。","en":"Change the condition well before using a closed route."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"先改变条件格，才能使用原本关闭的通路。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Change the condition well before using a closed route. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"flow","initial":[6,8,16],"target":[10,10,10],"capacity":[16,16,16],"edges":[{"from":0,"to":1,"amount":2},{"from":1,"to":2,"amount":3,"when":{"cell":0,"min":8,"max":16}},{"from":2,"to":0,"amount":4}]}},
{"ordinal":73,"title":{"zh":"窗口会关闭","en":"The window closes"},"lesson":{"zh":"自己的一次输送可能关闭另一通路，先后顺序有意义。","en":"A transfer can close another route, so order matters."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"自己的一次输送可能关闭另一通路，先后顺序有意义。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A transfer can close another route, so order matters. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"flow","initial":[14,9,7],"target":[10,10,10],"capacity":[16,16,16],"edges":[{"from":0,"to":1,"amount":2},{"from":1,"to":2,"amount":3},{"from":2,"to":0,"amount":4,"when":{"cell":1,"min":5,"max":14}}]}},
{"ordinal":74,"title":{"zh":"两处门槛","en":"Two thresholds"},"lesson":{"zh":"两条路的条件不同，要找同时可维持的中间状态。","en":"Different route conditions require a sustainable intermediate state."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"两条路的条件不同，要找同时可维持的中间状态。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Different route conditions require a sustainable intermediate state. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"flow","initial":[12,12,6],"target":[10,10,10],"capacity":[16,16,16],"edges":[{"from":0,"to":1,"amount":2,"when":{"cell":2,"min":4,"max":14}},{"from":1,"to":2,"amount":3,"when":{"cell":0,"min":6,"max":16}},{"from":2,"to":0,"amount":4}]}},
{"ordinal":75,"title":{"zh":"中转许可证","en":"A buffer condition"},"lesson":{"zh":"让中转格在适当范围，而不是一味装满。","en":"Keep a buffer within its useful range instead of filling it."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"让中转格在适当范围，而不是一味装满。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Keep a buffer within its useful range instead of filling it. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"flow","initial":[14,4,12,10],"target":[10,10,10,10],"capacity":[16,16,16,16],"edges":[{"from":0,"to":1,"amount":3},{"from":1,"to":2,"amount":2,"when":{"cell":3,"min":6,"max":14}},{"from":2,"to":3,"amount":4},{"from":3,"to":0,"amount":1}]}},
{"ordinal":76,"title":{"zh":"被带走的刻度","en":"Carried marks"},"lesson":{"zh":"带方向的共享影响可以相互抵消，不必逐针直达。","en":"Signed shared effects can cancel without moving each hand directly."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"带方向的共享影响可以相互抵消，不必逐针直达。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Signed shared effects can cancel without moving each hand directly. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"gears","initial":[4,0,3],"target":[10,10,10],"vectors":[[1,-1,1],[0,2,1],[1,0,-1]]}},
{"ordinal":77,"title":{"zh":"保留一支","en":"Keep one hand"},"lesson":{"zh":"某根轴不影响一支针，先建立可保留的部分。","en":"An axle leaves one hand unchanged. Build a part you can preserve."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"某根轴不影响一支针，先建立可保留的部分。允许暂时退回，比较下一步会开放或破坏的关系。","en":"An axle leaves one hand unchanged. Build a part you can preserve. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"gears","initial":[8,6,11],"target":[10,10,10],"vectors":[[2,0,1],[1,1,0],[0,2,-1]]}},
{"ordinal":78,"title":{"zh":"容量与回路","en":"Capacity and cycles"},"lesson":{"zh":"条件之外仍有容量限制，满足一条约束不代表动作合法。","en":"A condition does not override capacity. Both constraints must hold."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"条件之外仍有容量限制，满足一条约束不代表动作合法。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A condition does not override capacity. Both constraints must hold. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"flow","initial":[18,4,14,4],"target":[10,10,10,10],"capacity":[18,14,18,14],"edges":[{"from":0,"to":1,"amount":3},{"from":1,"to":2,"amount":2,"when":{"cell":0,"min":4,"max":18}},{"from":2,"to":3,"amount":4},{"from":3,"to":0,"amount":1},{"from":0,"to":2,"amount":2}]}},
{"ordinal":79,"title":{"zh":"并行修正","en":"Parallel correction"},"lesson":{"zh":"四支针的变化共享三个轴，不能把每支当独立控制。","en":"Four hands share three axles. Treat them as a coupled system."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"四支针的变化共享三个轴，不能把每支当独立控制。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Four hands share three axles. Treat them as a coupled system. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"gears","initial":[7,5,11,9],"target":[10,10,10,10],"vectors":[[1,1,0,-1],[0,1,1,1],[1,0,2,0]]}},
{"ordinal":80,"title":{"zh":"打开又关上","en":"Open then close"},"lesson":{"zh":"先开放通路再归还条件格，完成时不要求所有门始终打开。","en":"Open a route, then restore the condition well. Gates need not stay open throughout."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"先开放通路再归还条件格，完成时不要求所有门始终打开。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Open a route, then restore the condition well. Gates need not stay open throughout. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"flow","initial":[2,16,6,16],"target":[6,8,12,14],"capacity":[16,16,18,18],"edges":[{"from":0,"to":1,"amount":2},{"from":1,"to":2,"amount":3,"when":{"cell":3,"min":8,"max":18}},{"from":2,"to":3,"amount":2},{"from":3,"to":0,"amount":1},{"from":1,"to":3,"amount":4}]}},
{"ordinal":81,"title":{"zh":"三层同向","en":"Three layers together"},"lesson":{"zh":"整体平移不能改变层间误差，先修相对位置。","en":"Global motion cannot change relative errors. Fix those first."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"整体平移不能改变层间误差，先修相对位置。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Global motion cannot change relative errors. Fix those first. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"paper","initial":[4,8,1],"target":1024,"masks":[13,82,1119],"coupling":[[1,1,1],[0,1,0],[0,0,1]]}},
{"ordinal":82,"title":{"zh":"两处余响","en":"Two residues"},"lesson":{"zh":"目标的两处亮点必须来自同一套叠加状态。","en":"Both target marks must arise from the same overlapping state."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"目标的两处亮点必须来自同一套叠加状态。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Both target marks must arise from the same overlapping state. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"paper","initial":[5,2,9],"target":1056,"masks":[138,641,1579],"coupling":[[1,1,0],[0,1,-1],[0,0,1]]}},
{"ordinal":83,"title":{"zh":"反折交汇","en":"Opposed folds"},"lesson":{"zh":"一层的修正带来另一层反向误差，利用共同移动补偿。","en":"An opposed shift creates another error. Compensate with common motion."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"一层的修正带来另一层反向误差，利用共同移动补偿。允许暂时退回，比较下一步会开放或破坏的关系。","en":"An opposed shift creates another error. Compensate with common motion. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"paper","initial":[1,7,9],"target":1024,"masks":[273,74,1371],"coupling":[[1,-1,1],[0,1,1],[0,0,1]]}},
{"ordinal":84,"title":{"zh":"不是全暗","en":"Not all dark"},"lesson":{"zh":"保留目标图案和消除多余信号是同等重要的目标。","en":"Preserving the target matters as much as removing stray marks."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"保留目标图案和消除多余信号是同等重要的目标。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Preserving the target matters as much as removing stray marks. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"weave","size":4,"initial":[4137],"target":27030,"masks":[19,39,78,140,305,626,1252,2248,4880,10016,20032,35968,12544,29184,58368,51200]}},
{"ordinal":85,"title":{"zh":"对称不是答案","en":"Symmetry is not enough"},"lesson":{"zh":"相对翻面保持对称，目标却要求精确位置。","en":"Paired flips preserve symmetry, but the target requires exact positions."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"相对翻面保持对称，目标却要求精确位置。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Paired flips preserve symmetry, but the target requires exact positions. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"weave","size":4,"initial":[17442],"target":38505,"masks":[32769,16386,8196,4104,2064,1056,576,384,384,576,1056,2064,4104,8196,16386,32769]}},
{"ordinal":86,"title":{"zh":"跨列回声","en":"Echo across columns"},"lesson":{"zh":"整列控制改变很多已正确格子，先用奇偶关系规划。","en":"A column changes correct cells too. Plan using parity."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"整列控制改变很多已正确格子，先用奇偶关系规划。允许暂时退回，比较下一步会开放或破坏的关系。","en":"A column changes correct cells too. Plan using parity. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"weave","size":4,"initial":[9377],"target":33825,"masks":[4383,8751,17487,34959,4593,8946,17652,35064,7953,12066,20292,36744,61713,61986,62532,63624]}},
{"ordinal":87,"title":{"zh":"三点同时","en":"Three marks together"},"lesson":{"zh":"多个目标增加的是同时约束，不是要求多按几次。","en":"Several targets impose simultaneous constraints, not a click quota."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"多个目标增加的是同时约束，不是要求多按几次。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Several targets impose simultaneous constraints, not a click quota. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"paper","initial":[2,5,8],"target":1096,"masks":[49,530,1643],"coupling":[[1,1,0],[0,1,1],[0,0,1]]}},
{"ordinal":88,"title":{"zh":"斜线留白","en":"Diagonal spaces"},"lesson":{"zh":"斜向连接使某些格子共享同一命运，先识别这些集合。","en":"Diagonal links make cells share effects. Identify those sets."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"斜向连接使某些格子共享同一命运，先识别这些集合。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Diagonal links make cells share effects. Identify those sets. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"weave","size":4,"initial":[48255],"target":36873,"masks":[33825,2130,420,4680,16914,34085,6730,9348,8484,21080,42145,18498,4680,9600,18960,33825]}},
{"ordinal":89,"title":{"zh":"回到十点","en":"Back to ten"},"lesson":{"zh":"把同向、反向与单层操作分开，最后才调整位置。","en":"Separate shared, opposed and independent motion before the final shift."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"把同向、反向与单层操作分开，最后才调整位置。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Separate shared, opposed and independent motion before the final shift. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"paper","initial":[7,3,10],"target":1024,"masks":[261,162,1447],"coupling":[[1,1,-1],[0,1,1],[0,0,1]]}},
{"ordinal":90,"title":{"zh":"纸的全貌","en":"The whole paper"},"lesson":{"zh":"不能只看目标亮点，还要检查每个非目标位置。","en":"Check every non-target slot, not only the bright targets."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"不能只看目标亮点，还要检查每个非目标位置。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Check every non-target slot, not only the bright targets. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"paper","initial":[3,8,5],"target":1552,"masks":[133,578,1239],"coupling":[[1,1,1],[0,1,-1],[0,0,1]]}},
{"ordinal":91,"title":{"zh":"关门之后","en":"After the gate"},"lesson":{"zh":"门开后的位置和回程共同决定能否保持条件。","en":"After opening a gate, position and return route determine the final state."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"门开后的位置和回程共同决定能否保持条件。允许暂时退回，比较下一步会开放或破坏的关系。","en":"After opening a gate, position and return route determine the final state. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.A.B","a#b#.","####c","E.C..","c####"],"initial":[0,0],"finalMask":3}},
{"ordinal":92,"title":{"zh":"把路还原","en":"Restore the path"},"lesson":{"zh":"终点之前还原开关，需要经过已改变的旧路。","en":"Restore switches before the goal by revisiting changed paths."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"终点之前还原开关，需要经过已改变的旧路。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Restore switches before the goal by revisiting changed paths. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.A.B","a#b#.","####c","E.C..","abc##"],"initial":[0,0],"finalMask":0}},
{"ordinal":93,"title":{"zh":"三页借位","en":"Three borrowed pages"},"lesson":{"zh":"用短交换创造长循环需要的临时顺序。","en":"Use a short swap to prepare a long cycle."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"用短交换创造长循环需要的临时顺序。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Use a short swap to prepare a long cycle. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[6,4,2,5,3,1],"target":[1,2,3,4,5,6],"cycles":[[0,1,2],[2,3,4],[1,4,5],[0,1]]}},
{"ordinal":94,"title":{"zh":"一个不动点","en":"One fixed point"},"lesson":{"zh":"找到能保持一支针的组合，再修正另外三支。","en":"Find a combination that preserves one hand while correcting the others."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"找到能保持一支针的组合，再修正另外三支。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Find a combination that preserves one hand while correcting the others. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"gears","initial":[11,5,0,1],"target":[2,6,10,0],"vectors":[[1,1,-1,0],[0,2,1,-1],[1,0,1,1]]}},
{"ordinal":95,"title":{"zh":"影子的余数","en":"Shadow residue"},"lesson":{"zh":"残留位置来自整套纸层关系，不是逐层匹配。","en":"Residual marks come from the whole layer system."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"残留位置来自整套纸层关系，不是逐层匹配。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Residual marks come from the whole layer system. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"paper","initial":[5,9,2],"target":1040,"masks":[165,594,1767],"coupling":[[1,-1,1],[0,1,1],[0,0,1]]}},
{"ordinal":96,"title":{"zh":"最后一块空白","en":"The last blank"},"lesson":{"zh":"局部留下的错格要通过共享操作处理，不能直接补。","en":"The last wrong cell still needs shared operations, not a direct patch."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"局部留下的错格要通过共享操作处理，不能直接补。允许暂时退回，比较下一步会开放或破坏的关系。","en":"The last wrong cell still needs shared operations, not a direct patch. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"weave","size":4,"initial":[58059],"target":61455,"masks":[19,39,78,140,305,626,1252,2248,4880,10016,20032,35968,12544,29184,58368,51200]}},
{"ordinal":97,"title":{"zh":"折回起点","en":"Fold to the start"},"lesson":{"zh":"长循环保存相对关系，边界交换修正最后的逆序。","en":"Long cycles preserve relationships; a boundary swap fixes the remaining inversion."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"长循环保存相对关系，边界交换修正最后的逆序。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Long cycles preserve relationships; a boundary swap fixes the remaining inversion. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"order","initial":[6,5,4,3,2,1],"target":[1,2,3,4,5,6],"cycles":[[0,1,2,3,4,5],[0,1],[2,3,4]]}},
{"ordinal":98,"title":{"zh":"记住三扇门","en":"Remember three gates"},"lesson":{"zh":"一个位置可能对应八种开关状态，规划的不只是路线长度。","en":"One position can have eight switch states. Plan more than distance."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"一个位置可能对应八种开关状态，规划的不只是路线长度。允许暂时退回，比较下一步会开放或破坏的关系。","en":"One position can have eight switch states. Plan more than distance. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"route","rows":["S.a..",".#A#.","b.#.c","B#.#C","....E"],"initial":[0,0],"finalMask":7}},
{"ordinal":99,"title":{"zh":"十点的合奏","en":"An ensemble at ten"},"lesson":{"zh":"四支指针同时满足，允许中途破坏已正确的指针。","en":"All four hands must agree; correct ones may need to move temporarily."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"四支指针同时满足，允许中途破坏已正确的指针。允许暂时退回，比较下一步会开放或破坏的关系。","en":"All four hands must agree; correct ones may need to move temporarily. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"gears","initial":[7,6,11,11],"target":[10,10,10,10],"vectors":[[1,1,0,-1],[0,1,1,0],[1,0,-1,1],[0,0,1,1]]}},
{"ordinal":100,"title":{"zh":"归还时间","en":"Return the time"},"lesson":{"zh":"容量、条件与守恒一起作用，先倒推最后一步再选择中转。","en":"Capacity, conditions and conservation interact. Work backward from the final transfer."},"misconception":{"zh":"眼前最接近目标的动作总是正确。","en":"The move nearest the goal is always best."},"counter":{"zh":"容量、条件与守恒一起作用，先倒推最后一步再选择中转。允许暂时退回，比较下一步会开放或破坏的关系。","en":"Capacity, conditions and conservation interact. Work backward from the final transfer. Allow a temporary retreat; compare the relationships the next move opens or breaks."},"puzzle":{"kind":"flow","initial":[18,4,14,4],"target":[10,10,10,10],"capacity":[18,14,18,14],"edges":[{"from":0,"to":1,"amount":3,"when":{"cell":2,"min":4,"max":12}},{"from":1,"to":2,"amount":2,"when":{"cell":3,"min":6,"max":14}},{"from":2,"to":3,"amount":4},{"from":3,"to":0,"amount":1},{"from":0,"to":2,"amount":2}]}},
];
