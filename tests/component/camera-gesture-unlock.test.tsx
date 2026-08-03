import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraGestureUnlock } from "@/components/camera-gesture-unlock";
import { LocaleProvider } from "@/i18n/locale-provider";

const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");

function renderCamera(props: Partial<React.ComponentProps<typeof CameraGestureUnlock>> = {}) {
  const defaults = {
    gesture: "open-palm" as const,
    onComplete: vi.fn(),
    onFallback: vi.fn(),
  };
  return render(
    <LocaleProvider initialLocale="en">
      <CameraGestureUnlock {...defaults} {...props} />
    </LocaleProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalMediaDevices) Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  else Reflect.deleteProperty(navigator, "mediaDevices");
});

describe("CameraGestureUnlock", () => {
  it("does not request camera access until the player explicitly opts in", async () => {
    const getUserMedia = vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });
    const onFallback = vi.fn();
    renderCamera({ onFallback });

    expect(getUserMedia).not.toHaveBeenCalled();
    expect(screen.getByText(/Frames stay on this device/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enable camera" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Camera permission was not granted");
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
    await userEvent.click(screen.getByRole("button", { name: "Use touch instead" }));
    expect(onFallback).toHaveBeenCalledOnce();
  });

  it("stops the camera if the local gesture model cannot initialize", async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    renderCamera({ runtimeFactory: vi.fn().mockRejectedValue(new Error("model failed")) });

    await userEvent.click(screen.getByRole("button", { name: "Enable camera" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not start");
    expect(stop).toHaveBeenCalledOnce();
  });

  it("completes a stable hand gesture and releases camera resources", async () => {
    const stop = vi.fn();
    const close = vi.fn();
    const onComplete = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "readyState", "get").mockReturnValue(4);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    renderCamera({
      onComplete,
      runtimeFactory: vi.fn().mockResolvedValue({
        recognize: () => ({ label: "Open_Palm", score: 0.95, landmarks: [{ x: 0.5, y: 0.5 }] }),
        close,
      }),
    });

    await userEvent.click(screen.getByRole("button", { name: "Enable camera" }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce(), { timeout: 3_000 });
    expect(stop).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent("Gesture caught");
  });
});
