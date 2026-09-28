import { dialog, shell } from 'electron'

import {
  AppStatus,
  LoadingController,
  SongBasketSaveFile
} from '../../../@types/SongBasket'
import { SpotifyPlaylistId, SpotifyTrackId } from '../../../@types/Spotify'
import { YouTubeResultId } from '../../../@types/YouTube'
import { CHANGELOG_URL } from '../../Global/constants'
import {
  getConnectedToApi,
  getConnectedToInternet,
  getFfmpegBinariesDownloaded,
  getHomeFolder,
  getMainWindow,
  getAppStatus as getRuntimeAppStatus
} from '../../Global/state'
import VUEX_MAIN from '../../Store/mainProcessStore'
// import IpcController from './ipc.controller'
import youtubeDl from '../DownloadPhase/youtube-dl'
import FileWatchers from '../FileSystem/FileWatchers'
import FSController from '../FileSystem/index'
import core from './core.controller'
import { ipcSend } from './ipc.controller'
// import customGetters from '../Store/Helpers/customGetters'
import * as sbFetch from './sbFetch'

export const openUrl = (url: string): Promise<void> => shell.openExternal(url)

type ErrorPayload = {
  type?: string
  error?: unknown
}

console.log('NODE ENV', process.env['NODE_ENV'])

const loadingController: LoadingController = {
  target: [],
  count: 0,
  // -----------------------
  set(target, value) {
    this.count += value

    if (value > 0) this.target.push(target)
    else this.target.splice(this.target.indexOf(target), 1)

    this.reflect({ value: this.isLoading, target })
    return this.isLoading
  },
  reflect(payload = loadingController.instance) {
    console.log('current', this.instance)
    ipcSend('LOADING_EVENT', payload)
  },
  // -----------------------
  get instance() {
    return { value: this.isLoading, target: this.which }
  },
  get isLoading() {
    return this.count > 0
  },
  get which() {
    return this.target.at(-1)
  },
  get canRequest() {
    return !this.isLoading && getConnectedToInternet()
  },
  // -----------------------
  get on() {
    return this.fn(1)
  },
  get off() {
    return this.fn(-1)
  },
  ptg(target, ptg) {
    this.reflect({ target, value: this.isLoading, ptg })
  },
  fn(val) {
    return (target) => {
      return this.set(target, val)
    }
  }
}

export function normalizeError(error: unknown): unknown {
  if (typeof error !== 'object' || error === null || !('response' in error)) {
    return error
  }
  const response = error.response
  if (typeof response !== 'object' || response === null) return error
  if (!('status' in response) || !('data' in response)) return error
  return { status: response.status, data: response.data }
}

export async function reflectRenderer(): Promise<void> {
  await ipcSend('VUEX:STORE', { state: VUEX_MAIN.STATE_SAFE() })
}
export async function reflectRendererKey(
  key: keyof SongBasketSaveFile
): Promise<void> {
  const value = VUEX_MAIN.STATE_SAFE([key])[key]
  await ipcSend('VUEX:SET', { key, value })
}
export async function sendError({ type, error }: ErrorPayload): Promise<void> {
  await ipcSend('ERROR:CATCH', { type, error: normalizeError(error) })
}

// ------------------------- FLOW -------------------------

export async function askHomeFolder() {
  let isLogged = false
  let error = null

  try {
    const mainWindow = getMainWindow()
    if (!mainWindow) throw new Error('MAIN_WINDOW is not defined')

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    })
    if (canceled) throw new Error('CANCELLED')
    const [path] = filePaths
    if (!path) throw new Error('HOME FOLDER NOT SELECTED')
    await addHomeFolder({ path })
    if (await core.stateExists()) {
      isLogged = await core.setAppStatus()
      if (isLogged) {
        ipcSend('STATUS:SET')
      }
    }
  } catch (err) {
    console.error('EROR SETTING HOME FOLDER', err)
    error = err
  }
  return { isLogged, error }
}

export async function addHomeFolder(params: { path: string }): Promise<void> {
  const { path } = params
  await core.addHomeFolder(path)
}

export async function setHomeFolder(params: { path: string }): Promise<void> {
  const { path } = params
  await addHomeFolder({ path })
  await core.setAppStatus()
}

export async function openHomeFolder() {
  await shell.openPath(getHomeFolder())
}

export async function login() {
  await core.initializeLogin()
  await reflectRenderer()
}

export async function logout() {
  let error
  try {
    if (!getRuntimeAppStatus().IS_LOGGED) throw new Error('NOT LOGGED IN')
    await core.logout()
  } catch (err) {
    error = err
    await sendError({ error: err })
  }
  const status = getAppStatus()
  if (error instanceof Error) status.error = error
  return status
}

const getAppStatus = (): AppStatus => {
  const status = getRuntimeAppStatus()
  let state: SongBasketSaveFile | null = null
  let downloadedTracks: AppStatus['downloadedTracks'] = null
  if (status.IS_LOGGED) {
    state = VUEX_MAIN.STATE()
    downloadedTracks = FileWatchers.retrieveTracks()
  }
  const all: AppStatus = {
    APP_STATUS: status,
    state,
    downloadedTracks,
    FFMPEG_BINS_DOWNLOADED: getFfmpegBinariesDownloaded(),
    CONNECTED_TO_INTERNET: getConnectedToInternet(),
    CONNECTED_TO_API: getConnectedToApi(),
    error: null
  }
  if (
    loadingController.instance.value &&
    loadingController.instance.target === 'DOWNLOAD'
  ) {
    setTimeout(youtubeDl.onDowloadStart)
  }
  return all
}

