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
  secretEnabled: true,
  gesturePattern: ["up", "right", "tap"] as const,
  gestureProgress: 0,
  disabled: false,
  onPrimary: vi.fn(),
  onEvent: vi.fn(),
};

describe("TimerStage", () => {
  it("shows only hundredths and exposes the primary start/stop control", async () => {
    const onPrimary = vi.fn();
    const { rerender } = render(withLocale(<TimerStage {...baseProps} onPrimary={onPrimary} />));
    const start = screen.getByRole("button", { name: /START.*Space or Enter/i });
    await userEvent.click(start);
    expect(onPrimary).toHaveBeenCalledOnce();

    rerender(withLocale(<TimerStage {...baseProps} status="RUNNING" elapsedMs={2_345} onPrimary={onPrimary} />));
    expect(screen.getByRole("button", { name: /STOP.*Space or Enter/i })).toBeEnabled();
    expect(screen.getByText("2.34")).toBeInTheDocument();
    expect(screen.queryByText("2.345")).not.toBeInTheDocument();
  });

  it("supports keyboard activation and reports keyboard input", async () => {
    const onPrimary = vi.fn();
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} onPrimary={onPrimary} onEvent={onEvent} />));
    const start = screen.getByRole("button", { name: /START.*Space or Enter/i });
    start.focus();
    await userEvent.keyboard("[Space]");
    expect(onPrimary).toHaveBeenCalledOnce();
    expect(onEvent).toHaveBeenCalledWith("INPUT_SOURCE", "keyboard");
  });

  it("disables the primary button after the daily limit", () => {
    render(withLocale(<TimerStage {...baseProps} status="LIMIT_REACHED" disabled />));
    expect(screen.getByRole("button", { name: /START.*Space or Enter/i })).toBeDisabled();
  });

  it("reveals a subtle gesture surface and emits real secret gestures", async () => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} onEvent={onEvent} />));
    await userEvent.click(screen.getByRole("button", { name: "Something is glimmering here" }));
    const surface = screen.getByRole("group", { name: "Hidden gesture area" });
    surface.focus();
    await userEvent.keyboard("[ArrowUp]");
    expect(onEvent).toHaveBeenCalledWith("SECRET_GESTURE", "up", undefined);
    expect(screen.getByText(/seems to lean up/i)).toBeInTheDocument();
  });

  it("shows a gentle discovery message instead of technical effect controls", () => {
    render(withLocale(<TimerStage {...baseProps} armed gestureProgress={3} />));
    expect(screen.getByText(/Time will be a little kinder/i)).toBeInTheDocument();
    expect(screen.queryByText(/Accessible ritual controls/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FULL DILATION/i)).not.toBeInTheDocument();
  });
});
