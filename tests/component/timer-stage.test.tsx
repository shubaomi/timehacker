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
  timeScale: 1,
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
    render(withLocale(<TimerStage {...baseProps} armed timeScale={0.42} />));
    expect(screen.getByText("DISTORTION ARMED")).toBeInTheDocument();
    expect(screen.getByText("GAME CLOCK × 0.42")).toBeInTheDocument();
  });
});
