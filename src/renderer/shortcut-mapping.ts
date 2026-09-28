import { P, match } from 'ts-pattern'

export type ShortcutInput = {
  key: string
  code: string
  command: boolean
  shift: boolean
}

export type ShortcutAction =
  | 'back'
  | 'forward'
  | 'download-current-playlist'
  | 'navigate-downloads'
  | 'refresh'
  | 'navigate-playlists'
  | 'navigate-tracks'
  | 'toggle-debug-outlines'
  | 'focus-search'

const BACK: ShortcutAction = 'back'
const FORWARD: ShortcutAction = 'forward'
const DOWNLOAD_CURRENT_PLAYLIST: ShortcutAction = 'download-current-playlist'
const NAVIGATE_DOWNLOADS: ShortcutAction = 'navigate-downloads'
const REFRESH: ShortcutAction = 'refresh'
const NAVIGATE_PLAYLISTS: ShortcutAction = 'navigate-playlists'
const NAVIGATE_TRACKS: ShortcutAction = 'navigate-tracks'
const TOGGLE_DEBUG_OUTLINES: ShortcutAction = 'toggle-debug-outlines'
const FOCUS_SEARCH: ShortcutAction = 'focus-search'

const isAlphanumericCode = (code: string): boolean =>
  /^(Key[A-Z]|Digit[0-9]|Numpad[0-9])$/.test(code)

export const shortcutFor = (input: ShortcutInput): ShortcutAction | undefined =>
  match(input)
    .with({ code: 'BracketLeft', command: true }, () => BACK)
    .with({ code: 'BracketRight', command: true }, () => FORWARD)
    .with(
      { code: 'KeyD', command: true, shift: true },
      () => DOWNLOAD_CURRENT_PLAYLIST
    )
    .with({ code: 'KeyD', command: true }, () => NAVIGATE_DOWNLOADS)
    .with({ code: 'KeyR', command: true, shift: true }, () => REFRESH)
    .with({ code: 'KeyP', command: true }, () => NAVIGATE_PLAYLISTS)
    .with({ code: 'KeyT', command: true }, () => NAVIGATE_TRACKS)
    .with({ code: 'Slash', command: true }, () => TOGGLE_DEBUG_OUTLINES)
    .with({ code: 'Backspace', command: false }, () => FOCUS_SEARCH)
    .with(
      { code: P.when(isAlphanumericCode), command: false },
      () => FOCUS_SEARCH
    )
    .otherwise(() => undefined)
