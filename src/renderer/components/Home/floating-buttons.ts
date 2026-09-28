import type { AppErrorDto } from '../../../shared/ipc'

export type FloatingButtonsInput = {
  loading: boolean
  loadingTarget: string | undefined
  internet: boolean
  api: boolean
  ffmpeg: boolean
  queuedPlaylists: number
  syncedPlaylists: number
  dev: boolean
  errorPill: boolean
}

export type FloatingButtonsVisibility = {
  refresh: boolean
  sync: boolean
  download: boolean
  dropdown: boolean
}

export type ErrorPill = {
  message: string
  hideAfterMs: number
}

export const floatingButtons = (
  input: FloatingButtonsInput
): FloatingButtonsVisibility => {
  if (input.errorPill) {
    return {
      refresh: false,
      sync: false,
      download: false,
      dropdown: false
    }
  }

  const fullConnection = input.internet && input.api
  return {
    refresh: !input.loading && fullConnection,
    sync:
      !input.loading &&
      fullConnection &&
      (input.queuedPlaylists > 0 || input.syncedPlaylists > 0),
    download:
      (!input.loading || input.loadingTarget === 'DOWNLOAD') &&
      input.syncedPlaylists > 0 &&
      input.internet &&
      input.ffmpeg,
    dropdown: input.dev
  }
}

export const connectionErrorPill = (input: {
  internet: boolean
  api: boolean
}): ErrorPill | null => {
  if (input.internet && input.api) return null

  let message = 'Check your connection'
  if (input.internet) {
    message = 'SongBasket servers are experiencing connection issues'
  }
  return { message, hideAfterMs: 10_000 }
}

export const appErrorPill = (error: AppErrorDto): ErrorPill => ({
  message: error.message,
  hideAfterMs: 4_000
})
