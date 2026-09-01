export type SpatialConnector = "orbit" | "hinge" | "ray" | "ribbon" | "stack" | "constellation";
export type SpatialDepthPattern = "front-back" | "ascending" | "alternating" | "inset" | "radial";

export interface FullSpatialLevelDirection {
  id: number;
  traceKey: `TH-SP-${string}`;
  spatialThesis: string;
  signatureSilhouette: string;
  completionGeometry: string;
  connector: SpatialConnector;
  anchorCount: number;
  depthPattern: SpatialDepthPattern;
  stateGeometry: {
    idleLift: number;
    runningPull: number;
    successLock: number;
    missRebound: number;
  };
}

// Generated from the approved per-level design freeze. This is the explicit
// design-to-implementation bridge; it is intentionally one record per level.
export const FULL_SPATIAL_LEVEL_DIRECTIONS = [
  {
    "id": 1,
    "traceKey": "TH-SP-001",
    "spatialThesis": "同一厚纸框剥离出一枚有纸背的角",
    "signatureSilhouette": "三角纸框加一枚外角",
    "completionGeometry": "完成后游离折角必须为 0；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 3,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 12,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 2,
    "traceKey": "TH-SP-002",
    "spatialThesis": "两片薄膜肺叶从压扁层恢复，气泡由深层浮出",
    "signatureSilhouette": "对开纸叶与窄缝",
    "completionGeometry": "有意义输入重置；后台不计时；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 2,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 14,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 3,
    "traceKey": "TH-SP-003",
    "spatialThesis": "四枚活版字模从快速前景落入同一慢焦平面",
    "signatureSilhouette": "四枚活版字牌",
    "completionGeometry": "不新增输入框；双语提示渐进出现；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "constellation",
    "anchorCount": 4,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 16,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 4,
    "traceKey": "TH-SP-004",
    "spatialThesis": "圆片在前层移动，原影保持在后层浅窝",
    "signatureSilhouette": "三圆片与斜长影",
    "completionGeometry": "不能按大小排序误通关；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 3,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 18,
      "successLock": 14,
      "missRebound": 6
    }
  },
  {
    "id": 5,
    "traceKey": "TH-SP-005",
    "spatialThesis": "琥珀灯是可移动体积光，砝码保持同一深度",
    "signatureSilhouette": "三角悬架与琥珀灯",
    "completionGeometry": "WebGL 只画光，不命中砝码；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 3,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 10,
      "successLock": 17,
      "missRebound": 8
    }
  },
  {
    "id": 6,
    "traceKey": "TH-SP-006",
    "spatialThesis": "雾纸悬在数字前一层，墨痕在其背面连续显露",
    "signatureSilhouette": "雾面与单一零环",
    "completionGeometry": "HTML/SVG 负责轨迹；Canvas 不判定；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 12,
      "successLock": 20,
      "missRebound": 4
    }
  },
  {
    "id": 7,
    "traceKey": "TH-SP-007",
    "spatialThesis": "空窗框有厚边，完整窗影延伸到页面外侧平面",
    "signatureSilhouette": "边缘窗框与外溢影",
    "completionGeometry": "页面边缘仍可抓，移动端不横向滚动；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 3,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 14,
      "successLock": 23,
      "missRebound": 6
    }
  },
  {
    "id": 8,
    "traceKey": "TH-SP-008",
    "spatialThesis": "透明薄片位于真实中层，两壳在前后互补闭合",
    "signatureSilhouette": "三片悬浮纸层",
    "completionGeometry": "外壳先放必须弹回；中心与重叠阈值不变；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 3,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 16,
      "successLock": 14,
      "missRebound": 8
    }
  },
  {
    "id": 9,
    "traceKey": "TH-SP-009",
    "spatialThesis": "活版在前，固定影字压在后层纸窝",
    "signatureSilhouette": "活版与固定影字浅窝",
    "completionGeometry": "中文线索不能依赖英语猜测；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 2,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 18,
      "successLock": 17,
      "missRebound": 4
    }
  },
  {
    "id": 10,
    "traceKey": "TH-SP-010",
    "spatialThesis": "整页左右沿铰链翻入，中层压痕合成 0",
    "signatureSilhouette": "整页向内折叠",
    "completionGeometry": "单指和键盘必须完整，不要求双指；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 3,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 10,
      "successLock": 20,
      "missRebound": 6
    }
  },
  {
    "id": 11,
    "traceKey": "TH-SP-011",
    "spatialThesis": "双叶处在相邻时间层，中轴贯穿两层",
    "signatureSilhouette": "对称双叶与中央轴",
    "completionGeometry": "只由原 phase gap 完成；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 2,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 12,
      "successLock": 23,
      "missRebound": 8
    }
  },
  {
    "id": 12,
    "traceKey": "TH-SP-012",
    "spatialThesis": "两枚压力膜在不同深度以延迟传压",
    "signatureSilhouette": "双圆盘与压力波",
    "completionGeometry": "不考松手时机，不缩短正式长按；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 14,
      "successLock": 14,
      "missRebound": 4
    }
  },
  {
    "id": 13,
    "traceKey": "TH-SP-013",
    "spatialThesis": "两条半透明波面上下错层，零点是共享穿孔",
    "signatureSilhouette": "双波纸带",
    "completionGeometry": "不允许任意峰值对齐；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 2,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 16,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 14,
    "traceKey": "TH-SP-014",
    "spatialThesis": "横纵丝带分居上下层，由纸下连杆耦合",
    "signatureSilhouette": "横纵丝带十字",
    "completionGeometry": "单轴对齐不能过关；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 4,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 18,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 15,
    "traceKey": "TH-SP-015",
    "spatialThesis": "圆弧片拥有正背实空材质与可见纸边",
    "signatureSilhouette": "分段圆环",
    "completionGeometry": "纹理必须独立于颜色；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 10,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 16,
    "traceKey": "TH-SP-016",
    "spatialThesis": "小珠在前轨，半透明尾迹在后轨反向漂移",
    "signatureSilhouette": "环、珠与逆向尾迹",
    "completionGeometry": "不把动画终点当完成；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 3,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 12,
      "successLock": 14,
      "missRebound": 6
    }
  },
  {
    "id": 17,
    "traceKey": "TH-SP-017",
    "spatialThesis": "四块半字像四枚双面铅字，折痕是深度证据",
    "signatureSilhouette": "四块上下半字",
    "completionGeometry": "不能靠颜色指出异常；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 4,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 14,
      "successLock": 17,
      "missRebound": 8
    }
  },
  {
    "id": 18,
    "traceKey": "TH-SP-018",
    "spatialThesis": "刻痕固定在纸面，环边界像可伸缩立体套圈",
    "signatureSilhouette": "双刻痕与伸缩环",
    "completionGeometry": "浏览器缩放不算输入；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 16,
      "successLock": 20,
      "missRebound": 4
    }
  },
  {
    "id": 19,
    "traceKey": "TH-SP-019",
    "spatialThesis": "两个同心纸壳在前后层反向转动",
    "signatureSilhouette": "同心双壳",
    "completionGeometry": "保留宽松角度吸附；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 2,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 18,
      "successLock": 23,
      "missRebound": 6
    }
  },
  {
    "id": 20,
    "traceKey": "TH-SP-020",
    "spatialThesis": "三节点中心在前层，连续线路在后层绕行",
    "signatureSilhouette": "三节点与绕中心线路",
    "completionGeometry": "手机拖影和键盘焦点等价；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 3,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 10,
      "successLock": 14,
      "missRebound": 8
    }
  },
  {
    "id": 21,
    "traceKey": "TH-SP-021",
    "spatialThesis": "固定墨点像三枚空间钉，纸框在其前后呼吸",
    "signatureSilhouette": "呼吸纸框与三点",
    "completionGeometry": "保持 ±350ms 宽容；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 3,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 12,
      "successLock": 17,
      "missRebound": 4
    }
  },
  {
    "id": 22,
    "traceKey": "TH-SP-022",
    "spatialThesis": "四条落线分居前层，涟漪出现在后层水纸",
    "signatureSilhouette": "四落线一空位",
    "completionGeometry": "不变成高速反应测试；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 4,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 14,
      "successLock": 20,
      "missRebound": 6
    }
  },
  {
    "id": 23,
    "traceKey": "TH-SP-023",
    "spatialThesis": "声纹花瓣浮在纸带上方，不同沉默槽有不同深度",
    "signatureSilhouette": "三声瓣与三空隙",
    "completionGeometry": "不用统一目标框；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 3,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 16,
      "successLock": 23,
      "missRebound": 8
    }
  },
  {
    "id": 24,
    "traceKey": "TH-SP-024",
    "spatialThesis": "五点沿空间曲线形成四段不同长度墨桥",
    "signatureSilhouette": "曲线五点与墨珠",
    "completionGeometry": "轨迹和节拍两阶段均不可省略；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 5,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 18,
      "successLock": 14,
      "missRebound": 4
    }
  },
  {
    "id": 25,
    "traceKey": "TH-SP-025",
    "spatialThesis": "两信标在前层，沉默拍从后层短暂鼓起",
    "signatureSilhouette": "双信标与中央暗珠",
    "completionGeometry": "不缩窄原宽松窗口；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 2,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 10,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 26,
    "traceKey": "TH-SP-026",
    "spatialThesis": "五点纸带被一块透明立隔片切出前后两组",
    "signatureSilhouette": "五点长纸带",
    "completionGeometry": "只移动正式分隔片；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 5,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 12,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 27,
    "traceKey": "TH-SP-027",
    "spatialThesis": "四点绕浅盘分层，恒速光束扫过真实弧距",
    "signatureSilhouette": "光束与四点环",
    "completionGeometry": "不要求像素或毫秒精调；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 4,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 14,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 28,
    "traceKey": "TH-SP-028",
    "spatialThesis": "四瓣处在两相呼吸层，异常瓣逆深度运动",
    "signatureSilhouette": "四瓣纸花",
    "completionGeometry": "只有正式识别与长按完成；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 4,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 16,
      "successLock": 14,
      "missRebound": 6
    }
  },
  {
    "id": 29,
    "traceKey": "TH-SP-029",
    "spatialThesis": "透明检查尺在上层扫过刻痕带，差异从夹层发光",
    "signatureSilhouette": "检查尺与刻痕带",
    "completionGeometry": "两步顺序不可合并；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 4,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 18,
      "successLock": 17,
      "missRebound": 8
    }
  },
  {
    "id": 30,
    "traceKey": "TH-SP-030",
    "spatialThesis": "厚折角将背面第四小节藏在纸体内部",
    "signatureSilhouette": "纸谱与厚折角",
    "completionGeometry": "初始不能直接露答案；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 4,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 10,
      "successLock": 20,
      "missRebound": 4
    }
  },
  {
    "id": 31,
    "traceKey": "TH-SP-031",
    "spatialThesis": "巨弧固定在深层，小窗像可伸缩取景器",
    "signatureSilhouette": "巨弧被小窗裁切",
    "completionGeometry": "只允许内部视口控制；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 3,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 12,
      "successLock": 23,
      "missRebound": 6
    }
  },
  {
    "id": 32,
    "traceKey": "TH-SP-032",
    "spatialThesis": "后半句印在竖向铰链纸带的背面基线",
    "signatureSilhouette": "横竖标题折带",
    "completionGeometry": "中英版各自保持可读；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 4,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 14,
      "successLock": 14,
      "missRebound": 8
    }
  },
  {
    "id": 33,
    "traceKey": "TH-SP-033",
    "spatialThesis": "窗框是一张可旋纸景，铅垂珠保持世界竖直",
    "signatureSilhouette": "窗框、悬珠、斜纹",
    "completionGeometry": "设备方向仅增强，不是必选；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 2,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 16,
      "successLock": 17,
      "missRebound": 4
    }
  },
  {
    "id": 34,
    "traceKey": "TH-SP-034",
    "spatialThesis": "两张撕边风景纸在不同 z 面借出一条共同边",
    "signatureSilhouette": "双圆景纸",
    "completionGeometry": "不复制通用四面板场景；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 18,
      "successLock": 20,
      "missRebound": 6
    }
  },
  {
    "id": 35,
    "traceKey": "TH-SP-035",
    "spatialThesis": "全页天空、远景、近景构成三深度纸幕",
    "signatureSilhouette": "全页天空三层",
    "completionGeometry": "局部拖动不劫持页面滚动；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 3,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 10,
      "successLock": 23,
      "missRebound": 8
    }
  },
  {
    "id": 36,
    "traceKey": "TH-SP-036",
    "spatialThesis": "小水平仪跨越三张不同倾角纸带",
    "signatureSilhouette": "三横带与小水平仪",
    "completionGeometry": "不新增第三操作阶段；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 3,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 12,
      "successLock": 14,
      "missRebound": 4
    }
  },
  {
    "id": 37,
    "traceKey": "TH-SP-037",
    "spatialThesis": "两个圆窗处在相邻纸层，轴心有真实前后差",
    "signatureSilhouette": "双圆窗口",
    "completionGeometry": "中心宽松吸附不变；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 14,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 38,
    "traceKey": "TH-SP-038",
    "spatialThesis": "页面像连续纸筒，半票从一侧背面绕回另一侧",
    "signatureSilhouette": "左右边缘半票",
    "completionGeometry": "不制造隐藏传送热区；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 4,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 16,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 39,
    "traceKey": "TH-SP-039",
    "spatialThesis": "双页签形成两个 z 门，丝带依次穿前后",
    "signatureSilhouette": "双页签与穿梭丝带",
    "completionGeometry": "可抓端点与焦点顺序清晰；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 2,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 18,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 40,
    "traceKey": "TH-SP-040",
    "spatialThesis": "纸票跨浏览器可见面与页面背层",
    "signatureSilhouette": "右边缘纸票",
    "completionGeometry": "未发现切页不能误通关；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 3,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 10,
      "successLock": 14,
      "missRebound": 6
    }
  },
  {
    "id": 41,
    "traceKey": "TH-SP-041",
    "spatialThesis": "问号外轮廓是一条有纸厚的轨道，圆点独立悬浮",
    "signatureSilhouette": "大问号轨与圆点",
    "completionGeometry": "不混淆真实提示按钮；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 4,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 12,
      "successLock": 17,
      "missRebound": 8
    }
  },
  {
    "id": 42,
    "traceKey": "TH-SP-042",
    "spatialThesis": "磨砂纸位于触点和后层回声之间产生镜像折射",
    "signatureSilhouette": "磨砂侧纸和彩边",
    "completionGeometry": "磨砂层必须仍可操作；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 2,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 14,
      "successLock": 20,
      "missRebound": 4
    }
  },
  {
    "id": 43,
    "traceKey": "TH-SP-043",
    "spatialThesis": "三页签位于三深度，注意力光带跨层连接",
    "signatureSilhouette": "三页签与光带",
    "completionGeometry": "click 仍无效；正式 1.7 秒连续性不变；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 3,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 16,
      "successLock": 23,
      "missRebound": 6
    }
  },
  {
    "id": 44,
    "traceKey": "TH-SP-044",
    "spatialThesis": "透镜在最前层，轨道残影分布在不同焦面",
    "signatureSilhouette": "多环残影与透镜",
    "completionGeometry": "不能变成隐藏热区；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 4,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 18,
      "successLock": 14,
      "missRebound": 8
    }
  },
  {
    "id": 45,
    "traceKey": "TH-SP-045",
    "spatialThesis": "四层描图纸像阶梯，清晰度由后向前下落",
    "signatureSilhouette": "四层描图纸",
    "completionGeometry": "防止机械遍历误过；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 4,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 10,
      "successLock": 17,
      "missRebound": 4
    }
  },
  {
    "id": 46,
    "traceKey": "TH-SP-046",
    "spatialThesis": "两只纸手分居前后层，浅桥悬在中层",
    "signatureSilhouette": "双纸手与浅桥",
    "completionGeometry": "移动端路径宽度不低于正式合同；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 2,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 12,
      "successLock": 20,
      "missRebound": 6
    }
  },
  {
    "id": 47,
    "traceKey": "TH-SP-047",
    "spatialThesis": "石头悬在前层，涟漪与深影位于后层",
    "signatureSilhouette": "石、涟漪与深影",
    "completionGeometry": "与 002 的静置＋气泡区别明确；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 4,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 14,
      "successLock": 23,
      "missRebound": 8
    }
  },
  {
    "id": 48,
    "traceKey": "TH-SP-048",
    "spatialThesis": "多条字带在前后穿梭，固定空白像安静通道",
    "signatureSilhouette": "飞行字带与固定空区",
    "completionGeometry": "reduced-motion 用离散位置证据；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 2,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 16,
      "successLock": 14,
      "missRebound": 4
    }
  },
  {
    "id": 49,
    "traceKey": "TH-SP-049",
    "spatialThesis": "五点刻在辽阔纸穹不同深度，墨线跨面闭合",
    "signatureSilhouette": "大天空与五刻点",
    "completionGeometry": "摄像头不是默认路线；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 5,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 18,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 50,
    "traceKey": "TH-SP-050",
    "spatialThesis": "两条透明句带在相反深度共享一个句末孔",
    "signatureSilhouette": "双透明句带",
    "completionGeometry": "中英都能独立推理；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 2,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 10,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 51,
    "traceKey": "TH-SP-051",
    "spatialThesis": "首字是手风琴纸体，内页藏在真实厚度中",
    "signatureSilhouette": "一行活版与手风琴首字",
    "completionGeometry": "中英采用独立字图，不直译硬套；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 2,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 12,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 52,
    "traceKey": "TH-SP-052",
    "spatialThesis": "长词带沿中央折痕把正面字母换为背面字母",
    "signatureSilhouette": "长词带与中央折痕",
    "completionGeometry": "不用输入框，不额外提交；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 3,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 14,
      "successLock": 14,
      "missRebound": 6
    }
  },
  {
    "id": 53,
    "traceKey": "TH-SP-053",
    "spatialThesis": "两个双语环在不同 z 轨反转，中央轴钉贯穿",
    "signatureSilhouette": "双环与中央轴钉",
    "completionGeometry": "双语字始终可读；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 16,
      "successLock": 17,
      "missRebound": 8
    }
  },
  {
    "id": 54,
    "traceKey": "TH-SP-054",
    "spatialThesis": "中央纸轴在前，松散丝带跨后层连续绕行",
    "signatureSilhouette": "中央纸轴与松散丝带",
    "completionGeometry": "多点触控、键盘与运动辅助等价；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 2,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 18,
      "successLock": 20,
      "missRebound": 4
    }
  },
  {
    "id": 55,
    "traceKey": "TH-SP-055",
    "spatialThesis": "巨大 1 与 9 像两张厚字模，夹层投影形成 0",
    "signatureSilhouette": "巨大 1、9 与影子",
    "completionGeometry": "不用发光轮廓泄露位置；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 2,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 10,
      "successLock": 23,
      "missRebound": 6
    }
  },
  {
    "id": 56,
    "traceKey": "TH-SP-056",
    "spatialThesis": "大数字是固定纸脊，小数点是唯一浮动墨珠",
    "signatureSilhouette": "单行大数字",
    "completionGeometry": "真实命中区至少 44px，视觉点可更小；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "constellation",
    "anchorCount": 4,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 12,
      "successLock": 14,
      "missRebound": 8
    }
  },
  {
    "id": 57,
    "traceKey": "TH-SP-057",
    "spatialThesis": "五片位元槽在前，顶光把影投到后层编码带",
    "signatureSilhouette": "五片纸槽与顶光",
    "completionGeometry": "纹理冗余，不靠明暗单一表达；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 5,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 14,
      "successLock": 17,
      "missRebound": 4
    }
  },
  {
    "id": 58,
    "traceKey": "TH-SP-058",
    "spatialThesis": "一条透明词带沿长轴翻转，背面不是镜像贴图",
    "signatureSilhouette": "长透明词带",
    "completionGeometry": "中英图形具有等价证据；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 3,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 16,
      "successLock": 20,
      "missRebound": 6
    }
  },
  {
    "id": 59,
    "traceKey": "TH-SP-059",
    "spatialThesis": "三段纸弧位于相邻高度，可在钟面上首尾拼接",
    "signatureSilhouette": "钟面与三弧片",
    "completionGeometry": "保留多等价起点；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 3,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 18,
      "successLock": 23,
      "missRebound": 8
    }
  },
  {
    "id": 60,
    "traceKey": "TH-SP-060",
    "spatialThesis": "单结丝带在中央真实穿层，只有一处 over/under 错误",
    "signatureSilhouette": "单结印字丝带",
    "completionGeometry": "不增加第二个错误交叉；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 2,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 10,
      "successLock": 14,
      "missRebound": 4
    }
  },
  {
    "id": 61,
    "traceKey": "TH-SP-061",
    "spatialThesis": "反写纸尺在前，云影在后层沿相反轴移动",
    "signatureSilhouette": "云影与反写纸尺",
    "completionGeometry": "不变成方向密码；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 3,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 12,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 62,
    "traceKey": "TH-SP-062",
    "spatialThesis": "指针在前景，600ms 纸影沿后层追踪",
    "signatureSilhouette": "双指针与浅窝",
    "completionGeometry": "实心指针进入槽必须拒绝；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 2,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 14,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 63,
    "traceKey": "TH-SP-063",
    "spatialThesis": "折线把页面四边当连续折叠表面，线头绕背面续出",
    "signatureSilhouette": "四角线头",
    "completionGeometry": "不按累计长度通过；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 4,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 16,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 64,
    "traceKey": "TH-SP-064",
    "spatialThesis": "两张厚纸板共享一根可见铰链，背面半环有不同方向",
    "signatureSilhouette": "双板共铰链",
    "completionGeometry": "正背材质在 reduced-motion 仍可分辨；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 18,
      "successLock": 14,
      "missRebound": 6
    }
  },
  {
    "id": 65,
    "traceKey": "TH-SP-065",
    "spatialThesis": "五标签位于不同深度，三角影投向下一层",
    "signatureSilhouette": "五标签与箭影",
    "completionGeometry": "随机布局时仍有唯一源和汇；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 5,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 10,
      "successLock": 17,
      "missRebound": 8
    }
  },
  {
    "id": 66,
    "traceKey": "TH-SP-066",
    "spatialThesis": "四条带已有正确出口，仅中央 one-cross 有错误高度",
    "signatureSilhouette": "四带单交叉",
    "completionGeometry": "可抓层线索不等于答案高亮；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 4,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 12,
      "successLock": 20,
      "missRebound": 4
    }
  },
  {
    "id": 67,
    "traceKey": "TH-SP-067",
    "spatialThesis": "纸轮在中层，实体波在前、半透明回声在后",
    "signatureSilhouette": "缺弧轮与双波纹",
    "completionGeometry": "只监听谜题区，不劫持全页滚动；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 2,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 14,
      "successLock": 23,
      "missRebound": 6
    }
  },
  {
    "id": 68,
    "traceKey": "TH-SP-068",
    "spatialThesis": "缺弧藏在钟圈纸背，逆扫逐段翻到前层",
    "signatureSilhouette": "缺口钟圈",
    "completionGeometry": "不按累计角度，不要求完整绕圈；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 4,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 16,
      "successLock": 14,
      "missRebound": 8
    }
  },
  {
    "id": 69,
    "traceKey": "TH-SP-069",
    "spatialThesis": "左右章在两张薄纸面，笔迹在交点穿层两次",
    "signatureSilhouette": "双泪滴章",
    "completionGeometry": "两个分开圆必须无效；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 2,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 18,
      "successLock": 17,
      "missRebound": 4
    }
  },
  {
    "id": 70,
    "traceKey": "TH-SP-070",
    "spatialThesis": "两道窄门分居前后纸层，同一线穿越两个深度",
    "signatureSilhouette": "双窄门与纸层",
    "completionGeometry": "不转成开门叙事或钥匙玩法；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 2,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 10,
      "successLock": 20,
      "missRebound": 6
    }
  },
  {
    "id": 71,
    "traceKey": "TH-SP-071",
    "spatialThesis": "三盘像共轴机械纸表，两条齿带位于不同层",
    "signatureSilhouette": "三盘双齿带",
    "completionGeometry": "侧盘操作不能误完成；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 3,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 12,
      "successLock": 23,
      "missRebound": 8
    }
  },
  {
    "id": 72,
    "traceKey": "TH-SP-072",
    "spatialThesis": "两片玻璃纸交会，第三偏振片位于夹层并改变折射",
    "signatureSilhouette": "三透明片",
    "completionGeometry": "HTML 仍负责拖放和 90° 翻转；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 3,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 14,
      "successLock": 14,
      "missRebound": 4
    }
  },
  {
    "id": 73,
    "traceKey": "TH-SP-073",
    "spatialThesis": "三石外形同层，压力半径投到下层三种容量井",
    "signatureSilhouette": "三石三槽",
    "completionGeometry": "两阶段负担不增加；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 3,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 16,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 74,
    "traceKey": "TH-SP-074",
    "spatialThesis": "三透明句带像可读的纸织物，交会词在三深度出现",
    "signatureSilhouette": "三透明句带",
    "completionGeometry": "双语层级均能独立验证；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 3,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 18,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 75,
    "traceKey": "TH-SP-075",
    "spatialThesis": "固定四带保持不动，侧光沿纸边扫描其上下纹理",
    "signatureSilhouette": "四带与侧灯",
    "completionGeometry": "禁止让玩家重排已正确纸带；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 4,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 10,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 76,
    "traceKey": "TH-SP-076",
    "spatialThesis": "五投票叶有正背面与固定影面，折痕是证据",
    "signatureSilhouette": "五投票叶",
    "completionGeometry": "颜色不能指出答案；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 5,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 12,
      "successLock": 14,
      "missRebound": 6
    }
  },
  {
    "id": 77,
    "traceKey": "TH-SP-077",
    "spatialThesis": "数字是固定立版，关系笔画是三枚可移动纸条",
    "signatureSilhouette": "大式子与散笔画",
    "completionGeometry": "浅槽不能初始过度明显；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "constellation",
    "anchorCount": 3,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 14,
      "successLock": 17,
      "missRebound": 8
    }
  },
  {
    "id": 78,
    "traceKey": "TH-SP-078",
    "spatialThesis": "四窗位于不同深度，反相残影在中心形成抵消体",
    "signatureSilhouette": "四窗与中央槽",
    "completionGeometry": "不把反相窗自动吸入；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 4,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 16,
      "successLock": 20,
      "missRebound": 4
    }
  },
  {
    "id": 79,
    "traceKey": "TH-SP-079",
    "spatialThesis": "七票分在前页与折后页，折页厚度隐藏多数",
    "signatureSilhouette": "七叶与大折页",
    "completionGeometry": "玩家必须能看到全部七票；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 7,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 18,
      "successLock": 23,
      "missRebound": 6
    }
  },
  {
    "id": 80,
    "traceKey": "TH-SP-080",
    "spatialThesis": "多层同心纸环向内凹成浅奇点，纤维指向外侧",
    "signatureSilhouette": "多层同心纸环",
    "completionGeometry": "拖距宽容，不能靠按中心过关；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 4,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 10,
      "successLock": 14,
      "missRebound": 8
    }
  },
  {
    "id": 81,
    "traceKey": "TH-SP-081",
    "spatialThesis": "指针纹与键帽纹半环处在不同深度，共享一个中央插口",
    "signatureSilhouette": "双半环与共用插口",
    "completionGeometry": "输入所有权、双指和键盘路径不变；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 12,
      "successLock": 17,
      "missRebound": 4
    }
  },
  {
    "id": 82,
    "traceKey": "TH-SP-082",
    "spatialThesis": "实心指针在前，三枚箭影在三层旧位置缓慢转向",
    "signatureSilhouette": "三箭影与双浅窝",
    "completionGeometry": "每局候选必须视觉可证；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 3,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 14,
      "successLock": 20,
      "missRebound": 6
    }
  },
  {
    "id": 83,
    "traceKey": "TH-SP-083",
    "spatialThesis": "两目标环沿前后交替轨道穿过同一未点亮交点",
    "signatureSilhouette": "双游走环与中央空白",
    "completionGeometry": "不是时机点击追逐游戏；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 2,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 16,
      "successLock": 23,
      "missRebound": 8
    }
  },
  {
    "id": 84,
    "traceKey": "TH-SP-084",
    "spatialThesis": "当前纸点在前层，跨重置保留的浅影在背层",
    "signatureSilhouette": "起点、双压痕与旧影",
    "completionGeometry": "不改真实重置语义或按钮文案；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 2,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 18,
      "successLock": 14,
      "missRebound": 4
    }
  },
  {
    "id": 85,
    "traceKey": "TH-SP-085",
    "spatialThesis": "月相盘在背景层运行，盖纸小窗只提供可见证据",
    "signatureSilhouette": "月相盘与小窗盖纸",
    "completionGeometry": "visibility 与盖页等价且不误计后台；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 3,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 10,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 86,
    "traceKey": "TH-SP-086",
    "spatialThesis": "真实菜单纸成为前景遮挡层，太阳与小数点在后层同轴",
    "signatureSilhouette": "太阳与圆孔菜单",
    "completionGeometry": "不妨碍菜单导航、关闭和焦点管理；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 4,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 12,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 87,
    "traceKey": "TH-SP-087",
    "spatialThesis": "三悬珠在可旋纸框内记录三层重力痕迹",
    "signatureSilhouette": "三悬珠与 U 槽",
    "completionGeometry": "传感器不是唯一输入；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 3,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 14,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 88,
    "traceKey": "TH-SP-088",
    "spatialThesis": "中央可翻纸页改变两侧纸片所属表面",
    "signatureSilhouette": "内外纸片与中央折",
    "completionGeometry": "两步顺序必须保留；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 2,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 16,
      "successLock": 14,
      "missRebound": 6
    }
  },
  {
    "id": 89,
    "traceKey": "TH-SP-089",
    "spatialThesis": "可调纸视口本身是立体框，内容在框内重新流动",
    "signatureSilhouette": "嵌套视口、纸夹与交叉线",
    "completionGeometry": "组件内部 resize，不依赖浏览器宽度；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 4,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 18,
      "successLock": 17,
      "missRebound": 8
    }
  },
  {
    "id": 90,
    "traceKey": "TH-SP-090",
    "spatialThesis": "透明地图窗悬于周边档案格之上，隐藏纹理在夹层接续",
    "signatureSilhouette": "周边格与地图窗",
    "completionGeometry": "路线唯一性必须测试；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "stack",
    "anchorCount": 2,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 10,
      "successLock": 20,
      "missRebound": 4
    }
  },
  {
    "id": 91,
    "traceKey": "TH-SP-091",
    "spatialThesis": "两牌在前层互翻，真正的大慢影藏于共同背板",
    "signatureSilhouette": "双牌与大衬纸",
    "completionGeometry": "单动作不能靠文字直接泄题；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 2,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 12,
      "successLock": 23,
      "missRebound": 6
    }
  },
  {
    "id": 92,
    "traceKey": "TH-SP-092",
    "spatialThesis": "五空心环沿深度嵌套，无发光中心贯穿全部纸层",
    "signatureSilhouette": "五同心空环",
    "completionGeometry": "共同中心保持无高亮仍可推理；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 5,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 14,
      "successLock": 14,
      "missRebound": 8
    }
  },
  {
    "id": 93,
    "traceKey": "TH-SP-093",
    "spatialThesis": "六段纸带像径向手风琴，折后端点堆成厚印章",
    "signatureSilhouette": "长短纸带折叠体",
    "completionGeometry": "折序和操作长度需宽容但不自动化；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 6,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 16,
      "successLock": 17,
      "missRebound": 4
    }
  },
  {
    "id": 94,
    "traceKey": "TH-SP-094",
    "spatialThesis": "多层彩纸在中心形成真实色密度，白遮光片位于前层",
    "signatureSilhouette": "彩纸中心与白片",
    "completionGeometry": "纹理提供色觉替代；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 3,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 18,
      "successLock": 20,
      "missRebound": 6
    }
  },
  {
    "id": 95,
    "traceKey": "TH-SP-095",
    "spatialThesis": "三张时间片在三个 z 平面，纸边压痕编码先后",
    "signatureSilhouette": "三相透明圆",
    "completionGeometry": "与 008 的材质夹层和顺序区别明确；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "orbit",
    "anchorCount": 3,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 10,
      "successLock": 23,
      "missRebound": 8
    }
  },
  {
    "id": 96,
    "traceKey": "TH-SP-096",
    "spatialThesis": "七点沿深度向零点收束，异常点在前后比率上突起",
    "signatureSilhouette": "七点收敛线",
    "completionGeometry": "防止逐点删除穷举；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 7,
    "depthPattern": "ascending",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 12,
      "successLock": 14,
      "missRebound": 4
    }
  },
  {
    "id": 97,
    "traceKey": "TH-SP-097",
    "spatialThesis": "七折页像纸扇沿一根立体书脊顺序抬起",
    "signatureSilhouette": "七折页扇",
    "completionGeometry": "一根共享控制，不改成逐页点击；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "hinge",
    "anchorCount": 7,
    "depthPattern": "alternating",
    "stateGeometry": {
      "idleLift": 8,
      "runningPull": 14,
      "successLock": 17,
      "missRebound": 6
    }
  },
  {
    "id": 98,
    "traceKey": "TH-SP-098",
    "spatialThesis": "四个秒表纸面围绕中央共轴十字作 90° 档位旋转",
    "signatureSilhouette": "四象限秒表",
    "completionGeometry": "两位小数不变形，只有正式档位完成；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 4,
    "depthPattern": "inset",
    "stateGeometry": {
      "idleLift": 10,
      "runningPull": 16,
      "successLock": 20,
      "missRebound": 8
    }
  },
  {
    "id": 99,
    "traceKey": "TH-SP-099",
    "spatialThesis": "两张波面在不同深度交叉，六孔检查带位于前层",
    "signatureSilhouette": "双波与六孔带",
    "completionGeometry": "移动端降低线数，不降低交点依据；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ribbon",
    "anchorCount": 6,
    "depthPattern": "radial",
    "stateGeometry": {
      "idleLift": 12,
      "runningPull": 18,
      "successLock": 23,
      "missRebound": 4
    }
  },
  {
    "id": 100,
    "traceKey": "TH-SP-100",
    "spatialThesis": "六星只定义边界，真正 V 是有体积的负空间光腔",
    "signatureSilhouette": "暮色六星与 V",
    "completionGeometry": "页面路线第一；摄像头仅主动同意彩蛋；完成后对象数量、接缝、中心、层序和遮挡必须与原控制器一致，不得保留游离副本或用新绘制对象盖住正式对象。",
    "connector": "ray",
    "anchorCount": 6,
    "depthPattern": "front-back",
    "stateGeometry": {
      "idleLift": 6,
      "runningPull": 10,
      "successLock": 14,
      "missRebound": 6
    }
  }
] as const satisfies readonly FullSpatialLevelDirection[];

export const FULL_SPATIAL_LEVEL_DIRECTION_BY_ID: ReadonlyMap<number, FullSpatialLevelDirection> = new Map(
  FULL_SPATIAL_LEVEL_DIRECTIONS.map((direction) => [direction.id, direction]),
);
