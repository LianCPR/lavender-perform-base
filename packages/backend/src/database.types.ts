/**
 * Typed view of the Supabase schema.
 *
 * Kept in sync with `supabase/migrations`. Regenerate with the Supabase CLI:
 *   npx supabase gen types typescript --project-id <id> > packages/backend/src/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TrackSourceRow = 'catalog' | 'local_import' | 'provider';
export type RepeatModeRow = 'off' | 'all' | 'one';

export type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PreferencesRow = {
  user_id: string;
  library_sort: 'recent' | 'title' | 'artist';
  library_view: 'grid' | 'list';
  theme_mode: 'system' | 'light' | 'dark';
  created_at: string;
  updated_at: string;
};

export type PlaybackRow = {
  user_id: string;
  shuffle: boolean;
  repeat_mode: RepeatModeRow;
  volume: number;
  last_track_key: string | null;
  position_sec: number;
  queue_keys: Json;
  created_at: string;
  updated_at: string;
};

export type TrackRow = {
  client_key: string;
  title: string;
  artist_id: string | null;
  album_id: string | null;
  artist_name: string | null;
  album_title: string | null;
  duration_sec: number;
  artwork_url: string | null;
  palette: string;
  source: TrackSourceRow;
  audio_format: string | null;
  provider: string | null;
  provider_track_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FavoriteRow = {
  user_id: string;
  track_key: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ImportRow = {
  user_id: string;
  track_key: string;
  file_name: string;
  mime_type: string;
  added_at: string;
  updated_at: string;
};

export type RecentRow = {
  user_id: string;
  track_key: string;
  played_at: string;
  updated_at: string;
};

export type PlaylistRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  palette: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ListeningHistoryRow = {
  user_id: string;
  id: string;
  track_key: string;
  title: string;
  artist_id: string | null;
  artist_name: string;
  album_id: string | null;
  album_title: string;
  duration_sec: number;
  listened_sec: number;
  played_at: string;
  source: 'local' | 'online';
  provider: string | null;
  provider_track_id: string | null;
  genre: string | null;
  mood: string | null;
  palette: string;
  artwork_url: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PlaylistTrackRow = {
  playlist_id: string;
  track_key: string;
  position: number;
  added_at: string;
};

type Writable<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Writable<ProfileRow, 'id'>;
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      user_preferences: {
        Row: PreferencesRow;
        Insert: Writable<PreferencesRow, 'user_id'>;
        Update: Partial<PreferencesRow>;
        Relationships: [];
      };
      playback_state: {
        Row: PlaybackRow;
        Insert: Writable<PlaybackRow, 'user_id'>;
        Update: Partial<PlaybackRow>;
        Relationships: [];
      };
      tracks: {
        Row: TrackRow;
        Insert: Writable<TrackRow, 'client_key' | 'title'>;
        Update: Partial<TrackRow>;
        Relationships: [];
      };
      library_favorites: {
        Row: FavoriteRow;
        Insert: Writable<FavoriteRow, 'user_id' | 'track_key'>;
        Update: Partial<FavoriteRow>;
        Relationships: [];
      };
      user_imports: {
        Row: ImportRow;
        Insert: Writable<ImportRow, 'user_id' | 'track_key' | 'file_name'>;
        Update: Partial<ImportRow>;
        Relationships: [];
      };
      recently_played: {
        Row: RecentRow;
        Insert: Writable<RecentRow, 'user_id' | 'track_key'>;
        Update: Partial<RecentRow>;
        Relationships: [];
      };
      playlists: {
        Row: PlaylistRow;
        Insert: Writable<PlaylistRow, 'id' | 'user_id' | 'name'>;
        Update: Partial<PlaylistRow>;
        Relationships: [];
      };
      listening_history: {
        Row: ListeningHistoryRow;
        Insert: Writable<ListeningHistoryRow, 'user_id' | 'id' | 'track_key' | 'title' | 'artist_name' | 'played_at'>;
        Update: Partial<ListeningHistoryRow>;
        Relationships: [];
      };
      playlist_tracks: {
        Row: PlaylistTrackRow;
        Insert: Writable<PlaylistTrackRow, 'playlist_id' | 'track_key' | 'position'>;
        Update: Partial<PlaylistTrackRow>;
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      replace_playlist_tracks: {
        Args: { p_playlist_id: string; p_track_keys: string[] };
        Returns: null;
      };
      track_keys_exist: {
        Args: { p_keys: string[] };
        Returns: { client_key: string }[];
      };
    };
    Enums: {
      track_source: TrackSourceRow;
      repeat_mode: RepeatModeRow;
    };
    CompositeTypes: {};
  };
}
