# SongBasket

> Download your Spotify Playlists as MP3

SongBasket is an Electron desktop app. The main process talks to the SongBasket
backend (`https://api.songbasket.com`), which owns the Spotify OAuth flow and
YouTube matching. Downloads run locally through `yt-dlp` and `ffmpeg`.

The API source is included as a Git submodule in `backend/`. Initialize it
after cloning:

```bash
git submodule update --init --recursive
```

## Requirements

[mise](https://mise.jdx.dev) provides Node 24 and Bun 1. Bun manages the root
dependencies through `bun.lock`.

```bash
mise install
mise run install
```

`yt-dlp` and `ffmpeg` are not project dependencies. The app downloads the
binary for the current platform on first boot, from the latest GitHub release
of `yt-dlp/yt-dlp` and `eugeneware/ffmpeg-static`, into the app support
directory. It compares release IDs on every boot and downloads a new binary
when the ID changes.

## Tasks

Run the development app with hot reload:

```bash
mise run dev
```

Use these tasks for local checks and builds:

```bash
mise run preview       # build and run the app as it ships
mise run test          # bundle and run SQLite persistence tests
mise run typecheck     # main, preload, shared contracts, and renderer
mise run lint          # ESLint and the formatting check
mise run format        # format source and configuration files
mise run format:check  # check source and configuration formatting
mise run build         # bundle main and renderer into out/
mise run pack          # unsigned local app in release/
mise run dist          # distributables for the current platform
```

`mise run lint:fix` runs ESLint fixes and formats source files. Use
`mise run typecheck:main`, `mise run typecheck:preload`, and
`mise run typecheck:renderer` to run one typecheck project.

`REMOTE_DEBUGGING_PORT=9333 mise run dev` exposes the renderer over the Chrome
DevTools Protocol. Use this endpoint to inspect the window without attaching a
debugger by hand.

## Layout

| Path | What |
| --- | --- |
| `src/main` | Main process: boot, controllers, API calls, persistence, downloads, and filesystem watchers |
| `src/preload` | Sandboxed typed IPC bridge |
| `src/shared` | Typed IPC and domain contracts shared by process bundles |
| `src/renderer` | Vue 3 app: Vue Router 4 hash routes, composable state service, and components |
| `src/main/persistence` | SQLite state, migrations, targeted writes, file links, and legacy import |
| `src/@types` | Domain types and renderer declarations |
| `backend` | Legacy API source (Git submodule) |
| `electron.vite.config.ts` | Build config for main, preload, and renderer bundles |
| `electron-builder.yml` | Packaging and publishing |

## Desktop state

The main process stores the current desktop state in SQLite at
`<selected library folder>/.songbasket.db`. SQLite uses WAL mode and
versioned migrations. Targeted writes use transactions.

When the database does not exist, the app imports the legacy JSON file at
`<selected library folder>/.songbasket`. The importer writes
`.songbasket.db.importing`, reads the database back, and compares the result
before it renames the temporary database to `.songbasket.db`. It keeps the
legacy file untouched.

The app support directory stores `.songbasket-folders`, encrypted session
credentials, downloaded binaries, version metadata, temporary files, and logs.
Packaged builds use Electron's `app.getPath('userData')`. Development uses
`APPLICATION_SUPPORT/`.

## Process boundary

The main and loading windows use a sandboxed preload with
`nodeIntegration: false` and `contextIsolation: true`. The preload exposes
`window.songbasket`, which provides typed IPC invoke and event functions.
The renderer does not use Node access, `@electron/remote`, jQuery, or Font
Awesome.

## Known debt

- The API rewrite is not complete. The backend remains the legacy Express API.
- No replacement API framework or deployment platform is agreed yet.
- The backend still uses PostgreSQL. Its database design, driver, schema, and
  final migration plan are not agreed.
- `fluent-ffmpeg` is unmaintained upstream but still drives extraction
  progress.
