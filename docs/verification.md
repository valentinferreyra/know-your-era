# Local verification

Verified on 2026-10-13 in the `feature/mockup-interface` worktree. This records local checks only. The site has not been deployed.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run validate:content` | Passed: 300 reviewed questions |
| `npm test` | Passed: 76 tests across 17 files |
| `npm run test:browser -- --workers=1 --reporter=line` | Passed: 28 desktop and mobile browser tests |
| `npm run build` | Passed; generated 300 client questions. Local Barlow fonts and optimized WebP graphics are included. |

`npm run build` runs the content projection and TypeScript checks before Vite. The generated client content omits editorial sources and image provenance. Browser checks cover the full ten-question session, feedback and review, date rollover at UTC-3, local storage recovery, and cross-tab conflicts.

## Interface restoration

The approved arena composition and brand artwork now appear in the live interface. Supplied wrestler portraits, belts, and edition-appropriate PPV logos accompany questions and feedback. The game keeps keyboard focus after an answer changes, supports returning home without clearing progress, and removes a failed portrait instead of leaving a broken-image placeholder. Fonts are served locally. Initial loading requests the background and brand, not the whole wrestler collection.

Browser tests save desktop and 375px mobile screenshots of Home, main event, champion entering, ordering, matching, feedback, partial feedback, results, and review under `test-results/`. These were visually inspected against the approved mockups. Representative captures are preserved in `interface-review/`.

## Remaining limits

- Historical correctness remains an editorial responsibility; tests cannot prove that a cited source is accurate. Known archive discrepancies are listed in `content-review.md`.
- All supplied images have unknown reuse rights. Public release needs rights review.
- Progress is browser-local. There is no database, cross-device profile, shared ranking, or server-enforced daily limit.
- This change is a local implementation checkpoint, not a public release.
