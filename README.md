# Know Your Era

A fan-made daily wrestling-history quiz. Each UTC-3 day has ten questions across five categories. Answers use multiple choice, ordering, or matching. Difficulty adapts to the player's answers.

## Run locally

Requirements: Node.js 24 or later and npm.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. To build the static site, run `npm run build`.

## Checks

```sh
npm test
npm run test:browser
npm run typecheck
npm run validate:content
npm run build
```

The reviewed question bank lives in `content/questions/`; source facts, events, references, and image records live in `content/`. `npm run content:build` creates the client-safe question and asset files. It omits source and rights metadata.

## Progress and accounts

The first version stores a nickname, daily progress, and recent question history in that browser's local storage. There are no accounts, database, shared leaderboard, or server-side daily limit. Clearing browser data or switching browsers/devices starts without that local history. Question answers are included in the static client, so this version is not designed to prevent inspection or cheating.

## Editorial and image notes

Automated checks validate structure and source links, not historical truth. The editorial notes in `docs/content-review.md` describe known result-page discrepancies and the review rules. Image reuse rights are unconfirmed for every supplied image. Do not publish the assets publicly until their rights are cleared.
