# Local verification

Verified on 2026-10-18 on `feature/circular-timer`. This records local checks only. The site has not been deployed.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run validate:content` | Passed: 300 reviewed questions |
| `npm test` | Passed: 93 tests across 18 files |
| `npm run test:browser -- --workers=1 --reporter=line` | Passed: 38 desktop and mobile browser tests |
| `npm run build` | Passed; generated 300 client questions. Local Barlow fonts and optimized WebP graphics are included. |

`npm run build` runs the content projection and TypeScript checks before Vite. The generated client content omits editorial sources and image provenance. Browser checks cover the full ten-question session, feedback and review, date rollover at UTC-3, local storage recovery, and cross-tab conflicts.

## Interface restoration

The approved arena composition and brand artwork now appear in the live interface. Supplied wrestler portraits, belts, and edition-appropriate PPV logos accompany questions and feedback. The game keeps keyboard focus after an answer changes, supports returning home without clearing progress, and removes a failed portrait instead of leaving a broken-image placeholder. Fonts are served locally. Initial loading requests the background and brand, not the whole wrestler collection.

Browser tests save desktop and 375px mobile screenshots of Home, main event, champion entering, ordering, matching, feedback, partial feedback, results, and review under `test-results/`. These were visually inspected against the approved mockups. Representative captures are preserved in `interface-review/`.

The question screen now uses lighter text rows instead of heavy option borders. Matching can start in either column, announces the current selection, numbers both ends of each connection, and supports removing individual pairs. Escape cancels an active selection; arrow keys move toward the other column. Ordering provides a brief next-step instruction. Feedback styling is unchanged.

## Question timer and speed bonus

The timer adds up to 25% of earned base points. Full-bonus windows are 10 seconds for choice and 15 seconds for ordering and matching, declining linearly to zero at 25, 45, and 60 seconds. There is no response deadline. Partial matching credit receives a proportional bonus. The question screen shows elapsed time and the available bonus; feedback adds a compact base/bonus breakdown without changing the answer layout.

The approved circular-timer mock is now implemented: a near-opaque midnight-blue status panel groups the nickname, score, ten progress segments, and a red circular clock. Elapsed time sits above the bonus percentage inside the circle. Its outer ring decreases with the available bonus, reaching zero without ending the question. The circle is 112px on desktop and 90px on mobile. No preview-only controls are included in the game.

Tests cover threshold rounding, late answers, frozen confirmation, reload persistence, legacy untimed progress, malformed saved timings, loading delays, and longer ordering/matching windows. Existing tests also verify keyboard focus and cross-tab conflicts. Desktop and mobile timer screenshots are saved under `test-results/`; the mobile question and feedback captures were visually inspected.

## Remaining limits

- Historical correctness remains an editorial responsibility; tests cannot prove that a cited source is accurate. Known archive discrepancies are listed in `content-review.md`.
- All supplied images have unknown reuse rights. Public release needs rights review.
- Progress is browser-local. There is no database, cross-device profile, shared ranking, or server-enforced daily limit.
- This change is a local implementation checkpoint, not a public release.
