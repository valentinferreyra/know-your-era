# Know Your Era first playable version

Know Your Era is an English-language wrestling trivia website for fans who remember the matches and stories. A daily game contains ten questions, starts easy, adapts to the player's answers, and explains each solution before continuing. The first version runs without accounts, a database, or a public leaderboard.

Status: ready for owner review, not approved for implementation. The visual direction and game scope follow the conversation. The exact scoring, adaptation, question scheduling, and technical choices below are proposals for this review.

## Product boundaries

- The internal question scope includes every main WWF/WWE PPV broadcast from WrestleMania XIV through Vengeance 2004, inclusive, including Insurrextion and Rebellion.
- Matches and story moments during those broadcasts are eligible. Weekly television, dark matches, and Heat matches are excluded.
- Rebellion and Insurrextion are advanced material only, with additional eligibility rules below. They are never required in a game.
- The interface does not advertise the historical range. Event years can appear where a question needs them.
- Interface text uses WWE, not WWF. Original historical logos and photographs may retain WWF branding. Internal historical records preserve the original terminology for accuracy.
- All interface copy, questions, explanations, code names, and repository documentation are in English. Owner discussions can remain in Spanish.
- There is no question timer, speed bonus, runtime AI question generation, login, shared ranking, or server-side score enforcement.

## Visual direction and screens

Use a black page canvas, blue-lit wrestling arena atmosphere, white condensed headings, readable body text, and red primary buttons. The main content is centered with a maximum width around 960 pixels and comfortable vertical gaps. Soft black gradients blend the arena into the page above and below. Text and controls remain sharp. On small screens the content fits the viewport without horizontal scrolling.

The homepage has the Know Your Era title, the line "10 questions. A new challenge every day.", a labeled name field, and "Play daily challenge". No wrestler portraits appear on the homepage. Returning players see "Continue challenge" or "Review answers", as appropriate. A small "Fan-made · Unofficial" notice remains visible.

Question screens show the nickname, question position, score, and exactly ten progress segments. The main area includes category, difficulty, event identity when relevant, the prompt, and the interaction. The submission button is always labeled "Confirm". It remains disabled until the response is complete.

Answer screens immediately show the correct solution, the submitted answer, awarded points, and a brief explanation. A wrong answer earns a calm "Incorrect" state rather than punitive messaging. Matching questions can show "2 of 4 correct" with each pairing explained. Feedback uses labels and icons as well as color. The continuation button is "Next question"; after question ten it is "View results". Sources never appear in the player interface.

The completion screen shows total score, fully correct questions, and accuracy, plus "Review answers" and "Back to home". Its renewal message is "A new challenge arrives at midnight (UTC-3)." A belt can be a decorative element, not a new reward system. Review mode displays submitted responses and explanations without awarding points again.

Generated mockups are visual references, not application screenshots. Their incidental mistakes, such as extra progress segments, are not requirements.

## Categories and interactions

Categories describe the knowledge being tested. Interaction types describe how the response is entered.

| Category | Knowledge | Supported interactions |
| --- | --- | --- |
| Main event | Participants in the main event | Choice, text completion |
| Order the history | Sequence of matches, title wins, returns, betrayals, and other PPV moments | Ordering |
| Champion entering | Who arrived holding a specified championship | Choice, text completion |
| Odd one out | Which participant does not belong to a precisely defined group | Choice |
| Rebuild the card | Opponent pairings or matches and stipulations | Matching |

"Who won more?" is excluded. Prompts can use the familiar term "main event"; internal records must still identify the closing main-broadcast match consistently.

### Multiple choice

Provide four plausible options with stable IDs and shuffled display order. Allow changing a selection until Confirm. Only one option is correct. Distractors must not create an alternate defensible answer.

### Matching

Use two columns with two pairs at easy difficulty, three at medium, and four at hard. A player selects a left item and then a right item; the website draws a connection. Every item has exactly one partner. Selecting a connected item allows replacement or removal, and Reset clears the draft. Do not require dragging. All operations work with keyboard and touch.

The input draft stores stable item IDs, not row positions. The right column is shuffled. Confirm becomes available only after all items are paired. The entire matching set consumes one question slot. Review uses a readable list of correct and incorrect pairings rather than relying on crossed lines.

### Text completion

Use one labeled input embedded in or beside a short sentence with one missing answer. A single typing field is preferred over separate inputs per letter. Normalize case, surrounding whitespace, repeated spaces, and common punctuation. Accept only the explicit aliases reviewed for that question. Do not use broad fuzzy matching or answer-revealing autocomplete. Wrong spelling that is not a reviewed alias is incorrect; feedback shows the expected name.

