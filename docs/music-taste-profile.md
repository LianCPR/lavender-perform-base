# Music taste profile

The taste profile is a transparent summary of recorded listening. It never
guesses age, gender, location, identity or any other sensitive attribute.

## Aggregates

`buildTasteProfile` walks the history once and produces:

| Field | Rule |
| --- | --- |
| `totalPlays` | number of committed sessions |
| `totalListenedSec` | sum of measured time |
| `distinctArtists` / `distinctGenres` | unique normalized keys |
| `artists` | top 8 by plays, then listened time |
| `genres` | top 8 by listened time, then plays |
| `moods` | top 5 by listened time |
| `tracks` | top 8 by plays, then listened time |
| `playlists` | up to 5 playlists containing played track ids, by session count |
| `favoriteCount` | unique saved favorite ids (not inferred from plays) |
| `trend` | last 7 days vs. previous 7 days |
| `lastPlayedAt` | newest valid session |

Artist grouping uses `artistId` when present, otherwise a trimmed, lower-cased
artist name. Genre uses the entry’s explicit provider genre first, then the
album’s catalog genre. Mood comes from provider metadata or the catalog mood
that contains the track. Missing metadata is omitted, not guessed.

Genre `sharePct` is the genre’s measured listening time divided by measured time
across all known genres, rounded to a whole percent. If no measured time exists,
it falls back to play share.

## Trend

- `rising`: recent plays > previous × 1.2
- `cooling`: previous plays > recent × 1.2
- `steady`: otherwise

The UI label is deliberately modest (“More listening than last week”, “A quieter
week than before”, “A steady week of listening”). With no history it says “Listen
to something to begin”.

## Favorites and playlists

Saved favorites are shown as a count and are not counted as plays. Playlists are
ranked by how many history sessions reference any of their tracks; the app does
not claim a playlist was “played” unless its tracks were actually heard.

## Reset behavior

“Reset taste profile” removes history, tombstones and dismissed rows, and sets a
clear cutoff. It keeps favorites, playlist definitions and the personalization
on/off setting. “Delete all history” has the same effect on derived data but is
presented as the history control. Turning personalization off hides the profile
and pauses analysis while leaving existing sessions for the user to delete.

## Limitations

- Local demo/catalog tracks have no audio, so they cannot generate history until
  a real file is imported or an online stream is played.
- Online provider metadata is only as complete as the provider response; missing
  genre/mood reduces those sections.
- Top-N lists are intentionally small and plain; no collaborative filtering or
  opaque model is used.
