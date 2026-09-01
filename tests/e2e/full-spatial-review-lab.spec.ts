import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { FULL_SPATIAL_REVIEW_RECIPES } from "../../src/game/full-spatial-review";

const route = "/playtest-v2/spatial?level=1";
const fullAuditProjects = new Set(["desktop-1440", "mobile-360", "mobile-390", "tablet-768"]);
const representativeLevels = [1, 3, 8, 43, 81, 100] as const;

async function chooseLevel(page: Page, id: number) {
  await page.locator("select").first().selectOption(String(id));
  await expect(page.locator(`[data-v2-level="${String(id).padStart(3, "0")}"]`)).toBeVisible();
}

async function layoutEvidence(page: Page) {
  return page.evaluate(() => {
    const stage = document.querySelector<HTMLElement>("section[data-field]");
    const scene = document.querySelector<HTMLElement>('[data-testid="puzzle-scene"]');
    const controller = scene?.querySelector<HTMLElement>('[data-testid^="v2-scene-"]');
    const stageRect = stage?.getBoundingClientRect();
    const sceneRect = scene?.getBoundingClientRect();
    const interactive = [...(scene?.querySelectorAll<HTMLElement>('button,[role="application"],[tabindex="0"],input,select') ?? [])]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          label: element.getAttribute("aria-label") ?? element.getAttribute("data-testid") ?? element.tagName,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          rendered: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0,
        };
      })
      .filter((item) => item.rendered);

    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      stage: stageRect ? { top: stageRect.top, bottom: stageRect.bottom } : null,
      sceneHeight: sceneRect?.height ?? 0,
      controller: controller?.getAttribute("data-controller") ?? null,
      interactive,
    };
  });
}

async function protectedSpatialIntersections(page: Page) {
  return page.evaluate(() => {
    const protectedNodes = [
      document.querySelector<HTMLElement>('[data-timer-protection="value"]'),
      document.querySelector<HTMLElement>('[data-timer-protection="status"]'),
      document.querySelector<HTMLElement>('[data-timer-protection="primary"]'),
    ].filter((node): node is HTMLElement => Boolean(node));
    const visibleVolumes = [...document.querySelectorAll<HTMLElement>('[data-anchor-index]:not([hidden])')]
      .filter((node) => {
        const style = getComputedStyle(node);
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
      });
    const intersects = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return visibleVolumes.flatMap((volume) => {
      const volumeRect = volume.getBoundingClientRect();
      return protectedNodes.filter((node) => intersects(volumeRect, node.getBoundingClientRect())).map((node) => ({
        anchor: volume.dataset.anchorSelector,
        protection: node.dataset.timerProtection,
      }));
    });
  });
}

async function expectAllLevelsContained(page: Page) {
  for (let id = 1; id <= 100; id += 1) {
    await chooseLevel(page, id);
    const expectedRecipe = FULL_SPATIAL_REVIEW_RECIPES[id - 1];
    const objectField = page.locator(`[data-trace-key="${expectedRecipe.traceKey}"]`);
    await expect(objectField).toHaveAttribute("data-signature", expectedRecipe.signatureSilhouette);
    await expect(objectField).toHaveAttribute("data-silhouette", expectedRecipe.silhouettePrimitive);
    await expect(objectField).toHaveAttribute("data-success-composition", expectedRecipe.successComposition);
    await expect(objectField.locator('[data-anchor-index]')).toHaveCount(expectedRecipe.anchorSelectors.length);
    for (const role of expectedRecipe.anchorRoles) await expect(objectField.locator(`[data-anchor-role="${role}"]`)).toHaveCount(1);
    const evidence = await layoutEvidence(page);
    expect(evidence.controller, `level ${id} controller`).not.toBeNull();
    expect(evidence.sceneHeight, `level ${id} scene height`).toBeGreaterThanOrEqual(780);
    expect(evidence.documentWidth, `level ${id} horizontal overflow`).toBeLessThanOrEqual(evidence.viewportWidth + 1);
    expect(evidence.stage, `level ${id} stage`).not.toBeNull();

    for (const control of evidence.interactive) {
      expect(control.right, `level ${id} ${control.label} left of viewport`).toBeGreaterThan(3);
      expect(control.left, `level ${id} ${control.label} right of viewport`).toBeLessThan(evidence.viewportWidth - 3);
      expect(control.bottom, `level ${id} ${control.label} above stage`).toBeGreaterThan((evidence.stage?.top ?? 0) - 4);
      expect(control.top, `level ${id} ${control.label} below stage`).toBeLessThan((evidence.stage?.bottom ?? Number.POSITIVE_INFINITY) + 4);
    }
  }
}