### Ordering

Present three events at easy and medium difficulty and four at hard. Selecting items assigns visible positions. Support undo, reset, and changing the draft without requiring dragging. Confirm requires a complete ordering.

Easy questions usually span years; medium questions can span months within a year; hard questions can span weeks or moments within one broadcast. Temporal distance is not the only measure of difficulty: events must remain recognizable.

Do not print dates that give away the ordering. Standard questions use distinct dates. Within-show questions explicitly say "Order these moments as they happened during the show." Their answers use verified broadcast sequence, not fabricated timestamps. A hit-and-run incident and the later revelation of its perpetrator are different records. A return appearance and a return to in-ring competition are also different records.

## Scoring and adaptive difficulty proposal

| Difficulty | Maximum points per question |
| --- | ---: |
| Easy | 100 |
| Medium | 150 |
| Hard | 200 |

Choice, completion, and ordering award the full value for a fully correct response and zero otherwise. Matching awards floor(maximum points × correct pairs / total pairs). There are no deductions or time bonuses. Incorrect and partial responses still receive the full explanation.

For the results screen, a question counts as correct only if the whole response is correct. Accuracy is fully correct questions divided by ten. Matching feedback separately reports pair-level success; partial points do not inflate the question-level accuracy.

Each new daily session starts at easy. Two consecutive fully correct answers raise the next question by one level. Two consecutive zero-credit answers lower it by one level. A matching response with some but not all pairs correct leaves the level unchanged and clears both streaks. A change of level also clears both streaks. Levels remain within easy, medium, and hard.

UK events may appear only in slots eight through ten, at hard difficulty, after the two immediately previous questions were both hard and fully correct. Meeting these conditions only permits a UK question; it does not force one. If none is eligible, choose another hard question.

## Daily selection and session lifecycle

The daily date is calculated in fixed UTC-3, independent of the device's local time zone or daylight-saving rules. The ten-question session belongs to that date and to a pinned content version.

Each daily schedule contains two slots per category, shuffled so the same category is not adjacent when possible. One Main event slot uses choice and the other completion; Champion entering follows the same pattern. Odd one out uses choice, Order the history uses ordering, and Rebuild the card uses matching. This guarantees all four interactions without tying the session to one event or year.

At each slot, choose an eligible reviewed question for the current category, interaction, and adaptive difficulty. Rank candidates deterministically using the daily date, content version, and slot. Persist the chosen question and display order immediately; reloading must not reroll a question.

The daily seed makes a given selection path reproducible, but adaptive level and local repeat history can produce different questions for different players. This is a personal challenge, not an identical worldwide competition.

Never repeat a question family or conflict group within a session. Conflict groups identify questions that reveal one another's answers. Favor questions not encountered in the previous fourteen daily sessions; if the bank is small, relax only this cross-day preference. Do not relax the historical cutoff, review status, UK gate, or within-session conflicts. Validate that the available pools can complete each category and interaction schedule.

Confirm commits the answer and score once. The committed feedback remains available after reload until Next question. Repeated Confirm clicks must not award points twice. The ten-question completion has no replay-for-points action.

An already-started session can finish after midnight using its pinned date and content version. After finishing, the homepage offers the new day's challenge. If a player leaves an older unfinished session for a new day's challenge, explicitly warn that the old session will close as incomplete. Opening the page after midnight must not silently discard progress. Completed reviews remain read-only.

## Local persistence and limitations

Store the nickname, active session, committed responses, current draft, difficulty state, score, pinned question IDs and display orders, and recent question history in versioned browser storage. Save a snapshot of the eligible content pools used by the active session, without editorial source metadata, so a deployment cannot change its answers or remove the records needed for later adaptive slots. Stored player content is always rendered as text.

Changing the nickname does not create another attempt. Clearing browser storage, using another browser, or altering the device clock can bypass the daily limit. Answers shipped with a static client are inspectable. These are accepted limitations, not anti-cheat claims.

If storage is unavailable or full, allow an in-memory game with a visible warning that progress cannot survive reload. Corrupt state must produce a recoverable explanation and reset option, not a crash. Restore only structurally valid state and recompute totals from committed answers.

A database and server become necessary for cross-device accounts, shared rankings, authoritative daily limits, or server-validated scores. None is required for the first playable version.

## Question bank and review

The first playable version requires 300 distinct reviewed questions: twenty per category and difficulty. There is no smaller question-bank release. Rephrasing the same fact or swapping distractors does not count as a new independent question. Main event and Champion entering pools must include both choice and completion records at every difficulty. The full bank must pass editorial and structural review before this version is considered ready to release; the bank has not yet been created.

