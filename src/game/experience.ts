import type { CheatDefinition, CheatTriggerConfig } from "./cheats";

function patternTypes(config: CheatTriggerConfig): string[] {
  if (config.kind === "fallback") {
    return [...new Set(config.primary.pattern.map(({ type }) => type))].sort();
  }
  if (config.kind === "accessibleHold") return [config.eventType, ...config.alternative.pattern.map(({ type }) => type)].sort();
  if (config.kind === "sequence" || config.kind === "timedSequence") {
    return [...new Set(config.pattern.map(({ type }) => type))].sort();
  }
  if (config.kind === "alternating") return [config.first.type, config.second.type].sort();
  return [config.eventType];
}

export function experienceArchetype(definition: CheatDefinition): string {
  const config = definition.triggerConfig;
  const types = patternTypes(config);
  if (config.kind === "timedSequence") {
    const centers = config.intervals.map(({ minMs, maxMs }) => (minMs + maxMs) / 2);
    if (centers.length === 1 && centers[0] <= 2_000) return `deadline:${types.join("+")}`;
    if (centers.every((value, index) => index === 0 || value < centers[index - 1])) return "accelerando";
    if (centers.every((value, index) => index === 0 || value > centers[index - 1])) return "decelerando";
    return `syncopation:${types.join("+")}`;
  }
  if (config.kind === "accessibleHold") return "pressure-or-latch";
  if (config.kind === "fallback") {
    if (types.includes("ORIENTATION")) return `orientation-route:${types.join("+")}`;
    if (types.includes("VISIBILITY_RETURN")) return "browser-return";
    if (types.includes("WHEEL")) return "directional-sweep";
    if (types.includes("FOCUS")) return "inspection-route";
    if (types.includes("CONTROL_HOLD")) return "pressure-or-latch";
    if (types.includes("TIMER_TAP") || types.includes("STATUS_TAP")) return "repeat-or-latch";
    return `fallback:${types.join("+")}`;
  }
  if (config.kind === "rhythm") return "steady-rhythm";
  if (config.kind === "wait" || config.kind === "waitRange") return "intentional-silence";
  if (config.kind === "count") return `count:${types.join("+")}`;
  if (config.kind === "hold") return "short-hold";
  if (config.kind === "alternating") return `alternating:${types.join("+")}`;
  if (types.length > 1) return `cross-surface:${types.join("+")}`;
  const type = types[0];
  const singleTypeArchetypes: Record<string, string> = {
    CALIBRATION_TAP: `binary-calibration:${config.kind === "sequence" ? config.pattern.length : 0}`,
    CLUE_TOKEN: "clue-cipher",
    CORNER_TAP: `spatial-housing-trace:${config.kind === "sequence" ? config.pattern.length : 0}`,
    GLYPH_POSITION: "target-position-puzzle",
    GLYPH_TAP: "target-value-pattern",
    INPUT_SOURCE: "input-channel-pattern",
    KEY: "service-command",
    LOCALE_TOGGLE: "locale-state-route",
    PANEL_OPEN: "archive-navigation",
    RITUAL_PULSE: "morse-pulse",
    STATUS_PHASE_CAPTURE: "beacon-phase-window",
  };
  return singleTypeArchetypes[type] ?? `single:${type}`;
}

export function experienceSurfaces(definition: CheatDefinition): number {
  return patternTypes(definition.triggerConfig).length;
}

export function isObservationPuzzle(definition: CheatDefinition): boolean {
  const types = patternTypes(definition.triggerConfig);
  return definition.category === "VISUAL" || types.some((type) =>
    ["CALIBRATION_TAP", "CLUE_TOKEN", "CORNER_TAP", "GLYPH_POSITION", "PANEL_OPEN", "STATUS_PHASE_CAPTURE"].includes(type),
  );
}

export function usesBrowserOrInterfaceState(definition: CheatDefinition): boolean {
  return patternTypes(definition.triggerConfig).some((type) =>
    ["FOCUS", "INSPECT", "INPUT_SOURCE", "LOCALE_TOGGLE", "MODE_TOGGLE", "ORIENTATION", "PANEL_OPEN", "STATUS_PHASE_CAPTURE", "VISIBILITY_RETURN"].includes(type),
  );
}

export function usesNonEqualRhythm(definition: CheatDefinition): boolean {
  return definition.triggerConfig.kind === "timedSequence";
}

export const UI_EVENT_CAPABILITIES = new Set([
  "ACCESS_LATCH", "CALIBRATION_TAP", "CLUE_TAP", "CLUE_TOKEN", "CONTROL_HOLD", "CONTROL_TAP",
  "CORNER_TAP", "FOCUS", "GLYPH_POSITION", "GLYPH_TAP", "INPUT_SOURCE", "INSPECT", "KEY",
  "LOCALE_TOGGLE", "MODE_TOGGLE", "ORIENTATION", "PANEL_OPEN", "READY_MARK", "READY_WAIT",
  "RHYTHM_TAP", "RITUAL_PULSE", "SERVICE_KEY", "SERVICE_SWEEP", "STATUS_PHASE_CAPTURE",
  "STATUS_TAP", "TIMER_TAP", "VISIBILITY_RETURN", "WHEEL",
]);

export function triggerEventTypes(config: CheatTriggerConfig): string[] {
  if (config.kind === "fallback") {
    return [...new Set([...config.primary.pattern, ...config.fallback.pattern].map(({ type }) => type))];
  }
  return patternTypes(config);
}
