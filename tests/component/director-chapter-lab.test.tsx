import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DirectorChapterLab } from "@/components/v2-prototype/director-chapter-lab";
import { DIRECTOR_CAMPAIGN } from "@/game/director-campaign";
import { DIRECTOR_EVIDENCE_BY_LEVEL } from "@/game/director-evidence";
import { LocaleProvider } from "@/i18n/locale-provider";

function renderLab(level = 1, hintDelayMs = 0) {
  return render(
    <LocaleProvider initialLocale="zh">
      <DirectorChapterLab initialLevel={level} hintDelayMs={hintDelayMs} />
    </LocaleProvider>,
  );
}

function canvasContext() {
  return {
    beginPath: vi.fn(),
    bezierCurveTo: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    roundRect: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

async function completeEvidence(levelNumber: number) {
  const definition = DIRECTOR_EVIDENCE_BY_LEVEL.get(levelNumber);
  if (!definition) return;
  for (const probeId of definition.sequence) {
    fireEvent.click(screen.getByTestId(`director-evidence-probe-${probeId}`));
  }
  await waitFor(() => expect(screen.queryByTestId("director-evidence-gate")).not.toBeInTheDocument());
}

describe("Director's Cut 36-level isolated campaign", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext());
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.stubGlobal("IntersectionObserver", class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0];
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("opens without product-grammar copy, answer text, or an immediate hint affordance", () => {
    renderLab(1, 45_000);

    expect(screen.getByText("01 / 36")).toBeInTheDocument();
    expect(screen.getByText("TH-DC-001")).toBeInTheDocument();
    expect(screen.getByTestId("v2-scene-001")).toHaveAttribute("data-controller", "corner-repair");
    expect(screen.getByRole("button", { name: "页边的纸片" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "纸页缺口" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "另一枚候选纸角" })).not.toBeInTheDocument();
    expect(screen.queryByText("发现网页隐藏的规则")).not.toBeInTheDocument();
    expect(screen.queryByText("缺口的纸纤维短暂浮出")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "需要一点线索？" })).not.toBeInTheDocument();
  });

  it("does not expose the hint affordance before 45 seconds of foreground time", () => {
    vi.useFakeTimers();
    renderLab(1, 45_000);

    expect(screen.queryByRole("button", { name: "需要一点线索？" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(44_999));
    expect(screen.queryByRole("button", { name: "需要一点线索？" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("button", { name: "需要一点线索？" })).toBeInTheDocument();
  });

  it("requires evidence from the page gap before the paper fragment can repair it", () => {
    const { container } = renderLab();
    const fragment = screen.getByRole("button", { name: "页边的纸片" });

    fireEvent.keyDown(fragment, { key: "ArrowRight" });
    fireEvent.keyDown(fragment, { key: "ArrowRight" });
    fireEvent.keyDown(fragment, { key: "ArrowRight" });
    fireEvent.keyDown(fragment, { key: "ArrowDown" });
    expect(container.querySelector("main")).toHaveAttribute("data-armed", "false");
    expect(screen.getByTestId("v2-scene-001")).toHaveAttribute("data-rejected-candidate", "unprobed");

    fireEvent.keyDown(screen.getByRole("button", { name: "纸页缺口" }), { key: "Enter" });
    expect(screen.getByTestId("v2-scene-001")).toHaveAttribute("data-edge-probed", "true");
    expect(screen.getByText("纸页边缘显出与碎片同向的纤维。")).toHaveAttribute("role", "status");
    fireEvent.keyDown(fragment, { key: "ArrowRight" });
    fireEvent.keyDown(fragment, { key: "ArrowRight" });
    fireEvent.keyDown(fragment, { key: "ArrowRight" });
    fireEvent.keyDown(fragment, { key: "ArrowDown" });
    expect(container.querySelector("main")).toHaveAttribute("data-armed", "true");
  });

  it("keeps H1 visual-only, H2 relational, and H3 explicit", async () => {
    const { container } = renderLab();
    const hint = await screen.findByRole("button", { name: "需要一点线索？" });

    fireEvent.click(hint);
    expect(container.querySelector("main")).toHaveAttribute("data-hint-level", "1");
    expect(screen.queryByText("缺口的纸纤维短暂浮出")).not.toBeInTheDocument();
    expect(screen.queryByText("页边碎片与缺口拥有同一段纤维方向")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "再给一点" }));
    expect(screen.getByText("页边碎片与缺口拥有同一段纤维方向")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "显示最后提示" }));
    expect(screen.getByText("先检查纸页缺口，再把页边纸片装回去")).toBeInTheDocument();
  });

  it("keeps the accessible two-stage solve path and requires the player to stop the timer", () => {
    renderLab();
    fireEvent.keyDown(screen.getByRole("button", { name: "纸页缺口" }), { key: "Enter" });
    const corner = screen.getByRole("button", { name: "页边的纸片" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowDown" });

    expect(screen.getByText("规则已经解锁。你仍需亲自停止时间。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始" })).toBeInTheDocument();
  });

  it("can disable the visual layer without changing puzzle completion", () => {
    renderLab();
    fireEvent.click(screen.getByRole("button", { name: "空间反馈 开" }));
    expect(screen.queryByTestId("spatial-time-field")).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("button", { name: "纸页缺口" }), { key: "Enter" });
    const corner = screen.getByRole("button", { name: "页边的纸片" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowDown" });
    expect(screen.getByText("规则已经解锁。你仍需亲自停止时间。")).toBeInTheDocument();
  });

  it("exposes all 36 frozen Director's Cut levels without touching Legacy progress", () => {
    renderLab();
    const picker = screen.getByRole("combobox", { name: "选择 Director’s Cut 关卡" });
    expect(picker.querySelectorAll("option")).toHaveLength(36);

    fireEvent.change(picker, { target: { value: "36" } });
    expect(screen.getByText("36 / 36")).toBeInTheDocument();
    expect(screen.getByText("TH-DC-036")).toBeInTheDocument();
    expect(screen.queryByTestId("v2-scene-100")).not.toBeInTheDocument();
    expect(screen.queryByTestId("director-final-scene")).not.toBeInTheDocument();
  });

  it("keeps levels 002-036 behind a reversible evidence sequence before exposing the final action", async () => {
    const { container } = renderLab(2);
    const definition = DIRECTOR_EVIDENCE_BY_LEVEL.get(2)!;
    const wrong = definition.probes.find((probe) => probe.id !== definition.sequence[0])!;

    expect(screen.getByTestId("director-evidence-gate")).toBeVisible();
    expect(screen.queryByTestId("director-final-scene")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`director-evidence-probe-${wrong.id}`));
    expect(container.querySelector("main")).toHaveAttribute("data-evidence-ready", "false");

    for (const probeId of definition.sequence) {
      fireEvent.click(screen.getByTestId(`director-evidence-probe-${probeId}`));
    }
    expect(screen.getByTestId("director-evidence-gate")).toHaveAttribute("data-locking", "true");
    expect(screen.queryByTestId("director-final-scene")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId("director-evidence-gate")).not.toBeInTheDocument());
    expect(container.querySelector("main")).toHaveAttribute("data-evidence-ready", "true");
    expect(screen.queryByTestId("director-evidence-gate")).not.toBeInTheDocument();
    expect(screen.getByTestId("director-final-scene")).toHaveAttribute("data-evidence-ready", "true");
  });
  it("keeps every runtime controller and requested hint ladder aligned with the frozen 36-level specification", async () => {
    const { container } = renderLab();
    const picker = screen.getByRole("combobox", { name: "选择 Director’s Cut 关卡" });

    for (const level of DIRECTOR_CAMPAIGN) {
      fireEvent.change(picker, { target: { value: String(level.number) } });
      expect(container.querySelector("main"), level.traceId).toHaveAttribute("data-controller", level.controller);
      if (level.number === 1) {
        expect(screen.getByTestId("v2-scene-001")).toBeInTheDocument();
      } else {
        expect(screen.queryByTestId(`v2-scene-${String(level.legacyId).padStart(3, "0")}`)).not.toBeInTheDocument();
      }

      fireEvent.click(await screen.findByRole("button", { name: "需要一点线索？" }));
      expect(screen.queryByText(level.hints.h1.content), `${level.traceId} H1 stays visual-only`).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "再给一点" }));
      expect(screen.getByText(level.hints.h2.content), `${level.traceId} H2`).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "显示最后提示" }));
      expect(screen.getByText(level.hints.h3.content), `${level.traceId} H3`).toBeInTheDocument();
    }
  });

  it("preserves the level-30 session imprint across one in-level reset and clears it on level change", async () => {
    renderLab(30);
    await completeEvidence(30);
    fireEvent.keyDown(screen.getByRole("button", { name: "可移动纸点" }), { key: "ArrowLeft" });
    expect(screen.getByTestId("v2-scene-084")).toHaveAttribute("data-dot-anchor", "left");

    fireEvent.click(screen.getByRole("button", { name: "重置本关" }));
    expect(screen.getByTestId("v2-scene-084")).toHaveAttribute("data-shadow-anchor", "left");
    fireEvent.keyDown(screen.getByRole("button", { name: "可移动纸点" }), { key: "ArrowRight" });
    expect(screen.getByText("规则已经解锁。你仍需亲自停止时间。")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "选择 Director’s Cut 关卡" }), { target: { value: "29" } });
    fireEvent.change(screen.getByRole("combobox", { name: "选择 Director’s Cut 关卡" }), { target: { value: "30" } });
    expect(screen.queryByTestId("v2-scene-084")).not.toBeInTheDocument();
    await completeEvidence(30);
    expect(screen.getByTestId("v2-scene-084")).toHaveAttribute("data-shadow-anchor", "none");
  });

  it("exposes the level-31 menu paper as a keyboard-operable isolated layer", async () => {
    renderLab(31);
    expect(screen.getByRole("button", { name: "菜单纸层" })).toBeDisabled();
    await completeEvidence(31);
    fireEvent.click(screen.getByRole("button", { name: "菜单纸层" }));
    const layer = screen.getByTestId("eclipse-menu-paper");
    const handle = screen.getByRole("button", { name: "菜单纸层边缘" });
    expect(layer).toHaveAttribute("data-aligned", "false");

    fireEvent.keyDown(handle, { key: "ArrowUp" });
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(layer).toHaveAttribute("data-aligned", "true");
    fireEvent.click(screen.getByRole("button", { name: "关闭菜单" }));
    expect(screen.queryByTestId("eclipse-menu-paper")).not.toBeInTheDocument();
  });
  it("submits the stop decision before changing to a result phase", async () => {
    const { container } = renderLab();
    fireEvent.click(screen.getByRole("button", { name: "开始" }));
    expect(screen.getByRole("button", { name: "停止" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "停止" }));
    expect(container.querySelector("main")).toHaveAttribute("data-phase", "stopped");

    await waitFor(() => expect(container.querySelector("main")).toHaveAttribute("data-phase", "miss"));
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });
});
