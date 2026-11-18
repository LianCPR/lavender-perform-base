-- Phase 07 RLS verification.
-- Run after the migrations against a scratch database (see scripts/db-verify.sh).
-- Any failed expectation raises and makes psql exit non-zero.

\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'b@example.test');

-- New accounts get their satellite rows from the auth trigger.
do $$
declare
  profiles int;
  prefs int;
  playback int;
begin
  select count(*) into profiles from public.profiles;
  select count(*) into prefs from public.user_preferences;
  select count(*) into playback from public.playback_state;
  if profiles <> 2 or prefs <> 2 or playback <> 2 then
    raise exception 'FAIL: bootstrap trigger rows profiles=% prefs=% playback=%',
      profiles, prefs, playback;
  end if;
end $$;

-- Sign-up metadata seeds the profile display name.
insert into auth.users (id, email, raw_user_meta_data) values
  ('66666666-6666-4666-8666-666666666666', 'named@example.test',
   '{"display_name":"Nova Listener"}'::jsonb);

do $$
declare
  name text;
begin
  select display_name into name from public.profiles
    where id = '66666666-6666-4666-8666-666666666666';
  if name is distinct from 'Nova Listener' then
    raise exception 'FAIL: display name not copied from sign-up metadata (%)', name;
  end if;
end $$;

-- Curated metadata is written by the service role (superuser in this harness).
insert into public.genres (id, name) values ('33333333-3333-4333-8333-333333333333', 'RLS Test Genre');
insert into public.artists (id, name) values ('44444444-4444-4444-8444-444444444444', 'RLS Test Artist');
insert into public.albums (id, artist_id, title, year, genre_id)
  values ('55555555-5555-4555-8555-555555555555',
          '44444444-4444-4444-8444-444444444444', 'RLS Test Album', 2026,
          '33333333-3333-4333-8333-333333333333');
insert into public.tracks (client_key, title, artist_id, album_id, source)
  values ('catalog-1', 'Shared Song',
          '44444444-4444-4444-8444-444444444444',
          '55555555-5555-4555-8555-555555555555', 'catalog');

-- ---------------------------------------------------------------------------
-- User A
-- ---------------------------------------------------------------------------
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

insert into public.tracks (client_key, title, source, owner_id, artist_name, audio_format)
  values ('imported-a', 'A File', 'local_import',
          '11111111-1111-4111-8111-111111111111', 'Unknown artist', 'wav');
insert into public.user_imports (user_id, track_key, file_name)
  values ('11111111-1111-4111-8111-111111111111', 'imported-a', 'a.wav');
insert into public.playlists (id, user_id, name)
  values ('pl-a', '11111111-1111-4111-8111-111111111111', 'A playlist');
insert into public.library_favorites (user_id, track_key)
  values ('11111111-1111-4111-8111-111111111111', 'catalog-1');
insert into public.library_favorites (user_id, track_key)
  values ('11111111-1111-4111-8111-111111111111', 'imported-a');

select public.replace_playlist_tracks('pl-a', array['catalog-1', 'imported-a']);

do $$
declare
  first_position int;
  second_position int;
begin
  select position into first_position from public.playlist_tracks
    where playlist_id = 'pl-a' and track_key = 'catalog-1';
  select position into second_position from public.playlist_tracks
    where playlist_id = 'pl-a' and track_key = 'imported-a';
  if first_position <> 0 or second_position <> 1 then
    raise exception 'FAIL: playlist ordering positions % / %', first_position, second_position;
  end if;
end $$;

do $$
begin
  begin
    insert into public.tracks (client_key, title, source, owner_id)
      values ('imported-other', 'B File', 'local_import',
              '22222222-2222-4222-8222-222222222222');
    raise exception 'FAIL: inserting a track owned by another user was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

do $$
begin
  begin
    insert into public.tracks (client_key, title, source, owner_id)
      values ('catalog-2', 'Catalog spoof', 'catalog', null);
    raise exception 'FAIL: client was allowed to write shared catalog metadata';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- User B: cannot read or change anything that belongs to A
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';

insert into public.playlists (id, user_id, name)
  values ('pl-b', '22222222-2222-4222-8222-222222222222', 'B playlist');

do $$
declare
  playlists int;
  favorites int;
  visible_tracks int;
  profiles int;
begin
  select count(*) into playlists from public.playlists;
  select count(*) into favorites from public.library_favorites;
  select count(*) into visible_tracks from public.tracks where owner_id is not null;
  select count(*) into profiles from public.profiles;

  if playlists <> 1 then raise exception 'FAIL: B sees % playlists', playlists; end if;
  if favorites <> 0 then raise exception 'FAIL: B sees % favorites', favorites; end if;
  if visible_tracks <> 0 then
    raise exception 'FAIL: B sees % imported tracks owned by someone else', visible_tracks;
  end if;
  if exists (select 1 from public.tracks where client_key = 'imported-a') then
    raise exception 'FAIL: B sees A imported track metadata';
  end if;
  if not exists (select 1 from public.tracks where client_key = 'catalog-1') then
    raise exception 'FAIL: B cannot read the shared catalog';
  end if;
  if profiles <> 1 then raise exception 'FAIL: B sees % profiles', profiles; end if;
end $$;

do $$
declare
  affected int;
begin
  update public.playlists set name = 'hijacked' where id = 'pl-a';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: B renamed A playlist'; end if;

  update public.user_preferences
     set library_sort = 'title'
   where user_id = '11111111-1111-4111-8111-111111111111';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: B changed A preferences'; end if;
end $$;

do $$
begin
  begin
    insert into public.library_favorites (user_id, track_key)
      values ('11111111-1111-4111-8111-111111111111', 'catalog-1');
    raise exception 'FAIL: B inserted a favorite for A';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.playlists (id, user_id, name)
      values ('pl-pwn', '11111111-1111-4111-8111-111111111111', 'pwn');
    raise exception 'FAIL: B inserted a playlist owned by A';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.replace_playlist_tracks('pl-a', array[]::text[]);
    raise exception 'FAIL: B replaced A playlist tracks';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- -----------
-- Anonymous visitors have no table privileges at all
-- ---------------------------------------------------------------------------
reset role;
set role anon;

do $$
begin
  begin
    perform count(*) from public.tracks;
    raise exception 'FAIL: anonymous role can read tracks';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

select 'RLS verification passed' as result;