test.describe("FULL/100 isolated spatial review lab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(route);
    const switchToChinese = page.getByRole("button", { name: "中文" });
    if (await switchToChinese.isVisible()) await switchToChinese.click();
    await expect(page.getByText("001 / TH-SP-001")).toBeVisible();
  });

  test("keeps all 100 original controllers inside a reachable, horizontally contained stage", async ({ page }, testInfo) => {
    test.setTimeout(600_000);
    test.skip(!fullAuditProjects.has(testInfo.project.name), "The exhaustive pass runs on the frozen desktop and mobile review widths.");
    await expectAllLevelsContained(page);
  });

  test("keeps answer-bearing object geometry hidden until discovery", async ({ page }) => {
    const objectField = page.locator('[data-trace-key="TH-SP-001"]');
    await expect(objectField).toHaveAttribute("data-revealed", "false");
    await expect(objectField.locator('[data-anchor-index]:not([hidden])')).toHaveCount(0);
    await expect(objectField.locator("path")).toHaveCSS("opacity", "0");
    await expect(objectField.locator('[data-object-seal="true"]')).toHaveCSS("opacity", "0");
  });

  test("keeps revealed spatial depth outside timer copy and primary controls across all levels", async ({ page }, testInfo) => {
    test.setTimeout(600_000);
    test.skip(!fullAuditProjects.has(testInfo.project.name), "The exhaustive protection pass runs on the frozen review widths.");
    for (let id = 1; id <= 100; id += 1) {
      await chooseLevel(page, id);
      await page.getByRole("button", { name: "success" }).click();
      await expect.poll(() => protectedSpatialIntersections(page), { message: `level ${id} spatial protection` }).toEqual([]);
    }
  });

  test("binds visible depth edges to measured object geometry without an independent XY offset", async ({ page }, testInfo) => {
    test.setTimeout(600_000);
    test.skip(testInfo.project.name !== "desktop-1440", "The exact anchor audit runs once at the widest frozen geometry.");
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (let id = 1; id <= 100; id += 1) {
      await chooseLevel(page, id);
      await page.getByRole("button", { name: "success" }).click();
      await page.waitForTimeout(24);
      const errors = await page.evaluate(() => {
        const stage = document.querySelector<HTMLElement>("section[data-field]");
        const scene = document.querySelector<HTMLElement>('[data-testid="puzzle-scene"]');
        if (!stage || !scene) return ["missing stage or scene"];
        const stageRect = stage.getBoundingClientRect();
        const controls = [...scene.querySelectorAll<HTMLElement>('button,[role="application"],input,select')];
        const resolve = (selector: string) => selector.startsWith("@control:")
          ? controls[Number(selector.slice("@control:".length))]
          : scene.querySelector<HTMLElement>(selector);
        return [...document.querySelectorAll<HTMLElement>('[data-anchor-index]')].flatMap((volume) => {
          const selector = volume.dataset.anchorSelector ?? "";
          const anchor = resolve(selector);
          if (!anchor || !volume.style.getPropertyValue("--anchor-x")) return [];
          const rect = anchor.getBoundingClientRect();
          const actual = {
            x: Number.parseFloat(volume.style.getPropertyValue("--anchor-x")),
            y: Number.parseFloat(volume.style.getPropertyValue("--anchor-y")),
            width: Number.parseFloat(volume.style.getPropertyValue("--anchor-width")),
            height: Number.parseFloat(volume.style.getPropertyValue("--anchor-height")),
          };
          const expected = { x: rect.left - stageRect.left, y: rect.top - stageRect.top, width: rect.width, height: rect.height };
          const maxError = Math.max(...Object.keys(expected).map((key) => Math.abs(actual[key as keyof typeof actual] - expected[key as keyof typeof expected])));
          return maxError <= .11 ? [] : [`${selector}: ${maxError}`];
        });
      });
      expect(errors, `level ${id} anchor geometry`).toEqual([]);
    }
  });

  test("keeps all 100 controllers reachable at the frozen 590×698 and 734×876 short/tablet viewports", async ({ page }, testInfo) => {
    test.setTimeout(600_000);
    test.skip(testInfo.project.name !== "desktop-1440", "The two extra frozen geometries run once in the desktop browser engine.");
    for (const viewport of [{ width: 590, height: 698 }, { width: 734, height: 876 }]) {
      await page.setViewportSize(viewport);
      await chooseLevel(page, 1);
      await expectAllLevelsContained(page);
    }
  });

  test("keeps representative edge, stack, route, dual-input, and constellation scenes reachable", async ({ page }) => {
    for (const id of representativeLevels) {
      await chooseLevel(page, id);
      const evidence = await layoutEvidence(page);
      expect(evidence.controller).not.toBeNull();
      expect(evidence.documentWidth).toBeLessThanOrEqual(evidence.viewportWidth + 1);
      expect(evidence.interactive.every((control) => control.right > 3 && control.left < evidence.viewportWidth - 3)).toBe(true);
    }
  });

  test("shows the actual level 081 merged geometry in success", async ({ page }) => {
    await chooseLevel(page, 81);
    await page.getByRole("button", { name: "success" }).click();
    const scene = page.getByTestId("v2-scene-081");
    await expect(scene).toHaveAttribute("data-ring-state", "complete");
    await expect(scene).toHaveAttribute("data-pointer-half", "docked");
    await expect(scene).toHaveAttribute("data-companion-half", "docked");

    await expect.poll(async () => {
      const [pointer, companion] = await Promise.all([
        page.getByTestId("dual-pointer-half").boundingBox(),
        page.getByTestId("dual-companion-half").boundingBox(),
      ]);
      return Math.abs((pointer?.x ?? 0) - (companion?.x ?? 0));
    }).toBeLessThan(1);
    const [pointer, companion] = await Promise.all([
      page.getByTestId("dual-pointer-half").boundingBox(),
      page.getByTestId("dual-companion-half").boundingBox(),
    ]);
    expect(pointer).not.toBeNull();
    expect(companion).not.toBeNull();
    expect(Math.abs((pointer?.y ?? 0) - (companion?.y ?? 0))).toBeLessThan(1);
  });

  test("does not restart the running timer when the original controller unlocks", async ({ page }) => {
    await page.getByRole("button", { name: "开始" }).click();
    const timer = page.locator('section[aria-label="隔离计时状态"] span').first();
    await expect.poll(async () => Number(await timer.textContent()), { message: "running timer advances before unlock" }).toBeGreaterThan(.15);
    const before = Number(await timer.textContent());
    const corner = page.getByRole("button", { name: "游离的纸角" });
    await corner.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("main")).toHaveAttribute("data-armed", "true");
    await page.waitForTimeout(160);
    const after = Number(await timer.textContent());
    expect(after).toBeGreaterThanOrEqual(before);
  });

  test("freezes the current spatial frame in stopped instead of snapping to idle", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "reduced-motion", "Reduced motion removes the continuous animation instead of pausing a live frame.");
    await page.getByRole("button", { name: "running" }).click();
    const plane = page.locator('[class*="fieldPlane"]').first();
    await page.waitForTimeout(180);
    await page.getByRole("button", { name: "stopped" }).click();
    await page.waitForTimeout(100);
    const first = await plane.evaluate((element) => {
      const style = getComputedStyle(element);
      return { transform: style.transform, playState: style.animationPlayState };
    });
    await page.waitForTimeout(180);
    const second = await plane.evaluate((element) => {
      const style = getComputedStyle(element);
      return { transform: style.transform, playState: style.animationPlayState };
    });
    expect(first.playState).toBe("paused");
    expect(second.playState).toBe("paused");
    expect(second.transform).toBe(first.transform);
  });

  test("turns the visual layer fully off without changing the original level 001 keyboard result", async ({ page }) => {
    const solve = async () => {
      const corner = page.getByRole("button", { name: "游离的纸角" });
      await corner.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowDown");
      await expect(page.locator("main")).toHaveAttribute("data-armed", "true");
    };

    await solve();
    await page.getByRole("button", { name: /重置本关|Reset level/ }).click();
    await page.getByRole("button", { name: /空间层 开|Spatial on/ }).click();
    await expect(page.locator("main")).toHaveAttribute("data-spatial-enabled", "false");
    await expect(page.locator('[aria-hidden="true"][data-field="frame"]')).toHaveCount(0);
    await solve();
  });

  test("reduced motion removes continuous spatial animation while preserving state feedback", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "reduced-motion", "This assertion requires the reduced-motion browser project.");
    await page.getByRole("button", { name: "running" }).click();
    const animation = await page.locator('[class*="fieldPlane"]').evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return { duration: style.animationDuration, iterations: style.animationIterationCount };
    }));
    expect(animation.length).toBeGreaterThan(0);
    expect(animation.every(({ duration, iterations }) => {
      const seconds = duration.endsWith("ms") ? Number.parseFloat(duration) / 1000 : Number.parseFloat(duration);
      return seconds <= .000001 && iterations === "1";
    })).toBe(true);
    await expect(page.getByRole("button", { name: "停止" })).toBeVisible();
  });

  test("captures stable desktop and mobile review evidence", async ({ page }, testInfo) => {
    test.skip(!new Set(["desktop-1440", "mobile-390"]).has(testInfo.project.name), "Only the two frozen review sizes produce approval artifacts.");
    await chooseLevel(page, 81);
    await page.getByRole("button", { name: "success" }).click();
    await page.getByTestId("v2-scene-081").scrollIntoViewIfNeeded();
    const reviewRoot = path.resolve(".impeccable", "review");
    await mkdir(reviewRoot, { recursive: true });
    await page.screenshot({
      path: path.join(reviewRoot, testInfo.project.name === "desktop-1440" ? "desktop.png" : "mobile.png"),
      fullPage: testInfo.project.name === "mobile-390",
    });
  });

  test("captures full-page idle, success, and unarmed-miss composition evidence", async ({ page }, testInfo) => {
    test.skip(!new Set(["desktop-1440", "mobile-390"]).has(testInfo.project.name), "The full-page evidence uses the frozen desktop and mobile widths.");
    const reviewRoot = path.resolve(".impeccable", "review", "full-page", testInfo.project.name);
    await mkdir(reviewRoot, { recursive: true });
    for (const [id, phase] of [[1, "idle"], [81, "success"], [100, "miss"]] as const) {
      await chooseLevel(page, id);
      if (phase !== "idle") await page.getByRole("button", { name: phase }).click();
      const dock = page.locator('aside[aria-label="隔离原型评审控制"]');
      await dock.scrollIntoViewIfNeeded();
      await expect(dock).toBeVisible();
      await page.screenshot({ path: path.join(reviewRoot, `${String(id).padStart(3, "0")}-${phase}.png`), fullPage: true });
    }
  });

  test("captures the frozen six-level by five-state desktop/mobile evidence matrix", async ({ page }, testInfo) => {
    test.setTimeout(300_000);
    test.skip(!new Set(["desktop-1440", "mobile-390"]).has(testInfo.project.name), "The approval matrix uses the frozen desktop and mobile review widths.");
    const reviewRoot = path.resolve(".impeccable", "review", "representative", testInfo.project.name);
    await mkdir(reviewRoot, { recursive: true });
    for (const id of representativeLevels) {
      for (const phase of ["idle", "running", "stopped", "success", "miss"] as const) {
        await chooseLevel(page, id);
        if (phase === "stopped") {
          await page.getByRole("button", { name: "running" }).click();
          await page.waitForTimeout(80);
        }
        if (phase !== "idle") await page.getByRole("button", { name: phase }).click();
        await page.waitForTimeout(80);
        if (phase === "running") {
          await page.locator("main").evaluate((root) => root.getAnimations({ subtree: true }).forEach((animation) => animation.pause()));
        }
        await page.locator("section[data-field]").screenshot({ path: path.join(reviewRoot, `${String(id).padStart(3, "0")}-${phase}.png`) });
      }
    }
  });
});
