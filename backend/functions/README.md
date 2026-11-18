# backend/functions

Reserved for Phase 03+.

Planned contents:

- Library sync endpoints (device ↔ account).
- Playlist import/export.
- Music provider adapters (streaming/search metadata).
- Token refresh and provider proxying for the future audio engine.

Phase 01 ships **no** server code, no network calls and no secrets. The client
talks only to static demo data in `packages/music-library`.
