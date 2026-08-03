# Discovery and landing-assist redesign

## Decision

The current game has one hundred unique unlock sequences, but every secret is discovered through the same top-right anomaly. That makes discovery feel cosmetic instead of being part of the game. Mild time dilation also leaves ordinary players with too little reaction time at 10.00 seconds. Both are real product defects because they undermine the reward for curiosity.

The redesign keeps the intentionally minimal home screen and separates a secret into two stages: discovery and unlock. Low-level pointer primitives remain reusable for reliability, while all one hundred authored discovery configurations are unique combinations of anomaly, placement, motion, and action sequence. This avoids the fragility of one hundred unrelated React components without repeating one visible entrance.

## Discovery model

Each assigned cheat receives a `discovery` configuration containing:

- one of ten quiet visual anomalies;
- one of ten positions around the stopwatch card;
- a unique two-action sequence built from tap, double tap, hold, four directional swipes, clockwise/counter-clockwise orbit, horizontal/vertical rub, and zigzag;
- a difficulty-scaled progressive-hint delay and a deterministic motion variant.

The anomaly begins as a subtle 44-pixel touch target whose inner mark is visually smaller. Its motion suggests the next action. After the hint delay, a short bilingual nudge appears; it never exposes the full two-action sequence at once. A wrong action keeps the completed discovery step and reveals the current nudge instead of punishing the player with a full reset. Completing discovery opens the existing family-specific unlock interaction. Pointer, touch, keyboard, reduced-motion, and screen-reader paths remain available.

## Landing assist

Every successfully activated cheat retains its authored pre-target effect and gains a common landing zone:

- before 9.95 seconds, the existing effect curve remains unchanged;
- from 9.95, the displayed hundredth advances once per real second;
- 9.95, 9.96, 9.97, 9.98, and 9.99 each remain visible for one second;
- 10.00 remains visible for three seconds total: its normal one-second step plus two extra seconds;
- after 10.00, hundredths continue at one step per second so overshoot remains legible.

The same pure timing function is used by the browser and server. Stopping at any point in the 10.00 plateau is judged as exactly 10,000 ms, so the assistance is deterministic and cannot be faked by client-provided display time.

## Acceptance gates

- Exactly 100 discovery configurations and 100 unique discovery action sequences.
- All anomaly visuals, placements, and discovery actions are represented.
- Discovery is not universally anchored to the top-right corner.
- Positive, incomplete, and incorrect discovery paths are tested.
- Touch/pointer recognizers cover taps, holds, swipes, orbits, rubs, and zigzags; keyboard equivalents remain available.
- Every generated cheat reaches a 9.95 landing zone and exposes an exact 10.00 plateau of at least three seconds.
- Client and server timing mappings agree at 9.95, 10.00, and after the plateau.
- The home screen remains visually limited to challenge copy, stopwatch, primary button, and the subtle anomaly.
- Desktop, mobile, reduced-motion, accessibility, unit/component, PostgreSQL integration, production build, and Playwright checks must pass before delivery.
