import type { V2ControllerKind } from "@/game/v2-levels.generated";
import type {
  FullSpatialAnchorContract,
  SpatialSuccessComposition,
} from "@/game/full-spatial-anchor-contract";

type AnchorOverride = Pick<FullSpatialAnchorContract, "anchorSelectors" | "anchorRoles">;

function controls(...roles: string[]): AnchorOverride {
  return {
    anchorSelectors: roles.map((_, index) => `@control:${index}`),
    anchorRoles: roles,
  };
}

// Correction-only bindings for contracts that previously targeted a whole scene
// or an aria-hidden spatial helper. Each token resolves to one existing semantic
// control; no gameplay element is moved or written to by the visual layer.
export const FULL_SPATIAL_ANCHOR_CORRECTIONS = new Map<number, AnchorOverride>([
  [1, { anchorSelectors: ["@control:0", '[data-testid="corner-target-001"]'], anchorRoles: ["loose-corner", "corner-target"] }],
  [2, controls("breath-hold-surface")],
  [3, controls("letter-one", "letter-two", "letter-three", "letter-four")],
  [6, controls("trace-surface")],
  [8, controls("left-shell", "membrane", "right-shell")],
  [10, controls("left-page-edge", "right-page-edge")],
  [11, controls("left-leaf", "paper-axis", "right-leaf")],
  [14, controls("horizontal-ribbon", "vertical-ribbon")],
  [15, controls("arc-one", "arc-two", "arc-three")],
  [16, controls("outer-trail-ring", "paper-bead")],
  [17, controls("glyph-half-one", "glyph-half-two", "glyph-half-three", "glyph-half-four")],
  [18, controls("resizable-ring", "outer-notch-one", "outer-notch-two")],
  [19, controls("linked-shell")],
  [20, controls("halo-one", "halo-two", "halo-three")],
  [24, controls("trace-rhythm-surface")],
  [25, controls("beacon-one", "beacon-two", "dark-bead")],
  [26, controls("shared-divider")],
  [27, controls("late-paper-dot")],
  [28, controls("petal-one", "petal-two", "petal-three", "petal-four")],
  [29, controls("inspection-ruler", "spare-ink-dot")],
  [30, controls("thick-folded-corner")],
  [31, controls("cropped-disc", "window-frame")],
  [32, controls("vertical-title-strip")],
  [33, controls("windowed-scene-sheet")],
  [35, controls("sky-view")],
  [37, controls("clock-hand-window", "clock-ring-window")],
  [40, controls("return-ticket", "fold-page")],
  [41, controls("question-track", "question-inner", "quiet-dot")],
  [42, controls("frosted-side-paper")],
  [43, controls("archive-tab-one", "archive-tab-two", "archive-tab-three")],
  [44, { anchorSelectors: ['[data-testid="focus-orbit-target"]', "@control:1"], anchorRoles: ["decimal-orbit", "focus-sheet"] }],
  [48, controls("text-strip-one", "text-strip-two", "text-strip-three", "text-strip-four", "text-strip-five", "fixed-blank")],
  [49, {
    anchorSelectors: Array.from({ length: 5 }, (_, index) => `[data-testid="ten-thousand-point-${index}"]`),
    anchorRoles: Array.from({ length: 5 }, (_, index) => `fiber-point-${index + 1}`),
  }],
  [54, controls("central-axis", "loose-ribbon-end")],
  [81, {
    anchorSelectors: ['[data-testid="dual-pointer-half"]', '[data-testid="dual-companion-half"]', '[data-testid="dual-shared-socket"]'],
    anchorRoles: ["pointer-half", "companion-half", "shared-socket"],
  }],
]);

export const SPATIAL_SUCCESS_COMPOSITION_BY_CONTROLLER: Record<V2ControllerKind, Exclude<SpatialSuccessComposition, "converge">> = {
  "corner-repair": "lock",
  "patient-hold": "lock",
  "word-shift": "stack",
  "shadow-sort": "stack",
  "light-drag": "trace",
  trace: "trace",
  "frame-drag": "lock",
  "layer-stack": "stack",
  fold: "fold",
  "coupled-drag": "lock",
  "wave-align": "trace",
  flip: "fold",
  orbit: "orbit",
  resize: "lock",
  "focus-route": "trace",
  rhythm: "trace",
  "wheel-echo": "orbit",
  "cover-return": "fold",
  rotate: "orbit",
  "edge-route": "trace",
  "shared-control": "lock",
  constellation: "orbit",
};

export function correctedSpatialAnchorContract(contract: FullSpatialAnchorContract) {
  const correction = FULL_SPATIAL_ANCHOR_CORRECTIONS.get(contract.id);
  return correction ? { ...contract, ...correction } : contract;
}
