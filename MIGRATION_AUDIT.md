# Migration parity audit

This audit compares the pre-migration app at revision `lt` (`07d8c640`, "feat: revive") with the current working copy. It lists product behavior that the migration lost or broke.

Read legacy files with `jj file show -r lt <path>`. Citations use `lt:<path>:<line>` for legacy code and `<path>:<line>` for current code.

## Method

- The desktop source (`src/`) was compared area by area: shell and top bar, lists and views, modals and setup, renderer environment and controllers, styles and assets, and the main process.
- A finding counts only if the legacy code was live, meaning it was mounted, imported, or called, and not commented out. Code that was already dead at `lt` is listed under [Not regressions](#not-regressions).
- **Verified** means the finding was checked directly against both trees. **Scout** means a read-only sub-agent found it with citations, and the citations were not rechecked.

## Summary

| #   | Finding                                                   | Class         | Severity | Verified |
| --- | --------------------------------------------------------- | ------------- | -------- | -------- |
| 1   | Scroll-linked top bar and search bar opacity              | broken        | medium   | verified |
| 2   | Global search filters nothing                             | lost          | high     | verified |
| 3   | Track status on track cards and playlist cards            | lost          | high     | verified |
| 4   | Live downloaded-file updates (FileWatchers bridge)        | lost          | high     | verified |
| 5   | Playlist and track sorting                                | lost          | medium   | verified |
| 6   | Track card click gating by status                         | broken        | low      | verified |
| 7   | Conversion result issue details and selection gating      | lost          | medium   | verified |
| 8   | Track banner playlist membership, status, and artist line | lost / broken | low      | verified |
| 9   | Duration formatting                                       | changed       | low      | verified |
| 10  | Floating button visibility conditions                     | changed       | low      | scout    |
| 11  | Error pill timing and connection messages                 | changed       | low      | scout    |
| 12  | Home views remount on every navigation                    | changed       | low      | scout    |

Findings 3, 4, 5, 6, and 8 share one root cause. The legacy `Track.controller` and `Playlist.controller` status logic was not ported. The current renderer also has no live downloaded-file map to compute a `downloaded` state from.

## Resolution

All twelve findings are fixed. The tests in `tests/` cover the pure behavior of findings 2 to 11. Findings 1 to 4, 7 to 9, and 12 were also checked in the running Electron app with a temporary library.

Finding 4 also depended on a watcher bug that `lt` had too. `createPlaylistWatchers` returned early because `retrieveLocalTracks()` with its default empty filter selects no playlists. Watchers are now always created, so the "Empty-library watcher skip" entry under [Not regressions](#not-regressions) no longer describes current behavior.

## Findings

### 1. Scroll-linked top bar and search bar opacity

**Class:** broken

**Legacy behavior.** Scrolling the Home content faded in the search bar background and the top bar drop shadow. It also faded out the top bar gradient.

- `lt:src/renderer/components/Home/PlaylistsList.vue:122-128` attached one scroll listener to `$root.$refs['home-router']` through `onComponentLoaderMount`. `.home-router` is shared by every Home route, so the effect applied to all Home views.
- `lt:src/renderer/components/Home/PlaylistsList.vue:172-176` computed `min(scrollTop / 100, 1)` and called `$setRootVar('scroll-opacity', ratio)`.
- `lt:src/renderer/environment/vue.renderer.config.ts:41-44` wrote the variable to `:root`.
- `lt:src/renderer/CSS/global.vue:297-306` defined `.global-scroll-shadow`, `.show-on-scroll`, and `.hide-on-scroll` against `--scroll-opacity`.

**Current state.** Two independent faults:

1. The listener is on the wrong element. `src/renderer/components/Home/PlaylistsList.vue:83-96` and `src/renderer/components/Home/TracksList.vue:31-44` listen on `.pll-container` and `.tkl-container`, which do not scroll. The scroll container is `.home-router` (`src/renderer/components/Home/Home.vue:76-83`, `overflow: auto`). The handler never fires.
2. The variable is written to the wrong element. Even if the handler fired, it sets `--scroll-opacity` on the list element. `TopBar` and `SearchBar` are siblings of `.home-router`, not descendants, so they cannot inherit it.

**Effect.** `TopBar` and `SearchBar` always read the `:root` default `--scroll-opacity: 1` (`src/renderer/CSS/variables.scss:72-73`). The search bar background (`SearchBar.vue:5-6`) and the top bar drop shadow (`TopBar.vue:7`) are always fully visible. The top bar gradient (`TopBar.vue:8`, `TopBar.vue:337`) is always hidden.

**Direction.** Use one listener on `.home-router`, owned by `Home.vue`, that writes to `document.documentElement`. Remove the per-list handlers.

### 2. Global search filters nothing

**Class:** lost

**Legacy behavior.** Text typed in the search bar filtered the active Home view.

- `lt:src/renderer/App.vue:35-38` created the shared `$root.SEARCH_INPUT`. `lt:src/renderer/components/Home/TopBar/SearchBar.vue:46-49` wrote the input to it.
- Playlists list: `lt:src/renderer/components/Home/PlaylistsList.vue:81-82` read the input and `:106-110` watched it. `:187-202` filtered synced and unsynced playlists by name, case-insensitively, and set `noPlaylists`.
- Tracks list: `lt:src/renderer/components/Home/TracksList.vue:51-53` and `:71-74` read and watched the input. `:131-146` filtered by track name and artist names, and set `noTracks`.
- Playlist view: `lt:src/renderer/components/Home/PlaylistView/PlaylistView.vue:137-139` and `:162-165` read and watched the input. `:231-252` filtered the playlist's tracks by name and artists.
- Every list used `scheduleFilter`: hide the list for 250 ms, drop stale keystrokes through `lastType`, filter, then show the list again. PlaylistsList and TracksList rendered a "No Playlists found" or "No Tracks found" message for an empty result.

**Current state.** `src/renderer/components/Home/TopBar/SearchBar.vue:28` stores the input in a local `ref`. Nothing reads it. It is only cleared on route change (`:43-53`). No list has a filter, a debounce, or an empty-result state for a query. `trackMatches` in `src/renderer/components/Home/model.ts:95-101` implements the track match, but nothing calls it.

**Effect.** Typing in the search bar does nothing.

Enter-to-open-the-only-result (`handleInputConfirm`) was already commented out at `lt`, so it is not part of this regression.

### 3. Track status on track cards and playlist cards

**Class:** lost

**Legacy behavior: per track.** `lt:src/renderer/controllers/Track.controller.ts:14-33` derived one of eight states:

| Slug                       | Label                       | Color                      |
| -------------------------- | --------------------------- | -------------------------- |
| `paused`                   | paused                      | grey                       |
| `error`                    | conversion error            | `--red-cancel`             |
| `awaiting-conversion`      | awaiting conversion         | grey                       |
| `downloaded`               | downloaded                  | `--green-accept`           |
| `no-conversion`            | no conversion found         | `--global-grey`            |
| `custom:awaiting-download` | awaiting download \| custom | `--custom-selection-color` |
| `awaiting-download`        | awaiting download           | `--button-purple`          |
| `review-conversion`        | review conversion           | `--orange-warning`         |

The labels are at `:69-78`, the colors at `:59-68`, and the sort order at `:48-57`. `downloaded` came from `isDownloaded` (`:42-45`), which looked up the selected YouTube ID in the downloaded-file map. The track card rendered the colored label (`lt:src/renderer/components/Home/PlaylistView/Track.vue:33-39`).

**Legacy behavior: per playlist.** `lt:src/renderer/controllers/Playlist.controller.ts:12-60` aggregated the track states of a synced playlist into one card status (`:75-136`). The status with the highest precedence won:

- `N conversion error(s)`, red
- `N track(s) to review` (no conversion or doubtful conversion), orange
- `N track(s) to convert`, purple
- `N to download` or `Synced`, green
- `Paused`, grey
- `click to sync`, for unsynced playlists

`lt:src/renderer/components/Home/PlaylistsList.vue:169` attached the status to each playlist, and `lt:src/renderer/components/Home/Playlist.vue:38-46` rendered it.

**Current state.**

- Track card: `src/renderer/components/Home/PlaylistView/Track.vue:74-80` shows only `Paused`, `Error`, or `Ready`, uncolored. `Ready` maps to `selectionIsApplied`, which was not a legacy state. Awaiting conversion, downloaded, no conversion, custom, awaiting download, and review conversion are gone.
- Playlist card: `src/renderer/components/Home/model.ts:54-89` returns only `Synced`, `Paused`, `Queued`, or `Not synced`, with no counts. `src/renderer/components/Home/Playlist.vue:56-67` uses it.
- `PlaylistViewSlide.vue:108-145` has a separate, partial calculation of error and conversion counts. It is used only in the playlist view header.

**Data availability.** The needed track data still reaches the renderer: `flags`, `selection`, `conversion`, and `custom` on `SongBasketTrackDto` (`src/shared/ipc.ts`), plus `convertedTracks` in `STATE:SNAPSHOT` and `STATE:PATCH`. The `downloaded` state is the exception; see [finding 4](#4-live-downloaded-file-updates-filewatchers-bridge).

### 4. Live downloaded-file updates (FileWatchers bridge)

**Class:** lost

**Legacy behavior.** The main process sent MP3 watcher events to the renderer. The renderer kept a live map of downloaded tracks.

- `lt:src/main/controllers/InitializationAndHandlers/ipc.routes.ts:67-79` (scout) served `FileWatchers:ASK_TRACKS` and forwarded `FileWatchers:RETRIEVED_TRACKS`, `FileWatchers:ADDED`, and `FileWatchers:REMOVED`.
- `lt:src/renderer/environment/ipc.renderer.config.ts:24-26` subscribed to those events. `:89-125` maintained `$root.DOWNLOADED_TRACKS` and refreshed the formatted tracks.

**Current state.** `FileWatchers` still tracks files in the main process, but nothing forwards its events. `downloadedTracks` exists only in the one-time `GET_STATUS` response (`src/main/controllers/InitializationAndHandlers/handlers.ts:265-274`). It is stored in `src/renderer/state/useSongBasketState.ts:25` and `:65`, and no component reads it.

**Effect.** The UI cannot show `downloaded`. It also cannot react when files are added to or removed from the library. Porting finding 3 without this bridge would show stale download states.

### 5. Playlist and track sorting

**Class:** lost

**Legacy behavior.**

- Synced playlists were sorted with `lt:src/renderer/controllers/Playlist.controller.ts:61-72`. The order was status first (errors and reviews, then conversions, then synced, then paused), then the number of track changes, then the count.
- The tracks list (`lt:src/renderer/components/Home/TracksList.vue:113`) and the synced playlist view were sorted by track status with `lt:src/renderer/controllers/Track.controller.ts:34-41`.

**Current state.** `src/renderer/components/Home/PlaylistsList.vue:51-64`, `TracksList.vue:27-29`, and `PlaylistView/PlaylistView.vue:83-88` render the state order without sorting. Items that need attention no longer come first.

This depends on finding 3.

### 6. Track card click gating by status

**Class:** broken

**Legacy behavior.** `lt:src/renderer/components/Home/PlaylistView/Track.vue:86-107` opened track review only for `awaiting-download`, `downloaded`, `custom:awaiting-download`, `review-conversion`, `no-conversion`, and `paused`. Tracks in `error` or an unknown state did nothing on click.

**Current state.** `src/renderer/components/Home/PlaylistView/Track.vue:82-87` always navigates to track review. Tracks with a conversion error open a review screen that has no results to review.

### 7. Conversion result issue details and selection gating

**Class:** lost

**Legacy behavior.** The following is in `lt:src/renderer/components/Home/DownloadsView/TrackBanner.vue`. TrackReview rendered this banner for each YouTube result.

- `:186-199` explained a doubtful match as `Name doesn't match` or `Duration doesn't match`, with a warning style. It labeled custom results `Custom` in the custom-selection color.
- `:167-171` defined `canSelect`: a result was selectable only if it was not selected yet, or if it was the selected but doubtful result.
- `:84-89` hid the button when the result was not selectable. For a selected doubtful result, the button read `Apply Selection` instead of `Select`.

**Current state.** `src/renderer/components/Home/DownloadsView/TrackBanner.vue:152-154` reduces every doubtful match to `Does not match`. It gives no reason and no custom label. Select is always shown, and the `Apply Selection` state is gone.

**Effect.** The user can no longer see why a match is doubtful. The explicit step to confirm a doubtful selection is also gone.

### 8. Track banner playlist membership, status, and artist line

**Class:** lost / broken

**Legacy behavior.** For a regular (non-conversion, non-download) track, `lt:src/renderer/components/Home/DownloadsView/TrackBanner.vue:98-117` showed `Inside <playlist names>` and the colored track status. The creator line showed the artists (`:184`).

**Current state.** `src/renderer/components/Home/DownloadsView/TrackBanner.vue:170-176` has no playlist line and no status. It also sets `creator: name`, so the artist line repeats the track name.

### 9. Duration formatting

**Class:** changed

**Legacy behavior.** `lt:src/renderer/controllers/Utils.controller.ts:2-7` formatted durations as zero-padded, floored `MM:SS`, for example `03:25`.

**Current state.** `src/renderer/components/Home/model.ts:47-52` formats `M:SS` and rounds the seconds with `Math.round`. A remainder of 59.5 s or more renders as `:60`, for example `239.6` → `3:60`.

### 10. Floating button visibility conditions

**Class:** changed (scout)

**Legacy behavior.** In `lt:src/renderer/components/Home/FloatingButtons.vue:123-134`:

- Refresh required no loading and both internet and API connectivity.
- Sync required no loading, full connectivity, and queued or synced playlists.
- Download required synced playlists, internet, and ffmpeg.

**Current state.** In `src/renderer/components/Home/FloatingButtons.vue:69-79`:

- Refresh requires one combined connectivity flag.
- Sync does not check for synced playlists.
- Download checks neither synced playlists nor internet.

Buttons can appear in states where they were hidden before, for example Download with no synced playlist.

The legacy `FEATURES.FLOAT_MENU.DROPDOWN` gate and the `forceHide`/`forceKill` flags are also gone. The logout chevron now always shows on Home.

### 11. Error pill timing and connection messages

**Class:** changed (scout)

**Legacy behavior.** `lt:src/renderer/components/Home/FloatingButtons.vue:143-161` and `:182-220` delayed showing the error pill and hid it automatically. They also built connection-specific messages.

**Current state.** `src/renderer/components/Home/FloatingButtons.vue:29-35` and `:46-53` render the state error immediately and keep it until the state changes.

### 12. Home views remount on every navigation

**Class:** changed (scout)

**Legacy behavior.** `lt:src/renderer/components/Home/ComponentLoader.vue:2-25` kept every Home view mounted and switched between them with `v-show`.

**Current state.** `src/renderer/components/Home/Home.vue:9-11` renders `<component :key="route.fullPath">`. Each navigation creates a fresh view, so local view state is reset: horizontal scroller positions, any list state, and component-held data. Resetting the vertical scroll on navigation matches legacy behavior (`src/renderer/router/index.ts`, `beforeEach`).

## Not regressions

These items were checked and ruled out. Some were already dead or unfinished at `lt`, and the rest were ported with equivalent behavior.

| Item                                                                          | Why it is not a regression                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest login, guest verification, and their error states                       | The legacy renderer called `guestSignIn` and `guestConfirm` and listened for `not-found`, `invalid`, `user-found`, `continueToLogin`, and `playlists done` (`lt:src/renderer/components/Setup/Setup.vue`). `lt:src/main` has no handler or sender for any of them. The flow was already non-functional. |
| Reset-all-playlist-tracks modal                                               | It was registered in `lt:src/renderer/components/Modal/ModalLoader.vue:11-14`, but no code opened it. Its `resetSelection` action only fired a store event.                                                                                                                                             |
| Folder edit and delete buttons                                                | `lt:src/renderer/components/FolderView/FolderView.vue:54-55` had an empty `editFolder`. The delete button opened `DeleteFolder.vue`, whose `removeFromList` and `deleteAll` were empty (`:36-41`). The buttons were visible but did nothing.                                                            |
| `TrackReviewOld` modal                                                        | It was commented out in the legacy `ModalLoader`. The track-review route replaced it.                                                                                                                                                                                                                   |
| `HomeBackground` (canvas and mousewheel parallax), `UserData` (avatar footer) | Both were imported in `lt:src/renderer/components/Home/Home.vue:29-47`, but the template never mounted them.                                                                                                                                                                                            |
| Typing anywhere to focus search                                               | It was ported. `src/renderer/shortcut-mapping.ts:47-50` maps `Key[A-Z]`, `Digit`, `Numpad`, and Backspace. The legacy handler accepted key codes 48-90, which is the same set (`lt:src/renderer/environment/window.renderer.config.ts:69,87-89`).                                                       |
| `--filters-container-height`                                                  | It is still set on `:root` per route (`SearchBar.vue:31-42`).                                                                                                                                                                                                                                           |
| `disconnected` class on `<html>`                                              | It moved from `App.vue` to `TopBar.vue:265-275`. The CSS still consumes it.                                                                                                                                                                                                                             |
| Top bar, slides, and window controls                                          | The status line, section tabs, back and forward arrows, loading bar, and slide controls (pause, unsync, download, custom URL, Search YouTube, reset selection) are all present.                                                                                                                         |
| Downloads view                                                                | Queue order, per-track progress, and state styling are present.                                                                                                                                                                                                                                         |
| Styles and assets                                                             | The stylesheet order, `user-select` rules, the MADE Tommy font, and the used icons are preserved. `aliic` (`PlaylistsList.vue:27`) has no definition, but it was already undefined at `lt`.                                                                                                             |
| Loading screen, router guards                                                 | Both are unchanged. The loading screen showed only the "Loading" text and the version at `lt`, and neither version had auth guards.                                                                                                                                                                     |
| Main-process watcher, download, and tag behavior                              | Empty-library watcher skip, no-op `change`/`unlinkDir` events, the commented-out `rebuildWatchers`, a sequential queue that continues after online errors, MP3 tag fields, and protocol registration are the same at `lt` (scout).                                                                      |
| Persisted state fields                                                        | The SQLite snapshot keeps the legacy `SongBasketSaveFile` shape, including track flags, selection, conversion, and custom (scout).                                                                                                                                                                      |
