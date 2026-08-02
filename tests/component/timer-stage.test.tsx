import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimerStage } from "@/components/timer-stage";
import { LocaleProvider } from "@/i18n/locale-provider";
import { DEFAULT_SECRET_INTERACTION, type SecretInteractionFamily } from "@/game/secret-interactions";

const withLocale = (children: React.ReactNode) => (
  <LocaleProvider initialLocale="en">{children}</LocaleProvider>
);

const baseProps = {
  elapsedMs: 0,
  status: "READY",
  armed: false,
  secretEnabled: true,
  secretInteraction: DEFAULT_SECRET_INTERACTION,
  secretProgress: 0,
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

  it("reveals progressive guidance and emits real secret actions", async () => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} onEvent={onEvent} />));
    await userEvent.click(screen.getByRole("button", { name: "Something unusual is hiding here" }));
    const surface = screen.getByRole("group", { name: /Follow the drifting trail.*Next: swipe up/i });
    surface.focus();
    await userEvent.keyboard("[ArrowUp]");
    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", "swipe-up", undefined);
    expect(screen.getByText(/Completed 0 of 3 steps/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show the next move" }));
    expect(screen.getByText("swipe up")).toBeInTheDocument();
  });

  it("states that the secret is active and tells the player what to do next", () => {
    render(withLocale(<TimerStage {...baseProps} armed secretProgress={3} />));
    expect(screen.getByText(/Secret active.*easier to stop at 10\.00.*Press Start/i)).toBeInTheDocument();
    expect(screen.queryByText(/Accessible ritual controls/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FULL DILATION/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Secret found" })).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Secret found" })).toHaveTextContent("Active");
  });

  it("hides secret discovery while the clock is running", () => {
    render(withLocale(<TimerStage {...baseProps} status="RUNNING" />));
    expect(screen.queryByRole("button", { name: "Something unusual is hiding here" })).not.toBeInTheDocument();
  });

  it("renders a spatial family and emits its selected target", async () => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} secretInteraction={{ family: "corners", steps: ["corner-nw", "corner-se", "corner-ne"], variant: 0, hintDelayMs: 1_200 }} onEvent={onEvent} />));
    await userEvent.click(screen.getByRole("button", { name: "Something unusual is hiding here" }));
    await userEvent.click(screen.getByRole("button", { name: "touch the upper-left corner" }));
    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", "corner-nw", undefined);
  });

  it.each([
    ["smudge", "wipe-up"],
    ["echo", "echo-up"],
  ] as const)("supports keyboard motion for the %s family", async (family, action) => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} secretInteraction={{ family, steps: [action, action, action], variant: 0, hintDelayMs: 1_200 }} onEvent={onEvent} />));
    await userEvent.click(screen.getByRole("button", { name: "Something unusual is hiding here" }));
    const surface = screen.getByRole("group", { name: /Next:/i });
    surface.focus();
    await userEvent.keyboard("[ArrowUp]");
    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", action, undefined);
  });

  it("supports distinct pressure depths from the keyboard", async () => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} secretInteraction={{ family: "pressure", steps: ["press-hold", "press-tap", "press-deep"], variant: 0, hintDelayMs: 1_200 }} onEvent={onEvent} />));
    await userEvent.click(screen.getByRole("button", { name: "Something unusual is hiding here" }));
    const surface = screen.getByRole("group", { name: /pressure.*Next:/i });
    surface.focus();
    await userEvent.keyboard("h");
    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", "press-hold", 700);
  });

  it.each([
    ["rhythm", "beat-soft"],
    ["pulse", "pulse-inner"],
    ["constellation", "star-1"],
    ["digits", "digit-0"],
    ["switchboard", "switch-sun"],
    ["orbit", "orbit-n"],
    ["balance", "balance-left"],
  ] as const)("renders and emits an action for the %s family", async (family, action) => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage
      {...baseProps}
      secretInteraction={{ family: family as SecretInteractionFamily, steps: [action, action, action], variant: 0, hintDelayMs: 1_200 }}
      onEvent={onEvent}
    />));
    await userEvent.click(screen.getByRole("button", { name: "Something unusual is hiding here" }));
    await userEvent.click(document.querySelector(`[data-secret-action="${action}"]`) as HTMLElement);
    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", action, undefined);
  });
});
