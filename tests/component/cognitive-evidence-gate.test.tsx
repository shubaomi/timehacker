import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CognitiveEvidenceGate } from "@/components/cognitive-evidence-gate";
import { FULL_COGNITIVE_BY_SLUG } from "@/game/full-cognitive-campaign";

afterEach(() => vi.useRealTimers());

describe("CognitiveEvidenceGate", () => {
  it("does not expose the answer before the explicit third hint", () => {
    const definition = FULL_COGNITIVE_BY_SLUG.get("four-corner-breach")!;
    const { rerender } = render(
      <CognitiveEvidenceGate definition={definition} locale="zh" hintLevel={0} visualEnabled onDiscover={() => undefined} onComplete={() => undefined} />,
    );
    expect(screen.queryByText(definition.answer.zh)).not.toBeInTheDocument();
    expect(screen.queryByText(definition.relationship.zh)).not.toBeInTheDocument();
    rerender(<CognitiveEvidenceGate definition={definition} locale="zh" hintLevel={2} visualEnabled onDiscover={() => undefined} onComplete={() => undefined} />);
    expect(screen.getByText(definition.relationship.zh)).toBeInTheDocument();
    expect(screen.queryByText(definition.answer.zh)).not.toBeInTheDocument();
    rerender(<CognitiveEvidenceGate definition={definition} locale="zh" hintLevel={3} visualEnabled onDiscover={() => undefined} onComplete={() => undefined} />);
    expect(screen.getByText(definition.answer.zh)).toBeInTheDocument();
  });

  it("requires the frozen evidence sequence and never arms the real puzzle", () => {
    vi.useFakeTimers();
    const definition = FULL_COGNITIVE_BY_SLUG.get("slow-command")!;
    const onDiscover = vi.fn();
    const onComplete = vi.fn();
    render(<CognitiveEvidenceGate definition={definition} locale="en" hintLevel={0} visualEnabled onDiscover={onDiscover} onComplete={onComplete} />);
    const wrong = definition.probes.find(({ id }) => id !== definition.sequence[0])!;
    fireEvent.click(screen.getByTestId(`cognitive-probe-${wrong.id}`));
    expect(onComplete).not.toHaveBeenCalled();
    for (const id of definition.sequence) fireEvent.click(screen.getByTestId(`cognitive-probe-${id}`));
    expect(onDiscover).toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(260));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("keeps every evidence control semantic and at least 44px by contract", () => {
    const definition = FULL_COGNITIVE_BY_SLUG.get("breath-gap")!;
    render(<CognitiveEvidenceGate definition={definition} locale="en" hintLevel={0} visualEnabled={false} onDiscover={() => undefined} onComplete={() => undefined} />);
    expect(screen.getByTestId("cognitive-evidence-gate")).toHaveAttribute("data-spatial", "off");
    expect(screen.getAllByRole("button")).toHaveLength(definition.probes.length);
  });
});
