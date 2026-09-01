import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { V2_CONTROLLER_KINDS, V2_LEVELS } from "@/game/v2-levels.generated";

const root = process.cwd();
const planDir = path.join(root, "docs", "plans");
const chapterFiles = Array.from({ length: 10 }, (_, index) => {
  const start = String(index * 10 + 1).padStart(3, "0");
  const end = String((index + 1) * 10).padStart(3, "0");
  return path.join(planDir, `2026-08-30-time-hacker-spatial-levels-${start}-${end}.md`);
});

const requiredLabels = [
  "规则身份证",
  "不可变玩家因果",
  "负例与验收锚点",
  "空间命题与 Time Hacker 身份",
  "第一屏层级",
  "发现与提示梯度",
  "五个计时状态",
  "关卡状态映射",
  "桌面与空间构图",
  "移动、平板与短屏",
  "reduced-motion 与无障碍",
  "实现边界",
  "几何完成态",
  "性能与生命周期",
  "实现前证据清单",
] as const;

function read(file: string) {
  return fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n");
}

function levelSections() {
  const sections = new Map<number, string>();
  for (const file of chapterFiles) {
    const content = read(file);
    const matches = [...content.matchAll(/^## TH-SP-(\d{3}) .+$/gm)];
    for (const [index, match] of matches.entries()) {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? content.length;
      sections.set(Number(match[1]), content.slice(start, end));
    }
  }
  return sections;
}

describe("FULL/100 spatial design documentation gate", () => {
  it("has one frozen detailed section for every stable level", () => {
    const sections = levelSections();
    expect(sections.size).toBe(100);
    expect([...sections.keys()]).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));

    for (const level of V2_LEVELS) {
      const section = sections.get(level.id);
      expect(section, `missing TH-SP-${String(level.id).padStart(3, "0")}`).toBeTruthy();
      expect(section).toContain(`\`${level.slug}\``);
      expect(section).toContain(`\`${level.controller}\``);
      expect(section).toContain(`正式输入“${level.input}”`);
      expect(section).toContain(`初始发现“${level.discovery}”`);
      expect(section).toContain(`玩家必须“${level.solve}”`);
      expect(section).toContain(level.acceptance);
      expect(section).toContain("状态为 `FROZEN`");
      for (const label of requiredLabels) expect(section).toContain(`**${label}**`);
    }
  });

  it("preserves all controller families instead of flattening the 100 levels", () => {
    const sections = levelSections();
    const documented = new Set(
      V2_LEVELS.map((level) => sections.get(level.id))
        .filter((section): section is string => Boolean(section))
        .flatMap((section) => [...section.matchAll(/，`([^`]+)`，正式输入/g)].map((match) => match[1])),
    );
    expect([...documented].sort()).toEqual([...V2_CONTROLLER_KINDS].sort());

    const spatialTheses = V2_LEVELS.map((level) => {
      const section = sections.get(level.id) ?? "";
      return section.match(/\*\*空间命题与 Time Hacker 身份\*\*：([^。]+)。/)?.[1];
    });
    expect(spatialTheses.every(Boolean)).toBe(true);
    expect(new Set(spatialTheses).size).toBe(100);
  });

  it("specifies the five visual phases without leaking an initial target", () => {
    for (const [id, section] of levelSections()) {
      const stateLine = section.match(/^- \*\*五个计时状态\*\*：(.+)$/m)?.[1] ?? "";
      for (const state of ["idle", "running", "stopped", "success", "miss"]) {
        expect(stateLine, `TH-SP-${String(id).padStart(3, "0")} missing ${state}`).toContain(`\`${state}\``);
      }
      const firstViewport = section.match(/^- \*\*第一屏层级\*\*：(.+)$/m)?.[1] ?? "";
      expect(firstViewport).toContain("初始不画目标框、答案轮廓或发光热区");
      expect(section).toContain("任何一级都不自动播放");
    }
  });

  it("locks the implementation boundary and deviation process before prototypes", () => {
    const design = read(path.join(root, "docs", "DESIGN.md"));
    const execution = read(path.join(planDir, "2026-08-30-time-hacker-full-100-spatial-design-execution-contract.md"));
    const index = read(path.join(planDir, "2026-08-30-time-hacker-full-100-spatial-level-spec-index.md"));

    expect(design).toContain("文档是实现的唯一设计事实来源");
    expect(design).toContain("设计矩阵中的单行摘要不能单独授权实现");
    expect(execution).toContain("禁止跳级");
    expect(execution).toContain("偏差 ID：TH-SP-###-D##");
    expect(execution).toContain("空间层关闭与开启的相同输入序列");
    expect(index.match(/^\| \d{3} \| `TH-SP-\d{3}`/gm)).toHaveLength(100);
  });

  it("freezes one geometry-correction row for every level before implementation", () => {
    const correction = read(path.join(planDir, "2026-08-30-time-hacker-full-100-spatial-geometry-correction-contract.md"));
    for (const requirement of ["VIS-GEO-001", "VIS-GEO-002", "VIS-GEO-003", "VIS-GEO-004", "VIS-GEO-005", "VIS-GEO-006", "UX-DIFF-001", "QA-GEO-001"]) {
      expect(correction).toContain(`\`${requirement}\``);
    }
    expect(correction.match(/^\| \d{3} \| `[^`]+` \|/gm)).toHaveLength(100);
    expect(correction).toContain("UNVERIFIED_HUMAN");
    expect(correction).toContain("UNVERIFIED_DEVICE");
  });
});
