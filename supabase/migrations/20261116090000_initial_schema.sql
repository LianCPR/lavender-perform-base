-- Lavender Music — Phase 07 initial schema
--
-- Design notes
-- * Users live in `auth.users` (Supabase GoTrue). `profiles`, `user_preferences`
--   and `playback_state` are one-row-per-user satellites keyed by auth uid.
-- * Catalog metadata is normalized into genres/artists/albums/tracks. Tracks are
--   identified by a stable text `client_key` (catalog slug or `imported-*` id)
--   so library rows and playlists stay valid across devices and app restarts.
-- * Local audio is never stored here. Imported files keep their metadata plus a
--   `user_imports` row; the file itself stays on the device that imported it.
-- * Every mutable table carries `updated_at` for last-write-wins sync and the
--   user-owned collections keep a `deleted_at` tombstone so removals propagate.

create extension if not exists pgcrypto;

do $$ begin
  create type public.track_source as enum ('catalog', 'local_import', 'provider');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.repeat_mode as enum ('off', 'all', 'one');
exception when duplicate_object then null; end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- User profile, preferences, playback
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  library_sort text not null default 'recent'
    check (library_sort in ('recent', 'title', 'artist')),
  library_view text not null default 'grid'
    check (library_view in ('grid', 'list')),
  theme_mode text not null default 'system'
    check (theme_mode in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playback_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shuffle boolean not null default false,
  repeat_mode public.repeat_mode not null default 'off',
  volume numeric(3, 2) not null default 1 check (volume >= 0 and volume <= 1),
  last_track_key text,
  position_sec numeric(10, 2) not null default 0 check (position_sec >= 0),
  queue_keys jsonb not null default '[]'::jsonb check (jsonb_typeof(queue_keys) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Music metadata
-- ---------------------------------------------------------------------------

create table if not exists public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  year integer check (year is null or year between 1900 and 2200),
  genre_id uuid references public.genres (id) on delete set null,
  artwork_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, title)
);

create table if not exists public.tracks (
  client_key text primary key check (char_length(client_key) between 1 and 200),
  title text not null check (char_length(title) between 1 and 300),
  artist_id uuid references public.artists (id) on delete set null,
  album_id uuid references public.albums (id) on delete set null,
  -- Display fallbacks for imports/provider tracks without normalized rows.
  artist_name text,
  album_title text,
  duration_sec integer not null default 0 check (duration_sec >= 0),
  artwork_url text,
  palette text not null default 'haze',
  source public.track_source not null default 'catalog',
  audio_format text check (audio_format in ('mp3', 'm4a', 'aac', 'wav', 'flac', 'unknown')),
  provider text,
  provider_track_id text,
  -- NULL for the shared catalog, auth uid for a listener's imported metadata.
  owner_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tracks_owner_idx on public.tracks (owner_id);
create index if not exists tracks_album_idx on public.tracks (album_id);
create index if not exists tracks_artist_idx on public.tracks (artist_id);
create unique index if not exists tracks_provider_unique
  on public.tracks (provider, provider_track_id)
  where provider is not null and provider_track_id is not null;

-- ---------------------------------------------------------------------------
-- Personal library
-- ---------------------------------------------------------------------------

create table if not exists public.user_imports (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_key text not null references public.tracks (client_key) on delete cascade,
  file_name text not null,
  mime_type text not null default 'audio/*',
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, track_key)
);

create table if not exists public.library_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_key text not null references public.tracks (client_key) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, track_key)
);

create index if not exists library_favorites_user_idx
  on public.library_favorites (user_id)
  where deleted_at is null;

create table if not exists public.saved_albums (
  user_id uuid not null references auth.users (id) on delete cascade,
  album_id uuid not null references public.albums (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, album_id)
);

create table if not exists public.followed_artists (
  user_id uuid not null references auth.users (id) on delete cascade,
  artist_id uuid not null references public.artists (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, artist_id)
);

create table if not exists public.recently_played (
  user_id uuid not null references auth.users (id) on delete cascade,
  track_key text not null references public.tracks (client_key) on delete cascade,
  played_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, track_key)
);

create index if not exists recently_played_user_idx
  on public.recently_played (user_id, played_at desc);

-- ---------------------------------------------------------------------------
-- Playlists
-- ---------------------------------------------------------------------------

create table if not exists public.playlists (
  id text primary key check (char_length(id) between 1 and 120),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  palette text not null default 'lavender',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists playlists_user_idx
  on public.playlists (user_id)
  where deleted_at is null;

create table if not exists public.playlist_tracks (
  playlist_id text not null references public.playlists (id) on delete cascade,
  track_key text not null references public.tracks (client_key) on delete cascade,
  position integer not null check (position >= 0),
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_key)
);

create index if not exists playlist_tracks_order_idx
  on public.playlist_tracks (playlist_id, position);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'user_preferences', 'playback_state', 'artists', 'albums',
    'tracks', 'user_imports', 'library_favorites', 'saved_albums',
    'followed_artists', 'recently_played', 'playlists'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  end loop;
end;
$$;
