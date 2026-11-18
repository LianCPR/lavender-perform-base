-- Lavender Music — Phase 07 Row Level Security
--
-- Rules:
-- * Private rows are only ever visible/writable when `user_id = auth.uid()`.
-- * Playlist tracks inherit ownership from their playlist.
-- * `tracks` are shared when `owner_id is null` (catalog) and private when the
--   row belongs to the signed-in listener (imported metadata).
-- * Catalog metadata (genres/artists/albums) is read-only for clients; curated
--   rows are seeded with the service role.
-- * Anonymous users have no table access; guest mode stays entirely local.

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.playback_state enable row level security;
alter table public.genres enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;
alter table public.user_imports enable row level security;
alter table public.library_favorites enable row level security;
alter table public.saved_albums enable row level security;
alter table public.followed_artists enable row level security;
alter table public.recently_played enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- one-row-per-user tables ----------------------------------------------------
drop policy if exists "preferences own" on public.user_preferences;
create policy "preferences own" on public.user_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "playback state own" on public.playback_state;
create policy "playback state own" on public.playback_state
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- catalog metadata -----------------------------------------------------------
drop policy if exists "genres readable" on public.genres;
create policy "genres readable" on public.genres
  for select to authenticated using (true);

drop policy if exists "artists readable" on public.artists;
create policy "artists readable" on public.artists
  for select to authenticated using (true);

drop policy if exists "albums readable" on public.albums;
create policy "albums readable" on public.albums
  for select to authenticated using (true);

-- tracks ---------------------------------------------------------------------
drop policy if exists "tracks readable" on public.tracks;
create policy "tracks readable" on public.tracks
  for select to authenticated
  using (owner_id is null or owner_id = auth.uid());

drop policy if exists "tracks insert own" on public.tracks;
create policy "tracks insert own" on public.tracks
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "tracks update own" on public.tracks;
create policy "tracks update own" on public.tracks
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "tracks delete own" on public.tracks;
create policy "tracks delete own" on public.tracks
  for delete to authenticated using (owner_id = auth.uid());

-- personal library -----------------------------------------------------------
drop policy if exists "imports own" on public.user_imports;
create policy "imports own" on public.user_imports
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "favorites own" on public.library_favorites;
create policy "favorites own" on public.library_favorites
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "saved albums own" on public.saved_albums;
create policy "saved albums own" on public.saved_albums
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "followed artists own" on public.followed_artists;
create policy "followed artists own" on public.followed_artists
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "recently played own" on public.recently_played;
create policy "recently played own" on public.recently_played
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- playlists ------------------------------------------------------------------
drop policy if exists "playlists own" on public.playlists;
create policy "playlists own" on public.playlists
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "playlist tracks readable" on public.playlist_tracks;
create policy "playlist tracks readable" on public.playlist_tracks
  for select to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist tracks insert" on public.playlist_tracks;
create policy "playlist tracks insert" on public.playlist_tracks
  for insert to authenticated
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist tracks update" on public.playlist_tracks;
create policy "playlist tracks update" on public.playlist_tracks
  for update to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "playlist tracks delete" on public.playlist_tracks;
create policy "playlist tracks delete" on public.playlist_tracks
  for delete to authenticated
  using (
    exists (
      select 1 from public.playlists p
      where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid()
    )
  );

-- Privileges: RLS decides row access; grants decide table access.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
