# SongBasket

> Download your Spotify Playlists as MP3

Electron desktop app. The main process talks to the SongBasket backend
(`https://api.songbasket.com`), which owns the Spotify OAuth flow and the
YouTube matching. Downloads run locally through `yt-dlp` and `ffmpeg`.

The API source is included as a Git submodule in `backend/`. Initialize it
after cloning:

```bash
git submodule update --init --recursive
```

## Requirements

[mise](https://mise.jdx.dev) provides Node and Yarn. Everything else installs
into the project.

```bash
mise install
mise run install
```

`yt-dlp` and `ffmpeg` are not project dependencies. The app downloads the
binary for the current platform on first boot, from the latest GitHub release
of `yt-dlp/yt-dlp` and `eugeneware/ffmpeg-static`, into the app support
directory. It compares release ids on every boot and re-downloads on change.

## Tasks

```bash
mise run dev          # vite dev server + electron, hot reload
mise run build        # bundle main and renderer into out/
mise run pack         # unsigned .app in release/, for local testing
mise run dist         # distributables for the current platform
mise run typecheck    # main process
mise run lint         # eslint across the repo
```

`REMOTE_DEBUGGING_PORT=9333 mise run dev` exposes the renderer over the Chrome
DevTools Protocol, which is how the window can be inspected without attaching
a debugger by hand.

## Layout

| Path | What |
| --- | --- |
| `src/main` | Main process: boot, IPC routes, store, download pipeline, filesystem watchers |
| `src/renderer` | Vue 2.7 app: router, Vuex store, components |
| `src/@types` | Shared types and global declarations |
| `backend` | API source (Git submodule) |
| `electron.vite.config.ts` | Build config for both bundles |
| `electron-builder.yml` | Packaging and publishing |

State lives in two places: a `.songbasket` file inside the selected home
folder, and `.songbasket-folders` plus the downloaded binaries in the app
support directory (`app.getPath('userData')` when packaged, `APPLICATION_SUPPORT/`
in development).

## Renderer node integration

Both windows still run with `nodeIntegration: true` and
`contextIsolation: false`. Vite would try to bundle `electron` and
`@electron/remote` for the browser, so both are aliased to shims in
`src/renderer/shims` that reach the real modules through `window.require`.

Moving the renderer behind a preload bridge removes the shims, the alias
entries and `@electron/remote` in one go.

## Known debt

- The renderer was mid-TypeScript-migration when work stopped.
  `vue-tsc --noEmit -p tsconfig.renderer.json` reports roughly 745 errors,
  almost all missing annotations in `.vue` files. The renderer builds and runs;
  only `mise run typecheck` (main process) is enforced.
- `eslint` reports ~74 errors in legacy code, mostly `no-return-assign`,
  `no-useless-catch` and unused Vue components.
- Sessions were stored with `keytar`, which is archived. Credentials now use
  Electron's `safeStorage` in `credentials.json`, so existing installs need to
  log in once more.
- `fluent-ffmpeg` is unmaintained upstream but still drives extraction progress.
