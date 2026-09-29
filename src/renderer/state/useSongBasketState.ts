import { match } from 'ts-pattern'
import {
  type ComputedRef,
  type DeepReadonly,
  type InjectionKey,
  type Ref,
  computed,
  inject,
  readonly,
  shallowRef
} from 'vue'

import { applyDownloadEvent } from '../../shared/download-progress'
import {
  withDownloadedFile,
  withoutDownloadedFile
} from '../../shared/downloaded-tracks'
import type {
  AppErrorDto,
  AppStatusDto,
  DownloadEvent,
  DownloadStartItem,
  DownloadedFileDto,
  LoadingSnapshot,
  SongBasketStateDto,
  StatePatchEvent,
  TrackListDto
} from '../../shared/ipc'

const stateRef = shallowRef<SongBasketStateDto | null>(null)
const statusRef = shallowRef<AppStatusDto | null>(null)
const downloadedTracksRef = shallowRef<TrackListDto | null>(null)
const loadingRef = shallowRef<LoadingSnapshot>({
  value: false,
  target: undefined
})
const errorRef = shallowRef<AppErrorDto | null>(null)
const connectedToInternetRef = shallowRef(false)
const connectedToApiRef = shallowRef(false)
const ffmpegBinariesDownloadedRef = shallowRef(false)
const downloadItemsRef = shallowRef<DownloadStartItem[]>([])
const downloadEventRef = shallowRef<DownloadEvent | null>(null)
const downloadActiveRef = shallowRef(false)
type DownloadedFileChange = {
  type: 'added' | 'removed'
  file: DownloadedFileDto
}

const PENDING_DOWNLOADED_FILE_CHANGES: DownloadedFileChange[] = []
let downloadedFileTimer: ReturnType<typeof setTimeout> | undefined

const applyDownloadedFileChanges = (
  tracks: TrackListDto,
  changes: readonly DownloadedFileChange[]
): TrackListDto =>
  changes.reduce(
    (current, change) =>
      match(change.type)
        .with('added', () => withDownloadedFile(current, change.file))
        .with('removed', () => withoutDownloadedFile(current, change.file))
        .exhaustive(),
    tracks
  )

const consumeDownloadedFileChanges = (
  tracks: TrackListDto | null
): TrackListDto | null => {
  const changes = PENDING_DOWNLOADED_FILE_CHANGES.splice(0)
  if (downloadedFileTimer !== undefined) {
    clearTimeout(downloadedFileTimer)
    downloadedFileTimer = undefined
  }
  if (changes.length === 0) return tracks
  return applyDownloadedFileChanges(tracks ?? {}, changes)
}

const queueDownloadedFileChange = (change: DownloadedFileChange): void => {
  PENDING_DOWNLOADED_FILE_CHANGES.push(change)
  if (downloadedFileTimer !== undefined) clearTimeout(downloadedFileTimer)
  downloadedFileTimer = setTimeout(() => {
    downloadedTracksRef.value = consumeDownloadedFileChanges(
      downloadedTracksRef.value
    )
  }, 200)
}

const errorFromUnknown = (value: unknown): AppErrorDto => {
  if (value instanceof Error) {
    const result: AppErrorDto = {
      name: value.name,
      message: value.message
    }
    if (value.stack !== undefined) result.stack = value.stack
    return result
  }
  if (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    'message' in value
  ) {
    const name = value.name
    const message = value.message
    if (typeof name === 'string' && typeof message === 'string') {
      return { name, message }
    }
  }
  return { name: 'Error', message: String(value) }
}

const applyStatus = (status: AppStatusDto): void => {
  statusRef.value = status
  stateRef.value = status.state
  downloadedTracksRef.value = consumeDownloadedFileChanges(
    status.downloadedTracks
  )
  connectedToInternetRef.value = status.CONNECTED_TO_INTERNET
  connectedToApiRef.value = status.CONNECTED_TO_API
  ffmpegBinariesDownloadedRef.value = status.FFMPEG_BINS_DOWNLOADED
  errorRef.value = status.error
}

const applyPatch = (patch: StatePatchEvent): void => {
  const current = stateRef.value
  if (current === null) return
  switch (patch.key) {
    case 'user':
      stateRef.value = { ...current, user: patch.value }
      return
    case 'playlists':
      stateRef.value = { ...current, playlists: patch.value }
      return
    case 'syncedPlaylists':
      stateRef.value = { ...current, syncedPlaylists: patch.value }
      return
    case 'queuedPlaylists':
      stateRef.value = { ...current, queuedPlaylists: patch.value }
      return
    case 'cachedPlaylists':
      stateRef.value = { ...current, cachedPlaylists: patch.value }
      return
    case 'deletedPlaylists':
      stateRef.value = { ...current, deletedPlaylists: patch.value }
      return
    case 'convertedTracks':
      stateRef.value = { ...current, convertedTracks: patch.value }
      return
    case 'currentPlaylist':
      stateRef.value = { ...current, currentPlaylist: patch.value }
      return
    case 'control':
      stateRef.value = { ...current, control: patch.value }
      return
    case 'lastSync':
      stateRef.value = { ...current, lastSync: patch.value }
      return
  }
}

