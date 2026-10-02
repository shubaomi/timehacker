---
name: Time Hacker · Reasoning 100
description: 日光纸上剧场中的可操作推理机关
colors:
  sky: "#dff4ff"
  paper: "#fbfdff"
  board: "#f8fcfe"
  ink: "#20243f"
  quiet: "#4c596f"
  coral: "#ff735d"
  coral-hover: "#f77f6b"
  butter: "#ffd866"
  blue-well: "#e5f2f8"
  yellow-paper: "#fff0be"
  coral-paper: "#fae3de"
  control: "#fafdff"
  control-hover: "#e9f2f7"
  line: "#8ba5b5"
  target: "#b44b36"
  success: "#215d4b"
typography:
  display:
    fontFamily: '"Azeret Mono Variable", ui-monospace, monospace'
    fontSize: "clamp(38px, 6vw, 68px)"
    fontWeight: 590
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: '"Bricolage Grotesque Variable", sans-serif'
    fontSize: "clamp(22px, 3vw, 30px)"
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: '"Bricolage Grotesque Variable", sans-serif'
    fontSize: "16px"
  label:
    fontFamily: '"Bricolage Grotesque Variable", sans-serif'
    fontSize: "14px"
rounded:
  board: "24px"
  board-mobile: "18px"
  well: "14px"
  control: "10px"
  cell: "3px"
  pill: "999px"
spacing:
  control-gap: "10px"
  well-gap: "16px"
  board-padding: "26px"
  board-padding-mobile: "18px 12px"
components:
  mechanism-button:
    backgroundColor: "{colors.control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
  mechanism-button-hover:
    backgroundColor: "{colors.control-hover}"
  timer-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 34px"
  timer-primary-hover:
    backgroundColor: "{colors.coral-hover}"
  timer-running:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  mechanism-board:
    backgroundColor: "{colors.board}"
    textColor: "{colors.ink}"
    rounded: "{rounded.board}"
    padding: "{spacing.board-padding}"
    width: "min(100%, 720px)"
  target-cell:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.control}"
    rounded: "{rounded.control}"
  requested-hint:
    backgroundColor: "{colors.yellow-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "12px"
---

# Design System: Time Hacker · Reasoning 100

## Overview

**Creative North Star: "日光纸上剧场"**

在明亮的纸面上展示可操作对象及其关系。深蓝标记、浅色分层和短促变化帮助玩家比较动作前后；标题与说明让目标可读，机关保留试验和修正的空间。沿用 TIME HACKER 的字标、字体与浅蓝／珊瑚／日光黄身份。

此文件仅约束 Reasoning 100 主线及其生产计时组合，不替换仓库级设计文件。来源顺序为已批准的 [R100 合同](../../plans/2026-10-02-reasoning-100-production-contract.md)、本次实际实现、[PRODUCT.md](../../../PRODUCT.md) 中仍适用的品牌承诺；旧产品文档中的历史阶段限制不覆盖新合同。

**Last Updated:** 2026-10-02。提取来源：[机关样式](../../../src/components/reasoning-campaign/scene.module.css)、[生产组合样式](../../../src/components/reasoning-campaign/production.css)、[语义场景](../../../src/components/reasoning-campaign/scene.tsx)、[应用接线](../../../src/components/time-hacker-app.tsx)、[全局字体与控件](../../../src/app/globals.css)。这是实现后的设计记录，不是趣味性、真实设备手感或生产部署证明。

**Key Characteristics:**

- 浅蓝舞台、纸白机关、深蓝信息。
- 当前状态与目标以数值、轮廓、文字共同呈现。
- 手机纵向自然滚动；机关和计时各有位置。
- 触摸与键盘提交相同的离散动作。

## Colors

配色继承既有品牌；较浅的蓝、黄、珊瑚纸面区分对象，深色标记承担信息。

### Primary

- **深蓝墨迹（ink）**：正文、数字、当前墨迹、键盘焦点；计时运行时成为停止按钮背景。
- **珊瑚主操作（coral）**：开始／重试等主计时操作。运行态使用深蓝背景与纸白文字。

### Secondary

- **日光黄（butter）**：既有品牌图标底色。
- **黄色纸面（yellow-paper）**：机关分层、折页、门与主动请求的提示。

### Neutral

- **浅蓝天空（sky）**：主线背景。
- **纸白（paper／board／control）**：主操作反白字、机关容器与操作按钮。
- **安静文字（quiet）**：容量、连接说明、图例和未解决反馈。
- **蓝灰描边（line）**：按钮边界、刻度和纸格。

目标使用暖色轮廓（target），完成反馈使用深绿（success）；它们都伴随形状、数值或文字，不能单独承担状态含义。

