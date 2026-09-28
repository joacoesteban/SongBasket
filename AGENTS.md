# SongBasket

## Project status

SongBasket is an Electron desktop app that downloads Spotify playlists as MP3 files.
The API handles Spotify authentication and YouTube matching. The desktop app downloads and processes audio locally with `yt-dlp` and `ffmpeg`.

The desktop migrations below are complete. The API rewrite is still open.

- Read the relevant implementation before replacing it.
- Preserve useful product behavior and user data, not accidental complexity.
- Keep each task within its requested scope.
- Distinguish current behavior, agreed direction, and unresolved decisions in proposals and reports.
- Update this file when migrations replace the current structure or commands.

## Current architecture

### Tooling and type safety

- `mise.toml` provides Node 24 and Bun 1.
- Bun manages root dependencies through `bun.lock`.
- TypeScript uses project references for main, preload, and renderer code.
- Shared contracts are included in the main, preload, and renderer projects.
- The compiler uses strict checks, `libReplacement`, and `better-typescript-lib`.
- ESLint rejects conditional expressions, type assertions, explicit `any`, and invalid names.
- Prettier sorts imports and formats source and configuration files.
- Use `ts-pattern` for exhaustive pattern matching and `neverthrow` for typed results.

### Desktop process boundary

- `src/main/` contains Electron startup, controllers, API calls, downloads, and disk writes.
- `src/preload/index.ts` exposes the typed `window.songbasket` bridge.
- `src/shared/ipc.ts` defines invoke requests, invoke responses, and renderer event payloads.
- The renderer uses Vue 3 and Vue Router 4 with hash history.
- The renderer state service uses typed IPC events. It does not use Pinia or Vuex.
- The main process forwards `FileWatchers` MP3 additions and removals as `DOWNLOADED_FILE:ADDED` and `DOWNLOADED_FILE:REMOVED`. The renderer applies them to its downloaded-file map after 200 ms without new events.
- Main and loading windows use a sandboxed preload, context isolation, and disabled Node integration.
- The old global and prototype-extension pattern is gone. `src/main/Global/` provides explicit module exports for constants and state accessors.
- `@electron/remote`, jQuery, and Font Awesome are not part of the renderer boundary.

### Desktop persistence

- The main process stores desktop state in SQLite through Electron's built-in `node:sqlite`.
- Each library uses `<library>/.songbasket.db`.
- SQLite enables WAL mode and uses `PRAGMA user_version` migrations.
- Targeted writes run in transactions and preserve relational state.
- If `.songbasket.db` does not exist, the app imports `.songbasket` once.
- The importer writes `.songbasket.db.importing`, reads the database back, and compares the result.
- A successful import renames the temporary database to `.songbasket.db`.
- The legacy `.songbasket` file stays untouched. It remains the recovery source until the user removes it.

## Open migration direction

### API rewrite

- Rework the API from the ground up instead of treating the Express implementation as a required foundation.
- Use the existing routes to discover product needs, not to freeze the new HTTP contract.
- Design authentication, request and response types, errors, and external service boundaries explicitly.
- Update desktop consumers and the API contract together.
- Remove obsolete endpoints and client paths after the replacement works.
- Do not retain compatibility layers unless the task requires them.
- Keep Spotify and YouTube credentials outside renderer code and committed files.

No replacement API framework or deployment platform is agreed yet.

### Backend database

The legacy backend uses PostgreSQL separately. Its database design, driver, schema, and final migration plan are not agreed.

## Current code map

| Path                                                                         | Current responsibility                                                                         |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/main/index.ts`, `src/main/bootstrap.ts`, `src/main/environment-init.ts` | Electron startup, environment setup, windows, and lifecycle                                    |
| `src/main/controllers/InitializationAndHandlers/`                            | Application orchestration, authentication, IPC handlers, connections, and API requests         |
| `src/main/controllers/FileSystem/`                                           | Library folders, filesystem watchers, MP3 tags, and downloaded-file reconciliation             |
| `src/main/controllers/DownloadPhase/`, `src/main/utils/binaries.ts`          | Local downloads, audio processing, and binary management                                       |
| `src/main/Store/`                                                            | Main-process application state and persistence command forwarding                              |
| `src/main/persistence/`                                                      | SQLite sessions, relational repositories, legacy import, migrations, snapshots, and file links |
| `src/main/Global/`                                                           | Explicit main-process constants and state accessors                                            |
| `src/main/queryMaker.ts`                                                     | Track queries for YouTube matching                                                             |
| `src/main/utils/credentials.ts`                                              | Session persistence through Electron `safeStorage`                                             |
| `src/preload/index.ts`                                                       | Sandboxed typed IPC bridge                                                                     |
| `src/shared/`                                                                | Shared IPC and domain contracts                                                                |
| `src/renderer/`                                                              | Vue 3 UI, Vue Router 4 hash routes, composable state service, and components                   |
| `src/@types/`                                                                | Domain types and renderer declarations                                                         |
| `backend/src/index.js`, `backend/src/routes/`, `backend/src/controllers/`    | Legacy Express API, Spotify OAuth, YouTube matching, and PostgreSQL access                     |
| `electron.vite.config.ts`, `electron-builder.yml`                            | Desktop bundle and packaging configuration                                                     |

`backend/` is a Git submodule with its own manifest and lockfile. It is not a root package workspace.
Root dependency installation does not install backend dependencies.
Treat its repository boundary explicitly during cross-project changes.

The desktop app uses `https://api.songbasket.com` by default.
The API starts Spotify OAuth and returns to Electron through `songbasket://auth`.
The legacy endpoints include `/me`, `/user/:user_id/playlists`, `/playlists/:playlist_id`, `/youtubize`, and `/video/:ids`.

