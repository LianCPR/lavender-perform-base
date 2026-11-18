-- Lavender Music — Phase 07 functions
--
-- `handle_new_user` runs as the auth trigger owner so a brand new account gets
-- its profile/preferences/playback rows without letting the client write to
-- those tables on behalf of someone else.
-- `replace_playlist_tracks` rewrites one playlist's ordering atomically while
-- respecting RLS through `security invoker`.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_name text;
begin
  meta_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  insert into public.profiles (id, display_name)
    values (new.id, left(meta_name, 80))
    on conflict (id) do nothing;
  insert into public.user_preferences (user_id) values (new.id)
    on conflict (user_id) do nothing;
  insert into public.playback_state (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.replace_playlist_tracks(
  p_playlist_id text,
  p_track_keys text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.playlists
    where id = p_playlist_id
      and user_id = auth.uid()
      and deleted_at is null
  ) then
    raise exception 'playlist not found or not owned by caller'
      using errcode = '42501';
  end if;

  delete from public.playlist_tracks where playlist_id = p_playlist_id;

  insert into public.playlist_tracks (playlist_id, track_key, position)
  select p_playlist_id, item.track_key, (item.ordinality - 1)::integer
  from unnest(p_track_keys) with ordinality as item(track_key, ordinality)
  on conflict do nothing;

  update public.playlists
  set updated_at = now()
  where id = p_playlist_id;
end;
$$;

revoke all on function public.replace_playlist_tracks(text, text[]) from public;
grant execute on function public.replace_playlist_tracks(text, text[]) to authenticated;

-- Shared lookup used by the client to ask "which of these keys exist?" without
-- pulling the whole catalog.
create or replace function public.track_keys_exist(p_keys text[])
returns table (client_key text)
language sql
stable
security invoker
set search_path = public
as $$
  select t.client_key
  from public.tracks t
  where t.client_key = any (p_keys);
$$;

grant execute on function public.track_keys_exist(text[]) to authenticated;