Sidecar 的八阶色带由现有颜色推导，仅供设计面板预览，不新增正式配色；frontmatter 中的实际颜色仍为本文件的规范值。

## Typography

**Display Font:** Azeret Mono Variable，后备 ui-monospace、monospace。用于计时、数量和页码；计时与容量数量使用等宽数字。
**Body Font:** Bricolage Grotesque Variable，后备 sans-serif。中文页面优先 Microsoft YaHei、PingFang SC、Noto Sans CJK SC，再回退正文栈。

标题继承页面正文栈，避免中文标题被强制套入等宽显示字体。机关标题使用 headline；计时使用 display。机关说明与反馈使用 label；小容量／位置标注可更紧凑，但不能代替主要数值或操作名称。页面挑战标题与机关标题共享尺寸范围，前者行高为 1.3，后者采用 frontmatter 中的 headline 行高。

## Layout

桌面主内容限制为（760px），左右留白合计（28px）；机关板和计时组合最大宽度均为（720px）。页面外壳宽度与最大宽度为（100%），最小高度为（100svh）。先显示紧凑目标，再显示机关与计时；不把机关定位到计时卡之下。

计时区采用一列伸展读数加一列主按钮，间距（14px），横向内边距（20px）。计时卡背景透明、无阴影，桌面高度（112px）。主按钮最小宽高为（170px × 62px）。

在（600px）及以下：内容两侧各留（12px），机关板采用移动端 padding／radius；四个容量槽转为两列，槽间距（8px）。计时区横向内边距（4px）、间距（10px），卡高（86px），主按钮最小宽高（124px × 58px）、横向内边距（18px）。机关控制区仍为三列；工具按钮可换行。纸条保留十二个位置并收紧间距，不删除目标信息。

**The Normal Flow Rule.** 机关、反馈、撤销／重置和计时保持正常文档流；窄屏或短屏允许纵向滚动，不用固定覆盖层强迫一屏容纳全部内容。

## Elevation & Depth

深度来自纸面底色、描边与有限阴影。机关板有柔和外阴影；纸条与折页保留较小的结构阴影；表盘用内阴影。计时读数不再单独抬起成玻璃卡片。准确阴影值见同目录 sidecar；不把阴影用作唯一的状态信号。

运动只解释变化：容量液面在允许动态时以（160ms ease-out）变形；机关按钮按下时下移（1px）。reduced-motion 下移除这些运动，仍显示最终数值、目标、纹理与反馈。

## Shapes

机关板使用圆角纸面，容量槽比板更紧凑，操作按钮采用温和圆角。圆形只用于表盘和墨点；折页保留单侧较大的纸角。目标通过轮廓与虚线、墙通过斜纹、已对齐页码通过下划线表达，不能把它们压成只有颜色不同的卡片。

## Components

### Buttons

机关按钮最小触摸区域（44px × 44px），实线描边（1px），正常背景与悬停背景使用 frontmatter 对应变体。键盘焦点为深蓝描边（3px），偏移（3px）；禁用态透明度（0.55）。悬停只在支持 hover 的设备启用。

主计时按钮沿用胶囊形状、品牌珊瑚与原有阴影。运行时文字必须反白。焦点继承全局深蓝描边（3px），偏移（4px）。计时仍由玩家主动开始和停止；视觉场景不代操作。

### Cards / Containers

机关板内依次容纳标题、目标、可见装置、操作和状态。提示以黄色纸面追加在板内，仅在主动请求后出现。撤销／重置位于装置之后，解决后锁定装置并移除这些工具。

### Navigation

沿用现有 TIME HACKER 字标、时钟图标和菜单入口；此目录不定义新的标志或导航身份。次级功能仍由现有抽屉提供。

### Relationship Marks

容量槽同时显示容量、当前／目标数字与目标横线；纸条投影同时给出计数、墨迹与目标轮廓。表盘实心针对应当前、虚线针对应目标，并保留数字。翻面格包含编号和目标文字；通路保留门／开关字母、开关状态与墙纹理。

状态更新进入语义 status；对象有可读名称，装饰图形不重复朗读。通路的方向键与可见方向按钮操作同一状态。焦点与当前检查格的影响范围均可辨认。

## Do's and Don'ts

### Do:

- Do 保留既有浅蓝、纸白、深蓝、珊瑚与日光黄身份。
- Do 同时使用数值、轮廓或文字解释当前与目标。
- Do 保留可见键盘焦点、可用触摸区域和纵向滚动。
- Do 在减少动态时保留全部状态与反馈。

### Don't:

- Don't 为本主线新增品牌标志、字体下载、摄像头或 WebGL 场景。
- Don't 使用黑色科技风、AI 紫色、过量外发光或全页玻璃卡片替代既有身份。
- Don't 用视觉层代替玩家停止计时，或用颜色与动画单独传达解开状态。
