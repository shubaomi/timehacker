import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/i18n/locale-provider";
import { PrototypeLab } from "@/components/v2-prototype/prototype-lab";

function renderLab() {
  return render(
    <LocaleProvider initialLocale="zh">
      <PrototypeLab />
    </LocaleProvider>,
  );
}

describe("Gate B prototype lab", () => {
  it("exposes three representative scenes and all six review states without network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderLab();

    expect(screen.getByRole("button", { name: /关卡 001/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /关卡 003/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /关卡 100/ })).toBeInTheDocument();
    for (const phase of [
      "DORMANT",
      "DISCOVERED",
      "ARMED",
      "RUNNING_NORMAL",
      "RUNNING_ASSISTED",
      "RESULT",
    ]) {
      expect(screen.getByRole("button", { name: phase })).toBeInTheDocument();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("does not solve level 001 on click and supports a semantic keyboard route", async () => {
    renderLab();
    const corner = screen.getByRole("button", { name: "游离的纸角" });
    await userEvent.click(corner);
    expect(screen.queryByText("抓到时间的破绽了")).not.toBeInTheDocument();

    corner.focus();
    fireEvent.keyDown(corner, { key: "ArrowLeft" });
    fireEvent.keyDown(corner, { key: "ArrowLeft" });
    fireEvent.keyDown(corner, { key: "ArrowUp" });
    fireEvent.keyDown(corner, { key: "ArrowUp" });
    expect(screen.queryByText("抓到时间的破绽了")).not.toBeInTheDocument();
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowRight" });
    fireEvent.keyDown(corner, { key: "ArrowDown" });
    expect(await screen.findByText("抓到时间的破绽了")).toBeInTheDocument();
  });

  it("turns FAST into SLOW without an input field or submit action", async () => {
    renderLab();
    await userEvent.click(screen.getByRole("button", { name: /关卡 003/ }));
    const tiles = screen.getAllByRole("button", { name: /^字牌 \d/ });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    for (const tile of tiles) await userEvent.click(tile);
    expect(screen.queryByText("抓到时间的破绽了")).not.toBeInTheDocument();

    await userEvent.click(tiles[0]);
    await userEvent.click(tiles[2]);
    await userEvent.click(tiles[3]);
    await waitFor(() => expect(screen.getByText("抓到时间的破绽了")).toBeInTheDocument(), {
      timeout: 1_000,
    });
  });

  it("keeps the page route primary for level 100 and arms on a held V key", async () => {
    renderLab();
    await userEvent.click(screen.getByRole("button", { name: /关卡 100/ }));
    const leftStars = screen.getByRole("button", { name: "左侧星群" });
    const rightStars = screen.getByRole("button", { name: "右侧星群" });
    fireEvent.keyDown(leftStars, { key: "ArrowRight" });
    fireEvent.keyDown(rightStars, { key: "ArrowLeft" });

    const stage = screen.getByTestId("prototype-stage-100");
    fireEvent.keyDown(stage, { key: "v" });
    await new Promise((resolve) => setTimeout(resolve, 760));
    fireEvent.keyUp(stage, { key: "v" });
    expect(await screen.findByText("抓到时间的破绽了")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /可选摄像头手势/ })).toBeInTheDocument();
  });

  it("shows the normal and assisted timing states as different outcomes", async () => {
    renderLab();
    await userEvent.click(screen.getByRole("button", { name: "RUNNING_NORMAL" }));
    expect(screen.getByText("6.28")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "RUNNING_ASSISTED" }));
    expect(screen.getByText("9.98")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "RESULT" }));
    expect(screen.getByText("10.00")).toBeInTheDocument();
    expect(screen.getByText("+0.00")).toBeInTheDocument();
  });

  it("contains all required and sampled high-risk interaction spikes", async () => {
    renderLab();
    await userEvent.click(screen.getByRole("button", { name: "交互实验" }));
    for (const number of ["014", "021", "035", "040", "044", "054", "067", "069", "074", "085", "089", "099", "100"]) {
      expect(screen.getByTestId(`spike-${number}`)).toBeInTheDocument();
    }
  });

  it("proves the main high-risk spike controls have completable tolerant routes", async () => {
    renderLab();
    await userEvent.click(screen.getByRole("button", { name: "交互实验" }));

    const cross = within(screen.getByTestId("spike-014"));
    fireEvent.change(cross.getByRole("slider"), { target: { value: "50" } });
    expect(cross.getByLabelText(/通过/)).toBeInTheDocument();

    const cover = within(screen.getByTestId("spike-040"));
    await userEvent.click(cover.getByRole("button", { name: "盖住纸页" }));
    await userEvent.click(cover.getByRole("button", { name: "揭开纸页" }));
    expect(cover.getByLabelText(/通过/)).toBeInTheDocument();

    const concurrent = within(screen.getByTestId("spike-054"));
    fireEvent.pointerDown(concurrent.getByRole("button", { name: "按住纸轴" }));
    await userEvent.click(concurrent.getByRole("button", { name: /绕行/ }));
    await userEvent.click(concurrent.getByRole("button", { name: /绕行/ }));
    await userEvent.click(concurrent.getByRole("button", { name: /绕行/ }));
    expect(concurrent.getByLabelText(/通过/)).toBeInTheDocument();

    const echo = within(screen.getByTestId("spike-067"));
    fireEvent.keyDown(echo.getByRole("application"), { key: "ArrowDown" });
    expect(echo.getByLabelText(/通过/)).toBeInTheDocument();

    const viewport = within(screen.getByTestId("spike-089"));
    await userEvent.click(viewport.getByRole("button"));
    await userEvent.click(viewport.getByRole("button"));
    await userEvent.click(viewport.getByRole("button"));
    expect(viewport.getByLabelText(/通过/)).toBeInTheDocument();
  });
});
