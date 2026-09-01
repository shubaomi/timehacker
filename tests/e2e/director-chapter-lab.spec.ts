import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DIRECTOR_CAMPAIGN } from "../../src/game/director-campaign";
import { DIRECTOR_EVIDENCE_BY_LEVEL } from "../../src/game/director-evidence";

const route = "/playtest-v2/director?level=1";
const campaign = DIRECTOR_CAMPAIGN;

async function switchToChinese(page: Page) {
  const button = page.getByRole("button", { name: "中文" });
  if (await button.isVisible()) await button.click();
}

async function chooseLevel(page: Page, number: number) {
  await page.getByRole("combobox", { name: "选择 Director’s Cut 关卡" }).selectOption(String(number));
  const level = campaign[number - 1];
  await expect(page.getByText(level.traceId)).toBeVisible();
  const formalScene = page.locator(`[data-v2-level="${String(level.legacyId).padStart(3, "0")}"]`);
  if (number > 1) {
    await expect(page.getByTestId("director-evidence-gate")).toBeVisible();
    await expect(page.getByTestId("director-final-scene")).toHaveCount(0);
    await expect(formalScene).toHaveCount(0);
  } else {
    await expect(formalScene).toHaveCount(1);
  }
}

async function completeEvidence(page: Page, number: number, requirePointerActionability = true) {
  const definition = DIRECTOR_EVIDENCE_BY_LEVEL.get(number);
  if (!definition) return;
  for (const [index, probeId] of definition.sequence.entries()) {
    const probe = page.getByTestId(`director-evidence-probe-${probeId}`);
    if (requirePointerActionability) await probe.click({ timeout: 20_000 });
    else await probe.dispatchEvent("click");
    if (index < definition.sequence.length - 1) {
      await expect(page.getByTestId("director-evidence-gate")).toHaveAttribute("data-step", String(index + 1));
    }
  }
  await expect(page.getByTestId("director-evidence-gate")).toHaveCount(0, { timeout: 5_000 });
  await expect(page.getByTestId("director-final-scene")).toHaveAttribute("data-evidence-ready", "true");
}

async function expectFinalSceneInteractable(page: Page, legacyId: number) {
  if (legacyId === 86) {
    const menuPaper = page.getByRole("button", { name: "菜单纸层" });
    await expect(menuPaper).toBeVisible();
    await expect(menuPaper).toBeEnabled();
    return;
  }
  const scene = page.locator(`[data-v2-level="${String(legacyId).padStart(3, "0")}"]`);
  const visibleControl = scene.locator('button:visible,[role="application"]:visible,input:visible,select:visible,[tabindex="0"]:visible').first();
  await expect(visibleControl).toBeVisible();
}

async function pageGeometry(page: Page) {
  return page.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('[data-testid="director-evidence-gate"],[data-testid="puzzle-scene"],[data-testid="v2-scene-001"]');
    const primaryRect = document.querySelector<HTMLElement>('[data-testid="director-primary"]')?.getBoundingClientRect();
    const timerRect = document.querySelector<HTMLElement>('.stopwatch-card')?.getBoundingClientRect();
    const overlaps = (rect: DOMRect, other?: DOMRect) => Boolean(other
      && rect.left < other.right
      && rect.right > other.left
      && rect.top < other.bottom
      && rect.bottom > other.top);
    const puzzleControls = [...(scene?.querySelectorAll<HTMLElement>('button,[role="application"],input,select,[tabindex="0"]') ?? [])];
    const menuControls = [...document.querySelectorAll<HTMLElement>('[data-testid="director-menu-paper"],[aria-label*="菜单纸层"] button,[aria-label*="menu paper" i] button')];
    const controls = [...puzzleControls, ...menuControls]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          label: element.getAttribute("aria-label") ?? element.getAttribute("data-testid") ?? element.tagName,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          candidate: element.getAttribute("data-corner-candidate"),
          overlapsPrimary: overlaps(rect, primaryRect),
          overlapsTimer: overlaps(rect, timerRect),
          rendered: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0,
        };
      })
      .filter((item) => item.rendered);
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      controls,
    };
  });
}

