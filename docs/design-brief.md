# Time Hacker V3 design brief

## Product decision

- Real problem: the previous interface made a five-second casual game feel like a control room. Labels, diagnostics, missions, service input, profiles, and navigation competed with the only action that mattered.
- Audience and moment: a mobile or desktop visitor who should understand the game in seconds, play immediately, notice a small oddity, and feel clever for discovering it.
- Counter-case: removing every secondary feature would waste working progression and collection systems. Making hidden interactions too obscure would turn curiosity into frustration.
- Decision: keep the deeper systems, but move them into a menu. The first screen is only the challenge, timer, primary button, and one subtle family-specific anomaly. Every assigned cheat is completed through direct interaction instead of form input.
- Validation still required: automated tests prove usability mechanics and reliability, but only real-player sessions can prove that the anomalies are discoverable and the 100 configurations feel rewarding over time.

## UI concept

**Sunlit Stopwatch** feels like a tiny digital toy on a bright afternoon. The canvas is pale sky blue with soft coral, butter, mint, and lilac shapes. Deep navy keeps the digits crisp. The screen has one dominant action and no fictional laboratory vocabulary.

The memorable detail is a small anomaly near the clock. Its form changes with the assigned interaction family: trail, smudge, echo, rhythm, pulse, pressure, corners, constellation, digits, switchboard, orbit, or balance. It is visible enough to invite attention but quiet enough not to read as a second primary button. Opening it reveals a compact interactive surface; the game never asks the player to type a service code or solve a form.

`ui-ux-pro-max` informed the accessibility, touch-target, responsive, contrast, and reduced-motion constraints. `frontend-design` informed the strong visual point of view, limited palette, non-dashboard composition, and restraint around secondary UI.

## Information architecture

### First screen

1. Time Hacker wordmark and a menu button.
2. A one-line challenge: stop time at `10.00` seconds.
3. A one-line instruction.
4. The timer, showing seconds and two decimal places only.
5. A single coral Start/Stop/Again button.
6. A quiet, family-specific anomaly that can open the assigned secret interaction.
7. A compact result after stopping, with retry and share.

### Menu drawer

- English/Chinese switch
- With secrets/Pure mode
- Difficulty after it has been unlocked
- Secrets collection and leaderboard
- Personal plays, successes, secrets found, and best error
- Remaining daily starts
- Nickname after it has been unlocked
- Reset behind a confirmation dialog

Opening the drawer softly blurs the game beneath it. Collection and ranking open inside the same drawer instead of becoming prominent home-page tabs.

## Secret interaction model

- Every one of the 100 cheats has a deterministic, unique configuration of 3 to 5 steps across 12 interaction families.
- The families mix directional traces, wiping, echoes, rhythm, pulse rings, pressure duration, spatial corners, stars, digits, pictogram switches, orbit points, and balance zones.
- Touch and mouse use direct manipulation: motion families are swiped, pressure is held, and spatial families are solved by pressing and dragging through glowing targets. Tapping remains a fallback, and keyboard equivalents remain available for every family.
- The surface first gives a dynamic visual clue. It reveals the explicit next action only after a difficulty-scaled delay, a wrong action, or a player request. It never exposes the complete sequence.
- A wrong step softly resets progress. Completing the sequence arms the real assigned cheat through the existing event API.
- The server independently validates event order, values, timing window, assigned cheat, and applied effect. The client cannot award itself a success.
- The original trigger definitions remain supported for compatibility and test coverage, but are not exposed as service controls in the main UI.
- Every generated assistance effect provides at least 1.2 seconds of wall-clock reaction time between displayed `9.40` and `10.00`; tolerance assistance also visibly slows the final zone instead of changing only the hidden judgment window.

## Visual tokens

### Color

- Sky: `#dff4ff` — page canvas
- Paper: `#fffdf7` — timer and drawer surface
- Navy: `#20243f` — timer digits and primary text
- Coral: `#ff735d` — primary action
- Butter: `#ffd96a` — playful accent
- Mint: `#9be8ca` — success/support accent
- Lilac: `#cfc3ff` — secondary decorative accent

Text and controls meet WCAG AA contrast. Meaning never depends on color alone.

### Type and hierarchy

- Time digits use tabular numerals and the largest responsive type on the page.
- Headings use a friendly, substantial sans serif rather than sci-fi or terminal styling.
- Body copy is short and conversational in both languages.
- No status rail, UTC label, operator identity, experiment numbering, or diagnostics appear.

### Shape and motion

- Large rounded timer card and pill-like primary control.
- Decorative shapes are few, soft, and asymmetrical.
- Each anomaly uses one restrained family-specific motion; solved anomalies become a clear active badge rather than a disabled fake button.
- Success feedback is short and celebratory; ordinary transitions remain quiet.
- With reduced motion enabled, transforms and repeated motion are removed while state remains clear.

## Responsive and accessibility acceptance

- At `360x800`, the challenge, timer, primary action, and anomaly fit without horizontal scrolling.
- At desktop widths, the game remains centered instead of expanding into a dashboard.
- All controls have visible focus, accessible names, and at least a practical touch target.
- The primary game is keyboard operable.
- Gesture discovery has keyboard equivalents and textual next-step feedback.
- Status changes are announced without forcing focus.
- English and Simplified Chinese fit without truncating the core action.
