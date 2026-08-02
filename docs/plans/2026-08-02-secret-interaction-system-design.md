# Secret interaction system redesign

## Decision

The current universal swipe password solves accessibility and keeps the home page small, but it makes one hundred authored secrets feel like one repeated puzzle. The redesign keeps the stable stopwatch stage and replaces the single sparkle/gesture mechanic with twelve interaction families. This preserves immediate game comprehension without paying the usability and maintenance cost of one hundred unrelated page layouts.

Hints use progressive disclosure. Every puzzle begins with a family-specific visual motion. The explicit next action appears only after a difficulty-scaled delay, after the player asks for help, or after a wrong action. The complete sequence is never shown. D1 reveals guidance quickly; D5 waits longer. Assistive labels always state the actionable control so keyboard and screen-reader users are not blocked.

## Interaction families

1. Trail — trace directional drift.
2. Smudge — wipe a mark in the suggested direction.
3. Echo — repeat a briefly suggested direction.
4. Rhythm — play soft, strong, or held beats.
5. Pulse — touch one of three breathing rings.
6. Pressure — tap, hold, or deep-hold a soft pad.
7. Corners — follow a spatial corner order.
8. Constellation — connect glowing stars.
9. Digits — touch changing timer glyphs.
10. Switchboard — flip playful pictogram switches.
11. Orbit — follow points around a small orbit.
12. Balance — guide an orb between left, centre, and right zones.

Families are assigned according to the cheat category so the interaction remains compatible with its narrative. Every definition receives a unique 3-to-5-step configuration and a D1-to-D5 hint delay. The trigger remains JSON data in the existing `triggerConfig`; no database migration is required, and the idempotent seed updates all one hundred records.

## State and validation

- READY, unsolved: render a family-specific anomaly on the timer.
- Open: show the interactive surface, visual cue, progress, and an optional hint control.
- Wrong action: softly reset the sequence and reveal only the next action.
- Solved: replace the anomaly button with a clear active badge. It must no longer look clickable.
- RUNNING/STARTING/STOPPING/limit reached: hide the discovery control.
- Next round: reset local progress and receive the next assigned configuration.

The client emits `SECRET_ACTION` events with exact action values. The server validates the assigned family sequence, order, and 20-second window before applying the existing assistance effect. Original authored triggers stay supported as compatibility paths, but the visible game uses the new interaction configuration.

## Acceptance gates

- Exactly 100 unique interaction configurations, with all 12 families represented.
- Each family has positive and incomplete/incorrect server-validation tests.
- D1 contains 3 steps and the shortest hint delay; D5 contains 5 and the longest.
- Pointer and keyboard paths work for gesture, pressure, and spatial-choice families.
- The solved state has no disabled fake button and clearly states that the secret is active.
- The running state exposes no secret control.
- Desktop and mobile screenshots remain visually simple with no overflow.
- Full lint, typecheck, unit/component, PostgreSQL integration, production build, accessibility, reduced-motion, and Playwright gates pass before delivery.