test.describe("Director's Cut 36-level isolated campaign", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(route);
    await switchToChinese(page);
    await expect(page.getByText("TH-DC-001")).toBeVisible();
  });

  test("keeps the opening implicit and unlocks only a visual-first delayed hint ladder", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "Exact virtual-clock timing is covered by the component test; WebKit runs the remaining interaction suite.");
    await page.clock.install();
    await page.reload();
    await switchToChinese(page);

    await expect(page.getByText("发现网页隐藏的规则")).toHaveCount(0);
    await expect(page.getByText("缺口的纸纤维短暂浮出")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "页边的纸片" })).toBeVisible();
    await expect(page.getByRole("button", { name: "纸页缺口" })).toBeVisible();
    await expect(page.getByRole("button", { name: "另一枚候选纸角" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "需要一点线索？" })).toHaveCount(0);

    const fragment = page.getByRole("button", { name: "页边的纸片" });
    await fragment.press("ArrowRight");
    await fragment.press("ArrowRight");
    await fragment.press("ArrowRight");
    await fragment.press("ArrowDown");
    await expect(page.locator("main")).toHaveAttribute("data-armed", "false");
    await expect(page.getByTestId("v2-scene-001")).toHaveAttribute("data-rejected-candidate", "unprobed");

    await page.clock.fastForward(30_000);
    await expect(page.getByRole("button", { name: "需要一点线索？" })).toHaveCount(0);
    await page.clock.fastForward(16_000);
    await page.getByRole("button", { name: "需要一点线索？" }).click();
    await expect(page.locator("main")).toHaveAttribute("data-hint-level", "1");
    await expect(page.getByText("缺口的纸纤维短暂浮出")).toHaveCount(0);
    await page.getByRole("button", { name: "再给一点" }).click();
    await expect(page.getByText("页边碎片与缺口拥有同一段纤维方向")).toBeVisible();
    await page.getByRole("button", { name: "显示最后提示" }).click();
    await expect(page.getByText("先检查纸页缺口，再把页边纸片装回去")).toBeVisible();
  });

  for (const [label, start, end] of [
    ["001-012", 1, 12],
    ["013-024", 13, 24],
    ["025-036", 25, 36],
  ] as const) {
    test(`keeps ${label} horizontally contained and vertically reachable in both stages`, async ({ page }) => {
      for (let number = start; number <= end; number += 1) {
        const level = campaign[number - 1];
        await chooseLevel(page, level.number);

        const geometries = [{ phase: level.number === 1 ? "final" : "evidence", value: await pageGeometry(page) }];
        if (level.number > 1) {
          await completeEvidence(page, level.number, false);
          await expectFinalSceneInteractable(page, level.legacyId);
          geometries.push({ phase: "final", value: await pageGeometry(page) });
        }

        for (const { phase, value: geometry } of geometries) {
          const trace = `${level.traceId} ${phase}`;
          expect.soft(geometry.documentWidth, trace).toBeLessThanOrEqual(geometry.viewportWidth + 1);
          expect.soft(geometry.documentHeight, trace).toBeGreaterThan(0);
          expect.soft(geometry.controls.length, trace).toBeGreaterThan(0);
          for (const control of geometry.controls) {
            expect.soft(control.right, `${trace} ${control.label} left`).toBeGreaterThan(2);
            expect.soft(control.left, `${trace} ${control.label} right`).toBeLessThan(geometry.viewportWidth - 2);
            expect.soft(control.bottom, `${trace} ${control.label} above document`).toBeGreaterThan(0);
            expect.soft(control.top, `${trace} ${control.label} below document`).toBeLessThan(geometry.documentHeight + 2);
            expect.soft(control.overlapsPrimary, `${trace} ${control.label} overlaps the timer action`).toBe(false);
            expect.soft(control.overlapsTimer, `${trace} ${control.label} is hidden by the timer card`).toBe(false);
          }
        }
      }
    });
  }

  for (const [label, start, end] of [
    ["002-012", 2, 12],
    ["013-024", 13, 24],
    ["025-036", 25, 36],
  ] as const) {
    test(`opens ${label} only after each frozen evidence sequence`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop-1440", "The full evidence traversal runs once on desktop; geometry covers all responsive projects.");
      for (let number = start; number <= end; number += 1) {
        const level = campaign[number - 1];
        await test.step(level.traceId, async () => {
          await chooseLevel(page, number);
          await completeEvidence(page, number);
          await expectFinalSceneInteractable(page, level.legacyId);
        });
      }
    });
  }
  test("keeps the evidence gate solvable with semantic keyboard activation", async ({ page }) => {
    await chooseLevel(page, 36);
    const definition = DIRECTOR_EVIDENCE_BY_LEVEL.get(36);
    if (!definition) throw new Error("Missing TH-DC-036 evidence definition");

    for (const [index, probeId] of definition.sequence.entries()) {
      const probe = page.getByTestId(`director-evidence-probe-${probeId}`);
      await probe.focus();
      await probe.press(index % 2 === 0 ? "Enter" : "Space");
      if (index < definition.sequence.length - 1) {
        await expect(page.getByTestId("director-evidence-gate")).toHaveAttribute("data-step", String(index + 1));
      }
    }

    await expect(page.getByTestId("director-evidence-gate")).toHaveCount(0);
    await expectFinalSceneInteractable(page, campaign[35].legacyId);
  });

  test("keeps Canvas decorative and preserves the keyboard solve path when it is disabled", async ({ page }) => {
    const canvas = page.getByTestId("spatial-time-field");
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    await expect(canvas).toHaveCSS("pointer-events", "none");

    await page.getByRole("button", { name: "空间反馈 开" }).click();
    await expect(canvas).toHaveCount(0);
    await page.getByRole("button", { name: "纸页缺口" }).press("Enter");
    const corner = page.getByRole("button", { name: "页边的纸片" });
    await corner.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("main")).toHaveAttribute("data-armed", "true");
    await expect(page.getByText("规则已经解锁。你仍需亲自停止时间。")).toBeVisible();
  });

  test("keeps the primary timer action semantic and makes misses immediately retryable", async ({ page }) => {
    await page.getByRole("button", { name: "开始" }).click();
    await expect(page.getByRole("button", { name: "停止" })).toBeVisible();
    await page.getByRole("button", { name: "停止" }).click();
    await expect(page.locator("main")).toHaveAttribute("data-phase", "miss");
    await expect(page.getByRole("button", { name: "重试" })).toBeVisible();
  });

  test("keeps reduced motion static while preserving puzzle and result feedback", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "reduced-motion", "Requires the reduced-motion project.");
    await expect(page.getByRole("button", { name: "页边的纸片" })).toBeVisible();
    await page.getByRole("button", { name: "开始" }).click();
    await expect(page.getByRole("button", { name: "停止" })).toBeVisible();
    const continuousAnimations = await page.locator("main *").evaluateAll((elements) => elements.filter((element) => {
      const style = getComputedStyle(element);
      const duration = style.animationDuration.endsWith("ms")
        ? Number.parseFloat(style.animationDuration) / 1_000
        : Number.parseFloat(style.animationDuration);
      return Number.isFinite(duration) && duration > .001 && style.animationIterationCount === "infinite";
    }).length);
    expect(continuousAnimations).toBe(0);
  });

  test("captures desktop and mobile approval evidence", async ({ page }, testInfo) => {
    test.skip(!new Set(["desktop-1440", "mobile-390", "tablet-768"]).has(testInfo.project.name), "Frozen approval sizes only.");
    const directory = path.resolve("artifacts", "screenshots", "director-campaign");
    await mkdir(directory, { recursive: true });
    await page.screenshot({
      path: path.join(directory, `${testInfo.project.name}-level-01-idle.png`),
      fullPage: true,
    });
    await chooseLevel(page, 36);
    await page.screenshot({
      path: path.join(directory, `${testInfo.project.name}-level-36-idle.png`),
      fullPage: true,
    });
    await completeEvidence(page, 36, false);
    await expectFinalSceneInteractable(page, campaign[35].legacyId);
    await page.screenshot({
      path: path.join(directory, `${testInfo.project.name}-level-36-final.png`),
      fullPage: true,
    });
  });
});
