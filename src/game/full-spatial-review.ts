import {
  V2_CONTROLLER_KINDS,
  V2_LEVELS,
  type V2ControllerKind,
  type V2LevelDefinition,
} from "@/game/v2-levels.generated";
import {
  FULL_SPATIAL_LEVEL_DIRECTION_BY_ID,
  type FullSpatialLevelDirection,
} from "@/game/full-spatial-level-direction";
import {
  FULL_SPATIAL_ANCHOR_CONTRACT_BY_ID,
  type FullSpatialAnchorContract,
} from "@/game/full-spatial-anchor-contract";
import {
  correctedSpatialAnchorContract,
  SPATIAL_SUCCESS_COMPOSITION_BY_CONTROLLER,
} from "@/game/full-spatial-correction";

export type SpatialReviewPhase = "idle" | "running" | "stopped" | "success" | "miss";
export type SpatialMaterial = "paper" | "membrane" | "ink" | "glass" | "light" | "ribbon";

export interface SpatialControllerProfile {
  material: SpatialMaterial;
  depth: number;
  perspective: number;
  field: "frame" | "pressure" | "type" | "shadow" | "ray" | "path" | "portal" | "stack" | "hinge" | "axis" | "wave" | "orbit" | "session" | "constellation";
}

export interface FullSpatialReviewRecipe extends FullSpatialLevelDirection, FullSpatialAnchorContract {
  traceKey: `TH-SP-${string}`;
  id: number;
  slug: string;
  title: V2LevelDefinition["title"];
  controller: V2ControllerKind;
  chapter: number;
  material: SpatialMaterial;
  field: SpatialControllerProfile["field"];
  depth: number;
  perspective: number;
  accent: "butter" | "coral" | "mint" | "sky";
  tiltX: number;
  tiltY: number;
  marks: V2LevelDefinition["visual"]["marks"];
}

export const SPATIAL_CONTROLLER_PROFILES: Record<V2ControllerKind, SpatialControllerProfile> = {
  "corner-repair": { material: "paper", depth: 42, perspective: 920, field: "frame" },
  "patient-hold": { material: "membrane", depth: 34, perspective: 980, field: "pressure" },
  "word-shift": { material: "paper", depth: 46, perspective: 880, field: "type" },
  "shadow-sort": { material: "paper", depth: 38, perspective: 940, field: "shadow" },
  "light-drag": { material: "light", depth: 52, perspective: 980, field: "ray" },
  trace: { material: "ink", depth: 32, perspective: 1020, field: "path" },
  "frame-drag": { material: "glass", depth: 44, perspective: 900, field: "portal" },
  "layer-stack": { material: "glass", depth: 58, perspective: 860, field: "stack" },
  fold: { material: "paper", depth: 52, perspective: 840, field: "hinge" },
  "coupled-drag": { material: "ribbon", depth: 48, perspective: 900, field: "axis" },
  "wave-align": { material: "membrane", depth: 38, perspective: 980, field: "wave" },
  flip: { material: "paper", depth: 44, perspective: 900, field: "hinge" },
  orbit: { material: "ribbon", depth: 46, perspective: 920, field: "orbit" },
  resize: { material: "glass", depth: 40, perspective: 940, field: "portal" },
  "focus-route": { material: "glass", depth: 48, perspective: 900, field: "path" },
  rhythm: { material: "ink", depth: 36, perspective: 1000, field: "wave" },
  "wheel-echo": { material: "membrane", depth: 44, perspective: 930, field: "orbit" },
  "cover-return": { material: "paper", depth: 50, perspective: 880, field: "session" },
  rotate: { material: "paper", depth: 48, perspective: 900, field: "axis" },
  "edge-route": { material: "ribbon", depth: 44, perspective: 920, field: "path" },
  "shared-control": { material: "paper", depth: 42, perspective: 940, field: "axis" },
  constellation: { material: "light", depth: 62, perspective: 820, field: "constellation" },
};

const accents = ["butter", "coral", "mint", "sky"] as const;

function recipe(level: V2LevelDefinition): FullSpatialReviewRecipe {
  const profile = SPATIAL_CONTROLLER_PROFILES[level.controller];
  const direction = FULL_SPATIAL_LEVEL_DIRECTION_BY_ID.get(level.id);
  const baseAnchorContract = FULL_SPATIAL_ANCHOR_CONTRACT_BY_ID.get(level.id);
  if (!direction) throw new Error(`Missing frozen spatial direction for level ${level.id}`);
  if (!baseAnchorContract) throw new Error(`Missing semantic spatial anchors for level ${level.id}`);
  const anchorContract = correctedSpatialAnchorContract(baseAnchorContract);
  const firstMark = level.visual.marks[0];
  return {
    ...direction,
    ...anchorContract,
    anchorCount: anchorContract.anchorSelectors.length,
    successComposition: SPATIAL_SUCCESS_COMPOSITION_BY_CONTROLLER[level.controller],
    id: level.id,
    slug: level.slug,
    title: level.title,
    controller: level.controller,
    chapter: level.chapter,
    material: profile.material,
    field: profile.field,
    depth: profile.depth + (level.id % 3) * 4,
    perspective: profile.perspective,
    accent: accents[(level.chapter + level.id) % accents.length],
    tiltX: ((firstMark?.rotation ?? level.id) % 7) - 3,
    tiltY: ((level.id * 3) % 9) - 4,
    marks: level.visual.marks,
  };
}

export const FULL_SPATIAL_REVIEW_RECIPES = V2_LEVELS.map(recipe);
export const FULL_SPATIAL_REVIEW_BY_ID = new Map(FULL_SPATIAL_REVIEW_RECIPES.map((item) => [item.id, item]));
export const FULL_SPATIAL_REVIEW_BY_SLUG = new Map(FULL_SPATIAL_REVIEW_RECIPES.map((item) => [item.slug, item]));

export function fullSpatialReviewRecipe(id: number | null | undefined) {
  return FULL_SPATIAL_REVIEW_BY_ID.get(id ?? 1) ?? FULL_SPATIAL_REVIEW_RECIPES[0];
}

export function reviewTimerElapsed(realElapsed: number, armed: boolean, previousElapsed = 0) {
  const candidate = armed && realElapsed > 9_500
    ? Math.min(10_000, 9_500 + Math.floor((realElapsed - 9_500) / 1_000) * 100)
    : Math.min(realElapsed, 10_000);
  return Math.max(previousElapsed, candidate);
}

export function isFullSpatialReviewCoverageComplete() {
  return FULL_SPATIAL_REVIEW_RECIPES.length === 100
    && new Set(FULL_SPATIAL_REVIEW_RECIPES.map((item) => item.id)).size === 100
    && new Set(FULL_SPATIAL_REVIEW_RECIPES.map((item) => item.slug)).size === 100
    && new Set(FULL_SPATIAL_REVIEW_RECIPES.map((item) => item.signatureSilhouette)).size === 100
    && V2_CONTROLLER_KINDS.every((controller) => FULL_SPATIAL_REVIEW_RECIPES.some((item) => item.controller === controller));
}
