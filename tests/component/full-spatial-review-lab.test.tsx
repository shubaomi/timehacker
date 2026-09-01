import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FullSpatialReviewLab } from "@/components/v2-prototype/full-spatial-review-lab";
import { LocaleProvider } from "@/i18n/locale-provider";

function renderLab(level = 1) {
  return render(
    <LocaleProvider initialLocale="zh">
      <FullSpatialReviewLab initialLevel={level} />
    </LocaleProvider>,
  );
}

describe("FULL/100 isolated spatial review lab", () => {
  it("renders the real controller under a read-only spatial field", () => {
    const { container } = renderLab(1);
    expect(screen.getByText("001 / TH-SP-001")).toBeInTheDocument();
    expect(screen.getByTestId("v2-scene-001")).toHaveAttribute("data-controller", "corner-repair");
    const sculpture = container.querySelector('[aria-hidden="true"][data-field="frame"]');
    expect(sculpture).toHaveAttribute("data-material", "paper");
    expect(screen.getByRole("button", { name: "游离的纸角" })).toBeInTheDocument();
    expect(container.querySelector('[data-trace-key="TH-SP-001"]')).toHaveAttribute("data-signature", "三角纸框加一枚外角");
  });

  it("preserves discovery, armed geometry, and the controller instance when reviewing a miss", () => {
    const { container } = renderLab(1);
    const scene = screen.getByTestId("v2-scene-001");
    const corner = screen.getByRole("button", { name: "游离的纸角" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("button", { name: "miss" }));
    expect(container.querySelector("main")).toHaveAttribute("data-discovered", "true");
    expect(container.querySelector("main")).toHaveAttribute("data-armed", "true");
    expect(screen.getByTestId("v2-scene-001")).toBe(scene);
  });

  it("keeps the original keyboard solve path and only reads the armed result", () => {
    renderLab(1);
    const corner = screen.getByRole("button", { name: "游离的纸角" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowDown" });
    expect(screen.getByText("规则已经解锁。你仍需亲自停止时间。")).toBeInTheDocument();
  });

  it("switches between all 100 documented controllers without production data", () => {
    renderLab(1);
    const picker = screen.getByRole("combobox", { name: "选择关卡" });
    expect(picker.querySelectorAll("option")).toHaveLength(100);
    fireEvent.change(picker, { target: { value: "100" } });
    expect(screen.getByText("100 / TH-SP-100")).toBeInTheDocument();
    expect(screen.getByTestId("v2-scene-100")).toHaveAttribute("data-controller", "constellation");
  });

  it("exposes five review phases while keeping the primary action semantic", () => {
    renderLab(44);
    for (const phase of ["idle", "running", "stopped", "success", "miss"]) {
      expect(screen.getByRole("button", { name: phase })).toBeInTheDocument();
    }
    const primary = screen.getByRole("button", { name: "开始" });
    fireEvent.click(primary);
    expect(screen.getByRole("button", { name: "停止" })).toBeInTheDocument();
  });

  it("renders the controller's true solved geometry in the success review phase", () => {
    renderLab(81);
    fireEvent.click(screen.getByRole("button", { name: "success" }));
    expect(screen.getByTestId("v2-scene-081")).toHaveAttribute("data-ring-state", "complete");
    expect(screen.getByTestId("v2-scene-081")).toHaveAttribute("data-pointer-half", "docked");
    expect(screen.getByTestId("v2-scene-081")).toHaveAttribute("data-companion-half", "docked");
  });

  it("can disable the entire spatial feedback layer without changing the original solve path", () => {
    const { container } = renderLab(1);
    fireEvent.click(screen.getByRole("button", { name: "空间层 开" }));
    expect(container.querySelector('[aria-hidden="true"][data-field="frame"]')).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "空间层 关" })).toHaveAttribute("aria-pressed", "false");

    const corner = screen.getByRole("button", { name: "游离的纸角" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowDown" });
    expect(screen.getByText("规则已经解锁。你仍需亲自停止时间。")).toBeInTheDocument();
  });
});
