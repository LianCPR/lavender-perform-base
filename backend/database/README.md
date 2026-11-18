# backend/database

Reserved for Phase 04.

Planned contents:

- Schema for accounts, libraries, playlists, favorites and playback history.
- Migrations with a single source of truth for table definitions.
- Seed scripts for local development.

Phase 01 has **no** database integration and no database dependencies. Nothing in
`apps/*` or `packages/*` reads from this folder yet.
