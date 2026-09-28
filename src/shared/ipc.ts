import type {
  SpotifyPlaylist,
  SpotifyPlaylistId,
  SpotifyTrack,
  SpotifyTrackId,
  SpotifyUser
} from '../@types/Spotify'
import type { YouTubeResultId } from '../@types/YouTube'
import type {
  SongBasketTrackConversionSelection,
  SongBasketTrackQuery
} from './songbasket'

export type RuntimePlatform =
  | 'aix'
  | 'android'
  | 'cygwin'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'netbsd'
  | 'openbsd'
  | 'sunos'
  | 'win32'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export type AppErrorDto = {
  name: string
  message: string
  stack?: string
  status?: number
  data?: JsonValue
}

export type SongBasketTrackDto = {
  id: string
  data: SpotifyTrack
  playlists: { id: SpotifyPlaylistId }[]
  conversion: TrackConversionDto | null
  selection: SongBasketTrackConversionSelection
  custom: YouTubeResultDto | null
  query?: SongBasketTrackQuery | null
  flags: {
    converted: boolean
    conversionError: boolean
    processed: boolean
    paused: boolean
    selectionIsApplied: boolean
  }
  duration: number | null
}

export type TrackConversionDto = {
  id: string
  yt: YouTubeResultDto[]
  nameTokens: { str: string; regex: string }[]
  bestMatch: string
}

export type YouTubeResultDto = {
  id: string
  duration: number
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: Record<string, { url: string; width: number; height: number }>
    channelTitle: string
    tags: string[]
    categoryId: string
    liveBroadcastContent: string
    localized: { title: string; description: string }
  }
  youtube_id: string
  nameFormatted: string
  nameTokensMap: boolean[]
  matchedTokensCount: number
  durationDiff: number
  durationScore: number
  wordScore: number
  isDoubtlyConversion: boolean
  isBestMatch: boolean
  isCustomTrack?: boolean
}

export type SongBasketStateDto = {
  user: SpotifyUser
  playlists: SpotifyPlaylist[]
  syncedPlaylists: SpotifyPlaylistId[]
  queuedPlaylists: SpotifyPlaylistId[]
  cachedPlaylists: {
    id: SpotifyPlaylistId
    time: number
    snapshot_id: string
  }[]
  deletedPlaylists: SpotifyPlaylist[]
  convertedTracks: SongBasketTrackDto[]
  currentPlaylist: SpotifyPlaylistId | null
  control: { total: number; offset: number }
  lastSync: string | null
}

export type DownloadedFileDto = {
  spotify_id: string | null
  youtube_id: string | null
  playlist: string
}

export type TrackListDto = Record<
  SpotifyTrackId,
  Record<string, { playlists: string[] }>
>

export type FoldersDto = {
  paths: string[]
  selected: string | null
}

export type AppStatusStateDto = {
  IS_LOGGED: boolean
  FOLDERS: FoldersDto
  UPDATES: {
    updateError: AppErrorDto | null
    updateAvailable: boolean
    updateVersion: string | null
    downloadInProgress: boolean
    downloadPtg: number
    updateDownloaded: boolean
  }
}

export type AppStatusDto = {
  APP_STATUS: AppStatusStateDto
  appVersion: string
  state: SongBasketStateDto | null
  downloadedTracks: TrackListDto | null
  FFMPEG_BINS_DOWNLOADED: boolean
  CONNECTED_TO_INTERNET: boolean
  CONNECTED_TO_API: boolean
  error: AppErrorDto | null
}

export type HomeFolderAskResponse = {
  isLogged: boolean
  error: AppErrorDto | null
}

export type YoutubeDetailsRequest = {
  url: string
  trackId: SpotifyTrackId
}

export type TrackSelectionRequest = {
  trackId: SpotifyTrackId
  newId: YouTubeResultId | null
}

export type DownloadStartItem = {
  id: string
  info: {
    download: {
      ptg: number
      finished: boolean
      error: AppErrorDto | null
      size: number
      currentSize: number
    }
    extraction: {
      ptg: number
      finished: boolean
      error: AppErrorDto | null
    }
    tags: {
      finished: boolean
      error: AppErrorDto | null
    }
    currentStatus: string
    ptg: number
    finished: boolean
  }
}

