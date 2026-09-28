export const SCHEMA_SQL = `
CREATE TABLE spotify_user (
  id TEXT PRIMARY KEY, country TEXT NOT NULL, display_name TEXT NOT NULL,
  email TEXT NOT NULL, href TEXT NOT NULL, product TEXT NOT NULL, type TEXT NOT NULL,
  uri TEXT NOT NULL, external_urls_json TEXT NOT NULL, followers_json TEXT NOT NULL,
  images_json TEXT NOT NULL, payload_json TEXT NOT NULL
);
CREATE TABLE playlist (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES spotify_user(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT NOT NULL, href TEXT NOT NULL, snapshot_id TEXT NOT NULL,
  tracks_href TEXT NOT NULL, tracks_total INTEGER NOT NULL CHECK (tracks_total >= 0),
  collaborative INTEGER NOT NULL CHECK (collaborative IN (0,1)),
  is_public INTEGER NOT NULL CHECK (is_public IN (0,1)), type TEXT NOT NULL, uri TEXT NOT NULL,
  primary_color TEXT, folder_name TEXT, is_synced INTEGER NOT NULL DEFAULT 0 CHECK (is_synced IN (0,1)),
  sync_order INTEGER, is_queued INTEGER NOT NULL DEFAULT 0 CHECK (is_queued IN (0,1)), queue_order INTEGER,
  is_paused INTEGER NOT NULL DEFAULT 0 CHECK (is_paused IN (0,1)), is_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_deleted IN (0,1)),
  cached_at_ms INTEGER, cached_snapshot_id TEXT, owner_json TEXT NOT NULL, external_urls_json TEXT NOT NULL,
  images_json TEXT NOT NULL, payload_json TEXT NOT NULL,
  CHECK ((is_synced = 1 AND sync_order IS NOT NULL) OR (is_synced = 0 AND sync_order IS NULL)),
  CHECK ((is_queued = 1 AND queue_order IS NOT NULL) OR (is_queued = 0 AND queue_order IS NULL))
);
CREATE TABLE track (
  spotify_id TEXT PRIMARY KEY, name TEXT NOT NULL, duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  query_text TEXT, query_duration TEXT CHECK (query_duration IN ('long','medium','short') OR query_duration IS NULL),
  query_duration_s INTEGER CHECK (query_duration_s >= 0 OR query_duration_s IS NULL),
  selection_kind TEXT NOT NULL CHECK (selection_kind IN ('unset','disabled','youtube')),
  selection_youtube_id TEXT, converted INTEGER NOT NULL CHECK (converted IN (0,1)),
  registry_track INTEGER NOT NULL DEFAULT 0 CHECK (registry_track IN (0,1)),
  conversion_error INTEGER NOT NULL CHECK (conversion_error IN (0,1)), processed INTEGER NOT NULL CHECK (processed IN (0,1)),
  paused INTEGER NOT NULL CHECK (paused IN (0,1)), selection_applied INTEGER NOT NULL CHECK (selection_applied IN (0,1)),
  duration_s INTEGER CHECK (duration_s >= 0 OR duration_s IS NULL), payload_json TEXT NOT NULL,
  CHECK ((selection_kind = 'youtube' AND selection_youtube_id IS NOT NULL) OR (selection_kind != 'youtube' AND selection_youtube_id IS NULL))
);
CREATE TABLE playlist_track (
  membership_id INTEGER PRIMARY KEY, playlist_id TEXT NOT NULL REFERENCES playlist(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES track(spotify_id) ON DELETE CASCADE, position INTEGER NOT NULL CHECK (position >= 0),
  membership_kind TEXT NOT NULL CHECK (membership_kind IN ('active','added','removed')),
  registry_order INTEGER CHECK (registry_order >= 0 OR registry_order IS NULL)
);
CREATE TABLE youtube_conversion (
  track_id TEXT PRIMARY KEY REFERENCES track(spotify_id) ON DELETE CASCADE, conversion_id TEXT NOT NULL,
  best_match_youtube_id TEXT, name_tokens_json TEXT NOT NULL, updated_at_ms INTEGER NOT NULL
);
CREATE TABLE youtube_result (
  track_id TEXT NOT NULL REFERENCES track(spotify_id) ON DELETE CASCADE, youtube_id TEXT NOT NULL,
  result_kind TEXT NOT NULL CHECK (result_kind IN ('conversion','custom')),
  duration INTEGER NOT NULL CHECK (duration >= 0), matched_tokens_count INTEGER NOT NULL CHECK (matched_tokens_count >= 0),
  duration_diff REAL NOT NULL, duration_score REAL NOT NULL, word_score REAL NOT NULL,
  is_doubtful_conversion INTEGER NOT NULL CHECK (is_doubtful_conversion IN (0,1)), is_best_match INTEGER NOT NULL CHECK (is_best_match IN (0,1)),
  is_custom_track INTEGER NOT NULL CHECK (is_custom_track IN (0,1)), snippet_json TEXT NOT NULL, payload_json TEXT NOT NULL,
  PRIMARY KEY (track_id, youtube_id, result_kind)
);
CREATE TABLE library_state (
  state_id INTEGER PRIMARY KEY CHECK (state_id = 1), user_id TEXT NOT NULL REFERENCES spotify_user(id),
  current_playlist_id TEXT REFERENCES playlist(id) ON DELETE SET NULL, control_total INTEGER NOT NULL CHECK (control_total >= 0),
  control_offset INTEGER NOT NULL CHECK (control_offset >= 0), last_sync_ms INTEGER
);
CREATE TABLE downloaded_file (
  relative_path TEXT PRIMARY KEY, track_id TEXT REFERENCES track(spotify_id) ON DELETE SET NULL, youtube_id TEXT,
  playlist_id TEXT REFERENCES playlist(id) ON DELETE SET NULL, playlist_folder TEXT NOT NULL, discovered_at_ms INTEGER NOT NULL
);
CREATE INDEX playlist_user_status_idx ON playlist(user_id,is_deleted,is_synced,is_queued);
CREATE INDEX playlist_track_order_idx ON playlist_track(playlist_id,membership_kind,position);
CREATE INDEX youtube_result_track_idx ON youtube_result(track_id);
CREATE INDEX downloaded_file_track_idx ON downloaded_file(track_id,youtube_id);
`
