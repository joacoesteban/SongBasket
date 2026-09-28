# SongBasket

## Project status

SongBasket is an Electron desktop app that downloads Spotify playlists as MP3 files.
The API handles Spotify authentication and YouTube matching. The desktop app downloads and processes audio locally with `yt-dlp` and `ffmpeg`.

This project is being revived from a neglected state. Expect substantial changes.
Existing code, dependencies, architecture, documentation, and tests are historical context, not authoritative design requirements.
A working legacy implementation does not make its design worth keeping.

- Use the migration direction below to guide changes.
- Read the relevant implementation before replacing it.
- Preserve useful product behavior and user data, not accidental complexity.
- Keep each task within its requested scope. Do not start every migration during unrelated work.
- Distinguish current behavior, agreed direction, and unresolved decisions in proposals and reports.
- Update this file as migrations replace the legacy structure and commands.

## Agreed migration direction

### Bun

- Move dependency management and applicable scripts and services to Bun.
- Keep `mise` as the entry point for tools, tasks, and local environment configuration.
- Update manifests, lockfiles, `mise.toml`, and documented commands together during the cutover.
- Remove obsolete package-manager files after their consumers migrate.
- Do not assume Bun replaces Electron's embedded Node.js runtime.
- Check Electron installation, native dependencies, and packaging under the new tooling.

### Vue 3

- Replace Vue 2.7 with Vue 3.
- Migrate the renderer entry point, components, router, state integration, build plugin, lint configuration, and type declarations together.
- Do not extend Vue 2-specific patterns as the long-term design.
- Treat Vuex, jQuery, global Vue instance mutation, and custom router helpers as legacy choices, not requirements.
- Select replacement state patterns from actual needs. No replacement state library is agreed yet.

### Strict TypeScript

- Use strict TypeScript across the main process, renderer, shared contracts, and rewritten API.
- Do not introduce `any`, unchecked assertions, or suppression comments to bypass missing types.
- Use `unknown` for untrusted input until runtime checks establish its shape.
- Define explicit contracts for HTTP, IPC, persistence, and external service responses.
- Keep compiler and lint rules strict. Do not weaken them to hide migration errors.
- Prefer small functions, immutable data, and explicit results over mutable globals and prototype extensions.

The shared compiler configuration already sets `strict: true`, but the migration is incomplete.
Explicit `any` remains in source. The backend is JavaScript, and the normal mise typecheck covers only the main process.
The existing configuration is not the target level of type safety.

### SQLite

- Replace the large desktop JSON state file with SQLite.
- Model the data and its relationships. Do not relocate the whole JSON document into one database column.
- Define a schema and versioned migrations with transactional writes.
- Provide an import path for existing `.songbasket` files before replacing their reader.
- Keep the original data recoverable until the import passes its checks.
- Stop legacy writers before importing their state.
- Preserve playlist membership, sync choices, track selections, custom matches, and links to downloaded files.
- Keep database access outside the renderer.
- Choose a driver compatible with the process that runs it. Bun tooling does not make `bun:sqlite` available inside Electron.

The JSON replacement concerns desktop state. The legacy backend uses PostgreSQL separately.
The backend database design, SQLite driver, schema, and final database location are not yet agreed.

### API rewrite

- Rework the API from the ground up instead of treating the Express implementation as a required foundation.
- Use the existing routes to discover product needs, not to freeze the new HTTP contract.
- Design authentication, request and response types, errors, and external service boundaries explicitly.
- Update desktop consumers and the API contract together.
- Remove obsolete endpoints and client paths after the replacement works.
- Do not retain compatibility layers unless the task requires them.
- Keep Spotify and YouTube credentials outside renderer code and committed files.

No replacement API framework or deployment platform is agreed yet.

## Legacy code map

These paths describe the repository before the migrations, not the required future layout.

