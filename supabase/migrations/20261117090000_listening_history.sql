-- Lavender Music — Phase 09 listening history
--
-- Metadata-only play log. There is deliberately no FK to `tracks`: history must
-- survive a provider track being removed, and imported tracks may no longer
-- exist on this device. Audio, local file paths and blob URIs are never stored.
-- A row is owned by one listener and RLS keeps accounts isolated.

create table if not exists public.listening_history (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 160),
  track_key text not null check (char_length(track_key) between 1 and 200),
  title text not null check (char_length(title) between 1 and 300),
  artist_id text,
  artist_name text not null check (char_length(artist_name) between 1 and 200),
  album_id text,
  album_title text not null default '',
  duration_sec integer not null default 0 check (duration_sec >= 0),
  listened_sec integer not null default 0 check (listened_sec >= 0),
  played_at timestamptz not null,
  source text not null default 'local' check (source in ('local', 'online')),
  provider text,
  provider_track_id text,
  genre text,
  mood text,
  palette text not null default 'haze',
  artwork_url text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, id)
);

create index if not exists listening_history_user_played_idx
  on public.listening_history (user_id, played_at desc)
  where deleted_at is null;

alter table public.listening_history enable row level security;

drop policy if exists "listening history own" on public.listening_history;
create policy "listening history own" on public.listening_history
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop trigger if exists listening_history_set_updated_at on public.listening_history;
create trigger listening_history_set_updated_at
  before update on public.listening_history
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.listening_history to authenticated;
revoke all on public.listening_history from anon;
