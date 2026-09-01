import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpatialTimeField } from "@/components/spatial-time-field";

function canvasContext() {
  return {
    beginPath: vi.fn(),
    bezierCurveTo: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    roundRect: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("SpatialTimeField", () => {
  let onIntersection: IntersectionObserverCallback | null;

  beforeEach(() => {
    onIntersection = null;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext());
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: IntersectionObserverCallback) {
        onIntersection = callback;
      }

      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
      readonly root = null;
      readonly rootMargin = "0px";
      readonly thresholds = [0];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nothing when the default-off gate is closed", () => {
    render(<SpatialTimeField enabled={false} slug="four-corner-breach" phase="idle" armed={false} />);
    expect(screen.queryByTestId("spatial-time-field")).not.toBeInTheDocument();
  });

  it("renders nothing for a level outside the approved pilot", () => {
    render(<SpatialTimeField enabled slug="precision-five" phase="idle" armed={false} />);
    expect(screen.queryByTestId("spatial-time-field")).not.toBeInTheDocument();
  });

  it.each(["breath-gap", "relay-sandwich", "slow-command", "corner-cross", "focus-orbit"])("renders the approved %s field as a decorative canvas", (slug) => {
    render(<SpatialTimeField enabled slug={slug} phase="idle" armed={false} />);
    const canvas = screen.getByTestId("spatial-time-field");

    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveAttribute("data-spatial-pilot", slug);
    expect(canvas).not.toHaveAttribute("tabindex");
  });

  it("keeps the enabled field hidden from accessibility and pointer input", () => {
    render(<SpatialTimeField enabled slug="dual-device" phase="success" armed />);
    const canvas = screen.getByTestId("spatial-time-field");

    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveAttribute("data-phase", "success");
    expect(canvas).toHaveAttribute("data-armed", "true");
    expect(canvas).not.toHaveAttribute("tabindex");
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
  });

  it("leaves the semantic game untouched when Canvas2D is unavailable", () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    render(<SpatialTimeField enabled slug="relay-sandwich" phase="idle" armed={false} />);

    expect(screen.getByTestId("spatial-time-field")).toHaveAttribute("aria-hidden", "true");
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("stops its frame loop offscreen and resumes only after re-entry", () => {
    render(<SpatialTimeField enabled slug="archive-route" phase="running" armed />);
    const canvas = screen.getByTestId("spatial-time-field");
    const entry = { isIntersecting: false, target: canvas } as unknown as IntersectionObserverEntry;

    onIntersection?.([entry], {} as IntersectionObserver);
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);

    onIntersection?.([{ ...entry, isIntersecting: true }], {} as IntersectionObserver);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });
});
