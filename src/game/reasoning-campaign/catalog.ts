import type { Level } from "./engine";

/** Fixed authored curriculum. See docs/contracts/reasoning-100-revised/. */
export const REASONING_CAMPAIGN: readonly Level[] = [
  {
    "ordinal": 1,
    "title": {
      "zh": "借来的秒",
      "en": "Borrowed seconds"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 B → C (3s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider B → C (3s). Compare their effects; the puzzle still needs your solution."
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
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        7,
        7
      ],
      "target": [
        10,
        10,
        10
      ],
      "capacity": [
        16,
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
    "ordinal": 3,
    "title": {
      "zh": "共享指针",
      "en": "Shared hands"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 +，再考虑 轴 2 +。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 +, then consider axle 2 +. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        8,
        9
      ],
      "target": [
        10,
        10
      ],
      "vectors": [
        [
          1,
          1
        ],
        [
          1,
          0
        ]
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
      "zh": "先将两层的共同墨点相消，只留下目标位置；偶数次重叠会消失。",
      "en": "Cancel shared ink and leave only the target marks. Even overlaps disappear."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        2,
        0
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
      "zh": "一格的邻居",
      "en": "Neighbors of a square"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 5。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 5. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 3,
      "initial": [
        273
      ],
      "target": 0,
      "masks": [
        11,
        23,
        38,
        89,
        186,
        308,
        200,
        464,
        416
      ]
    }
  },
  {
    "ordinal": 6,
    "title": {
      "zh": "相邻的页",
      "en": "Neighboring pages"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 2 → 1，再考虑 2 → 3 → 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 2 → 1, then consider 2 → 3 → 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        3,
        1,
        2
      ],
      "target": [
        1,
        2,
        3
      ],
      "cycles": [
        [
          0,
          1
        ],
        [
          1,
          2
        ]
      ]
    }
  },
  {
    "ordinal": 7,
    "title": {
      "zh": "墨迹开路",
      "en": "Ink opens a path"
    },
    "lesson": {
      "zh": "先看 同字母开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向右，再考虑 向右。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try right, then consider right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.a##",
        ".#.##",
        "..A.E",
        "##..#",
        "....."
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 1
    }
  },
  {
    "ordinal": 8,
    "title": {
      "zh": "一条回路",
      "en": "One circuit"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
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
          "amount": 1
        },
        {
          "from": 2,
          "to": 0,
          "amount": 3
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
      "zh": "先将两层的共同墨点相消，只留下目标位置；偶数次重叠会消失。",
      "en": "Cancel shared ink and leave only the target marks. Even overlaps disappear."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        4,
        0
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
      "zh": "反向齿轮",
      "en": "Counter rotation"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        0,
        8,
        10
      ],
      "target": [
        10,
        10,
        10
      ],
      "vectors": [
        [
          1,
          -1,
          0
        ],
        [
          0,
          1,
          1
        ],
        [
          1,
          0,
          -1
        ]
      ]
    }
  },
  {
    "ordinal": 11,
    "title": {
      "zh": "临时借位",
      "en": "Temporary room"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        6,
        8,
        10
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
    "ordinal": 12,
    "title": {
      "zh": "边界接回来",
      "en": "Across the boundary"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 3,
      "initial": [
        56
      ],
      "target": 0,
      "masks": [
        11,
        22,
        37,
        88,
        176,
        296,
        193,
        386,
        324
      ]
    }
  },
  {
    "ordinal": 13,
    "title": {
      "zh": "缺口相消",
      "en": "Cancelling gaps"
    },
    "lesson": {
      "zh": "先将两层的共同墨点相消，只留下目标位置；偶数次重叠会消失。",
      "en": "Cancel shared ink and leave only the target marks. Even overlaps disappear."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 右移，再考虑 B 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A right, then consider B left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        3,
        8
      ],
      "target": 1024,
      "masks": [
        21,
        1045
      ]
    }
  },
  {
    "ordinal": 14,
    "title": {
      "zh": "一折三页",
      "en": "A fold of three"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 3 → 4 → 5 → 3，再考虑 1 → 2 → 3 → 1。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 3 → 4 → 5 → 3, then consider 1 → 2 → 3 → 1. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        3,
        1,
        4,
        5,
        2
      ],
      "target": [
        1,
        2,
        3,
        4,
        5
      ],
      "cycles": [
        [
          0,
          1,
          2
        ],
        [
          2,
          3,
          4
        ],
        [
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 15,
    "title": {
      "zh": "再次经过",
      "en": "Passing again"
    },
    "lesson": {
      "zh": "先看 同字母开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向右，再考虑 向右。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try right, then consider right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "SaA",
        "##a",
        "E.."
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 0
    }
  },
  {
    "ordinal": 16,
    "title": {
      "zh": "大步小步",
      "en": "Large and small"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        2,
        0,
        10
      ],
      "target": [
        10,
        10,
        10
      ],
      "vectors": [
        [
          2,
          1,
          0
        ],
        [
          0,
          3,
          1
        ],
        [
          1,
          0,
          2
        ]
      ]
    }
  },
  {
    "ordinal": 17,
    "title": {
      "zh": "不同的终点",
      "en": "Different destinations"
    },
    "lesson": {
      "zh": "各格目标为 8 / 12 / 8 / 12；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 8 / 12 / 8 / 12. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        4,
        8,
        12
      ],
      "target": [
        8,
        12,
        8,
        12
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
          "to": 1,
          "amount": 2
        }
      ]
    }
  },
  {
    "ordinal": 18,
    "title": {
      "zh": "重叠的回声",
      "en": "Overlapping echoes"
    },
    "lesson": {
      "zh": "先将两层的共同墨点相消，只留下目标位置；偶数次重叠会消失。",
      "en": "Cancel shared ink and leave only the target marks. Even overlaps disappear."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        0,
        1,
        4
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
    "ordinal": 19,
    "title": {
      "zh": "留下一条线",
      "en": "Leave a line"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 4。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 4. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 3,
      "initial": [
        56
      ],
      "target": 7,
      "masks": [
        7,
        7,
        7,
        56,
        56,
        56,
        448,
        448,
        448
      ]
    }
  },
  {
    "ordinal": 20,
    "title": {
      "zh": "岔流",
      "en": "A fork in the flow"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        2,
        12
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
          "from": 0,
          "to": 2,
          "amount": 3
        },
        {
          "from": 1,
          "to": 2,
          "amount": 2
        },
        {
          "from": 2,
          "to": 0,
          "amount": 1
        }
      ]
    }
  },
  {
    "ordinal": 21,
    "title": {
      "zh": "两处留白",
      "en": "Two spaces"
    },
    "lesson": {
      "zh": "先将两层的共同墨点相消，只留下目标位置；偶数次重叠会消失。",
      "en": "Cancel shared ink and leave only the target marks. Even overlaps disappear."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        6,
        0
      ],
      "target": 1056,
      "masks": [
        137,
        1193
      ]
    }
  },
  {
    "ordinal": 22,
    "title": {
      "zh": "整圈归来",
      "en": "A full turn"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        8,
        9,
        2
      ],
      "target": [
        10,
        10,
        10
      ],
      "vectors": [
        [
          3,
          1,
          0
        ],
        [
          0,
          4,
          1
        ],
        [
          1,
          0,
          2
        ]
      ]
    }
  },
  {
    "ordinal": 23,
    "title": {
      "zh": "左右折口",
      "en": "Folds on both sides"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 2 → 3 → 1，再考虑 3 → 4 → 5 → 3。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 2 → 3 → 1, then consider 3 → 4 → 5 → 3. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        2,
        5,
        1,
        3,
        4
      ],
      "target": [
        1,
        2,
        3,
        4,
        5
      ],
      "cycles": [
        [
          0,
          1,
          2
        ],
        [
          2,
          3,
          4
        ],
        [
          1,
          3
        ]
      ]
    }
  },
  {
    "ordinal": 24,
    "title": {
      "zh": "门在远处",
      "en": "A distant gate"
    },
    "lesson": {
      "zh": "先看 同字母开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向右，再考虑 向右。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try right, then consider right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S..a",
        "###A",
        "E..."
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 1
    }
  },
  {
    "ordinal": 25,
    "title": {
      "zh": "回送",
      "en": "Return channel"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 B → A (2s)，再考虑 B → A (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try B → A (2s), then consider B → A (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        3,
        14,
        13
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
          "amount": 3
        },
        {
          "from": 1,
          "to": 0,
          "amount": 2
        },
        {
          "from": 1,
          "to": 2,
          "amount": 4
        },
        {
          "from": 2,
          "to": 0,
          "amount": 1
        }
      ]
    }
  },
  {
    "ordinal": 26,
    "title": {
      "zh": "斜着相连",
      "en": "Diagonal ties"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 3,
      "initial": [
        110
      ],
      "target": 0,
      "masks": [
        273,
        42,
        84,
        138,
        341,
        162,
        84,
        168,
        273
      ]
    }
  },
  {
    "ordinal": 27,
    "title": {
      "zh": "三层并行",
      "en": "Three in parallel"
    },
    "lesson": {
      "zh": "先将两层的共同墨点相消，只留下目标位置；偶数次重叠会消失。",
      "en": "Cancel shared ink and leave only the target marks. Even overlaps disappear."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        3,
        0,
        9
      ],
      "target": 1024,
      "masks": [
        37,
        146,
        1207
      ]
    }
  },
  {
    "ordinal": 28,
    "title": {
      "zh": "不同刻度",
      "en": "Different marks"
    },
    "lesson": {
      "zh": "目标刻度 2 / 6 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 2 / 6 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        6,
        10,
        10
      ],
      "target": [
        2,
        6,
        10
      ],
      "vectors": [
        [
          1,
          1,
          0
        ],
        [
          0,
          1,
          1
        ],
        [
          1,
          0,
          0
        ]
      ]
    }
  },
  {
    "ordinal": 29,
    "title": {
      "zh": "空格不是浪费",
      "en": "Empty space is useful"
    },
    "lesson": {
      "zh": "各格目标为 12 / 6 / 12；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 12 / 6 / 12. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        0,
        14
      ],
      "target": [
        12,
        6,
        12
      ],
      "capacity": [
        18,
        6,
        18
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
          "amount": 1
        }
      ]
    }
  },
  {
    "ordinal": 30,
    "title": {
      "zh": "翻过整页",
      "en": "Turn the whole sheet"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 2 → 3 → 4 → 5 → 1，再考虑 1 → 2 → 3 → 4 → 5 → 1。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 2 → 3 → 4 → 5 → 1, then consider 1 → 2 → 3 → 4 → 5 → 1. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        5,
        1,
        2,
        3,
        4
      ],
      "target": [
        1,
        2,
        3,
        4,
        5
      ],
      "cycles": [
        [
          0,
          1,
          2,
          3,
          4
        ],
        [
          0,
          1
        ],
        [
          2,
          3
        ]
      ]
    }
  },
  {
    "ordinal": 31,
    "title": {
      "zh": "两扇门",
      "en": "Two gates"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向右，再考虑 向右。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try right, then consider right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.a#.",
        ".#.#.",
        "b#A#.",
        "..B..",
        "..#.E"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 3
    }
  },
  {
    "ordinal": 32,
    "title": {
      "zh": "整行整列",
      "en": "Rows and columns"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 3,
      "initial": [
        273
      ],
      "target": 0,
      "masks": [
        79,
        151,
        295,
        121,
        186,
        316,
        457,
        466,
        484
      ]
    }
  },
  {
    "ordinal": 33,
    "title": {
      "zh": "一起移动",
      "en": "Moving together"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 右移，再考虑 A 右移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A right, then consider A right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        6,
        1,
        4
      ],
      "target": 1024,
      "masks": [
        73,
        146,
        194
      ],
      "coupling": [
        [
          1,
          1,
          0
        ],
        [
          0,
          1,
          0
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 34,
    "title": {
      "zh": "第四支针",
      "en": "The fourth hand"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        2,
        2,
        10,
        10
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "vectors": [
        [
          1,
          1,
          0,
          0
        ],
        [
          0,
          1,
          1,
          0
        ],
        [
          0,
          0,
          1,
          1
        ],
        [
          1,
          0,
          0,
          0
        ]
      ]
    }
  },
  {
    "ordinal": 35,
    "title": {
      "zh": "双环",
      "en": "Two loops"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        15,
        5,
        10,
        10
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "capacity": [
        18,
        14,
        18,
        14
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 2
        },
        {
          "from": 1,
          "to": 0,
          "amount": 3
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
          "to": 1,
          "amount": 1
        }
      ]
    }
  },
  {
    "ordinal": 36,
    "title": {
      "zh": "远处的折痕",
      "en": "A distant crease"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 3 → 1，再考虑 2 → 4 → 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 3 → 1, then consider 2 → 4 → 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        5,
        4,
        3,
        2,
        1
      ],
      "target": [
        1,
        2,
        3,
        4,
        5
      ],
      "cycles": [
        [
          0,
          2
        ],
        [
          1,
          3
        ],
        [
          2,
          4
        ],
        [
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 37,
    "title": {
      "zh": "借道返回",
      "en": "Borrow the return path"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向右，再考虑 向右。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try right, then consider right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.a#.",
        ".#.#.",
        "...A.",
        "b###.",
        "..B.E"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 3
    }
  },
  {
    "ordinal": 38,
    "title": {
      "zh": "不动的中心",
      "en": "The center stays"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 3,
      "initial": [
        297
      ],
      "target": 0,
      "masks": [
        10,
        21,
        34,
        81,
        170,
        276,
        136,
        336,
        160
      ]
    }
  },
  {
    "ordinal": 39,
    "title": {
      "zh": "逆向纸边",
      "en": "Opposite edges"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 右移，再考虑 A 右移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A right, then consider A right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        6,
        5,
        4
      ],
      "target": 1024,
      "masks": [
        73,
        146,
        194
      ],
      "coupling": [
        [
          1,
          -1,
          0
        ],
        [
          0,
          1,
          0
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 40,
    "title": {
      "zh": "跨过邻居",
      "en": "Skip a neighbor"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        7,
        10,
        7
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "capacity": [
        16,
        18,
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
          "to": 3,
          "amount": 3
        },
        {
          "from": 3,
          "to": 2,
          "amount": 2
        },
        {
          "from": 2,
          "to": 0,
          "amount": 1
        },
        {
          "from": 1,
          "to": 2,
          "amount": 4
        }
      ]
    }
  },
  {
    "ordinal": 41,
    "title": {
      "zh": "绕开中心",
      "en": "Around the center"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 +，再考虑 轴 3 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 +, then consider axle 3 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        3,
        4,
        8
      ],
      "target": [
        10,
        10,
        10
      ],
      "vectors": [
        [
          1,
          0,
          2
        ],
        [
          0,
          1,
          1
        ],
        [
          1,
          1,
          0
        ]
      ]
    }
  },
  {
    "ordinal": 42,
    "title": {
      "zh": "先开哪扇",
      "en": "Which gate first"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向右，再考虑 向右。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try right, then consider right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.a##",
        ".##.#",
        "..Ab.",
        "##.#B",
        "....E"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 3
    }
  },
  {
    "ordinal": 43,
    "title": {
      "zh": "传递位移",
      "en": "Passing motion"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        10,
        2,
        4
      ],
      "target": 1024,
      "masks": [
        11,
        208,
        1243
      ],
      "coupling": [
        [
          1,
          1,
          0
        ],
        [
          0,
          1,
          1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 44,
    "title": {
      "zh": "对面的自己",
      "en": "Your opposite"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 3,
      "initial": [
        471
      ],
      "target": 0,
      "masks": [
        257,
        130,
        68,
        40,
        16,
        40,
        68,
        130,
        257
      ]
    }
  },
  {
    "ordinal": 45,
    "title": {
      "zh": "六页一册",
      "en": "A book of six"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5 / 6。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5 / 6. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 2 → 3 → 1，再考虑 3 → 4 → 3。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 2 → 3 → 1, then consider 3 → 4 → 3. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        1,
        6,
        3,
        2,
        4,
        5
      ],
      "target": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "cycles": [
        [
          0,
          1,
          2
        ],
        [
          3,
          4,
          5
        ],
        [
          2,
          3
        ],
        [
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 46,
    "title": {
      "zh": "先出后进",
      "en": "Out before in"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 B → C (2s)，再考虑 A → B (3s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try B → C (2s), then consider A → B (3s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        9,
        11,
        10
      ],
      "target": [
        10,
        10,
        10
      ],
      "capacity": [
        12,
        12,
        18
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 3
        },
        {
          "from": 1,
          "to": 2,
          "amount": 2
        },
        {
          "from": 2,
          "to": 0,
          "amount": 2
        },
        {
          "from": 0,
          "to": 2,
          "amount": 1
        }
      ]
    }
  },
  {
    "ordinal": 47,
    "title": {
      "zh": "整张纸",
      "en": "The whole sheet"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 右移，再考虑 A 右移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A right, then consider A right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        1,
        6,
        9
      ],
      "target": 1024,
      "masks": [
        131,
        13,
        3176
      ],
      "coupling": [
        [
          1,
          1,
          1
        ],
        [
          0,
          1,
          0
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 48,
    "title": {
      "zh": "互为反向",
      "en": "Opposed pairs"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 +，再考虑 轴 1 +。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 +, then consider axle 1 +. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        4,
        11,
        9
      ],
      "target": [
        10,
        10,
        10
      ],
      "vectors": [
        [
          1,
          -1,
          0
        ],
        [
          0,
          1,
          -1
        ],
        [
          1,
          1,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 49,
    "title": {
      "zh": "保持敞开",
      "en": "Keep it open"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向右，再考虑 向右。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try right, then consider right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S..a#",
        "##.#.",
        "..A..",
        ".#B#.",
        "b...E"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 3
    }
  },
  {
    "ordinal": 50,
    "title": {
      "zh": "更宽的纸",
      "en": "A wider sheet"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 4。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 4. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 4,
      "initial": [
        19629
      ],
      "target": 0,
      "masks": [
        19,
        39,
        78,
        140,
        305,
        626,
        1252,
        2248,
        4880,
        10016,
        20032,
        35968,
        12544,
        29184,
        58368,
        51200
      ]
    }
  },
  {
    "ordinal": 51,
    "title": {
      "zh": "没有平均",
      "en": "Not an average"
    },
    "lesson": {
      "zh": "各格目标为 6 / 8 / 12 / 14；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 6 / 8 / 12 / 14. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 B → C (3s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try B → C (3s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        2,
        16,
        6,
        16
      ],
      "target": [
        6,
        8,
        12,
        14
      ],
      "capacity": [
        16,
        16,
        18,
        18
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
          "to": 3,
          "amount": 2
        },
        {
          "from": 3,
          "to": 0,
          "amount": 1
        },
        {
          "from": 1,
          "to": 3,
          "amount": 4
        }
      ]
    }
  },
  {
    "ordinal": 52,
    "title": {
      "zh": "移动空隙",
      "en": "Move the gap"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5 / 6。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5 / 6. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 2 → 3 → 4 → 2，再考虑 1 → 2 → 1。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 2 → 3 → 4 → 2, then consider 1 → 2 → 1. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        2,
        4,
        6,
        1,
        3,
        5
      ],
      "target": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "cycles": [
        [
          0,
          1
        ],
        [
          1,
          2,
          3
        ],
        [
          3,
          4,
          5
        ],
        [
          2,
          4
        ]
      ]
    }
  },
  {
    "ordinal": 53,
    "title": {
      "zh": "双目标联动",
      "en": "Coupled targets"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        6,
        10,
        10
      ],
      "target": 1056,
      "masks": [
        37,
        146,
        1175
      ],
      "coupling": [
        [
          1,
          1,
          0
        ],
        [
          0,
          1,
          1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 54,
    "title": {
      "zh": "双倍回声",
      "en": "Double echo"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        10,
        6,
        11,
        10
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "vectors": [
        [
          2,
          1,
          0,
          0
        ],
        [
          0,
          2,
          1,
          0
        ],
        [
          0,
          0,
          2,
          1
        ],
        [
          1,
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 55,
    "title": {
      "zh": "亮面边框",
      "en": "A lit border"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 4,
      "initial": [
        1647
      ],
      "target": 63903,
      "masks": [
        8751,
        17487,
        34959,
        4383,
        8946,
        17652,
        35064,
        4593,
        12066,
        20292,
        36744,
        7953,
        61986,
        62532,
        63624,
        61713
      ]
    }
  },
  {
    "ordinal": 56,
    "title": {
      "zh": "来路也会改变",
      "en": "The way back changes"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向下，再考虑 向上。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try down, then consider up. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.A.B",
        "a#b#.",
        "####.",
        "a.b..",
        "....E"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 0
    }
  },
  {
    "ordinal": 57,
    "title": {
      "zh": "窄口",
      "en": "Narrow mouth"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        14,
        8,
        8
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
    "ordinal": 58,
    "title": {
      "zh": "交叉之后",
      "en": "After the crossing"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        2,
        4,
        4
      ],
      "target": 1024,
      "masks": [
        81,
        266,
        1371
      ],
      "coupling": [
        [
          1,
          0,
          -1
        ],
        [
          0,
          1,
          1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 59,
    "title": {
      "zh": "对折与绕行",
      "en": "Fold and circle"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5 / 6。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5 / 6. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 2 → 3 → 4 → 5 → 6 → 1，再考虑 1 → 2 → 3 → 4 → 5 → 6 → 1。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 2 → 3 → 4 → 5 → 6 → 1, then consider 1 → 2 → 3 → 4 → 5 → 6 → 1. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        6,
        1,
        2,
        3,
        4,
        5
      ],
      "target": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "cycles": [
        [
          0,
          1,
          2,
          3,
          4,
          5
        ],
        [
          0,
          3
        ],
        [
          1,
          2
        ]
      ]
    }
  },
  {
    "ordinal": 60,
    "title": {
      "zh": "翻面的和声",
      "en": "A chorus of folds"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 3。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 3. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 4,
      "initial": [
        2574
      ],
      "target": 1632,
      "masks": [
        4383,
        8751,
        17487,
        34959,
        4593,
        8946,
        17652,
        35064,
        7953,
        12066,
        20292,
        36744,
        61713,
        61986,
        62532,
        63624
      ]
    }
  },
  {
    "ordinal": 61,
    "title": {
      "zh": "有条件的河",
      "en": "A conditional river"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 B → C (3s)，再考虑 B → C (3s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try B → C (3s), then consider B → C (3s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        13,
        1
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
          "amount": 2,
          "when": {
            "cell": 2,
            "min": 8,
            "max": 12
          }
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
    "ordinal": 62,
    "title": {
      "zh": "被带走的刻度",
      "en": "Carried marks"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        4,
        0,
        3
      ],
      "target": [
        10,
        10,
        10
      ],
      "vectors": [
        [
          1,
          -1,
          1
        ],
        [
          0,
          2,
          1
        ],
        [
          1,
          0,
          -1
        ]
      ]
    }
  },
  {
    "ordinal": 63,
    "title": {
      "zh": "纸层合奏",
      "en": "Paper ensemble"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        3,
        7,
        9
      ],
      "target": 1096,
      "masks": [
        67,
        290,
        1321
      ],
      "coupling": [
        [
          1,
          1,
          1
        ],
        [
          0,
          1,
          -1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 64,
    "title": {
      "zh": "交错通路",
      "en": "Interlaced paths"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向右，再考虑 向右。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try right, then consider right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "Sa...",
        "##.#.",
        "b.A..",
        ".#B##",
        "....E"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 3
    }
  },
  {
    "ordinal": 65,
    "title": {
      "zh": "三处重叠",
      "en": "Three overlaps"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5 / 6。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5 / 6. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 2 → 3 → 1，再考虑 1 → 2 → 3 → 1。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 2 → 3 → 1, then consider 1 → 2 → 3 → 1. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        4,
        6,
        2,
        5,
        1,
        3
      ],
      "target": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "cycles": [
        [
          0,
          1,
          2
        ],
        [
          2,
          3,
          4
        ],
        [
          4,
          5,
          0
        ],
        [
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 66,
    "title": {
      "zh": "不是全暗",
      "en": "Not all dark"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 4,
      "initial": [
        39594
      ],
      "target": 27030,
      "masks": [
        4123,
        8231,
        16462,
        32909,
        433,
        626,
        1252,
        2264,
        6928,
        10016,
        20032,
        36224,
        45313,
        29186,
        58372,
        55304
      ]
    }
  },
  {
    "ordinal": 67,
    "title": {
      "zh": "借到钥匙",
      "en": "Borrow a condition"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
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
          "amount": 3,
          "when": {
            "cell": 0,
            "min": 8,
            "max": 16
          }
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
    "ordinal": 68,
    "title": {
      "zh": "三层同向",
      "en": "Three layers together"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        6,
        7,
        6
      ],
      "target": 1024,
      "masks": [
        13,
        82,
        1119
      ],
      "coupling": [
        [
          1,
          1,
          1
        ],
        [
          0,
          1,
          0
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 69,
    "title": {
      "zh": "保留一支",
      "en": "Keep one hand"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        11,
        11,
        4
      ],
      "target": [
        10,
        10,
        10
      ],
      "vectors": [
        [
          2,
          0,
          1
        ],
        [
          1,
          1,
          0
        ],
        [
          0,
          2,
          -1
        ]
      ]
    }
  },
  {
    "ordinal": 70,
    "title": {
      "zh": "合上书脊",
      "en": "Close the spine"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5 / 6。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5 / 6. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 2 → 3 → 4 → 1，再考虑 2 → 3 → 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 2 → 3 → 4 → 1, then consider 2 → 3 → 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        5,
        3,
        6,
        2,
        4,
        1
      ],
      "target": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "cycles": [
        [
          0,
          1,
          2,
          3
        ],
        [
          2,
          3,
          4,
          5
        ],
        [
          0,
          5
        ],
        [
          1,
          2
        ]
      ]
    }
  },
  {
    "ordinal": 71,
    "title": {
      "zh": "墨水记得",
      "en": "Ink remembers"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向下，再考虑 向上。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try down, then consider up. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.A.B",
        "a#b#.",
        "####c",
        "E.C..",
        "#####"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 7
    }
  },
  {
    "ordinal": 72,
    "title": {
      "zh": "对称不是答案",
      "en": "Symmetry is not enough"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 4,
      "initial": [
        17442
      ],
      "target": 38505,
      "masks": [
        32769,
        16386,
        8196,
        4104,
        2064,
        1056,
        576,
        384,
        384,
        576,
        1056,
        2064,
        4104,
        8196,
        16386,
        32769
      ]
    }
  },
  {
    "ordinal": 73,
    "title": {
      "zh": "窗口会关闭",
      "en": "The window closes"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        12,
        10,
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
          "amount": 4,
          "when": {
            "cell": 2,
            "min": 8,
            "max": 12
          }
        }
      ]
    }
  },
  {
    "ordinal": 74,
    "title": {
      "zh": "两处余响",
      "en": "Two residues"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        6,
        7,
        11
      ],
      "target": 1056,
      "masks": [
        138,
        641,
        1579
      ],
      "coupling": [
        [
          1,
          1,
          0
        ],
        [
          0,
          1,
          -1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 75,
    "title": {
      "zh": "并行修正",
      "en": "Parallel correction"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        4,
        6,
        0,
        6
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "vectors": [
        [
          1,
          1,
          0,
          -1
        ],
        [
          0,
          1,
          1,
          1
        ],
        [
          1,
          0,
          2,
          0
        ]
      ]
    }
  },
  {
    "ordinal": 76,
    "title": {
      "zh": "三页借位",
      "en": "Three borrowed pages"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5 / 6。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5 / 6. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 1 → 2 → 3 → 1，再考虑 2 → 5 → 6 → 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 1 → 2 → 3 → 1, then consider 2 → 5 → 6 → 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        6,
        4,
        2,
        5,
        3,
        1
      ],
      "target": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "cycles": [
        [
          0,
          1,
          2
        ],
        [
          2,
          3,
          4
        ],
        [
          1,
          4,
          5
        ],
        [
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 77,
    "title": {
      "zh": "两处门槛",
      "en": "Two thresholds"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
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
        16,
        16,
        16
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 2,
          "when": {
            "cell": 2,
            "min": 4,
            "max": 14
          }
        },
        {
          "from": 1,
          "to": 2,
          "amount": 3,
          "when": {
            "cell": 0,
            "min": 6,
            "max": 16
          }
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
    "ordinal": 78,
    "title": {
      "zh": "对面的回声",
      "en": "Echoes opposite"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 4,
      "initial": [
        31636
      ],
      "target": 33825,
      "masks": [
        32787,
        16423,
        8270,
        4236,
        2353,
        1650,
        1764,
        2504,
        5008,
        10080,
        20064,
        35984,
        12552,
        29188,
        58370,
        51201
      ]
    }
  },
  {
    "ordinal": 79,
    "title": {
      "zh": "反折交汇",
      "en": "Opposed folds"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        6,
        6,
        6
      ],
      "target": 1024,
      "masks": [
        273,
        74,
        1371
      ],
      "coupling": [
        [
          1,
          -1,
          1
        ],
        [
          0,
          1,
          1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 80,
    "title": {
      "zh": "关门之后",
      "en": "After the gate"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向下，再考虑 向上。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try down, then consider up. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.A.B",
        "a#b#.",
        "####c",
        "E.C..",
        "c####"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 3
    }
  },
  {
    "ordinal": 81,
    "title": {
      "zh": "中转许可证",
      "en": "A buffer condition"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 C → D (4s)，再考虑 C → D (4s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try C → D (4s), then consider C → D (4s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        14,
        8,
        2
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
          "amount": 3
        },
        {
          "from": 1,
          "to": 2,
          "amount": 2,
          "when": {
            "cell": 3,
            "min": 8,
            "max": 12
          }
        },
        {
          "from": 2,
          "to": 3,
          "amount": 4
        },
        {
          "from": 3,
          "to": 0,
          "amount": 1
        }
      ]
    }
  },
  {
    "ordinal": 82,
    "title": {
      "zh": "三点同时",
      "en": "Three marks together"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        2,
        5,
        8
      ],
      "target": 1096,
      "masks": [
        49,
        530,
        1643
      ],
      "coupling": [
        [
          1,
          1,
          0
        ],
        [
          0,
          1,
          1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 83,
    "title": {
      "zh": "轴心不动",
      "en": "A still center"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        5,
        3,
        9,
        0
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "vectors": [
        [
          1,
          1,
          -1,
          0
        ],
        [
          0,
          1,
          1,
          -1
        ],
        [
          1,
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 84,
    "title": {
      "zh": "斜线留白",
      "en": "Diagonal spaces"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 4,
      "initial": [
        51361
      ],
      "target": 36873,
      "masks": [
        33825,
        2130,
        420,
        4680,
        16914,
        34085,
        6730,
        9348,
        8484,
        21080,
        42145,
        18498,
        4680,
        9600,
        18960,
        33825
      ]
    }
  },
  {
    "ordinal": 85,
    "title": {
      "zh": "折回起点",
      "en": "Fold to the start"
    },
    "lesson": {
      "zh": "页片沿箭头循环；目标顺序为 1 / 2 / 3 / 4 / 5 / 6。可以暂时移动已经归位的页片。",
      "en": "Pages cycle along each arrow. Target order: 1 / 2 / 3 / 4 / 5 / 6. A correct page may need to move temporarily."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 3 → 4 → 5 → 3，再考虑 1 → 2 → 3 → 4 → 5 → 6 → 1。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try 3 → 4 → 5 → 3, then consider 1 → 2 → 3 → 4 → 5 → 6 → 1. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "order",
      "initial": [
        6,
        5,
        4,
        3,
        2,
        1
      ],
      "target": [
        1,
        2,
        3,
        4,
        5,
        6
      ],
      "cycles": [
        [
          0,
          1,
          2,
          3,
          4,
          5
        ],
        [
          0,
          1
        ],
        [
          2,
          3,
          4
        ]
      ]
    }
  },
  {
    "ordinal": 86,
    "title": {
      "zh": "把路还原",
      "en": "Restore the path"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向下，再考虑 向上。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try down, then consider up. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.A.B",
        "a#b#.",
        "####c",
        "E.C..",
        "abc##"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 0
    }
  },
  {
    "ordinal": 87,
    "title": {
      "zh": "容量与回路",
      "en": "Capacity and cycles"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (3s)，再考虑 A → B (3s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (3s), then consider A → B (3s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        17,
        5,
        14,
        4
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "capacity": [
        18,
        14,
        18,
        14
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 3
        },
        {
          "from": 1,
          "to": 2,
          "amount": 2,
          "when": {
            "cell": 3,
            "min": 8,
            "max": 12
          }
        },
        {
          "from": 2,
          "to": 3,
          "amount": 4
        },
        {
          "from": 3,
          "to": 0,
          "amount": 1
        },
        {
          "from": 0,
          "to": 2,
          "amount": 2
        }
      ]
    }
  },
  {
    "ordinal": 88,
    "title": {
      "zh": "回到十点",
      "en": "Back to ten"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 右移，再考虑 A 右移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A right, then consider A right. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        7,
        3,
        10
      ],
      "target": 1024,
      "masks": [
        261,
        162,
        1447
      ],
      "coupling": [
        [
          1,
          1,
          -1
        ],
        [
          0,
          1,
          1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 89,
    "title": {
      "zh": "一个不动点",
      "en": "One fixed point"
    },
    "lesson": {
      "zh": "目标刻度 2 / 6 / 10 / 0。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 2 / 6 / 10 / 0. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 −，再考虑 轴 1 −。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 −, then consider axle 1 −. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        11,
        5,
        0,
        1
      ],
      "target": [
        2,
        6,
        10,
        0
      ],
      "vectors": [
        [
          1,
          1,
          -1,
          0
        ],
        [
          0,
          2,
          1,
          -1
        ],
        [
          1,
          0,
          1,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 90,
    "title": {
      "zh": "最后一块空白",
      "en": "The last blank"
    },
    "lesson": {
      "zh": "观察格 1 标出的翻转范围；重叠部分翻两次会复原，不必逐格修正。",
      "en": "Inspect cell 1's affected cells. Overlaps flipped twice return to their original state; do not fix cells independently."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 格 1，再考虑 格 2。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try cell 1, then consider cell 2. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "weave",
      "size": 4,
      "initial": [
        1726
      ],
      "target": 61455,
      "masks": [
        32819,
        16487,
        8398,
        4492,
        2865,
        626,
        3812,
        6600,
        13200,
        26464,
        52832,
        35985,
        12554,
        29184,
        58378,
        51217
      ]
    }
  },
  {
    "ordinal": 91,
    "title": {
      "zh": "打开又关上",
      "en": "Open then close"
    },
    "lesson": {
      "zh": "各格目标为 6 / 8 / 12 / 14；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 6 / 8 / 12 / 14. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 D → A (1s)，再考虑 D → A (1s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try D → A (1s), then consider D → A (1s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        2,
        16,
        6,
        16
      ],
      "target": [
        6,
        8,
        12,
        14
      ],
      "capacity": [
        16,
        16,
        18,
        18
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
          "amount": 3,
          "when": {
            "cell": 3,
            "min": 8,
            "max": 12
          }
        },
        {
          "from": 2,
          "to": 3,
          "amount": 2
        },
        {
          "from": 3,
          "to": 0,
          "amount": 1
        },
        {
          "from": 1,
          "to": 3,
          "amount": 4
        }
      ]
    }
  },
  {
    "ordinal": 92,
    "title": {
      "zh": "影子的余数",
      "en": "Shadow residue"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 右移，再考虑 B 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A right, then consider B left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        5,
        9,
        2
      ],
      "target": 1040,
      "masks": [
        165,
        594,
        1767
      ],
      "coupling": [
        [
          1,
          -1,
          1
        ],
        [
          0,
          1,
          1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 93,
    "title": {
      "zh": "记住三扇门",
      "en": "Remember three gates"
    },
    "lesson": {
      "zh": "先看 多组开关与门；走到 E 还必须满足下方最终门状态。",
      "en": "Match each lowercase switch to its uppercase gate. Reaching E also requires the displayed final gate states."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 向下，再考虑 向下。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try down, then consider down. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "route",
      "rows": [
        "S.a..",
        ".#A#.",
        "b.#.c",
        "B#.#C",
        "....E"
      ],
      "initial": [
        0,
        0
      ],
      "finalMask": 7
    }
  },
  {
    "ordinal": 94,
    "title": {
      "zh": "返回之前",
      "en": "Before returning"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (2s)，再考虑 A → B (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (2s), then consider A → B (2s). Compare their effects; the puzzle still needs your solution."
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
          "amount": 2,
          "when": {
            "cell": 2,
            "min": 8,
            "max": 12
          }
        },
        {
          "from": 1,
          "to": 2,
          "amount": 3,
          "when": {
            "cell": 0,
            "min": 6,
            "max": 14
          }
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
    "ordinal": 95,
    "title": {
      "zh": "纸的全貌",
      "en": "The whole paper"
    },
    "lesson": {
      "zh": "先看右移联动表；移动一层会带动别层。投影中偶数次重叠相消。",
      "en": "Use the coupling labels: a shift can move other layers. Even overlaps cancel in the projection."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 左移，再考虑 A 左移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A left, then consider A left. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "paper",
      "initial": [
        6,
        8,
        4
      ],
      "target": 1552,
      "masks": [
        133,
        578,
        1239
      ],
      "coupling": [
        [
          1,
          1,
          1
        ],
        [
          0,
          1,
          -1
        ],
        [
          0,
          0,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 96,
    "title": {
      "zh": "第四个位置",
      "en": "A fourth place"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 B → C (2s)，再考虑 B → C (2s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try B → C (2s), then consider B → C (2s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        16,
        16,
        2,
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
          "amount": 3,
          "when": {
            "cell": 3,
            "min": 8,
            "max": 12
          }
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
          "amount": 1
        }
      ]
    }
  },
  {
    "ordinal": 97,
    "title": {
      "zh": "十点的合奏",
      "en": "An ensemble at ten"
    },
    "lesson": {
      "zh": "目标刻度 10 / 10 / 10 / 10。每条轴标明所有联动量；跨过 11 会回到 0。",
      "en": "Target marks: 10 / 10 / 10 / 10. Read every axle's coupled changes; after 11 comes 0."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 轴 1 +，再考虑 轴 2 +。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try axle 1 +, then consider axle 2 +. Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "gears",
      "initial": [
        7,
        6,
        11,
        11
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "vectors": [
        [
          1,
          1,
          0,
          -1
        ],
        [
          0,
          1,
          1,
          0
        ],
        [
          1,
          0,
          -1,
          1
        ],
        [
          0,
          0,
          1,
          1
        ]
      ]
    }
  },
  {
    "ordinal": 98,
    "title": {
      "zh": "留出十秒",
      "en": "Room for ten"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A → B (3s)，再考虑 A → B (3s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A → B (3s), then consider A → B (3s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        18,
        4,
        14,
        4
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "capacity": [
        18,
        14,
        18,
        14
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 3
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
          "amount": 1
        },
        {
          "from": 0,
          "to": 2,
          "amount": 2
        }
      ]
    }
  },
  {
    "ordinal": 99,
    "title": {
      "zh": "第三层",
      "en": "The third layer"
    },
    "lesson": {
      "zh": "先将两层的共同墨点相消，只留下目标位置；偶数次重叠会消失。",
      "en": "Cancel shared ink and leave only the target marks. Even overlaps disappear."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 A 右移，再考虑 A 右移。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try A right, then consider A right. Compare their effects; the puzzle still needs your solution."
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
    "ordinal": 100,
    "title": {
      "zh": "归还时间",
      "en": "Return the time"
    },
    "lesson": {
      "zh": "各格目标为 10 / 10 / 10 / 10；转移量固定，腾出的空位也属于解法。",
      "en": "Targets: 10 / 10 / 10 / 10. Transfers are fixed amounts; free capacity is part of the solution."
    },
    "misconception": {
      "zh": "只追求眼前对齐，忽略其他位置的联动或最终约束。",
      "en": "A locally correct move can disturb another position or the final constraints."
    },
    "counter": {
      "zh": "从初始布局可先尝试 C → D (4s)，再考虑 A → B (3s)。观察两步之间的关系；这不是自动解答。",
      "en": "From the initial layout, try C → D (4s), then consider A → B (3s). Compare their effects; the puzzle still needs your solution."
    },
    "puzzle": {
      "kind": "flow",
      "initial": [
        18,
        4,
        14,
        4
      ],
      "target": [
        10,
        10,
        10,
        10
      ],
      "capacity": [
        18,
        14,
        18,
        14
      ],
      "edges": [
        {
          "from": 0,
          "to": 1,
          "amount": 3,
          "when": {
            "cell": 2,
            "min": 4,
            "max": 12
          }
        },
        {
          "from": 1,
          "to": 2,
          "amount": 2,
          "when": {
            "cell": 3,
            "min": 6,
            "max": 14
          }
        },
        {
          "from": 2,
          "to": 3,
          "amount": 4
        },
        {
          "from": 3,
          "to": 0,
          "amount": 1
        },
        {
          "from": 0,
          "to": 2,
          "amount": 2
        }
      ]
    }
  }
];
