import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReasoningScene } from "@/components/reasoning-campaign/scene";
import { REASONING_CAMPAIGN } from "@/game/reasoning-campaign/catalog";
import { solve } from "@/game/reasoning-campaign/engine";

afterEach(cleanup);
describe("R100 real scene completion", () => {
  for (const level of REASONING_CAMPAIGN) {
    it(`${level.ordinal} only arms after its state predicate holds`, () => {
      const onArm = vi.fn();
      const onDiscover = vi.fn();
      render(<ReasoningScene level={level} locale="en" armed={false} hintLevel={0} onArm={onArm} onDiscover={onDiscover} />);
      expect(onArm).not.toHaveBeenCalled();
      const path = solve(level.puzzle)!;
      expect(path).not.toBeNull();
      path.forEach((action, index) => {
        fireEvent.click(screen.getByTestId(`reasoning-action-${action}`));
        expect(onArm).toHaveBeenCalledTimes(index === path.length - 1 ? 1 : 0);
      });
      expect(onDiscover).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("reasoning-scene")).toHaveAttribute("data-solved", "true");
    });
  }
  it("undo and reset restore exploration, hints are not initially visible", () => {
    const level = REASONING_CAMPAIGN[0];
    render(<ReasoningScene level={level} locale="en" armed={false} hintLevel={0} onArm={vi.fn()} onDiscover={vi.fn()} />);
    expect(screen.queryByText(level.lesson.en)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("reasoning-action-1"));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByLabelText("B: 14, target 10")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("reasoning-action-1"));
    fireEvent.click(screen.getByRole("button", { name: "Reset puzzle" }));
    expect(screen.getByLabelText("B: 14, target 10")).toBeInTheDocument();
  });
  it("paper target positions and overlap are text, not color-only instructions", () => {
    render(<ReasoningScene level={REASONING_CAMPAIGN[6]} locale="en" armed={false} hintLevel={0} onArm={vi.fn()} onDiscover={vi.fn()}/>);
    expect(screen.getByText(/Target positions:/)).toHaveTextContent("Overlap at each target: 3");
  });
  it("route map exposes coordinates, walls and ink through named image roles", () => {
    render(<ReasoningScene level={REASONING_CAMPAIGN[59]} locale="en" armed={false} hintLevel={0} onArm={vi.fn()} onDiscover={vi.fn()}/>);
    expect(screen.getByRole("img",{name:"1,1: S ink"})).toBeInTheDocument();
    expect(screen.getByRole("img",{name:"2,2: wall"})).toBeInTheDocument();
    expect(screen.getByRole("img",{name:"1,3: gate A closed"})).toBeInTheDocument();
  });
});
