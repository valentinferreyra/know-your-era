# Local verification

Verified on 2026-10-13 in the `feature/first-playable` worktree. This records local checks only. The site has not been deployed.

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run validate:content` | Passed: 300 reviewed questions |
| `npm test` | Passed: 73 tests across 16 files |
| `npm run test:browser -- --workers=1 --reporter=line` | Passed: 24 desktop and mobile browser tests |
| `npm run build` | Passed; generated 300 client questions. Vite output: 280.00 kB JavaScript (35.57 kB gzip), 11.50 kB CSS (3.58 kB gzip) |

`npm run build` runs the content projection and TypeScript checks before Vite. The generated client content omits editorial sources and image provenance. Browser checks cover the full ten-question session, feedback and review, date rollover at UTC-3, local storage recovery, and cross-tab conflicts.

## Remaining limits

- Historical correctness remains an editorial responsibility; tests cannot prove that a cited source is accurate. Known archive discrepancies are listed in `content-review.md`.
- All supplied images have unknown reuse rights. Public release needs rights review.
- Progress is browser-local. There is no database, cross-device profile, shared ranking, or server-enforced daily limit.
- This change is a local implementation checkpoint, not a public release.
