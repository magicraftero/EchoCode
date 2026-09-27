# EchoCode Dashboard

Read-only investigation dashboard for the EchoCode pipeline.

## Quick Start

Serve from the repo root with any HTTP server:

```bash
python -m http.server 8080
```

Then open: http://localhost:8080/dashboard/

> The dashboard must be served over HTTP. `file://` URLs block the `fetch()` of `report.json`.

## Data Source

All data is read at runtime from `artifacts/final-run/report.json`. Every finding, commit SHA, test outcome, status and count on the page comes from the report. Hard-coded text is limited to headings, plain-language explanations and presentational labels.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Shell: fonts, loader, scripts |
| `style.css` | Theme tokens, components, motion |
| `dashboard.js` | Fetches `report.json`, builds every section, wires up interactions |
| `globe.js` | Hero globe canvas (dot-matrix planet, echo arc). Labels are passed in from `dashboard.js` |

## Page Structure

The hero stays pinned while the rest of the page slides over it as a rounded sheet. The colour theme (black / light grey / white) morphs as each section reaches the viewport, so there are no divider lines.

| Section | ID | What judges see | Data used |
|---------|----|-----------------|-----------|
| Hero | `#hero` | One-sentence summary, globe linking the historical case to the current finding | Finding ID/status, fix and repair SHAs |
| How it works | `#how` | Learn → Spot → Prove, in plain language | Historical row counts, matched conditions, test outcomes |
| Result | `#result` | Centred before/after panels: 2 rows → 1 row with the actual row pills, test pass/fail pills, evidence trail | `evidence` fail/pass runs, `verification_results`, `evidence_chain` |
| Replay | `#replay` | Six stage cards lit by a typed replay of the evidence chain | `evidence_chain`, `commit_registry` |
| Pattern | `#pattern` | Payment vs refund side by side, learned pattern, reach grid | `learned_failure_pattern`, `historical_case` |
| Finding | `#finding` | Lifecycle (candidate → confirmed → verified), code line map, reasoning | `status_history`, `structural_evidence`, `matching_conditions` |
| Tests | `#tests` | Before/after cards with an animated retry simulation and the real failing assertion | Recorded row counts, `failing_assertion`, suite outcomes |
| Proof | `#proof` | Commit carousel that pins and scrolls sideways as you scroll down (native swipe on phones), filter chips, expandable evidence chain | `commit_registry`, `evidence_chain` |
| Limits | `#limits` | Prototype boundaries | `limitations` |

## Design

- **Layout and type:** Apple-style: large bold headlines, generous spacing, alternating black, `#f5f5f7` and white sections, and rounded 28px cards.
- **Colour:** Google's palette for status tones (blue observed, yellow candidate, purple confirmed, green verified, red failure), with Material light and dark values for each theme.
- **Controls:** Google Material 3 filled, tonal, outlined and text buttons with ripple; filter chips; outlined icon buttons.
- **Navigation:** a floating translucent icon dock. Hovering an icon expands its label, and the dock moves to the bottom on phones.
- **Motion:**
  - Headlines enter word by word and sections blur-fade in with stagger.
  - Cards lift on hover with a cursor-following border light, and the "How it works" cards tilt.
  - Orbs and chips drift with parallax, and a statement lights up word by word as you scroll.
  - Numbers count up, and the replay and simulations animate.

Keyboard: `1`–`9` jump to sections, `R` restarts the replay. Under `prefers-reduced-motion` all motion is disabled, and the replay and simulations render their final state immediately.
