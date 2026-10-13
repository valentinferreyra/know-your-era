# Know Your Era Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Do not start execution until the owner reviews this plan and selects a method. Do not delegate unless the owner explicitly selects delegation.

**Goal:** Build the approved English-language daily wrestling trivia website with 300 reviewed questions, four interactions, adaptive difficulty, local progress, and responsive layouts.

**Architecture:** A static TypeScript application separates reviewed content, pure game rules, browser storage, and screen rendering. Source evidence stays in editorial files; the client receives a validated projection without source metadata. Sessions snapshot their content so reloads and deployments cannot change an active game.

**Tech Stack:** TypeScript, Vite, HTML, CSS, SVG matching connectors, Vitest, and Playwright. Use an available supported Node LTS runtime. Resolve compatible package versions from official documentation at execution time and commit the package lock; do not assume versions from this plan.

**Spec:** `docs/superpowers/specs/2026-10-13-know-your-era-design.md`

## Global constraints

- First playable release requires 300 distinct reviewed questions: twenty per category and difficulty. No smaller bank satisfies acceptance.
- Internal scope is main PPV broadcasts from WrestleMania XIV through Vengeance 2004, inclusive. No weekly television, dark, or Heat matches.
- Five categories, ten daily questions, two per category, three closed-ended interactions, and no timer.
- Fixed midnight UTC-3 renewal; every new session starts easy.
- Easy 100 points, medium 150, hard 200; matching alone receives proportional credit rounded down.
- Two consecutive fully correct answers raise the level; two consecutive zero-credit answers lower it; partial matching resets both streaks without changing level.
- UK questions require slots eight through ten, hard level, and two immediately preceding hard fully correct answers.
- English UI and documentation. No WWF prose, public historical-range subtitle, or source labels in UI. Historical image logos may remain.
- Every submission button says `Confirm`. Feedback says `Next question`, with `View results` after question ten.
- No accounts, database, public leaderboard, runtime AI grading, public deployment, or remote push without separate authorization.
- Original assets remain unchanged. Preserve the approved centered design, black fades, and portrait-free homepage.

## Review focus

1. Storage denial or quota exhaustion must permit an in-memory game with an honest warning. Test in Task 10 and Task 13.
2. Reload after Confirm, repeated clicks, and two open tabs must not award points twice or silently overwrite a later saved state. Test in Task 10 and Task 13.
3. An app/content update during a game must preserve the old session's remaining questions and answers. Test in Task 10.
4. A deterministic greedy choice can exhaust a later slot through conflict exclusions. Reserve a valid continuation rather than relax hard constraints. Test in Task 9.
5. Unequal card heights, mobile layout, keyboard navigation, or reduced motion must not break matching connections or prevent answers. Test in Task 12 and Task 13.

## File responsibilities

| Path | Responsibility |
| --- | --- |
| `content/events.json`, `content/sources.json`, `content/facts.json` | Historical scope, evidence, and verified facts |
| `content/questions/{main-event,order-history,champion-entering,odd-one-out,rebuild-card}.json` | Five reviewed 60-record banks |
| `content/assets.json` | Asset origin, permissions, dimensions, suitability, and web paths |
| `src/content/types.ts`, `src/content/validate.ts`, `src/content/project.ts` | Typed records, structural validation, and safe client projection |
| `src/game/{types,grade,difficulty,day,select,session}.ts` | Deterministic game rules and state transitions |
| `src/storage.ts` | Versioned storage, snapshot recovery, and concurrent-tab checks |
| `src/ui/{home,question,feedback,results,review}.ts` | Screen-specific DOM rendering |
| `src/ui/interactions/{choice,matching,ordering}.ts` | Three closed-ended answer controls |
| `src/ui/{dom,connectors}.ts`, `src/styles.css`, `src/main.ts` | Safe DOM helpers, SVG geometry, shared styling, application coordination |
| `scripts/{validate-content,build-client-content}.ts` | Editorial release gate and client projection generation |
| `public/assets/`, `docs/design-references/` | Selected optimized assets and mockup references |
| `tests/content/`, `tests/game/`, `tests/storage.test.ts`, `tests/browser/` | Automated verification |

Use stable string IDs for questions, options, facts, events, and assets. Category values are `main-event`, `order-history`, `champion-entering`, `odd-one-out`, `rebuild-card`. Difficulty values are `easy`, `medium`, `hard`; interaction values are `choice`, `ordering`, `matching`.

## Task 1 Content contracts and validation

