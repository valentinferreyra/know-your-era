# Image inventory

The original files in the owner's `know-your-era-images` folder remain unchanged. The initial selected copies retain their original encoding. The interface restoration adds WebP copies of 18 wrestler portraits, seven belts, and six event logos. These preserve the supplied image composition and transparency.

`src/ui/art.ts` maps these assets to visible names and event editions. A prompt may single out a wrestler only when the question already names them. A championship question can show its belt. Correct-answer portraits and match photographs appear after Confirm. Generic event logos can represent different editions; the four supplied WrestleMania edition logos are mapped to their exact events. Multi-event chronology questions do not display one misleading event logo.

All selectable answers, ordering items, and matching columns use text only. Images belong to the question presentation or the feedback, so missing portraits do not give some answer options a different visual treatment.

The arena backdrop `public/assets/smackdown-arena.webp` and brand artwork `public/assets/know-your-era-brand.webp` were extracted from the approved homepage mockup using the built-in image-generation tool, then encoded as WebP. The backdrop is a decorative composite. The portraits and historical match photos were not generated. Extraction prompts: preserve the blue arena and side SmackDown screens while removing foreground interface and logo; isolate the original metallic Know Your Era fist logo on a transparent background while removing the arena and form.

Barlow Regular and Barlow Condensed SemiBold/Bold are served locally from `public/fonts/`. Their SIL Open Font License is stored alongside them.

| Asset IDs | Use | Owner-supplied files |
| --- | --- | --- |
| `arena-one`, `arena-two`, `arena-three` | Decorative empty-ring backdrops. They are not historical photographs or evidence. | `backgroundimage.png`, `backgroundimage2.jpg`, `backgroundimage3.jpg` |
| `raw-mark`, `smackdown-mark` | Brand marks for interface accents. | `raw-logo.png`, `smackdonw-logo.png` |
| `summerslam-mark`, `survivor-series-mark`, `royal-rumble-mark`, `judgment-day-mark`, `bad-blood-mark` | Event logos. They have no visible year label in the supplied versions and can accompany any matching event edition. | `summerslam_logo.png`, `survivor_series_logo.png`, `royal_rumble_logo.png`, `judgment_day.png`, `bad_blood.png` |
| `photo-wrestlemania-xiv` | Answer image for the WrestleMania XIV main-event question. | `austinvsmichaels.jpg` |
| `photo-summerslam-1999` | Answer image for the SummerSlam 1999 main-event question. | `summerslam1999manking.jpg` |
| `photo-summerslam-2000` | Answer image for the SummerSlam 2000 card question. | `tlcsummerslam2000.jpg` |
| `photo-survivor-series-2002` | Answer image for the Survivor Series 2002 main-event question. | `survivorseries2002.jpg` |
| `photo-no-way-out-2004` | Answer image for the No Way Out 2004 main-event question. | `eddielesnarnwo2004.jpg` |
| `photo-wrestlemania-xx` | Answer image for the WrestleMania XX Evolution match question. | `The-Rock--Sock-Connection-v-Evolution-WrestleMania-20-Cropped.avif` |

Every image has `permissionStatus: "unknown"`. Being supplied by the owner does not establish copyright or reuse rights. The manifest records the supplied filename, dimensions, alternate text, and whether an image can appear before an answer. Historical photographs are marked unsafe for question prompts and are assigned as answer images only. No wrestler portraits appear on the home screen.

The explicit event IDs on historical photos let validation reject a photo used with the wrong edition. An editor can set `overrideEventIds` only after reviewing an intentional reuse or edited asset.