const refreshStatus = (): void => {
  void window.songbasket
    .invoke('GET_STATUS')
    .then(applyStatus, (error: unknown) => {
      errorRef.value = errorFromUnknown(error)
    })
}

type ReadonlyRef<Value> = Readonly<Ref<DeepReadonly<Value>>>

export type SongBasketStateService = {
  status: ReadonlyRef<AppStatusDto | null>
  state: ReadonlyRef<SongBasketStateDto | null>
  downloadedTracks: ReadonlyRef<TrackListDto | null>
  loading: ReadonlyRef<LoadingSnapshot>
  error: ReadonlyRef<AppErrorDto | null>
  connectedToInternet: ReadonlyRef<boolean>
  connectedToApi: ReadonlyRef<boolean>
  ffmpegBinariesDownloaded: ReadonlyRef<boolean>
  downloadItems: ReadonlyRef<DownloadStartItem[]>
  downloadEvent: ReadonlyRef<DownloadEvent | null>
  downloadActive: ReadonlyRef<boolean>
  isConnected: ComputedRef<boolean>
  refreshStatus: () => void
  dispose: () => void
}

export const songBasketStateKey: InjectionKey<SongBasketStateService> =
  Symbol('songbasket-state')

export const createSongBasketState = (): SongBasketStateService => {
  const unsubs = [
    window.songbasket.on('STATUS:SET', refreshStatus),
    window.songbasket.on('FFMPEG_BINS_DOWNLOADED', ({ value }) => {
      ffmpegBinariesDownloadedRef.value = value
    }),
    window.songbasket.on('LOADING_EVENT', (snapshot) => {
      loadingRef.value = snapshot
    }),
    window.songbasket.on('ERROR:CATCH', ({ error }) => {
      errorRef.value = error
    }),
    window.songbasket.on('CONNECTION:CHANGE', (value) => {
      connectedToInternetRef.value = value
    }),
    window.songbasket.on('API_CONNECTION:CHANGE', (value) => {
      connectedToApiRef.value = value
    }),
    window.songbasket.on('DOWNLOADED_FILE:ADDED', (file) => {
      queueDownloadedFileChange({ type: 'added', file })
    }),
    window.songbasket.on('DOWNLOADED_FILE:REMOVED', (file) => {
      queueDownloadedFileChange({ type: 'removed', file })
    }),
    window.songbasket.on('STATE:SNAPSHOT', ({ state }) => {
      stateRef.value = state
    }),
    window.songbasket.on('STATE:PATCH', applyPatch),
    window.songbasket.on('DOWNLOAD:START', (items) => {
      downloadItemsRef.value = items
      downloadActiveRef.value = true
    }),
    window.songbasket.on('DOWNLOAD:EVENT', (event) => {
      downloadEventRef.value = event
      downloadItemsRef.value = applyDownloadEvent(downloadItemsRef.value, event)
    }),
    window.songbasket.on('DOWNLOAD:END', () => {
      downloadActiveRef.value = false
    })
  ]

  refreshStatus()

  return {
    status: readonly(statusRef),
    state: readonly(stateRef),
    downloadedTracks: readonly(downloadedTracksRef),
    loading: readonly(loadingRef),
    error: readonly(errorRef),
    connectedToInternet: readonly(connectedToInternetRef),
    connectedToApi: readonly(connectedToApiRef),
    ffmpegBinariesDownloaded: readonly(ffmpegBinariesDownloadedRef),
    downloadItems: readonly(downloadItemsRef),
    downloadEvent: readonly(downloadEventRef),
    downloadActive: readonly(downloadActiveRef),
    isConnected: computed(
      () => connectedToInternetRef.value && connectedToApiRef.value
    ),
    refreshStatus,
    dispose: () => {
      unsubs.forEach((unsubscribe) => unsubscribe())
      clearTimeout(downloadedFileTimer)
      downloadedFileTimer = undefined
      PENDING_DOWNLOADED_FILE_CHANGES.splice(0)
    }
  }
}

export const useSongBasketState = (): SongBasketStateService => {
  const state = inject(songBasketStateKey)
  if (state === undefined) {
    throw new Error('SongBasket state is not provided')
  }
  return state
}