Distribute the full bank across years, event families, men's and women's wrestling, teams, secondary championships, and PPV story segments. Avoid concentrating it on Austin, Rock, or WrestleMania. Lack of a photograph does not exclude a question.

Each record includes:

- Stable ID, family ID, and conflict-group IDs.
- Category, interaction type, difficulty, prompt, and short explanation.
- Event IDs, event year, broadcast scope, historical date, and sequence position when needed.
- Options, match pairs, ordering entries, or text-answer aliases, with stable IDs.
- Canonical answer and any separate reviewed display name.
- Optional prompt image, answer image, event logo, or championship image IDs.
- Internal verification references, review status, and UK eligibility metadata.

A reviewed record needs an unambiguous answer and checked provenance. Prefer official event results and title histories; use reliable contemporary reports or the broadcast for story segments and details official summaries omit. Resolve conflicting evidence before eligibility. The current sample references gathered in conversation must be checked again when converted into records.

Editorial references stay internal. Public client content omits source fields and internal review notes, even though answers remain inspectable in this initial static application. No runtime model decides whether a submitted answer is correct.

## Assets and event identity

The owner supplied images in `/Users/valentin/Desktop/know-your-era-images`. Preserve originals. Import selected copies into the repository only after asset review, with optimized web variants and recorded origin, permissions, dimensions, alt text, and historical suitability. A publicly accessible image does not establish reuse rights.

Generic event logos may represent any year of the event. Logos containing an explicit contradictory year or edition number need an adapted version or another asset. Event text supplies the actual question context. Modern wrestler appearances must not silently represent earlier historical moments.

Photos are optional. Use a relevant, non-revealing image, then an event logo or championship image, then text alone. A photo of the winner or both opponents usually belongs after confirmation. When imagery is absent, use a compact centered layout with no empty placeholder. Historical photographs must not be regenerated as fabricated evidence.

The approved homepage mockup is `exec-b4ea11ee-23c4-47b3-ab78-8e7be1455e0d.png` from the generated-image session. Other approved concepts cover choice, completion, matching, ordering, feedback, and results. Before implementation, copy selected references into repository documentation so no project depends on machine-specific generated-image paths. Final UI labels override older mockup wording: the answer-submission button is always Confirm.

## Technical approach proposal

Use a static TypeScript web application built with Vite, with HTML and CSS for the interface and SVG only for matching connectors. A lightweight component framework is not necessary for this first version. This avoids a backend and keeps question files independently editable. No product dependencies or application code are installed at this design stage.

Keep responsibilities separate: reviewed content and assets, pure selection/grading/scoring rules, browser storage, and screen rendering. Inject time and randomness into rule functions for deterministic tests. Use stable IDs throughout. The deployment produces static files; the hosting provider is selected separately, and this design does not authorize publication.

Use semantic controls, labeled inputs, visible keyboard focus, sufficient contrast, comfortable touch targets, and reduced-motion support. Matching lines never carry the only representation of a pairing. Avoid loading every full-size original photo at startup.

## Acceptance conditions

1. The app and repository documentation are in English; the UI contains no WWF prose, public scope range, or source labels.
2. Home has no wrestler cutouts and follows the centered, softly faded arena design.
3. A session contains exactly ten questions, two from each category, and all four interaction types.
4. Daily dates switch at midnight UTC-3; new sessions start easy; existing sessions do not lose progress silently.
5. Adaptive changes, partial matching credit, and UK eligibility follow the reviewed rules above.
6. Reload restores the same question, display order, draft, committed feedback, and score.
7. Confirm cannot award twice; completed reviews cannot earn points.
8. Within-session conflicts and repeated families are excluded. Pools with insufficient eligible content fail content validation before release.
9. All interactions work on desktop, mobile, and keyboard, including matching without dragging.
10. Questions and answers work with no images, with no empty placeholders.
11. The first playable version contains 300 distinct reviewed records, twenty per category and difficulty, with both choice and completion represented in the relevant pools. A smaller bank does not satisfy release acceptance.
12. Unit tests cover grading, aliases, score rounding, adaptation, selection, UK gates, and UTC-3 boundaries. Browser tests cover the four interactions, reload, midnight handling, review, and unavailable storage.

## Review decision

The owner requires the complete 300-question bank in the first playable version. Approve or revise the scoring values, partial-credit policy, adaptive thresholds, fixed daily category/interaction schedule, midnight continuation behavior, and static TypeScript approach before the implementation plan is written. No application code, deployment, or full question bank is part of this documentation step.
