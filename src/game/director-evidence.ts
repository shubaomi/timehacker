export type DirectorEvidenceFamily = "breath" | "language" | "projection" | "layers" | "route" | "state";
export type DirectorEvidenceRole = "counterexample" | "observation" | "relation";

export interface DirectorEvidenceProbe {
  id: string;
  role: DirectorEvidenceRole;
  label: { zh: string; en: string };
  response: { zh: string; en: string };
}

export interface DirectorEvidenceDefinition {
  levelNumber: number;
  family: DirectorEvidenceFamily;
  probes: readonly DirectorEvidenceProbe[];
  sequence: readonly string[];
  completion: { zh: string; en: string };
}

type ProbeInput = readonly [
  id: string,
  role: DirectorEvidenceRole,
  zh: string,
  en: string,
  responseZh: string,
  responseEn: string,
];

function probe(input: ProbeInput): DirectorEvidenceProbe {
  return Object.freeze({
    id: input[0],
    role: input[1],
    label: Object.freeze({ zh: input[2], en: input[3] }),
    response: Object.freeze({ zh: input[4], en: input[5] }),
  });
}

function defineEvidence(
  levelNumber: number,
  family: DirectorEvidenceFamily,
  probes: readonly ProbeInput[],
  sequence: readonly string[],
  completionZh: string,
  completionEn: string,
): DirectorEvidenceDefinition {
  return Object.freeze({
    levelNumber,
    family,
    probes: Object.freeze(probes.map(probe)),
    sequence: Object.freeze([...sequence]),
    completion: Object.freeze({ zh: completionZh, en: completionEn }),
  });
}

