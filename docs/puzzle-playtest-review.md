# Puzzle interaction review

## Review boundary

This review combines deterministic completion tests for all 100 scene contracts, component interaction tests for all 25 mechanics, and browser checks at 1440px, 768px, 390px, 360px, reduced motion, Chromium/Edge, and WebKit. It does not claim that automated checks can prove long-term fun; production analytics and fresh-player observation remain the post-deployment validation loop.

## Representative 20-scene heuristic pass

| Scene | Why it was sampled | Review outcome |
| --- | --- | --- |
| five-finger-echo | D1, stopwatch zone, tap/rhythm | Clear five-ring motif; one discover and one solve action keep the first experience approachable. |
| pressure-delay | D1, left field, double-tap/hold | Ripple and pressure pairing supports the action without text. |
| four-corner-breach | D1, top field, drag/trace | Broken frame and escaped corner provide a spatial cause and answer. |
| calibration-101 | D1, border, trace/assemble | Border seam makes the binary relation part of the page rather than a detached control. |
| tab-return | D1, border, wheel/visibility | Page-edge continuation hints that leaving the visible sheet matters. |
| horizon-shift | D1, decoration, orientation/align | Two horizons and a tilted sun make device rotation inferable; keyboard fallback is retained. |
| ten-thousand-glyph | D1, right field, camera/trace | Camera is opt-in, frames stay local, and touch/keyboard fallback prevents a permission dead end. |
| quiet-circuit | D1, top field, sequence/camera | Focus-like silent nodes lead to the optional open-palm route without a universal camera prompt. |
| breath-gap | D1, top field, hold/wait | Natural widening gap supports patient observation; no automatic instruction is shown. |
| relay-sandwich | D2, top field, interval/assemble | Layer order and transparent center communicate the assembly relationship. |
| inverted-nibble | D2, border, keyboard/toggle | Reflected binary tiles use the border as a clue and remain keyboard-native. |
| archive-knot | D2, decoration, assemble/sequence | Paper grain and cut ends create an environmental relation rather than a command quiz. |
| corner-cross | D3, title, drag/align | Shared missing center gives a strong spatial aha and avoids copying room/key puzzles. |
| precision-five | D3, stopwatch, trace/rhythm | Curve spacing creates a readable precision clue without numeric helper copy. |
| focus-orbit | D3, stopwatch, wheel/focus | Nested depths support a focus route; 44px targets preserve keyboard and touch reachability. |
| wheel-echo | D4, bottom, wheel/orbit | Concentric rings distinguish it from generic scrolling and retain a second-stage orbit. |
| archive-figure-eight | D4, stopwatch, rotate/orbit | Two crossing loops are visually memorable and do not reuse a menu-navigation ritual. |
| pressure-singularity | D5, title, interval/camera | Pinched baseline logically supports the optional pinch-drag gesture and has a non-camera fallback. |
| cipher-knot | D5, stopwatch, keyboard/camera | Fold and negative-space zigzag connect words to the air gesture without an input box. |
| silent-constellation | D5, stopwatch, resize/camera | Six-star negative space gives the V gesture a scene-specific reason and reduced-motion alternative. |

## Findings and changes made

- Rejected the single universal anomaly/star entrance and the modal step panel.
- Moved 86 primary discovery targets outside the stopwatch region and distributed them across all eight page zones.
- Replaced 12 repeated interaction families with 25 mechanics and 100 unique discovery/solve signatures.
- Kept D1 solutions short; D2-D3 use additional solve beats; D4-D5 use three solve beats unless a camera gesture must complete atomically.
- Removed automatic step counters, next-action copy, timing-effect math, and result-card helper paragraphs.
- Made hints opt-in with two tiers in the menu. Tier two also exposes a direct touch fallback for sensor- or keyboard-dependent scenes.
- Removed hover translation from the primary button after WebKit exposed an unstable click target.
- Kept camera scenes to six distinct gestures, lazy runtime loading, on-device processing, explicit permission, and touch fallback.

## Post-deployment product validation

Track abandon rate before discovery, hint tier usage, solve time by slug, camera opt-out rate, armed-to-start conversion, and success at 10.00. Review any level with unusually high no-hint abandonment or unusually low solve time; those signals indicate either guesswork or unfair obscurity and require content changes rather than lower acceptance standards.
