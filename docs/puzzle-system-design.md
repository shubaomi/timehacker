# Time Hacker full-page puzzle system

## Decision

Time Hacker will use one reusable full-page puzzle engine backed by one hundred authored scene definitions. Each cheat slug keeps its stable database identity, but receives its own scene composition, discovery rule, unlock rule, bilingual hints, feedback, and accessibility alternatives.

This replaces the previous model where twelve interaction families, twelve discovery gestures, ten decorative marks, and ten timer-card slots were combined algorithmically. Those combinations were technically unique but did not create one hundred memorable puzzles.

## Why this is worth building

### Positive value

- A visible sparkle, step counter, and shared instruction panel undermine the central promise that players discover how to bend time themselves.
- A distinct background, clue, and causal solution for each cheat creates stronger curiosity, recall, replay value, and meaning for the collection.
- Environmental manipulation is a better fit for a light creative game than service-command forms or answer buttons.

### Risks and safeguards

- One hundred separate React pages would duplicate layout, input, accessibility, and test logic. The engine therefore reuses primitives while the scene content stays authored.
- Removing every clue would make solutions arbitrary. Each scene must connect its visual anomaly to its answer, and optional two-tier hints remain available from the menu.
- The project borrows the principle of rule-bending environmental puzzles, not another game's characters, rooms, controls, artwork, wording, or solutions.
- Automated tests can prove integrity and playability, but not genuine player delight. The completion report must distinguish automated evidence, developer heuristic review, and post-release player validation.

## Product flow

```text
LOADING
  -> READY / EXPLORING
  -> DISCOVERED
  -> SOLVING
  -> ARMED
  -> STARTING
  -> RUNNING
  -> STOPPING
  -> SUCCESS | FAILED
  -> READY with the next assigned cheat
```

Only READY is interactive. DISCOVERED and SOLVING are internal puzzle phases. ARMED confirms the solved scene without explaining the timing math. STARTING, RUNNING, STOPPING, SUCCESS, and FAILED cannot accept puzzle input. The cheat assigned to the current round is snapshotted separately from refreshed dashboard data so a completed round cannot reveal or partially operate the next scene.

## Visual direction

The interface is a soft, playful time garden: ink-blue typography, warm coral action, butter yellow, mint, sky blue, and lilac atmosphere. The primary stopwatch and action remain extremely clear while asymmetric scene objects occupy the surrounding page. Scenes use lightweight CSS and SVG-like shapes, shadows, folds, waves, constellations, rulers, pendulums, reflections, and clock fragments rather than heavy image assets.

The direction combines restrained clay-like depth with accessible contrast. Interactive objects look like parts of the environment, not generic buttons, while still using semantic controls, visible keyboard focus, 44px minimum touch targets, and non-color state markers. Motion is reserved for scene feedback and the armed moment, uses transform/opacity, and is removed under `prefers-reduced-motion`.

## Architecture

- `PuzzleSceneConfig`: Zod-validated scene identity, palette, composition, objects, discovery and unlock rules, hints, alternatives, and unique signature.
- `PUZZLE_SCENES`: one literal authored entry for every stable cheat slug. No modulo or random scene generation.
- `PuzzleScene`: the only mounted scene renderer. It is a sibling of the stopwatch stage and occupies the full play area.
- `puzzle-engine`: deterministic rule evaluation used by the client, server verification, and the one-hundred-scene fixture tests.
- `activeRoundCheat`: immutable assignment for the current READY-to-result lifecycle.
- Existing `triggerConfig` remains the database container. `puzzleScene` is additive JSON, so no relational migration is required.

The engine supports at least twenty-five primary mechanics across pointer, touch, keyboard, focus, timing, wheel, visibility, orientation, locale, and optional camera input. No primary mechanic may appear more than six times, at least seventy primary targets are outside the stopwatch, and every discovery/unlock signature is unique.

## Error, permission, and hint handling

Errors, daily limits, and permission explanations remain visible and announced. Camera use is opt-in, processed locally, lazy-loaded, and always has a pointer/touch/keyboard fallback. Device orientation, tab visibility, wheel, and motion-sensitive interactions also have equivalent fallback actions.

Hints never appear automatically. The game menu exposes two explicit levels: a broad observation cue and a more direct causal clue. Neither performs the action for the player.

## Test strategy

- Schema and catalog tests prove exactly one hundred valid scenes, stable slugs, unique identities/signatures, diversity limits, target distribution, bilingual content, alternatives, and rubric scores.
- Deterministic fixtures complete every scene and reject incomplete, reordered, or wrong-target input.
- Component tests prove full-page placement, state gating, result isolation, hint opt-in, collection contrast, copy removal, and camera fallback.
- Integration tests run only against exact generated test player IDs, seed by stable slug with idempotent upserts, and prove no player records are removed.
- Browser tests cover every primitive family plus representative desktop, mobile, keyboard, reduced-motion, camera, locale, zoom, and result flows. All one hundred scenes receive an automated render smoke check.

## Completion boundary

Green tests are necessary but not sufficient. The catalog audit must include all one hundred authored rows with no dimension below 3/5 and an average of at least 4/5. Representative developer play-throughs are recorded separately from the product owner's later real-user validation.
