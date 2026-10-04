# Dorje Drolö reader

The public reader at `/dorje-drolo/` follows Jake's sequence of 4 October 2026:

1. Refuge and bodhicitta — `daily-refuge`
2. Four immeasurables — `four-immeasurables`
3. Kagyu lineage supplication (optional) — `kagyu-lineage`
4. Six reflections — `reflection-one` through `reflection-six`
5. Refuge after reflections — `refuge-main`
6. Prostration short refuge — `prostration-short`
7. Finish refuge and bodhicitta — `refuge-second`
8. Closing dedication — `dedication-aspiration`
9. Daily chant short dedication — `dedication-prayers`

These are 14 recordings, or 13 with the Kagyu supplication turned off. Playback
advances in order and stops after the final dedication. Previous/Next preserve
the playing or paused state; selecting from the section menu waits for Play.
The Kagyu step also offers Skip lineage for a one-time skip. The inclusion
checkbox saves the preference locally and removes that step from navigation
and automatic playback. Toggling it does not restart another active recording.

## Content and sources

`index.html` loads `content.js`, `reader-data.js`, and `reader.js`, with
`reader.css`. The original companion's recordings and transcripts remain in
`content.js`; `reader-data.js` maps them into the current sequence without
duplicating text or cues. The original companion's 19-step `practiceSteps`
array is not used by this reader.

Ten recordings have the original 86 synchronised Tibetan, phonetic, and English
phrases. The opening refuge, immeasurables, Kagyu supplication, and short daily
dedication use the 22 May 2026 Tergar Daily Chants edition. The six reflections
use the Dorje Drolö liturgy, version 2.0. Both PDFs and the recordings are in
`media/`, with attribution retained on the page.

The four remaining recordings (`refuge-main`, `prostration-short`,
`refuge-second`, and `dedication-aspiration`) retain the earlier companion's
recording mappings. They play in the sequence with links to the relevant
liturgy sections. They have no verified transcript/cue mapping; do not invent
phrase timings. Source links open the refuge section (PDF page 11), prostration
prayer (15), remainder of refuge (16), and aspiration (61).

## Verification

After changing the sequence or player, check automatic transitions through all
recordings and completion after the final dedication. Check the lineage toggle
before, during, and after the optional step; one-time skipping; persistence on
reload; and operation when local storage is unavailable. Verify timed verse
highlighting, PDF fallbacks, and phone/tablet/desktop layouts including larger
text. The player height is measured so its controls do not cover the end of the
reader or the Return to current verse button.
