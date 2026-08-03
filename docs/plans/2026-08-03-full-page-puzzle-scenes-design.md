# Full-page puzzle scenes implementation plan

The validated product and architecture decision is recorded in [`../puzzle-system-design.md`](../puzzle-system-design.md).

1. Add failing contracts for the scene schema, one-hundred-entry diversity, deterministic completion, result-state isolation, collection language, and removed helper copy.
2. Add the authored scene manifest and deterministic puzzle evaluator to `src/game` without changing stable cheat slugs.
3. Replace the timer-card secret overlay with a full-page `PuzzleScene` sibling, preserve optional camera input, and snapshot `activeRoundCheat` per round.
4. Simplify the primary UI, add opt-in menu hints, and restyle unlocked collection cards with non-color status cues.
5. Persist the additive `puzzleScene` JSON through the existing idempotent seed and validate the shared-database safety invariants.
6. Expand component, integration, browser, accessibility, responsive, render-smoke, and visual evidence coverage.
7. Run the complete verification chain, review the final diff, commit only task files, and non-force push the verified branch.
