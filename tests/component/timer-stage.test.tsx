import { fireEvent, render, screen } from "@testing-library/react";
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

const withDefaultDiscovery = (
  interaction: Omit<typeof DEFAULT_SECRET_INTERACTION, "discovery">,
) => ({ ...interaction, discovery: DEFAULT_SECRET_INTERACTION.discovery });

async function discoverDefaultAnomaly() {
  const anomaly = screen.getByRole("button", { name: /Hidden anomaly.*tap it once/i });
  anomaly.focus();
  await userEvent.keyboard("[Enter]");
  await userEvent.keyboard("h");
}

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
    await discoverDefaultAnomaly();
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
    expect(screen.getByText(/Secret active.*9\.95.*10\.00.*three seconds.*Press Start/i)).toBeInTheDocument();
    expect(screen.queryByText(/Accessible ritual controls/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FULL DILATION/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Secret found" })).not.toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Secret found" })).toHaveTextContent("Active");
  });

  it("hides secret discovery while the clock is running", () => {
    render(withLocale(<TimerStage {...baseProps} status="RUNNING" />));
    expect(screen.queryByRole("button", { name: /Hidden anomaly/i })).not.toBeInTheDocument();
  });

  it.each([
    ["swipe-right", [[10, 50], [70, 50]]],
    ["rub-horizontal", [[10, 50], [55, 50], [15, 50], [60, 50], [20, 50]]],
    ["rub-vertical", [[50, 10], [50, 55], [50, 15], [50, 60], [50, 20]]],
    ["zigzag", [[10, 50], [40, 20], [15, 65], [58, 28], [20, 72]]],
    ["orbit-clockwise", [[90, 50], [50, 90], [10, 50], [50, 10], [90, 50], [50, 90]]],
    ["orbit-counterclockwise", [[90, 50], [50, 10], [10, 50], [50, 90], [90, 50], [50, 10]]],
  ] as const)("recognizes the %s discovery gesture with a real pointer path", (action, points) => {
    render(withLocale(<TimerStage
      {...baseProps}
      secretInteraction={{
        ...DEFAULT_SECRET_INTERACTION,
        discovery: { ...DEFAULT_SECRET_INTERACTION.discovery, steps: [action, "tap"] },
      }}
    />));
    const anomaly = screen.getByRole("button", { name: /Hidden anomaly/i });
    vi.spyOn(anomaly, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(anomaly, { pointerId: 1, clientX: points[0][0], clientY: points[0][1] });
    points.slice(1, -1).forEach(([clientX, clientY]) => {
      fireEvent.pointerMove(anomaly, { pointerId: 1, clientX, clientY });
    });
    const last = points.at(-1)!;
    fireEvent.pointerUp(anomaly, { pointerId: 1, clientX: last[0], clientY: last[1] });
    expect(screen.getByRole("button", { name: /Next discovery move: tap it once/i })).toBeInTheDocument();
  });

  it("renders a spatial family and emits its selected target", async () => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} secretInteraction={withDefaultDiscovery({ family: "corners", steps: ["corner-nw", "corner-se", "corner-ne"], variant: 0, hintDelayMs: 1_200 })} onEvent={onEvent} />));
    await discoverDefaultAnomaly();
    await userEvent.click(screen.getByRole("button", { name: "touch the upper-left corner" }));
    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", "corner-nw", undefined);
  });

  it("lets pointer users drag through spatial targets instead of solving by button clicks alone", async () => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} secretInteraction={withDefaultDiscovery({ family: "corners", steps: ["corner-nw", "corner-se", "corner-ne"], variant: 0, hintDelayMs: 1_200 })} onEvent={onEvent} />));
    await discoverDefaultAnomaly();
    const surface = screen.getByRole("group", { name: /corners/i });
    const target = screen.getByRole("button", { name: "touch the upper-left corner" });
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 40, y: 40, left: 40, top: 40, right: 82, bottom: 82, width: 42, height: 42,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(surface, { pointerId: 1, clientX: 120, clientY: 90 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 60, clientY: 60 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 60, clientY: 60 });

    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", "corner-nw", undefined);
    expect(surface).toHaveAccessibleDescription(/drag through the glowing marks/i);
  });

  it.each([
    ["smudge", "wipe-up"],
    ["echo", "echo-up"],
  ] as const)("supports keyboard motion for the %s family", async (family, action) => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} secretInteraction={withDefaultDiscovery({ family, steps: [action, action, action], variant: 0, hintDelayMs: 1_200 })} onEvent={onEvent} />));
    await discoverDefaultAnomaly();
    const surface = screen.getByRole("group", { name: /Next:/i });
    surface.focus();
    await userEvent.keyboard("[ArrowUp]");
    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", action, undefined);
  });

  it("supports distinct pressure depths from the keyboard", async () => {
    const onEvent = vi.fn();
    render(withLocale(<TimerStage {...baseProps} secretInteraction={withDefaultDiscovery({ family: "pressure", steps: ["press-hold", "press-tap", "press-deep"], variant: 0, hintDelayMs: 1_200 })} onEvent={onEvent} />));
    await discoverDefaultAnomaly();
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
      secretInteraction={withDefaultDiscovery({ family: family as SecretInteractionFamily, steps: [action, action, action], variant: 0, hintDelayMs: 1_200 })}
      onEvent={onEvent}
    />));
    await discoverDefaultAnomaly();
    await userEvent.click(document.querySelector(`[data-secret-action="${action}"]`) as HTMLElement);
    expect(onEvent).toHaveBeenCalledWith("SECRET_ACTION", action, undefined);
  });
});