| Path | Current responsibility |
| --- | --- |
| `src/main/index.ts`, `src/main/environment-init.ts`, `src/main/bootstrap.ts` | Electron startup, global setup, windows, IPC, and binary setup |
| `src/main/controllers/InitializationAndHandlers/` | Application orchestration, authentication, IPC routes, and API requests |
| `src/main/controllers/InitializationAndHandlers/sbFetch.ts`, `src/main/Global/PATHS.ts` | Desktop API client and endpoint paths |
| `src/main/Store/mainProcessStore.ts` | In-memory state and JSON persistence |
| `src/main/controllers/FileSystem/` | Library folders, saved state, MP3 tags, and filesystem watchers |
| `src/main/controllers/DownloadPhase/`, `src/main/utils/binaries.ts` | Local downloads, audio processing, and binary management |
| `src/main/queryMaker.ts` | Track queries for YouTube matching |
| `src/main/utils/credentials.ts` | Session persistence through Electron `safeStorage` |
| `src/renderer/` | Vue 2.7 UI, Vue Router 3, Vuex 3, renderer controllers, and IPC integration |
| `src/@types/` | Domain types, shared declarations, and legacy global extensions |
| `backend/src/index.js`, `backend/src/routes/`, `backend/src/controllers/` | Legacy Express API, Spotify OAuth, YouTube matching, and PostgreSQL access |
| `electron.vite.config.ts`, `electron-builder.yml` | Desktop builds and packaging |

`backend/` is a Git submodule with its own manifest and lockfile. It is not currently a root package workspace.
Root dependency installation does not install backend dependencies.
Treat its repository boundary explicitly during cross-project changes.

The desktop app currently uses `https://api.songbasket.com` by default.
The API starts Spotify OAuth and returns to Electron through `songbasket://auth`.
The legacy endpoints include `/me`, `/user/:user_id/playlists`, `/playlists/:playlist_id`, `/youtubize`, and `/video/:ids`.

The main process owns the library, API calls, downloads, and disk writes.
The renderer receives state and progress through IPC.
Main and loading windows currently enable Node integration and disable context isolation.
The renderer uses `@electron/remote` and `window.require` shims. These are security debt, not patterns to copy.
A replacement renderer boundary needs a narrow, typed preload interface rather than unrestricted Node access.

## Data and local artifacts

- `<selected home folder>/.songbasket` stores the large JSON state described by `SongBasketSaveFile` in `src/@types/SongBasket.ts`.
- That state includes user data, playlists, sync queues, caches, converted tracks, selections, and sync progress.
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

These commands describe the current setup. They do not indicate that the migrations are complete.

| Command | Current behavior |
| --- | --- |
| `mise install` | Installs Node 24 and Bun from `mise.toml` |
| `mise run install` | Installs root dependencies through Bun |
| `mise run dev` | Runs Electron with the Vite development server |
| `mise run build` | Bundles the main process and renderer into `out/` |
| `mise run typecheck` | Checks main-process types only |
| `mise run typecheck:renderer` | Checks renderer types separately |
| `mise run lint` | Runs ESLint with the current legacy rules |
| `mise run pack` | Builds and packages an unsigned local app in `release/` |
| `mise run dist` | Builds distributables for the current platform |

The root package script `typecheck` includes both main and renderer checks, unlike the mise task.
The README records existing renderer type errors and lint errors. Those counts are historical, not a current baseline.
Neither package currently defines a `test` script.
`backend/test.js` expects a Heroku starter page rather than the current API contract.
Do not use that test as evidence that SongBasket works.

The backend's `npm start` command runs `nodemon src/index.js`. Its `npm run dev` command delegates to `npm start`.
Its old Node engine and deployment files do not define the target runtime.
Backend startup depends on external configuration and PostgreSQL, and it can start Telegram polling.
Do not start it casually against production services or credentials.
Desktop startup can also contact the API and download or update `yt-dlp` and `ffmpeg` binaries.

- Run the checks that cover the changed surface.
- Report pre-existing failures separately from regressions. Do not claim unrun checks passed.
- For behavior changes, run the affected application flow in addition to static checks.
- For UI changes, inspect the actual Electron renderer. `REMOTE_DEBUGGING_PORT=9333 mise run dev` exposes its debugging endpoint.
- For persistence changes, exercise import, restart, and data recovery with temporary data.
- For API changes, exercise the new contract through its desktop consumer or a local request.
- Keep tests focused on behavior and data integrity, not legacy implementation details.
- If missing credentials or unavailable services prevent a check, document the blocker.
