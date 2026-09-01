export type SpatialSilhouettePrimitive = "paper" | "ring" | "ribbon" | "fold" | "portal" | "ray";
export type SpatialSuccessComposition = "lock" | "converge" | "stack" | "fold" | "orbit" | "trace";

export interface FullSpatialAnchorContract {
  id: number;
  traceKey: `TH-SP-${string}`;
  anchorSelectors: readonly string[];
  anchorRoles: readonly string[];
  silhouettePrimitive: SpatialSilhouettePrimitive;
  successComposition: SpatialSuccessComposition;
  allowFallback: false;
}

// Explicit semantic binding audited against the real V2 scene for every level.
// Runtime code must not replace these selectors with a generic DOM-order sample.
export const FULL_SPATIAL_ANCHOR_CONTRACTS = [
  {
    "id": 1,
    "traceKey": "TH-SP-001",
    "anchorSelectors": [
      "[data-testid=\"corner-spatial-depth\"]",
      "[data-testid=\"corner-target-001\"]"
    ],
    "anchorRoles": [
      "corner-spatial-depth",
      "corner-target-001"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 2,
    "traceKey": "TH-SP-002",
    "anchorSelectors": [
      "[data-testid=\"breath-spatial-depth\"]"
    ],
    "anchorRoles": [
      "breath-spatial-depth"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 3,
    "traceKey": "TH-SP-003",
    "anchorSelectors": [
      "[data-testid=\"slow-word-spatial-depth\"]",
      "[data-testid=\"slow-word-tiles-003\"]"
    ],
    "anchorRoles": [
      "slow-word-spatial-depth",
      "slow-word-tiles-003"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 4,
    "traceKey": "TH-SP-004",
    "anchorSelectors": [
      "[data-testid=\"shadow-well-0\"]",
      "[data-testid=\"shadow-well-1\"]",
      "[data-testid=\"shadow-well-2\"]"
    ],
    "anchorRoles": [
      "shadow-well-0",
      "shadow-well-1",
      "shadow-well-2"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 5,
    "traceKey": "TH-SP-005",
    "anchorSelectors": [
      "[data-testid=\"amber-rig-005\"]",
      "[data-testid=\"amber-lamp-track-005\"]"
    ],
    "anchorRoles": [
      "amber-rig-005",
      "amber-lamp-track-005"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 6,
    "traceKey": "TH-SP-006",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-006\"]"
    ],
    "anchorRoles": [
      "semantic-control-1"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 7,
    "traceKey": "TH-SP-007",
    "anchorSelectors": [
      "[data-testid=\"window-lane-007\"]"
    ],
    "anchorRoles": [
      "window-lane-007"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 8,
    "traceKey": "TH-SP-008",
    "anchorSelectors": [
      "[data-testid=\"relay-spatial-depth\"]"
    ],
    "anchorRoles": [
      "relay-spatial-depth"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 9,
    "traceKey": "TH-SP-009",
    "anchorSelectors": [
      "[data-testid=\"cipher-blocks-009\"]",
      "[data-testid=\"cipher-well-0\"]"
    ],
    "anchorRoles": [
      "cipher-blocks-009",
      "cipher-well-0"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 10,
    "traceKey": "TH-SP-010",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-010\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "fold",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 11,
    "traceKey": "TH-SP-011",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-011\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 12,
    "traceKey": "TH-SP-012",
    "anchorSelectors": [
      "[data-testid=\"pressure-disc-left-012\"]",
      "[data-testid=\"pressure-disc-right-012\"]"
    ],
    "anchorRoles": [
      "pressure-disc-left-012",
      "pressure-disc-right-012"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 13,
    "traceKey": "TH-SP-013",
    "anchorSelectors": [
      "[data-testid=\"lower-wave-013\"]"
    ],
    "anchorRoles": [
      "lower-wave-013"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 14,
    "traceKey": "TH-SP-014",
    "anchorSelectors": [
      "[data-testid=\"corner-cross-spatial-depth\"]"
    ],
    "anchorRoles": [
      "corner-cross-spatial-depth"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 15,
    "traceKey": "TH-SP-015",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-015\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 16,
    "traceKey": "TH-SP-016",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-016\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 17,
    "traceKey": "TH-SP-017",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-017\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 18,
    "traceKey": "TH-SP-018",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-018\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 19,
    "traceKey": "TH-SP-019",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-019\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 20,
    "traceKey": "TH-SP-020",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-020\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 21,
    "traceKey": "TH-SP-021",
    "anchorSelectors": [
      "[data-testid=\"warmup-dot-0\"]",
      "[data-testid=\"warmup-dot-1\"]",
      "[data-testid=\"warmup-dot-2\"]"
    ],
    "anchorRoles": [
      "warmup-dot-0",
      "warmup-dot-1",
      "warmup-dot-2"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 22,
    "traceKey": "TH-SP-022",
    "anchorSelectors": [
      "[data-testid=\"drop-lane-0\"]",
      "[data-testid=\"drop-lane-1\"]",
      "[data-testid=\"drop-lane-2\"]",
      "[data-testid=\"drop-lane-3\"]"
    ],
    "anchorRoles": [
      "drop-lane-0",
      "drop-lane-1",
      "drop-lane-2",
      "drop-lane-3"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 23,
    "traceKey": "TH-SP-023",
    "anchorSelectors": [
      "[data-testid=\"silence-gap-0\"]",
      "[data-testid=\"silence-gap-1\"]",
      "[data-testid=\"silence-gap-2\"]"
    ],
    "anchorRoles": [
      "silence-gap-0",
      "silence-gap-1",
      "silence-gap-2"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 24,
    "traceKey": "TH-SP-024",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-024\"]"
    ],
    "anchorRoles": [
      "semantic-control-1"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 25,
    "traceKey": "TH-SP-025",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-025\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 26,
    "traceKey": "TH-SP-026",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-026\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 27,
    "traceKey": "TH-SP-027",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-027\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 28,
    "traceKey": "TH-SP-028",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-028\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 29,
    "traceKey": "TH-SP-029",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-029\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 30,
    "traceKey": "TH-SP-030",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-030\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "fold",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 31,
    "traceKey": "TH-SP-031",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-031\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 32,
    "traceKey": "TH-SP-032",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-032\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 33,
    "traceKey": "TH-SP-033",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-033\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 34,
    "traceKey": "TH-SP-034",
    "anchorSelectors": [
      "[data-testid=\"horizon-tear-034\"]"
    ],
    "anchorRoles": [
      "horizon-tear-034"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 35,
    "traceKey": "TH-SP-035",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-035\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "fold",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 36,
    "traceKey": "TH-SP-036",
    "anchorSelectors": [
      "[data-testid=\"portable-horizon-target\"]"
    ],
    "anchorRoles": [
      "portable-horizon-target"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 37,
    "traceKey": "TH-SP-037",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-037\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 38,
    "traceKey": "TH-SP-038",
    "anchorSelectors": [
      "[data-testid=\"return-ticket-left-half\"]",
      "[data-testid=\"return-ticket-right-half\"]"
    ],
    "anchorRoles": [
      "return-ticket-left-half",
      "return-ticket-right-half"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 39,
    "traceKey": "TH-SP-039",
    "anchorSelectors": [
      "[data-testid=\"doubleback-tab-1\"]",
      "[data-testid=\"doubleback-tab-2\"]"
    ],
    "anchorRoles": [
      "doubleback-tab-1",
      "doubleback-tab-2"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 40,
    "traceKey": "TH-SP-040",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-040\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 41,
    "traceKey": "TH-SP-041",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-041\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 42,
    "traceKey": "TH-SP-042",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-042\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 43,
    "traceKey": "TH-SP-043",
    "anchorSelectors": [
      "[data-testid=\"archive-route-spatial-depth\"]"
    ],
    "anchorRoles": [
      "archive-route-spatial-depth"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 44,
    "traceKey": "TH-SP-044",
    "anchorSelectors": [
      "[data-testid=\"focus-orbit-spatial-depth\"]",
      "[data-testid=\"focus-orbit-target\"]"
    ],
    "anchorRoles": [
      "focus-orbit-spatial-depth",
      "focus-orbit-target"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 45,
    "traceKey": "TH-SP-045",
    "anchorSelectors": [
      "[data-testid=\"focus-cascade-layer-0\"]",
      "[data-testid=\"focus-cascade-layer-1\"]",
      "[data-testid=\"focus-cascade-layer-2\"]",
      "[data-testid=\"focus-cascade-layer-3\"]"
    ],
    "anchorRoles": [
      "focus-cascade-layer-0",
      "focus-cascade-layer-1",
      "focus-cascade-layer-2",
      "focus-cascade-layer-3"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 46,
    "traceKey": "TH-SP-046",
    "anchorSelectors": [
      "[data-testid=\"silent-handoff-segment-0\"]",
      "[data-testid=\"silent-handoff-segment-1\"]"
    ],
    "anchorRoles": [
      "silent-handoff-segment-0",
      "silent-handoff-segment-1"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 47,
    "traceKey": "TH-SP-047",
    "anchorSelectors": [
      "[data-testid=\"deep-pressure-ripple-0\"]",
      "[data-testid=\"deep-pressure-ripple-1\"]",
      "[data-testid=\"deep-pressure-ripple-2\"]"
    ],
    "anchorRoles": [
      "deep-pressure-ripple-0",
      "deep-pressure-ripple-1",
      "deep-pressure-ripple-2"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 48,
    "traceKey": "TH-SP-048",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-048\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 49,
    "traceKey": "TH-SP-049",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-049\"]"
    ],
    "anchorRoles": [
      "semantic-control-1"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 50,
    "traceKey": "TH-SP-050",
    "anchorSelectors": [
      "[data-testid=\"mirrored-input-slot\"]",
      "[data-testid=\"mirrored-input-band-en\"]"
    ],
    "anchorRoles": [
      "mirrored-input-slot",
      "mirrored-input-band-en"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 51,
    "traceKey": "TH-SP-051",
    "anchorSelectors": [
      "[data-testid=\"ready-code-thick-tile-051\"]",
      "[data-testid=\"ready-code-inner-left-051\"]"
    ],
    "anchorRoles": [
      "ready-code-thick-tile-051",
      "ready-code-inner-left-051"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 52,
    "traceKey": "TH-SP-052",
    "anchorSelectors": [
      "[data-testid=\"bend-command-back-052\"]",
      "[data-testid=\"bend-command-crease-052\"]"
    ],
    "anchorRoles": [
      "bend-command-back-052",
      "bend-command-crease-052"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 53,
    "traceKey": "TH-SP-053",
    "anchorSelectors": [
      "[data-testid=\"override-ring-direction-outer\"]",
      "[data-testid=\"override-ring-direction-inner\"]"
    ],
    "anchorRoles": [
      "override-ring-direction-outer",
      "override-ring-direction-inner"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 54,
    "traceKey": "TH-SP-054",
    "anchorSelectors": [
      "[data-testid=\"v2-scene-054\"]"
    ],
    "anchorRoles": [
      "scene-signature-surface"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 55,
    "traceKey": "TH-SP-055",
    "anchorSelectors": [
      "[data-testid=\"nineteen-shadow-one-055\"]",
      "[data-testid=\"nineteen-shadow-zero-055\"]"
    ],
    "anchorRoles": [
      "nineteen-shadow-one-055",
      "nineteen-shadow-zero-055"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 56,
    "traceKey": "TH-SP-056",
    "anchorSelectors": [
      "[data-testid=\"hundred-digit-0\"]",
      "[data-testid=\"hundred-digit-1\"]",
      "[data-testid=\"hundred-digit-2\"]",
      "[data-testid=\"hundred-digit-3\"]"
    ],
    "anchorRoles": [
      "hundred-digit-0",
      "hundred-digit-1",
      "hundred-digit-2",
      "hundred-digit-3"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 57,
    "traceKey": "TH-SP-057",
    "anchorSelectors": [
      "[data-testid=\"five-bit-face-0\"]",
      "[data-testid=\"five-bit-face-1\"]",
      "[data-testid=\"five-bit-face-2\"]",
      "[data-testid=\"five-bit-face-3\"]",
      "[data-testid=\"five-bit-face-4\"]"
    ],
    "anchorRoles": [
      "five-bit-face-0",
      "five-bit-face-1",
      "five-bit-face-2",
      "five-bit-face-3",
      "five-bit-face-4"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 58,
    "traceKey": "TH-SP-058",
    "anchorSelectors": [
      "[data-testid=\"cipher-rear-shadow\"]",
      "[data-testid=\"cipher-glyph-0\"]",
      "[data-testid=\"cipher-glyph-1\"]"
    ],
    "anchorRoles": [
      "cipher-rear-shadow",
      "cipher-glyph-0",
      "cipher-glyph-1"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 59,
    "traceKey": "TH-SP-059",
    "anchorSelectors": [
      "[data-testid=\"clock-sum-center\"]",
      "[data-testid=\"clock-sum-arc-0\"]",
      "[data-testid=\"clock-sum-arc-1\"]"
    ],
    "anchorRoles": [
      "clock-sum-center",
      "clock-sum-arc-0",
      "clock-sum-arc-1"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 60,
    "traceKey": "TH-SP-060",
    "anchorSelectors": [
      "[data-testid=\"cipher-knot-crossing\"]",
      "[data-testid=\"cipher-knot-end-0\"]"
    ],
    "anchorRoles": [
      "cipher-knot-crossing",
      "cipher-knot-end-0"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 61,
    "traceKey": "TH-SP-061",
    "anchorSelectors": [
      "[data-testid=\"reverse-sweep-cloud-notch\"]"
    ],
    "anchorRoles": [
      "reverse-sweep-cloud-notch"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 62,
    "traceKey": "TH-SP-062",
    "anchorSelectors": [
      "[data-testid=\"pointer-echo-target\"]",
      "[data-testid=\"pointer-echo-ghost\"]"
    ],
    "anchorRoles": [
      "pointer-echo-target",
      "pointer-echo-ghost"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 63,
    "traceKey": "TH-SP-063",
    "anchorSelectors": [
      "[data-testid=\"corner-zigzag-cut-0\"]",
      "[data-testid=\"corner-zigzag-cut-1\"]",
      "[data-testid=\"corner-zigzag-cut-2\"]",
      "[data-testid=\"corner-zigzag-cut-3\"]"
    ],
    "anchorRoles": [
      "corner-zigzag-cut-0",
      "corner-zigzag-cut-1",
      "corner-zigzag-cut-2",
      "corner-zigzag-cut-3"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 64,
    "traceKey": "TH-SP-064",
    "anchorSelectors": [
      "[data-testid=\"hinge-loop-board-0\"]",
      "[data-testid=\"hinge-loop-board-1\"]"
    ],
    "anchorRoles": [
      "hinge-loop-board-0",
      "hinge-loop-board-1"
    ],
    "silhouettePrimitive": "fold",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 65,
    "traceKey": "TH-SP-065",
    "anchorSelectors": [
      "[data-testid=\"target-route-tab-4\"]",
      "[data-testid=\"target-route-tab-2\"]",
      "[data-testid=\"target-route-tab-0\"]",
      "[data-testid=\"target-route-tab-3\"]",
      "[data-testid=\"target-route-tab-1\"]"
    ],
    "anchorRoles": [
      "target-route-tab-4",
      "target-route-tab-2",
      "target-route-tab-0",
      "target-route-tab-3",
      "target-route-tab-1"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 66,
    "traceKey": "TH-SP-066",
    "anchorSelectors": [
      "[data-testid=\"archive-knot-band-0\"]",
      "[data-testid=\"archive-knot-band-1\"]",
      "[data-testid=\"archive-knot-band-2\"]",
      "[data-testid=\"archive-knot-band-3\"]"
    ],
    "anchorRoles": [
      "archive-knot-band-0",
      "archive-knot-band-1",
      "archive-knot-band-2",
      "archive-knot-band-3"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 67,
    "traceKey": "TH-SP-067",
    "anchorSelectors": [
      "[data-testid=\"wheel-echo-gap\"]",
      "[data-testid=\"wheel-echo-solid\"]"
    ],
    "anchorRoles": [
      "wheel-echo-gap",
      "wheel-echo-solid"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 68,
    "traceKey": "TH-SP-068",
    "anchorSelectors": [
      "[data-testid=\"breach-gap-068\"]",
      "[data-testid=\"breach-arc-068\"]"
    ],
    "anchorRoles": [
      "breach-gap-068",
      "breach-arc-068"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 69,
    "traceKey": "TH-SP-069",
    "anchorSelectors": [
      "[data-testid=\"archive-eight-canvas-069\"]",
      "[data-testid=\"archive-eight-left-lobe\"]"
    ],
    "anchorRoles": [
      "archive-eight-canvas-069",
      "archive-eight-left-lobe"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 70,
    "traceKey": "TH-SP-070",
    "anchorSelectors": [
      "[data-testid=\"twin-gate-rear-sheet\"]",
      "[data-testid=\"twin-gate-opening-rear\"]"
    ],
    "anchorRoles": [
      "twin-gate-rear-sheet",
      "twin-gate-opening-rear"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 71,
    "traceKey": "TH-SP-071",
    "anchorSelectors": [
      "[data-testid=\"triple-groove-left\"]",
      "[data-testid=\"triple-groove-right\"]",
      "[data-testid=\"triple-dial-left\"]"
    ],
    "anchorRoles": [
      "triple-groove-left",
      "triple-groove-right",
      "triple-dial-left"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 72,
    "traceKey": "TH-SP-072",
    "anchorSelectors": [
      "[data-testid=\"glass-sheet-left\"]",
      "[data-testid=\"glass-sheet-right\"]",
      "[data-testid=\"glass-double-shadow\"]"
    ],
    "anchorRoles": [
      "glass-sheet-left",
      "glass-sheet-right",
      "glass-double-shadow"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 73,
    "traceKey": "TH-SP-073",
    "anchorSelectors": [
      "[data-testid=\"pressure-stone-0\"]",
      "[data-testid=\"pressure-stone-1\"]",
      "[data-testid=\"pressure-stone-2\"]"
    ],
    "anchorRoles": [
      "pressure-stone-0",
      "pressure-stone-1",
      "pressure-stone-2"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 74,
    "traceKey": "TH-SP-074",
    "anchorSelectors": [
      "[data-testid=\"braid-band-0\"]",
      "[data-testid=\"braid-edge-0\"]",
      "[data-testid=\"braid-band-1\"]"
    ],
    "anchorRoles": [
      "braid-band-0",
      "braid-edge-0",
      "braid-band-1"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 75,
    "traceKey": "TH-SP-075",
    "anchorSelectors": [
      "[data-testid=\"relay-weave-band-0\"]",
      "[data-testid=\"relay-weave-band-1\"]",
      "[data-testid=\"relay-weave-band-2\"]",
      "[data-testid=\"relay-weave-band-3\"]"
    ],
    "anchorRoles": [
      "relay-weave-band-0",
      "relay-weave-band-1",
      "relay-weave-band-2",
      "relay-weave-band-3"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 76,
    "traceKey": "TH-SP-076",
    "anchorSelectors": [
      "[data-testid=\"quorum-shadow-0\"]",
      "[data-testid=\"quorum-leaf-0\"]",
      "[data-testid=\"quorum-shadow-1\"]",
      "[data-testid=\"quorum-leaf-1\"]",
      "[data-testid=\"quorum-shadow-2\"]"
    ],
    "anchorRoles": [
      "quorum-shadow-0",
      "quorum-leaf-0",
      "quorum-shadow-1",
      "quorum-leaf-1",
      "quorum-shadow-2"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 77,
    "traceKey": "TH-SP-077",
    "anchorSelectors": [
      "[data-testid=\"operator-number-left\"]",
      "[data-testid=\"operator-number-right\"]",
      "[data-testid=\"operator-arrow-groove\"]"
    ],
    "anchorRoles": [
      "operator-number-left",
      "operator-number-right",
      "operator-arrow-groove"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 78,
    "traceKey": "TH-SP-078",
    "anchorSelectors": [
      "[data-testid=\"oscillation-center-slot\"]",
      "[data-testid=\"oscillation-trail-0\"]",
      "[data-testid=\"oscillation-window-0\"]",
      "[data-testid=\"oscillation-trail-1\"]"
    ],
    "anchorRoles": [
      "oscillation-center-slot",
      "oscillation-trail-0",
      "oscillation-window-0",
      "oscillation-trail-1"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 79,
    "traceKey": "TH-SP-079",
    "anchorSelectors": [
      "[data-testid=\"countdown-vote-0\"]",
      "[data-testid=\"countdown-vote-1\"]",
      "[data-testid=\"countdown-vote-2\"]",
      "[data-testid=\"countdown-vote-3\"]",
      "[data-testid=\"countdown-vote-4\"]",
      "[data-testid=\"countdown-vote-5\"]",
      "[data-testid=\"countdown-vote-6\"]"
    ],
    "anchorRoles": [
      "countdown-vote-0",
      "countdown-vote-1",
      "countdown-vote-2",
      "countdown-vote-3",
      "countdown-vote-4",
      "countdown-vote-5",
      "countdown-vote-6"
    ],
    "silhouettePrimitive": "fold",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 80,
    "traceKey": "TH-SP-080",
    "anchorSelectors": [
      "[data-testid=\"singularity-fiber-1\"]",
      "[data-testid=\"singularity-fiber-2\"]",
      "[data-testid=\"singularity-fiber-4\"]",
      "[data-testid=\"singularity-fiber-5\"]"
    ],
    "anchorRoles": [
      "singularity-fiber-1",
      "singularity-fiber-2",
      "singularity-fiber-4",
      "singularity-fiber-5"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 81,
    "traceKey": "TH-SP-081",
    "anchorSelectors": [
      "[data-testid=\"dual-spatial-depth\"]",
      "[data-testid=\"dual-shared-socket\"]"
    ],
    "anchorRoles": [
      "dual-spatial-depth",
      "dual-shared-socket"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 82,
    "traceKey": "TH-SP-082",
    "anchorSelectors": [
      "[data-testid=\"majority-shadow-0\"]",
      "[data-testid=\"majority-shadow-1\"]",
      "[data-testid=\"majority-shadow-2\"]"
    ],
    "anchorRoles": [
      "majority-shadow-0",
      "majority-shadow-1",
      "majority-shadow-2"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 83,
    "traceKey": "TH-SP-083",
    "anchorSelectors": [
      "[data-testid=\"alternating-trail-0\"]",
      "[data-testid=\"alternating-trail-1\"]"
    ],
    "anchorRoles": [
      "alternating-trail-0",
      "alternating-trail-1"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 84,
    "traceKey": "TH-SP-084",
    "anchorSelectors": [
      "[data-testid=\"ghost-imprint-0\"]",
      "[data-testid=\"ghost-imprint-1\"]"
    ],
    "anchorRoles": [
      "ghost-imprint-0",
      "ghost-imprint-1"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 85,
    "traceKey": "TH-SP-085",
    "anchorSelectors": [
      "[data-testid=\"phase-return-moon\"]",
      "[data-testid=\"phase-return-window\"]",
      "[data-testid=\"phase-return-cover\"]"
    ],
    "anchorRoles": [
      "phase-return-moon",
      "phase-return-window",
      "phase-return-cover"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 86,
    "traceKey": "TH-SP-086",
    "anchorSelectors": [
      "[data-testid=\"eclipse-page-sun\"]"
    ],
    "anchorRoles": [
      "eclipse-page-sun"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 87,
    "traceKey": "TH-SP-087",
    "anchorSelectors": [
      "[data-testid=\"gravity-groove-0\"]",
      "[data-testid=\"gravity-groove-1\"]",
      "[data-testid=\"gravity-groove-2\"]"
    ],
    "anchorRoles": [
      "gravity-groove-0",
      "gravity-groove-1",
      "gravity-groove-2"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 88,
    "traceKey": "TH-SP-088",
    "anchorSelectors": [
      "[data-testid=\"liminal-return-slot\"]",
      "[data-testid=\"liminal-inside-piece\"]"
    ],
    "anchorRoles": [
      "liminal-return-slot",
      "liminal-inside-piece"
    ],
    "silhouettePrimitive": "fold",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 89,
    "traceKey": "TH-SP-089",
    "anchorSelectors": [
      "[data-testid=\"braid-paper-viewport\"]",
      "[data-testid=\"braid-continuous-ribbon\"]",
      "[data-testid=\"braid-dotted-ribbon\"]",
      "[data-testid=\"braid-paper-clip\"]"
    ],
    "anchorRoles": [
      "braid-paper-viewport",
      "braid-continuous-ribbon",
      "braid-dotted-ribbon",
      "braid-paper-clip"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 90,
    "traceKey": "TH-SP-090",
    "anchorSelectors": [
      "[data-testid=\"labyrinth-cell-0\"]",
      "[data-testid=\"labyrinth-cell-1\"]"
    ],
    "anchorRoles": [
      "labyrinth-cell-0",
      "labyrinth-cell-1"
    ],
    "silhouettePrimitive": "portal",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 91,
    "traceKey": "TH-SP-091",
    "anchorSelectors": [
      "[data-testid=\"mode-card-normal\"]",
      "[data-testid=\"mode-card-slow\"]"
    ],
    "anchorRoles": [
      "mode-card-normal",
      "mode-card-slow"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 92,
    "traceKey": "TH-SP-092",
    "anchorSelectors": [
      "[data-testid=\"five-echo-field\"]",
      "[data-testid=\"five-echo-ring-0\"]",
      "[data-testid=\"five-echo-ring-1\"]",
      "[data-testid=\"five-echo-ring-2\"]",
      "[data-testid=\"five-echo-ring-3\"]"
    ],
    "anchorRoles": [
      "five-echo-field",
      "five-echo-ring-0",
      "five-echo-ring-1",
      "five-echo-ring-2",
      "five-echo-ring-3"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 93,
    "traceKey": "TH-SP-093",
    "anchorSelectors": [
      "[data-testid=\"six-beat-segment-0\"]",
      "[data-testid=\"six-beat-segment-1\"]",
      "[data-testid=\"six-beat-fold-line-1\"]",
      "[data-testid=\"six-beat-segment-2\"]",
      "[data-testid=\"six-beat-fold-line-2\"]",
      "[data-testid=\"six-beat-segment-3\"]"
    ],
    "anchorRoles": [
      "six-beat-segment-0",
      "six-beat-segment-1",
      "six-beat-fold-line-1",
      "six-beat-segment-2",
      "six-beat-fold-line-2",
      "six-beat-segment-3"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 94,
    "traceKey": "TH-SP-094",
    "anchorSelectors": [
      "[data-testid=\"saturation-layer-0\"]",
      "[data-testid=\"saturation-layer-1\"]",
      "[data-testid=\"saturation-layer-2\"]"
    ],
    "anchorRoles": [
      "saturation-layer-0",
      "saturation-layer-1",
      "saturation-layer-2"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 95,
    "traceKey": "TH-SP-095",
    "anchorSelectors": [
      "[data-testid=\"triple-phase-past\"]",
      "[data-testid=\"triple-phase-present\"]",
      "[data-testid=\"triple-phase-future\"]"
    ],
    "anchorRoles": [
      "triple-phase-past",
      "triple-phase-present",
      "triple-phase-future"
    ],
    "silhouettePrimitive": "ring",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 96,
    "traceKey": "TH-SP-096",
    "anchorSelectors": [
      "[data-testid=\"null-beat-0\"]",
      "[data-testid=\"null-beat-1\"]",
      "[data-testid=\"null-beat-2\"]",
      "[data-testid=\"null-beat-3\"]",
      "[data-testid=\"null-beat-4\"]",
      "[data-testid=\"null-beat-5\"]",
      "[data-testid=\"null-beat-6\"]"
    ],
    "anchorRoles": [
      "null-beat-0",
      "null-beat-1",
      "null-beat-2",
      "null-beat-3",
      "null-beat-4",
      "null-beat-5",
      "null-beat-6"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 97,
    "traceKey": "TH-SP-097",
    "anchorSelectors": [
      "[data-testid=\"sevenfold-page-0\"]",
      "[data-testid=\"sevenfold-page-1\"]",
      "[data-testid=\"sevenfold-page-2\"]",
      "[data-testid=\"sevenfold-page-3\"]",
      "[data-testid=\"sevenfold-page-4\"]",
      "[data-testid=\"sevenfold-page-5\"]",
      "[data-testid=\"sevenfold-page-6\"]"
    ],
    "anchorRoles": [
      "sevenfold-page-0",
      "sevenfold-page-1",
      "sevenfold-page-2",
      "sevenfold-page-3",
      "sevenfold-page-4",
      "sevenfold-page-5",
      "sevenfold-page-6"
    ],
    "silhouettePrimitive": "fold",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 98,
    "traceKey": "TH-SP-098",
    "anchorSelectors": [
      "[data-testid=\"quad-moment-0\"]",
      "[data-testid=\"quad-moment-1\"]",
      "[data-testid=\"quad-moment-2\"]",
      "[data-testid=\"quad-moment-3\"]"
    ],
    "anchorRoles": [
      "quad-moment-0",
      "quad-moment-1",
      "quad-moment-2",
      "quad-moment-3"
    ],
    "silhouettePrimitive": "paper",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 99,
    "traceKey": "TH-SP-099",
    "anchorSelectors": [
      "[data-testid=\"polyrhythm-wave-2\"]",
      "[data-testid=\"polyrhythm-wave-3\"]",
      "[data-testid=\"polyrhythm-inspection-band\"]",
      "[data-testid=\"polyrhythm-hole-0\"]",
      "[data-testid=\"polyrhythm-hole-1\"]",
      "[data-testid=\"polyrhythm-hole-2\"]"
    ],
    "anchorRoles": [
      "polyrhythm-wave-2",
      "polyrhythm-wave-3",
      "polyrhythm-inspection-band",
      "polyrhythm-hole-0",
      "polyrhythm-hole-1",
      "polyrhythm-hole-2"
    ],
    "silhouettePrimitive": "ribbon",
    "successComposition": "converge",
    "allowFallback": false
  },
  {
    "id": 100,
    "traceKey": "TH-SP-100",
    "anchorSelectors": [
      "[data-testid=\"constellation-left-cluster\"]",
      "[data-testid=\"constellation-star-0\"]",
      "[data-testid=\"constellation-star-1\"]",
      "[data-testid=\"constellation-star-2\"]",
      "[data-testid=\"constellation-right-cluster\"]",
      "[data-testid=\"constellation-star-3\"]"
    ],
    "anchorRoles": [
      "constellation-left-cluster",
      "constellation-star-0",
      "constellation-star-1",
      "constellation-star-2",
      "constellation-right-cluster",
      "constellation-star-3"
    ],
    "silhouettePrimitive": "ray",
    "successComposition": "converge",
    "allowFallback": false
  }
] as const satisfies readonly FullSpatialAnchorContract[];

export const FULL_SPATIAL_ANCHOR_CONTRACT_BY_ID: ReadonlyMap<number, FullSpatialAnchorContract> = new Map(
  FULL_SPATIAL_ANCHOR_CONTRACTS.map((contract) => [contract.id, contract]),
);
