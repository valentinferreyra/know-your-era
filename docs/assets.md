# Image inventory

The original files in the owner's `know-your-era-images` folder remain unchanged. The selected copies in `public/assets/` are the same files, renamed for use by the site. No background removal, recoloring, or AI image generation was used.

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
