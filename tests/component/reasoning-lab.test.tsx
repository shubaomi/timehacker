import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReasoningLab } from "@/components/reasoning-lab/reasoning-lab";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("reasoning lab interaction contract", () => {
  it("starts without an answer and reveals hints only on request", () => {
    render(<ReasoningLab />);
    expect(screen.queryByLabelText("主动请求的提示")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "线索" }));
    expect(screen.getByLabelText("主动请求的提示")).toHaveTextContent("比较前后两个储格");
    fireEvent.click(screen.getByRole("button", { name: "再想一想" }));
    expect(screen.getByLabelText("主动请求的提示")).toHaveTextContent("总量没有变");
    fireEvent.click(screen.getByRole("button", { name: "显示答案" }));
    expect(screen.getByLabelText("主动请求的提示")).toHaveTextContent("A → B");
  });

  it("rejects capacity overflow, restores exact undo state and resets on sample switch", () => {
    render(<ReasoningLab />);
    const send = screen.getByRole("button", { name: "A → B · 2s" });
    fireEvent.click(send);
    expect(screen.getByLabelText("B 储格")).toHaveTextContent("16");
    fireEvent.click(send);
    expect(screen.getByText("装不下了。接收的一格会超过 16。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "撤销" }));
    expect(screen.getByLabelText("B 储格")).toHaveTextContent("14");
    fireEvent.click(screen.getByRole("button", { name: "A2 满格之后" }));
    expect(screen.getByLabelText("A 储格")).toHaveTextContent("6");
    expect(screen.getByRole("button", { name: "撤销" })).toBeDisabled();
  });

  it("measures Stop at the event time, preserves the existing 10.00 plateau and advances locally", () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    render(<ReasoningLab />);
    for (const name of ["B → C · 3s", "B → C · 3s", "C → A · 4s", "A → B · 2s"]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    expect(screen.getByText("关系成立。时间可以慢下来了。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "开始" }));
    expect(screen.getByRole("button", { name: "A → B · 2s" })).toBeDisabled();
    // 15.5 real seconds lies inside the existing assisted 10.00 hold.
    now += 15500;
    act(() => fireEvent.click(screen.getByRole("button", { name: "停止" })));
    expect(screen.getByLabelText("计时器")).toHaveTextContent("10.00");
    expect(screen.getByText("停住了。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "下一个样本" }));
    expect(screen.getByRole("heading", { name: "满格之后" })).toBeInTheDocument();
    expect(screen.getByLabelText("计时器")).toHaveTextContent("0.00");
  });

  it("keeps normal timing before solving, allows retry and exposes equal nonvisual evidence", () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    render(<ReasoningLab />);
    fireEvent.click(screen.getByRole("button", { name: "开始" }));
    now += 15500;
    fireEvent.click(screen.getByRole("button", { name: "停止" }));
    expect(screen.getByLabelText("计时器")).toHaveTextContent("15.50");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    fireEvent.click(screen.getByRole("button", { name: "B1 重叠的回声" }));
    expect(screen.getByRole("img", { name: /各位置叠加数量/ })).toBeInTheDocument();
    const row = screen.getByRole("img", { name: /^纸层 A:/ });
    const before = row.getAttribute("aria-label");
    fireEvent.click(screen.getByRole("button", { name: "A 左移" }));
    fireEvent.click(screen.getByRole("button", { name: "A 右移" }));
    expect(row).toHaveAttribute("aria-label", before);
  });

  it("translates existing evidence when language changes", () => {
    render(<ReasoningLab />);
    fireEvent.click(screen.getByRole("button", { name: "A → B · 2s" }));
    fireEvent.click(screen.getByRole("button", { name: "A → B · 2s" }));
    fireEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByText("No room. The receiving well would exceed 16.")).toBeInTheDocument();
    expect(screen.queryByText("装不下了。接收的一格会超过 16。")).not.toBeInTheDocument();
  });

  it("announces semantic timing milestones without reading every animation frame", () => {
    let now = 1000;
    let nextFrame: FrameRequestCallback = () => undefined;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { nextFrame = callback; return 1; });
    render(<ReasoningLab />);
    fireEvent.click(screen.getByRole("button", { name: "开始" }));
    now = 10500;
    act(() => nextFrame(now));
    expect(screen.getByText("接近 10")).toHaveAttribute("aria-live", "assertive");
    now = 11000;
    act(() => nextFrame(now));
    const announced = screen.getAllByRole("status").find((element) => element.getAttribute("aria-live") === "assertive");
    expect(announced).toHaveTextContent("10.00");
    now = 12000;
    act(() => nextFrame(now));
    expect(announced).toHaveTextContent("已超过 10");
  });
});
