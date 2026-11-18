# Recommendation engine

`@lavender/personalization` builds recommendations with a small, inspectable
scoring function. No AI service, paid API or opaque model is involved.

## Inputs

- The current local catalog: tracks, albums, artists, playlists, genres, moods.
- The taste profile, built only from real listening history.
- Recent history (for “recent” language and discovery exclusions).
- Dismissed section ids and a refresh seed.
- The current day.

Genre resolution uses `Track.genre` first (provider metadata), then the album’s
`genreId` mapped through the catalog genres. Missing genres are left missing;
the engine never guesses one from a title or artist name.

## Track score

For each catalog track:

```
artist affinity × 4
+ genre affinity × 2
+ recent-artist bonus (2)
+ deterministic daily jitter (0…1)
− played-before novelty penalty (1.5, only when history exists)
```

Artist and genre affinity are play counts from the profile. Names are compared
case-insensitively after trimming. The daily jitter uses a stable string hash of
`trackId + seed + YYYY-MM-DD`, so the same day is stable but refreshing produces
a new order.

## Sections

When real history exists:

| id | Title | Signal |
| --- | --- | --- |
| `for-you` | Recommended for you | Full affinity ranking |
| `based-on-recent` | Based on your recent listening | Artists from the five newest sessions |
| `favorite-genres` | Your favorite genres | Top two profile genres |
| `discover-artists` | Discover new artists | Ranked tracks whose artist has no plays |
| `more-like-this` | Because you played <track> | Same artist/genre as the newest session |

Sections are different lenses on the same taste and may overlap. Each section is
deduplicated. A section with no qualifying tracks is omitted rather than padded
with unrelated music.

With no history:

- `for-you` becomes **Start here**, subtitled “A starting point until we know
  what you like”.
- `discover-artists` becomes **A few artists to try**.
- Daily mixes and playlist matches are empty.
- `personalized` is `false`; no UI copy claims personal knowledge.

## Daily mixes

Stable ids keep dismissal and refresh predictable:

- `daily-mix-genre` — top genre, filled from adjacent ranked tracks.
- `daily-mix-artist` — top artist plus same-genre tracks.
- `daily-mix-mood` — a catalog mood containing the top mood’s tracks.

They are created only from real profile entries. Content rotates with the day
and the refresh seed; a mix is omitted when it has no tracks. “Refresh” reruns
the model with a new seed. “Hide daily mixes” persists `daily-mixes` as dismissed.

## Playlists that fit

Every listener playlist is scored by summing the artist and genre affinity of its
tracks. The top four positive matches are shown; the reason says either “Artists
from your recent listening” or “Matches <genre> taste”. Playlists are not copied
or downloaded.

## Similar songs

`similarTracks(track)` adds 4 for the same artist, 3 for the same genre and 1 for
the same mood, then deterministically orders ties. It excludes the source track.

## Dismissal and transparency

`dismissRecommendation(id)` persists section/mix ids locally. `restoreAll` clears
the current dismissals. Subtitles name the real signal (artist, genre, recent
track) and the fallback is honest. There is no invented play count, demographic
inference or sensitive-trait inference.

## Limitations

- Recommendations rank the catalog already on the device. Online discovery uses
  the Phase 08 search/trending surfaces rather than silently expanding a queue.
- Provider tracks with empty genre/mood metadata get less precise genre rows.
- The engine is intentionally simple; it is ready for embeddings or editorial
  rules later without changing the UI contract.