export const DIRECTOR_EVIDENCE_DEFINITIONS = Object.freeze([
  defineEvidence(2, "breath", [
    ["pressure", "counterexample", "被操作压紧的纸叶", "Paper leaves compressed by input", "纸叶向内合拢，缝隙反而变窄。", "The leaves close inward and the gap narrows."],
    ["silence", "observation", "停手后的纸缝", "Paper gap after stillness", "没有新的输入时，夹层慢慢恢复。", "Without new input, the space between layers recovers."],
    ["edge", "relation", "纸叶外缘", "Outer leaf edge", "外缘只发生弹性形变，没有形成开口。", "The outer edge flexes but does not form an opening."],
  ], ["pressure", "silence"], "操作压紧，静置释放。纸缝的规律已经可用。", "Input compresses; stillness releases. The gap's rule is now usable."),
  defineEvidence(3, "language", [
    ["whole", "counterexample", "漂动的完整词牌", "The drifting whole word", "整词被抓住后反弹，页面速度没有改变。", "The whole word rebounds; the page speed does not change."],
    ["tooth", "observation", "单块翻页齿口", "One tile's flip notch", "一块字牌翻面时，它的影子速度也随字义改变。", "When one tile flips, its shadow speed changes with its meaning."],
    ["order", "relation", "字牌之间的空隙", "Spacing between letter tiles", "只移动位置会改变间距，不会改变世界速度。", "Changing position alters spacing, not the world's speed."],
  ], ["whole", "tooth"], "速度跟随字义，不跟随整词的位置。", "Speed follows meaning, not the word's position."),
  defineEvidence(4, "projection", [
    ["size", "counterexample", "按圆片大小形成的配对", "A pairing based on disc size", "外形落入浅窝，但影线越过了边缘。", "The shape fits the well, but its shadow line crosses the edge."],
    ["lift", "observation", "被轻移的圆片", "A gently moved disc", "圆片离开后，影子仍短暂停在纸面。", "After the disc moves, its shadow briefly stays on the paper."],
    ["color", "relation", "同色圆片与浅窝", "Same-color disc and well", "颜色一致只改变色相，没有留下压合痕迹。", "Matching color changes hue but leaves no fitted imprint."],
  ], ["size", "lift"], "物体会离开，影子保留了真正的比较依据。", "The object can move away; the shadow preserves the real comparison."),
  defineEvidence(5, "projection", [
    ["weights", "counterexample", "互换位置的砝码", "Weights with swapped positions", "砝码互换后，纸架依然保持水平。", "After the weights swap, the paper rack remains level."],
    ["fulcrum", "observation", "纸架支点", "The rack fulcrum", "支点弹回原位，并留下锁定的水平基线。", "The fulcrum returns and leaves a locked horizontal baseline."],
    ["lamp", "relation", "偏置的琥珀灯", "The offset amber lamp", "灯的位置改变时，三道影长同步改变。", "Moving the lamp changes all three shadow lengths together."],
  ], ["weights", "fulcrum"], "失衡不在砝码或支点，水平基线仍然可靠。", "The weights and fulcrum are not unbalanced; the baseline remains reliable."),
  defineEvidence(6, "layers", [
    ["shells", "counterexample", "相碰的两块外壳", "The two touching shells", "两块外壳接近时产生反向弹力。", "The shells push apart as they approach."],
    ["film", "observation", "靠近一侧的透明薄片", "The film near one side", "薄片靠近一侧，另一侧同时出现回声。", "When the film nears one side, the other side echoes too."],
    ["stack", "relation", "任意层序的三件纸片", "The three pieces in an arbitrary stack", "薄片位于最上或最下时，只有一侧变软。", "With the film on top or bottom, only one side softens."],
  ], ["shells", "film"], "透明片改变两块外壳之间的关系。", "The transparent film changes the relationship between the shells."),
  defineEvidence(7, "projection", [
    ["crest", "counterexample", "重合的最高波峰", "Overlapping wave crests", "波峰颜色增强，但纸边仍然漏光。", "The crest darkens, but light still leaks through the paper edge."],
    ["color", "observation", "重合的同色节点", "Overlapping same-color nodes", "颜色对上后，频率刻线仍然错开。", "The colors align, but the frequency marks remain offset."],
    ["zero", "relation", "波带边缘的零点切口", "Zero-point cuts on the wave edges", "两处切口拥有互补的纸纤维。", "The two cuts have complementary paper fibers."],
  ], ["crest", "color"], "显眼的相同不够，漏光仍在零点等待闭合。", "Visible similarity is insufficient; the leak still waits at the zero point."),
  defineEvidence(8, "route", [
    ["horizontal", "observation", "横向丝带", "Horizontal ribbon", "横带轻移时，纵带以固定比例镜像响应。", "A small horizontal move produces a fixed mirrored vertical response."],
    ["vertical", "relation", "纵向丝带", "Vertical ribbon", "纵带反向试探时，横带仍保持同一耦合比例。", "A reverse vertical probe preserves the same coupling ratio."],
    ["ends", "counterexample", "两条丝带的断端", "The two ribbon ends", "断端相接只形成斜线，双轴压痕仍未闭合。", "Joining the ends makes a diagonal while the two-axis imprint stays open."],
  ], ["horizontal", "vertical"], "两条丝带不是两个对象，而是一个耦合系统。", "The ribbons are not two independent objects; they form one coupled system."),
  defineEvidence(9, "layers", [
    ["first-mark", "observation", "第一枚外侧刻痕", "The first outside mark", "刻痕碰到圆环后沿切线滑开。", "The mark slides tangentially when it meets the ring."],
    ["second-mark", "relation", "第二枚外侧刻痕", "The second outside mark", "另一枚刻痕也无法跨过同一条边界。", "The other mark cannot cross the same boundary either."],
    ["merge", "counterexample", "相接的两枚刻痕", "The two joined marks", "两枚刻痕相接后仍然处于圆环外侧。", "After joining, both marks remain outside the ring."],
  ], ["first-mark", "merge"], "对象无法跨界，能改变的是内外范围。", "The objects cannot cross the boundary; the inside-outside range can change."),
  defineEvidence(10, "projection", [
    ["overlap", "counterexample", "同向重合的双缺口", "The two gaps overlapped in one direction", "中心变亮，但两壳之间的夹层继续泄光。", "The center brightens, but the layer between shells still leaks."],
    ["turn", "observation", "被旋动的外壳", "The rotated outer shell", "一壳转动时，另一壳反向回应。", "When one shell turns, the other responds in reverse."],
    ["middle", "relation", "两壳之间的纸层", "The paper layer between shells", "旋转会改变夹层漏光的长度。", "Rotation changes the length of the leak in the middle layer."],
  ], ["overlap", "turn"], "需要闭合的是夹层，不是任一外壳。", "The middle layer must close, not either shell by itself."),
  defineEvidence(11, "route", [
    ["center", "counterexample", "节点中心", "Node center", "中心被按下时，外围线路立即断开。", "Pressing the center immediately breaks the outer circuit."],
    ["halo", "observation", "节点外围光晕", "Node outer halo", "注意力经过外围时，纸下线路向前生长。", "Passing attention around the edge grows the circuit under the paper."],
    ["hold", "relation", "被持续按住的节点", "A held node", "持续按住只让短路压痕变深。", "Holding only deepens the short-circuit imprint."],
  ], ["center", "halo"], "线路回应经过，不回应按下。", "The circuit responds to passing attention, not pressing."),
  defineEvidence(12, "layers", [
    ["overlap", "counterexample", "直接重叠的两张风景纸", "The two landscape sheets directly overlapped", "纸面出现两条地平线重影。", "Two horizon lines appear as a double image."],
    ["depth", "observation", "交换前后层的风景纸", "Landscape sheets with swapped depth", "倒影浮到天空上方，层序与景义矛盾。", "The reflection floats above the sky, contradicting the scene."],
    ["tear", "relation", "方向相反的纸边撕口", "Opposing torn paper edges", "两处撕口的纤维能够共享同一条边。", "The torn fibers can share one edge."],
  ], ["overlap", "depth"], "位置与层序必须共同生成一条地平线。", "Position and depth order must create one shared horizon together."),
  defineEvidence(13, "projection", [
    ["duration", "observation", "三片声纹花瓣", "Three waveform petals", "花瓣留下短、中、长三种可见衰减。", "The petals leave short, medium, and long visible decays."],
    ["color", "counterexample", "同色花瓣与空隙", "Same-color petal and gap", "颜色吻合，但衰减尾迹越过空隙。", "The colors match, but the decay trail crosses the gap."],
    ["gap", "relation", "三段沉默空隙", "Three silent gaps", "空隙以与花瓣相同的持续时间呼吸。", "The gaps breathe for the same durations as the petals."],
  ], ["duration", "color", "gap"], "声纹持续多久，沉默就需要多长。", "The duration of each waveform determines the length of its silence."),
  defineEvidence(14, "route", [
    ["trace", "observation", "恒速经过曲线的墨珠", "Ink bead moving at constant speed", "墨珠经过每段时速度保持不变。", "The bead keeps the same speed through every segment."],
    ["equal", "counterexample", "五次等间隔纸拍", "Five evenly spaced paper taps", "等间隔拍击投出四段等长的错误影。", "Even taps project four equally long, incorrect shadows."],
    ["distance", "relation", "短长交替的四段路径", "Four alternating short and long path segments", "路径距离按短、长、短、长交替。", "The path distances alternate short, long, short, long."],
  ], ["trace", "equal", "distance"], "恒速把距离转换成等待时间。", "Constant speed converts distance into waiting time."),
  defineEvidence(15, "projection", [
    ["beam", "counterexample", "恒速光束", "Constant-speed light beam", "光束的速度刻线被锁定。", "The beam's speed marks are locked."],
    ["late", "observation", "总是迟到的纸点", "The consistently late paper point", "移动纸点会即时改变下一次亮起时刻。", "Moving the point immediately changes its next lighting time."],
    ["color", "relation", "纸点颜色", "Paper point color", "颜色变化没有改变任何亮起间隔。", "Changing color does not alter any lighting interval."],
  ], ["beam", "color", "late"], "光没有变慢，是路程制造了迟到。", "The light did not slow down; distance created the delay."),
  defineEvidence(16, "layers", [
    ["dot", "counterexample", "备用墨点", "Spare ink dot", "直接放置时出现多个几乎相同的候选槽。", "Direct placement reveals several nearly identical candidate slots."],
    ["ruler", "observation", "未对齐的透明检查尺", "Misaligned transparent inspection ruler", "检查尺错相时，多个差异槽同时亮起。", "When the ruler is out of phase, several difference slots light up."],
    ["match", "relation", "尺与刻带的重合线", "Overlapping ruler and strip marks", "重合信息被折射消隐，只剩一个差异。", "Matching information disappears through refraction, leaving one difference."],
  ], ["dot", "ruler", "match"], "先建立比较基准，唯一差异才会出现。", "A comparison baseline must be established before one difference can emerge."),
  defineEvidence(17, "layers", [
    ["nodes", "counterexample", "四个纸谱节点", "Four score nodes", "节点被按下只留下普通压痕，没有节奏回应。", "Pressing the nodes leaves ordinary imprints with no rhythm response."],
    ["wrong-fold", "observation", "从错误方向掀起的折角", "Fold corner lifted in the wrong direction", "背面墨线远离纸谱缺口。", "The ink line on the back moves away from the missing score line."],
    ["ink", "relation", "折角纸边透出的墨色", "Ink showing through the folded edge", "透墨与前三条竖线拥有相同宽度和间距。", "The showing ink has the same width and spacing as the first three lines."],
  ], ["nodes", "wrong-fold", "ink"], "缺失的拍在纸背，方向决定它能否接回。", "The missing beat is on the back; the fold direction determines whether it reconnects."),
  defineEvidence(18, "layers", [
    ["direct", "counterexample", "直接相接的丝带断端", "Ribbon ends joined directly", "位置吻合，但丝带纹理翻面并穿过页签。", "The positions match, but the ribbon texture flips and passes through a tab."],
    ["tabs", "observation", "被移开的两个页签", "The two moved tabs", "页签移动后，上下压痕仍留在原处。", "After the tabs move, the over-under imprints remain fixed."],
    ["imprint", "relation", "一上一下的纸边压痕", "One-over-one-under edge imprints", "两处压痕记录了不同的穿行深度。", "The two imprints record different traversal depths."],
  ], ["direct", "tabs", "imprint"], "路线不仅有方向，还包含前后层级。", "The route contains depth order as well as direction."),
  defineEvidence(19, "route", [
    ["open", "counterexample", "被打开的档案页签", "An opened archive tab", "内容打开后，半透明路线立即中断。", "Opening the content immediately breaks the translucent route."],
    ["edge", "observation", "页签外围", "Outer edge of a tab", "注意力停在外围时，下一段光带显现。", "Holding attention at the edge reveals the next light segment."],
    ["continuity", "relation", "连续出现的光带", "Successive light segments", "每段只从当前获得注意力的页签投向下一枚。", "Each segment projects only from the currently attended tab to the next."],
  ], ["open", "edge", "continuity"], "路线由注意力接力，不由内容打开。", "The route is relayed by attention, not by opening content."),
  defineEvidence(20, "language", [
    ["left-right", "counterexample", "从左到右聚焦的纸层", "Paper layers focused left to right", "前层刚变清晰，就被后层重新吞回模糊。", "A front layer becomes clear, then the deeper layer absorbs the clarity again."],
    ["source", "observation", "没有入向压痕的深层", "Deep layer with no incoming imprint", "最深层只有出向边，没有清晰度流入。", "The deepest layer has only an outgoing edge and no incoming clarity."],
    ["arrow", "relation", "纸边深浅箭头", "Depth arrows on the paper edges", "箭头记录清晰度从深处向前传递。", "The arrows record clarity moving from depth toward the front."],
  ], ["left-right", "source", "arrow"], "清晰度有方向，起点在唯一没有入向的深层。", "Clarity has a direction, starting at the only deep layer with no incoming edge."),
  defineEvidence(21, "breath", [
    ["text", "counterexample", "移动的文字带", "Moving text band", "文字被按下后反而加速。", "Pressing the text makes it accelerate."],
    ["wrong-gap", "observation", "跟随文字移动的空隙", "A gap moving with the text", "这个空隙只让相邻两条纸带局部减速。", "This gap slows only the two neighboring strips."],
    ["fixed-gap", "relation", "位置固定的中央空白", "The fixed central blank", "所有文字交会时，只有这块空白保持不动。", "At every crossing, only this blank area stays fixed."],
  ], ["text", "wrong-gap", "fixed-gap"], "不要追移动的文字，固定空白才是共同控制面。", "Do not chase the moving text; the fixed blank is the shared control surface."),
  defineEvidence(22, "language", [
    ["one-language", "counterexample", "单独完整的中文句带", "The independently completed Chinese sentence band", "中文句末清晰时，英文句带的倒影断裂。", "When the Chinese ending is clear, the English band's reflection breaks."],
    ["mirror", "observation", "镜像联动的标点", "Mirrored punctuation marks", "移动一枚标点，另一枚向相反方向响应。", "Moving one punctuation mark moves the other in the opposite direction."],
    ["fiber", "relation", "共享空槽的双面纤维", "Double-sided fibers in the shared slot", "空槽两面分别匹配两种句末。", "The two sides of the slot match the two sentence endings."],
  ], ["one-language", "mirror", "fiber"], "两个句末共享一个位置，不能分开解决。", "The two sentence endings share one position and cannot be solved separately."),
  defineEvidence(23, "breath", [
    ["orbit", "counterexample", "单独绕行的丝带", "Ribbon moved around by itself", "纸轴反弹，刚绕出的部分按比例退回。", "The paper axle rebounds and part of the loop unwinds."],
    ["anchor", "observation", "单独按住的纸轴", "Paper axle held by itself", "反弹消失，但丝带没有向前绕行。", "The rebound stops, but the ribbon makes no progress."],
    ["overlap", "relation", "轴压纹与环行刻线", "Axle imprint and orbit marks", "两组刻线只有在时间重叠时同时稳定。", "Both sets of marks stabilize only when their times overlap."],
  ], ["orbit", "anchor", "overlap"], "固定和绕行承担不同角色，并且必须同时存在。", "Holding and orbiting have different roles and must overlap in time."),
  defineEvidence(24, "language", [
    ["semantic", "counterexample", "按语义排列的三条句带", "Three sentence bands ordered by meaning", "句子可读，却在交会处产生自相矛盾的词义。", "The sentence is readable but contradicts itself at the crossings."],
    ["global", "observation", "统一前后层序", "One global depth order", "统一层序修正一处交会，却破坏另一处。", "A global order fixes one crossing and breaks the other."],
    ["weave", "relation", "纸边上下载纹", "Over-under weave marks on the edges", "两处交叉各自记录谁从谁上方经过。", "Each crossing separately records which band passes over the other."],
  ], ["semantic", "global", "weave"], "句义由两处独立的上下关系共同生成。", "The sentence meaning is generated by two independent over-under relationships."),
  defineEvidence(25, "state", [
    ["grab", "counterexample", "被追逐的回转纸票", "Return ticket being chased", "抓取得越快，纸票越向页面外躲。", "The faster it is grabbed, the farther it retreats off the page."],
    ["still", "observation", "停止追逐后的纸票", "Return ticket after the chase stops", "停手后，纸票会朝页面方向回弹。", "After the chase stops, the ticket rebounds toward the page."],
    ["cover", "relation", "关内盖页的完整遮挡", "Complete occlusion by the in-level cover", "完全遮住再揭开时，纸票从页面后层返回。", "After full cover and reveal, the ticket returns from behind the page."],
  ], ["grab", "still", "cover"], "纸票回应离开和返回，而不是更快的抓取。", "The ticket responds to leaving and returning, not faster grabbing."),
  defineEvidence(26, "route", [
    ["forward", "counterexample", "向目标方向移动的把手", "Handle moved toward the target", "把手向右时，云影缺口向左，误差扩大。", "Moving the handle right sends the cloud gap left and increases the error."],
    ["back", "observation", "翻到背面的纸尺", "Paper ruler flipped to its back", "背面仍保持相同的反写方向。", "The back preserves the same reversed direction."],
    ["distance", "relation", "云缺口与无刻度位的间距", "Distance between cloud gap and blank tick", "每次小幅试探都以相反方向改变这段距离。", "Every small probe changes this distance in the opposite direction."],
  ], ["forward", "back", "distance"], "控制方向被改写，但世界坐标中的目标没有改变。", "The control direction is reversed, while the world-space target stays fixed."),
  defineEvidence(27, "state", [
    ["labels-a", "counterexample", "第一次出现的档案文字", "First set of archive labels", "重新观察后，文字顺序发生变化。", "On another observation, the label order changes."],
    ["shadows", "observation", "标签投出的三角影", "Triangular shadows cast by the labels", "文字改变时，三角影的方向关系保持稳定。", "When the text changes, the shadow directions remain stable."],
    ["source", "relation", "没有入向影的标签", "The tab with no incoming shadow", "只有一枚标签没有任何影子指向它。", "Exactly one tab has no shadow pointing into it."],
  ], ["labels-a", "shadows", "source"], "会变的是名字，不变的是有向关系。", "Names change; directed relationships do not."),
  defineEvidence(28, "projection", [
    ["solid", "counterexample", "最先出现的实体波纹", "The first solid ripple", "实体波纹进入缺弧时被不同材质排斥。", "The solid ripple is rejected by the gap's different material."],
    ["wait", "observation", "实体波纹离开后的纸轮", "Paper wheel after the solid ripple leaves", "短暂间隔后，半透明回声从后层反向返回。", "After a short interval, a translucent echo returns from the rear layer."],
    ["material", "relation", "半透明缺弧", "Translucent missing arc", "缺弧与回声拥有相同的透明纸纹。", "The missing arc and the echo share the same translucent paper grain."],
  ], ["solid", "wait", "material"], "最先出现的是输入结果，随后返回的回声才匹配缺口。", "The first object is the input result; the returning echo matches the gap."),
  defineEvidence(29, "route", [
    ["two-circles", "counterexample", "分开闭合的两个圆", "Two separately closed circles", "两枚圆章完整，但中央没有共享墨迹。", "Both circular stamps close, but the center has no shared ink."],
    ["outline", "observation", "绕外轮廓的一圈", "One loop around the outer outline", "外圈只形成一个闭域，内部两瓣仍然缺墨。", "The outer loop forms one region while both inner lobes remain incomplete."],
    ["crossing", "relation", "中央双向压痕", "The two-direction center imprint", "中心要求从不同方向进入和离开两次。", "The center requires two crossings with different entry and exit directions."],
  ], ["two-circles", "outline", "crossing"], "结果由连续性、双瓣和共享中心决定，不由外形相似决定。", "Continuity, two lobes, and one shared center define the result, not visual similarity."),
  defineEvidence(30, "state", [
    ["mark", "observation", "有依据的半圆压痕", "A supported semicircle imprint", "纸点落入半圆后，原位留下吻合的浅影。", "Placing the dot in a semicircle leaves a matching faint imprint."],
    ["move", "counterexample", "在两处快速往返的纸点", "Paper dot moved quickly between two places", "纸点只改变当前位置，没有复制出第二枚。", "The dot only changes its current position and does not duplicate."],
    ["reset", "relation", "重来后保留的浅影", "Faint imprint retained after retry", "现在层复位了，历史层的浅影仍然存在。", "The present layer resets while the historical imprint remains."],
  ], ["mark", "move", "reset"], "重来只复位现在层，世界保留了一处历史位置。", "Retry resets the present layer while the world retains one historical position."),
  defineEvidence(31, "layers", [
    ["items", "counterexample", "菜单中的正常设置项", "Normal settings inside the menu", "设置项只执行原有功能，没有改变谜题结构。", "The settings perform their normal functions and do not change the puzzle."],
    ["eclipse", "observation", "菜单缺口与场景太阳", "Menu cutout and scene sun", "缺口套住太阳时形成完整圆影，但它仍停在菜单层。", "Aligning the cutout with the sun creates a circle that remains on the menu layer."],
    ["close", "relation", "仍然打开的菜单纸层", "The still-open menu paper", "菜单打开时，圆影没有落到数字所在页面。", "While the menu stays open, the circular shadow does not reach the number layer."],
  ], ["items", "eclipse", "close"], "菜单本身是一张功能纸层，关闭动作会转移它留下的影子。", "The menu is a functional paper layer; closing it transfers the shadow it created."),
  defineEvidence(32, "state", [
    ["window", "counterexample", "真实浏览器窗口", "The real browser window", "真实窗口变化只重排页面，不进入关内关系。", "Changing the real window only reflows the page and does not enter the in-level relationship."],
    ["narrow", "observation", "未夹住的关内窄版丝带", "Unclipped ribbon in the narrow in-level viewport", "未留下夹痕就展开时，窄版关系消失。", "Expanding without an imprint removes the narrow-layout relationship."],
    ["clip", "relation", "窄版中央纸夹", "Center paper clip in the narrow layout", "纸夹把点带关系保留在历史层。", "The paper clip preserves the dotted-ribbon relationship in the historical layer."],
  ], ["window", "narrow", "clip"], "要跨宽度保留关系，必须先在关内窄版留下夹痕。", "To preserve a relationship across widths, first leave an imprint in the in-level narrow layout."),
  defineEvidence(33, "layers", [
    ["taps", "counterexample", "六次纸拍", "Six paper taps", "拍击没有让任何端点或纸层发生变化。", "The taps do not change any endpoint or paper layer."],
    ["one-fold", "observation", "沿中线折起的一段", "One segment folded at its midpoint", "折叠后，原本分开的两个端点向同一区域靠近。", "After folding, two separated endpoints move toward one region."],
    ["length", "relation", "长段包住短段的纸带", "Long strips enclosing short strips", "长短关系允许多组端点通过折叠重合。", "The long-short relationship allows several endpoints to coincide through folding."],
  ], ["taps", "one-fold", "length"], "这一关把时间距离折叠，而不是演奏六拍。", "This rule folds temporal distance instead of performing six beats."),
  defineEvidence(34, "layers", [
    ["shape", "counterexample", "只对齐形状的三张时间片", "Three time sheets aligned only by shape", "圆环完整了，但方向性重影仍然存在。", "The ring is complete, but directional afterimages remain."],
    ["color", "observation", "按颜色深浅排列的时间片", "Time sheets ordered by color depth", "颜色顺序没有接通纸边的因果压痕。", "The color order does not connect the causal edge imprints."],
    ["causal", "relation", "三张纸边的先后压痕", "Before-after imprints on the three edges", "相邻压痕只在过去、现在、未来的顺序中连续。", "Adjacent imprints connect only in past, present, future order."],
  ], ["shape", "color", "causal"], "完整形状是一个条件，时间前后是另一个条件。", "A complete shape is one condition; temporal order is another."),
  defineEvidence(35, "projection", [
    ["beats", "counterexample", "二拍、三拍与六拍点击", "Two, three, and six beat taps", "点击只让各自纸波变深，没有生成共同点。", "Tapping only darkens each paper wave and does not create shared points."],
    ["crest", "observation", "单一波峰对齐", "Single crest alignment", "一个波峰重合时，其他交点仍散落在孔外。", "When one crest aligns, the other intersections remain outside the holes."],
    ["band", "relation", "错相的六孔检查带", "Six-hole inspection band out of phase", "错相时部分孔为空，只有共同周期能贯穿全部六孔。", "Out of phase, some holes stay empty; only the shared cycle passes through all six."],
  ], ["beats", "crest", "band"], "两种节奏的共同周期是一个整体空间相位。", "The shared cycle of the two rhythms is one spatial phase."),
  defineEvidence(36, "projection", [
    ["stars", "counterexample", "随意连接的亮星", "Arbitrarily connected bright stars", "连线停在表面，没有来自两组星之间的依据。", "The line stays on the surface with no evidence from the space between the groups."],
    ["one-side", "observation", "只移动一侧的星群", "Only one moved star cluster", "中央空白只显出半个不稳定轮廓。", "The central blank reveals only half of an unstable outline."],
    ["void", "relation", "两组星之间的负空间", "Negative space between both star groups", "两侧互补边靠近时，中央空白形成三个稳定交点。", "As complementary edges approach, the central blank forms three stable junctions."],
  ], ["stars", "one-side", "void"], "最后的路径不在任何一颗星上，而在两组星之间。", "The final path is not on any one star; it exists between the two groups."),
] satisfies readonly DirectorEvidenceDefinition[]);

export const DIRECTOR_EVIDENCE_BY_LEVEL: ReadonlyMap<number, DirectorEvidenceDefinition> = new Map(
  DIRECTOR_EVIDENCE_DEFINITIONS.map((definition) => [definition.levelNumber, definition]),
);