export type DownloadEvent = {
  type:
    | 'download:start'
    | 'download:progress'
    | 'download:error'
    | 'download:end'
    | 'extraction:start'
    | 'extraction:progress'
    | 'extraction:error'
    | 'extraction:end'
    | 'tags:start'
    | 'tags:progress'
    | 'tags:error'
    | 'tags:end'
  id: string
  ptg?: number
}

export type StatePatchEvent = {
  [Key in keyof SongBasketStateDto]: {
    key: Key
    value: SongBasketStateDto[Key]
  }
}[keyof SongBasketStateDto]

export type RendererErrorEvent = {
  type?: string
  error: AppErrorDto
}

export type LoadingSnapshot = {
  value: boolean
  target: string | undefined
  ptg?: number
}

export type InvokeContract = {
  GET_STATUS: { request: undefined; response: AppStatusDto }
  'WINDOW:LOCK': { request: undefined; response: void }
  'WINDOW:UNLOCK': { request: undefined; response: void }
  'YOUTUBE_DETAILS:GET': {
    request: YoutubeDetailsRequest
    response: void
  }
  DOWNLOAD: { request: SpotifyPlaylistId[] | undefined; response: void }
  'VIDEO:OPEN': { request: string; response: void }
  'VIDEO:SEARCH': { request: string; response: void }
  'HOME_FOLDERS:ASK': { request: undefined; response: HomeFolderAskResponse }
  'HOME_FOLDER:SET': { request: { path: string }; response: void }
  'HOME_FOLDER:OPEN': { request: undefined; response: void }
  LOGIN: { request: undefined; response: void }
  LOGOUT: { request: undefined; response: AppStatusDto }
  REFRESH: { request: undefined; response: void }
  'PLAYLISTS:LOAD_MORE': { request: undefined; response: void }
  'YOUTUBE:CONVERT': { request: undefined; response: void }
  'PLAYLISTS:QUEUE': { request: SpotifyPlaylistId; response: void }
  'PLAYLISTS:UNSYNC': { request: { id: SpotifyPlaylistId }; response: void }
  'PLAYLISTS:PAUSE': { request: { id: SpotifyPlaylistId }; response: void }
  'TRACK:PAUSE': { request: { id: SpotifyTrackId }; response: void }
  'TRACK:CHANGE_SELECTION': {
    request: TrackSelectionRequest
    response: void
  }
  'WINDOW:MINIMIZE': { request: undefined; response: void }
  'WINDOW:TOGGLE_MAXIMIZE': { request: undefined; response: void }
  'WINDOW:CLOSE': { request: undefined; response: void }
}

export type RendererEventContract = {
  'STATUS:SET': undefined
  FFMPEG_BINS_DOWNLOADED: { value: boolean }
  LOADING_EVENT: LoadingSnapshot
  'ERROR:CATCH': RendererErrorEvent
  'CONNECTION:CHANGE': boolean
  'API_CONNECTION:CHANGE': boolean
  'STATE:SNAPSHOT': { state: SongBasketStateDto; dontFormat?: boolean }
  'STATE:PATCH': StatePatchEvent
  'DOWNLOADED_FILE:ADDED': DownloadedFileDto
  'DOWNLOADED_FILE:REMOVED': DownloadedFileDto
  'DOWNLOAD:START': DownloadStartItem[]
  'DOWNLOAD:EVENT': DownloadEvent
  'DOWNLOAD:END': undefined
}

export type InvokeChannel = keyof InvokeContract
export type EventChannel = keyof RendererEventContract
export type InvokeRequest<Channel extends InvokeChannel> =
  InvokeContract[Channel]['request']
export type InvokeResponse<Channel extends InvokeChannel> =
  InvokeContract[Channel]['response']
export type EventPayload<Channel extends EventChannel> =
  RendererEventContract[Channel]
export type InvokeArgs<Channel extends InvokeChannel> = [
  InvokeRequest<Channel>
] extends [undefined]
  ? []
  : [request: InvokeRequest<Channel>]
export type EventArgs<Channel extends EventChannel> = [
  EventPayload<Channel>
] extends [undefined]
  ? [] | [payload: EventPayload<Channel>]
  : [payload: EventPayload<Channel>]
