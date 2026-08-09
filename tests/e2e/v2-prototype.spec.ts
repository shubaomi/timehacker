import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

let productionApiRequests: string[] = [];

test.beforeEach(async ({ context, page }) => {
  productionApiRequests = [];
  await context.addCookies([{ name: "time-hacker.locale", value: "zh", url: "http://127.0.0.1:3000" }]);
  page.on("request", (request) => {
    if (request.url().includes("/api/")) productionApiRequests.push(request.url());
  });
  await page.goto("/playtest-v2");
});

test.afterEach(() => {
  expect(productionApiRequests, "The isolated prototype must not call production APIs").toEqual([]);
});

test("renders three visually distinct representative scenes without horizontal overflow", async ({ page }, testInfo) => {
  await expect(page.getByRole("heading", { name: "Gate B · 代表关原型" })).toBeVisible();
  await expect(page.getByTestId("prototype-stage-001")).toBeVisible();

  for (const number of ["001", "003", "100"] as const) {
    await page.getByRole("button", { name: new RegExp(`关卡 ${number}`) }).click();
    await expect(page.getByTestId(`prototype-stage-${number}`)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`scene-${number}.png`), fullPage: true });
  }
});

test("supports the level 003 reasoning route and assisted timer state", async ({ page }) => {
  await page.getByRole("button", { name: /关卡 003/ }).click();
  const tiles = page.getByRole("button", { name: /^字牌 \d/ });
  await tiles.nth(0).click({ clickCount: 2 });
  await tiles.nth(1).click();
  await tiles.nth(2).click({ clickCount: 2 });
  await tiles.nth(3).click({ clickCount: 2 });
  await expect(page.getByText("抓到时间的破绽了")).toBeVisible();
  await page.getByRole("button", { name: "开始" }).click();
  await expect(page.getByText("9.98")).toBeVisible();
  await page.getByRole("button", { name: "停止" }).click();
  await expect(page.getByText("10.00")).toBeVisible();
  await expect(page.getByText("+0.00")).toBeVisible();
});

test("completes the level 001 drag and level 100 page-trace routes in a real browser", async ({ page }) => {
  const corner = page.getByRole("button", { name: "游离的纸角" });
  await corner.click();
  await expect(page.getByText("抓到时间的破绽了")).toHaveCount(0);
  await corner.dragTo(page.locator("[data-corner-target]"));
  await expect(page.getByText("抓到时间的破绽了")).toBeVisible();

  await page.getByRole("button", { name: /关卡 100/ }).click();
  for (const [label, delta] of [["左侧星群", 42], ["右侧星群", -42]] as const) {
    const cluster = page.getByRole("button", { name: label });
    const box = await cluster.boundingBox();
    if (!box) throw new Error(`${label} has no pointer box`);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + delta, box.y + box.height / 2, { steps: 4 });
    await page.mouse.up();
  }

  const trace = page.getByRole("application", { name: "在星群之间连续描出形状" });
  const traceBox = await trace.boundingBox();
  if (!traceBox) throw new Error("The constellation trace has no pointer box");
  await page.mouse.move(traceBox.x + traceBox.width * .12, traceBox.y + traceBox.height * .16);
  await page.mouse.down();
  await page.mouse.move(traceBox.x + traceBox.width * .50, traceBox.y + traceBox.height * .82, { steps: 8 });
  await page.mouse.move(traceBox.x + traceBox.width * .88, traceBox.y + traceBox.height * .16, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText("抓到时间的破绽了")).toBeVisible();
});

test("has no serious accessibility violations in the scene and spike views", async ({ page }, testInfo) => {
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);

  await page.getByRole("button", { name: "交互实验" }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("interaction-spikes.png"), fullPage: true });
});
