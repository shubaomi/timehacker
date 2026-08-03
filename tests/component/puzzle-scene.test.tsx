import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PuzzleScene } from "@/components/puzzle-scene";
import { PUZZLE_MECHANICS, PUZZLE_SCENES, puzzleSolutionEvents, serializePuzzleEvent } from "@/game/puzzle-scenes";
import { LocaleProvider } from "@/i18n/locale-provider";

const withLocale = (children: React.ReactNode) => (
  <LocaleProvider initialLocale="en">{children}</LocaleProvider>
);

describe("PuzzleScene", () => {
  it("mounts every authored scene one at a time without leaking a second scene into the DOM", () => {
    const onEvent = vi.fn();
    const { rerender } = render(withLocale(
      <PuzzleScene scene={PUZZLE_SCENES[0]} currentStep={0} armed={false} hintLevel={0} onEvent={onEvent} />,
    ));

    for (const scene of PUZZLE_SCENES) {
      rerender(withLocale(
        <PuzzleScene key={scene.sceneId} scene={scene} currentStep={0} armed={false} hintLevel={0} onEvent={onEvent} />,
      ));
      expect(screen.getByTestId("puzzle-scene")).toHaveAttribute("data-scene-id", scene.sceneId);
      expect(document.querySelectorAll("[data-testid='puzzle-scene']")).toHaveLength(1);
      expect(document.querySelectorAll(".puzzle-object")).toHaveLength(3);
      expect(document.querySelector(".scene-composition")?.className).toContain(`mechanic-${scene.primaryMechanic}`);
      expect(document.querySelector(".scene-composition")?.className).not.toMatch(/scene-\d/);
    }
  });

  it.each(PUZZLE_MECHANICS)("exposes an accessible keyboard route for %s", async (mechanic) => {
    const scene = PUZZLE_SCENES.find((candidate) => candidate.primaryMechanic === mechanic)!;
    const expected = puzzleSolutionEvents(scene)[0];
    const onEvent = vi.fn();
    render(withLocale(
      <PuzzleScene scene={scene} currentStep={0} armed={false} hintLevel={0} onEvent={onEvent} />,
    ));
    const target = screen.getByRole("button", { name: scene.objects[0].label.en });
    target.focus();
    await userEvent.keyboard("[Enter]");
    expect(onEvent).toHaveBeenCalledWith("PUZZLE_STEP", serializePuzzleEvent(expected), undefined);
  });

  it("does not expose instructions or step counts until the player asks for a hint", () => {
    const scene = PUZZLE_SCENES[0];
    const { rerender } = render(withLocale(
      <PuzzleScene scene={scene} currentStep={0} armed={false} hintLevel={0} onEvent={vi.fn()} />,
    ));
    expect(screen.queryByText(scene.hints.observation.en)).not.toBeInTheDocument();
    expect(screen.queryByText(/1\s*\/\s*2|completed|next step/i)).not.toBeInTheDocument();
    rerender(withLocale(
      <PuzzleScene scene={scene} currentStep={0} armed={false} hintLevel={1} onEvent={vi.fn()} />,
    ));
    expect(screen.getByText(scene.hints.observation.en)).toBeInTheDocument();
    expect(screen.queryByText(scene.hints.logic.en)).not.toBeInTheDocument();
  });

  it("keeps camera activation optional and offers an on-device fallback", async () => {
    const scene = PUZZLE_SCENES.find(({ cameraGesture, unlockRule }) => Boolean(cameraGesture) && unlockRule.mechanic === "camera")!;
    const discoverySteps = scene.discoveryRule.steps.length;
    const onEvent = vi.fn();
    render(withLocale(
      <PuzzleScene scene={scene} currentStep={discoverySteps} armed={false} hintLevel={0} onEvent={onEvent} />,
    ));
    await userEvent.click(screen.getByRole("button", { name: scene.objects[1].label.en }));
    expect(screen.getByRole("button", { name: "Enable camera" })).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Use touch instead" }));
    expect(onEvent).toHaveBeenCalledWith(
      "PUZZLE_STEP",
      serializePuzzleEvent(puzzleSolutionEvents(scene)[discoverySteps]),
      undefined,
    );
  });
});
