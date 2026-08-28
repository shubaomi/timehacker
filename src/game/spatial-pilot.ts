export const SPATIAL_PILOT_SLUGS = [
  "four-corner-breach",
  "archive-route",
  "dual-device",
] as const;

export type SpatialPilotSlug = (typeof SPATIAL_PILOT_SLUGS)[number];
export type SpatialVisualPhase = "idle" | "running" | "stopped" | "success" | "miss";

export type SpatialSourceStatus =
  | "LOADING"
  | "READY"
  | "STARTING"
  | "RUNNING"
  | "STOPPING"
  | "SUCCESS"
  | "FAILED"
  | "LIMIT_REACHED";

export function isSpatialPilotSlug(slug: string | null | undefined): slug is SpatialPilotSlug {
  return Boolean(slug && SPATIAL_PILOT_SLUGS.includes(slug as SpatialPilotSlug));
}

export function isSpatialPilotBuildEnabled(
  value = process.env.NEXT_PUBLIC_TIME_HACKER_SPATIAL_PILOT,
): boolean {
  return value === "1";
}

export function spatialVisualPhase(status: SpatialSourceStatus): SpatialVisualPhase | null {
  switch (status) {
    case "READY": return "idle";
    case "STARTING":
    case "RUNNING": return "running";
    case "STOPPING": return "stopped";
    case "SUCCESS": return "success";
    case "FAILED": return "miss";
    case "LOADING":
    case "LIMIT_REACHED": return null;
  }
}
