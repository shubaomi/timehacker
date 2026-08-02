# Time Hacker V2 design brief

## Product value check

- Real problem: a plain ten-second timer is immediately understandable but has little reason to replay.
- Audience: mobile and desktop visitors who enjoy short skill challenges, hidden mechanics, collection, and shareable results.
- Session: a one-to-three-minute visit built around one obvious start/stop action.
- Expected value: test whether discovery, mastery, and social comparison create replay and sharing intent.
- Counter-case: a large catalog can become repetitive or inaccessible if it is only quantity. Accounts, payments, AI-generated live content, and admin tools still add cost without proving demand.
- Decision: preserve the focused one-action game while maintaining 100 authored, testable cheats. Difficulty remains exactly 20 per tier, while category totals follow interaction quality instead of a forced 5×5 matrix. Commercial demand and subjective fun remain real-user validation gates.

## UI concept

**Classified Chronology Lab** is a precision instrument that has been quietly tampered with. The interface should feel manufactured rather than themed: graphite plates, warm bone labels, an amber safety accent, calibration ticks, registration marks, and a single oversized time readout.

The memorable moment is the timer housing changing its physical rhythm when a cheat is armed: calibration rails separate, the amber signal widens, and the status copy explicitly states that game time is being distorted.

The bundled `ui-ux-pro-max` generator suggested retro-futurism and industrial safety orange. Its webinar layout and full pixel-font pairing were intentionally rejected because they conflict with a one-action game and reduce precision readability. `frontend-design` informed the asymmetric instrument layout, restrained high-impact motion, bilingual fit, and avoidance of generic dashboard cards. The product mark uses the same clock, fracture, graphite, bone, and signal-orange vocabulary at favicon scale.

## Reference patterns

- [Braun BC24](https://us.braun-clocks.com/products/bc24b-braun-touch-display-digital-alarm-clock-black): negative LCD contrast and a single direct control.
- [NASA launch countdown](https://www.nasa.gov/missions/artemis/orion/artemis-i-launch-countdown-101/): operational status language and milestone rhythm.
- [Teenage Engineering TP-7](https://teenage.engineering/products/tp-7): compact instrument hierarchy and tactile industrial detailing.

These are pattern references only; no visual asset or composition is copied.

## UX flow

1. Initializing: establish or resume an anonymous player and load the daily allowance.
2. Ready: show the 10.000-second objective, mode, assigned clue, and one primary START control.
3. Running: replace START with STOP, announce state, and keep secondary surfaces quiet.
4. Result: show measured duration, signed error, success state, progress changes, and a concise next action.
5. Discovery: failures reveal progressively stronger clues; a satisfied trigger arms one transparent effect family: full dilation, final-zone dilation, assisted tolerance, or a brake pulse.
6. Mastery: first success unlocks nickname, difficulty selection, Pure Mode, collection, ranks, share, and reset.

All network surfaces have loading, empty, error, and retry states. Device-oriented cheats always have a service-input fallback; sweep, focus, service-key, pulse and hold rituals also expose explicit single-pointer controls. Ritual progress is announced in text with `aria-live`, including soft reset and timing feedback. Locale selection is stored locally and in a cookie; the root HTML language is updated for assistive technology.

## Design tokens

### Color

- `ink-950`: `#080a09` — page ground
- `ink-900`: `#101311` — instrument housing
- `ink-800`: `#1b201d` — raised surface
- `bone-100`: `#f1eadb` — primary text
- `bone-300`: `#c8c0b1` — secondary text
- `signal-500`: `#ff6a1a` — primary action and armed state
- `signal-300`: `#ffad73` — focus and highlight
- `mint-400`: `#6ee7b7` — successful measurement
- `danger-400`: `#fb7185` — failed measurement
- `line`: `rgba(241, 234, 219, 0.16)` — instrument rules

Text and controls must meet WCAG AA contrast; success and failure also use labels and symbols.

### Type

- Display/time: Azeret Mono Variable, tabular numerals, 56-120px responsive scale.
- Labels/body: Bricolage Grotesque Variable, 12-18px.
- Simplified Chinese fallback: Microsoft YaHei, PingFang SC, or Noto Sans CJK SC.
- Other fallbacks remain readable monospace/sans-serif families but are not the intended presentation.

### Space, radius, and motion

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Radius: 2px for calibration details, 10px for controls, 20px for major housings.
- Focus: 3px signal ring with a 3px dark offset.
- Motion: 160ms control response, 420ms panel transition, one 700ms success sequence.
- Reduced motion: remove transforms, scanning lines, and stagger; retain immediate opacity/state changes.

## Responsive composition

- Mobile: status rail, timer housing, primary control, then a horizontal section selector and one surface at a time.
- Tablet: timer remains dominant; progression and assigned cheat sit beneath it.
- Desktop: asymmetric 7/5 grid, with the timer instrument left and the active intelligence panel right.
- No interaction depends on hover, drag, orientation, or multi-touch.
