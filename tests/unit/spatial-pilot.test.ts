import { describe, expect, it } from "vitest";
import {
  isSpatialPilotBuildEnabled,
  isSpatialPilotSlug,
  spatialVisualPhase,
} from "@/game/spatial-pilot";

describe("spatial pilot contract", () => {
  it("is default-off and accepts only the explicit public flag value", () => {
    expect(isSpatialPilotBuildEnabled(undefined)).toBe(false);
    expect(isSpatialPilotBuildEnabled("0")).toBe(false);
    expect(isSpatialPilotBuildEnabled("true")).toBe(false);
    expect(isSpatialPilotBuildEnabled("1")).toBe(true);
  });

  it("limits the formal pilot to the eight approved slugs", () => {
    expect(isSpatialPilotSlug("four-corner-breach")).toBe(true);
    expect(isSpatialPilotSlug("breath-gap")).toBe(true);
    expect(isSpatialPilotSlug("relay-sandwich")).toBe(true);
    expect(isSpatialPilotSlug("archive-route")).toBe(true);
    expect(isSpatialPilotSlug("dual-device")).toBe(true);
    expect(isSpatialPilotSlug("slow-command")).toBe(true);
    expect(isSpatialPilotSlug("corner-cross")).toBe(true);
    expect(isSpatialPilotSlug("focus-orbit")).toBe(true);
    expect(isSpatialPilotSlug("precision-five")).toBe(false);
    expect(isSpatialPilotSlug(null)).toBe(false);
  });

  it("maps existing game status one way without inventing a judgment", () => {
    expect(spatialVisualPhase("READY")).toBe("idle");
    expect(spatialVisualPhase("STARTING")).toBe("running");
    expect(spatialVisualPhase("RUNNING")).toBe("running");
    expect(spatialVisualPhase("STOPPING")).toBe("stopped");
    expect(spatialVisualPhase("SUCCESS")).toBe("success");
    expect(spatialVisualPhase("FAILED")).toBe("miss");
    expect(spatialVisualPhase("LOADING")).toBeNull();
    expect(spatialVisualPhase("LIMIT_REACHED")).toBeNull();
  });
});