**Files:** Create `package.json`, `package-lock.json`, `.gitignore`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/content/types.ts`, `src/content/validate.ts`, `src/content/project.ts`, `scripts/validate-content.ts`, `scripts/build-client-content.ts`, `tests/content/validate.test.ts`, `tests/content/project.test.ts`, `tests/fixtures/content.ts`.

**Interfaces:** Define `Category`, `Difficulty`, `QuestionKind`, `EventRecord`, `SourceRecord`, `FactRecord`, `AssetRecord`, `EditorialQuestion`, `ClientQuestion`, `ContentBundle`, and `ClientContent`. `ClientContent` contains `version: string` and `questions: ClientQuestion[]`. Questions are discriminated by `kind`; their payload contains exactly four choice options, ordered item IDs, or left/right items and canonical pair IDs. Shared fields include `id`, `familyId`, `conflictGroups`, `category`, `difficulty`, `prompt`, `explanation`, `eventIds`, `factIds`, optional asset IDs, `ukOnly`, and `reviewStatus`. Editorial records additionally reference source IDs and review evidence.

Produce `validateBundle(bundle: ContentBundle, requireReleaseCounts: boolean): string[]` and `toClientQuestions(bundle: ContentBundle): ClientQuestion[]`. Ordering facts carry dates and optional verified broadcast positions internally, but client prompt entries do not expose chronology keys. `ukOnly` is derived or checked against event scope, never trusted without validation.

- [ ] Write failing tests `rejectsDuplicateIds`, `rejectsAmbiguousChoice`, `rejectsMissingFacts`, `rejectsOutOfScopeEvents`, `rejectsInvalidOrdering`, `rejectsInvalidPairCount`, and `omitsEditorialSourcesFromClient` using synthetic fixtures, not invented historical questions.
- [ ] Create only the configuration needed to run `npm test -- tests/content`; confirm failures are due to missing validation/projection behavior, not a broken test runner.
- [ ] Implement the contracts, validation, and projection. Reject invalid category/kind combinations, contradictory image years, duplicate normalized option labels, missing canonical IDs, and unevidenced reviewed status. Release validation requires exactly 300 records and twenty per category/difficulty.
- [ ] Run `npm test -- tests/content` and `npm run typecheck`; require zero failures. Expose `npm run validate:content` as the strict release-count check and `npm run content:build` as the source-free projection step. A partially authored bank can be validated explicitly without release counts, never passed off as release-ready.
- [ ] Commit `feat: add reviewed content contracts and validation`.

## Task 2 Historical catalog and evidence ledger

**Files:** Create `content/events.json`, `content/sources.json`, `content/facts.json`, `docs/content-review.md`, `tests/content/evidence.test.ts`; update `src/content/validate.ts` if required by evidence checks.

**Interfaces:** Event records identify exact edition, historical date, brand context, main-broadcast scope, and UK-event status. Facts record a statement, participating IDs, event ID, evidence IDs, and chronology position where needed. Sources record URL, title, inspected date, and the supporting passage/section locator. `reviewStatus: reviewed` requires inspected supporting evidence, not only a search snippet.

- [ ] Write failing tests `requiresMainBroadcastScope`, `rejectsUnverifiedSequence`, and `requiresSupportingEvidenceForReviewedFacts` with minimal fixtures.
- [ ] Run `npm test -- tests/content/evidence.test.ts`; confirm the intended red state.
- [ ] Read primary official event results and title histories, then relevant broadcast/contemporary reports for segments. Catalog the eligible PPVs and record facts to support the bank. Check UK events too, without forcing them into every advanced pool. Do not assign disputed facts reviewed status; replace an uncertain question or ask the owner when a remembered broadcast detail matters.
- [ ] Verify the evidence tests pass and inspect dates, duplicate event editions, the cutoff, and incident-versus-revelation records. Record review criteria in English, including names, first reigns, main events, broadcast order, and image spoilers.
- [ ] Commit `docs: catalog eligible events and question evidence`.

## Tasks 3 through 7 Author the five reviewed banks

These are five separate, reviewable tasks. Each task produces sixty independently reviewed questions, twenty at each difficulty. Main event and Champion entering use four-option choice questions only. No new IDs or display permutations can turn the same fact into an independent question. Shared facts receive conflict groups across categories.

| Task | Content file | Test file | Main coverage |
| --- | --- | --- | --- |
| 3 | `content/questions/main-event.json` | `tests/content/main-event.test.ts` | Closing-match participants, recognizable event variety |
| 4 | `content/questions/order-history.json` | `tests/content/order-history.test.ts` | PPV story moments and title wins; years, months, weeks, and explicit within-show sequences |
| 5 | `content/questions/champion-entering.json` | `tests/content/champion-entering.test.ts` | Men's, women's, team, and secondary champions arriving at events |
| 6 | `content/questions/odd-one-out.json` | `tests/content/odd-one-out.test.ts` | Precise match/card/faction participation, with three belonging and one not |
| 7 | `content/questions/rebuild-card.json` | `tests/content/rebuild-card.test.ts` | Two/three/four distinct pairs; opponents and unambiguous stipulation pairings |

**Interfaces:** Consume Task 1 contracts and Task 2 evidence IDs. Produce arrays of `EditorialQuestion` records that project to `ClientQuestion[]`. Update the ledger as new evidence is read. Questions may have no image.

For **each** task:

- [ ] Add a test named `hasSixtyReviewedQuestionsInThreeBalancedTiers` asserting count 60, each tier count 20, valid kind/category, unique IDs/families, and verified evidence. Add the relevant factual-structure test: `mainEventIsClosingBroadcastMatch`, `orderingHasNoUnannouncedTies`, `championIsHolderBeforeMatch`, `exactlyOneOptionDoesNotBelong`, or `eachPairHasOneUnambiguousPartner`.
- [ ] Run `npm test -- tests/content/<category>.test.ts`; expect the count/review assertions to fail before authoring.
- [ ] Author twenty easy, twenty medium, and twenty hard records for that category, with inspected evidence, correct aliases/options, short English explanations, safe optional asset assignments, and cross-category conflict groups. Review each answer against the evidence. Do not create one bank concentrated on a single year or event family, or make hard mean obscure trivia.
- [ ] Run its tests and non-release bundle validation. Independently reread the evidence for each answer, record the review result, and remove/rewrite ambiguous records. Chronology keys must correspond to the actual statements; card matching must not pretend multi-person bouts are singles matches.
- [ ] Commit that category with `content: add reviewed <category> questions`.

After Task 7, run `npm run validate:content` and require 300 reviewed records, twenty in all fifteen category/tier cells. Inspect the whole bank for repeated facts disguised as variants and questions that reveal each other. Structural tests are not a substitute for historical review.

## Task 8 Grading scoring and adaptive state

**Files:** Create `src/game/types.ts`, `src/game/grade.ts`, `src/game/difficulty.ts`, `tests/game/grade.test.ts`, `tests/game/difficulty.test.ts`.

**Interfaces:** Define `DraftAnswer` as a discriminated choice ID, ordered IDs, or pair-ID map. Define `Grade` with `fullyCorrect`, `earnedPoints`, `maximumPoints`, `correctParts`, `totalParts`, and per-part corrections. Define `DifficultyState` with `level`, `correctStreak`, and `zeroStreak`. Produce `gradeAnswer(question: ClientQuestion, answer: DraftAnswer): Grade` and `advanceDifficulty(state: DifficultyState, grade: Grade): DifficultyState`.

- [ ] Write failing tests asserting easy correct earns 100, medium 2/3 matching earns 100, hard 3/4 earns 150, mismatched/duplicate IDs are rejected, and wrong ordering earns zero. Adaptation tests assert two wins raise one level, two zeros lower one, partial credit resets streaks, and levels are bounded.
- [ ] Run `npm test -- tests/game/grade.test.ts tests/game/difficulty.test.ts`; require intended red failures.
- [ ] Implement deterministic grading and adaptation using the approved values, not browser DOM state. Keep structural invalidity separate from a valid but incorrect answer. Represent the expected answer and corrections explicitly for feedback.
- [ ] Run the same tests and `npm run typecheck`; require pass. Exercise partial credit at easy two pairs, medium three pairs, and hard four pairs with floor rounding.
- [ ] Commit `feat: grade answers and adapt difficulty`.

## Task 9 Daily schedule and eligible question selection

**Files:** Create `src/game/day.ts`, `src/game/select.ts`, `tests/game/day.test.ts`, `tests/game/select.test.ts`, `tests/content/reachability.test.ts`.

**Interfaces:** Produce `dailyKey(now: Date): string`, `makeDailySlots(dayKey: string, contentVersion: string): Slot[]`, and `selectQuestion(pool: ClientQuestion[], request: SelectionRequest): SelectedQuestion`. Define `Slot` with category/kind and `SelectedQuestion` with question and frozen display orders. SelectionRequest includes seed inputs, slot index, current level, used families/conflict groups, recent history, and prior graded difficulties.

- [ ] Write failing tests: `changesDayAt0300UTC` asserts 02:59:59Z and 03:00:00Z belong to different UTC-3 dates; `usesTwoSlotsPerCategory`; `usesAllFourInteractions`; `isStableForSamePath`; `excludesConflicts`; `relaxesOnlyRecentHistory`; `gatesUKAtSlotsEightThroughTen`; `preservesAValidContinuation`.
- [ ] Run `npm test -- tests/game/day.test.ts tests/game/select.test.ts`; confirm the intended failures.
- [ ] Implement a seeded slot shuffle with no adjacent same-category slots where feasible, deterministic candidate ranking, a fourteen-session recency preference, and bounded lookahead for remaining category/kind slots across possible levels. Hard exclusions never relax. Check previous two hard full successes directly for UK eligibility. Throw a descriptive content-pool error instead of returning an invalid question.
- [ ] Run the tests, then reachability checks on the full bank over multiple dates and exhaustive distinct adaptive level histories reachable over ten questions. Add an adversarial synthetic pool where the first ranked candidate blocks a later slot and assert a viable alternative is chosen. Build-time validation must reject a bank that cannot sustain the schedule.
- [ ] Commit `feat: select stable adaptive daily challenges`.

## Task 10 Session transitions and persistent progress

**Files:** Create `src/game/session.ts`, `src/storage.ts`, `tests/game/session.test.ts`, `tests/storage.test.ts`.

**Interfaces:** Define `Session` with version, revision, day key, content version, nickname, content snapshot, slots, selected questions/display orders, drafts, committed responses, score, difficulty state, and phase. Produce `startSession(nickname: string, now: Date, content: ClientContent): Session`, `setDraft(session: Session, draft: DraftAnswer): Session`, `confirmAnswer(session: Session): Session`, and `nextQuestion(session: Session): Session`. Phases are question, feedback, complete, and incomplete. `confirmAnswer` is idempotent after a commit.

Storage exposes `loadProgress(storage: StorageLike): LoadResult` and `saveProgress(storage: StorageLike, progress: SavedProgress, expectedRevision: number): SaveResult`. Results distinguish success, unavailable storage, corrupt state, and a newer saved revision. A coordinator uses storage events and reload checks to detect another tab before overwriting. Browser local storage does not provide a server-grade transaction guarantee; simultaneous racing writes remain a documented limitation.

- [ ] Write failing tests for reload in every phase, score recomputation, repeated Confirm, duplicate submitted IDs, content snapshot after a deploy, nickname changes without another attempt, completed reviews without credit, denied/quota-full storage, corrupt JSON, newer revisions, and midnight continuation/explicit abandonment.
- [ ] Run `npm test -- tests/game/session.test.ts tests/storage.test.ts`; verify the intended red state.
- [ ] Implement pure transitions and versioned browser storage. Save selection/draft/confirmation before presenting the next screen. Render nickname as text. Validate loaded snapshot/state and recompute score. Use in-memory progress with a visible warning when saving fails; ask before replacing corrupt state. Detect stale tabs and request reloading the newer state rather than silently overwriting it. Preserve an old session across midnight until completed or explicitly closed.
- [ ] Run the tests and typecheck. Verify an older snapshot remains playable even when current content removes those IDs. Do not start another same-day session just because the nickname changed or Home was revisited.
- [ ] Commit `feat: persist daily sessions safely`.

## Task 11 Selected web assets and reference preservation

**Files:** Create `content/assets.json`, `public/assets/`, `docs/design-references/`, `docs/assets.md`, `tests/content/assets.test.ts`; update content asset IDs where appropriate.

**Interfaces:** Asset records map stable IDs to web paths, type, dimensions, alt text, provenance, permission status, event-family use, visible edition markers, and suitability. Each question's prompt/answer asset references are optional. No renderer relies on the owner's Desktop path.

- [ ] Write failing tests `assetPathsExist`, `promptAssetsDoNotRevealAnswers`, and `contradictoryEditionNeedsOverride` using fixture records; the spoiler test checks explicit reviewed flags, with human inspection still required.
- [ ] Run `npm test -- tests/content/assets.test.ts`; verify missing/unreviewed assets fail as expected.
- [ ] Inspect the supplied collection and preserve originals. Copy the approved mockups into documentation with a mapping of their screen roles and later copy overrides. Prepare selected lightweight images and transparent logos; remove solid backgrounds with the image-generation editing workflow when necessary. Use CSS gradients for fades. If extracting an arena-only decorative background from a generated mockup, label it as a decorative composite, never historical evidence. Use actual photographs for answers. Record uncertain reuse rights and do not claim clearance.
- [ ] Verify dimensions, alpha where needed, no UI text baked into the arena background, no answer-revealing prompt photo, and no cropped/distorted logo. Run asset tests and strict content validation again.
- [ ] Commit `assets: prepare reviewed web imagery and design references`.

## Task 12 Responsive website and three answer controls

**Files:** Create `src/main.ts`, `src/styles.css`, `src/ui/dom.ts`, `src/ui/connectors.ts`, `src/ui/{home,question,feedback,results,review}.ts`, `src/ui/interactions/{choice,matching,ordering}.ts`, `tests/browser/interactions.spec.ts`, `playwright.config.ts`; update `index.html` and npm scripts.

**Interfaces:** Implement `renderChoice`, `renderMatching`, and `renderOrdering`, each with signature `(question: ClientQuestion, draft: DraftAnswer | undefined, onChange: (draft: DraftAnswer) => void): HTMLElement`. Define `QuestionActions` with `onDraft(draft: DraftAnswer): void` and `onConfirm(): void`. `renderQuestion(session: Session, actions: QuestionActions): HTMLElement` hosts the interaction and Confirm. Other renderers consume Session and callbacks for Home, Continue, Next question, View results, and read-only review. `updateConnectors(container: HTMLElement, pairs: Record<string, string>): void` derives line endpoints from element bounds.

- [ ] Write failing browser tests for selecting/changing choices, matching by two clicks and keyboard without dragging, replacing an existing pairing, ordering/undo/reset, no manual-answer inputs, disabled incomplete Confirm, partial correction rows, and absent-image compact layout.
- [ ] Run `npm run test:browser -- tests/browser/interactions.spec.ts`; expect missing-screen/control failures after the test harness can launch the app.
- [ ] Implement screen renderers and the state coordinator. Use semantic buttons/labels and textContent for player data. Home has no portraits. Images/logos are optional, with a source-free client bundle. Exactly ten progress segments; event years only where relevant. Matching SVG lines use local coordinates and update after resize/font/image changes; provide textual pairing information too. Show status labels/icons instead of color alone, visible focus, reduced-motion support, and generous touch targets. Use only Confirm for submitting all interactions.
- [ ] Run browser tests at desktop and mobile widths, keyboard-only paths, long names/options, missing images, unequal card heights, and reduced motion. Verify no horizontal overflow and no lost matching endpoints. Capture and visually inspect Home, all three interactions, correct/incorrect/partial feedback, results, and review against the approved references.
- [ ] Commit `feat: build responsive trivia screens and interactions`.

## Task 13 Whole game acceptance and local handoff

**Files:** Create `tests/browser/daily-game.spec.ts`, `tests/browser/resilience.spec.ts`, `README.md`, `docs/verification.md`; update preceding files only to repair acceptance failures.

**Interfaces:** Use the completed app through browser UI. README documents setup, test commands, local storage limitations, editorial review, and no database requirement. Verification records actual command outputs and remaining issues, not predicted success.

- [ ] Write failing acceptance tests for a full ten-question game with all interactions, immediate feedback, partial matching, review without credit, next-day easy reset at UTC-3, old-day continuation, storage denial, stale second tabs, corrupt storage recovery, and reload after Confirm. Include UI assertions that no source labels, WWF prose, scope subtitle, or wrong submission label appears.
- [ ] Run `npm run test:browser -- tests/browser/daily-game.spec.ts tests/browser/resilience.spec.ts`; isolate and fix any failures with red/green tests.
- [ ] Run `npm run validate:content`, `npm run content:build`, `npm run typecheck`, `npm test`, `npm run test:browser`, and `npm run build`. Require all commands to exit zero, 300 reviewed records, all fifteen count cells equal twenty, and no editorial sources in the generated client content. Inspect build asset paths and size; do not import every original image at startup.
- [ ] Visually verify the production build in a local browser on desktop and mobile, including layouts without images. Review the complete diff and the historical evidence ledger. A bank with unchecked answers is not complete even if tests pass. Report unverified photo rights as a publication constraint. Open the local result for the owner; do not publish or push without authorization.
- [ ] Commit `test: verify full daily game and document local handoff` only after the fresh verification succeeds. Report actual completion status and any remaining failures.

## Plan review and execution

This is a plan, not an executed implementation. The repository currently contains documentation only. A 300-question bank is an acceptance requirement, not a completed deliverable.

Recommend native execution in this session because the game-rule interfaces, editorial ledger, and asset decisions need consistent ownership across the thirteen tasks. The owner may instead choose subagent-driven implementation and reviews. Either method must preserve the same review and release gates. Ask the owner to review this plan and select the execution method before starting Task 1.
