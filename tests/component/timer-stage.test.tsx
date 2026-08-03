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
  disabled: false,
  onPrimary: vi.fn(),
  onEvent: vi.fn(),
};

describe("TimerStage", () => {
  it("shows only hundredths and exposes the primary start/stop control", async () => {
    const onPrimary = vi.fn();
    const { rerender } = render(withLocale(<TimerStage {...baseProps} onPrimary={onPrimary} />));
    await userEvent.click(screen.getByRole("button", { name: /START.*Space or Enter/i }));
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

  it("keeps puzzle discovery outside the stopwatch and disables play at the daily limit", () => {
    render(withLocale(<TimerStage {...baseProps} status="LIMIT_REACHED" disabled />));
    expect(screen.getByRole("button", { name: /START.*Space or Enter/i })).toBeDisabled();
    expect(document.querySelector(".stopwatch-card .puzzle-scene")).not.toBeInTheDocument();
    expect(screen.queryByText(/hundredths move once per second/i)).not.toBeInTheDocument();
  });
});