## Data and local artifacts

- `<selected library folder>/.songbasket.db` stores the current relational desktop state.
- `<selected library folder>/.songbasket` is the legacy JSON source for one-time import.
- `<selected library folder>/.songbasket.db.importing` is the temporary database used during import.
- The importer verifies the database readback before it replaces the temporary path.
- The importer keeps `.songbasket` untouched after success or failure.
- `.songbasket-folders` in the app support directory records known library folders and the selected folder.
- `credentials.json` in the app support directory contains session values encrypted through Electron `safeStorage`.
- Development uses `APPLICATION_SUPPORT/`. Packaged builds use Electron's `app.getPath('userData')`.
- App support also contains downloaded binaries, version metadata, temporary files, and logs.
- MP3 tags contain Spotify and YouTube IDs. Filesystem watchers use those IDs to reconcile downloads with application state.
- Some playlist files use hard links. The filesystem library is not disposable cache.
- `out/` and `release/` contain build output. Edit source files, not generated bundles or packaged apps.

Do not delete user libraries, saved state, credentials, or local support data as a cleanup shortcut.
Use temporary library folders for destructive scenarios. Legacy playlist unsync can recursively delete a playlist directory.
Do not print secrets or copy local credentials into documentation, fixtures, or logs.
Use mise configuration for environment values. Do not create `.env` files, despite the backend's legacy dotenv usage.

## Current tooling and checks

`mise.toml` defines these tools and tasks:

| Command                       | Current behavior                                               |
| ----------------------------- | -------------------------------------------------------------- |
| `mise install`                | Installs Node 24 and Bun 1                                     |
| `mise run install`            | Installs root dependencies and the Electron binary through Bun |
| `mise run dev`                | Runs the app with hot reload                                   |
| `mise run preview`            | Builds and runs the app as it ships                            |
| `mise run test`               | Bundles and runs every `tests/*.test.ts` file                  |
| `mise run typecheck:main`     | Typechecks the main process                                    |
| `mise run typecheck:preload`  | Typechecks the preload bridge and shared contracts             |
| `mise run typecheck:renderer` | Typechecks the renderer                                        |
| `mise run typecheck`          | Runs the main, preload, shared, and renderer typechecks        |
| `mise run format`             | Formats source and configuration files                         |
| `mise run format:check`       | Checks source and configuration formatting                     |
| `mise run lint`               | Runs ESLint and the formatting check                           |
| `mise run lint:fix`           | Runs ESLint fixes and formats source files                     |
| `mise run build`              | Bundles the main process and renderer into `out/`              |
| `mise run pack`               | Bundles and packages an unsigned local app                     |
| `mise run dist`               | Bundles and packages distributables for the current platform   |

The root package also provides matching Bun scripts for development, typechecking, testing, linting, formatting, packaging, and publishing.
The backend's `npm start` command runs `nodemon src/index.js`. Its `npm run dev` command delegates to `npm start`.
Backend startup depends on external configuration and PostgreSQL, and it can start Telegram polling.
Do not start it casually against production services or credentials.
Desktop startup can contact the API and download or update `yt-dlp` and `ffmpeg` binaries.

- Run the checks that cover the changed surface.
- Report pre-existing failures separately from regressions. Do not claim unrun checks passed.
- For behavior changes, run the affected application flow in addition to static checks.
- For UI changes, inspect the actual Electron renderer. `REMOTE_DEBUGGING_PORT=9333 mise run dev` exposes its debugging endpoint.
- For persistence changes, exercise import, restart, and data recovery with temporary data.
- For API changes, exercise the new contract through its desktop consumer or a local request.
- Keep tests focused on behavior and data integrity, not legacy implementation details.
- If missing credentials or unavailable services prevent a check, document the blocker.