export async function onFfmpegBinaries() {
  await ipcSend('FFMPEG_BINS_DOWNLOADED', {
    value: getFfmpegBinariesDownloaded()
  })
}

export async function sendStatus() {
  return getAppStatus()
}

// ------- EXTERNAL SOURCES -------
export async function refresh() {
  try {
    let completed = 0
    if (!loadingController.canRequest) return
    loadingController.on('PLAYLISTS:REFRESH')
    await core.updateAll({
      playlistCompletionCallback: (err, pl, playlists) => {
        void err
        void pl
        loadingController.ptg(
          'PLAYLISTS:REFRESH',
          ++completed / playlists.length
        )
      }
    })
  } catch (error) {
    await sendError({ type: 'PLAYLISTS:REFRESH', error })
  } finally {
    console.log('before loadoff')
    loadingController.off('PLAYLISTS:REFRESH')
    await reflectRenderer()
  }
}

export async function loadMorePlaylists() {
  try {
    if (!loadingController.canRequest) return
    loadingController.on('PLAYLISTS:LOAD_MORE')
    await core.loadMorePlaylists()
  } catch (error) {
    await sendError({ type: 'PLAYLISTS:LOAD_MORE', error })
    throw error
  } finally {
    loadingController.off('PLAYLISTS:LOAD_MORE')
    await reflectRenderer()
  }
}

export async function youtubize() {
  try {
    let completed = 0
    if (!loadingController.canRequest) return
    loadingController.on('YOUTUBIZE')
    await core.youtubize({
      trackCompletionCallback: (total) => {
        loadingController.ptg('YOUTUBIZE', ++completed / total)
      }
    })
  } catch (error) {
    await sendError({ type: 'YOUTUBIZE', error })
    throw error
  } finally {
    loadingController.off('YOUTUBIZE')
    await reflectRenderer()
  }
}

export async function download(plFilter?: SpotifyPlaylistId[]) {
  if (!loadingController.canRequest) return console.log('CANT REQUEST')
  console.log('About to download')
  if (plFilter && !Array.isArray(plFilter)) plFilter = [plFilter]

  loadingController.on('DOWNLOAD')
  const tracks = await FSController.UserMethods.retrieveLocalTracks()
  await youtubeDl.downloadSyncedPlaylists(tracks, plFilter || [])
  // await FileWatchers.rebuildWatchers()
  loadingController.off('DOWNLOAD')
}

export async function queuePlaylist(id: SpotifyPlaylistId) {
  VUEX_MAIN.COMMIT.QUEUE_PLAYLIST(id)
  await reflectRendererKey('queuedPlaylists')
}

export async function unsyncPlaylist(id: SpotifyPlaylistId) {
  try {
    if (loadingController.isLoading) return
    loadingController.on('PLAYLIST:UNSYNC')
    await VUEX_MAIN.COMMIT.UNSYNC_PLAYLIST(id)
  } catch (error) {
    console.error('Error unsyncing @ handlers.unsyncPlaylist', error)
    await sendError({ type: 'PLAYLIST:UNSYNC', error })
    throw error
  } finally {
    loadingController.off('PLAYLIST:UNSYNC')
    await reflectRenderer()
  }
}

export async function pausePlaylist(id: SpotifyPlaylistId) {
  try {
    if (loadingController.isLoading) return
    VUEX_MAIN.COMMIT.PAUSE_PLAYLIST(id)
  } catch (error) {
    console.error('Error pausing playlist @ handlers.pausePlaylist', error)
    await sendError({ type: 'PLAYLIST:PAUSE', error })
    throw error
  } finally {
    await reflectRendererKey('playlists')
  }
}

export async function pauseTrack(id: SpotifyTrackId) {
  try {
    if (loadingController.isLoading) return
    VUEX_MAIN.COMMIT.PAUSE_TRACK(id)
  } catch (error) {
    console.error('Error pausing track @ handlers.pauseTrack', error)
    await sendError({ type: 'TRACKS:PAUSE', error })
    throw error
  } finally {
    await reflectRendererKey('convertedTracks')
  }
}

export async function changeYtTrackSelection(params: {
  trackId: SpotifyTrackId
  newId: YouTubeResultId
}) {
  const { trackId, newId } = params
  try {
    if (loadingController.isLoading) return
    VUEX_MAIN.COMMIT.CHANGE_YT_TRACK_SELECTION({ trackId, newId })
  } catch (err) {
    console.error('Error changing track selection', err)
    throw err
  } finally {
    await reflectRendererKey('convertedTracks')
  }
}

export async function getYtTrackDetails(params: {
  url: string
  trackId: SpotifyTrackId
}) {
  const { url, trackId } = params
  if (!loadingController.canRequest) return
  try {
    const details = await sbFetch.ytDetails(url)
    console.log('YT Details retrieved', details)
    VUEX_MAIN.COMMIT.CUSTOM_TRACK_URL({ details, trackId })
    await reflectRendererKey('convertedTracks')
  } catch (err) {
    console.error('EROR AT YTTRACKDETAILS:: ipc"ytTrackDetails"', err)
    throw err
  }
}

export async function openYtVideo(id: YouTubeResultId) {
  if (!id) return
  await openUrl('https://www.youtube.com/watch?v=' + id)
}

export async function searchYtVideo(query: string) {
  if (!query) return
  await openUrl('https://www.youtube.com/results?search_query=' + query)
}

export async function showChangelog() {
  await openUrl(CHANGELOG_URL)
}
