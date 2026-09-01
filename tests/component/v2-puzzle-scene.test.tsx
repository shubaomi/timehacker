import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { V2EclipseMenuLayer, V2PuzzleScene } from "@/components/v2-puzzle-scene";
import { LocaleProvider } from "@/i18n/locale-provider";

function renderScene(options?: {
  slug?: string;
  armed?: boolean;
  hintLevel?: 0 | 1 | 2 | 3;
  spatialPilot?: boolean;
  onDiscover?: () => void;
  onArm?: () => void;
  resetEpoch?: number;
  ghostAnchor?: "left" | "right" | null;
  onGhostAnchorChange?: (anchor: "left" | "right" | null) => void;
  menuOpen?: boolean;
  eclipseOffset?: number;
}) {
  return render(
    <LocaleProvider initialLocale="zh">
      <V2PuzzleScene
        slug={options?.slug ?? "four-corner-breach"}
        armed={options?.armed ?? false}
        hintLevel={options?.hintLevel ?? 0}
        spatialPilot={options?.spatialPilot ?? false}
        resetEpoch={options?.resetEpoch ?? 0}
        ghostAnchor={options?.ghostAnchor ?? null}
        onGhostAnchorChange={options?.onGhostAnchorChange ?? vi.fn()}
        menuOpen={options?.menuOpen ?? false}
        eclipseOffset={options?.eclipseOffset ?? 0}
        onDiscover={options?.onDiscover ?? vi.fn()}
        onArm={options?.onArm ?? vi.fn()}
      />
    </LocaleProvider>,
  );
}

describe("V2 production puzzle scene 001", () => {
  it("keeps the internal solution name hidden before the puzzle is armed", () => {
    renderScene();

    expect(screen.queryByText("四角突破")).not.toBeInTheDocument();
    expect(screen.getByTestId("v2-scene-001")).toHaveAttribute("data-spatial-model", "page-corner");
  });

  it("treats the loose corner as a two-dimensional relation instead of a horizontal slider", async () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ onDiscover, onArm });
    const corner = screen.getByRole("button", { name: "游离的纸角" });

    await userEvent.click(corner);
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();

    corner.focus();
    fireEvent.keyDown(corner, { key: "ArrowLeft" });
    fireEvent.keyDown(corner, { key: "ArrowUp" });
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowDown" });
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("requires a real two-axis pointer drop inside the visible page gap", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ onDiscover, onArm });
    const target = screen.getByTestId("corner-target-001");
    const corner = screen.getByRole("button", { name: "游离的纸角" });
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 900,
      y: 100,
      top: 100,
      right: 1000,
      bottom: 200,
      left: 900,
      width: 100,
      height: 100,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(corner, { pointerId: 1, clientX: 200, clientY: 300 });
    fireEvent.pointerMove(corner, { pointerId: 1, clientX: 930, clientY: 140 });
    fireEvent.pointerUp(corner, { pointerId: 1, clientX: 930, clientY: 140 });

    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 002", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets ordinary mouse movement pass but restarts the quiet window for meaningful input", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    renderScene({ slug: "breath-gap", onDiscover });

    expect(screen.queryByRole("button", { name: "安静的气泡" })).not.toBeInTheDocument();
    expect(screen.queryByText("呼吸间隙")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2_000));
    fireEvent.mouseMove(window, { clientX: 220, clientY: 120 });
    act(() => vi.advanceTimersByTime(550));
    expect(screen.getByRole("button", { name: "安静的气泡" })).toBeInTheDocument();
    expect(onDiscover).toHaveBeenCalledTimes(1);

    vi.clearAllTimers();
  });

  it.each([
    ["pointer", () => fireEvent.pointerDown(window, { pointerId: 1 })],
    ["keyboard", () => fireEvent.keyDown(window, { key: "a" })],
    ["wheel", () => fireEvent.wheel(window, { deltaY: 40 })],
    ["touch", () => fireEvent.touchStart(window)],
  ])("restarts the 2.5 second discovery window after %s input", (_name, interrupt) => {
    vi.useFakeTimers();
    renderScene({ slug: "breath-gap" });

    act(() => vi.advanceTimersByTime(2_000));
    interrupt();
    act(() => vi.advanceTimersByTime(600));
    expect(screen.queryByRole("button", { name: "安静的气泡" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_900));
    expect(screen.getByRole("button", { name: "安静的气泡" })).toBeInTheDocument();
  });

  it("pauses discovery while the page is hidden instead of counting background time", () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, "hidden", "get");
    hidden.mockReturnValue(false);
    renderScene({ slug: "breath-gap" });

    act(() => vi.advanceTimersByTime(1_500));
    hidden.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.queryByRole("button", { name: "安静的气泡" })).not.toBeInTheDocument();

    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(999));
    expect(screen.queryByRole("button", { name: "安静的气泡" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("button", { name: "安静的气泡" })).toBeInTheDocument();
    hidden.mockRestore();
  });

  it("rejects the legacy short hold and keeps the revealed bubble available for a retry", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "breath-gap", onArm });
    act(() => vi.advanceTimersByTime(2_500));
    const bubble = screen.getByRole("button", { name: "安静的气泡" });

    fireEvent.pointerDown(bubble, { pointerId: 2 });
    act(() => vi.advanceTimersByTime(650));
    fireEvent.pointerUp(bubble, { pointerId: 2 });
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "安静的气泡" })).toBeInTheDocument();

    fireEvent.pointerDown(bubble, { pointerId: 3 });
    act(() => vi.advanceTimersByTime(1_200));
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 003", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rewrites FAST into SLOW without exposing a form or allowing one mechanical pass", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "slow-command", onArm });

    expect(screen.queryByText("慢词机关")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /提交|submit/i })).not.toBeInTheDocument();
    const tiles = screen.getAllByRole("button", { name: /^字牌 \d/ });
    expect(tiles.map((tile) => tile.textContent).join("")).toBe("FAST");

    for (const tile of tiles) fireEvent.click(tile);
    expect(tiles.map((tile) => tile.textContent).join("")).toBe("TIME");
    act(() => vi.advanceTimersByTime(500));
    expect(onArm).not.toHaveBeenCalled();

    for (const tile of tiles) fireEvent.click(tile);
    expect(tiles.map((tile) => tile.textContent).join("")).toBe("SLOW");
    act(() => vi.advanceTimersByTime(399));
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports a vertical swipe, wheel, and arrow-key route on individual paper tiles", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "slow-command", onDiscover });
    const tiles = screen.getAllByRole("button", { name: /^字牌 \d/ });

    fireEvent.pointerDown(tiles[0], { pointerId: 1, clientY: 100 });
    fireEvent.pointerUp(tiles[0], { pointerId: 1, clientY: 65 });
    fireEvent.wheel(tiles[1], { deltaY: 40 });
    fireEvent.keyDown(tiles[2], { key: "ArrowDown" });

    expect(tiles[0]).toHaveTextContent("T");
    expect(tiles[1]).toHaveTextContent("I");
    expect(tiles[2]).toHaveTextContent("M");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 004", () => {
  it("rejects size order and only accepts the wells that match the stationary shadows", async () => {
    const onArm = vi.fn();
    renderScene({ slug: "target-knock", onArm });
    const discs = screen.getAllByRole("button", { name: /^圆纸片 \d/ });

    fireEvent.keyDown(discs[0], { key: "Enter" });
    expect(screen.getByTestId("shadow-well-0")).toHaveAttribute("data-wrong", "true");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.keyDown(discs[0], { key: "ArrowRight" });
    fireEvent.keyDown(discs[0], { key: "Enter" });
    fireEvent.keyDown(discs[1], { key: "ArrowRight" });
    fireEvent.keyDown(discs[1], { key: "ArrowRight" });
    fireEvent.keyDown(discs[1], { key: "Enter" });
    fireEvent.keyDown(discs[2], { key: "Enter" });

    await waitFor(() => expect(onArm).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("影子排队")).not.toBeInTheDocument();
  });

  it("discovers the rule when a dragged disc separates from its unmoving shadow", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "target-knock", onDiscover });
    const disc = screen.getByRole("button", { name: "圆纸片 3" });

    fireEvent.pointerDown(disc, { pointerId: 4, clientX: 80, clientY: 100 });
    fireEvent.pointerMove(disc, { pointerId: 4, clientX: 110, clientY: 132 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("shadow-source-2")).toHaveAttribute("data-shadow-stationary", "true");
  });
});

describe("V2 production puzzle scene 005", () => {
  it("lets players test the weights without moving the frame or arming the level", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "amber-triangle", onDiscover, onArm });
    const rig = screen.getByTestId("amber-rig-005");
    const initialAngle = rig.getAttribute("data-frame-angle");
    const weights = screen.getAllByRole("button", { name: /^纸砝码 \d/ });

    fireEvent.pointerDown(weights[0], { pointerId: 5, clientX: 40, clientY: 80 });
    fireEvent.pointerMove(weights[0], { pointerId: 5, clientX: 88, clientY: 105 });
    expect(screen.getByTestId("amber-shadow-0")).toHaveAttribute("data-nudged", "true");
    expect(rig).toHaveAttribute("data-frame-angle", initialAngle);
    for (const weight of weights) fireEvent.keyDown(weight, { key: "Enter" });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.queryByText("琥珀平衡")).not.toBeInTheDocument();
  });

  it("arms only after the lamp makes all three shadows broadly equal", () => {
    const onArm = vi.fn();
    renderScene({ slug: "amber-triangle", onArm });
    const lamp = screen.getByRole("button", { name: "琥珀灯" });

    fireEvent.keyDown(lamp, { key: "ArrowRight" });
    fireEvent.keyDown(lamp, { key: "ArrowRight" });
    fireEvent.keyDown(lamp, { key: "ArrowRight" });
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(lamp, { key: "ArrowRight" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(Number(screen.getByTestId("v2-scene-005").getAttribute("data-shadow-spread"))).toBeLessThanOrEqual(8);
  });
});

describe("V2 production puzzle scene 006", () => {
  function mockMistCanvas(canvas: HTMLElement) {
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100, toJSON: () => undefined,
    });
  }

  it("rejects a large closed scribble that does not follow the hidden zero", () => {
    const onArm = vi.fn();
    renderScene({ slug: "patient-zero", onArm });
    const canvas = screen.getByRole("application", { name: "擦出隐藏的零形" });
    mockMistCanvas(canvas);
    const scribble = [[5, 5], [95, 5], [5, 95], [95, 95], [50, 50], [5, 5]];

    fireEvent.pointerDown(canvas, { pointerId: 6, clientX: scribble[0][0], clientY: scribble[0][1] });
    for (const [x, y] of scribble.slice(1)) fireEvent.pointerMove(canvas, { pointerId: 6, clientX: x, clientY: y });
    fireEvent.pointerUp(canvas, { pointerId: 6 });

    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-006")).toHaveAttribute("data-trace-valid", "false");
    expect(screen.queryByText("雾中零点")).not.toBeInTheDocument();
  });

  it("accepts one broad continuous circuit around the concealed zero", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "patient-zero", onDiscover, onArm });
    const canvas = screen.getByRole("application", { name: "擦出隐藏的零形" });
    mockMistCanvas(canvas);
    const zero = [[50, 15], [35, 20], [24, 35], [23, 50], [24, 65], [35, 80], [50, 85], [65, 80], [76, 65], [77, 50], [76, 35], [65, 20], [50, 15]];

    fireEvent.pointerDown(canvas, { pointerId: 7, clientX: zero[0][0], clientY: zero[0][1] });
    for (const [x, y] of zero.slice(1)) fireEvent.pointerMove(canvas, { pointerId: 7, clientX: x, clientY: y });
    fireEvent.pointerUp(canvas, { pointerId: 7 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-006")).toHaveAttribute("data-revealed-sectors", "8");
  });
});

describe("V2 production puzzle scene 007", () => {
  it("rejects the tempting window shadow while showing that it can stretch", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "window-peek", onDiscover, onArm });
    const shadow = screen.getByRole("button", { name: "框外窗影" });

    fireEvent.pointerDown(shadow, { pointerId: 8, clientX: 90, clientY: 140 });
    fireEvent.pointerMove(shadow, { pointerId: 8, clientX: 55, clientY: 140 });
    fireEvent.pointerUp(shadow, { pointerId: 8 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-007")).toHaveAttribute("data-shadow-stretched", "true");
    expect(screen.queryByText("框外窗影")).not.toBeInTheDocument();
  });

  it("moves the frame into a wide page-edge snap zone without passing on a click", () => {
    const onArm = vi.fn();
    renderScene({ slug: "window-peek", onArm });
    const frame = screen.getByRole("button", { name: "空窗框" });

    fireEvent.click(frame);
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(frame, { key: "ArrowRight" });
    fireEvent.keyDown(frame, { key: "ArrowRight" });
    fireEvent.keyDown(frame, { key: "ArrowRight" });
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(frame, { key: "ArrowRight" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-007")).toHaveAttribute("data-frame-progress", "80");
  });
});

describe("V2 production puzzle scene 008", () => {
  it("rejects shell-first stacking and preserves a correctly snapped side", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-sandwich", onArm });
    const left = screen.getByRole("button", { name: "左侧珊瑚外壳" });
    const sheet = screen.getByRole("button", { name: "透明薄片" });
    const right = screen.getByRole("button", { name: "右侧珊瑚外壳" });

    fireEvent.keyDown(left, { key: "ArrowRight" });
    expect(screen.getByTestId("v2-scene-008")).toHaveAttribute("data-top-layer-rejected", "true");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.keyDown(sheet, { key: "Enter" });
    fireEvent.keyDown(left, { key: "ArrowRight" });
    expect(left).toHaveAttribute("data-locked", "true");
    fireEvent.keyDown(right, { key: "ArrowRight" });
    expect(left).toHaveAttribute("data-locked", "true");
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(right, { key: "ArrowLeft" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("继电器夹层")).not.toBeInTheDocument();
  });

  it("makes both shells respond when the transparent middle layer is moved", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "relay-sandwich", onDiscover });
    const sheet = screen.getByRole("button", { name: "透明薄片" });

    fireEvent.pointerDown(sheet, { pointerId: 9, clientX: 80, clientY: 80 });
    fireEvent.pointerMove(sheet, { pointerId: 9, clientX: 112, clientY: 104 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-008")).toHaveAttribute("data-shells-respond", "true");
  });

  it.each([false, true])("keeps the same pointer drop coordinates when spatialPilot=%s", (spatialPilot) => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-sandwich", spatialPilot, onArm });
    const target = screen.getByTestId("v2-scene-008").querySelector<HTMLElement>("[data-relay-target]")!;
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 100, y: 100, top: 100, right: 200, bottom: 200, left: 100, width: 100, height: 100, toJSON: () => undefined,
    });
    const pieces = [
      screen.getByRole("button", { name: "透明薄片" }),
      screen.getByRole("button", { name: "左侧珊瑚外壳" }),
      screen.getByRole("button", { name: "右侧珊瑚外壳" }),
    ];

    pieces.forEach((piece, index) => {
      fireEvent.pointerDown(piece, { pointerId: 90 + index, clientX: 20, clientY: 20 });
      fireEvent.pointerUp(piece, { pointerId: 90 + index, clientX: 150, clientY: 150 });
    });

    expect(pieces.every((piece) => piece.getAttribute("data-locked") === "true")).toBe(true);
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 009", () => {
  it("rejects the meaningless front order and accepts only the stationary TIME shadows", () => {
    const onArm = vi.fn();
    renderScene({ slug: "clue-cipher", onArm });
    const m = screen.getByRole("button", { name: "字块 M" });
    const t = screen.getByRole("button", { name: "字块 T" });
    const e = screen.getByRole("button", { name: "字块 E" });
    const i = screen.getByRole("button", { name: "字块 I" });

    fireEvent.keyDown(m, { key: "Enter" });
    expect(screen.getByTestId("cipher-well-0")).toHaveAttribute("data-wrong", "true");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.keyDown(m, { key: "ArrowRight" }); fireEvent.keyDown(m, { key: "ArrowRight" }); fireEvent.keyDown(m, { key: "Enter" });
    fireEvent.keyDown(t, { key: "Enter" });
    fireEvent.keyDown(e, { key: "ArrowRight" }); fireEvent.keyDown(e, { key: "ArrowRight" }); fireEvent.keyDown(e, { key: "ArrowRight" }); fireEvent.keyDown(e, { key: "Enter" });
    fireEvent.keyDown(i, { key: "ArrowRight" }); fireEvent.keyDown(i, { key: "Enter" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("会说真话的影字")).not.toBeInTheDocument();
  });

  it("keeps the shadow word in place when a front letter block moves", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "clue-cipher", onDiscover });
    const block = screen.getByRole("button", { name: "字块 E" });

    fireEvent.pointerDown(block, { pointerId: 10, clientX: 90, clientY: 90 });
    fireEvent.pointerMove(block, { pointerId: 10, clientX: 122, clientY: 112 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-009")).toHaveAttribute("data-shadow-word", "TIME");
  });
});

describe("V2 production puzzle scene 010", () => {
  it("ignores typed 101 and requires both page edges to fold inward", () => {
    const onArm = vi.fn();
    renderScene({ slug: "calibration-101", onArm });
    const left = screen.getByRole("button", { name: "左侧页边" });
    const right = screen.getByRole("button", { name: "右侧页边" });

    fireEvent.keyDown(document, { key: "1" }); fireEvent.keyDown(document, { key: "0" }); fireEvent.keyDown(document, { key: "1" });
    fireEvent.click(left); fireEvent.click(right);
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(left, { key: "ArrowRight" });
    expect(screen.getByTestId("v2-scene-010")).toHaveAttribute("data-page-width-state", "one-side");
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(right, { key: "ArrowLeft" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-010")).toHaveAttribute("data-page-width-state", "narrow");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("折出的 101")).not.toBeInTheDocument();
  });

  it("uses a broad inward drag threshold instead of a precise fold pixel", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "calibration-101", onDiscover, onArm });
    const left = screen.getByRole("button", { name: "左侧页边" });
    const right = screen.getByRole("button", { name: "右侧页边" });

    fireEvent.pointerDown(left, { pointerId: 11, clientX: 20, clientY: 100 });
    fireEvent.pointerMove(left, { pointerId: 11, clientX: 82, clientY: 100 });
    fireEvent.pointerUp(left, { pointerId: 11, clientX: 82, clientY: 100 });
    fireEvent.pointerDown(right, { pointerId: 12, clientX: 350, clientY: 100 });
    fireEvent.pointerMove(right, { pointerId: 12, clientX: 288, clientY: 100 });
    fireEvent.pointerUp(right, { pointerId: 12, clientX: 288, clientY: 100 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 011", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reveals the delayed coupling without letting alternating leaf taps solve the relay", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "double-relay", onDiscover, onArm });
    const left = screen.getByRole("button", { name: "左侧纸叶" });
    const right = screen.getByRole("button", { name: "右侧纸叶" });

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(left);
      act(() => vi.advanceTimersByTime(80));
      fireEvent.click(right);
      act(() => vi.advanceTimersByTime(80));
    }

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-011")).toHaveAttribute("data-coupling-seen", "true");
    expect(screen.queryByText("同面继电")).not.toBeInTheDocument();
  });

  it("rejects a short axis hold and auto-locks only after both faces stay aligned", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "double-relay", onArm });
    const axis = screen.getByRole("button", { name: "中央纸轴" });

    fireEvent.pointerDown(axis, { pointerId: 13 });
    act(() => vi.advanceTimersByTime(640));
    fireEvent.pointerUp(axis, { pointerId: 13 });
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-011")).toHaveAttribute("data-phase-gap", "5");

    fireEvent.pointerDown(axis, { pointerId: 14 });
    act(() => vi.advanceTimersByTime(1_200));
    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-011")).toHaveAttribute("data-phase-gap", "0");
  });

  it("provides the same no-release-timing solution with Space", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "double-relay", onArm });
    const axis = screen.getByRole("button", { name: "中央纸轴" });

    fireEvent.keyDown(axis, { key: " " });
    act(() => vi.advanceTimersByTime(1_200));

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 012", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not mistake double-clicking the two pressure discs for synchronization", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "pressure-delay", onDiscover, onArm });
    const left = screen.getByRole("button", { name: "左侧压力圆盘" });
    const right = screen.getByRole("button", { name: "右侧压力圆盘" });

    fireEvent.doubleClick(left);
    fireEvent.doubleClick(right);

    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-012")).toHaveAttribute("data-wave-state", "separated");
    expect(screen.queryByText("压力回声")).not.toBeInTheDocument();
  });

  it("shows the delayed opposite response, rejects a short press, and completes after a stable equal interval", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "pressure-delay", onDiscover, onArm });
    const left = screen.getByRole("button", { name: "左侧压力圆盘" });

    fireEvent.pointerDown(left, { pointerId: 15 });
    act(() => vi.advanceTimersByTime(420));
    expect(screen.getByTestId("pressure-disc-right-012")).toHaveAttribute("data-responding", "true");
    fireEvent.pointerUp(left, { pointerId: 15 });
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-012")).toHaveAttribute("data-wave-state", "separated");

    fireEvent.pointerDown(left, { pointerId: 16 });
    act(() => vi.advanceTimersByTime(1_350));
    expect(screen.getByTestId("v2-scene-012")).toHaveAttribute("data-wave-state", "equal");
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(50));

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports one continuous Space hold without release timing", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pressure-delay", onArm });
    const right = screen.getByRole("button", { name: "右侧压力圆盘" });

    fireEvent.keyDown(right, { key: " " });
    act(() => vi.advanceTimersByTime(1_450));

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 013", () => {
  it("treats aligned peaks as a readable decoy rather than the solution", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "signal-oscillation", onDiscover, onArm });
    const upper = screen.getByRole("button", { name: "上层波形纸带" });

    fireEvent.click(upper);
    expect(onDiscover).not.toHaveBeenCalled();
    fireEvent.keyDown(upper, { key: "ArrowRight" });
    fireEvent.keyDown(upper, { key: "ArrowRight" });

    expect(screen.getByTestId("v2-scene-013")).toHaveAttribute("data-alignment", "peak");
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.queryByText("零点重合")).not.toBeInTheDocument();
    expect(screen.getByTestId("lower-wave-013")).toHaveAttribute("data-stationary", "true");
  });

  it("snaps only when the two zero cutouts share the same broad horizontal zone", () => {
    const onArm = vi.fn();
    renderScene({ slug: "signal-oscillation", onArm });
    const upper = screen.getByRole("button", { name: "上层波形纸带" });

    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(upper, { key: "ArrowRight" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-013")).toHaveAttribute("data-alignment", "zero");
  });

  it("accepts a loose horizontal drag without requiring a precise release pixel", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "signal-oscillation", onDiscover, onArm });
    const upper = screen.getByRole("button", { name: "上层波形纸带" });

    fireEvent.pointerDown(upper, { pointerId: 17, clientX: 100 });
    fireEvent.pointerMove(upper, { pointerId: 17, clientX: 218 });
    fireEvent.pointerUp(upper, { pointerId: 17, clientX: 218 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 014", () => {
  it("reveals the 35 percent mirror response but never passes on one aligned axis", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "corner-cross", onDiscover, onArm });
    const horizontal = screen.getByRole("button", { name: "横向断裂丝带" });

    fireEvent.pointerDown(horizontal, { pointerId: 18, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(horizontal, { pointerId: 18, clientX: 160, clientY: 100 });
    fireEvent.pointerUp(horizontal, { pointerId: 18, clientX: 160, clientY: 100 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-014")).toHaveAttribute("data-half-cross", "horizontal");
    expect(screen.getByTestId("v2-scene-014")).toHaveAttribute("data-vertical-offset", "69");
    expect(screen.queryByText("角点十字")).not.toBeInTheDocument();
  });

  it("snaps when alternating one-finger adjustments bring both cuts into the 36px center zone", () => {
    const onArm = vi.fn();
    renderScene({ slug: "corner-cross", onArm });
    const horizontal = screen.getByRole("button", { name: "横向断裂丝带" });
    const vertical = screen.getByRole("button", { name: "纵向断裂丝带" });

    fireEvent.pointerDown(horizontal, { pointerId: 19, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(horizontal, { pointerId: 19, clientX: 160, clientY: 100 });
    fireEvent.pointerUp(horizontal, { pointerId: 19, clientX: 160, clientY: 100 });
    fireEvent.pointerDown(vertical, { pointerId: 20, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(vertical, { pointerId: 20, clientX: 100, clientY: 50 });
    fireEvent.pointerUp(vertical, { pointerId: 20, clientX: 100, clientY: 50 });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-014")).toHaveAttribute("data-half-cross", "complete");
  });

  it("offers the same alternating-axis relation from the keyboard", () => {
    const onArm = vi.fn();
    renderScene({ slug: "corner-cross", onArm });
    const horizontal = screen.getByRole("button", { name: "横向断裂丝带" });
    const vertical = screen.getByRole("button", { name: "纵向断裂丝带" });

    fireEvent.keyDown(horizontal, { key: "ArrowRight" });
    fireEvent.keyDown(horizontal, { key: "ArrowRight" });
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(vertical, { key: "ArrowUp" });

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 015", () => {
  it("rejects the mechanical strategy of flipping all three arc pieces once", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "binary-blink", onDiscover, onArm });
    const pieces = screen.getAllByRole("button", { name: /^圆弧纸片 \d/ });

    for (const piece of pieces) fireEvent.click(piece);

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-015")).toHaveAttribute("data-ring-pattern", "101");
    expect(screen.queryByText("交替圆环")).not.toBeInTheDocument();
  });

  it("zips the alternating seam after one evidence-based swipe of the reversed middle piece", () => {
    const onArm = vi.fn();
    renderScene({ slug: "binary-blink", onArm });
    const middle = screen.getByRole("button", { name: "圆弧纸片 2" });

    fireEvent.pointerDown(middle, { pointerId: 21, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(middle, { pointerId: 21, clientX: 100, clientY: 132 });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-015")).toHaveAttribute("data-ring-pattern", "000");
  });

  it("offers the same single-piece flip with Enter", () => {
    const onArm = vi.fn();
    renderScene({ slug: "binary-blink", onArm });
    const middle = screen.getByRole("button", { name: "圆弧纸片 2" });

    fireEvent.keyDown(middle, { key: "Enter" });

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 016", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets the bead escape repeated direct grabs without accumulating progress", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "status-rebound", onDiscover, onArm });
    const bead = screen.getByRole("button", { name: "会逃开的纸珠" });

    for (let attempt = 0; attempt < 6; attempt += 1) fireEvent.click(bead);

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-016")).toHaveAttribute("data-chase-attempts", "6");
    expect(screen.getByTestId("v2-scene-016")).toHaveAttribute("data-wake-angle", "-90");
    expect(screen.queryByText("追上自己的尾迹")).not.toBeInTheDocument();
  });

  it("moves the wake rather than the bead and snaps through a thirty-degree target zone", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "status-rebound", onArm });
    const ring = screen.getByRole("button", { name: "可旋转的尾迹外环" });

    for (let step = 0; step < 3; step += 1) fireEvent.keyDown(ring, { key: "ArrowRight" });
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-016")).toHaveAttribute("data-rebound", "narrow");

    fireEvent.keyDown(ring, { key: "ArrowRight" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-016")).toHaveAttribute("data-wake-angle", "30");
    expect(screen.getByTestId("v2-scene-016")).toHaveAttribute("data-snap-zone-degrees", "30");
  });

  it("accepts a loose circular drag near the predicted next bead position", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "status-rebound", onDiscover, onArm });
    const ring = screen.getByRole("button", { name: "可旋转的尾迹外环" });
    vi.spyOn(ring, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 240,
      bottom: 240,
      left: 0,
      width: 240,
      height: 240,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(ring, { pointerId: 22, clientX: 120, clientY: 30 });
    fireEvent.pointerMove(ring, { pointerId: 22, clientX: 185, clientY: 179 });
    fireEvent.pointerUp(ring, { pointerId: 22, clientX: 185, clientY: 179 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 017", () => {
  it("rejects mechanically flipping every half-glyph tile", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "inverted-nibble", onDiscover, onArm });
    const tiles = screen.getAllByRole("button", { name: /^上下半字纸片 \d/ });

    for (const tile of tiles) fireEvent.click(tile);

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-017")).toHaveAttribute("data-nibble-pattern", "1111");
    expect(screen.queryByText("上下半字")).not.toBeInTheDocument();
  });

  it("gives the reversed third tile both crease and grain evidence before one upward swipe repairs it", () => {
    const onArm = vi.fn();
    renderScene({ slug: "inverted-nibble", onArm });
    const oddTile = screen.getByRole("button", { name: "上下半字纸片 3" });

    expect(oddTile).toHaveAttribute("data-crease", "contrary");
    expect(oddTile).toHaveAttribute("data-grain", "reversed");
    fireEvent.pointerDown(oddTile, { pointerId: 23, clientY: 130 });
    fireEvent.pointerUp(oddTile, { pointerId: 23, clientY: 94 });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-017")).toHaveAttribute("data-nibble-pattern", "0010");
    expect(screen.getByTestId("v2-scene-017")).toHaveAttribute("data-seam", "continuous");
  });

  it("offers the same evidence-based single flip with Enter", () => {
    const onArm = vi.fn();
    renderScene({ slug: "inverted-nibble", onArm });
    const oddTile = screen.getByRole("button", { name: "上下半字纸片 3" });

    fireEvent.keyDown(oddTile, { key: "Enter" });

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 018", () => {
  it("keeps both cuts outside when they are slid together around the unchanged ring", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "outer-ones", onDiscover, onArm });
    const firstCut = screen.getByRole("button", { name: "环外刻痕 1" });

    for (let step = 0; step < 12; step += 1) fireEvent.keyDown(firstCut, { key: "ArrowRight" });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-018")).toHaveAttribute("data-mark-gap", "0");
    expect(screen.getByTestId("v2-scene-018")).toHaveAttribute("data-ring-size", "20");
    expect(screen.getByTestId("v2-scene-018")).toHaveAttribute("data-boundary-state", "outside");
    expect(screen.queryByText("内外改写")).not.toBeInTheDocument();
  });

  it("rewrites outside as inside only after the shared ring enters its broad size zone", () => {
    const onArm = vi.fn();
    renderScene({ slug: "outer-ones", onArm });
    const ring = screen.getByRole("button", { name: "可改变大小的内环" });

    fireEvent.keyDown(ring, { key: "+" });
    fireEvent.keyDown(ring, { key: "+" });
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-018")).toHaveAttribute("data-ring-size", "60");

    fireEvent.keyDown(ring, { key: "+" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-018")).toHaveAttribute("data-ring-size", "80");
    expect(screen.getByTestId("v2-scene-018")).toHaveAttribute("data-boundary-state", "inside");
    expect(screen.getByTestId("v2-scene-018")).toHaveAttribute("data-size-target", "70-100");
  });

  it("accepts a loose outward edge drag without invoking browser zoom", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "outer-ones", onDiscover, onArm });
    const ring = screen.getByRole("button", { name: "可改变大小的内环" });
    vi.spyOn(ring, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 240,
      bottom: 240,
      left: 0,
      width: 240,
      height: 240,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(ring, { pointerId: 24, clientX: 180, clientY: 120 });
    fireEvent.pointerMove(ring, { pointerId: 24, clientX: 252, clientY: 120 });
    fireEvent.pointerUp(ring, { pointerId: 24, clientX: 252, clientY: 120 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 019", () => {
  it("keeps the interlayer broken while both housing gaps overlap", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "double-housing-loop", onDiscover, onArm });
    const housing = screen.getByRole("button", { name: "可反向联动的外层纸壳" });

    fireEvent.click(housing);

    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-019")).toHaveAttribute("data-gap-separation", "0");
    expect(screen.getByTestId("v2-scene-019")).toHaveAttribute("data-layer-ink", "faint");
    expect(screen.queryByText("双壳闭环")).not.toBeInTheDocument();
  });

  it("counter-rotates the inner shell in fifteen-degree steps and closes a broad opposite-gap zone", () => {
    const onArm = vi.fn();
    renderScene({ slug: "double-housing-loop", onArm });
    const housing = screen.getByRole("button", { name: "可反向联动的外层纸壳" });

    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(housing, { key: "ArrowRight" });
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-019")).toHaveAttribute("data-outer-angle", "60");
    expect(screen.getByTestId("v2-scene-019")).toHaveAttribute("data-inner-angle", "-60");
    expect(screen.getByTestId("v2-scene-019")).toHaveAttribute("data-layer-ink", "growing");

    fireEvent.keyDown(housing, { key: "ArrowRight" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-019")).toHaveAttribute("data-gap-separation", "180");
    expect(screen.getByTestId("v2-scene-019")).toHaveAttribute("data-layer-ink", "closed");
    expect(screen.getByTestId("v2-scene-019")).toHaveAttribute("data-snap-zone-degrees", "60");
  });

  it("accepts one loose quarter-turn drag of the outer shell", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "double-housing-loop", onDiscover, onArm });
    const housing = screen.getByRole("button", { name: "可反向联动的外层纸壳" });
    vi.spyOn(housing, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 240,
      bottom: 240,
      left: 0,
      width: 240,
      height: 240,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(housing, { pointerId: 25, clientX: 120, clientY: 25 });
    fireEvent.pointerMove(housing, { pointerId: 25, clientX: 215, clientY: 120 });
    fireEvent.pointerUp(housing, { pointerId: 25, clientX: 215, clientY: 120 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports the same stepped relation with the wheel", () => {
    const onArm = vi.fn();
    renderScene({ slug: "double-housing-loop", onArm });
    const housing = screen.getByRole("button", { name: "可反向联动的外层纸壳" });

    for (let step = 0; step < 5; step += 1) fireEvent.wheel(housing, { deltaY: 80 });

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 020", () => {
  it("breaks the current line instead of rewarding clicks on the three obvious centers", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "quiet-circuit", onDiscover, onArm });
    const centers = screen.getAllByRole("button", { name: /^节点中心 \d/ });

    for (const center of centers) fireEvent.click(center);

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-020")).toHaveAttribute("data-route-length", "0");
    expect(screen.getByTestId("v2-scene-020")).toHaveAttribute("data-center-faults", "3");
    expect(screen.queryByText("不按下的电路")).not.toBeInTheDocument();
  });

  it("grows the line only when keyboard focus passes the three outer halos in order", () => {
    const onArm = vi.fn();
    renderScene({ slug: "quiet-circuit", onArm });
    const halos = screen.getAllByRole("button", { name: /^外围光晕 \d/ });

    fireEvent.focus(halos[0]);
    fireEvent.focus(halos[1]);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-020")).toHaveAttribute("data-route-length", "2");
    fireEvent.focus(halos[2]);

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-020")).toHaveAttribute("data-route-length", "3");
    expect(screen.getByTestId("v2-scene-020")).toHaveAttribute("data-channel-width", "44");
  });

  it("accepts one continuous touch-style drag through the same outer channel", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "quiet-circuit", onDiscover, onArm });
    const circuit = screen.getByRole("application", { name: "绕开中心的外围线路" });
    vi.spyOn(circuit, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 300,
      bottom: 300,
      left: 0,
      width: 300,
      height: 300,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(circuit, { pointerId: 26, clientX: 60, clientY: 216 });
    fireEvent.pointerMove(circuit, { pointerId: 26, clientX: 150, clientY: 84 });
    fireEvent.pointerMove(circuit, { pointerId: 26, clientX: 246, clientY: 198 });
    fireEvent.pointerUp(circuit, { pointerId: 26, clientX: 246, clientY: 198 });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 021", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects three arbitrary rapid taps while keeping all ink dots fixed outside the breathing frame", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "three-beat-warmup", onDiscover, onArm });
    const surface = screen.getByRole("button", { name: "回应纸框与墨点的交会" });

    fireEvent.click(surface);
    fireEvent.click(surface);
    fireEvent.click(surface);

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-021")).toHaveAttribute("data-hit-count", "0");
    expect(screen.getByTestId("v2-scene-021")).toHaveAttribute("data-bounce-count", "3");
    expect(screen.getAllByTestId(/^warmup-dot-/)).toHaveLength(3);
    for (const dot of screen.getAllByTestId(/^warmup-dot-/)) expect(dot).toHaveAttribute("data-fixed-reference", "true");
    expect(screen.queryByText("三拍热身")).not.toBeInTheDocument();
  });

  it("accepts the three visible crossings in order through a seven-hundred-millisecond window", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "three-beat-warmup", onArm });
    const surface = screen.getByRole("button", { name: "回应纸框与墨点的交会" });
    const scene = screen.getByTestId("v2-scene-021");

    act(() => vi.advanceTimersByTime(900));
    expect(scene).toHaveAttribute("data-active-dot", "0");
    expect(scene).toHaveAttribute("data-hit-window-ms", "700");
    fireEvent.click(surface);
    fireEvent.click(surface);
    fireEvent.click(surface);
    expect(scene).toHaveAttribute("data-hit-count", "1");
    expect(onArm).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1_800));
    expect(scene).toHaveAttribute("data-active-dot", "1");
    fireEvent.click(surface);
    act(() => vi.advanceTimersByTime(1_800));
    expect(scene).toHaveAttribute("data-active-dot", "2");
    fireEvent.click(surface);

    expect(scene).toHaveAttribute("data-hit-count", "3");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers the same broad crossing response with Space", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "three-beat-warmup", onArm });
    const surface = screen.getByRole("button", { name: "回应纸框与墨点的交会" });

    surface.focus();
    for (let beat = 0; beat < 3; beat += 1) {
      act(() => vi.advanceTimersByTime(beat === 0 ? 900 : 1_800));
      fireEvent.keyDown(surface, { key: " " });
    }

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 022", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("splashes instead of solving when the three visible drops are clicked", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "metronome-leak", onDiscover, onArm });
    const filledLanes = [1, 2, 4].map((lane) => screen.getByRole("button", { name: `落水线 ${lane}` }));

    for (const lane of filledLanes) fireEvent.click(lane);

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-022")).toHaveAttribute("data-splash-count", "3");
    expect(screen.getByTestId("drop-lane-2")).toHaveAttribute("data-has-drop", "false");
    expect(screen.queryByText("漏掉的一滴")).not.toBeInTheDocument();
  });

  it("requires one observed empty ripple before accepting its next nine-hundred-millisecond window", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "metronome-leak", onArm });
    const scene = screen.getByTestId("v2-scene-022");
    const emptyLane = screen.getByRole("button", { name: "落水线 3" });

    act(() => vi.advanceTimersByTime(1_600));
    expect(scene).toHaveAttribute("data-ripple-active", "true");
    expect(scene).toHaveAttribute("data-observed-rounds", "0");
    expect(scene).toHaveAttribute("data-hit-window-ms", "900");
    fireEvent.click(emptyLane);
    expect(onArm).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(2_400));
    expect(scene).toHaveAttribute("data-ripple-active", "true");
    expect(scene).toHaveAttribute("data-observed-rounds", "1");
    fireEvent.click(emptyLane);

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(scene).toHaveAttribute("data-missing-drop", "restored");
  });

  it("supports selecting the empty lane and restoring it with Space", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "metronome-leak", onArm });
    const emptyLane = screen.getByRole("button", { name: "落水线 3" });

    act(() => vi.advanceTimersByTime(4_000));
    emptyLane.focus();
    fireEvent.keyDown(emptyLane, { key: " " });

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 023", () => {
  it("rejects arranging the petals from narrow to wide without matching the reversed gaps", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "slow-clap", onDiscover, onArm });
    const petals = screen.getAllByRole("button", { name: /^声纹花瓣/ });

    fireEvent.focus(petals[2]);
    fireEvent.keyDown(petals[2], { key: "Enter" });
    fireEvent.focus(petals[1]);
    fireEvent.keyDown(petals[1], { key: "ArrowRight" });
    fireEvent.keyDown(petals[1], { key: "Enter" });
    fireEvent.focus(petals[0]);
    fireEvent.keyDown(petals[0], { key: "ArrowRight" });
    fireEvent.keyDown(petals[0], { key: "ArrowRight" });
    fireEvent.keyDown(petals[0], { key: "Enter" });

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-023")).toHaveAttribute("data-slot-pattern", "0,1,2");
    expect(screen.queryByText("把花瓣放回沉默")).not.toBeInTheDocument();
  });

  it("matches medium, narrow, and wide petals to the visible gap lengths with the keyboard", () => {
    const onArm = vi.fn();
    renderScene({ slug: "slow-clap", onArm });
    const petals = screen.getAllByRole("button", { name: /^声纹花瓣/ });

    fireEvent.focus(petals[1]);
    fireEvent.keyDown(petals[1], { key: "Enter" });
    fireEvent.focus(petals[2]);
    fireEvent.keyDown(petals[2], { key: "ArrowRight" });
    fireEvent.keyDown(petals[2], { key: "Enter" });
    fireEvent.focus(petals[0]);
    fireEvent.keyDown(petals[0], { key: "ArrowRight" });
    fireEvent.keyDown(petals[0], { key: "ArrowRight" });
    fireEvent.keyDown(petals[0], { key: "Enter" });

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-023")).toHaveAttribute("data-slot-pattern", "1,0,2");
    expect(screen.getByTestId("v2-scene-023")).toHaveAttribute("data-matched-gaps", "3");
  });

  it("accepts loose pointer drops into the three corresponding silence gaps", () => {
    const onArm = vi.fn();
    renderScene({ slug: "slow-clap", onArm });
    const petals = screen.getAllByRole("button", { name: /^声纹花瓣/ });
    const gaps = screen.getAllByTestId(/^silence-gap-/);
    gaps.forEach((gap, index) => vi.spyOn(gap, "getBoundingClientRect").mockReturnValue({
      x: index * 120,
      y: 200,
      top: 200,
      right: index * 120 + 100,
      bottom: 280,
      left: index * 120,
      width: 100,
      height: 80,
      toJSON: () => undefined,
    }));

    for (const [petalIndex, slotIndex] of [[1, 0], [2, 1], [0, 2]] as const) {
      fireEvent.pointerDown(petals[petalIndex], { pointerId: 30 + petalIndex, clientX: 40, clientY: 80 });
      fireEvent.pointerUp(petals[petalIndex], { pointerId: 30 + petalIndex, clientX: slotIndex * 120 + 50, clientY: 240 });
    }

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-023")).toHaveAttribute("data-drop-padding-px", "22");
  });
});

describe("V2 production puzzle scene 024", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not count taps until one continuous trace has visited all five curve points", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "precision-five", onDiscover, onArm });
    const curve = screen.getByRole("application", { name: "描过五点并按路程打拍" });

    for (let tap = 0; tap < 5; tap += 1) {
      fireEvent.keyDown(curve, { key: " " });
      act(() => vi.advanceTimersByTime(200));
    }

    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-stage", "trace");
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-beat-count", "0");
    expect(screen.queryByText("曲线五拍")).not.toBeInTheDocument();
  });

  it("rejects five equal five-hundred-millisecond beats after a valid pointer trace", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "precision-five", onArm });
    const curve = screen.getByRole("application", { name: "描过五点并按路程打拍" });
    vi.spyOn(curve, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      right: 300,
      bottom: 300,
      left: 0,
      width: 300,
      height: 300,
      toJSON: () => undefined,
    });
    const points = [[36, 186], [84, 144], [156, 60], [198, 102], [273, 207]] as const;
    fireEvent.pointerDown(curve, { pointerId: 40, clientX: points[0][0], clientY: points[0][1] });
    for (const [clientX, clientY] of points.slice(1)) fireEvent.pointerMove(curve, { pointerId: 40, clientX, clientY });
    fireEvent.pointerUp(curve, { pointerId: 40, clientX: points[4][0], clientY: points[4][1] });

    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-stage", "beat");
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-trace-points", "5");
    for (let beat = 0; beat < 5; beat += 1) {
      fireEvent.pointerDown(curve, { pointerId: 50 + beat, clientX: 150, clientY: 150 });
      fireEvent.pointerUp(curve, { pointerId: 50 + beat, clientX: 150, clientY: 150 });
      if (beat < 4) act(() => vi.advanceTimersByTime(500));
    }

    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-failures", "1");
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-beat-count", "0");
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-long-short-ratio-min", "1.25");
  });

  it("accepts the visible short-long-short-long timing with arrows and Space", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "precision-five", onArm });
    const curve = screen.getByRole("application", { name: "描过五点并按路程打拍" });

    for (const key of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown"]) fireEvent.keyDown(curve, { key });
    fireEvent.keyDown(curve, { key: " " });
    for (const gap of [420, 720, 420, 720]) {
      act(() => vi.advanceTimersByTime(gap));
      fireEvent.keyDown(curve, { key: " " });
    }

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-beat-count", "5");
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-short-range-ms", "273-567");
    expect(screen.getByTestId("v2-scene-024")).toHaveAttribute("data-long-range-ms", "468-972");
  });
});

describe("V2 production puzzle scene 025", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns ordinary echoes when the two bright beacons are clicked repeatedly", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "beacon-beat", onDiscover, onArm });
    const beacons = screen.getAllByRole("button", { name: /^亮信标/ });

    for (let click = 0; click < 6; click += 1) fireEvent.click(beacons[click % 2]);

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.getByTestId("v2-scene-025")).toHaveAttribute("data-beacon-echoes", "6");
    expect(screen.getByTestId("v2-scene-025")).toHaveAttribute("data-dark-beat", "waiting");
    expect(screen.queryByText("安静的中间拍")).not.toBeInTheDocument();
  });

  it("accepts the dark bead during an eight-hundred-millisecond midpoint window", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "beacon-beat", onArm });
    const scene = screen.getByTestId("v2-scene-025");
    const darkBead = screen.getByRole("button", { name: "中间暗珠" });

    act(() => vi.advanceTimersByTime(1_200));
    expect(scene).toHaveAttribute("data-dark-beat", "active");
    expect(scene).toHaveAttribute("data-hit-window-ms", "800");
    expect(darkBead).toHaveAttribute("data-outline-cue", "thick");
    fireEvent.click(darkBead);

    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("rejects an early dark touch but offers the same midpoint response with Space", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "beacon-beat", onArm });
    const scene = screen.getByTestId("v2-scene-025");
    const darkBead = screen.getByRole("button", { name: "中间暗珠" });

    fireEvent.click(darkBead);
    expect(onArm).not.toHaveBeenCalled();
    expect(scene).toHaveAttribute("data-dark-misses", "1");
    act(() => vi.advanceTimersByTime(1_200));
    darkBead.focus();
    fireEvent.keyDown(darkBead, { key: " " });

    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 026", () => {
  it("keeps one-plus-four, three-plus-two, and four-plus-one as visible wrong groups", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "five-beat-divider", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-026");
    const divider = screen.getByRole("slider", { name: "透明分隔片" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 100,
      top: 100,
      right: 500,
      bottom: 300,
      left: 100,
      width: 400,
      height: 200,
      toJSON: () => undefined,
    });

    for (const [clientX, split] of [[180, "1"], [340, "3"], [420, "4"]] as const) {
      fireEvent.pointerDown(divider, { pointerId: 1, clientX: 420 });
      fireEvent.pointerMove(divider, { pointerId: 1, clientX });
      fireEvent.pointerUp(divider, { pointerId: 1, clientX });
      expect(scene).toHaveAttribute("data-split", split);
      expect(onArm).not.toHaveBeenCalled();
    }

    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(scene).toHaveAttribute("data-wrong-groups", "3");
    expect(screen.queryByText("二加三")).not.toBeInTheDocument();
  });

  it("provides two-versus-three paper evidence before accepting the second divider slot", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-beat-divider", onArm });
    const scene = screen.getByTestId("v2-scene-026");
    const divider = screen.getByRole("slider", { name: "透明分隔片" });

    expect(scene).toHaveAttribute("data-left-notches", "2");
    expect(scene).toHaveAttribute("data-right-notches", "3");
    expect(scene).toHaveAttribute("data-split", "4");
    fireEvent.keyDown(divider, { key: "ArrowLeft" });
    expect(scene).toHaveAttribute("data-split", "3");
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(divider, { key: "ArrowLeft" });

    expect(scene).toHaveAttribute("data-split", "2");
    expect(scene).toHaveAttribute("data-grouping", "two-plus-three");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("accepts a broad pointer drop between the second and third ink dots", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-beat-divider", onArm });
    const scene = screen.getByTestId("v2-scene-026");
    const divider = screen.getByRole("slider", { name: "透明分隔片" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 100,
      top: 100,
      right: 500,
      bottom: 300,
      left: 100,
      width: 400,
      height: 200,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(divider, { pointerId: 2, clientX: 420 });
    fireEvent.pointerMove(divider, { pointerId: 2, clientX: 268 });
    fireEvent.pointerUp(divider, { pointerId: 2, clientX: 268 });

    expect(scene).toHaveAttribute("data-split", "2");
    expect(scene).toHaveAttribute("data-slot-width-px", "80");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 027", () => {
  it("shows the late point as a longer preceding arc without turning a click into a solution", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "beacon-metronome", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-027");
    const latePoint = screen.getByRole("slider", { name: "迟到的纸点" });

    expect(scene).toHaveAttribute("data-point-angles", "0,90,180,300");
    expect(scene).toHaveAttribute("data-gap-before", "120");
    expect(scene).toHaveAttribute("data-gap-after", "60");
    expect(scene).toHaveAttribute("data-tolerance-percent", "12");
    fireEvent.click(latePoint);
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.queryByText("把迟到变成距离")).not.toBeInTheDocument();
  });

  it("replays the sweep while arrow keys equalize all four quarter arcs", () => {
    const onArm = vi.fn();
    renderScene({ slug: "beacon-metronome", onArm });
    const scene = screen.getByTestId("v2-scene-027");
    const latePoint = screen.getByRole("slider", { name: "迟到的纸点" });

    fireEvent.keyDown(latePoint, { key: "ArrowRight" });
    expect(scene).toHaveAttribute("data-late-angle", "310");
    expect(onArm).not.toHaveBeenCalled();
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(latePoint, { key: "ArrowLeft" });

    expect(scene).toHaveAttribute("data-late-angle", "270");
    expect(scene).toHaveAttribute("data-gap-before", "90");
    expect(scene).toHaveAttribute("data-gap-after", "90");
    expect(scene).toHaveAttribute("data-beam-replays", "4");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("accepts a broad orbital pointer position inside the twenty-one-point-six-degree band", () => {
    const onArm = vi.fn();
    renderScene({ slug: "beacon-metronome", onArm });
    const scene = screen.getByTestId("v2-scene-027");
    const latePoint = screen.getByRole("slider", { name: "迟到的纸点" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 100,
      y: 100,
      top: 100,
      right: 500,
      bottom: 500,
      left: 100,
      width: 400,
      height: 400,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(latePoint, { pointerId: 3, clientX: 350, clientY: 213 });
    fireEvent.pointerMove(latePoint, { pointerId: 3, clientX: 321, clientY: 202 });
    fireEvent.pointerUp(latePoint, { pointerId: 3, clientX: 321, clientY: 202 });
    expect(Number(scene.getAttribute("data-late-angle"))).toBeGreaterThan(281);
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.pointerDown(latePoint, { pointerId: 4, clientX: 321, clientY: 202 });
    fireEvent.pointerMove(latePoint, { pointerId: 4, clientX: 316, clientY: 201 });
    fireEvent.pointerUp(latePoint, { pointerId: 4, clientX: 316, clientY: 201 });
    expect(Number(scene.getAttribute("data-late-angle"))).toBeGreaterThanOrEqual(259.2);
    expect(Number(scene.getAttribute("data-late-angle"))).toBeLessThanOrEqual(280.8);
    expect(scene).toHaveAttribute("data-completion-band-deg", "21.6");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 028", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not turn four rapid petal taps into a mechanical solution", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "fourfold-ack", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-028");
    const petals = screen.getAllByRole("button", { name: /^纸瓣/ });

    expect(scene).toHaveAttribute("data-phase-model", "three-same-one-opposite");
    expect(scene).toHaveAttribute("data-offbeat-index", "2");
    for (const petal of petals) {
      fireEvent.pointerDown(petal, { pointerId: 1 });
      fireEvent.pointerUp(petal, { pointerId: 1 });
    }
    act(() => vi.advanceTimersByTime(2_000));

    expect(scene).toHaveAttribute("data-quick-releases", "4");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.queryByText("留下那片反拍")).not.toBeInTheDocument();
  });

  it("makes a held in-phase petal chaotic but lets the offbeat petal stabilize one whole cycle", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "fourfold-ack", onArm });
    const scene = screen.getByTestId("v2-scene-028");
    const petals = screen.getAllByRole("button", { name: /^纸瓣/ });

    fireEvent.pointerDown(petals[0], { pointerId: 2 });
    expect(scene).toHaveAttribute("data-rhythm", "chaotic");
    act(() => vi.advanceTimersByTime(1_800));
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.pointerUp(petals[0], { pointerId: 2 });

    fireEvent.pointerDown(petals[2], { pointerId: 3 });
    expect(scene).toHaveAttribute("data-rhythm", "stabilizing");
    act(() => vi.advanceTimersByTime(1_600));

    expect(scene).toHaveAttribute("data-hold-cycle-ms", "1600");
    expect(scene).toHaveAttribute("data-hold-progress", "8");
    expect(scene).toHaveAttribute("data-center", "stable");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers the same no-precision-release route while Space remains held", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "fourfold-ack", onArm });
    const offbeat = screen.getByRole("button", { name: "纸瓣 3" });

    offbeat.focus();
    fireEvent.keyDown(offbeat, { key: " " });
    act(() => vi.advanceTimersByTime(1_600));

    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("v2-scene-028")).toHaveAttribute("data-center", "stable");
  });
});

describe("V2 production puzzle scene 029", () => {
  const sceneRect = {
    x: 100,
    y: 100,
    top: 100,
    right: 500,
    bottom: 400,
    left: 100,
    width: 400,
    height: 300,
    toJSON: () => undefined,
  } as const;

  it("rejects a lucky drop into the hidden gap before the ruler changes the evidence", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pulse-checker", onArm });
    const scene = screen.getByTestId("v2-scene-029");
    const spare = screen.getByRole("button", { name: "备用墨点" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);

    fireEvent.pointerDown(spare, { pointerId: 1, clientX: 156, clientY: 352 });
    fireEvent.pointerMove(spare, { pointerId: 1, clientX: 340, clientY: 280 });
    fireEvent.pointerUp(spare, { pointerId: 1, clientX: 340, clientY: 280 });

    expect(scene).toHaveAttribute("data-stage", "compare");
    expect(scene).toHaveAttribute("data-visible-gap", "none");
    expect(scene).toHaveAttribute("data-wrong-drops", "1");
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.queryByText("缺口检查尺")).not.toBeInTheDocument();
  });

  it("uses the transparent ruler to erase matches, then rejects every non-glowing slot", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "pulse-checker", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-029");
    const ruler = screen.getByRole("button", { name: "透明检查尺" });
    const spare = screen.getByRole("button", { name: "备用墨点" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);

    fireEvent.pointerDown(ruler, { pointerId: 2, clientX: 300, clientY: 145 });
    fireEvent.pointerMove(ruler, { pointerId: 2, clientX: 300, clientY: 280 });
    fireEvent.pointerUp(ruler, { pointerId: 2, clientX: 300, clientY: 280 });
    expect(scene).toHaveAttribute("data-stage", "fill");
    expect(scene).toHaveAttribute("data-ruler-overlap", "true");
    expect(scene).toHaveAttribute("data-visible-gap", "5");
    expect(scene).toHaveAttribute("data-matched-ticks", "hidden");

    fireEvent.pointerDown(spare, { pointerId: 3, clientX: 156, clientY: 352 });
    fireEvent.pointerMove(spare, { pointerId: 3, clientX: 260, clientY: 280 });
    fireEvent.pointerUp(spare, { pointerId: 3, clientX: 260, clientY: 280 });
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(scene).toHaveAttribute("data-wrong-drops", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("accepts a broad second drop into the revealed slot with pointer or keyboard", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pulse-checker", onArm });
    const scene = screen.getByTestId("v2-scene-029");
    const ruler = screen.getByRole("button", { name: "透明检查尺" });
    const spare = screen.getByRole("button", { name: "备用墨点" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);

    ruler.focus();
    fireEvent.keyDown(ruler, { key: "ArrowDown" });
    fireEvent.keyDown(ruler, { key: "ArrowDown" });
    expect(scene).toHaveAttribute("data-stage", "fill");
    spare.focus();
    for (let step = 0; step < 3; step += 1) fireEvent.keyDown(spare, { key: "ArrowRight" });
    fireEvent.keyDown(spare, { key: "ArrowUp" });

    expect(scene).toHaveAttribute("data-gap-index", "5");
    expect(scene).toHaveAttribute("data-drop-tolerance-x", "8");
    expect(scene).toHaveAttribute("data-drop-tolerance-y", "15");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 030", () => {
  it("shows four-beat paper evidence while four ordinary clicks cannot replace a fold", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "broken-measure", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-030");
    const corner = screen.getByRole("button", { name: "加厚的右下折角" });

    expect(scene).toHaveAttribute("data-spatial-model", "thick-corner-reveals-backside-fourth-bar");
    expect(scene).toHaveAttribute("data-measure-cells", "4");
    expect(scene).toHaveAttribute("data-front-bars", "3");
    expect(screen.queryByText("藏在折缝里的第四拍")).not.toBeInTheDocument();

    for (let click = 0; click < 4; click += 1) {
      fireEvent.pointerDown(corner, { pointerId: click + 1, clientX: 400, clientY: 300 });
      fireEvent.pointerUp(corner, { pointerId: click + 1, clientX: 400, clientY: 300 });
    }

    expect(scene).toHaveAttribute("data-clicks", "4");
    expect(scene).toHaveAttribute("data-back-line", "hidden");
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals the backside line during a partial lift but rejects the wrong direction", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "broken-measure", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-030");
    const corner = screen.getByRole("button", { name: "加厚的右下折角" });

    fireEvent.pointerDown(corner, { pointerId: 1, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(corner, { pointerId: 1, clientX: 440, clientY: 335 });
    fireEvent.pointerUp(corner, { pointerId: 1, clientX: 440, clientY: 335 });
    expect(scene).toHaveAttribute("data-wrong-folds", "1");
    expect(scene).toHaveAttribute("data-paper-response", "rebound");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.pointerDown(corner, { pointerId: 2, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(corner, { pointerId: 2, clientX: 370, clientY: 275 });
    expect(scene).toHaveAttribute("data-back-line", "shadow");
    expect(Number(scene.getAttribute("data-fold-progress"))).toBeGreaterThanOrEqual(35);
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.pointerUp(corner, { pointerId: 2, clientX: 370, clientY: 275 });
    expect(onArm).not.toHaveBeenCalled();
  });

  it("joins the fourth line after a broad upward-left fold", () => {
    const onArm = vi.fn();
    renderScene({ slug: "broken-measure", onArm });
    const scene = screen.getByTestId("v2-scene-030");
    const corner = screen.getByRole("button", { name: "加厚的右下折角" });

    fireEvent.pointerDown(corner, { pointerId: 3, clientX: 400, clientY: 300 });
    fireEvent.pointerMove(corner, { pointerId: 3, clientX: 350, clientY: 255 });
    fireEvent.pointerUp(corner, { pointerId: 3, clientX: 350, clientY: 255 });

    expect(scene).toHaveAttribute("data-back-line", "joined");
    expect(scene).toHaveAttribute("data-fold-progress", "100");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers an equivalent Enter fold while arrowing the wrong way only rebounds", () => {
    const onArm = vi.fn();
    renderScene({ slug: "broken-measure", onArm });
    const scene = screen.getByTestId("v2-scene-030");
    const corner = screen.getByRole("button", { name: "加厚的右下折角" });

    corner.focus();
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    expect(scene).toHaveAttribute("data-wrong-folds", "1");
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(corner, { key: "Enter" });

    expect(scene).toHaveAttribute("data-back-line", "joined");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 031", () => {
  const sceneRect = {
    x: 100,
    y: 100,
    top: 100,
    right: 500,
    bottom: 400,
    left: 100,
    width: 400,
    height: 300,
    toJSON: () => undefined,
  } as const;

  it("keeps the oversized circle cropped and ignores real browser resize events", () => {
    const onArm = vi.fn();
    renderScene({ slug: "escape-hatch", onArm });
    const scene = screen.getByTestId("v2-scene-031");

    expect(scene).toHaveAttribute("data-spatial-model", "fixed-circle-inside-resizable-window");
    expect(scene).toHaveAttribute("data-circle-state", "cropped");
    expect(scene).toHaveAttribute("data-window-width", "44");
    fireEvent(window, new Event("resize"));
    expect(scene).toHaveAttribute("data-browser-resizes", "0");
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.queryByText("比窗口更大的圆")).not.toBeInTheDocument();
  });

  it("lets dragging the arc prove it is too large without turning it into a hidden target", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "escape-hatch", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-031");
    const circle = screen.getByRole("button", { name: "被裁切的纸圆" });

    fireEvent.pointerDown(circle, { pointerId: 1, clientX: 250, clientY: 220 });
    fireEvent.pointerMove(circle, { pointerId: 1, clientX: 305, clientY: 220 });
    fireEvent.pointerUp(circle, { pointerId: 1, clientX: 305, clientY: 220 });

    expect(scene).toHaveAttribute("data-circle-drags", "1");
    expect(scene).toHaveAttribute("data-circle-offset", "0");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects narrowing the frame and closes the circle only after a broad frame expansion", () => {
    const onArm = vi.fn();
    renderScene({ slug: "escape-hatch", onArm });
    const scene = screen.getByTestId("v2-scene-031");
    const edge = screen.getByRole("slider", { name: "可调节的右窗框" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);

    fireEvent.pointerDown(edge, { pointerId: 2, clientX: 388, clientY: 220 });
    fireEvent.pointerMove(edge, { pointerId: 2, clientX: 350, clientY: 220 });
    fireEvent.pointerUp(edge, { pointerId: 2, clientX: 350, clientY: 220 });
    expect(scene).toHaveAttribute("data-frame-misses", "1");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.pointerDown(edge, { pointerId: 3, clientX: 388, clientY: 220 });
    fireEvent.pointerMove(edge, { pointerId: 3, clientX: 440, clientY: 220 });
    fireEvent.pointerUp(edge, { pointerId: 3, clientX: 440, clientY: 220 });
    expect(Number(scene.getAttribute("data-window-width"))).toBeGreaterThanOrEqual(68);
    expect(scene).toHaveAttribute("data-circle-state", "closed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports the same frame resize with broad keyboard steps", () => {
    const onArm = vi.fn();
    renderScene({ slug: "escape-hatch", onArm });
    const scene = screen.getByTestId("v2-scene-031");
    const edge = screen.getByRole("slider", { name: "可调节的右窗框" });

    edge.focus();
    fireEvent.keyDown(edge, { key: "ArrowLeft" });
    expect(scene).toHaveAttribute("data-frame-misses", "1");
    expect(onArm).not.toHaveBeenCalled();
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(edge, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-circle-state", "closed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 032", () => {
  const sceneRect = {
    x: 100,
    y: 100,
    top: 100,
    right: 500,
    bottom: 400,
    left: 100,
    width: 400,
    height: 300,
    toJSON: () => undefined,
  } as const;

  it("presents two title halves on one crease without relying on device orientation", () => {
    const onArm = vi.fn();
    renderScene({ slug: "landscape-nudge", onArm });
    const scene = screen.getByTestId("v2-scene-032");

    expect(scene).toHaveAttribute("data-spatial-model", "two-title-halves-one-hinge");
    expect(scene).toHaveAttribute("data-title-halves", "2");
    expect(scene).toHaveAttribute("data-strip-angle", "90");
    expect(scene).toHaveAttribute("data-baseline", "split");
    fireEvent(window, new Event("orientationchange"));
    expect(scene).toHaveAttribute("data-device-orientations", "0");
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.queryByText("横过来的标题")).not.toBeInTheDocument();
  });

  it("reveals the hinge through movement while ordinary clicks remain inert", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "landscape-nudge", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-032");
    const strip = screen.getByRole("button", { name: "竖向的后半标题纸条" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);

    for (let click = 0; click < 4; click += 1) fireEvent.click(strip);
    expect(scene).toHaveAttribute("data-clicks", "4");
    expect(scene).toHaveAttribute("data-hinge", "concealed");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.pointerDown(strip, { pointerId: 1, clientX: 292, clientY: 350 });
    fireEvent.pointerMove(strip, { pointerId: 1, clientX: 330, clientY: 335 });
    expect(scene).toHaveAttribute("data-hinge", "revealed");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects a diagonal title but joins both halves inside a broad horizontal band", () => {
    const onArm = vi.fn();
    renderScene({ slug: "landscape-nudge", onArm });
    const scene = screen.getByTestId("v2-scene-032");
    const strip = screen.getByRole("button", { name: "竖向的后半标题纸条" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);

    fireEvent.pointerDown(strip, { pointerId: 2, clientX: 292, clientY: 350 });
    fireEvent.pointerMove(strip, { pointerId: 2, clientX: 362, clientY: 302 });
    expect(scene).toHaveAttribute("data-baseline", "approaching");
    fireEvent.pointerUp(strip, { pointerId: 2, clientX: 362, clientY: 302 });
    expect(scene).toHaveAttribute("data-wrong-rotations", "1");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.pointerDown(strip, { pointerId: 3, clientX: 292, clientY: 350 });
    fireEvent.pointerMove(strip, { pointerId: 3, clientX: 385, clientY: 262 });
    fireEvent.pointerUp(strip, { pointerId: 3, clientX: 385, clientY: 262 });
    expect(scene).toHaveAttribute("data-strip-angle", "0");
    expect(scene).toHaveAttribute("data-baseline", "joined");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers a direct Enter hinge flip without exposing an answer label", () => {
    const onArm = vi.fn();
    renderScene({ slug: "landscape-nudge", onArm });
    const scene = screen.getByTestId("v2-scene-032");
    const strip = screen.getByRole("button", { name: "竖向的后半标题纸条" });

    strip.focus();
    fireEvent.keyDown(strip, { key: "Enter" });
    expect(scene).toHaveAttribute("data-strip-angle", "0");
    expect(onArm).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("旋转到横向")).not.toBeInTheDocument();
  });
});

describe("V2 production puzzle scene 033", () => {
  it("starts with a level-looking frame whose fixed plumb line visibly misses the center notch", () => {
    const onArm = vi.fn();
    renderScene({ slug: "window-tilt", onArm });
    const scene = screen.getByTestId("v2-scene-033");

    expect(scene).toHaveAttribute("data-spatial-model", "misleading-frame-fixed-plumb-line");
    expect(scene).toHaveAttribute("data-paper-angle", "0");
    expect(scene).toHaveAttribute("data-target-angle", "-12");
    expect(scene).toHaveAttribute("data-tolerance-degrees", "6");
    expect(scene).toHaveAttribute("data-plumb-offset", "24");
    expect(scene).toHaveAttribute("data-texture-slope", "8");
    fireEvent(window, new Event("deviceorientation"));
    expect(scene).toHaveAttribute("data-direction-events", "0");
    expect(onArm).not.toHaveBeenCalled();
    expect(screen.queryByText("窗里的铅垂线")).not.toBeInTheDocument();
  });

  it("keeps a click inert and makes the bead drift farther when the paper turns the wrong way", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "window-tilt", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-033");
    const paper = screen.getByRole("button", { name: "带窗框的整张场景纸" });

    fireEvent.pointerDown(paper, { pointerId: 1, clientX: 300, clientY: 220 });
    fireEvent.pointerUp(paper, { pointerId: 1, clientX: 300, clientY: 220 });
    expect(scene).toHaveAttribute("data-clicks", "1");
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.pointerDown(paper, { pointerId: 2, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(paper, { pointerId: 2, clientX: 380, clientY: 220 });
    fireEvent.pointerUp(paper, { pointerId: 2, clientX: 380, clientY: 220 });
    expect(scene).toHaveAttribute("data-paper-angle", "10");
    expect(Number(scene.getAttribute("data-plumb-offset"))).toBeGreaterThan(24);
    expect(scene).toHaveAttribute("data-wrong-rotations", "1");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("snaps when a broad leftward rotation brings the fixed line through the notch", () => {
    const onArm = vi.fn();
    renderScene({ slug: "window-tilt", onArm });
    const scene = screen.getByTestId("v2-scene-033");
    const paper = screen.getByRole("button", { name: "带窗框的整张场景纸" });

    fireEvent.pointerDown(paper, { pointerId: 3, clientX: 330, clientY: 220 });
    fireEvent.pointerMove(paper, { pointerId: 3, clientX: 238, clientY: 220 });
    fireEvent.pointerUp(paper, { pointerId: 3, clientX: 238, clientY: 220 });

    expect(scene).toHaveAttribute("data-paper-angle", "-12");
    expect(scene).toHaveAttribute("data-plumb-offset", "0");
    expect(scene).toHaveAttribute("data-level-state", "true");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("provides the same six-degree target band through discrete keyboard rotation", () => {
    const onArm = vi.fn();
    renderScene({ slug: "window-tilt", onArm });
    const scene = screen.getByTestId("v2-scene-033");
    const paper = screen.getByRole("button", { name: "带窗框的整张场景纸" });

    paper.focus();
    fireEvent.keyDown(paper, { key: "ArrowRight" });
    expect(scene).toHaveAttribute("data-level-state", "worse");
    expect(onArm).not.toHaveBeenCalled();
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(paper, { key: "ArrowLeft" });

    expect(scene).toHaveAttribute("data-paper-angle", "-12");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 034", () => {
  it("renders two incomplete translucent landscapes with one shared tear signature", () => {
    const onArm = vi.fn();
    renderScene({ slug: "double-horizon", onArm });
    const scene = screen.getByTestId("v2-scene-034");

    expect(scene).toHaveAttribute("data-spatial-model", "two-torn-landscapes-one-horizon");
    expect(scene).toHaveAttribute("data-tears", "concealed");
    expect(scene).toHaveAttribute("data-reflection-angle", "90");
    expect(scene).toHaveAttribute("data-overlap", "separate");
    expect(scene).toHaveAttribute("data-shared-line", "false");
    expect(scene).toHaveAttribute("data-position-tolerance", "10");
    expect(scene).toHaveAttribute("data-angle-tolerance", "12");
    expect(screen.getAllByTestId("horizon-tear-034")).toHaveLength(2);
    expect(screen.queryByText("互相借景")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals the matching tear on the other paper after a meaningful move", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "double-horizon", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-034");
    const sky = screen.getByRole("button", { name: "移动天空纸景" });

    fireEvent.pointerDown(sky, { pointerId: 1, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(sky, { pointerId: 1, clientX: 326, clientY: 220 });
    fireEvent.pointerUp(sky, { pointerId: 1, clientX: 326, clientY: 220 });

    expect(scene).toHaveAttribute("data-tears", "revealed");
    expect(scene).toHaveAttribute("data-sky-x", "32");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects a coincidental overlap while the reflected landscape is still sideways", () => {
    const onArm = vi.fn();
    renderScene({ slug: "double-horizon", onArm });
    const scene = screen.getByTestId("v2-scene-034");
    const reflection = screen.getByRole("button", { name: "移动倒影纸景" });

    fireEvent.pointerDown(reflection, { pointerId: 2, clientX: 300, clientY: 260 });
    fireEvent.pointerMove(reflection, { pointerId: 2, clientX: 104, clientY: 140 });
    fireEvent.pointerUp(reflection, { pointerId: 2, clientX: 104, clientY: 140 });

    expect(scene).toHaveAttribute("data-overlap", "overlapping");
    expect(scene).toHaveAttribute("data-reflection-angle", "90");
    expect(scene).toHaveAttribute("data-shared-line", "false");
    expect(scene).toHaveAttribute("data-wrong-overlaps", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("snaps the two papers only after the reflected landscape is turned and broadly aligned", () => {
    const onArm = vi.fn();
    renderScene({ slug: "double-horizon", onArm });
    const scene = screen.getByTestId("v2-scene-034");
    const pivot = screen.getByRole("button", { name: "倒影纸景的撕口转轴" });
    const reflection = screen.getByRole("button", { name: "移动倒影纸景" });

    fireEvent.pointerDown(pivot, { pointerId: 3, clientX: 400, clientY: 220 });
    fireEvent.pointerMove(pivot, { pointerId: 3, clientX: 310, clientY: 220 });
    fireEvent.pointerUp(pivot, { pointerId: 3, clientX: 310, clientY: 220 });
    expect(scene).toHaveAttribute("data-reflection-angle", "0");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.pointerDown(reflection, { pointerId: 4, clientX: 300, clientY: 260 });
    fireEvent.pointerMove(reflection, { pointerId: 4, clientX: 104, clientY: 140 });
    fireEvent.pointerUp(reflection, { pointerId: 4, clientX: 104, clientY: 140 });

    expect(scene).toHaveAttribute("data-reflection-angle", "0");
    expect(scene).toHaveAttribute("data-shared-line", "true");
    expect(scene).toHaveAttribute("data-sun-relation", "mirrored");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("provides a stepwise keyboard flip and placement route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "double-horizon", onArm });
    const scene = screen.getByTestId("v2-scene-034");
    const reflection = screen.getByRole("button", { name: "移动倒影纸景" });

    reflection.focus();
    fireEvent.keyDown(reflection, { key: "Enter" });
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(reflection, { key: "ArrowLeft" });
    for (let step = 0; step < 3; step += 1) fireEvent.keyDown(reflection, { key: "ArrowUp" });

    expect(scene).toHaveAttribute("data-reflection-angle", "0");
    expect(scene).toHaveAttribute("data-shared-line", "true");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 035", () => {
  it("starts as one plausible sky while keeping three close depth references distinct", () => {
    const onArm = vi.fn();
    renderScene({ slug: "horizon-shift", onArm });
    const scene = screen.getByTestId("v2-scene-035");

    expect(scene).toHaveAttribute("data-spatial-model", "full-sky-three-depths");
    expect(scene).toHaveAttribute("data-parallax", "concealed");
    expect(scene).toHaveAttribute("data-view-x", "0");
    expect(scene).toHaveAttribute("data-view-y", "0");
    expect(scene).toHaveAttribute("data-front-height", "45");
    expect(scene).toHaveAttribute("data-back-height", "52");
    expect(scene).toHaveAttribute("data-sun-height", "48");
    expect(scene).toHaveAttribute("data-height-tolerance", "2");
    expect(scene).toHaveAttribute("data-reflection-segments", "1");
    fireEvent(window, new Event("deviceorientation"));
    expect(scene).toHaveAttribute("data-direction-events", "0");
    expect(screen.queryByText("地平线偏移")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("uses a twenty-pixel sideways view change to expose three different parallax speeds", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "horizon-shift", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-035");
    const sky = screen.getByRole("button", { name: "拖动天空视角" });

    fireEvent.click(sky);
    expect(scene).toHaveAttribute("data-parallax", "concealed");
    fireEvent.pointerDown(sky, { pointerId: 1, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(sky, { pointerId: 1, clientX: 324, clientY: 220 });
    fireEvent.pointerUp(sky, { pointerId: 1, clientX: 324, clientY: 220 });

    expect(scene).toHaveAttribute("data-parallax", "revealed");
    expect(scene).toHaveAttribute("data-view-x", "24");
    expect(scene).toHaveAttribute("data-front-x", "13");
    expect(scene).toHaveAttribute("data-back-x", "5");
    expect(scene).toHaveAttribute("data-sun-x", "20");
    expect(scene).toHaveAttribute("data-reflection-segments", "2");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows an incomplete reflection when only a pair enters the two-percent height band", () => {
    const onArm = vi.fn();
    renderScene({ slug: "horizon-shift", onArm });
    const scene = screen.getByTestId("v2-scene-035");
    const sky = screen.getByRole("button", { name: "拖动天空视角" });

    fireEvent.pointerDown(sky, { pointerId: 2, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(sky, { pointerId: 2, clientX: 324, clientY: 220 });
    fireEvent.pointerUp(sky, { pointerId: 2, clientX: 324, clientY: 220 });
    fireEvent.pointerDown(sky, { pointerId: 3, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(sky, { pointerId: 3, clientX: 300, clientY: 268 });
    fireEvent.pointerUp(sky, { pointerId: 3, clientX: 300, clientY: 268 });

    expect(scene).toHaveAttribute("data-view-y", "12");
    expect(scene).toHaveAttribute("data-height-alignment", "two-only");
    expect(scene).toHaveAttribute("data-reflection-state", "incomplete");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("snaps only when the sun and both horizons share one broad height zone", () => {
    const onArm = vi.fn();
    renderScene({ slug: "horizon-shift", onArm });
    const scene = screen.getByTestId("v2-scene-035");
    const sky = screen.getByRole("button", { name: "拖动天空视角" });

    fireEvent.pointerDown(sky, { pointerId: 4, clientX: 300, clientY: 220 });
    fireEvent.pointerMove(sky, { pointerId: 4, clientX: 324, clientY: 300 });
    fireEvent.pointerUp(sky, { pointerId: 4, clientX: 324, clientY: 300 });

    expect(scene).toHaveAttribute("data-view-y", "20");
    expect(scene).toHaveAttribute("data-front-height", "51");
    expect(scene).toHaveAttribute("data-back-height", "51");
    expect(scene).toHaveAttribute("data-sun-height", "51");
    expect(scene).toHaveAttribute("data-height-alignment", "all-three");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps a permission-free keyboard route with discrete viewpoint steps", () => {
    const onArm = vi.fn();
    renderScene({ slug: "horizon-shift", onArm });
    const scene = screen.getByTestId("v2-scene-035");
    const sky = screen.getByRole("button", { name: "拖动天空视角" });

    sky.focus();
    fireEvent.keyDown(sky, { key: "ArrowRight" });
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(sky, { key: "ArrowDown" });

    expect(scene).toHaveAttribute("data-parallax", "revealed");
    expect(scene).toHaveAttribute("data-view-y", "20");
    expect(scene).toHaveAttribute("data-height-alignment", "all-three");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 036", () => {
  const scanBand = (tool: HTMLElement, y: number, pointerId: number) => {
    fireEvent.pointerDown(tool, { pointerId, clientX: 180, clientY: 20 });
    fireEvent.pointerMove(tool, { pointerId, clientX: 180, clientY: y });
    fireEvent.pointerUp(tool, { pointerId, clientX: 180, clientY: y });
  };

  const scanAllBands = (scene: HTMLElement, tool: HTMLElement) => {
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 360, bottom: 280, left: 0, width: 360, height: 280,
      toJSON: () => undefined,
    });
    scanBand(tool, 62, 1);
    scanBand(tool, 140, 2);
    scanBand(tool, 218, 3);
  };

  it("starts with three equally plausible paper bands and an uncommitted measuring tool", () => {
    const onArm = vi.fn();
    renderScene({ slug: "portable-horizon", onArm });
    const scene = screen.getByTestId("v2-scene-036");

    expect(scene).toHaveAttribute("data-spatial-model", "three-bands-portable-level");
    expect(scene).toHaveAttribute("data-instrument-reading", "air");
    expect(scene).toHaveAttribute("data-tested-count", "0");
    expect(scene).toHaveAttribute("data-evidence", "none");
    expect(scene).toHaveAttribute("data-connected", "false");
    expect(screen.getAllByRole("button", { name: /纸带/ })).toHaveLength(3);
    expect(screen.queryByText("可以搬走的水平线")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("changes both bubble and shadow evidence while one level crosses all three bands", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "portable-horizon", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-036");
    const tool = screen.getByRole("button", { name: /纸质水平仪/ });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 360, bottom: 280, left: 0, width: 360, height: 280,
      toJSON: () => undefined,
    });

    scanBand(tool, 62, 4);
    expect(scene).toHaveAttribute("data-instrument-reading", "left-low");
    expect(scene).toHaveAttribute("data-bubble-offset", "-16");
    expect(scene).toHaveAttribute("data-shadow-left", "36");
    expect(scene).toHaveAttribute("data-shadow-right", "20");

    scanBand(tool, 140, 5);
    expect(scene).toHaveAttribute("data-instrument-reading", "right-low");
    expect(scene).toHaveAttribute("data-bubble-offset", "14");
    expect(scene).toHaveAttribute("data-shadow-left", "18");
    expect(scene).toHaveAttribute("data-shadow-right", "35");

    scanBand(tool, 218, 6);
    expect(scene).toHaveAttribute("data-instrument-reading", "centered");
    expect(scene).toHaveAttribute("data-bubble-offset", "0");
    expect(scene).toHaveAttribute("data-shadow-left", "28");
    expect(scene).toHaveAttribute("data-shadow-right", "28");
    expect(scene).toHaveAttribute("data-tested-count", "3");
    expect(scene).toHaveAttribute("data-evidence", "double");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects a lucky band drop before the common measuring tool has compared every place", () => {
    const onArm = vi.fn();
    renderScene({ slug: "portable-horizon", onArm });
    const scene = screen.getByTestId("v2-scene-036");
    const target = screen.getByTestId("portable-horizon-target");
    const correctBand = screen.getByRole("button", { name: "纸带 3" });
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 300, y: 110, top: 110, right: 360, bottom: 170, left: 300, width: 60, height: 60,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(correctBand, { pointerId: 7, clientX: 80, clientY: 220 });
    fireEvent.pointerMove(correctBand, { pointerId: 7, clientX: 330, clientY: 140 });
    fireEvent.pointerUp(correctBand, { pointerId: 7, clientX: 330, clientY: 140 });

    expect(scene).toHaveAttribute("data-wrong-drops", "1");
    expect(scene).toHaveAttribute("data-connected", "false");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects a measured false band but joins the verified double-evidence band to the timer baseline", () => {
    const onArm = vi.fn();
    renderScene({ slug: "portable-horizon", onArm });
    const scene = screen.getByTestId("v2-scene-036");
    const tool = screen.getByRole("button", { name: /纸质水平仪/ });
    const target = screen.getByTestId("portable-horizon-target");
    const wrongBand = screen.getByRole("button", { name: "纸带 1" });
    const correctBand = screen.getByRole("button", { name: "纸带 3" });
    scanAllBands(scene, tool);
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      x: 300, y: 110, top: 110, right: 360, bottom: 170, left: 300, width: 60, height: 60,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(wrongBand, { pointerId: 8, clientX: 80, clientY: 62 });
    fireEvent.pointerMove(wrongBand, { pointerId: 8, clientX: 330, clientY: 140 });
    fireEvent.pointerUp(wrongBand, { pointerId: 8, clientX: 330, clientY: 140 });
    expect(scene).toHaveAttribute("data-wrong-drops", "1");
    expect(onArm).not.toHaveBeenCalled();

    fireEvent.pointerDown(correctBand, { pointerId: 9, clientX: 80, clientY: 218 });
    fireEvent.pointerMove(correctBand, { pointerId: 9, clientX: 330, clientY: 140 });
    fireEvent.pointerUp(correctBand, { pointerId: 9, clientX: 330, clientY: 140 });
    expect(scene).toHaveAttribute("data-connected", "true");
    expect(scene).toHaveAttribute("data-joined-band", "verified");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps a two-action keyboard route: compare with the level, then move the evidenced band", () => {
    const onArm = vi.fn();
    renderScene({ slug: "portable-horizon", onArm });
    const scene = screen.getByTestId("v2-scene-036");
    const tool = screen.getByRole("button", { name: /纸质水平仪/ });
    const correctBand = screen.getByRole("button", { name: "纸带 3" });

    tool.focus();
    fireEvent.keyDown(tool, { key: "ArrowDown" });
    fireEvent.keyDown(tool, { key: "ArrowDown" });
    fireEvent.keyDown(tool, { key: "ArrowDown" });
    expect(scene).toHaveAttribute("data-tested-count", "3");
    expect(scene).toHaveAttribute("data-evidence", "double");
    expect(onArm).not.toHaveBeenCalled();

    correctBand.focus();
    fireEvent.keyDown(correctBand, { key: "Enter" });
    expect(scene).toHaveAttribute("data-connected", "true");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 037", () => {
  it("starts as two separate round windows that each reveal only half of one clock", () => {
    const onArm = vi.fn();
    renderScene({ slug: "parallax-window", onArm });
    const scene = screen.getByTestId("v2-scene-037");

    expect(scene).toHaveAttribute("data-spatial-model", "two-depth-windows-one-clock");
    expect(scene).toHaveAttribute("data-parallax", "concealed");
    expect(scene).toHaveAttribute("data-window-distance", "175");
    expect(scene).toHaveAttribute("data-overlap", "separate");
    expect(scene).toHaveAttribute("data-frame-pattern", "broken");
    expect(screen.getByRole("button", { name: "钟针纸窗" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "钟圈纸窗" })).toBeInTheDocument();
    expect(screen.queryByText("两个窗口的一只钟")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals unequal foreground and background travel only after a real window move", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "parallax-window", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-037");
    const hands = screen.getByRole("button", { name: "钟针纸窗" });

    fireEvent.click(hands);
    expect(scene).toHaveAttribute("data-parallax", "concealed");
    fireEvent.pointerDown(hands, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(hands, { pointerId: 1, clientX: 130, clientY: 120 });
    fireEvent.pointerUp(hands, { pointerId: 1, clientX: 130, clientY: 120 });

    expect(scene).toHaveAttribute("data-parallax", "revealed");
    expect(scene).toHaveAttribute("data-hands-offset", "30,20");
    expect(scene).toHaveAttribute("data-hands-depth-offset", "-5,-3");
    expect(scene).toHaveAttribute("data-ring-depth-offset", "0,0");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not accept two circular edges merely touching", () => {
    const onArm = vi.fn();
    renderScene({ slug: "parallax-window", onArm });
    const scene = screen.getByTestId("v2-scene-037");
    const hands = screen.getByRole("button", { name: "钟针纸窗" });

    fireEvent.pointerDown(hands, { pointerId: 2, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(hands, { pointerId: 2, clientX: 160, clientY: 100 });
    fireEvent.pointerUp(hands, { pointerId: 2, clientX: 160, clientY: 100 });

    expect(scene).toHaveAttribute("data-overlap", "edge-touching");
    expect(scene).toHaveAttribute("data-frame-pattern", "interrupted");
    expect(scene).toHaveAttribute("data-wrong-drops", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("snaps when the hand axle and clock-ring center enter the thirty-six-pixel zone", () => {
    const onArm = vi.fn();
    renderScene({ slug: "parallax-window", onArm });
    const scene = screen.getByTestId("v2-scene-037");
    const hands = screen.getByRole("button", { name: "钟针纸窗" });

    fireEvent.pointerDown(hands, { pointerId: 3, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(hands, { pointerId: 3, clientX: 250, clientY: 140 });
    fireEvent.pointerUp(hands, { pointerId: 3, clientX: 250, clientY: 140 });

    expect(scene).toHaveAttribute("data-window-distance", "0");
    expect(scene).toHaveAttribute("data-overlap", "aligned");
    expect(scene).toHaveAttribute("data-frame-pattern", "continuous");
    expect(scene).toHaveAttribute("data-snap-zone", "36");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("lets either depth window provide the final center relation", () => {
    const onArm = vi.fn();
    renderScene({ slug: "parallax-window", onArm });
    const scene = screen.getByTestId("v2-scene-037");
    const ring = screen.getByRole("button", { name: "钟圈纸窗" });

    fireEvent.pointerDown(ring, { pointerId: 4, clientX: 270, clientY: 140 });
    fireEvent.pointerMove(ring, { pointerId: 4, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(ring, { pointerId: 4, clientX: 100, clientY: 100 });

    expect(scene).toHaveAttribute("data-overlap", "aligned");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("provides a broad direction-key route without requiring pixel placement", () => {
    const onArm = vi.fn();
    renderScene({ slug: "parallax-window", onArm });
    const scene = screen.getByTestId("v2-scene-037");
    const hands = screen.getByRole("button", { name: "钟针纸窗" });

    hands.focus();
    for (let step = 0; step < 7; step += 1) fireEvent.keyDown(hands, { key: "ArrowRight" });
    fireEvent.keyDown(hands, { key: "ArrowDown" });
    fireEvent.keyDown(hands, { key: "ArrowDown" });

    expect(scene).toHaveAttribute("data-overlap", "aligned");
    expect(scene).toHaveAttribute("data-frame-pattern", "continuous");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 038", () => {
  it("places matching torn ticket halves at opposite page edges with no central socket", () => {
    const onArm = vi.fn();
    renderScene({ slug: "return-ticket", onArm });
    const scene = screen.getByTestId("v2-scene-038");

    expect(scene).toHaveAttribute("data-spatial-model", "continuous-opposite-page-edges");
    expect(scene).toHaveAttribute("data-edge-state", "split");
    expect(scene).toHaveAttribute("data-progress", "0");
    expect(scene).toHaveAttribute("data-navigation", "local-only");
    expect(scene).toHaveAttribute("data-history-events", "0");
    expect(screen.getByTestId("return-ticket-left-half")).toBeInTheDocument();
    expect(screen.getByTestId("return-ticket-right-half")).toBeInTheDocument();
    expect(screen.queryByText("穿过页面的回程票")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects pulling the left half toward the visible center", () => {
    const onArm = vi.fn();
    renderScene({ slug: "return-ticket", onArm });
    const scene = screen.getByTestId("v2-scene-038");
    const ticket = screen.getByRole("button", { name: "左侧回程票纸片" });

    fireEvent.click(ticket);
    expect(scene).toHaveAttribute("data-center-attempts", "0");
    fireEvent.pointerDown(ticket, { pointerId: 1, clientX: 40, clientY: 300 });
    fireEvent.pointerMove(ticket, { pointerId: 1, clientX: 100, clientY: 300 });
    fireEvent.pointerUp(ticket, { pointerId: 1, clientX: 100, clientY: 300 });

    expect(scene).toHaveAttribute("data-route", "center-wrong");
    expect(scene).toHaveAttribute("data-center-attempts", "1");
    expect(scene).toHaveAttribute("data-progress", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("continues the same fibers at the right edge while the left half exits", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "return-ticket", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-038");
    const ticket = screen.getByRole("button", { name: "左侧回程票纸片" });

    fireEvent.pointerDown(ticket, { pointerId: 2, clientX: 80, clientY: 300 });
    fireEvent.pointerMove(ticket, { pointerId: 2, clientX: 60, clientY: 300 });
    fireEvent.pointerUp(ticket, { pointerId: 2, clientX: 60, clientY: 300 });

    expect(scene).toHaveAttribute("data-progress", "70");
    expect(scene).toHaveAttribute("data-left-exit", "70");
    expect(scene).toHaveAttribute("data-right-entry", "70");
    expect(scene).toHaveAttribute("data-edge-state", "wrapped");
    expect(scene).toHaveAttribute("data-fiber-continuity", "continuous");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("joins both torn halves only after the wrapped copy travels far enough on the right", () => {
    const onArm = vi.fn();
    renderScene({ slug: "return-ticket", onArm });
    const scene = screen.getByTestId("v2-scene-038");
    const ticket = screen.getByRole("button", { name: "左侧回程票纸片" });

    fireEvent.pointerDown(ticket, { pointerId: 3, clientX: 180, clientY: 300 });
    fireEvent.pointerMove(ticket, { pointerId: 3, clientX: 30, clientY: 300 });
    fireEvent.pointerUp(ticket, { pointerId: 3, clientX: 30, clientY: 300 });

    expect(scene).toHaveAttribute("data-progress", "140");
    expect(scene).toHaveAttribute("data-edge-state", "joined");
    expect(scene).toHaveAttribute("data-fiber-continuity", "joined");
    expect(scene).toHaveAttribute("data-right-seam", "closed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("never invokes browser history when page-edge events occur", () => {
    const onArm = vi.fn();
    renderScene({ slug: "return-ticket", onArm });
    const scene = screen.getByTestId("v2-scene-038");

    fireEvent(window, new PopStateEvent("popstate"));
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(scene).toHaveAttribute("data-history-events", "0");
    expect(scene).toHaveAttribute("data-progress", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps the edge loop available through broad direction-key steps", () => {
    const onArm = vi.fn();
    renderScene({ slug: "return-ticket", onArm });
    const scene = screen.getByTestId("v2-scene-038");
    const ticket = screen.getByRole("button", { name: "左侧回程票纸片" });

    ticket.focus();
    fireEvent.keyDown(ticket, { key: "ArrowRight" });
    expect(scene).toHaveAttribute("data-center-attempts", "1");
    for (let step = 0; step < 5; step += 1) fireEvent.keyDown(ticket, { key: "ArrowLeft" });

    expect(scene).toHaveAttribute("data-progress", "140");
    expect(scene).toHaveAttribute("data-edge-state", "joined");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 039", () => {
  const tabRect = (left: number) => ({
    x: left, y: 100, top: 100, right: left + 60, bottom: 180, left, width: 60, height: 80,
    toJSON: () => undefined,
  });

  const mockTabs = () => {
    vi.spyOn(screen.getByTestId("doubleback-tab-1"), "getBoundingClientRect").mockReturnValue(tabRect(100));
    vi.spyOn(screen.getByTestId("doubleback-tab-2"), "getBoundingClientRect").mockReturnValue(tabRect(240));
  };

  const threadAt = (endpoint: HTMLElement, pointerId: number, clientX: number, clientY: number) => {
    fireEvent.pointerDown(endpoint, { pointerId, clientX: 200, clientY: 240 });
    fireEvent.pointerMove(endpoint, { pointerId, clientX, clientY });
    fireEvent.pointerUp(endpoint, { pointerId, clientX, clientY });
  };

  it("shows one ribbon crossing the first tab in front and disappearing behind the second", () => {
    const onArm = vi.fn();
    renderScene({ slug: "tab-doubleback", onArm });
    const scene = screen.getByTestId("v2-scene-039");

    expect(scene).toHaveAttribute("data-spatial-model", "two-tabs-alternating-depth");
    expect(scene).toHaveAttribute("data-initial-first-layer", "front");
    expect(scene).toHaveAttribute("data-initial-second-layer", "back");
    expect(scene).toHaveAttribute("data-thread-stage", "0");
    expect(scene).toHaveAttribute("data-threaded-depths", "none");
    expect(screen.getAllByTestId(/doubleback-tab-/)).toHaveLength(2);
    expect(screen.queryByText("藏在页签后的丝带")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not turn clicks or a fixed horizontal slide into a depth decision", () => {
    const onArm = vi.fn();
    renderScene({ slug: "tab-doubleback", onArm });
    const scene = screen.getByTestId("v2-scene-039");
    const endpoint = screen.getByRole("button", { name: "丝带活动端" });
    mockTabs();

    fireEvent.click(endpoint);
    fireEvent.pointerDown(endpoint, { pointerId: 1, clientX: 200, clientY: 140 });
    fireEvent.pointerMove(endpoint, { pointerId: 1, clientX: 130, clientY: 140 });
    fireEvent.pointerUp(endpoint, { pointerId: 1, clientX: 130, clientY: 140 });

    expect(scene).toHaveAttribute("data-thread-stage", "0");
    expect(scene).toHaveAttribute("data-last-feedback", "rebounded");
    expect(scene).toHaveAttribute("data-wrong-layers", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps the first fold only when the end follows the lower back-side imprint", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "tab-doubleback", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-039");
    const endpoint = screen.getByRole("button", { name: "丝带活动端" });
    mockTabs();

    threadAt(endpoint, 2, 130, 165);

    expect(scene).toHaveAttribute("data-thread-stage", "1");
    expect(scene).toHaveAttribute("data-threaded-depths", "back");
    expect(scene).toHaveAttribute("data-last-feedback", "fold-kept");
    expect(scene).toHaveAttribute("data-active-layer", "back");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rebounds from the second tab when the same back layer is repeated", () => {
    const onArm = vi.fn();
    renderScene({ slug: "tab-doubleback", onArm });
    const scene = screen.getByTestId("v2-scene-039");
    const endpoint = screen.getByRole("button", { name: "丝带活动端" });
    mockTabs();

    threadAt(endpoint, 3, 130, 165);
    threadAt(endpoint, 4, 270, 165);

    expect(scene).toHaveAttribute("data-thread-stage", "1");
    expect(scene).toHaveAttribute("data-threaded-depths", "back");
    expect(scene).toHaveAttribute("data-last-feedback", "rebounded");
    expect(scene).toHaveAttribute("data-wrong-layers", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("closes the ribbon only after the second upper front-side imprint", () => {
    const onArm = vi.fn();
    renderScene({ slug: "tab-doubleback", onArm });
    const scene = screen.getByTestId("v2-scene-039");
    const endpoint = screen.getByRole("button", { name: "丝带活动端" });
    mockTabs();

    threadAt(endpoint, 5, 130, 165);
    threadAt(endpoint, 6, 270, 115);

    expect(scene).toHaveAttribute("data-thread-stage", "2");
    expect(scene).toHaveAttribute("data-threaded-depths", "back-front");
    expect(scene).toHaveAttribute("data-last-feedback", "fold-kept");
    expect(scene).toHaveAttribute("data-ribbon-loop", "closed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("uses keyboard layer choices at each tab instead of a memorized slide distance", () => {
    const onArm = vi.fn();
    renderScene({ slug: "tab-doubleback", onArm });
    const scene = screen.getByTestId("v2-scene-039");
    const endpoint = screen.getByRole("button", { name: "丝带活动端" });

    endpoint.focus();
    fireEvent.keyDown(endpoint, { key: "Enter" });
    expect(scene).toHaveAttribute("data-wrong-layers", "1");
    fireEvent.keyDown(endpoint, { key: "ArrowDown" });
    fireEvent.keyDown(endpoint, { key: "Enter" });
    expect(scene).toHaveAttribute("data-thread-stage", "1");
    fireEvent.keyDown(endpoint, { key: "Enter" });
    expect(scene).toHaveAttribute("data-wrong-layers", "2");
    fireEvent.keyDown(endpoint, { key: "ArrowUp" });
    fireEvent.keyDown(endpoint, { key: "Enter" });

    expect(scene).toHaveAttribute("data-threaded-depths", "back-front");
    expect(scene).toHaveAttribute("data-ribbon-loop", "closed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 040", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const revealTicket = (ticket: HTMLElement, pointerId = 1) => {
    fireEvent.pointerDown(ticket, { pointerId, clientX: 300, clientY: 180 });
    fireEvent.pointerMove(ticket, { pointerId, clientX: 336, clientY: 180 });
    fireEvent.pointerUp(ticket, { pointerId, clientX: 336, clientY: 180 });
  };

  it("starts with one incomplete edge ticket and ignores the initial visible state", () => {
    const onArm = vi.fn();
    renderScene({ slug: "tab-return", onArm });
    const scene = screen.getByTestId("v2-scene-040");

    expect(scene).toHaveAttribute("data-spatial-model", "edge-ticket-cover-return");
    expect(scene).toHaveAttribute("data-ticket-cutout", "concealed");
    expect(scene).toHaveAttribute("data-return-state", "partial");
    expect(scene).toHaveAttribute("data-hidden-cycle", "idle");
    expect(scene).toHaveAttribute("data-initial-visibility-count", "0");
    expect(screen.getByRole("button", { name: "半张回转纸票" })).toBeInTheDocument();
    expect(screen.queryByText("标签返回")).not.toBeInTheDocument();

    fireEvent(document, new Event("visibilitychange"));
    expect(scene).toHaveAttribute("data-hidden-cycle", "idle");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("lets a direct grab or inward pull dodge outward without revealing the cutout", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "tab-return", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-040");
    const ticket = screen.getByRole("button", { name: "半张回转纸票" });

    fireEvent.click(ticket);
    fireEvent.pointerDown(ticket, { pointerId: 2, clientX: 300, clientY: 180 });
    fireEvent.pointerMove(ticket, { pointerId: 2, clientX: 250, clientY: 180 });
    fireEvent.pointerUp(ticket, { pointerId: 2, clientX: 250, clientY: 180 });

    expect(scene).toHaveAttribute("data-ticket-cutout", "concealed");
    expect(scene).toHaveAttribute("data-ticket-feedback", "dodged");
    expect(scene).toHaveAttribute("data-ticket-dodges", "1");
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals the tab-shaped cutout after an outward slide instead of a click", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "tab-return", onDiscover });
    const scene = screen.getByTestId("v2-scene-040");
    const ticket = screen.getByRole("button", { name: "半张回转纸票" });

    revealTicket(ticket, 3);

    expect(scene).toHaveAttribute("data-ticket-cutout", "revealed");
    expect(scene).toHaveAttribute("data-ticket-feedback", "cutout-found");
    expect(scene).toHaveAttribute("data-discovered", "true");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it("deepens the crease for a pre-discovery tab cycle but returns after a discovered cycle", () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, "hidden", "get");
    const onArm = vi.fn();
    renderScene({ slug: "tab-return", onArm });
    const scene = screen.getByTestId("v2-scene-040");
    const ticket = screen.getByRole("button", { name: "半张回转纸票" });

    hidden.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));
    expect(scene).toHaveAttribute("data-crease-count", "1");
    expect(scene).toHaveAttribute("data-return-state", "partial");
    expect(onArm).not.toHaveBeenCalled();

    revealTicket(ticket, 4);
    hidden.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(scene).toHaveAttribute("data-hidden-cycle", "hidden");
    act(() => vi.advanceTimersByTime(4_000));
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));

    expect(scene).toHaveAttribute("data-hidden-cycle", "returned");
    expect(scene).toHaveAttribute("data-return-state", "returned");
    expect(onArm).toHaveBeenCalledTimes(1);
    hidden.mockRestore();
  });

  it("expires a discovered hidden cycle after thirty seconds without losing discovery", () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, "hidden", "get");
    const onArm = vi.fn();
    renderScene({ slug: "tab-return", onArm });
    const scene = screen.getByTestId("v2-scene-040");
    const ticket = screen.getByRole("button", { name: "半张回转纸票" });
    revealTicket(ticket, 5);

    hidden.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    act(() => vi.advanceTimersByTime(30_001));
    hidden.mockReturnValue(false);
    fireEvent(document, new Event("visibilitychange"));

    expect(scene).toHaveAttribute("data-hidden-cycle", "expired");
    expect(scene).toHaveAttribute("data-discovered", "true");
    expect(scene).toHaveAttribute("data-return-state", "partial");
    expect(onArm).not.toHaveBeenCalled();
    hidden.mockRestore();
  });

  it("offers an equal cover-and-uncover route with broad pointer and keyboard gestures", () => {
    const onArm = vi.fn();
    renderScene({ slug: "tab-return", onArm });
    const scene = screen.getByTestId("v2-scene-040");
    const ticket = screen.getByRole("button", { name: "半张回转纸票" });
    const fold = screen.getByRole("button", { name: "折页" });
    revealTicket(ticket, 6);

    fireEvent.pointerDown(fold, { pointerId: 7, clientX: 320, clientY: 220 });
    fireEvent.pointerMove(fold, { pointerId: 7, clientX: 250, clientY: 220 });
    fireEvent.pointerUp(fold, { pointerId: 7, clientX: 250, clientY: 220 });
    expect(scene).toHaveAttribute("data-cover-state", "open");
    expect(onArm).not.toHaveBeenCalled();

    fold.focus();
    fireEvent.keyDown(fold, { key: "Enter" });
    expect(scene).toHaveAttribute("data-cover-state", "covered");
    expect(scene).toHaveAttribute("data-cover-progress", "100");
    fireEvent.keyDown(fold, { key: "Enter" });

    expect(scene).toHaveAttribute("data-cover-state", "returned");
    expect(scene).toHaveAttribute("data-return-state", "returned");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 041", () => {
  const routeNodes = [
    [45, 13], [64, 16], [78, 28], [80, 44], [70, 57], [57, 65], [55, 78], [43, 78], [42, 62],
    [51, 50], [61, 43], [61, 31], [50, 26], [39, 31], [34, 43], [22, 40], [24, 25], [34, 16],
  ] as const;
  const routeRect = {
    x: 0, y: 0, top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100,
    toJSON: () => undefined,
  };

  const traceRoute = (route: HTMLElement, points: ReadonlyArray<readonly [number, number]> = routeNodes, pointerId = 1) => {
    vi.spyOn(route, "getBoundingClientRect").mockReturnValue(routeRect);
    fireEvent.pointerDown(route, { pointerId, clientX: points[0][0], clientY: points[0][1] });
    points.slice(1).forEach(([clientX, clientY]) => fireEvent.pointerMove(route, { pointerId, clientX, clientY }));
    fireEvent.pointerMove(route, { pointerId, clientX: points[0][0], clientY: points[0][1] });
    fireEvent.pointerUp(route, { pointerId, clientX: points[0][0], clientY: points[0][1] });
  };

  it("presents a quiet dot inside a separate continuous outer question-mark rim", () => {
    const onArm = vi.fn();
    renderScene({ slug: "help-loop", onArm });
    const scene = screen.getByTestId("v2-scene-041");

    expect(scene).toHaveAttribute("data-spatial-model", "question-mark-outer-rim");
    expect(scene).toHaveAttribute("data-route-state", "idle");
    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-connector", "absent");
    expect(scene).toHaveAttribute("data-channel-width", "28");
    expect(screen.getByRole("application", { name: "问号外缘纸轨" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "安静圆点" })).toBeInTheDocument();
    expect(screen.queryByText("问号外的答案")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("turns clicks inside the question and on its dot into ordinary ripples", () => {
    const onArm = vi.fn();
    renderScene({ slug: "help-loop", hintLevel: 3, onArm });
    const scene = screen.getByTestId("v2-scene-041");

    fireEvent.click(screen.getByRole("button", { name: "问号内侧" }));
    fireEvent.click(screen.getByRole("button", { name: "安静圆点" }));

    expect(scene).toHaveAttribute("data-inner-clicks", "2");
    expect(scene).toHaveAttribute("data-dot-ripples", "2");
    expect(scene).toHaveAttribute("data-route-state", "faded");
    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("fades an incomplete trace that cuts through the question interior", () => {
    const onArm = vi.fn();
    renderScene({ slug: "help-loop", onArm });
    const scene = screen.getByTestId("v2-scene-041");
    const route = screen.getByRole("application", { name: "问号外缘纸轨" });
    vi.spyOn(route, "getBoundingClientRect").mockReturnValue(routeRect);

    fireEvent.pointerDown(route, { pointerId: 2, clientX: 45, clientY: 13 });
    fireEvent.pointerMove(route, { pointerId: 2, clientX: 64, clientY: 16 });
    fireEvent.pointerMove(route, { pointerId: 2, clientX: 50, clientY: 40 });
    fireEvent.pointerUp(route, { pointerId: 2, clientX: 50, clientY: 40 });

    expect(scene).toHaveAttribute("data-route-state", "faded");
    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-route-faults", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("connects the tail to the dot after one broad clockwise outer loop", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "help-loop", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-041");
    const route = screen.getByRole("application", { name: "问号外缘纸轨" });

    traceRoute(route, routeNodes, 3);

    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(scene).toHaveAttribute("data-route-progress", String(routeNodes.length + 1));
    expect(scene).toHaveAttribute("data-connector", "connected");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("accepts the same outer relation counter-clockwise from an arbitrary start", () => {
    const onArm = vi.fn();
    renderScene({ slug: "help-loop", onArm });
    const scene = screen.getByTestId("v2-scene-041");
    const route = screen.getByRole("application", { name: "问号外缘纸轨" });
    const start = 8;
    const counterClockwise = Array.from({ length: routeNodes.length }, (_value, offset) => routeNodes[(start - offset + routeNodes.length) % routeNodes.length]);

    traceRoute(route, counterClockwise, 4);

    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(scene).toHaveAttribute("data-connector", "connected");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("moves an accessible bead along the visible outer rim instead of using a direction code", () => {
    const onArm = vi.fn();
    renderScene({ slug: "help-loop", onArm });
    const scene = screen.getByTestId("v2-scene-041");
    const route = screen.getByRole("application", { name: "问号外缘纸轨" });

    route.focus();
    for (let step = 0; step < routeNodes.length; step += 1) fireEvent.keyDown(route, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-keyboard-bead", "0");
    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(scene).toHaveAttribute("data-connector", "connected");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 042", () => {
  const sceneRect = {
    x: 0, y: 0, top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100,
    toJSON: () => undefined,
  };
  const panelRect = {
    x: 20, y: 20, top: 20, right: 80, bottom: 80, left: 20, width: 60, height: 60,
    toJSON: () => undefined,
  };

  const mockGeometry = () => {
    const scene = screen.getByTestId("v2-scene-042");
    const panel = screen.getByRole("button", { name: "磨砂侧纸" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);
    vi.spyOn(panel, "getBoundingClientRect").mockReturnValue(panelRect);
    return { scene, panel };
  };

  const probeAt = (panel: HTMLElement, pointerId: number, clientX: number, clientY: number) => {
    fireEvent.pointerDown(panel, { pointerId, clientX, clientY });
    fireEvent.pointerUp(panel, { pointerId, clientX, clientY });
  };

  it("places one frosted paper layer between a fixed color edge and the player", () => {
    const onArm = vi.fn();
    renderScene({ slug: "panel-ping", onArm });
    const scene = screen.getByTestId("v2-scene-042");

    expect(scene).toHaveAttribute("data-spatial-model", "frosted-panel-mirrored-echo");
    expect(scene).toHaveAttribute("data-probed", "false");
    expect(scene).toHaveAttribute("data-ping-mode", "single-replacing");
    expect(scene).toHaveAttribute("data-edge-visibility", "sliver");
    expect(scene).toHaveAttribute("data-source-world", "16,62");
    expect(screen.getByTestId("panel-ping-color-edge")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "磨砂侧纸" })).toBeInTheDocument();
    expect(screen.queryByText("玻璃后的回声")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("mirrors every probe across both axes of the frosted panel", () => {
    renderScene({ slug: "panel-ping" });
    const { scene, panel } = mockGeometry();

    probeAt(panel, 1, 62, 38);

    expect(scene).toHaveAttribute("data-probe-local", "70,30");
    expect(scene).toHaveAttribute("data-echo-local", "30,70");
    expect(scene).toHaveAttribute("data-echo-world", "42.4,64.2");
    expect(scene).toHaveAttribute("data-echo-visibility", "pulse");
    expect(scene).toHaveAttribute("data-last-feedback", "ping");
  });

  it("replaces the previous short echo instead of accumulating click progress", () => {
    const onArm = vi.fn();
    renderScene({ slug: "panel-ping", onArm });
    const { scene, panel } = mockGeometry();

    [[32, 32], [44, 38], [56, 44], [68, 50], [74, 62]].forEach(([x, y], index) => probeAt(panel, index + 2, x, y));

    expect(scene).toHaveAttribute("data-ping-count", "5");
    expect(scene).toHaveAttribute("data-active-echoes", "1");
    expect(scene).toHaveAttribute("data-ping-mode", "single-replacing");
    expect(scene).toHaveAttribute("data-edge-visibility", "sliver");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rebounds a panel drag with no probe or with an echo away from the color edge", () => {
    const onArm = vi.fn();
    renderScene({ slug: "panel-ping", onArm });
    const { scene, panel } = mockGeometry();

    fireEvent.pointerDown(panel, { pointerId: 7, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(panel, { pointerId: 7, clientX: 70, clientY: 50 });
    fireEvent.pointerUp(panel, { pointerId: 7, clientX: 70, clientY: 50 });
    expect(scene).toHaveAttribute("data-last-feedback", "rebounded");
    expect(scene).toHaveAttribute("data-panel-offset", "0,0");

    probeAt(panel, 8, 62, 38);
    fireEvent.pointerDown(panel, { pointerId: 9, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(panel, { pointerId: 9, clientX: 70, clientY: 70 });
    fireEvent.pointerUp(panel, { pointerId: 9, clientX: 70, clientY: 70 });
    expect(scene).toHaveAttribute("data-last-feedback", "rebounded");
    expect(scene).toHaveAttribute("data-panel-offset", "0,0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals the hidden edge when one probed echo is moved back to its source", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "panel-ping", onDiscover, onArm });
    const { scene, panel } = mockGeometry();
    probeAt(panel, 10, 62, 38);

    fireEvent.pointerDown(panel, { pointerId: 11, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(panel, { pointerId: 11, clientX: 24, clientY: 48 });
    fireEvent.pointerUp(panel, { pointerId: 11, clientX: 24, clientY: 48 });

    expect(scene).toHaveAttribute("data-panel-offset", "-26,-2");
    expect(scene).toHaveAttribute("data-echo-world", "16.4,62.2");
    expect(scene).toHaveAttribute("data-last-feedback", "aligned");
    expect(scene).toHaveAttribute("data-edge-visibility", "revealed");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports probe then visible broad panel movement from the keyboard", () => {
    const onArm = vi.fn();
    renderScene({ slug: "panel-ping", onArm });
    const scene = screen.getByTestId("v2-scene-042");
    const panel = screen.getByRole("button", { name: "磨砂侧纸" });

    panel.focus();
    fireEvent.keyDown(panel, { key: "Enter" });
    fireEvent.keyDown(panel, { key: "ArrowLeft" });
    fireEvent.keyDown(panel, { key: "ArrowLeft" });
    expect(scene).toHaveAttribute("data-edge-visibility", "sliver");
    fireEvent.keyDown(panel, { key: "ArrowLeft" });

    expect(scene).toHaveAttribute("data-panel-offset", "-24,0");
    expect(scene).toHaveAttribute("data-last-feedback", "aligned");
    expect(scene).toHaveAttribute("data-edge-visibility", "revealed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 043", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("presents three visually distinct archive tabs without an exposed route or solution title", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-043");
    const tabs = screen.getAllByRole("button", { name: /档案页签/ });

    expect(scene).toHaveAttribute("data-spatial-model", "attention-draws-route");
    expect(scene).toHaveAttribute("data-route-state", "idle");
    expect(scene).toHaveAttribute("data-route-length", "0");
    expect(scene).toHaveAttribute("data-visible-bands", "0");
    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.getAttribute("data-route-role"))).toEqual(["seed", "relay", "seal"]);
    expect(screen.queryByText("注意力路线")).not.toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not turn opening all three archive tabs into a solution", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-043");
    const tabs = screen.getAllByRole("button", { name: /档案页签/ });

    tabs.forEach((tab) => fireEvent.click(tab));

    expect(scene).toHaveAttribute("data-opened-tabs", "3");
    expect(scene).toHaveAttribute("data-route-length", "0");
    expect(scene).toHaveAttribute("data-route-state", "broken");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps one continuous light band as focus moves from seed through relay to seal", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "archive-route", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-043");
    const tabs = screen.getAllByRole("button", { name: /档案页签/ });

    fireEvent.focus(tabs[0]);
    expect(scene).toHaveAttribute("data-route-length", "1");
    expect(scene).toHaveAttribute("data-visible-bands", "1");
    fireEvent.focus(tabs[1]);
    expect(scene).toHaveAttribute("data-route-length", "2");
    expect(scene).toHaveAttribute("data-visible-bands", "2");
    fireEvent.focus(tabs[2]);

    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(scene).toHaveAttribute("data-route-length", "3");
    expect(scene).toHaveAttribute("data-active-tab", "2");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("shows a dead end when attention jumps to a tab unsupported by the current band", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-043");
    const tabs = screen.getAllByRole("button", { name: /档案页签/ });

    fireEvent.focus(tabs[1]);
    expect(scene).toHaveAttribute("data-dead-ends", "1");
    expect(scene).toHaveAttribute("data-route-length", "0");
    fireEvent.focus(tabs[0]);
    fireEvent.focus(tabs[2]);

    expect(scene).toHaveAttribute("data-dead-ends", "2");
    expect(scene).toHaveAttribute("data-route-state", "broken");
    expect(scene).toHaveAttribute("data-visible-bands", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("lets a held pointer carry attention through the three visible halos", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-043");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100,
      toJSON: () => undefined,
    });

    fireEvent.pointerDown(scene, { pointerId: 43, clientX: 8, clientY: 88 });
    fireEvent.pointerMove(scene, { pointerId: 43, clientX: 20, clientY: 65 });
    fireEvent.pointerMove(scene, { pointerId: 43, clientX: 51, clientY: 28 });
    fireEvent.pointerMove(scene, { pointerId: 43, clientX: 81, clientY: 64 });
    fireEvent.pointerUp(scene, { pointerId: 43, clientX: 81, clientY: 64 });

    expect(scene).toHaveAttribute("data-input-mode", "held-attention");
    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("breaks the route when attention pauses too long between archive tabs", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-043");
    const tabs = screen.getAllByRole("button", { name: /档案页签/ });

    fireEvent.focus(tabs[0]);
    act(() => vi.advanceTimersByTime(1_900));
    fireEvent.focus(tabs[1]);

    expect(scene).toHaveAttribute("data-route-length", "0");
    expect(scene).toHaveAttribute("data-route-state", "broken");
    expect(scene).toHaveAttribute("data-dead-ends", "2");
    expect(onArm).not.toHaveBeenCalled();
  });
});

describe("V2 production puzzle scene 044", () => {
  const sceneRect = {
    x: 0, y: 0, top: 0, right: 200, bottom: 100, left: 0, width: 200, height: 100,
    toJSON: () => undefined,
  };
  const targetRect = {
    x: 138, y: 28, top: 28, right: 158, bottom: 48, left: 138, width: 20, height: 20,
    toJSON: () => undefined,
  };

  const mockGeometry = () => {
    const scene = screen.getByTestId("v2-scene-044");
    const target = screen.getByTestId("focus-orbit-target");
    const lens = screen.getByRole("button", { name: "透明焦点片" });
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue(targetRect);
    return { scene, target, lens };
  };

  it("shows a visible three-ghost decimal orbit and a separate transparent focus lens", () => {
    renderScene({ slug: "focus-orbit" });
    const scene = screen.getByTestId("v2-scene-044");

    expect(scene).toHaveAttribute("data-spatial-model", "lens-over-ghost-decimal");
    expect(scene).toHaveAttribute("data-ghost-layers", "3");
    expect(scene).toHaveAttribute("data-local-clarity", "blurred");
    expect(scene).toHaveAttribute("data-orbit-visibility", "visible");
    expect(screen.getByTestId("focus-orbit-target")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "透明焦点片" })).toBeInTheDocument();
    expect(screen.queryByText("焦点轨道")).not.toBeInTheDocument();
  });

  it("gives the visible orbit a ripple without letting orbit clicks solve it", () => {
    const onArm = vi.fn();
    renderScene({ slug: "focus-orbit", onArm });
    const scene = screen.getByTestId("v2-scene-044");
    const orbit = screen.getByRole("button", { name: "错位小数点轨道" });

    for (let click = 0; click < 4; click += 1) fireEvent.click(orbit);

    expect(scene).toHaveAttribute("data-orbit-ripples", "4");
    expect(scene).toHaveAttribute("data-local-clarity", "blurred");
    expect(scene).toHaveAttribute("data-lens-position", "18,75");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("ignores a click and a sub-sixteen-pixel lens nudge", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "focus-orbit", onDiscover, onArm });
    const { scene, lens } = mockGeometry();

    fireEvent.click(lens);
    fireEvent.pointerDown(lens, { pointerId: 44, clientX: 36, clientY: 75 });
    fireEvent.pointerMove(lens, { pointerId: 44, clientX: 46, clientY: 80 });
    fireEvent.pointerUp(lens, { pointerId: 44, clientX: 46, clientY: 80 });

    expect(scene).toHaveAttribute("data-local-clarity", "blurred");
    expect(scene).toHaveAttribute("data-lens-position", "18,75");
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals local alignment after a real lens drag but rejects a distant release", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "focus-orbit", onDiscover, onArm });
    const { scene, lens } = mockGeometry();

    fireEvent.pointerDown(lens, { pointerId: 45, clientX: 36, clientY: 75 });
    fireEvent.pointerMove(lens, { pointerId: 45, clientX: 66, clientY: 60 });
    fireEvent.pointerUp(lens, { pointerId: 45, clientX: 66, clientY: 60 });

    expect(scene).toHaveAttribute("data-local-clarity", "clear");
    expect(scene).toHaveAttribute("data-lens-position", "33,60");
    expect(scene).toHaveAttribute("data-last-feedback", "miss");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("snaps all three decimal ghosts together inside the visible forty-four-pixel target", () => {
    const onArm = vi.fn();
    renderScene({ slug: "focus-orbit", onArm });
    const { scene, lens } = mockGeometry();

    fireEvent.pointerDown(lens, { pointerId: 46, clientX: 36, clientY: 75 });
    fireEvent.pointerMove(lens, { pointerId: 46, clientX: 148, clientY: 38 });
    fireEvent.pointerUp(lens, { pointerId: 46, clientX: 148, clientY: 38 });

    expect(scene).toHaveAttribute("data-lens-position", "74,38");
    expect(scene).toHaveAttribute("data-ghost-state", "aligned");
    expect(scene).toHaveAttribute("data-last-feedback", "snapped");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers a visible direction-key route for the same focus-lens movement", () => {
    const onArm = vi.fn();
    renderScene({ slug: "focus-orbit", onArm });
    const scene = screen.getByTestId("v2-scene-044");
    const lens = screen.getByRole("button", { name: "透明焦点片" });

    lens.focus();
    for (let move = 0; move < 4; move += 1) fireEvent.keyDown(lens, { key: "ArrowRight" });
    for (let move = 0; move < 3; move += 1) fireEvent.keyDown(lens, { key: "ArrowUp" });

    expect(scene).toHaveAttribute("data-lens-position", "74,38");
    expect(scene).toHaveAttribute("data-ghost-state", "aligned");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 045", () => {
  const sceneRect = {
    x: 0, y: 0, top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100,
    toJSON: () => undefined,
  };
  const layerRects = [
    { x: 58, y: 55, top: 55, right: 74, bottom: 67, left: 58, width: 16, height: 12, toJSON: () => undefined },
    { x: 30, y: 42, top: 42, right: 46, bottom: 54, left: 30, width: 16, height: 12, toJSON: () => undefined },
    { x: 54, y: 26, top: 26, right: 70, bottom: 38, left: 54, width: 16, height: 12, toJSON: () => undefined },
    { x: 26, y: 61, top: 61, right: 42, bottom: 73, left: 26, width: 16, height: 12, toJSON: () => undefined },
  ];

  const setup = () => {
    const scene = screen.getByTestId("v2-scene-045");
    const lens = screen.getByRole("button", { name: "描图焦点片" });
    const layers = screen.getAllByTestId(/focus-cascade-layer-/);
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);
    layers.forEach((layer, index) => vi.spyOn(layer, "getBoundingClientRect").mockReturnValue(layerRects[index]));
    return { scene, lens, layers };
  };

  const moveLensTo = (lens: HTMLElement, layer: number, pointerId: number) => {
    const rect = layerRects[layer];
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    fireEvent.pointerDown(lens, { pointerId, clientX: 50, clientY: 88 });
    fireEvent.pointerMove(lens, { pointerId, clientX: x, clientY: y });
    fireEvent.pointerUp(lens, { pointerId, clientX: x, clientY: y });
  };

  it("layers four blurred tracing sheets with readable depth evidence and one movable focus piece", () => {
    renderScene({ slug: "focus-cascade" });
    const scene = screen.getByTestId("v2-scene-045");
    const layers = screen.getAllByTestId(/focus-cascade-layer-/);

    expect(scene).toHaveAttribute("data-spatial-model", "stacked-clarity-transfer");
    expect(scene).toHaveAttribute("data-layer-count", "4");
    expect(scene).toHaveAttribute("data-clarity-state", "blurred");
    expect(layers.map((layer) => layer.getAttribute("data-depth"))).toEqual(["front", "upper-middle", "lower-middle", "deepest"]);
    expect(screen.getByRole("button", { name: "描图焦点片" })).toBeInTheDocument();
    expect(screen.queryByText("焦点瀑布")).not.toBeInTheDocument();
  });

  it("does not let direct layer clicks or mechanical left-to-right opening solve the cascade", () => {
    const onArm = vi.fn();
    renderScene({ slug: "focus-cascade", onArm });
    const { scene, lens, layers } = setup();
    layers.forEach((layer) => fireEvent.click(layer));
    expect(scene).toHaveAttribute("data-moves", "0");

    [3, 1, 2, 0].forEach((layer, index) => moveLensTo(lens, layer, 50 + index));

    expect(scene).toHaveAttribute("data-wrong-transfers", "2");
    expect(scene).not.toHaveAttribute("data-clarity-state", "complete");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("makes the covered sheet locally clear while the following sheet grows blurrier", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "focus-cascade", onDiscover });
    const { scene, lens } = setup();
    const rect = layerRects[3];

    fireEvent.pointerDown(lens, { pointerId: 60, clientX: 50, clientY: 88 });
    fireEvent.pointerMove(lens, { pointerId: 60, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 });

    expect(scene).toHaveAttribute("data-preview-layer", "3");
    expect(scene).toHaveAttribute("data-preview-clarity", "current-clear-next-blurred");
    expect(onDiscover).toHaveBeenCalled();
  });

  it("preserves learned deep-layer clarity when a later focus choice is wrong", () => {
    const onArm = vi.fn();
    renderScene({ slug: "focus-cascade", onArm });
    const { scene, lens } = setup();

    moveLensTo(lens, 3, 61);
    moveLensTo(lens, 0, 62);

    expect(scene).toHaveAttribute("data-route-depth", "1");
    expect(scene).toHaveAttribute("data-clear-layers", "3");
    expect(scene).toHaveAttribute("data-wrong-transfers", "1");
    expect(scene).toHaveAttribute("data-last-feedback", "returned");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("transfers clarity from deepest to front in four broad lens moves", () => {
    const onArm = vi.fn();
    renderScene({ slug: "focus-cascade", onArm });
    const { scene, lens } = setup();

    [3, 2, 1, 0].forEach((layer, index) => moveLensTo(lens, layer, 70 + index));

    expect(scene).toHaveAttribute("data-route-depth", "4");
    expect(scene).toHaveAttribute("data-clear-layers", "3,2,1,0");
    expect(scene).toHaveAttribute("data-moves", "4");
    expect(scene).toHaveAttribute("data-clarity-state", "complete");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports keyboard layer selection without exposing step numbers", () => {
    const onArm = vi.fn();
    renderScene({ slug: "focus-cascade", onArm });
    const scene = screen.getByTestId("v2-scene-045");
    const lens = screen.getByRole("button", { name: "描图焦点片" });

    lens.focus();
    for (let move = 0; move < 3; move += 1) fireEvent.keyDown(lens, { key: "ArrowRight" });
    fireEvent.keyDown(lens, { key: "Enter" });
    for (let layer = 2; layer >= 0; layer -= 1) {
      fireEvent.keyDown(lens, { key: "ArrowLeft" });
      fireEvent.keyDown(lens, { key: "Enter" });
    }

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-layer-focus");
    expect(scene).toHaveAttribute("data-clarity-state", "complete");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 046", () => {
  const sceneRect = {
    x: 0, y: 0, top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100,
    toJSON: () => undefined,
  };
  const route = [
    { x: 24, y: 66 },
    { x: 36, y: 46 },
    { x: 50, y: 35 },
    { x: 64, y: 46 },
    { x: 76, y: 66 },
  ];

  const setup = () => {
    const scene = screen.getByTestId("v2-scene-046");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue(sceneRect);
    return {
      scene,
      leftPalm: screen.getByRole("button", { name: "左边纸手" }),
      rightPalm: screen.getByRole("button", { name: "右边纸手" }),
    };
  };

  const move = (scene: HTMLElement, point: { x: number; y: number }, pointerId: number, buttons = 1) => {
    fireEvent.pointerMove(scene, {
      pointerId,
      pointerType: buttons ? "touch" : "mouse",
      buttons,
      clientX: point.x,
      clientY: point.y,
    });
  };

  it("stages two paper hands and a broad shallow bridge without naming the answer", () => {
    renderScene({ slug: "silent-handoff" });
    const { scene, leftPalm, rightPalm } = setup();

    expect(scene).toHaveAttribute("data-spatial-model", "paper-hands-shallow-bridge");
    expect(scene).toHaveAttribute("data-controller", "shared-control");
    expect(scene).toHaveAttribute("data-channel-width", "48");
    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-colored-segments", "0");
    expect(leftPalm).toBeVisible();
    expect(rightPalm).toBeVisible();
    expect(screen.getAllByTestId(/silent-handoff-segment-/)).toHaveLength(4);
    expect(screen.queryByText("不点击的交接")).not.toBeInTheDocument();
  });

  it("retracts both hands when either palm is pressed and never treats clicks as progress", () => {
    const onArm = vi.fn();
    renderScene({ slug: "silent-handoff", onArm });
    const { scene, leftPalm, rightPalm } = setup();

    fireEvent.click(leftPalm);
    fireEvent.click(rightPalm);

    expect(scene).toHaveAttribute("data-palm-presses", "2");
    expect(scene).toHaveAttribute("data-hands-state", "retracted");
    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-route-state", "broken");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects a jump across the bridge instead of accepting long-distance precision", () => {
    const onArm = vi.fn();
    renderScene({ slug: "silent-handoff", onArm });
    const { scene } = setup();

    fireEvent.pointerDown(scene, { pointerId: 46, pointerType: "touch", buttons: 1, clientX: route[0].x, clientY: route[0].y });
    move(scene, route[3], 46);
    move(scene, route[4], 46);
    fireEvent.pointerUp(scene, { pointerId: 46, pointerType: "touch", clientX: route[4].x, clientY: route[4].y });

    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-route-breaks", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not accumulate bridge segments across separate touch strokes", () => {
    const onArm = vi.fn();
    renderScene({ slug: "silent-handoff", onArm });
    const { scene } = setup();

    fireEvent.pointerDown(scene, { pointerId: 47, pointerType: "touch", buttons: 1, clientX: route[0].x, clientY: route[0].y });
    move(scene, route[1], 47);
    move(scene, route[2], 47);
    fireEvent.pointerUp(scene, { pointerId: 47, pointerType: "touch", clientX: route[2].x, clientY: route[2].y });
    expect(scene).toHaveAttribute("data-route-progress", "0");

    fireEvent.pointerDown(scene, { pointerId: 48, pointerType: "touch", buttons: 1, clientX: route[2].x, clientY: route[2].y });
    move(scene, route[3], 48);
    move(scene, route[4], 48);
    fireEvent.pointerUp(scene, { pointerId: 48, pointerType: "touch", clientX: route[4].x, clientY: route[4].y });

    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("completes one uninterrupted broad held trail from the left perimeter to the right", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "silent-handoff", onDiscover, onArm });
    const { scene } = setup();

    fireEvent.pointerDown(scene, { pointerId: 49, pointerType: "touch", buttons: 1, clientX: route[0].x, clientY: route[0].y });
    route.slice(1).forEach((point) => move(scene, point, 49));
    fireEvent.pointerUp(scene, { pointerId: 49, pointerType: "touch", clientX: route[4].x, clientY: route[4].y });

    expect(scene).toHaveAttribute("data-input-mode", "held-trail");
    expect(scene).toHaveAttribute("data-route-progress", "4");
    expect(scene).toHaveAttribute("data-colored-segments", "4");
    expect(scene).toHaveAttribute("data-hands-state", "received");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("moves the same visible light along the bridge with four keyboard steps", () => {
    const onArm = vi.fn();
    renderScene({ slug: "silent-handoff", onArm });
    const { scene } = setup();

    scene.focus();
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(scene, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-bridge");
    expect(scene).toHaveAttribute("data-light-position", "4");
    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 047", () => {
  afterEach(() => vi.useRealTimers());

  const settle = () => act(() => vi.advanceTimersByTime(1_300));

  it("stages a floating paper stone, active ripples, and a separate soft shadow", () => {
    vi.useFakeTimers();
    renderScene({ slug: "deep-pressure" });
    const scene = screen.getByTestId("v2-scene-047");

    expect(scene).toHaveAttribute("data-spatial-model", "floating-stone-ripple-shadow");
    expect(scene).toHaveAttribute("data-ripple-state", "moving");
    expect(scene).toHaveAttribute("data-shadow-state", "soft");
    expect(screen.getByRole("button", { name: "悬浮纸石" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "纸石的影子" })).toBeInTheDocument();
    expect(screen.getAllByTestId(/deep-pressure-ripple-/)).toHaveLength(3);
    expect(screen.queryByText("等涟漪安静")).not.toBeInTheDocument();
  });

  it("raises the stone and expands the ripples when the visible stone is pressed", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "deep-pressure", onArm });
    const scene = screen.getByTestId("v2-scene-047");
    const stone = screen.getByRole("button", { name: "悬浮纸石" });

    fireEvent.pointerDown(stone, { pointerId: 47, pointerType: "mouse" });

    expect(scene).toHaveAttribute("data-direct-presses", "1");
    expect(scene).toHaveAttribute("data-stone-state", "raised");
    expect(scene).toHaveAttribute("data-ripple-state", "disturbed");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("lets ordinary pointer movement pass while the ripples settle into a stable shadow", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    renderScene({ slug: "deep-pressure", onDiscover });
    const scene = screen.getByTestId("v2-scene-047");

    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerMove(scene, { pointerId: 48, pointerType: "mouse", clientX: 20, clientY: 20 });
    act(() => vi.advanceTimersByTime(700));

    expect(scene).toHaveAttribute("data-ripple-state", "still");
    expect(scene).toHaveAttribute("data-shadow-state", "stable");
    expect(scene).toHaveAttribute("data-disturbances", "0");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it("pushes the water away when the shadow is pressed before it has stabilized", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "deep-pressure", onArm });
    const scene = screen.getByTestId("v2-scene-047");
    const shadow = screen.getByRole("button", { name: "纸石的影子" });

    act(() => vi.advanceTimersByTime(700));
    fireEvent.pointerDown(shadow, { pointerId: 49, pointerType: "touch" });
    fireEvent.pointerUp(shadow, { pointerId: 49, pointerType: "touch" });

    expect(scene).toHaveAttribute("data-ripple-state", "disturbed");
    expect(scene).toHaveAttribute("data-shadow-state", "soft");
    expect(scene).toHaveAttribute("data-hold-state", "idle");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("sinks the stone after one stable-shadow hold and cancels an early release", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "deep-pressure", onArm });
    const scene = screen.getByTestId("v2-scene-047");
    const shadow = screen.getByRole("button", { name: "纸石的影子" });
    settle();

    fireEvent.pointerDown(shadow, { pointerId: 50, pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(shadow, { pointerId: 50, pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));
    expect(onArm).not.toHaveBeenCalled();
    expect(scene).toHaveAttribute("data-hold-state", "released-early");

    fireEvent.pointerDown(shadow, { pointerId: 51, pointerType: "touch" });
    act(() => vi.advanceTimersByTime(900));

    expect(scene).toHaveAttribute("data-stone-state", "sunk");
    expect(scene).toHaveAttribute("data-hold-state", "complete");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers the same stable-shadow hold from the keyboard Space key", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "deep-pressure", onArm });
    const scene = screen.getByTestId("v2-scene-047");
    const shadow = screen.getByRole("button", { name: "纸石的影子" });
    settle();

    shadow.focus();
    fireEvent.keyDown(shadow, { key: " " });
    act(() => vi.advanceTimersByTime(900));

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-shadow");
    expect(scene).toHaveAttribute("data-stone-state", "sunk");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 048", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps five moving word strips around one fixed blank control", () => {
    vi.useFakeTimers();
    renderScene({ slug: "pause-word" });
    const scene = screen.getByTestId("v2-scene-048");

    expect(scene).toHaveAttribute("data-spatial-model", "moving-word-strips-fixed-blank");
    expect(scene).toHaveAttribute("data-strip-count", "5");
    expect(scene).toHaveAttribute("data-word-state", "fragments");
    expect(scene).toHaveAttribute("data-reduced-motion-model", "three-discrete-positions");
    expect(screen.getAllByRole("button", { name: /文字纸带/ })).toHaveLength(5);
    expect(screen.getByRole("button", { name: "固定空白" })).toBeInTheDocument();
    expect(screen.queryByText("按住空白")).not.toBeInTheDocument();
  });

  it("accelerates a pressed text strip instead of treating letters as the answer", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "pause-word", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-048");
    const strip = screen.getAllByRole("button", { name: /文字纸带/ })[0];

    fireEvent.pointerDown(strip, { pointerId: 48 });

    expect(scene).toHaveAttribute("data-strip-presses", "1");
    expect(scene).toHaveAttribute("data-strip-state", "accelerated");
    expect(scene).toHaveAttribute("data-word-state", "fragments");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not solve by mechanically pressing all five visible letter strips", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pause-word", onArm });
    const scene = screen.getByTestId("v2-scene-048");

    screen.getAllByRole("button", { name: /文字纸带/ }).forEach((strip, index) => {
      fireEvent.pointerDown(strip, { pointerId: 50 + index });
    });
    act(() => vi.advanceTimersByTime(2_000));

    expect(scene).toHaveAttribute("data-strip-presses", "5");
    expect(scene).toHaveAttribute("data-word-state", "fragments");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows a pressed blank edge but cancels when the blank is released early", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pause-word", onArm });
    const scene = screen.getByTestId("v2-scene-048");
    const blank = screen.getByRole("button", { name: "固定空白" });

    fireEvent.pointerDown(blank, { pointerId: 55 });
    act(() => vi.advanceTimersByTime(300));
    expect(scene).toHaveAttribute("data-blank-state", "pressed");
    fireEvent.pointerUp(blank, { pointerId: 55 });
    act(() => vi.advanceTimersByTime(500));

    expect(scene).toHaveAttribute("data-blank-state", "released-early");
    expect(scene).toHaveAttribute("data-word-state", "fragments");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("automatically stops on readable PAUSE after one continuous blank hold", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pause-word", onArm });
    const scene = screen.getByTestId("v2-scene-048");
    const blank = screen.getByRole("button", { name: "固定空白" });

    fireEvent.pointerDown(blank, { pointerId: 56 });
    act(() => vi.advanceTimersByTime(600));

    expect(scene).toHaveAttribute("data-blank-state", "complete");
    expect(scene).toHaveAttribute("data-strip-state", "aligned");
    expect(scene).toHaveAttribute("data-word-state", "pause");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("uses Space on the fixed blank as the same non-frame-precise hold", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pause-word", onArm });
    const scene = screen.getByTestId("v2-scene-048");
    const blank = screen.getByRole("button", { name: "固定空白" });

    blank.focus();
    fireEvent.keyDown(blank, { key: " " });
    act(() => vi.advanceTimersByTime(600));

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-blank");
    expect(scene).toHaveAttribute("data-word-state", "pause");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 049", () => {
  const sceneRect = {
    x: 0, y: 0, top: 0, right: 100, bottom: 100, left: 0, width: 100, height: 100,
    toJSON: () => undefined,
  };
  const route = [
    { x: 28, y: 58 },
    { x: 35, y: 28 },
    { x: 62, y: 20 },
    { x: 78, y: 52 },
    { x: 58, y: 76 },
  ];

  const setup = () => {
    const scene = screen.getByTestId("v2-scene-049");
    const canvas = screen.getByRole("application", { name: "五点纸纤维" });
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(sceneRect);
    return { scene, canvas };
  };

  it("places five tiny engraved points on one large paper sky without a clickable answer", () => {
    renderScene({ slug: "ten-thousand-glyph" });
    const { scene } = setup();

    expect(scene).toHaveAttribute("data-spatial-model", "five-engraved-points-open-loop");
    expect(scene).toHaveAttribute("data-point-count", "5");
    expect(scene).toHaveAttribute("data-tolerance", "16");
    expect(scene).toHaveAttribute("data-camera-route", "optional");
    expect(screen.getAllByTestId(/ten-thousand-point-/)).toHaveLength(5);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("万分之一的线")).not.toBeInTheDocument();
  });

  it("rejects a trace that starts away from the first natural fiber point", () => {
    const onArm = vi.fn();
    renderScene({ slug: "ten-thousand-glyph", onArm });
    const { scene, canvas } = setup();

    fireEvent.pointerDown(canvas, { pointerId: 49, clientX: route[2].x, clientY: route[2].y });
    fireEvent.pointerMove(canvas, { pointerId: 49, clientX: route[3].x, clientY: route[3].y });
    fireEvent.pointerUp(canvas, { pointerId: 49, clientX: route[3].x, clientY: route[3].y });

    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-breaks", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not accumulate the five points across separate strokes", () => {
    const onArm = vi.fn();
    renderScene({ slug: "ten-thousand-glyph", onArm });
    const { scene, canvas } = setup();

    fireEvent.pointerDown(canvas, { pointerId: 50, clientX: route[0].x, clientY: route[0].y });
    fireEvent.pointerMove(canvas, { pointerId: 50, clientX: route[1].x, clientY: route[1].y });
    fireEvent.pointerMove(canvas, { pointerId: 50, clientX: route[2].x, clientY: route[2].y });
    fireEvent.pointerUp(canvas, { pointerId: 50, clientX: route[2].x, clientY: route[2].y });
    expect(scene).toHaveAttribute("data-route-progress", "0");

    fireEvent.pointerDown(canvas, { pointerId: 51, clientX: route[2].x, clientY: route[2].y });
    fireEvent.pointerMove(canvas, { pointerId: 51, clientX: route[3].x, clientY: route[3].y });
    fireEvent.pointerMove(canvas, { pointerId: 51, clientX: route[4].x, clientY: route[4].y });
    fireEvent.pointerMove(canvas, { pointerId: 51, clientX: route[0].x, clientY: route[0].y });
    fireEvent.pointerUp(canvas, { pointerId: 51, clientX: route[0].x, clientY: route[0].y });

    expect(scene).toHaveAttribute("data-closed", "false");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps the loop open when all five points are visited but the stroke is not closed", () => {
    const onArm = vi.fn();
    renderScene({ slug: "ten-thousand-glyph", onArm });
    const { scene, canvas } = setup();

    fireEvent.pointerDown(canvas, { pointerId: 52, clientX: route[0].x, clientY: route[0].y });
    route.slice(1).forEach((point) => fireEvent.pointerMove(canvas, { pointerId: 52, clientX: point.x, clientY: point.y }));
    expect(scene).toHaveAttribute("data-route-progress", "5");
    fireEvent.pointerUp(canvas, { pointerId: 52, clientX: route[4].x, clientY: route[4].y });

    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-closed", "false");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("accepts one broad continuous stroke through the five points and back to the start", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "ten-thousand-glyph", onDiscover, onArm });
    const { scene, canvas } = setup();

    fireEvent.pointerDown(canvas, { pointerId: 53, clientX: route[0].x + 5, clientY: route[0].y - 4 });
    route.slice(1).forEach((point) => fireEvent.pointerMove(canvas, { pointerId: 53, clientX: point.x + 4, clientY: point.y + 3 }));
    fireEvent.pointerMove(canvas, { pointerId: 53, clientX: route[0].x - 4, clientY: route[0].y + 4 });

    expect(scene).toHaveAttribute("data-route-progress", "5");
    expect(scene).toHaveAttribute("data-inked-points", "0,1,2,3,4");
    expect(scene).toHaveAttribute("data-closed", "true");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("walks the same accessible loop with five ArrowRight edges", () => {
    const onArm = vi.fn();
    renderScene({ slug: "ten-thousand-glyph", onArm });
    const { scene, canvas } = setup();

    canvas.focus();
    for (let edge = 0; edge < 5; edge += 1) fireEvent.keyDown(canvas, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-track");
    expect(scene).toHaveAttribute("data-closed", "true");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 050", () => {
  it("shows two transparent bilingual sentence bands and one shared central slot", () => {
    renderScene({ slug: "mirrored-input" });
    const scene = screen.getByTestId("v2-scene-050");

    expect(scene).toHaveAttribute("data-spatial-model", "bilingual-mirrored-sentence-bands");
    expect(scene).toHaveAttribute("data-band-count", "2");
    expect(scene).toHaveAttribute("data-shared-slot", "open");
    expect(screen.getByTestId("mirrored-input-slot")).toBeInTheDocument();
    expect(screen.getAllByTestId(/mirrored-input-band-/)).toHaveLength(2);
    expect(screen.getAllByTestId(/mirrored-input-direction-/)).toHaveLength(2);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("两种标点的同一个位置")).not.toBeInTheDocument();
  });

  it("does not solve by clicking either visible punctuation mark", () => {
    const onArm = vi.fn();
    renderScene({ slug: "mirrored-input", onArm });
    const scene = screen.getByTestId("v2-scene-050");

    screen.getAllByRole("button", { name: /句带标点/ }).forEach((punctuation) => fireEvent.click(punctuation));

    expect(scene).toHaveAttribute("data-mirror-offset", "-2");
    expect(scene).toHaveAttribute("data-shared-slot", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps the other language wrong when a drag only satisfies one sentence ending", () => {
    const onArm = vi.fn();
    renderScene({ slug: "mirrored-input", onArm });
    const scene = screen.getByTestId("v2-scene-050");
    const english = screen.getByRole("button", { name: "英文句带标点" });

    fireEvent.pointerDown(english, { pointerId: 50, clientX: 0 });
    fireEvent.pointerMove(english, { pointerId: 50, clientX: 150 });
    fireEvent.pointerUp(english, { pointerId: 50, clientX: 150 });

    expect(scene).toHaveAttribute("data-mirror-offset", "1");
    expect(scene).toHaveAttribute("data-en-ending", "correct");
    expect(scene).toHaveAttribute("data-zh-ending", "wrong");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("moves the second band by the equal opposite amount during either punctuation drag", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "mirrored-input", onDiscover });
    const scene = screen.getByTestId("v2-scene-050");
    const english = screen.getByRole("button", { name: "英文句带标点" });

    fireEvent.pointerDown(english, { pointerId: 51, clientX: 0 });
    fireEvent.pointerMove(english, { pointerId: 51, clientX: 50 });

    expect(scene).toHaveAttribute("data-mirror-offset", "-1");
    expect(scene).toHaveAttribute("data-en-band-x", "35");
    expect(scene).toHaveAttribute("data-zh-band-x", "65");
    expect(scene).toHaveAttribute("data-mirror-state", "linked");
    expect(onDiscover).toHaveBeenCalled();
  });

  it("arms only when one drag overlaps both sentence endings at the shared slot", () => {
    const onArm = vi.fn();
    renderScene({ slug: "mirrored-input", onArm });
    const scene = screen.getByTestId("v2-scene-050");
    const english = screen.getByRole("button", { name: "英文句带标点" });

    fireEvent.pointerDown(english, { pointerId: 52, clientX: 0 });
    fireEvent.pointerMove(english, { pointerId: 52, clientX: 100 });
    fireEvent.pointerUp(english, { pointerId: 52, clientX: 100 });

    expect(scene).toHaveAttribute("data-mirror-offset", "0");
    expect(scene).toHaveAttribute("data-en-ending", "correct");
    expect(scene).toHaveAttribute("data-zh-ending", "correct");
    expect(scene).toHaveAttribute("data-shared-slot", "filled");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("uses two visible keyboard mirror steps instead of a language switch or code", () => {
    const onArm = vi.fn();
    renderScene({ slug: "mirrored-input", onArm });
    const scene = screen.getByTestId("v2-scene-050");
    const english = screen.getByRole("button", { name: "英文句带标点" });

    english.focus();
    fireEvent.keyDown(english, { key: "ArrowRight" });
    fireEvent.keyDown(english, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-bands");
    expect(scene).toHaveAttribute("data-shared-slot", "filled");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 051", () => {
  it("shows one visibly thick seamed READY tile without exposing the internal level title", () => {
    renderScene({ slug: "ready-code" });
    const scene = screen.getByTestId("v2-scene-051");

    expect(scene).toHaveAttribute("data-spatial-model", "thick-double-leaf-ready-type");
    expect(scene).toHaveAttribute("data-visible-word", "READY");
    expect(scene).toHaveAttribute("data-motion", "shaking");
    expect(scene).toHaveAttribute("data-front-glyph", "就绪");
    expect(scene).toHaveAttribute("data-inner-glyph", "稳定");
    expect(screen.getByTestId("ready-code-seam-051")).toBeInTheDocument();
    expect(screen.getAllByTestId(/ready-code-static-tile-/)).toHaveLength(4);
    expect(screen.getAllByRole("button", { name: /R .+页纸缝/ })).toHaveLength(2);
    expect(screen.queryByText("准备好以后再稳一点")).not.toBeInTheDocument();
  });

  it("does not treat clicking either half of the thick R as an answer", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "ready-code", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-051");

    screen.getAllByRole("button", { name: /R .+页纸缝/ }).forEach((leaf) => fireEvent.click(leaf));

    expect(scene).toHaveAttribute("data-visible-word", "READY");
    expect(scene).toHaveAttribute("data-left-leaf", "closed");
    expect(scene).toHaveAttribute("data-right-leaf", "closed");
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("folds an inward drag back into R instead of accepting a fixed swipe", () => {
    const onArm = vi.fn();
    renderScene({ slug: "ready-code", onArm });
    const scene = screen.getByTestId("v2-scene-051");
    const left = screen.getByRole("button", { name: "R 左页纸缝" });

    fireEvent.pointerDown(left, { pointerId: 53, clientX: 0 });
    fireEvent.pointerMove(left, { pointerId: 53, clientX: 60 });
    fireEvent.pointerUp(left, { pointerId: 53, clientX: 60 });

    expect(scene).toHaveAttribute("data-left-leaf", "closed");
    expect(scene).toHaveAttribute("data-rebounds", "1");
    expect(scene).toHaveAttribute("data-visible-word", "READY");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals only S when the left leaf opens and keeps the word unfinished", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "ready-code", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-051");
    const left = screen.getByRole("button", { name: "R 左页纸缝" });

    fireEvent.pointerDown(left, { pointerId: 54, clientX: 100 });
    fireEvent.pointerMove(left, { pointerId: 54, clientX: 40 });
    fireEvent.pointerUp(left, { pointerId: 54, clientX: 40 });

    expect(scene).toHaveAttribute("data-left-leaf", "open");
    expect(scene).toHaveAttribute("data-right-leaf", "closed");
    expect(scene).toHaveAttribute("data-visible-word", "S·EADY");
    expect(screen.getByTestId("ready-code-inner-left-051")).toHaveAttribute("data-revealed", "true");
    expect(screen.getByTestId("ready-code-inner-right-051")).toHaveAttribute("data-revealed", "false");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("stops the type only after both leaves open outward into STEADY", () => {
    const onArm = vi.fn();
    renderScene({ slug: "ready-code", onArm });
    const scene = screen.getByTestId("v2-scene-051");
    const left = screen.getByRole("button", { name: "R 左页纸缝" });
    const right = screen.getByRole("button", { name: "R 右页纸缝" });

    fireEvent.pointerDown(left, { pointerId: 55, clientX: 100 });
    fireEvent.pointerMove(left, { pointerId: 55, clientX: 40 });
    fireEvent.pointerUp(left, { pointerId: 55, clientX: 40 });
    fireEvent.pointerDown(right, { pointerId: 56, clientX: 100 });
    fireEvent.pointerMove(right, { pointerId: 56, clientX: 160 });
    fireEvent.pointerUp(right, { pointerId: 56, clientX: 160 });

    expect(scene).toHaveAttribute("data-left-leaf", "open");
    expect(scene).toHaveAttribute("data-right-leaf", "open");
    expect(scene).toHaveAttribute("data-visible-word", "STEADY");
    expect(scene).toHaveAttribute("data-motion", "still");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers the same two-leaf relation through visible keyboard movement", () => {
    const onArm = vi.fn();
    renderScene({ slug: "ready-code", onArm });
    const scene = screen.getByTestId("v2-scene-051");
    const left = screen.getByRole("button", { name: "R 左页纸缝" });
    const right = screen.getByRole("button", { name: "R 右页纸缝" });

    left.focus();
    fireEvent.keyDown(left, { key: "ArrowLeft" });
    right.focus();
    fireEvent.keyDown(right, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-leaves");
    expect(scene).toHaveAttribute("data-visible-word", "STEADY");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 052", () => {
  it("shows one long RUSH strip with an observable fold and an independently drawn Chinese back", () => {
    renderScene({ slug: "bend-command" });
    const scene = screen.getByTestId("v2-scene-052");

    expect(scene).toHaveAttribute("data-spatial-model", "single-command-strip-backside-rewrite");
    expect(scene).toHaveAttribute("data-visible-command", "RUSH");
    expect(scene).toHaveAttribute("data-front-glyph", "急");
    expect(scene).toHaveAttribute("data-back-glyph", "静");
    expect(scene).toHaveAttribute("data-fold-progress", "0");
    expect(screen.getByTestId("bend-command-crease-052")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("把急字折慢")).not.toBeInTheDocument();
  });

  it("does not rewrite the command when the crease is merely clicked", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "bend-command", onDiscover, onArm });
    const crease = screen.getByRole("button", { name: "命令纸带折线" });

    fireEvent.click(crease);

    expect(screen.getByTestId("v2-scene-052")).toHaveAttribute("data-visible-command", "RUSH");
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rebounds a sideways pull instead of treating any fixed swipe as a fold", () => {
    const onArm = vi.fn();
    renderScene({ slug: "bend-command", onArm });
    const scene = screen.getByTestId("v2-scene-052");
    const crease = screen.getByRole("button", { name: "命令纸带折线" });

    fireEvent.pointerDown(crease, { pointerId: 57, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(crease, { pointerId: 57, clientX: 170, clientY: 100 });
    fireEvent.pointerUp(crease, { pointerId: 57, clientX: 170, clientY: 100 });

    expect(scene).toHaveAttribute("data-fold-progress", "0");
    expect(scene).toHaveAttribute("data-rebounds", "1");
    expect(scene).toHaveAttribute("data-visible-command", "RUSH");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals the independent back drawing during a partial upward fold without completing", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "bend-command", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-052");
    const crease = screen.getByRole("button", { name: "命令纸带折线" });

    fireEvent.pointerDown(crease, { pointerId: 58, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(crease, { pointerId: 58, clientX: 100, clientY: 70 });

    expect(scene).toHaveAttribute("data-fold-progress", "50");
    expect(scene).toHaveAttribute("data-letter-state", "transition");
    expect(screen.getByTestId("bend-command-back-052")).toHaveAttribute("data-visible", "true");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("snaps one broad upward fold into HUSH and arms once", () => {
    const onArm = vi.fn();
    renderScene({ slug: "bend-command", onArm });
    const scene = screen.getByTestId("v2-scene-052");
    const crease = screen.getByRole("button", { name: "命令纸带折线" });

    fireEvent.pointerDown(crease, { pointerId: 59, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(crease, { pointerId: 59, clientX: 104, clientY: 40 });
    fireEvent.pointerUp(crease, { pointerId: 59, clientX: 104, clientY: 40 });

    expect(scene).toHaveAttribute("data-fold-progress", "100");
    expect(scene).toHaveAttribute("data-visible-command", "HUSH");
    expect(scene).toHaveAttribute("data-letter-state", "quiet");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("uses Enter on the visible crease as the equivalent single fold", () => {
    const onArm = vi.fn();
    renderScene({ slug: "bend-command", onArm });
    const crease = screen.getByRole("button", { name: "命令纸带折线" });
    crease.focus();

    fireEvent.keyDown(crease, { key: "Enter" });

    expect(screen.getByTestId("v2-scene-052")).toHaveAttribute("data-input-mode", "keyboard-fold");
    expect(screen.getByTestId("v2-scene-052")).toHaveAttribute("data-visible-command", "HUSH");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 053", () => {
  function mockOverrideBounds() {
    const scene = screen.getByTestId("v2-scene-053");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 200, bottom: 200, left: 0, width: 200, height: 200,
      toJSON: () => undefined,
    });
    return scene;
  }

  it("shows two contrary bilingual rings, one loose pin, and a shared empty axle", () => {
    renderScene({ slug: "override-command" });
    const scene = screen.getByTestId("v2-scene-053");

    expect(scene).toHaveAttribute("data-spatial-model", "counter-rotating-bilingual-rings-shared-axle");
    expect(scene).toHaveAttribute("data-motion", "opposed");
    expect(scene).toHaveAttribute("data-pin-state", "loose");
    expect(screen.getAllByRole("button", { name: /纸环/ })).toHaveLength(2);
    expect(screen.getAllByTestId(/override-ring-direction-/)).toHaveLength(2);
    expect(screen.getByTestId("override-shared-axle-053")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "松开的纸轴钉" })).toBeInTheDocument();
    expect(screen.queryByText("快慢同意")).not.toBeInTheDocument();
  });

  it("does not accept clicking or separately pressing either ring", () => {
    const onArm = vi.fn();
    renderScene({ slug: "override-command", onArm });
    const scene = screen.getByTestId("v2-scene-053");

    screen.getAllByRole("button", { name: /纸环/ }).forEach((ring) => fireEvent.click(ring));

    expect(scene).toHaveAttribute("data-ring-transfers", "0");
    expect(scene).toHaveAttribute("data-motion", "opposed");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("transfers a dragged ring's speed to the other ring without stopping either", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "override-command", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-053");
    const outer = screen.getByRole("button", { name: "外层 SLOW 纸环" });

    fireEvent.pointerDown(outer, { pointerId: 60, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(outer, { pointerId: 60, clientX: 60, clientY: 0 });
    fireEvent.pointerUp(outer, { pointerId: 60, clientX: 60, clientY: 0 });

    expect(scene).toHaveAttribute("data-ring-transfers", "1");
    expect(scene).toHaveAttribute("data-motion", "opposed");
    expect(scene).toHaveAttribute("data-speed-relation", "transferred");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("tilts and returns a pin dropped on the ring instead of the shared axle", () => {
    const onArm = vi.fn();
    renderScene({ slug: "override-command", onArm });
    const scene = mockOverrideBounds();
    const pin = screen.getByRole("button", { name: "松开的纸轴钉" });

    fireEvent.pointerDown(pin, { pointerId: 61, clientX: 164, clientY: 144 });
    fireEvent.pointerMove(pin, { pointerId: 61, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(pin, { pointerId: 61, clientX: 150, clientY: 100 });

    expect(scene).toHaveAttribute("data-pin-state", "tilted");
    expect(scene).toHaveAttribute("data-pin-x", "82");
    expect(scene).toHaveAttribute("data-pin-y", "72");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("locks the loose pin only inside the shared central axle and cancels both rotations", () => {
    const onArm = vi.fn();
    renderScene({ slug: "override-command", onArm });
    const scene = mockOverrideBounds();
    const pin = screen.getByRole("button", { name: "松开的纸轴钉" });

    fireEvent.pointerDown(pin, { pointerId: 62, clientX: 164, clientY: 144 });
    fireEvent.pointerMove(pin, { pointerId: 62, clientX: 100, clientY: 100 });
    fireEvent.pointerUp(pin, { pointerId: 62, clientX: 100, clientY: 100 });

    expect(scene).toHaveAttribute("data-pin-state", "locked");
    expect(scene).toHaveAttribute("data-pin-x", "50");
    expect(scene).toHaveAttribute("data-pin-y", "50");
    expect(scene).toHaveAttribute("data-motion", "still");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("moves the same visible pin to the axle with directions and Enter", () => {
    const onArm = vi.fn();
    renderScene({ slug: "override-command", onArm });
    const scene = screen.getByTestId("v2-scene-053");
    const pin = screen.getByRole("button", { name: "松开的纸轴钉" });
    pin.focus();

    fireEvent.keyDown(pin, { key: "ArrowLeft" });
    fireEvent.keyDown(pin, { key: "ArrowLeft" });
    fireEvent.keyDown(pin, { key: "ArrowUp" });
    fireEvent.keyDown(pin, { key: "Enter" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-pin");
    expect(scene).toHaveAttribute("data-pin-state", "locked");
    expect(scene).toHaveAttribute("data-motion", "still");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 054", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function mockHybridBounds() {
    const scene = screen.getByTestId("v2-scene-054");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 200, bottom: 200, left: 0, width: 200, height: 200,
      toJSON: () => undefined,
    });
    return scene;
  }

  function orbitRibbon(ribbon: HTMLElement, pointerId = 72) {
    fireEvent.pointerDown(ribbon, { pointerId, clientX: 160, clientY: 100 });
    fireEvent.pointerMove(ribbon, { pointerId, clientX: 100, clientY: 160 });
    fireEvent.pointerMove(ribbon, { pointerId, clientX: 40, clientY: 100 });
    fireEvent.pointerMove(ribbon, { pointerId, clientX: 100, clientY: 40 });
    fireEvent.pointerMove(ribbon, { pointerId, clientX: 160, clientY: 100 });
    fireEvent.pointerUp(ribbon, { pointerId, clientX: 160, clientY: 100 });
  }

  it("shows one pressable paper axle and one loose ribbon with a continuous broad orbit", () => {
    renderScene({ slug: "hybrid-console" });
    const scene = screen.getByTestId("v2-scene-054");

    expect(scene).toHaveAttribute("data-spatial-model", "held-axis-continuous-ribbon-orbit");
    expect(scene).toHaveAttribute("data-axis-state", "free");
    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(screen.getByRole("button", { name: "中央按压纸轴" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "松散丝带端" })).toBeInTheDocument();
    expect(screen.getAllByTestId(/hybrid-orbit-segment-/)).toHaveLength(4);
    expect(screen.queryByText("一只手按住，另一只手绕行")).not.toBeInTheDocument();
  });

  it("rebounds a complete ribbon orbit when the axle is not held", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "hybrid-console", onDiscover, onArm });
    const scene = mockHybridBounds();

    orbitRibbon(screen.getByRole("button", { name: "松散丝带端" }));

    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-route-state", "rebounded");
    expect(scene).toHaveAttribute("data-rebounds", "1");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not solve by holding the axle without moving the ribbon", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hybrid-console", onArm });
    const scene = screen.getByTestId("v2-scene-054");
    const axle = screen.getByRole("button", { name: "中央按压纸轴" });

    fireEvent.pointerDown(axle, { pointerId: 73, clientX: 100, clientY: 100 });

    expect(scene).toHaveAttribute("data-axis-state", "held");
    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.pointerUp(axle, { pointerId: 73 });
  });

  it("discards a partial orbit when the axle is released instead of accumulating two halves", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hybrid-console", onArm });
    const scene = mockHybridBounds();
    const axle = screen.getByRole("button", { name: "中央按压纸轴" });
    const ribbon = screen.getByRole("button", { name: "松散丝带端" });

    fireEvent.pointerDown(axle, { pointerId: 74, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(ribbon, { pointerId: 75, clientX: 160, clientY: 100 });
    fireEvent.pointerMove(ribbon, { pointerId: 75, clientX: 100, clientY: 160 });
    fireEvent.pointerMove(ribbon, { pointerId: 75, clientX: 40, clientY: 100 });
    expect(scene).toHaveAttribute("data-route-progress", "2");

    fireEvent.pointerUp(axle, { pointerId: 74 });
    expect(scene).toHaveAttribute("data-route-progress", "0");
    fireEvent.pointerMove(ribbon, { pointerId: 75, clientX: 100, clientY: 40 });
    fireEvent.pointerMove(ribbon, { pointerId: 75, clientX: 160, clientY: 100 });
    fireEvent.pointerUp(ribbon, { pointerId: 75, clientX: 160, clientY: 100 });

    expect(onArm).not.toHaveBeenCalled();
  });

  it("arms only while the axle remains held throughout one broad ribbon orbit", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hybrid-console", onArm });
    const scene = mockHybridBounds();
    const axle = screen.getByRole("button", { name: "中央按压纸轴" });

    fireEvent.pointerDown(axle, { pointerId: 76, clientX: 100, clientY: 100 });
    orbitRibbon(screen.getByRole("button", { name: "松散丝带端" }), 77);

    expect(scene).toHaveAttribute("data-axis-state", "held");
    expect(scene).toHaveAttribute("data-route-progress", "4");
    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports holding the same visible axle with pointer while directions move the ribbon", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hybrid-console", onArm });
    const scene = screen.getByTestId("v2-scene-054");
    const axle = screen.getByRole("button", { name: "中央按压纸轴" });

    fireEvent.pointerDown(axle, { pointerId: 78 });
    ["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight"].forEach((key) => fireEvent.keyDown(axle, { key }));

    expect(scene).toHaveAttribute("data-input-mode", "pointer-keyboard");
    expect(scene).toHaveAttribute("data-route-progress", "4");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers the five-second axle latch only when reduced motion is requested", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const onArm = vi.fn();
    renderScene({ slug: "hybrid-console", onArm });
    const scene = screen.getByTestId("v2-scene-054");
    const axle = screen.getByRole("button", { name: "中央按压纸轴" });

    fireEvent.keyDown(axle, { key: " " });
    act(() => vi.advanceTimersByTime(5_000));
    fireEvent.keyUp(axle, { key: " " });
    expect(scene).toHaveAttribute("data-axis-state", "latched");

    ["ArrowDown", "ArrowLeft", "ArrowUp", "ArrowRight"].forEach((key) => fireEvent.keyDown(axle, { key }));
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 055", () => {
  function mockNineteenBounds() {
    const scene = screen.getByTestId("v2-scene-055");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 200, bottom: 200, left: 0, width: 200, height: 200,
      toJSON: () => undefined,
    });
    return scene;
  }

  it("shows separate translucent one and nine faces whose inner cuts cast one shared shadow", () => {
    renderScene({ slug: "nineteen-code" });
    const scene = screen.getByTestId("v2-scene-055");

    expect(scene).toHaveAttribute("data-spatial-model", "overlapping-nineteen-reveals-shadow-ten");
    expect(scene).toHaveAttribute("data-front-distance", "40");
    expect(scene).toHaveAttribute("data-shadow-state", "merged");
    expect(screen.getByRole("button", { name: "半透明数字一" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "半透明数字九" })).toBeInTheDocument();
    expect(screen.getByTestId("nineteen-shadow-one-055")).toBeInTheDocument();
    expect(screen.getByTestId("nineteen-shadow-zero-055")).toBeInTheDocument();
    expect(screen.queryByText("十九之间")).not.toBeInTheDocument();
  });

  it("does not accept clicking either digit or typing the visible arithmetic values", () => {
    const onArm = vi.fn();
    renderScene({ slug: "nineteen-code", onArm });
    const scene = screen.getByTestId("v2-scene-055");

    screen.getAllByRole("button").forEach((button) => fireEvent.click(button));
    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "9" });
    fireEvent.keyDown(window, { key: "0" });

    expect(scene).toHaveAttribute("data-front-distance", "40");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("makes the front clearer and keeps the shadow merged when the digits are dragged apart", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "nineteen-code", onDiscover, onArm });
    const scene = mockNineteenBounds();
    const one = screen.getByRole("button", { name: "半透明数字一" });

    fireEvent.pointerDown(one, { pointerId: 80, clientX: 60, clientY: 90 });
    fireEvent.pointerMove(one, { pointerId: 80, clientX: 20, clientY: 90 });
    fireEvent.pointerUp(one, { pointerId: 80, clientX: 20, clientY: 90 });

    expect(scene).toHaveAttribute("data-front-legibility", "clear");
    expect(scene).toHaveAttribute("data-shadow-state", "merged");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals a separating one and zero at partial overlap without solving early", () => {
    const onArm = vi.fn();
    renderScene({ slug: "nineteen-code", onArm });
    const scene = mockNineteenBounds();
    const one = screen.getByRole("button", { name: "半透明数字一" });

    fireEvent.pointerDown(one, { pointerId: 81, clientX: 60, clientY: 90 });
    fireEvent.pointerMove(one, { pointerId: 81, clientX: 100, clientY: 90 });
    fireEvent.pointerUp(one, { pointerId: 81, clientX: 100, clientY: 90 });

    expect(scene).toHaveAttribute("data-front-distance", "20");
    expect(scene).toHaveAttribute("data-shadow-state", "parting");
    expect(scene).toHaveAttribute("data-front-legibility", "crowded");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("accepts a broad overlap where the front becomes obscure and its shadow clearly reads ten", () => {
    const onArm = vi.fn();
    renderScene({ slug: "nineteen-code", onArm });
    const scene = mockNineteenBounds();
    const one = screen.getByRole("button", { name: "半透明数字一" });

    fireEvent.pointerDown(one, { pointerId: 82, clientX: 60, clientY: 90 });
    fireEvent.pointerMove(one, { pointerId: 82, clientX: 125, clientY: 90 });
    fireEvent.pointerUp(one, { pointerId: 82, clientX: 125, clientY: 90 });

    expect(scene).toHaveAttribute("data-front-distance", "8");
    expect(scene).toHaveAttribute("data-front-legibility", "obscured");
    expect(scene).toHaveAttribute("data-shadow-state", "clear-10");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("moves the same visible digit faces inward with directions instead of a number input", () => {
    const onArm = vi.fn();
    renderScene({ slug: "nineteen-code", onArm });
    const scene = screen.getByTestId("v2-scene-055");
    const one = screen.getByRole("button", { name: "半透明数字一" });
    const nine = screen.getByRole("button", { name: "半透明数字九" });

    one.focus();
    fireEvent.keyDown(one, { key: "ArrowRight" });
    fireEvent.keyDown(one, { key: "ArrowRight" });
    nine.focus();
    fireEvent.keyDown(nine, { key: "ArrowLeft" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-overlap");
    expect(scene).toHaveAttribute("data-shadow-state", "clear-10");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 056", () => {
  function mockHundredBounds() {
    const scene = screen.getByTestId("v2-scene-056");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 200, bottom: 200, left: 0, width: 200, height: 200,
      toJSON: () => undefined,
    });
    return scene;
  }

  function dragDot(dot: HTMLElement, pointerId: number, x: number, y = 90) {
    fireEvent.pointerDown(dot, { pointerId, clientX: 40, clientY: 160 });
    fireEvent.pointerMove(dot, { pointerId, clientX: x, clientY: y });
    fireEvent.pointerUp(dot, { pointerId, clientX: x, clientY: y });
  }

  it("shows one 1000 paper strip, four after-digit gaps, and a loose ink speck below it", () => {
    renderScene({ slug: "hundred-code" });
    const scene = screen.getByTestId("v2-scene-056");

    expect(scene).toHaveAttribute("data-spatial-model", "loose-speck-becomes-decimal-in-number-strip");
    expect(scene).toHaveAttribute("data-dot-state", "loose");
    expect(scene).toHaveAttribute("data-display-preview", "none");
    expect(screen.getAllByTestId(/hundred-digit-/)).toHaveLength(4);
    expect(screen.getAllByTestId(/hundred-gap-/)).toHaveLength(4);
    expect(screen.getByRole("button", { name: "纸带下方的小墨点" })).toBeInTheDocument();
    expect(screen.queryByText("移动小数点")).not.toBeInTheDocument();
  });

  it("does not accept clicking the speck or typing one thousand and ten", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hundred-code", onArm });
    const scene = screen.getByTestId("v2-scene-056");
    const dot = screen.getByRole("button", { name: "纸带下方的小墨点" });

    fireEvent.click(dot);
    ["1", "0", "0", "0", "1", "0"].forEach((key) => fireEvent.keyDown(window, { key }));

    expect(scene).toHaveAttribute("data-selected-gap", "none");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps a readable wrong preview after the speck is dropped in the first gap", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "hundred-code", onDiscover, onArm });
    const scene = mockHundredBounds();
    const dot = screen.getByRole("button", { name: "纸带下方的小墨点" });

    dragDot(dot, 83, 72);

    expect(scene).toHaveAttribute("data-selected-gap", "0");
    expect(scene).toHaveAttribute("data-dot-state", "preview");
    expect(scene).toHaveAttribute("data-display-preview", "1.000");
    expect(scene).toHaveAttribute("data-decimal-state", "punctuation");
    expect(onDiscover).toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("updates rather than clears the preview when the dot moves to another wrong gap", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hundred-code", onArm });
    const scene = mockHundredBounds();
    const dot = screen.getByRole("button", { name: "纸带下方的小墨点" });

    dragDot(dot, 84, 72);
    fireEvent.pointerDown(dot, { pointerId: 85, clientX: 72, clientY: 90 });
    fireEvent.pointerMove(dot, { pointerId: 85, clientX: 128, clientY: 90 });
    fireEvent.pointerUp(dot, { pointerId: 85, clientX: 128, clientY: 90 });

    expect(scene).toHaveAttribute("data-selected-gap", "2");
    expect(scene).toHaveAttribute("data-display-preview", "100.0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("arms in a broad second gap where the strip reads exactly 10.00", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hundred-code", onArm });
    const scene = mockHundredBounds();

    dragDot(screen.getByRole("button", { name: "纸带下方的小墨点" }), 86, 100);

    expect(scene).toHaveAttribute("data-selected-gap", "1");
    expect(scene).toHaveAttribute("data-dot-state", "placed");
    expect(scene).toHaveAttribute("data-display-preview", "10.00");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("moves the same visible speck across after-digit gaps with directions", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hundred-code", onArm });
    const scene = screen.getByTestId("v2-scene-056");
    const dot = screen.getByRole("button", { name: "纸带下方的小墨点" });
    dot.focus();

    fireEvent.keyDown(dot, { key: "ArrowRight" });
    expect(scene).toHaveAttribute("data-display-preview", "1.000");
    fireEvent.keyDown(dot, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-gap");
    expect(scene).toHaveAttribute("data-display-preview", "10.00");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 057", () => {
  function mockFiveBitBounds() {
    const scene = screen.getByTestId("v2-scene-057");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 200, bottom: 200, left: 0, width: 200, height: 200,
      toJSON: () => undefined,
    });
    return scene;
  }

  function dragLight(light: HTMLElement, pointerId: number, x: number, y = 34) {
    fireEvent.pointerDown(light, { pointerId, clientX: 36, clientY: 34 });
    fireEvent.pointerMove(light, { pointerId, clientX: x, clientY: y });
    fireEvent.pointerUp(light, { pointerId, clientX: x, clientY: y });
  }

  it("renders five textured bit faces, five separate shadows, one shared lamp, and no answer label", () => {
    renderScene({ slug: "five-bit-latch" });
    const scene = screen.getByTestId("v2-scene-057");

    expect(scene).toHaveAttribute("data-spatial-model", "shared-light-aligns-palindromic-bit-shadows");
    expect(scene).toHaveAttribute("data-face-sequence", "10110");
    expect(scene).toHaveAttribute("data-composite-sequence", "scrambled");
    expect(screen.getAllByTestId(/five-bit-face-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/five-bit-shadow-/)).toHaveLength(5);
    expect(screen.getByRole("button", { name: "纸槽上方的共享光源" })).toBeInTheDocument();
    expect(screen.queryByText(/公平的位置|move the light/i)).not.toBeInTheDocument();
  });

  it("springs individual bit faces back instead of letting five clicks become progress", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-bit-latch", onArm });
    const scene = screen.getByTestId("v2-scene-057");

    screen.getAllByRole("button", { name: /位元片/ }).forEach((chip) => fireEvent.click(chip));

    expect(scene).toHaveAttribute("data-face-sequence", "10110");
    expect(scene).toHaveAttribute("data-chip-feedback", "sprung-back");
    expect(scene).toHaveAttribute("data-latched-pairs", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("moves all five shadows together when the shared light moves off center", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "five-bit-latch", onDiscover, onArm });
    const scene = mockFiveBitBounds();

    dragLight(screen.getByRole("button", { name: "纸槽上方的共享光源" }), 90, 150);

    expect(scene).toHaveAttribute("data-light-state", "right-offset");
    expect(scene).toHaveAttribute("data-shadow-offset", "positive");
    expect(scene).toHaveAttribute("data-composite-sequence", "scrambled");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("presses one outer pair near the center without solving early", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-bit-latch", onArm });
    const scene = mockFiveBitBounds();

    dragLight(screen.getByRole("button", { name: "纸槽上方的共享光源" }), 91, 84);

    expect(scene).toHaveAttribute("data-light-state", "near-center");
    expect(scene).toHaveAttribute("data-latched-pairs", "1");
    expect(scene).toHaveAttribute("data-composite-sequence", "forming");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("closes the paper slot only when the one shared light reaches the broad center", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-bit-latch", onArm });
    const scene = mockFiveBitBounds();

    dragLight(screen.getByRole("button", { name: "纸槽上方的共享光源" }), 92, 100);

    expect(scene).toHaveAttribute("data-light-state", "centered");
    expect(scene).toHaveAttribute("data-latched-pairs", "2");
    expect(scene).toHaveAttribute("data-composite-sequence", "10101");
    expect(scene).toHaveAttribute("data-slot-state", "closed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("moves the same visible shared light with direction keys", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-bit-latch", onArm });
    const scene = screen.getByTestId("v2-scene-057");
    const light = screen.getByRole("button", { name: "纸槽上方的共享光源" });
    light.focus();

    fireEvent.keyDown(light, { key: "ArrowRight" });
    expect(scene).toHaveAttribute("data-latched-pairs", "1");
    fireEvent.keyDown(light, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-light");
    expect(scene).toHaveAttribute("data-composite-sequence", "10101");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 058", () => {
  function mockCipherBounds() {
    const scene = screen.getByTestId("v2-scene-058");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 240, bottom: 180, left: 0, width: 240, height: 180,
      toJSON: () => undefined,
    });
    return scene;
  }

  function dragFold(corner: HTMLElement, pointerId: number, x: number) {
    fireEvent.pointerDown(corner, { pointerId, clientX: 210, clientY: 40 });
    fireEvent.pointerMove(corner, { pointerId, clientX: x, clientY: 80 });
    fireEvent.pointerUp(corner, { pointerId, clientX: x, clientY: 80 });
  }

  it("renders one transparent word strip with a reversed face, rear shadow, and one fold corner", () => {
    renderScene({ slug: "cipher-reversal" });
    const scene = screen.getByTestId("v2-scene-058");

    expect(scene).toHaveAttribute("data-spatial-model", "one-transparent-strip-flips-as-a-whole");
    expect(scene).toHaveAttribute("data-front-order", "WOLS");
    expect(scene).toHaveAttribute("data-rear-order", "SLOW");
    expect(scene).toHaveAttribute("data-flip-state", "front");
    expect(screen.getAllByTestId(/cipher-glyph-/)).toHaveLength(4);
    expect(screen.getByTestId("cipher-rear-shadow")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "透明词带的折角" })).toBeInTheDocument();
    expect(screen.queryByText(/整条翻面|flip the whole/i)).not.toBeInTheDocument();
  });

  it("does not accept four glyph clicks or typing slow", () => {
    const onArm = vi.fn();
    renderScene({ slug: "cipher-reversal", onArm });
    const scene = screen.getByTestId("v2-scene-058");

    screen.getAllByRole("button", { name: /透明字片/ }).forEach((glyph) => fireEvent.click(glyph));
    ["s", "l", "o", "w"].forEach((key) => fireEvent.keyDown(window, { key }));

    expect(scene).toHaveAttribute("data-flip-state", "front");
    expect(scene).toHaveAttribute("data-letter-offset", "none");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("lets an individual glyph drift only far enough to make the rear shadow less readable", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "cipher-reversal", onDiscover, onArm });
    mockCipherBounds();
    const glyph = screen.getByRole("button", { name: "透明字片 2" });

    fireEvent.pointerDown(glyph, { pointerId: 93, clientX: 80, clientY: 90 });
    fireEvent.pointerMove(glyph, { pointerId: 93, clientX: 112, clientY: 104 });
    fireEvent.pointerUp(glyph, { pointerId: 93, clientX: 112, clientY: 104 });

    expect(screen.getByTestId("v2-scene-058")).toHaveAttribute("data-letter-offset", "disturbed");
    expect(screen.getByTestId("v2-scene-058")).toHaveAttribute("data-shadow-legibility", "worse");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows both reading directions during a partial whole-strip fold and snaps back", () => {
    const onArm = vi.fn();
    renderScene({ slug: "cipher-reversal", onArm });
    mockCipherBounds();
    const corner = screen.getByRole("button", { name: "透明词带的折角" });

    fireEvent.pointerDown(corner, { pointerId: 94, clientX: 210, clientY: 40 });
    fireEvent.pointerMove(corner, { pointerId: 94, clientX: 145, clientY: 70 });
    expect(screen.getByTestId("v2-scene-058")).toHaveAttribute("data-flip-state", "half");
    expect(screen.getByTestId("v2-scene-058")).toHaveAttribute("data-reading-directions", "both");
    fireEvent.pointerUp(corner, { pointerId: 94, clientX: 145, clientY: 70 });

    expect(screen.getByTestId("v2-scene-058")).toHaveAttribute("data-flip-state", "front");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("arms after one broad whole-strip flip from the folded corner", () => {
    const onArm = vi.fn();
    renderScene({ slug: "cipher-reversal", onArm });
    mockCipherBounds();

    dragFold(screen.getByRole("button", { name: "透明词带的折角" }), 95, 55);

    expect(screen.getByTestId("v2-scene-058")).toHaveAttribute("data-flip-state", "back");
    expect(screen.getByTestId("v2-scene-058")).toHaveAttribute("data-reading-directions", "rear-forward");
    expect(screen.getByTestId("v2-scene-058")).toHaveAttribute("data-visible-order", "SLOW");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("flips the same visible strip with Enter instead of opening a text input", () => {
    const onArm = vi.fn();
    renderScene({ slug: "cipher-reversal", onArm });
    const scene = screen.getByTestId("v2-scene-058");
    const corner = screen.getByRole("button", { name: "透明词带的折角" });
    corner.focus();

    fireEvent.keyDown(corner, { key: "Enter" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-fold");
    expect(scene).toHaveAttribute("data-visible-order", "SLOW");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 059", () => {
  function mockClockBounds() {
    const scene = screen.getByTestId("v2-scene-059");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 200, bottom: 200, left: 0, width: 200, height: 200,
      toJSON: () => undefined,
    });
    return scene;
  }

  function pointForTick(tick: number) {
    const angle = tick * 36 - 90;
    return { x: 100 + Math.cos(angle * Math.PI / 180) * 72, y: 100 + Math.sin(angle * Math.PI / 180) * 72 };
  }

  function dragArc(arc: HTMLElement, pointerId: number, tick: number) {
    const target = pointForTick(tick);
    fireEvent.pointerDown(arc, { pointerId, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(arc, { pointerId, clientX: target.x, clientY: target.y });
    fireEvent.pointerUp(arc, { pointerId, clientX: target.x, clientY: target.y });
  }

  it("renders one ten-tick clock with three movable arcs spanning two, three, and five ticks", () => {
    renderScene({ slug: "chronos-command" });
    const scene = screen.getByTestId("v2-scene-059");

    expect(scene).toHaveAttribute("data-spatial-model", "three-arcs-cover-one-ten-tick-cycle");
    expect(scene).toHaveAttribute("data-arc-lengths", "2,3,5");
    expect(scene).toHaveAttribute("data-arc-starts", "0,4,8");
    expect(screen.getAllByTestId(/clock-sum-arc-/)).toHaveLength(3);
    expect(screen.getAllByTestId(/clock-sum-tick-/)).toHaveLength(10);
    expect(screen.getByTestId("clock-sum-center")).toHaveTextContent("10");
    expect(screen.queryByText(/让 2、3、5|cover ten/i)).not.toBeInTheDocument();
  });

  it("does not treat clicking the three arc values as the old 2-3-5 command", () => {
    const onArm = vi.fn();
    renderScene({ slug: "chronos-command", onArm });
    const scene = screen.getByTestId("v2-scene-059");

    screen.getAllByRole("button", { name: /刻度弧片/ }).forEach((arc) => fireEvent.click(arc));

    expect(scene).toHaveAttribute("data-arc-starts", "0,4,8");
    expect(scene).toHaveAttribute("data-coverage-state", "overlap-and-gaps");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("merges count dots where two arcs overlap without solving", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "chronos-command", onDiscover, onArm });
    mockClockBounds();

    dragArc(screen.getByRole("button", { name: "三格刻度弧片" }), 96, 0);

    expect(screen.getByTestId("v2-scene-059")).toHaveAttribute("data-arc-starts", "0,0,8");
    expect(screen.getByTestId("v2-scene-059")).toHaveAttribute("data-coverage-state", "overlap-and-gaps");
    expect(screen.getByTestId("clock-sum-tick-0")).toHaveAttribute("data-count", "3");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("arms when the three arc lengths meet head to tail across all ten ticks", () => {
    const onArm = vi.fn();
    renderScene({ slug: "chronos-command", onArm });
    mockClockBounds();

    dragArc(screen.getByRole("button", { name: "三格刻度弧片" }), 97, 2);
    expect(screen.getByTestId("v2-scene-059")).toHaveAttribute("data-coverage-state", "forming");
    dragArc(screen.getByRole("button", { name: "五格刻度弧片" }), 98, 5);

    expect(screen.getByTestId("v2-scene-059")).toHaveAttribute("data-arc-starts", "0,2,5");
    expect(screen.getByTestId("v2-scene-059")).toHaveAttribute("data-coverage-state", "complete-cycle");
    expect(screen.getByTestId("v2-scene-059")).toHaveAttribute("data-merged-dots", "10");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("accepts a rotation-equivalent complete cycle with no fixed starting tick", () => {
    const onArm = vi.fn();
    renderScene({ slug: "chronos-command", onArm });
    mockClockBounds();

    dragArc(screen.getByRole("button", { name: "两格刻度弧片" }), 99, 1);
    dragArc(screen.getByRole("button", { name: "三格刻度弧片" }), 100, 3);
    dragArc(screen.getByRole("button", { name: "五格刻度弧片" }), 101, 6);

    expect(screen.getByTestId("v2-scene-059")).toHaveAttribute("data-arc-starts", "1,3,6");
    expect(screen.getByTestId("v2-scene-059")).toHaveAttribute("data-coverage-state", "complete-cycle");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("rotates the same visible arc handles by keyboard ticks", () => {
    const onArm = vi.fn();
    renderScene({ slug: "chronos-command", onArm });
    const scene = screen.getByTestId("v2-scene-059");
    const three = screen.getByRole("button", { name: "三格刻度弧片" });
    const five = screen.getByRole("button", { name: "五格刻度弧片" });
    three.focus();
    fireEvent.keyDown(three, { key: "ArrowLeft" });
    fireEvent.keyDown(three, { key: "ArrowLeft" });
    five.focus();
    fireEvent.keyDown(five, { key: "ArrowLeft" });
    fireEvent.keyDown(five, { key: "ArrowLeft" });
    fireEvent.keyDown(five, { key: "ArrowLeft" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-arc");
    expect(scene).toHaveAttribute("data-arc-starts", "0,2,5");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 060", () => {
  function mockKnotBounds() {
    const scene = screen.getByTestId("v2-scene-060");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 240, bottom: 180, left: 0, width: 240, height: 180,
      toJSON: () => undefined,
    });
    return scene;
  }

  it("renders one printed ribbon, one embossed crossing, and two free ends", () => {
    renderScene({ slug: "cipher-knot" });
    const scene = screen.getByTestId("v2-scene-060");

    expect(scene).toHaveAttribute("data-spatial-model", "one-ribbon-one-wrong-over-under-crossing");
    expect(scene).toHaveAttribute("data-knot-state", "crossed");
    expect(scene).toHaveAttribute("data-reading-order", "fragmented");
    expect(scene).toHaveAttribute("data-target-reading", "PAUSE");
    expect(screen.getAllByTestId(/cipher-knot-end-/)).toHaveLength(2);
    expect(screen.getByTestId("cipher-knot-crossing")).toBeInTheDocument();
    expect(screen.queryByText(/只换中央|swap the crossing/i)).not.toBeInTheDocument();
  });

  it("does not accept clicking the crossing, clicking both ends, or typing pause", () => {
    const onArm = vi.fn();
    renderScene({ slug: "cipher-knot", onArm });
    const scene = screen.getByTestId("v2-scene-060");

    fireEvent.click(screen.getByTestId("cipher-knot-crossing"));
    screen.getAllByRole("button", { name: /丝带自由端/ }).forEach((end) => fireEvent.click(end));
    ["p", "a", "u", "s", "e"].forEach((key) => fireEvent.keyDown(window, { key }));

    expect(scene).toHaveAttribute("data-knot-state", "crossed");
    expect(scene).toHaveAttribute("data-reading-order", "fragmented");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("changes the fragmented spacing when one free end is pulled without swapping layers", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "cipher-knot", onDiscover, onArm });
    mockKnotBounds();
    const end = screen.getByRole("button", { name: "左侧丝带自由端" });

    fireEvent.pointerDown(end, { pointerId: 102, clientX: 32, clientY: 100 });
    fireEvent.pointerMove(end, { pointerId: 102, clientX: 12, clientY: 100 });
    fireEvent.pointerUp(end, { pointerId: 102, clientX: 12, clientY: 100 });

    expect(screen.getByTestId("v2-scene-060")).toHaveAttribute("data-knot-state", "tensioned");
    expect(screen.getByTestId("v2-scene-060")).toHaveAttribute("data-reading-order", "shifting");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects crossing the center without changing the over-under side", () => {
    const onArm = vi.fn();
    renderScene({ slug: "cipher-knot", onArm });
    mockKnotBounds();
    const end = screen.getByRole("button", { name: "左侧丝带自由端" });

    fireEvent.pointerDown(end, { pointerId: 103, clientX: 32, clientY: 100 });
    fireEvent.pointerMove(end, { pointerId: 103, clientX: 120, clientY: 95 });
    fireEvent.pointerUp(end, { pointerId: 103, clientX: 190, clientY: 98 });

    expect(screen.getByTestId("v2-scene-060")).toHaveAttribute("data-crossing-layer", "wrong-over");
    expect(screen.getByTestId("v2-scene-060")).toHaveAttribute("data-reading-order", "shifting");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("unties after one free end passes the crossing and changes vertical layer", () => {
    const onArm = vi.fn();
    renderScene({ slug: "cipher-knot", onArm });
    mockKnotBounds();
    const end = screen.getByRole("button", { name: "左侧丝带自由端" });

    fireEvent.pointerDown(end, { pointerId: 104, clientX: 32, clientY: 100 });
    fireEvent.pointerMove(end, { pointerId: 104, clientX: 120, clientY: 62 });
    fireEvent.pointerUp(end, { pointerId: 104, clientX: 190, clientY: 132 });

    expect(screen.getByTestId("v2-scene-060")).toHaveAttribute("data-knot-state", "untied");
    expect(screen.getByTestId("v2-scene-060")).toHaveAttribute("data-crossing-layer", "corrected");
    expect(screen.getByTestId("v2-scene-060")).toHaveAttribute("data-reading-order", "PAUSE");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("switches the same visible crossing layer from a focused end with Enter", () => {
    const onArm = vi.fn();
    renderScene({ slug: "cipher-knot", onArm });
    const scene = screen.getByTestId("v2-scene-060");
    const end = screen.getByRole("button", { name: "右侧丝带自由端" });
    end.focus();

    fireEvent.keyDown(end, { key: "Enter" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-crossing");
    expect(scene).toHaveAttribute("data-crossing-layer", "corrected");
    expect(scene).toHaveAttribute("data-reading-order", "PAUSE");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 061", () => {
  function mockSweepBounds() {
    const scene = screen.getByTestId("v2-scene-061");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 240, bottom: 180, left: 0, width: 240, height: 180,
      toJSON: () => undefined,
    });
    return scene;
  }

  function dragScan(fromX: number, toX: number, pointerId: number) {
    const scan = screen.getByRole("slider", { name: "反向纸尺扫描线" });
    fireEvent.pointerDown(scan, { pointerId, clientX: fromX, clientY: 112 });
    fireEvent.pointerMove(scan, { pointerId, clientX: toX, clientY: 112 });
    fireEvent.pointerUp(scan, { pointerId, clientX: toX, clientY: 112 });
  }

  it("renders one reversed ruler, one missing tick, and an inverse cloud notch", () => {
    renderScene({ slug: "reverse-sweep" });
    const scene = screen.getByTestId("v2-scene-061");

    expect(scene).toHaveAttribute("data-spatial-model", "reversed-ruler-and-inverse-cloud-shadow");
    expect(scene).toHaveAttribute("data-direction-relation", "hand-right-shadow-left");
    expect(scene).toHaveAttribute("data-alignment-state", "separated");
    expect(screen.getAllByTestId(/reverse-sweep-tick-/)).toHaveLength(10);
    expect(screen.getAllByTestId(/reverse-sweep-tick-/).filter((tick) => tick.getAttribute("data-missing") === "true")).toHaveLength(1);
    expect(screen.getByTestId("reverse-sweep-cloud-notch")).toBeInTheDocument();
    expect(screen.queryByText(/你的手和影子|hand and shadow/i)).not.toBeInTheDocument();
  });

  it("does not accept clicks, typed answers, or accumulated back-and-forth distance", () => {
    const onArm = vi.fn();
    renderScene({ slug: "reverse-sweep", onArm });
    const scene = mockSweepBounds();
    const scan = screen.getByRole("slider", { name: "反向纸尺扫描线" });

    fireEvent.click(scan);
    ["s", "l", "o", "w"].forEach((key) => fireEvent.keyDown(window, { key }));
    dragScan(120, 48, 105);
    dragScan(48, 120, 106);

    expect(scene).toHaveAttribute("data-scan-position", "50");
    expect(scene).toHaveAttribute("data-cloud-notch-position", "50");
    expect(scene).toHaveAttribute("data-alignment-state", "separated");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("moves the cloud notch left when the scan line is dragged right", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "reverse-sweep", onDiscover, onArm });
    const scene = mockSweepBounds();

    dragScan(120, 156, 107);

    expect(scene).toHaveAttribute("data-input-mode", "pointer-scan");
    expect(scene).toHaveAttribute("data-scan-position", "65");
    expect(scene).toHaveAttribute("data-cloud-notch-position", "35");
    expect(scene).toHaveAttribute("data-alignment-state", "approaching");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps a wrong-direction move continuously correctable", () => {
    const onArm = vi.fn();
    renderScene({ slug: "reverse-sweep", onArm });
    const scene = mockSweepBounds();

    dragScan(120, 72, 108);
    expect(scene).toHaveAttribute("data-cloud-notch-position", "70");
    expect(scene).toHaveAttribute("data-alignment-state", "separated");
    dragScan(72, 172.8, 109);

    expect(scene).toHaveAttribute("data-cloud-notch-position", "28");
    expect(scene).toHaveAttribute("data-alignment-state", "aligned");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("arms only when the visible notch reaches the ruler's blank tick", () => {
    const onArm = vi.fn();
    renderScene({ slug: "reverse-sweep", onArm });
    const scene = mockSweepBounds();

    dragScan(120, 172.8, 110);

    expect(scene).toHaveAttribute("data-scan-position", "72");
    expect(scene).toHaveAttribute("data-cloud-notch-position", "28");
    expect(scene).toHaveAttribute("data-ruler-gap-position", "28");
    expect(scene).toHaveAttribute("data-alignment-state", "aligned");
    expect(scene).toHaveAttribute("data-warm-ticks", "2");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("uses wheel movement on the same visible scan relationship", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "reverse-sweep", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-061");

    fireEvent.wheel(scene, { deltaY: 100 });

    expect(scene).toHaveAttribute("data-input-mode", "wheel-scan");
    expect(scene).toHaveAttribute("data-scan-position", "56");
    expect(scene).toHaveAttribute("data-cloud-notch-position", "44");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reaches the same geometric alignment with keyboard arrows", () => {
    const onArm = vi.fn();
    renderScene({ slug: "reverse-sweep", onArm });
    const scene = screen.getByTestId("v2-scene-061");
    const scan = screen.getByRole("slider", { name: "反向纸尺扫描线" });
    scan.focus();

    for (let index = 0; index < 4; index += 1) fireEvent.keyDown(scan, { key: "ArrowRight" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-scan");
    expect(scene).toHaveAttribute("data-scan-position", "70");
    expect(scene).toHaveAttribute("data-cloud-notch-position", "30");
    expect(scene).toHaveAttribute("data-alignment-state", "aligned");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 062", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function mockEchoBounds() {
    const surface = screen.getByRole("application", { name: "纸影移动区" });
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 240, bottom: 180, left: 0, width: 240, height: 180,
      toJSON: () => undefined,
    });
    return surface;
  }

  it("renders one solid pointer, one delayed paper echo, and a shallow target well", () => {
    renderScene({ slug: "pointer-echo" });
    const scene = screen.getByTestId("v2-scene-062");

    expect(scene).toHaveAttribute("data-spatial-model", "solid-pointer-delayed-paper-echo-and-shallow-well");
    expect(scene).toHaveAttribute("data-solid-position", "22,68");
    expect(scene).toHaveAttribute("data-echo-position", "14,75");
    expect(scene).toHaveAttribute("data-target-state", "quiet");
    expect(screen.getByTestId("pointer-echo-solid")).toBeInTheDocument();
    expect(screen.getByTestId("pointer-echo-ghost")).toBeInTheDocument();
    expect(screen.getByTestId("pointer-echo-target")).toBeInTheDocument();
    expect(screen.getAllByTestId(/pointer-echo-trail-/)).toHaveLength(3);
    expect(screen.queryByText(/后面还有一个你|leave an echo/i)).not.toBeInTheDocument();
  });

  it("does not accept clicks or typed solution words", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pointer-echo", onArm });
    const surface = screen.getByRole("application", { name: "纸影移动区" });

    fireEvent.click(surface);
    ["e", "c", "h", "o"].forEach((key) => fireEvent.keyDown(window, { key }));

    expect(screen.getByTestId("v2-scene-062")).toHaveAttribute("data-target-state", "quiet");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows the echo catching up about 600ms after ordinary mouse movement", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    renderScene({ slug: "pointer-echo", onDiscover });
    const surface = mockEchoBounds();

    fireEvent.pointerMove(surface, { pointerId: 111, pointerType: "mouse", clientX: 108, clientY: 90 });
    expect(screen.getByTestId("v2-scene-062")).toHaveAttribute("data-solid-position", "45,50");
    expect(screen.getByTestId("v2-scene-062")).toHaveAttribute("data-echo-position", "14,75");
    act(() => vi.advanceTimersByTime(599));
    expect(screen.getByTestId("v2-scene-062")).toHaveAttribute("data-echo-position", "14,75");
    act(() => vi.advanceTimersByTime(1));

    expect(screen.getByTestId("v2-scene-062")).toHaveAttribute("data-echo-position", "45,50");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it("rejects the solid pointer even after its paper echo reaches the well", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pointer-echo", onArm });
    const surface = mockEchoBounds();

    fireEvent.pointerDown(surface, { pointerId: 112, pointerType: "touch", clientX: 168, clientY: 68.4 });
    act(() => vi.advanceTimersByTime(600));

    const scene = screen.getByTestId("v2-scene-062");
    expect(scene).toHaveAttribute("data-solid-position", "70,38");
    expect(scene).toHaveAttribute("data-echo-position", "70,38");
    expect(scene).toHaveAttribute("data-target-state", "solid-rejected");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("arms when the solid pointer leaves and its delayed echo lands in the well", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pointer-echo", onArm });
    const surface = mockEchoBounds();

    fireEvent.pointerDown(surface, { pointerId: 113, pointerType: "touch", clientX: 168, clientY: 68.4 });
    fireEvent.pointerMove(surface, { pointerId: 113, pointerType: "touch", clientX: 216, clientY: 144 });
    fireEvent.pointerUp(surface, { pointerId: 113, pointerType: "touch", clientX: 216, clientY: 144 });
    act(() => vi.advanceTimersByTime(599));
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));

    const scene = screen.getByTestId("v2-scene-062");
    expect(scene).toHaveAttribute("data-solid-position", "90,80");
    expect(scene).toHaveAttribute("data-echo-position", "70,38");
    expect(scene).toHaveAttribute("data-target-state", "echo-accepted");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("also accepts leaving after the echo has arrived under the solid pointer", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pointer-echo", onArm });
    const surface = mockEchoBounds();

    fireEvent.pointerDown(surface, { pointerId: 114, pointerType: "touch", clientX: 168, clientY: 68.4 });
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerMove(surface, { pointerId: 114, pointerType: "touch", clientX: 216, clientY: 144 });

    expect(screen.getByTestId("v2-scene-062")).toHaveAttribute("data-target-state", "echo-accepted");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("moves the same solid marker with arrow keys and preserves the delayed solve", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pointer-echo", onArm });
    const surface = screen.getByRole("application", { name: "纸影移动区" });
    surface.focus();

    for (let index = 0; index < 5; index += 1) fireEvent.keyDown(surface, { key: "ArrowRight" });
    for (let index = 0; index < 3; index += 1) fireEvent.keyDown(surface, { key: "ArrowUp" });
    fireEvent.keyDown(surface, { key: "ArrowRight" });
    act(() => vi.advanceTimersByTime(600));

    const scene = screen.getByTestId("v2-scene-062");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-marker");
    expect(scene).toHaveAttribute("data-target-state", "echo-accepted");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 063", () => {
  function mockZigzagBounds() {
    const scene = screen.getByTestId("v2-scene-063");
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, top: 0, right: 240, bottom: 180, left: 0, width: 240, height: 180,
      toJSON: () => undefined,
    });
    return scene;
  }

  function dragHead(toX: number, toY: number, pointerId: number) {
    const head = screen.getByRole("button", { name: "折线活动端" });
    fireEvent.pointerDown(head, { pointerId, clientX: 44, clientY: 40 });
    fireEvent.pointerMove(head, { pointerId, clientX: toX, clientY: toY });
    fireEvent.pointerUp(head, { pointerId, clientX: toX, clientY: toY });
  }

  it("renders four same-slope corner cuts and four disconnected seam segments", () => {
    renderScene({ slug: "corner-zigzag" });
    const scene = screen.getByTestId("v2-scene-063");

    expect(scene).toHaveAttribute("data-spatial-model", "four-corner-cuts-turn-one-broken-zigzag");
    expect(scene).toHaveAttribute("data-cut-orientation", "clockwise-forward-slash");
    expect(scene).toHaveAttribute("data-route-stage", "0");
    expect(screen.getAllByTestId(/corner-zigzag-cut-/)).toHaveLength(4);
    expect(screen.getAllByTestId(/corner-zigzag-segment-/)).toHaveLength(4);
    expect(screen.queryByText(/角不是终点|corner is not/i)).not.toBeInTheDocument();
  });

  it("does not advance from clicks or a fixed wrong edge", () => {
    const onArm = vi.fn();
    renderScene({ slug: "corner-zigzag", onArm });
    const scene = mockZigzagBounds();
    const head = screen.getByRole("button", { name: "折线活动端" });

    fireEvent.click(head);
    dragHead(238, 90, 115);

    expect(scene).toHaveAttribute("data-route-stage", "0");
    expect(scene).toHaveAttribute("data-last-edge", "right-rejected");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps a correct crossed edge and moves the line end to the next corner", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "corner-zigzag", onDiscover });
    const scene = mockZigzagBounds();

    dragHead(44, 2, 116);

    expect(scene).toHaveAttribute("data-route-stage", "1");
    expect(scene).toHaveAttribute("data-last-edge", "top-kept");
    expect(scene).toHaveAttribute("data-active-corner", "top-right");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it("returns only the active line end after a wrong later edge", () => {
    renderScene({ slug: "corner-zigzag" });
    const scene = mockZigzagBounds();

    dragHead(44, 2, 117);
    dragHead(120, 178, 118);

    expect(scene).toHaveAttribute("data-route-stage", "1");
    expect(scene).toHaveAttribute("data-kept-segments", "1");
    expect(scene).toHaveAttribute("data-last-edge", "bottom-rejected");
  });

  it("closes the route only after crossing all four cut-matched edges", () => {
    const onArm = vi.fn();
    renderScene({ slug: "corner-zigzag", onArm });
    const scene = mockZigzagBounds();

    dragHead(44, 2, 119);
    dragHead(238, 40, 120);
    dragHead(196, 178, 121);
    dragHead(2, 140, 122);

    expect(scene).toHaveAttribute("data-route-stage", "4");
    expect(scene).toHaveAttribute("data-kept-segments", "4");
    expect(scene).toHaveAttribute("data-route-state", "closed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("selects the same adjacent cut edges with keyboard arrows", () => {
    const onArm = vi.fn();
    renderScene({ slug: "corner-zigzag", onArm });
    const scene = screen.getByTestId("v2-scene-063");
    const head = screen.getByRole("button", { name: "折线活动端" });
    head.focus();

    ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].forEach((key) => fireEvent.keyDown(head, { key }));

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-edge");
    expect(scene).toHaveAttribute("data-route-state", "closed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 064", () => {
  it("renders two front-facing boards on one hinge with matching half-ring directions", () => {
    renderScene({ slug: "hinge-loop" });
    const scene = screen.getByTestId("v2-scene-064");

    expect(scene).toHaveAttribute("data-spatial-model", "two-board-shared-hinge-front-back-loop");
    expect(scene).toHaveAttribute("data-right-face", "front");
    expect(scene).toHaveAttribute("data-ring-state", "same-direction-halves");
    expect(screen.getAllByTestId(/hinge-loop-board-/)).toHaveLength(2);
    expect(screen.getByTestId("hinge-loop-axis")).toBeInTheDocument();
    expect(screen.queryByText(/一半在正面|one half.*back/i)).not.toBeInTheDocument();
  });

  it("does not accept clicking either board or moving the left half", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hinge-loop", onArm });
    const scene = screen.getByTestId("v2-scene-064");
    const boards = screen.getAllByRole("button", { name: /铰链纸板/ });

    boards.forEach((board) => fireEvent.click(board));
    fireEvent.pointerDown(boards[0], { pointerId: 123, clientX: 60, clientY: 90 });
    fireEvent.pointerMove(boards[0], { pointerId: 123, clientX: 130, clientY: 90 });
    fireEvent.pointerUp(boards[0], { pointerId: 123, clientX: 130, clientY: 90 });

    expect(scene).toHaveAttribute("data-right-face", "front");
    expect(scene).toHaveAttribute("data-ring-state", "same-direction-halves");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects translating the right board away from its shared hinge", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hinge-loop", onArm });
    const right = screen.getByRole("button", { name: "右侧铰链纸板" });

    fireEvent.pointerDown(right, { pointerId: 124, clientX: 170, clientY: 90 });
    fireEvent.pointerMove(right, { pointerId: 124, clientX: 230, clientY: 90 });
    fireEvent.pointerUp(right, { pointerId: 124, clientX: 230, clientY: 90 });

    expect(screen.getByTestId("v2-scene-064")).toHaveAttribute("data-flip-angle", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows the opposite back half while a partial hinge flip is in progress, then rebounds", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "hinge-loop", onDiscover, onArm });
    const right = screen.getByRole("button", { name: "右侧铰链纸板" });

    fireEvent.pointerDown(right, { pointerId: 125, clientX: 190, clientY: 90 });
    fireEvent.pointerMove(right, { pointerId: 125, clientX: 160, clientY: 90 });
    expect(screen.getByTestId("v2-scene-064")).toHaveAttribute("data-right-face", "turning");
    expect(screen.getByTestId("v2-scene-064")).toHaveAttribute("data-ring-state", "growing-across-hinge");
    fireEvent.pointerUp(right, { pointerId: 125, clientX: 160, clientY: 90 });

    expect(screen.getByTestId("v2-scene-064")).toHaveAttribute("data-flip-angle", "0");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("snaps the right board to its back and closes the ring after a wide hinge flip", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hinge-loop", onArm });
    const right = screen.getByRole("button", { name: "右侧铰链纸板" });

    fireEvent.pointerDown(right, { pointerId: 126, clientX: 200, clientY: 90 });
    fireEvent.pointerMove(right, { pointerId: 126, clientX: 130, clientY: 90 });
    fireEvent.pointerUp(right, { pointerId: 126, clientX: 130, clientY: 90 });

    const scene = screen.getByTestId("v2-scene-064");
    expect(scene).toHaveAttribute("data-flip-angle", "180");
    expect(scene).toHaveAttribute("data-right-face", "back");
    expect(scene).toHaveAttribute("data-ring-state", "complete-loop");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("flips the same visible hinged board with Enter", () => {
    const onArm = vi.fn();
    renderScene({ slug: "hinge-loop", onArm });
    const scene = screen.getByTestId("v2-scene-064");
    const right = screen.getByRole("button", { name: "右侧铰链纸板" });
    right.focus();

    fireEvent.keyDown(right, { key: "Enter" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-hinge");
    expect(scene).toHaveAttribute("data-ring-state", "complete-loop");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 065", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders five unnumbered archive labels whose stable shadows form one directed route", async () => {
    renderScene({ slug: "long-archive-route" });
    const scene = screen.getByTestId("v2-scene-065");

    await waitFor(() => expect(scene).toHaveAttribute("data-layout-ready", "true"));
    expect(scene).toHaveAttribute("data-spatial-model", "five-changing-labels-stable-shadow-route");
    expect(scene).toHaveAttribute("data-route-order", expect.stringMatching(/^\d,\d,\d,\d,\d$/));
    expect(new Set(scene.getAttribute("data-route-order")?.split(","))).toHaveProperty("size", 5);
    expect(screen.getAllByTestId(/target-route-tab-/)).toHaveLength(5);
    expect(screen.getAllByTestId(/target-route-shadow-/)).toHaveLength(4);
    expect(screen.queryByText(/读影子|read the shadow/i)).not.toBeInTheDocument();
    expect(screen.queryByText("影子指的档案路")).not.toBeInTheDocument();
  });

  it("changes label text while keeping every outgoing shadow target stable", async () => {
    vi.useFakeTimers();
    renderScene({ slug: "long-archive-route" });
    const scene = screen.getByTestId("v2-scene-065");
    act(() => vi.advanceTimersByTime(0));
    expect(scene).toHaveAttribute("data-layout-ready", "true");
    const targetsBefore = screen.getAllByTestId(/target-route-tab-/).map((tab) => tab.getAttribute("data-shadow-target"));
    const labelsBefore = screen.getAllByTestId(/target-route-label-/).map((label) => label.textContent);

    act(() => vi.advanceTimersByTime(800));

    expect(scene).toHaveAttribute("data-label-phase", "1");
    expect(screen.getAllByTestId(/target-route-tab-/).map((tab) => tab.getAttribute("data-shadow-target"))).toEqual(targetsBefore);
    expect(screen.getAllByTestId(/target-route-label-/).map((label) => label.textContent)).not.toEqual(labelsBefore);
  });

  it("does not turn label clicks or a memorized numeric sweep into progress", async () => {
    const onArm = vi.fn();
    renderScene({ slug: "long-archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-065");
    await waitFor(() => expect(scene).toHaveAttribute("data-layout-ready", "true"));

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByTestId(`target-route-tab-${index}`));
    }

    expect(scene).toHaveAttribute("data-route-length", "0");
    expect(scene).toHaveAttribute("data-opened-tabs", "5");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("marks a wrong starting focus as a folding dead end without retaining progress", async () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "long-archive-route", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-065");
    await waitFor(() => expect(scene).toHaveAttribute("data-layout-ready", "true"));
    const route = scene.getAttribute("data-route-order")!.split(",").map(Number);
    const wrong = [0, 1, 2, 3, 4].find((index) => index !== route[0])!;

    fireEvent.focus(screen.getByTestId(`target-route-tab-${wrong}`));

    expect(scene).toHaveAttribute("data-route-state", "broken");
    expect(scene).toHaveAttribute("data-dead-end-tab", String(wrong));
    expect(scene).toHaveAttribute("data-route-length", "0");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("retains paper grain only while focus follows each stable shadow to the unique end", async () => {
    const onArm = vi.fn();
    renderScene({ slug: "long-archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-065");
    await waitFor(() => expect(scene).toHaveAttribute("data-layout-ready", "true"));
    const route = scene.getAttribute("data-route-order")!.split(",").map(Number);

    route.forEach((index, step) => {
      fireEvent.focus(screen.getByTestId(`target-route-tab-${index}`));
      expect(scene).toHaveAttribute("data-route-length", String(step + 1));
      expect(screen.getByTestId(`target-route-tab-${index}`)).toHaveAttribute("data-kept", "true");
    });

    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(scene).toHaveAttribute("data-terminal-outgoing", "none");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports one continuous held-attention route across the randomized map", async () => {
    const onArm = vi.fn();
    renderScene({ slug: "long-archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-065");
    await waitFor(() => expect(scene).toHaveAttribute("data-layout-ready", "true"));
    vi.spyOn(scene, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200, toJSON: () => undefined,
    });
    const route = scene.getAttribute("data-route-order")!.split(",").map(Number);
    const point = (index: number) => {
      const tab = screen.getByTestId(`target-route-tab-${index}`);
      return { x: Number(tab.getAttribute("data-x")) * 3, y: Number(tab.getAttribute("data-y")) * 2 };
    };

    const start = point(route[0]);
    fireEvent.pointerDown(scene, { pointerId: 165, clientX: start.x, clientY: start.y });
    route.slice(1).forEach((index) => {
      const next = point(index);
      fireEvent.pointerMove(scene, { pointerId: 165, clientX: next.x, clientY: next.y });
    });
    fireEvent.pointerUp(scene, { pointerId: 165 });

    expect(scene).toHaveAttribute("data-input-mode", "held-attention");
    expect(scene).toHaveAttribute("data-route-state", "complete");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps the correct route inferable after a wrong branch by clearing only the retained grain", async () => {
    const onArm = vi.fn();
    renderScene({ slug: "long-archive-route", onArm });
    const scene = screen.getByTestId("v2-scene-065");
    await waitFor(() => expect(scene).toHaveAttribute("data-layout-ready", "true"));
    const route = scene.getAttribute("data-route-order")!.split(",").map(Number);
    fireEvent.focus(screen.getByTestId(`target-route-tab-${route[0]}`));
    const wrong = [0, 1, 2, 3, 4].find((index) => !route.slice(0, 2).includes(index))!;
    fireEvent.focus(screen.getByTestId(`target-route-tab-${wrong}`));

    expect(scene).toHaveAttribute("data-route-state", "broken");
    expect(screen.getAllByTestId(/target-route-tab-/).every((tab) => tab.getAttribute("data-kept") === "false")).toBe(true);
    route.forEach((index) => fireEvent.focus(screen.getByTestId(`target-route-tab-${index}`)));
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 066", () => {
  it("renders four already matched archive bands with one wrong central over-crossing", () => {
    renderScene({ slug: "archive-knot" });
    const scene = screen.getByTestId("v2-scene-066");

    expect(scene).toHaveAttribute("data-spatial-model", "four-matched-bands-one-wrong-over-under-crossing");
    expect(scene).toHaveAttribute("data-matched-endpoints", "4");
    expect(scene).toHaveAttribute("data-crossing-order", "upper-wrong");
    expect(screen.getAllByTestId(/archive-knot-endpoint-/)).toHaveLength(4);
    expect(screen.getAllByTestId(/archive-knot-exit-/)).toHaveLength(4);
    expect(screen.getAllByTestId(/archive-knot-band-/)).toHaveLength(4);
    expect(screen.getByTestId("archive-knot-crossing")).toBeInTheDocument();
    expect(screen.queryByText(/端点没有接错|problem.*central/i)).not.toBeInTheDocument();
  });

  it("does not accept clicking endpoints, the crossing, or naming the solution", async () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-knot", onArm });
    const scene = screen.getByTestId("v2-scene-066");

    for (const endpoint of screen.getAllByRole("button", { name: /档案色带端点/ })) await userEvent.click(endpoint);
    await userEvent.click(screen.getByRole("button", { name: "中央上层纸带" }));
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "r" });
    fireEvent.keyDown(window, { key: "c" });

    expect(scene).toHaveAttribute("data-crossing-order", "upper-wrong");
    expect(scene).toHaveAttribute("data-endpoint-probes", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("lets every endpoint reveal matching tension but always snaps it back", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "archive-knot", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-066");

    screen.getAllByRole("button", { name: /档案色带端点/ }).forEach((endpoint, index) => {
      fireEvent.pointerDown(endpoint, { pointerId: 166 + index, clientX: 40, clientY: 50 + index * 20 });
      fireEvent.pointerMove(endpoint, { pointerId: 166 + index, clientX: 82, clientY: 50 + index * 20 });
      fireEvent.pointerUp(endpoint, { pointerId: 166 + index, clientX: 82, clientY: 50 + index * 20 });
    });

    expect(scene).toHaveAttribute("data-endpoint-probes", "4");
    expect(scene).toHaveAttribute("data-matched-endpoints", "4");
    expect(scene).toHaveAttribute("data-tension-state", "knotted");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rebounds after a short lift that does not clear the central crossing", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-knot", onArm });
    const scene = screen.getByTestId("v2-scene-066");
    const crossing = screen.getByRole("button", { name: "中央上层纸带" });

    fireEvent.pointerDown(crossing, { pointerId: 170, clientX: 150, clientY: 100 });
    fireEvent.pointerMove(crossing, { pointerId: 170, clientX: 150, clientY: 84 });
    expect(scene).toHaveAttribute("data-crossing-state", "lifting");
    fireEvent.pointerUp(crossing, { pointerId: 170, clientX: 150, clientY: 84 });

    expect(scene).toHaveAttribute("data-crossing-state", "rebounded");
    expect(scene).toHaveAttribute("data-crossing-order", "upper-wrong");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("swaps the one wrong layer and releases all four bands after a clear upward lift", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-knot", onArm });
    const scene = screen.getByTestId("v2-scene-066");
    const crossing = screen.getByRole("button", { name: "中央上层纸带" });

    fireEvent.pointerDown(crossing, { pointerId: 171, clientX: 150, clientY: 110 });
    fireEvent.pointerMove(crossing, { pointerId: 171, clientX: 154, clientY: 72 });
    fireEvent.pointerUp(crossing, { pointerId: 171, clientX: 154, clientY: 72 });

    expect(scene).toHaveAttribute("data-crossing-state", "swapped");
    expect(scene).toHaveAttribute("data-crossing-order", "lower-correct");
    expect(scene).toHaveAttribute("data-tension-state", "released");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("performs the same visible layer exchange with Enter on the crossing", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-knot", onArm });
    const scene = screen.getByTestId("v2-scene-066");
    const crossing = screen.getByRole("button", { name: "中央上层纸带" });
    crossing.focus();

    fireEvent.keyDown(crossing, { key: "Enter" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-layer");
    expect(scene).toHaveAttribute("data-tension-state", "released");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 067", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders one paper wheel gap with materially distinct solid and translucent ripples", () => {
    renderScene({ slug: "wheel-echo" });
    const scene = screen.getByTestId("v2-scene-067");

    expect(scene).toHaveAttribute("data-spatial-model", "paper-wheel-translucent-gap-opposed-delayed-echo");
    expect(scene).toHaveAttribute("data-scroll-scope", "puzzle-only");
    expect(screen.getByTestId("wheel-echo-gap")).toHaveAttribute("data-material", "translucent");
    expect(screen.getByTestId("wheel-echo-solid")).toHaveAttribute("data-material", "solid");
    expect(screen.getByTestId("wheel-echo-return")).toHaveAttribute("data-material", "translucent");
    expect(screen.queryByText(/滚动之后|comes back/i)).not.toBeInTheDocument();
  });

  it("keeps page-level wheel input outside the puzzle inert", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "wheel-echo", onDiscover, onArm });

    fireEvent.wheel(window, { deltaY: 100 });

    expect(screen.getByTestId("v2-scene-067")).toHaveAttribute("data-solid-angle", "120");
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("moves the solid ripple first and returns the echo in the opposite direction after 120ms", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    renderScene({ slug: "wheel-echo", onDiscover });
    const scene = screen.getByTestId("v2-scene-067");

    fireEvent.wheel(scene, { deltaY: 100 });
    expect(scene).toHaveAttribute("data-solid-angle", "165");
    expect(scene).toHaveAttribute("data-echo-angle", "120");
    expect(scene).toHaveAttribute("data-echo-state", "waiting");
    act(() => vi.advanceTimersByTime(119));
    expect(scene).toHaveAttribute("data-echo-angle", "120");
    act(() => vi.advanceTimersByTime(1));
    expect(scene).toHaveAttribute("data-echo-angle", "75");
    expect(scene).toHaveAttribute("data-echo-state", "returned");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it.each([100, -100])("disperses the solid at the gap, then accepts the delayed echo from wheel direction %s", (deltaY) => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "wheel-echo", onArm });
    const scene = screen.getByTestId("v2-scene-067");

    for (let turn = 0; turn < 4; turn += 1) fireEvent.wheel(scene, { deltaY });
    expect(scene).toHaveAttribute("data-solid-angle", "300");
    expect(scene).toHaveAttribute("data-solid-state", "dispersed");
    expect(scene).toHaveAttribute("data-gap-state", "open");
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(120));

    expect(scene).toHaveAttribute("data-echo-angle", "300");
    expect(scene).toHaveAttribute("data-gap-state", "echo-filled");
    expect(scene).toHaveAttribute("data-echo-state", "magnetic");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("uses one vertical swipe inside the wheel as repeated physical movement, not a click", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "wheel-echo", onArm });
    const scene = screen.getByTestId("v2-scene-067");

    fireEvent.click(scene);
    fireEvent.pointerDown(scene, { pointerId: 167, clientY: 180 });
    fireEvent.pointerMove(scene, { pointerId: 167, clientY: 72 });
    fireEvent.pointerUp(scene, { pointerId: 167, clientY: 72 });
    expect(scene).toHaveAttribute("data-input-mode", "swipe");
    expect(scene).toHaveAttribute("data-solid-state", "dispersed");
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(120));
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers the same non-sequence route through either vertical arrow key", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "wheel-echo", onArm });
    const scene = screen.getByTestId("v2-scene-067");
    scene.focus();

    for (let turn = 0; turn < 4; turn += 1) fireEvent.keyDown(scene, { key: "ArrowDown" });
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-wheel");
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(120));
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 068", () => {
  it("renders a broad broken clock rim with one translucent arc still behind the paper", () => {
    renderScene({ slug: "counterclockwise-breach" });
    const scene = screen.getByTestId("v2-scene-068");

    expect(scene).toHaveAttribute("data-spatial-model", "broken-clock-rim-backside-arc");
    expect(scene).toHaveAttribute("data-arc-layer", "back");
    expect(scene).toHaveAttribute("data-arc-stage", "0");
    expect(screen.getByTestId("breach-gap-068")).toHaveAttribute("data-material", "translucent-cut");
    expect(screen.getByTestId("breach-arc-068")).toHaveAttribute("data-material", "backside-paper");
    expect(screen.queryByText(/逆时针|counterclockwise/i)).not.toBeInTheDocument();
  });

  it("does not treat clicks, tiny motion, or accumulated distance away from the rim as a solution", () => {
    const onArm = vi.fn();
    renderScene({ slug: "counterclockwise-breach", onArm });
    const scene = screen.getByTestId("v2-scene-068");

    fireEvent.click(scene);
    for (let index = 0; index < 8; index += 1) {
      fireEvent.pointerDown(scene, { pointerId: index + 1, clientX: 20, clientY: 20 });
      fireEvent.pointerUp(scene, { pointerId: index + 1, clientX: 90, clientY: 20 });
    }

    expect(scene).toHaveAttribute("data-arc-stage", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("pulls the real backside arc forward in three counterclockwise short sweeps", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "counterclockwise-breach", onDiscover, onArm });
    const scene = screen.getByTestId("v2-scene-068");

    for (const expectedStage of [1, 2, 3]) {
      fireEvent.pointerDown(scene, { pointerId: 68, clientX: 190, clientY: 70 });
      fireEvent.pointerUp(scene, { pointerId: 68, clientX: 110, clientY: 70 });
      expect(scene).toHaveAttribute("data-arc-stage", String(expectedStage));
    }

    expect(scene).toHaveAttribute("data-arc-layer", "front");
    expect(scene).toHaveAttribute("data-gap-state", "sealed");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("lets a clockwise sweep push the exposed arc one step back instead of clearing progress", () => {
    const onArm = vi.fn();
    renderScene({ slug: "counterclockwise-breach", onArm });
    const scene = screen.getByTestId("v2-scene-068");

    for (let index = 0; index < 2; index += 1) {
      fireEvent.pointerDown(scene, { pointerId: 68, clientX: 190, clientY: 70 });
      fireEvent.pointerUp(scene, { pointerId: 68, clientX: 110, clientY: 70 });
    }
    fireEvent.pointerDown(scene, { pointerId: 69, clientX: 110, clientY: 70 });
    fireEvent.pointerUp(scene, { pointerId: 69, clientX: 190, clientY: 70 });

    expect(scene).toHaveAttribute("data-arc-stage", "1");
    expect(scene).toHaveAttribute("data-last-direction", "clockwise");
    expect(scene).toHaveAttribute("data-retractions", "1");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers local wheel input with opposite directions producing pull and retreat", () => {
    const onArm = vi.fn();
    renderScene({ slug: "counterclockwise-breach", onArm });
    const scene = screen.getByTestId("v2-scene-068");

    fireEvent.wheel(window, { deltaY: -100 });
    expect(scene).toHaveAttribute("data-arc-stage", "0");
    fireEvent.wheel(scene, { deltaY: -100 });
    fireEvent.wheel(scene, { deltaY: -100 });
    expect(scene).toHaveAttribute("data-arc-stage", "2");
    fireEvent.wheel(scene, { deltaY: 100 });
    expect(scene).toHaveAttribute("data-arc-stage", "1");
    fireEvent.wheel(scene, { deltaY: -100 });
    fireEvent.wheel(scene, { deltaY: -100 });

    expect(scene).toHaveAttribute("data-input-mode", "wheel");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports the same pull-back relation with left and right arrow keys", () => {
    const onArm = vi.fn();
    renderScene({ slug: "counterclockwise-breach", onArm });
    const scene = screen.getByTestId("v2-scene-068");
    scene.focus();

    fireEvent.keyDown(scene, { key: "ArrowLeft" });
    fireEvent.keyDown(scene, { key: "ArrowLeft" });
    fireEvent.keyDown(scene, { key: "ArrowRight" });
    expect(scene).toHaveAttribute("data-arc-stage", "1");
    fireEvent.keyDown(scene, { key: "ArrowLeft" });
    fireEvent.keyDown(scene, { key: "ArrowLeft" });

    expect(scene).toHaveAttribute("data-input-mode", "keyboard-rim");
    expect(scene).toHaveAttribute("data-gap-state", "sealed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 069", () => {
  const prepareCanvas = () => {
    const canvas = screen.getByTestId("archive-eight-canvas-069");
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, toJSON: () => undefined,
    });
    return canvas;
  };
  const trace = (canvas: HTMLElement, points: Array<[number, number]>, pointerId: number) => {
    fireEvent.pointerDown(canvas, { pointerId, clientX: points[0][0], clientY: points[0][1] });
    points.slice(1).forEach(([clientX, clientY]) => fireEvent.pointerMove(canvas, { pointerId, clientX, clientY }));
    const [clientX, clientY] = points.at(-1)!;
    fireEvent.pointerUp(canvas, { pointerId, clientX, clientY });
  };
  const leftLobe: Array<[number, number]> = [[50, 50], [32, 24], [12, 50], [32, 76], [50, 50]];
  const rightLobe: Array<[number, number]> = [[50, 50], [68, 24], [88, 50], [68, 76], [50, 50]];

  it("renders two broken archive stamp lobes sharing one physical center crossing", () => {
    renderScene({ slug: "archive-figure-eight" });
    const scene = screen.getByTestId("v2-scene-069");

    expect(scene).toHaveAttribute("data-spatial-model", "two-broken-stamp-lobes-one-crossing");
    expect(scene).toHaveAttribute("data-stroke-state", "idle");
    expect(screen.getByTestId("archive-eight-left-lobe")).toHaveAttribute("data-break", "open");
    expect(screen.getByTestId("archive-eight-right-lobe")).toHaveAttribute("data-break", "open");
    expect(screen.getByTestId("archive-eight-crossing")).toHaveAttribute("data-shared", "true");
    expect(screen.queryByText(/档案八字|figure eight/i)).not.toBeInTheDocument();
  });

  it("retains a completed lobe as fading ink but never combines two separately lifted circles", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-figure-eight", onArm });
    const canvas = prepareCanvas();

    trace(canvas, leftLobe, 169);
    expect(screen.getByTestId("v2-scene-069")).toHaveAttribute("data-retained-lobes", "left");
    trace(canvas, rightLobe, 170);

    expect(screen.getByTestId("v2-scene-069")).toHaveAttribute("data-retained-lobes", "left,right");
    expect(screen.getByTestId("v2-scene-069")).toHaveAttribute("data-stroke-state", "broken");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects center friction and a long closed path that never reaches both lobes", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-figure-eight", onArm });
    const canvas = prepareCanvas();

    trace(canvas, [[50, 50], [45, 38], [55, 62], [44, 58], [56, 40], [50, 50]], 171);
    trace(canvas, [...leftLobe, [24, 32], [12, 50], [28, 70], [50, 50]], 172);

    expect(screen.getByTestId("v2-scene-069")).toHaveAttribute("data-crossings", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("accepts one continuous topology through both lobes and the shared center twice", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "archive-figure-eight", onDiscover, onArm });
    const canvas = prepareCanvas();

    trace(canvas, [...leftLobe, ...rightLobe.slice(1)], 173);

    const scene = screen.getByTestId("v2-scene-069");
    expect(scene).toHaveAttribute("data-crossings", "2");
    expect(scene).toHaveAttribute("data-left-lobe", "closed");
    expect(scene).toHaveAttribute("data-right-lobe", "closed");
    expect(scene).toHaveAttribute("data-stroke-state", "sealed");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("accepts the same topology when the right lobe is drawn first", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-figure-eight", onArm });
    const canvas = prepareCanvas();

    trace(canvas, [...rightLobe, ...leftLobe.slice(1)], 174);

    expect(screen.getByTestId("v2-scene-069")).toHaveAttribute("data-stroke-state", "sealed");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("provides an equivalent keyboard pen-down route instead of a direction password", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-figure-eight", onArm });
    const canvas = screen.getByTestId("archive-eight-canvas-069");
    canvas.focus();

    fireEvent.keyDown(canvas, { key: " " });
    fireEvent.keyDown(canvas, { key: "ArrowLeft" });
    expect(screen.getByTestId("v2-scene-069")).toHaveAttribute("data-left-lobe", "closed");
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(canvas, { key: "ArrowRight" });

    expect(screen.getByTestId("v2-scene-069")).toHaveAttribute("data-input-mode", "keyboard-pen");
    expect(screen.getByTestId("v2-scene-069")).toHaveAttribute("data-crossings", "2");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 070", () => {
  it("renders two vertical paper depths with separate narrow gates and half-lines", () => {
    renderScene({ slug: "twin-gates" });
    const scene = screen.getByTestId("v2-scene-070");

    expect(scene).toHaveAttribute("data-spatial-model", "two-depth-gates-one-continuous-line");
    expect(scene).toHaveAttribute("data-depth-state", "side-by-side");
    expect(screen.getByTestId("twin-gate-front-sheet")).toHaveAttribute("data-depth", "front");
    expect(screen.getByTestId("twin-gate-rear-sheet")).toHaveAttribute("data-depth", "rear");
    expect(screen.getAllByTestId(/twin-gate-opening-/)).toHaveLength(2);
    expect(screen.getAllByTestId(/twin-gate-half-line-/)).toHaveLength(2);
    expect(screen.queryByText(/一条线穿两道门|twin gates/i)).not.toBeInTheDocument();
  });

  it("does not advance from clicks or opening the two sheets farther apart", () => {
    const onArm = vi.fn();
    renderScene({ slug: "twin-gates", onArm });
    const front = screen.getByTestId("twin-gate-front-sheet");

    fireEvent.click(front);
    fireEvent.pointerDown(front, { pointerId: 170, clientX: 120 });
    fireEvent.pointerMove(front, { pointerId: 170, clientX: 80 });
    fireEvent.pointerUp(front, { pointerId: 170, clientX: 80 });

    expect(screen.getByTestId("v2-scene-070")).toHaveAttribute("data-line-state", "separate");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps the line only half-lit when both gates are simply aligned in one plane", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "twin-gates", onDiscover, onArm });
    const front = screen.getByTestId("twin-gate-front-sheet");

    fireEvent.pointerDown(front, { pointerId: 171, clientX: 100 });
    fireEvent.pointerMove(front, { pointerId: 171, clientX: 164 });
    fireEvent.pointerUp(front, { pointerId: 171, clientX: 164 });

    const scene = screen.getByTestId("v2-scene-070");
    expect(scene).toHaveAttribute("data-front-offset", "0");
    expect(scene).toHaveAttribute("data-depth-state", "flat-aligned");
    expect(scene).toHaveAttribute("data-line-state", "one-gate-half-lit");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("seals only when the front sheet is staggered before the rear gate and the line is continuous", () => {
    const onArm = vi.fn();
    renderScene({ slug: "twin-gates", onArm });
    const front = screen.getByTestId("twin-gate-front-sheet");

    fireEvent.pointerDown(front, { pointerId: 172, clientX: 100 });
    fireEvent.pointerMove(front, { pointerId: 172, clientX: 212 });
    fireEvent.pointerUp(front, { pointerId: 172, clientX: 212 });

    const scene = screen.getByTestId("v2-scene-070");
    expect(scene).toHaveAttribute("data-front-offset", "48");
    expect(scene).toHaveAttribute("data-depth-state", "front-before-rear");
    expect(scene).toHaveAttribute("data-line-state", "continuous-through-two-depths");
    expect(scene).toHaveAttribute("data-gates-passed", "2");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("rejects the mirror stagger because its line exits the rear layer before the front gate", () => {
    const onArm = vi.fn();
    renderScene({ slug: "twin-gates", onArm });
    const front = screen.getByTestId("twin-gate-front-sheet");

    fireEvent.pointerDown(front, { pointerId: 173, clientX: 100 });
    fireEvent.pointerMove(front, { pointerId: 173, clientX: 236 });
    fireEvent.pointerUp(front, { pointerId: 173, clientX: 236 });

    expect(screen.getByTestId("v2-scene-070")).toHaveAttribute("data-depth-state", "reverse-stagger");
    expect(screen.getByTestId("v2-scene-070")).toHaveAttribute("data-line-state", "broken-after-rear");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers the same visible sheet movement with arrow keys", () => {
    const onArm = vi.fn();
    renderScene({ slug: "twin-gates", onArm });
    const front = screen.getByTestId("twin-gate-front-sheet");
    front.focus();

    for (let step = 0; step < 7; step += 1) fireEvent.keyDown(front, { key: "ArrowRight" });

    const scene = screen.getByTestId("v2-scene-070");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-layer");
    expect(scene).toHaveAttribute("data-front-offset", "48");
    expect(scene).toHaveAttribute("data-line-state", "continuous-through-two-depths");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 071", () => {
  afterEach(() => vi.useRealTimers());

  it("renders three paper dials, two toothed belts, and two distinct side grooves", () => {
    renderScene({ slug: "triple-actuator" });
    const scene = screen.getByTestId("v2-scene-071");

    expect(scene).toHaveAttribute("data-spatial-model", "three-dials-two-one-way-belts-shared-center");
    expect(screen.getAllByTestId(/triple-dial-(left|center|right)$/)).toHaveLength(3);
    expect(screen.getAllByTestId(/triple-belt-(left|right)$/)).toHaveLength(2);
    expect(screen.getAllByTestId(/triple-groove-(left|right)$/)).toHaveLength(2);
    expect(screen.queryByText(/中间的表盘|triple actuator/i)).not.toBeInTheDocument();
  });

  it("shows that a side dial drives only its own belt and the center, never both sides", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-actuator", onArm });
    const left = screen.getByTestId("triple-dial-left");
    const right = screen.getByTestId("triple-dial-right");

    fireEvent.keyDown(left, { key: "ArrowRight" });
    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-belt-state", "left-only");
    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-right-angle", "330");
    fireEvent.keyDown(right, { key: "ArrowLeft" });
    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-belt-state", "right-only");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not pass by clicking or mechanically turning each dial through a complete cycle", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-actuator", onArm });
    const dials = ["left", "center", "right"].map((side) => screen.getByTestId(`triple-dial-${side}`));

    dials.forEach((dial) => {
      fireEvent.click(dial);
      for (let step = 0; step < 24; step += 1) fireEvent.keyDown(dial, { key: "ArrowRight" });
      fireEvent.keyDown(dial, { key: "Enter" });
    });

    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("uses one center drag to move both needles into their broad grooves and lock", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "triple-actuator", onDiscover, onArm });
    const center = screen.getByTestId("triple-dial-center");

    fireEvent.pointerDown(center, { pointerId: 171, clientX: 100 });
    fireEvent.pointerMove(center, { pointerId: 171, clientX: 160 });
    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-belt-state", "both");
    fireEvent.pointerUp(center, { pointerId: 171, clientX: 160 });

    const scene = screen.getByTestId("v2-scene-071");
    expect(scene).toHaveAttribute("data-left-angle", "90");
    expect(scene).toHaveAttribute("data-right-angle", "270");
    expect(scene).toHaveAttribute("data-left-groove", "seated");
    expect(scene).toHaveAttribute("data-right-groove", "seated");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports local wheel adjustment and settles only after input pauses", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "triple-actuator", onArm });
    const center = screen.getByTestId("triple-dial-center");

    for (let step = 0; step < 4; step += 1) fireEvent.wheel(center, { deltaY: -100 });
    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-left-groove", "aligned");
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(179));
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));

    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers keyboard movement on the visible center dial with Enter as key release", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-actuator", onArm });
    const center = screen.getByTestId("triple-dial-center");
    center.focus();

    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(center, { key: "ArrowRight" });
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(center, { key: "Enter" });

    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-input-mode", "keyboard-dial");
    expect(screen.getByTestId("v2-scene-071")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 072", () => {
  it("renders two oscillating glass sheets, their double shadow, and one distinct polarizer", () => {
    renderScene({ slug: "glass-relay-oscillator" });
    const scene = screen.getByTestId("v2-scene-072");

    expect(scene).toHaveAttribute("data-spatial-model", "two-glass-waves-one-cross-polarizer");
    expect(screen.getAllByTestId(/glass-sheet-(left|right)$/)).toHaveLength(2);
    expect(screen.getByTestId("glass-double-shadow")).toBeInTheDocument();
    expect(screen.getByTestId("glass-polarizer")).toBeInTheDocument();
    expect(screen.getByTestId("glass-polarizer-corner")).toBeInTheDocument();
    expect(screen.queryByText(/玻璃消振|glass relay oscillator/i)).not.toBeInTheDocument();
  });

  it("reduces the double image when the polarizer covers the crossing but does not pass by stacking alone", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "glass-relay-oscillator", onDiscover, onArm });
    const polarizer = screen.getByTestId("glass-polarizer");

    fireEvent.pointerDown(polarizer, { pointerId: 172, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(polarizer, { pointerId: 172, clientX: 190, clientY: 45 });
    fireEvent.pointerUp(polarizer, { pointerId: 172, clientX: 190, clientY: 45 });

    const scene = screen.getByTestId("v2-scene-072");
    expect(scene).toHaveAttribute("data-overlap-state", "covered");
    expect(scene).toHaveAttribute("data-wave-amplitude", "reduced");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not pass by rotating the polarizer away from the glass crossing", () => {
    const onArm = vi.fn();
    renderScene({ slug: "glass-relay-oscillator", onArm });
    const corner = screen.getByTestId("glass-polarizer-corner");

    fireEvent.pointerDown(corner, { pointerId: 272, clientY: 100 });
    fireEvent.pointerMove(corner, { pointerId: 272, clientY: 190 });
    fireEvent.pointerUp(corner, { pointerId: 272, clientY: 190 });

    expect(screen.getByTestId("v2-scene-072")).toHaveAttribute("data-polarizer-angle", "90");
    expect(screen.getByTestId("v2-scene-072")).toHaveAttribute("data-wave-amplitude", "strong");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("locks only after the centered polarizer is turned through its folded corner", () => {
    const onArm = vi.fn();
    renderScene({ slug: "glass-relay-oscillator", onArm });
    const polarizer = screen.getByTestId("glass-polarizer");
    const corner = screen.getByTestId("glass-polarizer-corner");

    fireEvent.pointerDown(polarizer, { pointerId: 372, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(polarizer, { pointerId: 372, clientX: 190, clientY: 45 });
    fireEvent.pointerUp(polarizer, { pointerId: 372, clientX: 190, clientY: 45 });
    fireEvent.pointerDown(corner, { pointerId: 472, clientY: 100 });
    fireEvent.pointerMove(corner, { pointerId: 472, clientY: 190 });
    fireEvent.pointerUp(corner, { pointerId: 472, clientY: 190 });

    const scene = screen.getByTestId("v2-scene-072");
    expect(scene).toHaveAttribute("data-polarizer-angle", "90");
    expect(scene).toHaveAttribute("data-wave-amplitude", "zero");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps clicks and unrelated page motion out of the solution", () => {
    const onArm = vi.fn();
    renderScene({ slug: "glass-relay-oscillator", onArm });

    fireEvent.click(screen.getByTestId("glass-polarizer"));
    fireEvent.click(screen.getByTestId("glass-polarizer-corner"));
    fireEvent(window, new Event("deviceorientation"));
    fireEvent.wheel(window, { deltaY: 500 });

    expect(screen.getByTestId("v2-scene-072")).toHaveAttribute("data-overlap-state", "separate");
    expect(screen.getByTestId("v2-scene-072")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers keyboard movement and a semantic quarter-turn on the visible paper parts", () => {
    const onArm = vi.fn();
    renderScene({ slug: "glass-relay-oscillator", onArm });
    const polarizer = screen.getByTestId("glass-polarizer");
    polarizer.focus();

    for (let step = 0; step < 3; step += 1) fireEvent.keyDown(polarizer, { key: "ArrowRight" });
    for (let step = 0; step < 2; step += 1) fireEvent.keyDown(polarizer, { key: "ArrowUp" });
    const corner = screen.getByTestId("glass-polarizer-corner");
    corner.focus();
    fireEvent.keyDown(corner, { key: "Enter" });

    const scene = screen.getByTestId("v2-scene-072");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-polarizer");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 073", () => {
  afterEach(() => vi.useRealTimers());

  it("renders three visually identical soft stones and three visibly different capacity wells", () => {
    renderScene({ slug: "pressure-vault" });
    const scene = screen.getByTestId("v2-scene-073");

    expect(scene).toHaveAttribute("data-spatial-model", "equal-stones-hidden-pressure-radii-capacity-wells");
    expect(screen.getAllByTestId(/pressure-stone-[0-2]$/)).toHaveLength(3);
    expect(screen.getAllByTestId(/pressure-well-[0-2]$/)).toHaveLength(3);
    expect(screen.getAllByTestId(/pressure-stone-[0-2]$/).every((stone) => stone.getAttribute("data-appearance") === "same")).toBe(true);
    expect(screen.queryByText(/按容量分配压力|beacon vault/i)).not.toBeInTheDocument();
  });

  it("keeps short taps inert instead of revealing or placing a stone", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "pressure-vault", onDiscover, onArm });

    fireEvent.pointerDown(screen.getByTestId("pressure-stone-0"), { pointerId: 173, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(screen.getByTestId("pressure-stone-0"), { pointerId: 173, clientX: 20, clientY: 20 });

    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-probed-stones", "none");
    expect(onDiscover).not.toHaveBeenCalled();
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals a stone's pressure radius only after a steady broad hold", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    renderScene({ slug: "pressure-vault", onDiscover });
    const stone = screen.getByTestId("pressure-stone-0");

    fireEvent.pointerDown(stone, { pointerId: 273, clientX: 20, clientY: 20 });
    act(() => vi.advanceTimersByTime(319));
    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-probed-stones", "none");
    act(() => vi.advanceTimersByTime(1));

    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-probed-stones", "0");
    expect(stone).toHaveAttribute("data-pressure", "large");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it("rejects an unmeasured placement and distinguishes a too-small well by bulging", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pressure-vault", onArm });
    const stone = screen.getByTestId("pressure-stone-0");
    stone.focus();

    fireEvent.keyDown(stone, { key: "Enter" });
    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-rejection", "unmeasured");
    fireEvent.keyDown(stone, { key: " " });
    act(() => vi.advanceTimersByTime(320));
    fireEvent.keyUp(stone, { key: " " });
    fireEvent.keyDown(stone, { key: "Enter" });

    expect(screen.getByTestId("pressure-well-0")).toHaveAttribute("data-feedback", "bulge");
    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-matched-stones", "0");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("also distinguishes an oversized well by leaving a loose paper edge", () => {
    vi.useFakeTimers();
    renderScene({ slug: "pressure-vault" });
    const stone = screen.getByTestId("pressure-stone-1");
    stone.focus();

    fireEvent.keyDown(stone, { key: " " });
    act(() => vi.advanceTimersByTime(320));
    fireEvent.keyUp(stone, { key: " " });
    fireEvent.keyDown(stone, { key: "ArrowRight" });
    fireEvent.keyDown(stone, { key: "Enter" });

    expect(screen.getByTestId("pressure-well-1")).toHaveAttribute("data-feedback", "loose-edge");
    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-matched-stones", "0");
  });

  it("supports measure-then-select keyboard placement for all three capacity matches", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "pressure-vault", onArm });
    const destinations = [1, 2, 0];

    destinations.forEach((destination, stoneIndex) => {
      const stone = screen.getByTestId(`pressure-stone-${stoneIndex}`);
      stone.focus();
      fireEvent.keyDown(stone, { key: " " });
      act(() => vi.advanceTimersByTime(320));
      fireEvent.keyUp(stone, { key: " " });
      for (let step = 0; step < destination; step += 1) fireEvent.keyDown(stone, { key: "ArrowRight" });
      fireEvent.keyDown(stone, { key: "Enter" });
    });

    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-input-mode", "keyboard-capacity");
    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-matched-stones", "3");
    expect(screen.getByTestId("v2-scene-073")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 074", () => {
  it("renders three incomplete translucent sentence bands with distinct edge-grain evidence", () => {
    renderScene({ slug: "clue-relay-braid" });
    const scene = screen.getByTestId("v2-scene-074");

    expect(scene).toHaveAttribute("data-spatial-model", "three-sentence-bands-three-depths-over-under-over");
    expect(screen.getAllByTestId(/braid-band-[0-2]$/)).toHaveLength(3);
    expect(screen.getAllByTestId(/braid-edge-[0-2]$/)).toHaveLength(3);
    expect(scene).toHaveAttribute("data-edge-patterns", "up,down,up");
    expect(screen.queryByText(/句子编织|clue relay braid/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/FOLLOW THE GAP|沿着空隙/i)).not.toBeInTheDocument();
  });

  it("keeps simple clicks and a uniform stack from becoming a solution", () => {
    const onArm = vi.fn();
    renderScene({ slug: "clue-relay-braid", onArm });
    const bands = [0, 1, 2].map((index) => screen.getByTestId(`braid-band-${index}`));

    bands.forEach((band) => fireEvent.click(band));
    bands.forEach((band) => fireEvent.keyDown(band, { key: "ArrowUp" }));

    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-depths", "up,up,up");
    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows a mismatched crossing when a band moves against its own edge grain", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "clue-relay-braid", onDiscover, onArm });
    const first = screen.getByTestId("braid-band-0");

    fireEvent.pointerDown(first, { pointerId: 174, clientY: 100 });
    fireEvent.pointerMove(first, { pointerId: 174, clientY: 145 });
    fireEvent.pointerUp(first, { pointerId: 174, clientY: 145 });

    expect(first).toHaveAttribute("data-depth", "down");
    expect(first).toHaveAttribute("data-edge-match", "false");
    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-phrase-clarity", "0");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("clarifies one fragment at a time and locks only at the over-under-over weave", () => {
    const onArm = vi.fn();
    renderScene({ slug: "clue-relay-braid", onArm });
    const dragDepth = (index: number, deltaY: number, pointerId: number) => {
      const band = screen.getByTestId(`braid-band-${index}`);
      fireEvent.pointerDown(band, { pointerId, clientY: 100 });
      fireEvent.pointerMove(band, { pointerId, clientY: 100 + deltaY });
      fireEvent.pointerUp(band, { pointerId, clientY: 100 + deltaY });
    };

    dragDepth(0, -45, 274);
    dragDepth(1, 45, 374);
    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-phrase-clarity", "2");
    expect(onArm).not.toHaveBeenCalled();
    dragDepth(2, 45, 474);
    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-phrase-clarity", "2");
    dragDepth(2, -45, 574);

    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-depths", "up,down,up");
    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-phrase-clarity", "3");
    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-lock-state", "locked");
    expect(screen.getByText(/FOLLOW THE GAP|沿着空隙/i)).toBeInTheDocument();
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("does not pass by mechanically traversing each band through every depth in the same order", () => {
    const onArm = vi.fn();
    renderScene({ slug: "clue-relay-braid", onArm });
    const bands = [0, 1, 2].map((index) => screen.getByTestId(`braid-band-${index}`));

    bands.forEach((band) => {
      fireEvent.keyDown(band, { key: "ArrowUp" });
      fireEvent.keyDown(band, { key: "ArrowDown" });
      fireEvent.keyDown(band, { key: "ArrowDown" });
    });

    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-depths", "down,down,down");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers keyboard lift and lower actions on the visible bands", () => {
    const onArm = vi.fn();
    renderScene({ slug: "clue-relay-braid", onArm });
    const first = screen.getByTestId("braid-band-0");
    const second = screen.getByTestId("braid-band-1");
    const third = screen.getByTestId("braid-band-2");

    first.focus(); fireEvent.keyDown(first, { key: "ArrowUp" });
    second.focus(); fireEvent.keyDown(second, { key: "ArrowDown" });
    third.focus(); fireEvent.keyDown(third, { key: "ArrowUp" });

    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-input-mode", "keyboard-weave");
    expect(screen.getByTestId("v2-scene-074")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 075", () => {
  it("renders one fixed four-band weave, a movable side beacon, and an edge-notch clue without exposing the answer", () => {
    renderScene({ slug: "relay-beacon-weave" });
    const scene = screen.getByTestId("v2-scene-075");

    expect(scene).toHaveAttribute("data-spatial-model", "fixed-four-band-weave-revealed-by-one-shared-light");
    expect(screen.getAllByTestId(/relay-weave-band-[0-3]$/)).toHaveLength(4);
    expect(screen.getByTestId("relay-weave-beacon")).toBeInTheDocument();
    expect(screen.getByTestId("relay-weave-notch")).toBeInTheDocument();
    expect(screen.queryByText(/移动光，不移动编织|relay beacon weave/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/上.*下.*上.*下|over.*under.*over.*under/i)).not.toBeInTheDocument();
  });

  it("keeps clicking or trying to move the already-woven paper bands from solving the puzzle", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-beacon-weave", onArm });

    screen.getAllByTestId(/relay-weave-band-[0-3]$/).forEach((band) => {
      fireEvent.click(band);
      fireEvent.pointerDown(band, { pointerId: 75, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(band, { pointerId: 75, clientX: 220, clientY: 160 });
      fireEvent.pointerUp(band, { pointerId: 75, clientX: 220, clientY: 160 });
    });

    expect(screen.getByTestId("v2-scene-075")).toHaveAttribute("data-weave-state", "fixed");
    expect(screen.getByTestId("v2-scene-075")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals contradictory crossings when the beacon moves to a plausible but wrong light position", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "relay-beacon-weave", onDiscover, onArm });
    const beacon = screen.getByTestId("relay-weave-beacon");

    fireEvent.pointerDown(beacon, { pointerId: 175, clientX: 40 });
    fireEvent.pointerMove(beacon, { pointerId: 175, clientX: 130 });
    fireEvent.pointerUp(beacon, { pointerId: 175, clientX: 130 });

    expect(screen.getByTestId("v2-scene-075")).toHaveAttribute("data-shadow-state", "contradictory");
    expect(screen.getByTestId("v2-scene-075")).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("presses the unchanged weave flat only when the beacon reaches the evidenced edge notch", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-beacon-weave", onArm });
    const beacon = screen.getByTestId("relay-weave-beacon");

    fireEvent.pointerDown(beacon, { pointerId: 275, clientX: 40 });
    fireEvent.pointerMove(beacon, { pointerId: 275, clientX: 225 });
    fireEvent.pointerUp(beacon, { pointerId: 275, clientX: 225 });

    const scene = screen.getByTestId("v2-scene-075");
    expect(scene).toHaveAttribute("data-beacon-state", "at-notch");
    expect(scene).toHaveAttribute("data-shadow-state", "alternating");
    expect(scene).toHaveAttribute("data-weave-state", "pressed");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("does not pass by mechanically clicking every visible object or sweeping away from the notch", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-beacon-weave", onArm });
    const scene = screen.getByTestId("v2-scene-075");
    const beacon = screen.getByTestId("relay-weave-beacon");

    fireEvent.click(scene);
    screen.getAllByTestId(/relay-weave-band-[0-3]$/).forEach((band) => fireEvent.click(band));
    fireEvent.pointerDown(beacon, { pointerId: 375, clientX: 220 });
    fireEvent.pointerMove(beacon, { pointerId: 375, clientX: 40 });
    fireEvent.pointerUp(beacon, { pointerId: 375, clientX: 40 });

    expect(scene).toHaveAttribute("data-beacon-state", "left-offset");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers a keyboard-equivalent route that moves the same visible beacon toward the notch", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-beacon-weave", onArm });
    const beacon = screen.getByTestId("relay-weave-beacon");

    beacon.focus();
    for (let step = 0; step < 5; step += 1) fireEvent.keyDown(beacon, { key: "ArrowRight" });

    expect(screen.getByTestId("v2-scene-075")).toHaveAttribute("data-input-mode", "keyboard-beacon");
    expect(screen.getByTestId("v2-scene-075")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 076", () => {
  it("renders five paper votes with separate face, shadow, and crease evidence without naming the odd vote", () => {
    renderScene({ slug: "relay-quorum" });
    const scene = screen.getByTestId("v2-scene-076");

    expect(scene).toHaveAttribute("data-spatial-model", "five-paper-votes-face-shadow-and-crease");
    expect(scene).toHaveAttribute("data-face-pattern", "ooocc");
    expect(scene).toHaveAttribute("data-shadow-pattern", "ococc");
    expect(screen.getAllByTestId(/quorum-leaf-[0-4]$/)).toHaveLength(5);
    expect(screen.getAllByTestId(/quorum-shadow-[0-4]$/)).toHaveLength(5);
    expect(screen.getByTestId("quorum-leaf-2")).toHaveAttribute("data-crease", "contrary");
    expect(screen.queryByText(/影子投票|relay quorum|异常|odd vote/i)).not.toBeInTheDocument();
  });

  it("flips both the face and shadow of a plausible but wrong vote without solving", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "relay-quorum", onDiscover, onArm });

    fireEvent.click(screen.getByTestId("quorum-leaf-0"));

    const scene = screen.getByTestId("v2-scene-076");
    expect(scene).toHaveAttribute("data-face-pattern", "coocc");
    expect(scene).toHaveAttribute("data-shadow-pattern", "ccocc");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("aligns both majorities only when the fold-contrary vote is the sole flipped leaf", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-quorum", onArm });

    fireEvent.click(screen.getByTestId("quorum-leaf-2"));

    const scene = screen.getByTestId("v2-scene-076");
    expect(scene).toHaveAttribute("data-face-majority", "closed");
    expect(scene).toHaveAttribute("data-shadow-majority", "closed");
    expect(scene).toHaveAttribute("data-vote-state", "unanimous-tilt");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("does not pass when every visible leaf is mechanically flipped once", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-quorum", onArm });

    screen.getAllByTestId(/quorum-leaf-[0-4]$/).forEach((leaf) => fireEvent.click(leaf));

    expect(screen.getByTestId("v2-scene-076")).toHaveAttribute("data-flip-pattern", "11111");
    expect(screen.getByTestId("v2-scene-076")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("allows a wrong vote to be restored before using the crease evidence", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-quorum", onArm });
    const wrong = screen.getByTestId("quorum-leaf-4");

    fireEvent.click(wrong);
    fireEvent.click(wrong);
    fireEvent.click(screen.getByTestId("quorum-leaf-2"));

    expect(screen.getByTestId("v2-scene-076")).toHaveAttribute("data-flip-pattern", "00100");
    expect(screen.getByTestId("v2-scene-076")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers Enter on the same visible leaf as the keyboard-equivalent flip", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-quorum", onArm });
    const odd = screen.getByTestId("quorum-leaf-2");

    odd.focus();
    fireEvent.keyDown(odd, { key: "Enter" });

    expect(screen.getByTestId("v2-scene-076")).toHaveAttribute("data-input-mode", "keyboard-flip");
    expect(screen.getByTestId("v2-scene-076")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 077", () => {
  it("renders fixed numbers, three separable relation strokes, and a subtle arrow groove without exposing the level name", () => {
    renderScene({ slug: "split-operator" });
    const scene = screen.getByTestId("v2-scene-077");

    expect(scene).toHaveAttribute("data-spatial-model", "fixed-numbers-three-stroke-relation-and-arrow-groove");
    expect(screen.getByText("9.95")).toBeInTheDocument();
    expect(screen.getByText("10.00")).toBeInTheDocument();
    expect(screen.getAllByTestId(/operator-stroke-(upper|lower|slash)$/)).toHaveLength(3);
    expect(screen.getByTestId("operator-arrow-groove")).toBeInTheDocument();
    expect(screen.queryByText(/改写关系|split operator|关系错误/i)).not.toBeInTheDocument();
  });

  it("keeps both number groups inert and uneditable", () => {
    const onArm = vi.fn();
    renderScene({ slug: "split-operator", onArm });
    const scene = screen.getByTestId("v2-scene-077");

    fireEvent.click(screen.getByTestId("operator-number-left"));
    fireEvent.click(screen.getByTestId("operator-number-right"));
    fireEvent.keyDown(scene, { key: "Backspace" });
    fireEvent.keyDown(scene, { key: "0" });

    expect(scene).toHaveAttribute("data-number-state", "fixed");
    expect(scene).toHaveAttribute("data-operator-state", "not-equal");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals only an equals sign when the slash is removed to a wrong side", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "split-operator", onDiscover, onArm });
    const slash = screen.getByTestId("operator-stroke-slash");

    fireEvent.pointerDown(slash, { pointerId: 177, clientX: 180, clientY: 100 });
    fireEvent.pointerMove(slash, { pointerId: 177, clientX: 110, clientY: 100 });
    fireEvent.pointerUp(slash, { pointerId: 177, clientX: 110, clientY: 100 });

    expect(screen.getByTestId("v2-scene-077")).toHaveAttribute("data-operator-state", "equals");
    expect(screen.getByTestId("v2-scene-077")).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("forms an arrow and previews slowing only when the slash reaches the right-hand groove", () => {
    const onArm = vi.fn();
    renderScene({ slug: "split-operator", onArm });
    const slash = screen.getByTestId("operator-stroke-slash");

    fireEvent.pointerDown(slash, { pointerId: 277, clientX: 180, clientY: 100 });
    fireEvent.pointerMove(slash, { pointerId: 277, clientX: 222, clientY: 100 });
    fireEvent.pointerUp(slash, { pointerId: 277, clientX: 222, clientY: 100 });

    const scene = screen.getByTestId("v2-scene-077");
    expect(scene).toHaveAttribute("data-operator-state", "arrow");
    expect(scene).toHaveAttribute("data-preview-state", "slowing");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("does not pass from clicking the slash or dragging it vertically away from the arrow relation", () => {
    const onArm = vi.fn();
    renderScene({ slug: "split-operator", onArm });
    const slash = screen.getByTestId("operator-stroke-slash");

    fireEvent.click(slash);
    fireEvent.pointerDown(slash, { pointerId: 377, clientX: 180, clientY: 100 });
    fireEvent.pointerMove(slash, { pointerId: 377, clientX: 180, clientY: 170 });
    fireEvent.pointerUp(slash, { pointerId: 377, clientX: 180, clientY: 170 });

    expect(screen.getByTestId("v2-scene-077")).toHaveAttribute("data-operator-state", "equals");
    expect(screen.getByTestId("v2-scene-077")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers keyboard position changes on the same visible slash", () => {
    const onArm = vi.fn();
    renderScene({ slug: "split-operator", onArm });
    const slash = screen.getByTestId("operator-stroke-slash");

    slash.focus();
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(slash, { key: "ArrowRight" });

    expect(screen.getByTestId("v2-scene-077")).toHaveAttribute("data-input-mode", "keyboard-stroke");
    expect(screen.getByTestId("v2-scene-077")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 078", () => {
  it("renders four visually equivalent paper windows, one neutral center grain, and phase trails without naming the counter-phase", () => {
    renderScene({ slug: "fourfold-oscillation" });
    const scene = screen.getByTestId("v2-scene-078");

    expect(scene).toHaveAttribute("data-spatial-model", "four-breathing-windows-one-counter-phase-center-cancellation");
    expect(screen.getAllByTestId(/oscillation-window-[0-3]$/)).toHaveLength(4);
    expect(screen.getByTestId("oscillation-center-slot")).toBeInTheDocument();
    expect(screen.getAllByTestId(/oscillation-trail-[0-3]$/)).toHaveLength(4);
    expect(screen.queryByText(/反拍|counter.phase|fourfold oscillation/i)).not.toBeInTheDocument();
  });

  it("does not solve by clicking every window or choosing by a visible color label", () => {
    const onArm = vi.fn();
    renderScene({ slug: "fourfold-oscillation", onArm });

    screen.getAllByTestId(/oscillation-window-[0-3]$/).forEach((window) => fireEvent.click(window));

    expect(screen.getByTestId("v2-scene-078")).toHaveAttribute("data-window-colors", "same,same,same,same");
    expect(screen.getByTestId("v2-scene-078")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("leaves a same-phase trail and reinforces the amplitude when a plausible wrong window reaches the center", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "fourfold-oscillation", onDiscover, onArm });
    const wrong = screen.getByTestId("oscillation-window-0");

    fireEvent.pointerDown(wrong, { pointerId: 178, clientX: 80, clientY: 60 });
    fireEvent.pointerMove(wrong, { pointerId: 178, clientX: 180, clientY: 130 });
    fireEvent.pointerUp(wrong, { pointerId: 178, clientX: 180, clientY: 130 });

    const scene = screen.getByTestId("v2-scene-078");
    expect(scene).toHaveAttribute("data-last-phase", "same");
    expect(scene).toHaveAttribute("data-amplitude", "reinforced");
    expect(screen.getByTestId("oscillation-trail-0")).toHaveAttribute("data-visible", "true");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("cancels the three matching afterimages only when the counter-phase window enters the center grain", () => {
    const onArm = vi.fn();
    renderScene({ slug: "fourfold-oscillation", onArm });
    const counter = screen.getByTestId("oscillation-window-2");

    fireEvent.pointerDown(counter, { pointerId: 278, clientX: 80, clientY: 170 });
    fireEvent.pointerMove(counter, { pointerId: 278, clientX: 180, clientY: 130 });
    fireEvent.pointerUp(counter, { pointerId: 278, clientX: 180, clientY: 130 });

    const scene = screen.getByTestId("v2-scene-078");
    expect(scene).toHaveAttribute("data-last-phase", "counter");
    expect(scene).toHaveAttribute("data-amplitude", "cancelled");
    expect(scene).toHaveAttribute("data-center-state", "filled");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("does not pass by dragging all four windows through the same noncentral route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "fourfold-oscillation", onArm });

    screen.getAllByTestId(/oscillation-window-[0-3]$/).forEach((window, index) => {
      fireEvent.pointerDown(window, { pointerId: 378 + index, clientX: 80, clientY: 80 });
      fireEvent.pointerMove(window, { pointerId: 378 + index, clientX: 115, clientY: 90 });
      fireEvent.pointerUp(window, { pointerId: 378 + index, clientX: 115, clientY: 90 });
    });

    expect(screen.getByTestId("v2-scene-078")).toHaveAttribute("data-trail-pattern", "1111");
    expect(screen.getByTestId("v2-scene-078")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers Enter on the observed counter-phase window as the keyboard-equivalent center placement", () => {
    const onArm = vi.fn();
    renderScene({ slug: "fourfold-oscillation", onArm });
    const counter = screen.getByTestId("oscillation-window-2");

    counter.focus();
    fireEvent.keyDown(counter, { key: "Enter" });

    expect(screen.getByTestId("v2-scene-078")).toHaveAttribute("data-input-mode", "keyboard-window");
    expect(screen.getByTestId("v2-scene-078")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 079", () => {
  it("renders seven physical vote leaves, three initially visible, and four matching fold shadows without exposing a count tutorial", () => {
    renderScene({ slug: "seven-relay-vote" });
    const scene = screen.getByTestId("v2-scene-079");

    expect(scene).toHaveAttribute("data-spatial-model", "seven-votes-three-exposed-four-behind-one-adjustable-fold");
    expect(scene).toHaveAttribute("data-visible-votes", "3");
    expect(screen.getAllByTestId(/countdown-vote-[0-6]$/)).toHaveLength(7);
    expect(screen.getAllByTestId(/countdown-shadow-[0-3]$/)).toHaveLength(4);
    expect(screen.getByTestId("countdown-fold")).toBeInTheDocument();
    expect(screen.queryByText(/折页后的多数|countdown relay|七票|7 votes/i)).not.toBeInTheDocument();
  });

  it("keeps clicking every vote from becoming an alternate solution", () => {
    const onArm = vi.fn();
    renderScene({ slug: "seven-relay-vote", onArm });

    screen.getAllByTestId(/countdown-vote-[0-6]$/).forEach((vote) => fireEvent.click(vote));

    expect(screen.getByTestId("v2-scene-079")).toHaveAttribute("data-fold-state", "closed");
    expect(screen.getByTestId("v2-scene-079")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals more physical votes and their paired shadows as the single fold opens", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "seven-relay-vote", onDiscover, onArm });
    const fold = screen.getByTestId("countdown-fold");

    fireEvent.pointerDown(fold, { pointerId: 179, clientX: 220 });
    fireEvent.pointerMove(fold, { pointerId: 179, clientX: 160 });
    fireEvent.pointerUp(fold, { pointerId: 179, clientX: 160 });

    const scene = screen.getByTestId("v2-scene-079");
    expect(scene).toHaveAttribute("data-visible-votes", "5");
    expect(scene).toHaveAttribute("data-visible-shadows", "2");
    expect(scene).toHaveAttribute("data-fold-state", "partly-open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not pass when the fold is dragged beyond the simultaneous seven-vote view", () => {
    const onArm = vi.fn();
    renderScene({ slug: "seven-relay-vote", onArm });
    const fold = screen.getByTestId("countdown-fold");

    fireEvent.pointerDown(fold, { pointerId: 279, clientX: 280 });
    fireEvent.pointerMove(fold, { pointerId: 279, clientX: 40 });
    fireEvent.pointerUp(fold, { pointerId: 279, clientX: 40 });

    const scene = screen.getByTestId("v2-scene-079");
    expect(scene).toHaveAttribute("data-fold-state", "overfolded");
    expect(scene).toHaveAttribute("data-visible-votes", "6");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("presses the majority direction only in the broad fold range where all seven votes are visible together", () => {
    const onArm = vi.fn();
    renderScene({ slug: "seven-relay-vote", onArm });
    const fold = screen.getByTestId("countdown-fold");

    fireEvent.pointerDown(fold, { pointerId: 379, clientX: 280 });
    fireEvent.pointerMove(fold, { pointerId: 379, clientX: 110 });
    fireEvent.pointerUp(fold, { pointerId: 379, clientX: 110 });

    const scene = screen.getByTestId("v2-scene-079");
    expect(scene).toHaveAttribute("data-visible-votes", "7");
    expect(scene).toHaveAttribute("data-visible-shadows", "4");
    expect(scene).toHaveAttribute("data-majority", "right");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers arrow keys on the same visible fold as the keyboard-equivalent adjustment", () => {
    const onArm = vi.fn();
    renderScene({ slug: "seven-relay-vote", onArm });
    const fold = screen.getByTestId("countdown-fold");

    fold.focus();
    for (let step = 0; step < 3; step += 1) fireEvent.keyDown(fold, { key: "ArrowLeft" });

    expect(screen.getByTestId("v2-scene-079")).toHaveAttribute("data-input-mode", "keyboard-fold");
    expect(screen.getByTestId("v2-scene-079")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 080", () => {
  it("renders compressed concentric paper rings, subtle outward fibers, and a closed center without naming the solution", () => {
    renderScene({ slug: "pressure-singularity" });
    const scene = screen.getByTestId("v2-scene-080");

    expect(scene).toHaveAttribute("data-spatial-model", "compressed-concentric-paper-rings-outer-fibers-and-released-center");
    expect(scene).toHaveAttribute("data-loosened-layers", "0");
    expect(screen.getAllByTestId(/singularity-ring-[0-3]$/)).toHaveLength(4);
    expect(screen.getAllByTestId(/singularity-fiber-[0-5]$/)).toHaveLength(6);
    expect(screen.getByTestId("singularity-center")).toBeInTheDocument();
    expect(screen.queryByText(/从外面拉开|pressure singularity|释放压力|pull.*outside/i)).not.toBeInTheDocument();
  });

  it("tightens the paper stack instead of solving when the center is pressed", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "pressure-singularity", onDiscover, onArm });
    const center = screen.getByTestId("singularity-center");

    fireEvent.click(center);
    fireEvent.click(center);

    const scene = screen.getByTestId("v2-scene-080");
    expect(scene).toHaveAttribute("data-center-state", "tighter");
    expect(scene).toHaveAttribute("data-center-presses", "2");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not release pressure by clicking or dragging the inner rings", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pressure-singularity", onArm });
    const inner = screen.getByTestId("singularity-ring-2");

    fireEvent.click(inner);
    fireEvent.pointerDown(inner, { pointerId: 180, clientX: 180, clientY: 120 });
    fireEvent.pointerMove(inner, { pointerId: 180, clientX: 250, clientY: 120 });
    fireEvent.pointerUp(inner, { pointerId: 180, clientX: 250, clientY: 120 });

    expect(screen.getByTestId("v2-scene-080")).toHaveAttribute("data-loosened-layers", "0");
    expect(screen.getByTestId("v2-scene-080")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("retains a loosened inner layer when the outer-ring pull crosses only the first threshold", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "pressure-singularity", onDiscover, onArm });
    const outer = screen.getByTestId("singularity-ring-0");

    fireEvent.pointerDown(outer, { pointerId: 280, clientX: 200, clientY: 120 });
    fireEvent.pointerMove(outer, { pointerId: 280, clientX: 230, clientY: 120 });
    fireEvent.pointerUp(outer, { pointerId: 280, clientX: 230, clientY: 120 });

    const scene = screen.getByTestId("v2-scene-080");
    expect(scene).toHaveAttribute("data-loosened-layers", "1");
    expect(scene).toHaveAttribute("data-tension-state", "loosening");
    expect(scene).toHaveAttribute("data-center-state", "compressed");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("opens the center only after one continuous outward pull transmits through all three thresholds", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pressure-singularity", onArm });
    const outer = screen.getByTestId("singularity-ring-0");

    fireEvent.pointerDown(outer, { pointerId: 380, clientX: 200, clientY: 120 });
    fireEvent.pointerMove(outer, { pointerId: 380, clientX: 230, clientY: 120 });
    fireEvent.pointerMove(outer, { pointerId: 380, clientX: 250, clientY: 120 });
    fireEvent.pointerMove(outer, { pointerId: 380, clientX: 280, clientY: 120 });
    fireEvent.pointerUp(outer, { pointerId: 380, clientX: 280, clientY: 120 });

    const scene = screen.getByTestId("v2-scene-080");
    expect(scene).toHaveAttribute("data-loosened-layers", "3");
    expect(scene).toHaveAttribute("data-tension-state", "released");
    expect(scene).toHaveAttribute("data-center-state", "open");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers three direction-key pull stages on the same visible outer ring", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pressure-singularity", onArm });
    const outer = screen.getByTestId("singularity-ring-0");

    outer.focus();
    fireEvent.keyDown(outer, { key: "ArrowRight" });
    fireEvent.keyDown(outer, { key: "ArrowRight" });
    fireEvent.keyDown(outer, { key: "ArrowRight" });

    const scene = screen.getByTestId("v2-scene-080");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-radial");
    expect(scene).toHaveAttribute("data-center-state", "open");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 081", () => {
  it("renders two mismatched half rings and one shared socket without exposing the input recipe", () => {
    renderScene({ slug: "dual-device" });
    const scene = screen.getByTestId("v2-scene-081");

    expect(scene).toHaveAttribute("data-spatial-model", "pointer-grain-and-companion-grain-half-rings-share-one-socket");
    expect(screen.getByTestId("dual-pointer-half")).toBeInTheDocument();
    expect(screen.getByTestId("dual-companion-half")).toBeInTheDocument();
    expect(screen.getByTestId("dual-shared-socket")).toBeInTheDocument();
    expect(screen.getByTestId("dual-pointer-grain")).toBeInTheDocument();
    expect(screen.getByTestId("dual-keycap-grain")).toBeInTheDocument();
    expect(screen.getByTestId("dual-two-touch-grain")).toBeInTheDocument();
    expect(screen.queryByText(/两种手|dual device|指针.*键盘|pointer.*keyboard/i)).not.toBeInTheDocument();
  });

  it("does not let clicking both halves or using the pointer on the companion half fill the socket", () => {
    const onArm = vi.fn();
    renderScene({ slug: "dual-device", onArm });
    const pointerHalf = screen.getByTestId("dual-pointer-half");
    const companionHalf = screen.getByTestId("dual-companion-half");

    fireEvent.click(pointerHalf);
    fireEvent.click(companionHalf);
    fireEvent.pointerDown(companionHalf, { pointerId: 181, pointerType: "mouse", clientX: 240 });
    fireEvent.pointerMove(companionHalf, { pointerId: 181, pointerType: "mouse", clientX: 170 });
    fireEvent.pointerUp(companionHalf, { pointerId: 181, pointerType: "mouse", clientX: 170 });

    const scene = screen.getByTestId("v2-scene-081");
    expect(scene).toHaveAttribute("data-pointer-half", "waiting");
    expect(scene).toHaveAttribute("data-companion-half", "waiting");
    expect(scene).toHaveAttribute("data-mismatch", "companion");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("docks only the pointer-grain half after a single pointer drag", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "dual-device", onDiscover, onArm });
    const pointerHalf = screen.getByTestId("dual-pointer-half");

    fireEvent.pointerDown(pointerHalf, { pointerId: 281, pointerType: "mouse", clientX: 100 });
    fireEvent.pointerMove(pointerHalf, { pointerId: 281, pointerType: "mouse", clientX: 165 });
    fireEvent.pointerUp(pointerHalf, { pointerId: 281, pointerType: "mouse", clientX: 165 });

    const scene = screen.getByTestId("v2-scene-081");
    expect(scene).toHaveAttribute("data-pointer-half", "docked");
    expect(scene).toHaveAttribute("data-companion-half", "waiting");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("docks only the companion half when the keyboard supplies its distinct input", () => {
    const onArm = vi.fn();
    renderScene({ slug: "dual-device", onArm });
    const companionHalf = screen.getByTestId("dual-companion-half");

    companionHalf.focus();
    fireEvent.keyDown(companionHalf, { key: "ArrowLeft" });

    const scene = screen.getByTestId("v2-scene-081");
    expect(scene).toHaveAttribute("data-pointer-half", "waiting");
    expect(scene).toHaveAttribute("data-companion-half", "docked");
    expect(scene).toHaveAttribute("data-companion-input", "keyboard");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("forms the complete ring only after pointer and keyboard each deliver their matching half", () => {
    const onArm = vi.fn();
    renderScene({ slug: "dual-device", onArm });
    const pointerHalf = screen.getByTestId("dual-pointer-half");
    const companionHalf = screen.getByTestId("dual-companion-half");

    fireEvent.pointerDown(pointerHalf, { pointerId: 381, pointerType: "mouse", clientX: 100 });
    fireEvent.pointerMove(pointerHalf, { pointerId: 381, pointerType: "mouse", clientX: 165 });
    fireEvent.pointerUp(pointerHalf, { pointerId: 381, pointerType: "mouse", clientX: 165 });
    fireEvent.keyDown(companionHalf, { key: "ArrowLeft" });

    const scene = screen.getByTestId("v2-scene-081");
    expect(scene).toHaveAttribute("data-input-pair", "pointer+keyboard");
    expect(scene).toHaveAttribute("data-ring-state", "complete");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("supports the mobile-equivalent pair of one-finger delivery and two-finger delivery", () => {
    const onArm = vi.fn();
    renderScene({ slug: "dual-device", onArm });
    const pointerHalf = screen.getByTestId("dual-pointer-half");
    const companionHalf = screen.getByTestId("dual-companion-half");

    fireEvent.pointerDown(pointerHalf, { pointerId: 481, pointerType: "touch", clientX: 100 });
    fireEvent.pointerMove(pointerHalf, { pointerId: 481, pointerType: "touch", clientX: 165 });
    fireEvent.pointerUp(pointerHalf, { pointerId: 481, pointerType: "touch", clientX: 165 });
    fireEvent.pointerDown(companionHalf, { pointerId: 581, pointerType: "touch", clientX: 245 });
    fireEvent.pointerDown(companionHalf, { pointerId: 582, pointerType: "touch", clientX: 260 });
    fireEvent.pointerMove(companionHalf, { pointerId: 582, pointerType: "touch", clientX: 205 });
    fireEvent.pointerUp(companionHalf, { pointerId: 582, pointerType: "touch", clientX: 205 });
    fireEvent.pointerUp(companionHalf, { pointerId: 581, pointerType: "touch", clientX: 190 });

    const scene = screen.getByTestId("v2-scene-081");
    expect(scene).toHaveAttribute("data-input-pair", "touch+two-touch");
    expect(scene).toHaveAttribute("data-ring-state", "complete");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("approved spatial pilot decorations", () => {
  it("does not add any pilot depth node while the default-off flag is closed", () => {
    renderScene({ slug: "four-corner-breach" });
    expect(screen.queryByTestId("corner-spatial-depth")).not.toBeInTheDocument();
    expect(screen.getByTestId("puzzle-scene")).toHaveAttribute("data-spatial-pilot", "false");
  });

  it.each([
    ["breath-gap", "breath-spatial-depth"],
    ["relay-sandwich", "relay-spatial-depth"],
    ["slow-command", "slow-word-spatial-depth"],
    ["corner-cross", "corner-cross-spatial-depth"],
    ["focus-orbit", "focus-orbit-spatial-depth"],
  ])("keeps %s free of pilot-only DOM while the flag is closed", (slug, depthTestId) => {
    renderScene({ slug });
    expect(screen.queryByTestId(depthTestId)).not.toBeInTheDocument();
    expect(screen.getByTestId("puzzle-scene")).toHaveAttribute("data-spatial-pilot", "false");
  });

  it("keeps 001 keyboard completion identical when its aria-hidden depth is enabled", () => {
    const onArm = vi.fn();
    renderScene({ slug: "four-corner-breach", spatialPilot: true, onArm });
    const depth = screen.getByTestId("corner-spatial-depth");
    const corner = screen.getByRole("button", { name: "游离的纸角" });

    expect(depth).toHaveAttribute("aria-hidden", "true");
    corner.focus();
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowDown" });
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps 002 quiet discovery and the 1.2 second hold identical when its depth is enabled", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "breath-gap", spatialPilot: true, onArm });

    expect(screen.getByTestId("breath-spatial-depth")).toHaveAttribute("aria-hidden", "true");
    act(() => vi.advanceTimersByTime(2_500));
    const bubble = screen.getByRole("button", { name: "安静的气泡" });
    fireEvent.pointerDown(bubble, { pointerId: 702 });
    act(() => vi.advanceTimersByTime(1_199));
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onArm).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("keeps 008 middle-first keyboard completion identical when its depth is enabled", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-sandwich", spatialPilot: true, onArm });
    const sheet = screen.getByRole("button", { name: "透明薄片" });
    const left = screen.getByRole("button", { name: "左侧珊瑚外壳" });
    const right = screen.getByRole("button", { name: "右侧珊瑚外壳" });

    expect(screen.getByTestId("relay-spatial-depth")).toHaveAttribute("aria-hidden", "true");
    fireEvent.keyDown(left, { key: "ArrowRight" });
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(sheet, { key: "Enter" });
    fireEvent.keyDown(left, { key: "ArrowRight" });
    fireEvent.keyDown(right, { key: "ArrowLeft" });
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps 003 two-pass SLOW completion and its 400ms hold identical when depth is enabled", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "slow-command", spatialPilot: true, onArm });
    const tiles = screen.getAllByRole("button", { name: /^字牌 \d/ });

    expect(screen.getByTestId("slow-word-spatial-depth")).toHaveAttribute("aria-hidden", "true");
    for (const tile of tiles) fireEvent.click(tile);
    act(() => vi.advanceTimersByTime(500));
    expect(onArm).not.toHaveBeenCalled();
    for (const tile of tiles) fireEvent.click(tile);
    act(() => vi.advanceTimersByTime(399));
    expect(onArm).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onArm).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("keeps 014 alternating-axis keyboard completion identical when depth is enabled", () => {
    const onArm = vi.fn();
    renderScene({ slug: "corner-cross", spatialPilot: true, onArm });
    const horizontal = screen.getByRole("button", { name: "横向断裂丝带" });
    const vertical = screen.getByRole("button", { name: "纵向断裂丝带" });

    expect(screen.getByTestId("corner-cross-spatial-depth")).toHaveAttribute("aria-hidden", "true");
    fireEvent.keyDown(horizontal, { key: "ArrowRight" });
    fireEvent.keyDown(horizontal, { key: "ArrowRight" });
    expect(onArm).not.toHaveBeenCalled();
    fireEvent.keyDown(vertical, { key: "ArrowUp" });
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps 044 focus-lens keyboard completion identical when depth is enabled", () => {
    const onArm = vi.fn();
    renderScene({ slug: "focus-orbit", spatialPilot: true, onArm });
    const lens = screen.getByRole("button", { name: "透明焦点片" });

    expect(screen.getByTestId("focus-orbit-spatial-depth")).toHaveAttribute("aria-hidden", "true");
    for (let move = 0; move < 4; move += 1) fireEvent.keyDown(lens, { key: "ArrowRight" });
    for (let move = 0; move < 3; move += 1) fireEvent.keyDown(lens, { key: "ArrowUp" });
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps 043 focus completion identical and shares one stretched route coordinate system", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-route", spatialPilot: true, onArm });
    const depth = screen.getByTestId("archive-route-spatial-depth");
    const routeSvgs = depth.parentElement?.querySelectorAll("svg");
    const tabs = screen.getAllByRole("button", { name: /档案页签/ });

    expect(depth).toHaveAttribute("aria-hidden", "true");
    expect(depth).toHaveAttribute("preserveAspectRatio", "none");
    expect(routeSvgs).toHaveLength(2);
    expect([...routeSvgs!].every((svg) => svg.getAttribute("viewBox") === "0 0 100 100" && svg.getAttribute("preserveAspectRatio") === "none")).toBe(true);
    tabs.forEach((tab) => fireEvent.focus(tab));
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("keeps 081 pointer plus keyboard completion identical when its depth is enabled", () => {
    const onArm = vi.fn();
    renderScene({ slug: "dual-device", spatialPilot: true, onArm });
    const pointerHalf = screen.getByTestId("dual-pointer-half");
    const companionHalf = screen.getByTestId("dual-companion-half");

    expect(screen.getByTestId("dual-spatial-depth")).toHaveAttribute("aria-hidden", "true");
    fireEvent.pointerDown(pointerHalf, { pointerId: 881, pointerType: "mouse", clientX: 100 });
    fireEvent.pointerMove(pointerHalf, { pointerId: 881, pointerType: "mouse", clientX: 165 });
    fireEvent.pointerUp(pointerHalf, { pointerId: 881, pointerType: "mouse", clientX: 165 });
    fireEvent.keyDown(companionHalf, { key: "ArrowLeft" });

    expect(screen.getByTestId("v2-scene-081")).toHaveAttribute("data-ring-state", "complete");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 082", () => {
  it("renders one solid pointer, three same-color arrow shadows, and two shallow candidate wells without naming the majority", () => {
    renderScene({ slug: "pointer-majority" });
    const scene = screen.getByTestId("v2-scene-082");

    expect(scene).toHaveAttribute("data-spatial-model", "one-solid-pointer-three-arrow-shadows-two-candidate-wells");
    expect(screen.getByTestId("majority-pointer")).toBeInTheDocument();
    expect(screen.getAllByTestId(/majority-shadow-[0-2]$/)).toHaveLength(3);
    expect(screen.getAllByTestId(/majority-well-[0-1]$/)).toHaveLength(2);
    expect(screen.queryByText(/三个指针的多数|pointer majority|多数目标|majority target/i)).not.toBeInTheDocument();
  });

  it("does not solve by clicking the pointer or either candidate well", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pointer-majority", onArm });

    fireEvent.click(screen.getByTestId("majority-pointer"));
    screen.getAllByTestId(/majority-well-[0-1]$/).forEach((well) => fireEvent.click(well));

    expect(screen.getByTestId("v2-scene-082")).toHaveAttribute("data-visited", "none");
    expect(screen.getByTestId("v2-scene-082")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shortens only the dissenting shadow when the solid pointer visits the minority well", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "pointer-majority", onDiscover, onArm });
    const pointer = screen.getByTestId("majority-pointer");

    fireEvent.pointerDown(pointer, { pointerId: 182, clientX: 180, clientY: 130 });
    fireEvent.pointerMove(pointer, { pointerId: 182, clientX: 235, clientY: 95 });
    fireEvent.pointerUp(pointer, { pointerId: 182, clientX: 235, clientY: 95 });

    const scene = screen.getByTestId("v2-scene-082");
    expect(scene).toHaveAttribute("data-visited", "minority");
    expect(scene).toHaveAttribute("data-shortened-shadows", "001");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("merges the two agreeing shadows only when the solid pointer reaches their common well", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pointer-majority", onArm });
    const pointer = screen.getByTestId("majority-pointer");

    fireEvent.pointerDown(pointer, { pointerId: 282, clientX: 180, clientY: 130 });
    fireEvent.pointerMove(pointer, { pointerId: 282, clientX: 120, clientY: 145 });
    fireEvent.pointerUp(pointer, { pointerId: 282, clientX: 120, clientY: 145 });

    const scene = screen.getByTestId("v2-scene-082");
    expect(scene).toHaveAttribute("data-visited", "majority");
    expect(scene).toHaveAttribute("data-shortened-shadows", "110");
    expect(scene).toHaveAttribute("data-merge-state", "merged");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("does not award completion for visiting both wells by count rather than reading the current majority", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pointer-majority", onArm });
    const pointer = screen.getByTestId("majority-pointer");

    fireEvent.pointerDown(pointer, { pointerId: 382, clientX: 180, clientY: 130 });
    fireEvent.pointerMove(pointer, { pointerId: 382, clientX: 235, clientY: 95 });
    fireEvent.pointerUp(pointer, { pointerId: 382, clientX: 235, clientY: 95 });
    fireEvent.pointerDown(pointer, { pointerId: 383, clientX: 235, clientY: 95 });
    fireEvent.pointerMove(pointer, { pointerId: 383, clientX: 205, clientY: 120 });
    fireEvent.pointerUp(pointer, { pointerId: 383, clientX: 205, clientY: 120 });

    const scene = screen.getByTestId("v2-scene-082");
    expect(scene).toHaveAttribute("data-visit-count", "1");
    expect(scene).toHaveAttribute("data-visited", "between");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers direction keys on the same solid pointer as an equivalent candidate choice", () => {
    const onArm = vi.fn();
    renderScene({ slug: "pointer-majority", onArm });
    const pointer = screen.getByTestId("majority-pointer");

    pointer.focus();
    fireEvent.keyDown(pointer, { key: "ArrowRight" });
    expect(screen.getByTestId("v2-scene-082")).toHaveAttribute("data-lock-state", "open");
    fireEvent.keyDown(pointer, { key: "ArrowLeft" });

    expect(screen.getByTestId("v2-scene-082")).toHaveAttribute("data-input-mode", "keyboard-pointer");
    expect(screen.getByTestId("v2-scene-082")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 083", () => {
  it("renders two alternating target rings, crossing paper trails, and an unlit shared center without naming the solution", () => {
    renderScene({ slug: "alternating-target" });
    const scene = screen.getByTestId("v2-scene-083");

    expect(scene).toHaveAttribute("data-spatial-model", "two-alternating-target-rings-with-one-unlit-shared-intersection");
    expect(screen.getAllByTestId(/alternating-ring-[0-1]$/)).toHaveLength(2);
    expect(screen.getAllByTestId(/alternating-trail-[0-1]$/)).toHaveLength(2);
    expect(screen.getByTestId("alternating-shared-center")).toBeInTheDocument();
    expect(scene).toHaveAttribute("data-center-lit", "false");
    expect(screen.queryByText(/两个目标的共同中心|alternating target|共同中心|shared center/i)).not.toBeInTheDocument();
  });

  it("swaps the visible target and leaves one central pressure imprint after a chase", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "alternating-target", onDiscover, onArm });

    fireEvent.click(screen.getByTestId("alternating-ring-0"));

    const scene = screen.getByTestId("v2-scene-083");
    expect(scene).toHaveAttribute("data-active-target", "none");
    expect(scene).toHaveAttribute("data-next-target", "right");
    expect(scene).toHaveAttribute("data-intersection-imprints", "1");
    expect(scene).toHaveAttribute("data-window-open", "true");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("never converts repeated target chasing into completion", () => {
    const onArm = vi.fn();
    renderScene({ slug: "alternating-target", onArm });
    const rings = screen.getAllByTestId(/alternating-ring-[0-1]$/);

    for (let step = 0; step < 8; step += 1) fireEvent.click(rings[step % 2]);

    const scene = screen.getByTestId("v2-scene-083");
    expect(scene).toHaveAttribute("data-chase-count", "8");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not solve from pressing the center before two crossings make the relation legible", () => {
    const onArm = vi.fn();
    renderScene({ slug: "alternating-target", onArm });

    fireEvent.click(screen.getByTestId("alternating-shared-center"));
    fireEvent.click(screen.getByTestId("alternating-ring-0"));
    fireEvent.click(screen.getByTestId("alternating-shared-center"));

    expect(screen.getByTestId("v2-scene-083")).toHaveAttribute("data-chase-count", "1");
    expect(screen.getByTestId("v2-scene-083")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("fixes both rings only when the unlit center is pressed during the broad second crossing window", () => {
    const onArm = vi.fn();
    renderScene({ slug: "alternating-target", onArm });

    fireEvent.click(screen.getByTestId("alternating-ring-0"));
    fireEvent.click(screen.getByTestId("alternating-ring-1"));
    fireEvent.click(screen.getByTestId("alternating-shared-center"));

    const scene = screen.getByTestId("v2-scene-083");
    expect(scene).toHaveAttribute("data-window-ms", "1200");
    expect(scene).toHaveAttribute("data-ring-state", "fixed-together");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers Enter to chase and Space on the same unlit center as the keyboard-equivalent route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "alternating-target", onArm });
    const left = screen.getByTestId("alternating-ring-0");
    const right = screen.getByTestId("alternating-ring-1");
    const center = screen.getByTestId("alternating-shared-center");

    fireEvent.keyDown(left, { key: "Enter" });
    fireEvent.keyDown(right, { key: "Enter" });
    fireEvent.keyDown(center, { key: " " });

    expect(screen.getByTestId("v2-scene-083")).toHaveAttribute("data-input-mode", "keyboard-center");
    expect(screen.getByTestId("v2-scene-083")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 084", () => {
  const moveDot = (fromX: number, toX: number, y = 150) => {
    const dot = screen.getByTestId("ghost-session-dot");
    fireEvent.pointerDown(dot, { pointerId: 184, clientX: fromX, clientY: y });
    fireEvent.pointerMove(dot, { pointerId: 184, clientX: toX, clientY: y });
    fireEvent.pointerUp(dot, { pointerId: 184, clientX: toX, clientY: y });
  };

  it("renders one movable paper dot, two complementary half-imprints, and no named solution", () => {
    renderScene({ slug: "ghost-session" });
    const scene = screen.getByTestId("v2-scene-084");

    expect(scene).toHaveAttribute("data-spatial-model", "one-returning-dot-two-complementary-imprints-one-session-shadow");
    expect(screen.getByTestId("ghost-session-dot")).toBeInTheDocument();
    expect(screen.getAllByTestId(/ghost-imprint-[0-1]$/)).toHaveLength(2);
    expect(scene).toHaveAttribute("data-shadow-anchor", "none");
    expect(screen.queryByText(/重来后留下的影子|ghost session|完整圆|complete circle/i)).not.toBeInTheDocument();
  });

  it("records a grounded first position but does not reveal a shadow or complete before a normal reset", () => {
    const onArm = vi.fn();
    const onGhostAnchorChange = vi.fn();
    renderScene({ slug: "ghost-session", onArm, onGhostAnchorChange });

    moveDot(180, 120);

    const scene = screen.getByTestId("v2-scene-084");
    expect(scene).toHaveAttribute("data-dot-anchor", "left");
    expect(scene).toHaveAttribute("data-shadow-anchor", "none");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onGhostAnchorChange).toHaveBeenCalledWith("left");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rejects an ungrounded movement so a later reset cannot manufacture a useful shadow", () => {
    const onArm = vi.fn();
    const onGhostAnchorChange = vi.fn();
    renderScene({ slug: "ghost-session", resetEpoch: 1, ghostAnchor: null, onArm, onGhostAnchorChange });

    moveDot(180, 180, 80);

    const scene = screen.getByTestId("v2-scene-084");
    expect(scene).toHaveAttribute("data-dot-anchor", "ungrounded");
    expect(scene).toHaveAttribute("data-shadow-anchor", "none");
    expect(onGhostAnchorChange).toHaveBeenCalledWith(null);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("restores the dot to its start while preserving the valid shallow shadow after exactly one reset", () => {
    renderScene({ slug: "ghost-session", resetEpoch: 1, ghostAnchor: "left" });
    const scene = screen.getByTestId("v2-scene-084");

    expect(scene).toHaveAttribute("data-reset-count", "1");
    expect(scene).toHaveAttribute("data-dot-anchor", "start");
    expect(scene).toHaveAttribute("data-shadow-anchor", "left");
    expect(scene).toHaveAttribute("data-shadow-persistence", "session-only");
  });

  it("requires the complementary second imprint rather than repeating the same side", () => {
    const onArm = vi.fn();
    renderScene({ slug: "ghost-session", resetEpoch: 1, ghostAnchor: "left", onArm });

    moveDot(180, 120);
    expect(screen.getByTestId("v2-scene-084")).toHaveAttribute("data-lock-state", "open");
    moveDot(120, 240);

    const scene = screen.getByTestId("v2-scene-084");
    expect(scene).toHaveAttribute("data-circle-state", "complete");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers direction keys on the same dot as an equivalent two-position route across one reset", () => {
    const onGhostAnchorChange = vi.fn();
    const first = renderScene({ slug: "ghost-session", onGhostAnchorChange });
    fireEvent.keyDown(screen.getByTestId("ghost-session-dot"), { key: "ArrowLeft" });
    expect(onGhostAnchorChange).toHaveBeenCalledWith("left");

    first.unmount();
    const onArm = vi.fn();
    renderScene({ slug: "ghost-session", resetEpoch: 1, ghostAnchor: "left", onArm });
    fireEvent.keyDown(screen.getByTestId("ghost-session-dot"), { key: "ArrowRight" });

    expect(screen.getByTestId("v2-scene-084")).toHaveAttribute("data-input-mode", "keyboard-position");
    expect(screen.getByTestId("v2-scene-084")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 085", () => {
  afterEach(() => vi.useRealTimers());

  const dragCover = (fromY: number, toY: number) => {
    const cover = screen.getByTestId("phase-return-cover");
    fireEvent.pointerDown(cover, { pointerId: 185, clientX: 180, clientY: fromY });
    fireEvent.pointerMove(cover, { pointerId: 185, clientX: 180, clientY: toY });
    fireEvent.pointerUp(cover, { pointerId: 185, clientX: 180, clientY: toY });
  };

  it("renders a moving moon phase, pull-down cover, edge window, and complementary notch without naming the answer", () => {
    renderScene({ slug: "phase-return" });
    const scene = screen.getByTestId("v2-scene-085");

    expect(scene).toHaveAttribute("data-spatial-model", "moving-moon-under-page-cover-with-one-edge-window-and-complementary-notch");
    expect(screen.getByTestId("phase-return-moon")).toBeInTheDocument();
    expect(screen.getByTestId("phase-return-cover")).toBeInTheDocument();
    expect(screen.getByTestId("phase-return-window")).toBeInTheDocument();
    expect(scene).toHaveAttribute("data-window-ms", "1800");
    expect(screen.queryByText(/被盖住时继续走|phase return|互补月相|complementary phase/i)).not.toBeInTheDocument();
  });

  it("ignores initial or synthetic visibility events instead of treating them as a completed cover-return", () => {
    const onArm = vi.fn();
    renderScene({ slug: "phase-return", onArm });

    fireEvent(document, new Event("visibilitychange"));

    expect(screen.getByTestId("v2-scene-085")).toHaveAttribute("data-cover-state", "open");
    expect(screen.getByTestId("v2-scene-085")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not solve from clicking the moon or page cover", () => {
    const onArm = vi.fn();
    renderScene({ slug: "phase-return", onArm });

    fireEvent.click(screen.getByTestId("phase-return-moon"));
    fireEvent.click(screen.getByTestId("phase-return-cover"));

    expect(screen.getByTestId("v2-scene-085")).toHaveAttribute("data-cover-state", "open");
    expect(screen.getByTestId("v2-scene-085")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals a difference shadow when the cover is lifted before the complementary phase arrives", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "phase-return", onArm });

    dragCover(100, 170);
    act(() => vi.advanceTimersByTime(700));
    dragCover(170, 100);

    const scene = screen.getByTestId("v2-scene-085");
    expect(scene).toHaveAttribute("data-cover-state", "open");
    expect(scene).toHaveAttribute("data-difference-shadow", "visible");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps the hidden phase moving and accepts the broad 1.8 second complementary window", () => {
    vi.useFakeTimers();
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "phase-return", onDiscover, onArm });

    dragCover(100, 170);
    act(() => vi.advanceTimersByTime(2_100));
    expect(Number(screen.getByTestId("v2-scene-085").getAttribute("data-hidden-elapsed-ms"))).toBeGreaterThanOrEqual(2_000);
    dragCover(170, 100);

    const scene = screen.getByTestId("v2-scene-085");
    expect(scene).toHaveAttribute("data-phase-state", "complementary");
    expect(scene).toHaveAttribute("data-circle-state", "full");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers Enter on the same cover as the keyboard-equivalent cover, wait, and reveal route", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "phase-return", onArm });
    const cover = screen.getByTestId("phase-return-cover");

    fireEvent.keyDown(cover, { key: "Enter" });
    act(() => vi.advanceTimersByTime(2_100));
    fireEvent.keyDown(cover, { key: "Enter" });

    expect(screen.getByTestId("v2-scene-085")).toHaveAttribute("data-input-mode", "keyboard-cover");
    expect(screen.getByTestId("v2-scene-085")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 086", () => {
  const eclipseScene = (menuOpen: boolean, eclipseOffset: number, onArm = vi.fn(), onDiscover = vi.fn()) => (
    <LocaleProvider initialLocale="zh">
      <V2PuzzleScene
        slug="eclipse-session"
        armed={false}
        hintLevel={0}
        menuOpen={menuOpen}
        eclipseOffset={eclipseOffset}
        onDiscover={onDiscover}
        onArm={onArm}
      />
    </LocaleProvider>
  );

  it("renders a page sun and latent decimal shadow without exposing the named solution", () => {
    renderScene({ slug: "eclipse-session" });
    const scene = screen.getByTestId("v2-scene-086");

    expect(scene).toHaveAttribute("data-spatial-model", "real-menu-paper-cutout-crosses-page-sun-and-carries-shadow-to-decimal");
    expect(screen.getByTestId("eclipse-page-sun")).toBeInTheDocument();
    expect(screen.getByTestId("eclipse-decimal-shadow")).toHaveAttribute("data-visible", "false");
    expect(scene).toHaveAttribute("data-eclipse-state", "separate");
    expect(screen.queryByText(/菜单缺口里的日食|eclipse return|带走太阳|carry.*sun/i)).not.toBeInTheDocument();
  });

  it("does not solve from merely opening and closing the real menu", () => {
    const onArm = vi.fn();
    const view = render(eclipseScene(false, 0, onArm));
    view.rerender(eclipseScene(true, 0, onArm));
    view.rerender(eclipseScene(false, 0, onArm));

    expect(screen.getByTestId("v2-scene-086")).toHaveAttribute("data-close-result", "miss");
    expect(screen.getByTestId("v2-scene-086")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not treat a preloaded offset as success unless the menu was actually open at that alignment", () => {
    const onArm = vi.fn();
    const view = render(eclipseScene(false, 72, onArm));
    view.rerender(eclipseScene(false, 72, onArm));

    expect(screen.getByTestId("v2-scene-086")).toHaveAttribute("data-eclipse-state", "separate");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows a corona only while the menu cutout is aligned with the page sun", () => {
    const onDiscover = vi.fn();
    const view = render(eclipseScene(false, 0, vi.fn(), onDiscover));
    view.rerender(eclipseScene(true, 0, vi.fn(), onDiscover));
    view.rerender(eclipseScene(true, 72, vi.fn(), onDiscover));

    const scene = screen.getByTestId("v2-scene-086");
    expect(scene).toHaveAttribute("data-menu-cutout", "aligned");
    expect(scene).toHaveAttribute("data-eclipse-state", "corona");
    expect(onDiscover).toHaveBeenCalled();
  });

  it("locks only after an aligned menu paper is closed and leaves the carried shadow on the decimal", () => {
    const onArm = vi.fn();
    const onDiscover = vi.fn();
    const view = render(eclipseScene(false, 0, onArm, onDiscover));
    view.rerender(eclipseScene(true, 0, onArm, onDiscover));
    view.rerender(eclipseScene(true, 72, onArm, onDiscover));
    view.rerender(eclipseScene(false, 72, onArm, onDiscover));

    const scene = screen.getByTestId("v2-scene-086");
    expect(scene).toHaveAttribute("data-close-result", "carried-shadow");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(screen.getByTestId("eclipse-decimal-shadow")).toHaveAttribute("data-visible", "true");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers arrow keys on the temporary menu paper while keeping its content outside the drag control", () => {
    const onOffsetChange = vi.fn();
    const view = render(
      <LocaleProvider initialLocale="zh">
        <V2EclipseMenuLayer offset={0} aligned={false} onOffsetChange={onOffsetChange} />
      </LocaleProvider>,
    );
    fireEvent.keyDown(screen.getByTestId("eclipse-menu-paper-handle"), { key: "ArrowUp" });
    view.rerender(<LocaleProvider initialLocale="zh"><V2EclipseMenuLayer offset={24} aligned={false} onOffsetChange={onOffsetChange} /></LocaleProvider>);
    fireEvent.keyDown(screen.getByTestId("eclipse-menu-paper-handle"), { key: "ArrowUp" });
    view.rerender(<LocaleProvider initialLocale="zh"><V2EclipseMenuLayer offset={48} aligned={false} onOffsetChange={onOffsetChange} /></LocaleProvider>);
    fireEvent.keyDown(screen.getByTestId("eclipse-menu-paper-handle"), { key: "ArrowUp" });

    expect(screen.getByTestId("eclipse-menu-paper")).toHaveAttribute("data-settings-access", "preserved");
    expect(onOffsetChange).toHaveBeenLastCalledWith(72);
  });
});

describe("V2 production puzzle scene 087", () => {
  const turnFrame = (dx: number, dy: number, pointerId = 187) => {
    const frame = screen.getByTestId("triple-gravity-frame");
    fireEvent.pointerDown(frame, { pointerId, clientX: 180, clientY: 150 });
    fireEvent.pointerMove(frame, { pointerId, clientX: 180 + dx, clientY: 150 + dy });
    fireEvent.pointerUp(frame, { pointerId, clientX: 180 + dx, clientY: 150 + dy });
  };

  it("renders one rotatable paper frame, three hanging beads, and three broken U-groove segments without naming the route", () => {
    renderScene({ slug: "triple-gravity" });
    const scene = screen.getByTestId("v2-scene-087");

    expect(scene).toHaveAttribute("data-spatial-model", "one-rotatable-frame-three-gravity-beads-three-slot-broken-u-groove");
    expect(screen.getByTestId("triple-gravity-frame")).toBeInTheDocument();
    expect(screen.getAllByTestId(/gravity-bead-[0-2]$/)).toHaveLength(3);
    expect(screen.getAllByTestId(/gravity-groove-[0-2]$/)).toHaveLength(3);
    expect(scene).toHaveAttribute("data-slot-count", "3");
    expect(screen.queryByText(/三次重力|gravity round trip|竖横竖|vertical.*horizontal/i)).not.toBeInTheDocument();
  });

  it("does not solve from clicking the frame or dispatching device orientation events", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-gravity", onArm });

    fireEvent.click(screen.getByTestId("triple-gravity-frame"));
    fireEvent(window, new Event("orientationchange"));

    expect(screen.getByTestId("v2-scene-087")).toHaveAttribute("data-route-progress", "0");
    expect(screen.getByTestId("v2-scene-087")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows a retractable shadow and clears the route when a visible slot is chosen out of order", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-gravity", onArm });

    turnFrame(60, 0);

    const scene = screen.getByTestId("v2-scene-087");
    expect(scene).toHaveAttribute("data-current-slot", "right");
    expect(scene).toHaveAttribute("data-route-progress", "0");
    expect(scene).toHaveAttribute("data-shadow-line", "visible");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("retains the first two correct gravity traces without completing early", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-gravity", onArm });

    turnFrame(0, 60, 287);
    turnFrame(60, 0, 288);

    const scene = screen.getByTestId("v2-scene-087");
    expect(scene).toHaveAttribute("data-route-progress", "2");
    expect(scene).toHaveAttribute("data-retained-traces", "down,right");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("joins the U only after the authored down, right, up route through all three slots", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "triple-gravity", onDiscover, onArm });

    turnFrame(0, 60, 387);
    turnFrame(60, 0, 388);
    turnFrame(0, -60, 389);

    const scene = screen.getByTestId("v2-scene-087");
    expect(scene).toHaveAttribute("data-route-progress", "3");
    expect(scene).toHaveAttribute("data-u-state", "joined");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers the three 90-degree direction keys on the same paper frame as the equivalent route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-gravity", onArm });
    const frame = screen.getByTestId("triple-gravity-frame");
    fireEvent.keyDown(frame, { key: "ArrowDown" });
    fireEvent.keyDown(frame, { key: "ArrowRight" });
    fireEvent.keyDown(frame, { key: "ArrowUp" });

    expect(screen.getByTestId("v2-scene-087")).toHaveAttribute("data-input-mode", "keyboard-frame");
    expect(screen.getByTestId("v2-scene-087")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 088", () => {
  const dragAcrossLeftEdge = (testId: string, pointerId = 188) => {
    const piece = screen.getByTestId(testId);
    fireEvent.pointerDown(piece, { pointerId, clientX: 120, clientY: 140 });
    fireEvent.pointerMove(piece, { pointerId, clientX: 20, clientY: 140 });
    fireEvent.pointerUp(piece, { pointerId, clientX: 20, clientY: 140 });
  };

  it("renders two named face pieces, one central fold, two edge textures, and one empty return slot", () => {
    renderScene({ slug: "liminal-device" });
    const scene = screen.getByTestId("v2-scene-088");

    expect(scene).toHaveAttribute("data-spatial-model", "inside-outside-pieces-central-reversible-fold-and-redefined-return-edge");
    expect(screen.getByTestId("liminal-inside-piece")).toHaveTextContent("内");
    expect(screen.getByTestId("liminal-outside-piece")).toHaveTextContent("外");
    expect(screen.getByTestId("liminal-fold")).toBeInTheDocument();
    expect(screen.getAllByTestId(/liminal-edge-/)).toHaveLength(2);
    expect(screen.getByTestId("liminal-return-slot")).toBeInTheDocument();
    expect(scene).toHaveAttribute("data-operation-modes", "fold,edge-drag");
    expect(screen.queryByText(/边界换了方向|liminal device|先翻|send.*outside/i)).not.toBeInTheDocument();
  });

  it("wraps a piece across the old edge but cannot solve before the fold redefines inside and outside", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "liminal-device", onDiscover, onArm });

    dragAcrossLeftEdge("liminal-outside-piece");

    const scene = screen.getByTestId("v2-scene-088");
    expect(scene).toHaveAttribute("data-fold-state", "front");
    expect(scene).toHaveAttribute("data-last-crossing", "outside-old-edge");
    expect(scene).toHaveAttribute("data-return-state", "wrapped-unseated");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("changes both edge texture and the visible inside-outside positions when the middle sheet is flipped", () => {
    renderScene({ slug: "liminal-device" });

    fireEvent.click(screen.getByTestId("liminal-fold"));

    const scene = screen.getByTestId("v2-scene-088");
    expect(scene).toHaveAttribute("data-fold-state", "back");
    expect(scene).toHaveAttribute("data-edge-texture", "reversed");
    expect(screen.getByTestId("liminal-inside-piece")).toHaveAttribute("data-side", "right");
    expect(screen.getByTestId("liminal-outside-piece")).toHaveAttribute("data-side", "left");
    expect(scene).toHaveAttribute("data-lock-state", "open");
  });

  it("does not solve by sending the inside piece across the redefined edge", () => {
    const onArm = vi.fn();
    renderScene({ slug: "liminal-device", onArm });
    fireEvent.click(screen.getByTestId("liminal-fold"));

    dragAcrossLeftEdge("liminal-inside-piece", 288);

    const scene = screen.getByTestId("v2-scene-088");
    expect(scene).toHaveAttribute("data-last-crossing", "inside-reversed-edge");
    expect(scene).toHaveAttribute("data-return-state", "wrapped-unseated");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("seats the outside piece only after the fold is reversed and that piece crosses the new outer edge", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "liminal-device", onDiscover, onArm });
    fireEvent.click(screen.getByTestId("liminal-fold"));

    dragAcrossLeftEdge("liminal-outside-piece", 388);

    const scene = screen.getByTestId("v2-scene-088");
    expect(scene).toHaveAttribute("data-last-crossing", "outside-reversed-edge");
    expect(scene).toHaveAttribute("data-return-state", "seated-inside");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers Enter on the fold and one arrow edge crossing as a keyboard-equivalent two-step route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "liminal-device", onArm });

    fireEvent.keyDown(screen.getByTestId("liminal-fold"), { key: "Enter" });
    fireEvent.keyDown(screen.getByTestId("liminal-outside-piece"), { key: "ArrowLeft" });

    const scene = screen.getByTestId("v2-scene-088");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-edge");
    expect(scene).toHaveAttribute("data-return-state", "seated-inside");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 089", () => {
  const resizeViewport = (dx: number, pointerId = 189) => {
    const handle = screen.getByTestId("braid-viewport-handle");
    fireEvent.pointerDown(handle, { pointerId, clientX: 250, clientY: 150 });
    fireEvent.pointerMove(handle, { pointerId, clientX: 250 + dx, clientY: 150 });
    fireEvent.pointerUp(handle, { pointerId, clientX: 250 + dx, clientY: 150 });
  };

  it("renders one internal paper viewport, one clip, and continuous/dotted forms of the same ribbon without naming the solution", () => {
    renderScene({ slug: "device-braid" });
    const scene = screen.getByTestId("v2-scene-089");

    expect(scene).toHaveAttribute("data-spatial-model", "resizable-paper-viewport-one-clip-and-one-ribbon-reflowing-between-continuous-and-dotted");
    expect(screen.getByTestId("braid-paper-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("braid-viewport-handle")).toHaveAttribute("role", "slider");
    expect(screen.getByTestId("braid-paper-clip")).toBeInTheDocument();
    expect(screen.getByTestId("braid-continuous-ribbon")).toBeInTheDocument();
    expect(screen.getByTestId("braid-dotted-ribbon")).toBeInTheDocument();
    expect(scene).toHaveAttribute("data-layout", "wide");
    expect(screen.queryByText(/两种宽度的一条线|locale input braid|先留住窄版|narrow.*clip/i)).not.toBeInTheDocument();
  });

  it("cannot solve by resizing the real browser or changing an unrelated viewport event", () => {
    const onArm = vi.fn();
    renderScene({ slug: "device-braid", onArm });

    fireEvent.resize(window);
    window.dispatchEvent(new Event("orientationchange"));

    const scene = screen.getByTestId("v2-scene-089");
    expect(scene).toHaveAttribute("data-browser-resizes", "0");
    expect(scene).toHaveAttribute("data-layout", "wide");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows an empty clamp when the paper clip is used in the wide layout", () => {
    const onArm = vi.fn();
    renderScene({ slug: "device-braid", onArm });

    fireEvent.click(screen.getByTestId("braid-paper-clip"));

    const scene = screen.getByTestId("v2-scene-089");
    expect(scene).toHaveAttribute("data-clip-state", "empty-clamp");
    expect(scene).toHaveAttribute("data-retained-layer", "none");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not complete from a narrow-to-wide resize unless the dotted layer was retained first", () => {
    const onArm = vi.fn();
    renderScene({ slug: "device-braid", onArm });

    resizeViewport(-90, 289);
    expect(screen.getByTestId("v2-scene-089")).toHaveAttribute("data-layout", "narrow");
    resizeViewport(90, 290);

    const scene = screen.getByTestId("v2-scene-089");
    expect(scene).toHaveAttribute("data-layout", "wide");
    expect(scene).toHaveAttribute("data-braid-state", "separate");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("retains the narrow dotted layer and completes only when the viewport is then expanded wide", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "device-braid", onDiscover, onArm });

    resizeViewport(-90, 389);
    fireEvent.click(screen.getByTestId("braid-paper-clip"));
    expect(screen.getByTestId("v2-scene-089")).toHaveAttribute("data-retained-layer", "dotted");
    resizeViewport(90, 390);

    const scene = screen.getByTestId("v2-scene-089");
    expect(scene).toHaveAttribute("data-braid-state", "woven");
    expect(scene).toHaveAttribute("data-layer-order", "dotted-over-continuous");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers narrow and wide keyboard slots on the viewport handle with Enter on the same paper clip", () => {
    const onArm = vi.fn();
    renderScene({ slug: "device-braid", onArm });
    const handle = screen.getByTestId("braid-viewport-handle");

    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    fireEvent.keyDown(screen.getByTestId("braid-paper-clip"), { key: "Enter" });
    fireEvent.keyDown(handle, { key: "ArrowRight" });

    const scene = screen.getByTestId("v2-scene-089");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-viewport");
    expect(scene).toHaveAttribute("data-braid-state", "woven");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 090", () => {
  const moveMap = (dx: number, dy: number, pointerId = 190) => {
    const map = screen.getByTestId("labyrinth-map-window");
    fireEvent.pointerDown(map, { pointerId, clientX: 100, clientY: 180 });
    fireEvent.pointerMove(map, { pointerId, clientX: 100 + dx, clientY: 180 + dy });
    fireEvent.pointerUp(map, { pointerId, clientX: 100 + dx, clientY: 180 + dy });
  };

  it("renders scattered archive cells and one transparent map with exactly three continuous route segments", () => {
    renderScene({ slug: "archive-labyrinth" });
    const scene = screen.getByTestId("v2-scene-090");

    expect(scene).toHaveAttribute("data-spatial-model", "scattered-archive-textures-one-transparent-map-window-and-three-route-segments");
    expect(screen.getAllByTestId(/labyrinth-cell-/)).toHaveLength(6);
    expect(screen.getByTestId("labyrinth-map-window")).toBeInTheDocument();
    expect(screen.getAllByTestId(/labyrinth-route-segment-/)).toHaveLength(3);
    expect(scene).toHaveAttribute("data-visible-segments", "0");
    expect(screen.queryByText(/把地图搬过迷宫|daily archive route|唯一覆盖|move.*map/i)).not.toBeInTheDocument();
  });

  it("does not solve by opening archive cells in their visual or DOM order", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-labyrinth", onArm });

    screen.getAllByTestId(/labyrinth-cell-/).forEach((cell) => fireEvent.click(cell));

    const scene = screen.getByTestId("v2-scene-090");
    expect(scene).toHaveAttribute("data-opened-cells", "6");
    expect(scene).toHaveAttribute("data-route-state", "hidden");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows a dead end at a plausible but incomplete map position without completing", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-labyrinth", onArm });

    moveMap(70, -15, 290);

    const scene = screen.getByTestId("v2-scene-090");
    expect(Number(scene.getAttribute("data-visible-segments"))).toBeGreaterThan(0);
    expect(scene).toHaveAttribute("data-route-state", "dead-end");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals all three connected segments only at the unique coverage position", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "archive-labyrinth", onDiscover, onArm });

    moveMap(150, -80, 390);

    const scene = screen.getByTestId("v2-scene-090");
    expect(scene).toHaveAttribute("data-visible-segments", "3");
    expect(scene).toHaveAttribute("data-route-state", "connected");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("does not depend on the server date or a browser date event to choose the map answer", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-labyrinth", onArm });

    window.dispatchEvent(new Event("datechange"));

    const scene = screen.getByTestId("v2-scene-090");
    expect(scene).toHaveAttribute("data-date-dependency", "none");
    expect(scene).toHaveAttribute("data-route-state", "hidden");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("offers directional keys on the same transparent map as an equivalent spatial route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "archive-labyrinth", onArm });
    const map = screen.getByTestId("labyrinth-map-window");

    for (let index = 0; index < 3; index += 1) fireEvent.keyDown(map, { key: "ArrowRight" });
    for (let index = 0; index < 2; index += 1) fireEvent.keyDown(map, { key: "ArrowUp" });

    const scene = screen.getByTestId("v2-scene-090");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-map");
    expect(scene).toHaveAttribute("data-route-state", "connected");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 091", () => {
  const liftBacking = (pointerId = 191) => {
    const backing = screen.getByTestId("mode-backing-sheet");
    fireEvent.pointerDown(backing, { pointerId, clientX: 180, clientY: 180 });
    fireEvent.pointerMove(backing, { pointerId, clientX: 180, clientY: 110 });
    fireEvent.pointerUp(backing, { pointerId, clientX: 180, clientY: 110 });
  };

  it("renders two coupled mode cards over one shared blank backing sheet without exposing the paradox title", () => {
    renderScene({ slug: "mode-flip" });
    const scene = screen.getByTestId("v2-scene-091");

    expect(scene).toHaveAttribute("data-spatial-model", "two-mutually-cancelling-mode-cards-over-one-shared-blank-backing-sheet");
    expect(screen.getByTestId("mode-card-normal")).toHaveTextContent("正常");
    expect(screen.getByTestId("mode-card-slow")).toHaveTextContent("缓慢");
    expect(screen.getByTestId("mode-backing-sheet")).toBeInTheDocument();
    expect(scene).toHaveAttribute("data-page-speed", "normal");
    expect(screen.queryByText(/翻的不是模式|mode paradox|背后的空白|shared.*backing/i)).not.toBeInTheDocument();
  });

  it("flips the opposite card at the same time and keeps the page speed unchanged", () => {
    const onArm = vi.fn();
    renderScene({ slug: "mode-flip", onArm });

    fireEvent.click(screen.getByTestId("mode-card-normal"));

    const scene = screen.getByTestId("v2-scene-091");
    expect(scene).toHaveAttribute("data-card-faces", "back,front");
    expect(scene).toHaveAttribute("data-page-speed", "normal");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("never solves from repeated mode-card toggles regardless of count", () => {
    const onArm = vi.fn();
    renderScene({ slug: "mode-flip", onArm });

    for (let index = 0; index < 10; index += 1) fireEvent.click(screen.getByTestId(index % 2 ? "mode-card-slow" : "mode-card-normal"));

    const scene = screen.getByTestId("v2-scene-091");
    expect(scene).toHaveAttribute("data-card-flips", "10");
    expect(scene).toHaveAttribute("data-page-speed", "normal");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not solve from clicking the blank backing without lifting it", () => {
    const onArm = vi.fn();
    renderScene({ slug: "mode-flip", onArm });

    fireEvent.click(screen.getByTestId("mode-backing-sheet"));

    expect(screen.getByTestId("v2-scene-091")).toHaveAttribute("data-backing-state", "flat");
    expect(screen.getByTestId("v2-scene-091")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("changes the whole page rhythm only when the shared blank backing is lifted", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "mode-flip", onDiscover, onArm });

    liftBacking(291);

    const scene = screen.getByTestId("v2-scene-091");
    expect(scene).toHaveAttribute("data-backing-state", "covering-cards");
    expect(scene).toHaveAttribute("data-page-speed", "slow");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers Enter on the same backing sheet as the keyboard-equivalent final action", () => {
    const onArm = vi.fn();
    renderScene({ slug: "mode-flip", onArm });

    fireEvent.keyDown(screen.getByTestId("mode-backing-sheet"), { key: "Enter" });

    const scene = screen.getByTestId("v2-scene-091");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-backing");
    expect(scene).toHaveAttribute("data-page-speed", "slow");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 092", () => {
  const touchEcho = (x: number, y: number, pointerId = 192) => {
    const field = screen.getByTestId("five-echo-field");
    fireEvent.pointerDown(field, { pointerId, clientX: x, clientY: y });
    fireEvent.pointerUp(field, { pointerId, clientX: x, clientY: y });
  };

  it("renders five nested hollow rings and one geometrically shared center without a glowing target", () => {
    renderScene({ slug: "five-finger-echo" });
    const scene = screen.getByTestId("v2-scene-092");

    expect(scene).toHaveAttribute("data-spatial-model", "five-nested-hollow-paper-rings-one-shared-unglowing-center-and-depth-dependent-echoes");
    expect(screen.getAllByTestId(/five-echo-ring-/)).toHaveLength(5);
    expect(screen.getByTestId("five-echo-center")).toHaveAttribute("data-glow", "false");
    expect(scene).toHaveAttribute("data-multitouch-required", "false");
    expect(screen.queryByText(/一次触碰，五道回声|five-finger echo|共同圆心|shared center/i)).not.toBeInTheDocument();
  });

  it("returns only one to four echoes when touching away from the shared center", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-finger-echo", onArm });

    touchEcho(150, 100);

    const scene = screen.getByTestId("v2-scene-092");
    expect(Number(scene.getAttribute("data-echo-count"))).toBeGreaterThanOrEqual(1);
    expect(Number(scene.getAttribute("data-echo-count"))).toBeLessThanOrEqual(4);
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("does not solve from five arbitrary touches or treat attempt count as ring count", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-finger-echo", onArm });

    [[165, 100], [100, 165], [40, 100], [100, 40], [150, 140]].forEach(([x, y], index) => touchEcho(x, y, 292 + index));

    const scene = screen.getByTestId("v2-scene-092");
    expect(scene).toHaveAttribute("data-attempt-count", "5");
    expect(Number(scene.getAttribute("data-echo-count"))).toBeLessThan(5);
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("retains one short wave for every paper layer crossed by the latest touch", () => {
    renderScene({ slug: "five-finger-echo" });

    touchEcho(130, 100, 392);

    const count = Number(screen.getByTestId("v2-scene-092").getAttribute("data-echo-count"));
    expect(screen.getAllByTestId(/five-echo-wave-/)).toHaveLength(count);
  });

  it("completes from one precise touch at the shared center because it crosses all five rings", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "five-finger-echo", onDiscover, onArm });

    touchEcho(100, 100, 492);

    const scene = screen.getByTestId("v2-scene-092");
    expect(scene).toHaveAttribute("data-echo-count", "5");
    expect(scene).toHaveAttribute("data-crossed-layers", "5");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers Enter on the full echo field as the keyboard-equivalent shared-center touch", () => {
    const onArm = vi.fn();
    renderScene({ slug: "five-finger-echo", onArm });

    fireEvent.keyDown(screen.getByTestId("five-echo-field"), { key: "Enter" });

    const scene = screen.getByTestId("v2-scene-092");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-center");
    expect(scene).toHaveAttribute("data-echo-count", "5");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 093", () => {
  const foldSegment = (index: number, pointerId = 193) => {
    const segment = screen.getByTestId(`six-beat-segment-${index}`);
    fireEvent.pointerDown(segment, { pointerId, clientX: 250, clientY: 130 });
    fireEvent.pointerUp(segment, { pointerId, clientX: 160, clientY: 130 });
  };

  it("renders six alternating paper beats with a midpoint fold on every segment", () => {
    renderScene({ slug: "six-beat-lock" });
    const scene = screen.getByTestId("v2-scene-093");

    expect(scene).toHaveAttribute("data-spatial-model", "six-radial-long-short-paper-beats-folding-their-outer-endpoints-onto-one-shared-center-stamp");
    expect(screen.getAllByTestId(/six-beat-segment-/)).toHaveLength(6);
    expect(screen.getAllByTestId(/six-beat-fold-line-/)).toHaveLength(6);
    expect(screen.getAllByTestId(/six-beat-segment-/).filter((segment) => segment.getAttribute("data-length") === "long")).toHaveLength(3);
    expect(screen.getAllByTestId(/six-beat-segment-/).filter((segment) => segment.getAttribute("data-length") === "short")).toHaveLength(3);
    expect(screen.getAllByTestId(/six-beat-fold-line-/).every((line) => line.getAttribute("data-position") === "midpoint")).toBe(true);
    expect(screen.queryByText(/six-beat lock|fold.*beat|六拍|折.*拍/i)).not.toBeInTheDocument();
  });

  it("does not interpret six direct taps as a rhythm or advance the fold state", () => {
    const onArm = vi.fn();
    renderScene({ slug: "six-beat-lock", onArm });

    screen.getAllByTestId(/six-beat-segment-/).forEach((segment) => fireEvent.click(segment));

    const scene = screen.getByTestId("v2-scene-093");
    expect(scene).toHaveAttribute("data-folded-count", "0");
    expect(scene).toHaveAttribute("data-endpoint-overlap", "0");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("rebounds a segment dragged farther from the common endpoint", () => {
    renderScene({ slug: "six-beat-lock" });
    const segment = screen.getByTestId("six-beat-segment-0");

    fireEvent.pointerDown(segment, { pointerId: 293, clientX: 250, clientY: 130 });
    fireEvent.pointerUp(segment, { pointerId: 293, clientX: 300, clientY: 130 });

    const scene = screen.getByTestId("v2-scene-093");
    expect(scene).toHaveAttribute("data-folded-count", "0");
    expect(scene).toHaveAttribute("data-rebound-count", "1");
    expect(scene).toHaveAttribute("data-lock-state", "open");
  });

  it("retains each correctly folded endpoint at the shared stamp without requiring an order", () => {
    renderScene({ slug: "six-beat-lock" });

    foldSegment(4, 393);
    foldSegment(1, 394);

    const scene = screen.getByTestId("v2-scene-093");
    expect(scene).toHaveAttribute("data-fold-order", "4,1");
    expect(scene).toHaveAttribute("data-folded-count", "2");
    expect(scene).toHaveAttribute("data-endpoint-overlap", "2");
    expect(scene).toHaveAttribute("data-lock-state", "open");
  });

  it("forms one thick beat stamp after all six endpoints converge in any order", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "six-beat-lock", onDiscover, onArm });

    [4, 1, 5, 0, 3, 2].forEach((index, order) => foldSegment(index, 493 + order));

    const scene = screen.getByTestId("v2-scene-093");
    expect(scene).toHaveAttribute("data-fold-order", "4,1,5,0,3,2");
    expect(scene).toHaveAttribute("data-folded-count", "6");
    expect(scene).toHaveAttribute("data-endpoint-overlap", "6");
    expect(scene).toHaveAttribute("data-stamp-state", "single-thick-beat");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers Enter on each fold line as the keyboard-equivalent convergence route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "six-beat-lock", onArm });

    screen.getAllByTestId(/six-beat-segment-/).forEach((segment) => fireEvent.keyDown(segment, { key: "Enter" }));

    const scene = screen.getByTestId("v2-scene-093");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-fold");
    expect(scene).toHaveAttribute("data-endpoint-overlap", "6");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 094", () => {
  const dragShade = (from: [number, number], to: [number, number], pointerId = 194) => {
    const shade = screen.getByTestId("saturation-shade");
    fireEvent.pointerDown(shade, { pointerId, clientX: from[0], clientY: from[1] });
    fireEvent.pointerMove(shade, { pointerId, clientX: to[0], clientY: to[1] });
    fireEvent.pointerUp(shade, { pointerId, clientX: to[0], clientY: to[1] });
  };

  it("renders overlapping color papers with independently readable textures and no flashing", () => {
    renderScene({ slug: "beacon-saturation" });
    const scene = screen.getByTestId("v2-scene-094");
    const layers = screen.getAllByTestId(/saturation-layer-/);

    expect(scene).toHaveAttribute("data-spatial-model", "overlapping-colored-texture-papers-one-white-desaturation-shade-and-one-hidden-texture-clock-at-the-saturated-center");
    expect(scene).toHaveAttribute("data-color-only", "false");
    expect(scene).toHaveAttribute("data-flashing", "false");
    expect(layers).toHaveLength(4);
    expect(new Set(layers.map((layer) => layer.getAttribute("data-texture"))).size).toBe(4);
    expect(screen.queryByText(/beacon saturation|amber scanline|遮光|desaturat/i)).not.toBeInTheDocument();
  });

  it("does not solve by clicking colored layers or naming the strongest color", () => {
    const onArm = vi.fn();
    renderScene({ slug: "beacon-saturation", onArm });

    screen.getAllByTestId(/saturation-layer-/).forEach((layer) => fireEvent.click(layer));

    const scene = screen.getByTestId("v2-scene-094");
    expect(scene).toHaveAttribute("data-shade-position", "14,74");
    expect(scene).toHaveAttribute("data-pattern-visibility", "hidden");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals more texture and less saturation as the white shade approaches the center", () => {
    renderScene({ slug: "beacon-saturation" });

    dragShade([45, 178], [110, 145], 294);

    const scene = screen.getByTestId("v2-scene-094");
    expect(Number(scene.getAttribute("data-saturation"))).toBeLessThan(100);
    expect(scene).toHaveAttribute("data-pattern-visibility", "emerging");
    expect(scene).toHaveAttribute("data-lock-state", "open");
  });

  it("keeps the clock concealed when the shade settles away from the strongest overlap", () => {
    const onArm = vi.fn();
    renderScene({ slug: "beacon-saturation", onArm });

    dragShade([45, 178], [80, 175], 394);

    const scene = screen.getByTestId("v2-scene-094");
    expect(scene).toHaveAttribute("data-clock-state", "concealed");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("clears the texture clock when the white shade removes saturation at the shared center", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "beacon-saturation", onDiscover, onArm });

    dragShade([45, 178], [160, 120], 494);

    const scene = screen.getByTestId("v2-scene-094");
    expect(scene).toHaveAttribute("data-shade-position", "50,50");
    expect(scene).toHaveAttribute("data-saturation", "0");
    expect(scene).toHaveAttribute("data-pattern-visibility", "clear");
    expect(scene).toHaveAttribute("data-clock-state", "visible-texture");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers direction keys on the white shade as a texture-equivalent route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "beacon-saturation", onArm });
    const shade = screen.getByTestId("saturation-shade");

    ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowUp", "ArrowUp"].forEach((key) => fireEvent.keyDown(shade, { key }));

    const scene = screen.getByTestId("v2-scene-094");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-shade");
    expect(scene).toHaveAttribute("data-shade-position", "50,50");
    expect(scene).toHaveAttribute("data-clock-state", "visible-texture");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 095", () => {
  const stackPhase = (phase: "past" | "present" | "future", pointerId = 195) => {
    const card = screen.getByTestId(`triple-phase-${phase}`);
    fireEvent.pointerDown(card, { pointerId, clientX: 60, clientY: 60 });
    fireEvent.pointerMove(card, { pointerId, clientX: 160, clientY: 120 });
    fireEvent.pointerUp(card, { pointerId, clientX: 160, clientY: 120 });
  };

  it("renders three translucent gap rings with distinct edge embossing for temporal order", () => {
    renderScene({ slug: "triple-phase" });
    const scene = screen.getByTestId("v2-scene-095");
    const cards = screen.getAllByTestId(/triple-phase-(past|present|future)$/);

    expect(scene).toHaveAttribute("data-spatial-model", "three-translucent-time-slices-with-complementary-ring-gaps-and-edge-embossing-stacked-past-present-future");
    expect(cards).toHaveLength(3);
    expect(cards.map((card) => card.getAttribute("data-gap-angle"))).toEqual(["30", "150", "270"]);
    expect(cards.map((card) => card.getAttribute("data-edge-emboss"))).toEqual(["1", "2", "3"]);
    expect(screen.queryByText(/triple phase|三相叠|past.*bottom|future.*top/i)).not.toBeInTheDocument();
  });

  it("does not stack or solve from three direct card clicks", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-phase", onArm });

    screen.getAllByTestId(/triple-phase-(past|present|future)$/).forEach((card) => fireEvent.click(card));

    const scene = screen.getByTestId("v2-scene-095");
    expect(scene).toHaveAttribute("data-stack-order", "");
    expect(scene).toHaveAttribute("data-ring-state", "separate");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps a ghosted ring when all three overlap in the wrong depth order", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-phase", onArm });

    ["future", "past", "present"].forEach((phase, index) => stackPhase(phase as "past" | "present" | "future", 295 + index));

    const scene = screen.getByTestId("v2-scene-095");
    expect(scene).toHaveAttribute("data-stack-order", "future,past,present");
    expect(scene).toHaveAttribute("data-overlap-count", "3");
    expect(scene).toHaveAttribute("data-ghost-count", "2");
    expect(scene).toHaveAttribute("data-ring-state", "ghosted");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reduces the ghost when correct temporal neighbors stack without completing early", () => {
    renderScene({ slug: "triple-phase" });

    stackPhase("past", 395);
    stackPhase("present", 396);

    const scene = screen.getByTestId("v2-scene-095");
    expect(scene).toHaveAttribute("data-stack-order", "past,present");
    expect(scene).toHaveAttribute("data-ghost-count", "1");
    expect(scene).toHaveAttribute("data-ring-state", "incomplete");
    expect(scene).toHaveAttribute("data-lock-state", "open");
  });

  it("forms one complete ring only when past is below present and future is above", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "triple-phase", onDiscover, onArm });

    ["past", "present", "future"].forEach((phase, index) => stackPhase(phase as "past" | "present" | "future", 495 + index));

    const scene = screen.getByTestId("v2-scene-095");
    expect(scene).toHaveAttribute("data-stack-order", "past,present,future");
    expect(scene).toHaveAttribute("data-overlap-count", "3");
    expect(scene).toHaveAttribute("data-ghost-count", "0");
    expect(scene).toHaveAttribute("data-ring-state", "complete-single-ring");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers ArrowUp on each slice as the keyboard-equivalent depth stack", () => {
    const onArm = vi.fn();
    renderScene({ slug: "triple-phase", onArm });

    ["past", "present", "future"].forEach((phase) => fireEvent.keyDown(screen.getByTestId(`triple-phase-${phase}`), { key: "ArrowUp" }));

    const scene = screen.getByTestId("v2-scene-095");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-layer");
    expect(scene).toHaveAttribute("data-stack-order", "past,present,future");
    expect(scene).toHaveAttribute("data-ring-state", "complete-single-ring");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 096", () => {
  const moveBeat = (index: number, pointerId: number, end: { x: number; y: number }) => {
    const beat = screen.getByTestId(`null-beat-${index}`);
    fireEvent.pointerDown(beat, { pointerId, clientX: 120, clientY: 120 });
    fireEvent.pointerMove(beat, { pointerId, clientX: end.x, clientY: end.y });
    fireEvent.pointerUp(beat, { pointerId, clientX: end.x, clientY: end.y });
  };

  it("renders seven converging ink beats, a zero point, and two-sided distance fibers without exposing the null answer", () => {
    renderScene({ slug: "seven-beat-null" });
    const scene = screen.getByTestId("v2-scene-096");
    const beats = screen.getAllByTestId(/null-beat-[0-6]$/);

    expect(scene).toHaveAttribute("data-spatial-model", "seven-ink-beats-converging-by-halved-gaps-with-one-two-sided-null-break-and-a-zero-point");
    expect(scene).toHaveAttribute("data-distance-curve", "broken");
    expect(beats).toHaveLength(7);
    expect(beats.map((beat) => beat.getAttribute("data-gap-before"))).toEqual(["0", "35", "17.5", "8.75", "0.95", "3.425", "2.1875"]);
    expect(screen.getByTestId("null-zero-point")).toBeInTheDocument();
    expect(screen.queryByText(/null accelerando|去掉破坏|第五|remove.*beat/i)).not.toBeInTheDocument();
  });

  it("does not solve through clicks or an unexamined keyboard deletion", () => {
    const onArm = vi.fn();
    renderScene({ slug: "seven-beat-null", onArm });
    screen.getAllByTestId(/null-beat-[0-6]$/).forEach((beat) => fireEvent.click(beat));
    fireEvent.keyDown(screen.getByTestId("null-beat-4"), { key: "Delete" });

    const scene = screen.getByTestId("v2-scene-096");
    expect(scene).toHaveAttribute("data-removed-point", "none");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("shows both neighboring distances and returns a wrong beat after an attempted removal", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "seven-beat-null", onDiscover, onArm });
    moveBeat(2, 296, { x: 142, y: 124 });
    moveBeat(2, 297, { x: 142, y: 42 });

    const scene = screen.getByTestId("v2-scene-096");
    expect(scene).toHaveAttribute("data-inspected-point", "2");
    expect(scene).toHaveAttribute("data-returned-point", "2");
    expect(scene).toHaveAttribute("data-visible-beats", "7");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).not.toHaveBeenCalled();
  });

  it("restores every point during one mechanical delete sweep instead of retaining a lucky success", () => {
    const onArm = vi.fn();
    renderScene({ slug: "seven-beat-null", onArm });
    for (let index = 0; index < 7; index += 1) moveBeat(index, 396 + index, { x: 130, y: 35 });

    const scene = screen.getByTestId("v2-scene-096");
    expect(scene).toHaveAttribute("data-removed-point", "none");
    expect(scene).toHaveAttribute("data-visible-beats", "7");
    expect(scene).toHaveAttribute("data-distance-curve", "broken");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("removes the null beat only after its two-sided spacing has been examined", () => {
    const onArm = vi.fn();
    renderScene({ slug: "seven-beat-null", onArm });
    moveBeat(4, 496, { x: 145, y: 122 });
    moveBeat(4, 497, { x: 145, y: 35 });

    const scene = screen.getByTestId("v2-scene-096");
    expect(scene).toHaveAttribute("data-inspected-point", "4");
    expect(scene).toHaveAttribute("data-removed-point", "4");
    expect(scene).toHaveAttribute("data-visible-beats", "6");
    expect(scene).toHaveAttribute("data-distance-curve", "smooth-halving");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers inspect then Delete on the same beat as the keyboard-equivalent removal", () => {
    const onArm = vi.fn();
    renderScene({ slug: "seven-beat-null", onArm });
    const beat = screen.getByTestId("null-beat-4");
    fireEvent.keyDown(beat, { key: "ArrowUp" });
    fireEvent.keyDown(beat, { key: "Delete" });

    const scene = screen.getByTestId("v2-scene-096");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-beat");
    expect(scene).toHaveAttribute("data-distance-curve", "smooth-halving");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 097", () => {
  it("renders seven folded leaves on one spine, one shared clasp, and a physical notch without naming the pull", () => {
    renderScene({ slug: "sevenfold-ack" });
    const scene = screen.getByTestId("v2-scene-097");

    expect(scene).toHaveAttribute("data-spatial-model", "seven-folded-leaves-on-one-spine-raised-sequentially-by-one-shared-clasp-at-a-single-embossed-notch");
    expect(screen.getAllByTestId(/sevenfold-page-[0-6]$/)).toHaveLength(7);
    expect(screen.getByTestId("sevenfold-clasp")).toBeInTheDocument();
    expect(screen.getByTestId("sevenfold-notch")).toBeInTheDocument();
    expect(screen.queryByText(/binary beacon|一根书脊|pull.*clasp|seven.*page/i)).not.toBeInTheDocument();
  });

  it("lets seven direct page flips cover one another without completing", () => {
    const onArm = vi.fn();
    renderScene({ slug: "sevenfold-ack", onArm });
    screen.getAllByTestId(/sevenfold-page-[0-6]$/).forEach((page) => fireEvent.click(page));

    const scene = screen.getByTestId("v2-scene-097");
    expect(scene).toHaveAttribute("data-page-flips", "7");
    expect(scene).toHaveAttribute("data-shadow-alignment", "covered");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("raises only part of the shared leaf sequence during a short pull", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "sevenfold-ack", onDiscover });
    const clasp = screen.getByTestId("sevenfold-clasp");
    fireEvent.pointerDown(clasp, { pointerId: 197, clientY: 80 });
    fireEvent.pointerMove(clasp, { pointerId: 197, clientY: 116 });
    fireEvent.pointerUp(clasp, { pointerId: 197, clientY: 116 });

    const scene = screen.getByTestId("v2-scene-097");
    expect(scene).toHaveAttribute("data-lifted-pages", "3");
    expect(scene).toHaveAttribute("data-shadow-alignment", "partial");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it("misses the common center when the shared clasp is pulled beyond its one notch", () => {
    const onArm = vi.fn();
    renderScene({ slug: "sevenfold-ack", onArm });
    const clasp = screen.getByTestId("sevenfold-clasp");
    fireEvent.pointerDown(clasp, { pointerId: 297, clientY: 70 });
    fireEvent.pointerMove(clasp, { pointerId: 297, clientY: 170 });
    fireEvent.pointerUp(clasp, { pointerId: 297, clientY: 170 });

    const scene = screen.getByTestId("v2-scene-097");
    expect(scene).toHaveAttribute("data-lifted-pages", "7");
    expect(scene).toHaveAttribute("data-shadow-alignment", "overshot");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("aligns all seven page shadows when the single clasp settles at the embossed notch", () => {
    const onArm = vi.fn();
    renderScene({ slug: "sevenfold-ack", onArm });
    const clasp = screen.getByTestId("sevenfold-clasp");
    fireEvent.pointerDown(clasp, { pointerId: 397, clientY: 80 });
    fireEvent.pointerMove(clasp, { pointerId: 397, clientY: 150 });
    fireEvent.pointerUp(clasp, { pointerId: 397, clientY: 150 });

    const scene = screen.getByTestId("v2-scene-097");
    expect(scene).toHaveAttribute("data-lifted-pages", "7");
    expect(scene).toHaveAttribute("data-shadow-alignment", "shared-center");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers ArrowDown on the same clasp as the keyboard-equivalent shared pull", () => {
    const onArm = vi.fn();
    renderScene({ slug: "sevenfold-ack", onArm });
    const clasp = screen.getByTestId("sevenfold-clasp");
    for (let step = 0; step < 4; step += 1) fireEvent.keyDown(clasp, { key: "ArrowDown" });

    const scene = screen.getByTestId("v2-scene-097");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-clasp");
    expect(scene).toHaveAttribute("data-shadow-alignment", "shared-center");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 098", () => {
  it("renders four two-decimal moments in one coupled quadrant frame without exposing the chronological answer", () => {
    renderScene({ slug: "quad-phase" });
    const scene = screen.getByTestId("v2-scene-098");
    const moments = screen.getAllByTestId(/quad-moment-[0-3]$/);

    expect(scene).toHaveAttribute("data-spatial-model", "four-stopwatch-moments-in-coupled-quadrants-reordered-only-by-one-central-quarter-turn-cross");
    expect(scene).toHaveAttribute("data-quadrant-order", "0,2,3,1");
    expect(moments.map((moment) => moment.getAttribute("data-time"))).toEqual(["2.50", "5.00", "7.50", "10.00"]);
    expect(screen.getByTestId("quad-cross")).toBeInTheDocument();
    expect(screen.queryByText(/broken waltz|四个时刻|clockwise|顺时针连续/i)).not.toBeInTheDocument();
  });

  it("does not change the coupled order when quadrants are clicked or dragged individually", () => {
    const onArm = vi.fn();
    renderScene({ slug: "quad-phase", onArm });
    screen.getAllByTestId(/quad-moment-[0-3]$/).forEach((moment, index) => {
      fireEvent.click(moment);
      fireEvent.pointerDown(moment, { pointerId: 198 + index, clientX: 80, clientY: 80 });
      fireEvent.pointerMove(moment, { pointerId: 198 + index, clientX: 150, clientY: 120 });
      fireEvent.pointerUp(moment, { pointerId: 198 + index, clientX: 150, clientY: 120 });
    });

    expect(screen.getByTestId("v2-scene-098")).toHaveAttribute("data-quadrant-order", "0,2,3,1");
    expect(screen.getByTestId("v2-scene-098")).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("retains only the locally chronological edge after one wrong quarter turn", () => {
    renderScene({ slug: "quad-phase" });
    const cross = screen.getByTestId("quad-cross");
    fireEvent.pointerDown(cross, { pointerId: 298, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(cross, { pointerId: 298, clientX: 160, clientY: 100 });
    fireEvent.pointerUp(cross, { pointerId: 298, clientX: 160, clientY: 100 });

    const scene = screen.getByTestId("v2-scene-098");
    expect(scene).toHaveAttribute("data-rotation-step", "1");
    expect(scene).toHaveAttribute("data-quadrant-order", "2,3,1,0");
    expect(scene).toHaveAttribute("data-complete-edges", "1");
    expect(scene).toHaveAttribute("data-lock-state", "open");
  });

  it("joins all four edge paths only in the chronological quarter-turn state", () => {
    const onDiscover = vi.fn();
    const onArm = vi.fn();
    renderScene({ slug: "quad-phase", onDiscover, onArm });
    const cross = screen.getByTestId("quad-cross");
    fireEvent.pointerDown(cross, { pointerId: 398, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(cross, { pointerId: 398, clientX: 220, clientY: 100 });
    fireEvent.pointerUp(cross, { pointerId: 398, clientX: 220, clientY: 100 });

    const scene = screen.getByTestId("v2-scene-098");
    expect(scene).toHaveAttribute("data-rotation-step", "2");
    expect(scene).toHaveAttribute("data-quadrant-order", "0,1,2,3");
    expect(scene).toHaveAttribute("data-complete-edges", "4");
    expect(scene).toHaveAttribute("data-path-state", "continuous-loop");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onDiscover).toHaveBeenCalledTimes(1);
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers two wheel detents on the central cross as the same discrete rotation", () => {
    const onArm = vi.fn();
    renderScene({ slug: "quad-phase", onArm });
    const cross = screen.getByTestId("quad-cross");
    fireEvent.wheel(cross, { deltaY: 100 });
    fireEvent.wheel(cross, { deltaY: 100 });

    expect(screen.getByTestId("v2-scene-098")).toHaveAttribute("data-quadrant-order", "0,1,2,3");
    expect(screen.getByTestId("v2-scene-098")).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers ArrowRight on the central cross as the keyboard-equivalent quarter turn", () => {
    const onArm = vi.fn();
    renderScene({ slug: "quad-phase", onArm });
    const cross = screen.getByTestId("quad-cross");
    fireEvent.keyDown(cross, { key: "ArrowRight" });
    fireEvent.keyDown(cross, { key: "ArrowRight" });

    const scene = screen.getByTestId("v2-scene-098");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-cross");
    expect(scene).toHaveAttribute("data-path-state", "continuous-loop");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 099", () => {
  const dragInspectionBand = (pointerId: number, endX: number) => {
    const band = screen.getByTestId("polyrhythm-inspection-band");
    fireEvent.pointerDown(band, { pointerId, clientX: 80 });
    fireEvent.pointerMove(band, { pointerId, clientX: endX });
    fireEvent.pointerUp(band, { pointerId, clientX: endX });
  };

  it("renders a two-division wave, a three-division wave, and one six-hole inspection band without audio dependence", () => {
    renderScene({ slug: "relay-polyrhythm" });
    const scene = screen.getByTestId("v2-scene-099");

    expect(scene).toHaveAttribute("data-spatial-model", "two-division-and-three-division-paper-waves-filtered-together-by-one-six-hole-inspection-band");
    expect(screen.getByTestId("polyrhythm-wave-2")).toBeInTheDocument();
    expect(screen.getByTestId("polyrhythm-wave-3")).toBeInTheDocument();
    expect(screen.getAllByTestId(/polyrhythm-hole-[0-5]$/)).toHaveLength(6);
    expect(scene).toHaveAttribute("data-audio-required", "false");
    expect(screen.queryByText(/relay polyrhythm|两种节奏|intersection|交会点/i)).not.toBeInTheDocument();
  });

  it("does not solve by pressing either wave or the inspection band two three or six times", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-polyrhythm", onArm });
    const wave2 = screen.getByTestId("polyrhythm-wave-2");
    const wave3 = screen.getByTestId("polyrhythm-wave-3");
    const band = screen.getByTestId("polyrhythm-inspection-band");
    [wave2, wave2, wave3, wave3, wave3, band, band, band, band, band, band].forEach((control) => fireEvent.click(control));

    const scene = screen.getByTestId("v2-scene-099");
    expect(scene).toHaveAttribute("data-band-position", "15");
    expect(scene).toHaveAttribute("data-aligned-holes", "0");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("keeps the common points hidden at an unrelated inspection position", () => {
    renderScene({ slug: "relay-polyrhythm" });
    dragInspectionBand(199, 135);

    const scene = screen.getByTestId("v2-scene-099");
    expect(scene).toHaveAttribute("data-band-position", "32");
    expect(scene).toHaveAttribute("data-aligned-holes", "0");
    expect(scene).toHaveAttribute("data-cycle-state", "separate");
    expect(scene).toHaveAttribute("data-lock-state", "open");
  });

  it("shrinks all hole deviations together as the single band approaches the shared cycle", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "relay-polyrhythm", onDiscover });
    dragInspectionBand(299, 170);

    const scene = screen.getByTestId("v2-scene-099");
    expect(scene).toHaveAttribute("data-band-position", "43");
    expect(scene).toHaveAttribute("data-aligned-holes", "3");
    expect(scene).toHaveAttribute("data-cycle-state", "approaching");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it("reveals one six-point common cycle only when the whole inspection band aligns", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-polyrhythm", onArm });
    dragInspectionBand(399, 200);

    const scene = screen.getByTestId("v2-scene-099");
    expect(scene).toHaveAttribute("data-band-position", "52");
    expect(scene).toHaveAttribute("data-aligned-holes", "6");
    expect(scene).toHaveAttribute("data-cycle-state", "shared-six-point-cycle");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("offers three ArrowRight steps on the same band as the keyboard-equivalent alignment", () => {
    const onArm = vi.fn();
    renderScene({ slug: "relay-polyrhythm", onArm });
    const band = screen.getByTestId("polyrhythm-inspection-band");
    for (let step = 0; step < 3; step += 1) fireEvent.keyDown(band, { key: "ArrowRight" });

    const scene = screen.getByTestId("v2-scene-099");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-band");
    expect(scene).toHaveAttribute("data-aligned-holes", "6");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});

describe("V2 production puzzle scene 100", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const gatherConstellation = () => {
    const left = screen.getByTestId("constellation-left-cluster");
    const right = screen.getByTestId("constellation-right-cluster");
    fireEvent.pointerDown(left, { pointerId: 200, clientX: 60, clientY: 100 });
    fireEvent.pointerMove(left, { pointerId: 200, clientX: 130, clientY: 100 });
    fireEvent.pointerUp(left, { pointerId: 200, clientX: 130, clientY: 100 });
    fireEvent.pointerDown(right, { pointerId: 201, clientX: 260, clientY: 100 });
    fireEvent.pointerMove(right, { pointerId: 201, clientX: 190, clientY: 100 });
    fireEvent.pointerUp(right, { pointerId: 201, clientX: 190, clientY: 100 });
  };

  it("renders two draggable three-star groups whose shared negative space is the final scene, not a visible V answer", () => {
    renderScene({ slug: "silent-constellation" });
    const scene = screen.getByTestId("v2-scene-100");

    expect(scene).toHaveAttribute("data-spatial-model", "two-three-star-clusters-gathered-to-reveal-a-negative-space-v-then-traced-through-three-structural-stars");
    expect(scene).toHaveAttribute("data-camera-route", "optional");
    expect(screen.getAllByTestId(/constellation-star-[0-5]$/)).toHaveLength(6);
    expect(screen.getByTestId("constellation-left-cluster")).toBeInTheDocument();
    expect(screen.getByTestId("constellation-right-cluster")).toBeInTheDocument();
    expect(screen.queryByTestId("constellation-trace")).not.toBeInTheDocument();
    expect(screen.queryByText(/silent constellation|静默星座|draw.*v|画.*v/i)).not.toBeInTheDocument();
  });

  it("does not gather from clicks, arbitrary stars, or a browser resize", () => {
    const onArm = vi.fn();
    renderScene({ slug: "silent-constellation", onArm });
    fireEvent.click(screen.getByTestId("constellation-left-cluster"));
    fireEvent.click(screen.getByTestId("constellation-right-cluster"));
    screen.getAllByTestId(/constellation-star-[0-5]$/).forEach((star) => fireEvent.click(star));
    fireEvent(window, new Event("resize"));

    const scene = screen.getByTestId("v2-scene-100");
    expect(scene).toHaveAttribute("data-gathered-clusters", "0");
    expect(scene).toHaveAttribute("data-negative-space", "closed");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("reveals only half of the negative-space relation when one star group moves inward", () => {
    const onDiscover = vi.fn();
    renderScene({ slug: "silent-constellation", onDiscover });
    const left = screen.getByTestId("constellation-left-cluster");
    fireEvent.pointerDown(left, { pointerId: 300, clientX: 60, clientY: 100 });
    fireEvent.pointerMove(left, { pointerId: 300, clientX: 130, clientY: 100 });
    fireEvent.pointerUp(left, { pointerId: 300, clientX: 130, clientY: 100 });

    const scene = screen.getByTestId("v2-scene-100");
    expect(scene).toHaveAttribute("data-gathered-clusters", "1");
    expect(scene).toHaveAttribute("data-negative-space", "half-open");
    expect(screen.queryByTestId("constellation-trace")).not.toBeInTheDocument();
    expect(onDiscover).toHaveBeenCalledTimes(1);
  });

  it("rejects an arbitrary continuous stroke after both star groups reveal the drawing field", () => {
    const onArm = vi.fn();
    renderScene({ slug: "silent-constellation", onArm });
    gatherConstellation();
    const trace = screen.getByTestId("constellation-trace");
    fireEvent.pointerDown(trace, { pointerId: 400, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(trace, { pointerId: 400, clientX: 85, clientY: 55 });
    fireEvent.pointerMove(trace, { pointerId: 400, clientX: 90, clientY: 85 });
    fireEvent.pointerUp(trace, { pointerId: 400, clientX: 90, clientY: 85 });

    const scene = screen.getByTestId("v2-scene-100");
    expect(scene).toHaveAttribute("data-gathered-clusters", "2");
    expect(scene).toHaveAttribute("data-trace-progress", "0");
    expect(scene).toHaveAttribute("data-lock-state", "open");
    expect(onArm).not.toHaveBeenCalled();
  });

  it("completes only after one continuous left-top bottom right-top V route", () => {
    const onArm = vi.fn();
    renderScene({ slug: "silent-constellation", onArm });
    gatherConstellation();
    const trace = screen.getByTestId("constellation-trace");
    fireEvent.pointerDown(trace, { pointerId: 500, clientX: 20, clientY: 18 });
    fireEvent.pointerMove(trace, { pointerId: 500, clientX: 35, clientY: 48 });
    fireEvent.pointerMove(trace, { pointerId: 500, clientX: 50, clientY: 80 });
    fireEvent.pointerMove(trace, { pointerId: 500, clientX: 65, clientY: 48 });
    fireEvent.pointerMove(trace, { pointerId: 500, clientX: 80, clientY: 18 });
    fireEvent.pointerUp(trace, { pointerId: 500, clientX: 80, clientY: 18 });

    const scene = screen.getByTestId("v2-scene-100");
    expect(scene).toHaveAttribute("data-trace-progress", "3");
    expect(scene).toHaveAttribute("data-trace-state", "complete-v");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });

  it("requires all three structural stars and a full 700ms V hold for the keyboard route", () => {
    vi.useFakeTimers();
    const onArm = vi.fn();
    renderScene({ slug: "silent-constellation", onArm });
    fireEvent.keyDown(screen.getByTestId("constellation-left-cluster"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByTestId("constellation-right-cluster"), { key: "ArrowLeft" });
    const trace = screen.getByTestId("constellation-trace");
    screen.getAllByTestId(/constellation-route-star-[0-2]$/).forEach((star) => fireEvent.keyDown(star, { key: "Enter" }));
    fireEvent.keyDown(trace, { key: "v" });
    act(() => { vi.advanceTimersByTime(699); });
    expect(onArm).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });

    const scene = screen.getByTestId("v2-scene-100");
    expect(scene).toHaveAttribute("data-input-mode", "keyboard-v-hold");
    expect(scene).toHaveAttribute("data-keyboard-stars", "0,1,2");
    expect(scene).toHaveAttribute("data-lock-state", "locked");
    expect(onArm).toHaveBeenCalledTimes(1);
  });
});
