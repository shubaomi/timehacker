import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimerStage } from "@/components/timer-stage";
import { LocaleProvider } from "@/i18n/locale-provider";

const withLocale = (children: React.ReactNode) => (
  <LocaleProvider initialLocale="en">{children}</LocaleProvider>
);

const baseProps = {
  elapsedMs: 0,
  status: "READY",
  armed: false,
  effect: null,
  disabled: false,
  onPrimary: vi.fn(),
  onEvent: vi.fn(),
};

describe("TimerStage", () => {
  it("exposes READY, RUNNING, and STOP controls", async () => {
    const onPrimary = vi.fn();
    const { rerender } = render(withLocale(<TimerStage {...baseProps} onPrimary={onPrimary} />));
    const start = screen.getByRole("button", { name: /START.*SPACE/i });
    await userEvent.click(start);
    expect(onPrimary).toHaveBeenCalledOnce();
    rerender(withLocale(<TimerStage {...baseProps} status="RUNNING" elapsedMs={2_345} onPrimary={onPrimary} />));
    expect(screen.getByRole("button", { name: /STOP.*FREEZE/i })).toBeEnabled();
    expect(screen.getByText("00:02.345")).toBeInTheDocument();
  });

  it("supports keyboard activation and reports keyboard input", async () => {
    const onPrimary = vi.fn();
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} onPrimary={onPrimary} onEvent={onEvent} />));
    const start = screen.getByRole("button", { name: /START.*SPACE/i });
    start.focus();
    await userEvent.keyboard("[Space]");
    expect(onPrimary).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith("INPUT_SOURCE", "keyboard");
  });

  it("disables the actuator after the daily limit", () => {
    render(withLocale(<TimerStage {...baseProps} status="LIMIT_REACHED" disabled />));
    expect(screen.getByRole("button", { name: /START.*SPACE/i })).toBeDisabled();
  });

  it("announces a slowed game clock without relying on color", () => {
    render(withLocale(<TimerStage {...baseProps} armed effect={{ type: "FULL_DILATION", timeScale: 0.55, label: "Full", labelZh: "全程" }} />));
    expect(screen.getByRole("button", { name: /DISTORTION ARMED/ })).toBeInTheDocument();
    expect(screen.getByText("FULL DILATION × 0.55")).toBeInTheDocument();
  });

  it("offers touch alternatives for sweep, pulse, inspect, latch, and service keys", async () => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} onEvent={onEvent} />));
    await userEvent.click(screen.getByText("Accessible ritual controls"));
    await userEvent.click(screen.getByRole("button", { name: "Sweep up" }));
    await userEvent.click(screen.getByRole("button", { name: "Inspect target" }));
    await userEvent.click(screen.getByRole("button", { name: "Short pulse" }));
    await userEvent.click(screen.getByRole("button", { name: "Service Escape" }));
    expect(onEvent).toHaveBeenCalledWith("SERVICE_SWEEP", "up");
    expect(onEvent).toHaveBeenCalledWith("INSPECT", "target");
    expect(onEvent).toHaveBeenCalledWith("RITUAL_PULSE", "short");
    expect(onEvent).toHaveBeenCalledWith("SERVICE_KEY", "ESCAPE");
  });
});
