import type { SpotifyPlaylistId, SpotifyTrackId } from '../../@types/Spotify'
import type {
  AppStatusDto,
  HomeFolderAskResponse,
  TrackSelectionRequest
} from '../../shared/ipc'
import { navigate, routeNames } from '../router'

export type SongBasketActions = {
  refresh: () => Promise<void>
  loadMorePlaylists: () => Promise<void>
  queuePlaylist: (id: SpotifyPlaylistId) => Promise<void>
  unsyncPlaylist: (id: SpotifyPlaylistId) => Promise<void>
  pausePlaylist: (id: SpotifyPlaylistId) => Promise<void>
  pauseTrack: (id: SpotifyTrackId) => Promise<void>
  changeTrackSelection: (request: TrackSelectionRequest) => Promise<void>
  download: (playlistFilter?: SpotifyPlaylistId[]) => Promise<void>
  convertYoutube: () => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<AppStatusDto>
  askHomeFolder: () => Promise<HomeFolderAskResponse>
  setHomeFolder: (path: string) => Promise<void>
  openHomeFolder: () => Promise<void>
  openVideo: (id: string) => Promise<void>
  searchVideo: (query: string) => Promise<void>
  getYoutubeDetails: (url: string, trackId: SpotifyTrackId) => Promise<void>
  minimizeWindow: () => Promise<void>
  toggleMaximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  lockWindow: () => Promise<void>
  unlockWindow: () => Promise<void>
}

export const createSongBasketActions = (): SongBasketActions => ({
  refresh: () => window.songbasket.invoke('REFRESH'),
  loadMorePlaylists: () => window.songbasket.invoke('PLAYLISTS:LOAD_MORE'),
  queuePlaylist: (id) => window.songbasket.invoke('PLAYLISTS:QUEUE', id),
  unsyncPlaylist: (id) => window.songbasket.invoke('PLAYLISTS:UNSYNC', { id }),
  pausePlaylist: (id) => window.songbasket.invoke('PLAYLISTS:PAUSE', { id }),
  pauseTrack: (id) => window.songbasket.invoke('TRACK:PAUSE', { id }),
  changeTrackSelection: (request) =>
    window.songbasket.invoke('TRACK:CHANGE_SELECTION', request),
  download: async (playlistFilter) => {
    void navigate({ name: routeNames.downloadsView })
    await window.songbasket.invoke('DOWNLOAD', playlistFilter)
  },
  convertYoutube: () => window.songbasket.invoke('YOUTUBE:CONVERT'),
  login: () => window.songbasket.invoke('LOGIN'),
  logout: () => window.songbasket.invoke('LOGOUT'),
  askHomeFolder: () => window.songbasket.invoke('HOME_FOLDERS:ASK'),
  setHomeFolder: (path) =>
    window.songbasket.invoke('HOME_FOLDER:SET', { path }),
  openHomeFolder: () => window.songbasket.invoke('HOME_FOLDER:OPEN'),
  openVideo: (id) => window.songbasket.invoke('VIDEO:OPEN', id),
  searchVideo: (query) => window.songbasket.invoke('VIDEO:SEARCH', query),
  getYoutubeDetails: (url, trackId) =>
    window.songbasket.invoke('YOUTUBE_DETAILS:GET', { url, trackId }),
  minimizeWindow: () => window.songbasket.invoke('WINDOW:MINIMIZE'),
  toggleMaximizeWindow: () =>
    window.songbasket.invoke('WINDOW:TOGGLE_MAXIMIZE'),
  closeWindow: () => window.songbasket.invoke('WINDOW:CLOSE'),
  lockWindow: () => window.songbasket.invoke('WINDOW:LOCK'),
  unlockWindow: () => window.songbasket.invoke('WINDOW:UNLOCK')
})

export const useSongBasketActions = createSongBasketActions
