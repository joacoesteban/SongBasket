import { dialog, shell } from 'electron'

import type {
  AppStatus,
  LoadingController,
  SongBasketSaveFile
} from '../../../@types/SongBasket'
import { SpotifyPlaylistId, SpotifyTrackId } from '../../../@types/Spotify'
import { YouTubeResultId } from '../../../@types/YouTube'
import type {
  AppErrorDto,
  AppStatusDto,
  JsonValue,
  RendererErrorEvent,
  SongBasketStateDto
} from '../../../shared/ipc'
import { APP_VERSION_STRING, CHANGELOG_URL } from '../../Global/constants'
import {
  getConnectedToApi,
  getConnectedToInternet,
  getFfmpegBinariesDownloaded,
  getHomeFolder,
  getMainWindow,
  getAppStatus as getRuntimeAppStatus
} from '../../Global/state'
import MAIN_STORE from '../../Store/mainProcessStore'
import youtubeDl from '../DownloadPhase/youtube-dl'
import FileWatchers from '../FileSystem/FileWatchers'
import FSController from '../FileSystem/index'
import core from './core.controller'
import { ipcSend } from './ipc.controller'
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

const isJsonValue = (value: unknown): value is JsonValue => {
  if (value === null) return true
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true
  }
  if (Array.isArray(value)) return value.every(isJsonValue)
  if (typeof value !== 'object') return false
  return Object.values(value).every(isJsonValue)
}

const property = (value: object, key: string): unknown =>
  Object.entries(value).find(([propertyKey]) => propertyKey === key)?.[1]

export function normalizeError(error: unknown): AppErrorDto {
  let base: AppErrorDto = {
    name: 'Error',
    message: String(error)
  }
  if (error instanceof Error) {
    base = { name: error.name, message: error.message }
    if (error.stack) base.stack = error.stack
  }
  if (typeof error !== 'object' || error === null) return base

  const response = property(error, 'response')
  if (typeof response !== 'object' || response === null) return base
  const status = property(response, 'status')
  const data = property(response, 'data')
  if (typeof status === 'number') base.status = status
  if (isJsonValue(data)) base.data = data
  return base
}

const serializeError = (error: Error | null): AppErrorDto | null => {
  if (error === null) return null
  return normalizeError(error)
}

const serializeState = (state: SongBasketSaveFile): SongBasketStateDto => ({
  ...state,
  lastSync: state.lastSync?.toISOString() ?? null
})

const serializeStatusState = (
  status: AppStatus['APP_STATUS']
): AppStatusDto['APP_STATUS'] => ({
  ...status,
  UPDATES: {
    ...status.UPDATES,
    updateError: serializeError(status.UPDATES.updateError)
  }
})

export async function reflectRenderer(): Promise<void> {
  await ipcSend('STATE:SNAPSHOT', {
    state: serializeState(MAIN_STORE.STATE())
  })
}

export async function reflectRendererKey(
  key: keyof SongBasketStateDto
): Promise<void> {
  const state = serializeState(MAIN_STORE.STATE())
  switch (key) {
    case 'user':
      await ipcSend('STATE:PATCH', { key, value: state.user })
      return
    case 'playlists':
      await ipcSend('STATE:PATCH', { key, value: state.playlists })
      return
    case 'syncedPlaylists':
      await ipcSend('STATE:PATCH', { key, value: state.syncedPlaylists })
      return
    case 'queuedPlaylists':
      await ipcSend('STATE:PATCH', { key, value: state.queuedPlaylists })
      return
    case 'cachedPlaylists':
      await ipcSend('STATE:PATCH', { key, value: state.cachedPlaylists })
      return
    case 'deletedPlaylists':
      await ipcSend('STATE:PATCH', { key, value: state.deletedPlaylists })
      return
    case 'convertedTracks':
      await ipcSend('STATE:PATCH', { key, value: state.convertedTracks })
      return
    case 'currentPlaylist':
      await ipcSend('STATE:PATCH', { key, value: state.currentPlaylist })
      return
    case 'control':
      await ipcSend('STATE:PATCH', { key, value: state.control })
      return
    case 'lastSync':
      await ipcSend('STATE:PATCH', { key, value: state.lastSync })
      return
  }
}

export async function sendError({ type, error }: ErrorPayload): Promise<void> {
  const payload: RendererErrorEvent = {
    error: normalizeError(error)
  }
  if (type !== undefined) payload.type = type
  await ipcSend('ERROR:CATCH', payload)
}

// ------------------------- FLOW -------------------------

export async function askHomeFolder() {
  let isLogged = false
  let error: AppErrorDto | null = null

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
        await ipcSend('STATUS:SET')
      }
    }
  } catch (err) {
    console.error('EROR SETTING HOME FOLDER', err)
    error = normalizeError(err)
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

export async function logout(): Promise<AppStatusDto> {
  let error: AppErrorDto | null = null
  try {
    if (!getRuntimeAppStatus().IS_LOGGED) throw new Error('NOT LOGGED IN')
    await core.logout()
  } catch (err) {
    error = normalizeError(err)
    await sendError({ error: err })
  }
  const status = getAppStatus()
  status.error = error
  return status
}

const getAppStatus = (): AppStatusDto => {
  const status = getRuntimeAppStatus()
  let state: SongBasketStateDto | null = null
  let downloadedTracks: AppStatusDto['downloadedTracks'] = null
  if (status.IS_LOGGED) {
    state = serializeState(MAIN_STORE.STATE())
    downloadedTracks = FileWatchers.retrieveTracks()
  }
  const all: AppStatusDto = {
    APP_STATUS: serializeStatusState(status),
    state,
    downloadedTracks,
    FFMPEG_BINS_DOWNLOADED: getFfmpegBinariesDownloaded(),
    CONNECTED_TO_INTERNET: getConnectedToInternet(),
    CONNECTED_TO_API: getConnectedToApi(),
    appVersion: APP_VERSION_STRING,
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
  await MAIN_STORE.COMMIT.QUEUE_PLAYLIST(id)
  await reflectRendererKey('queuedPlaylists')
}

export async function unsyncPlaylist(id: SpotifyPlaylistId) {
  try {
    if (loadingController.isLoading) return
    loadingController.on('PLAYLIST:UNSYNC')
    await MAIN_STORE.COMMIT.UNSYNC_PLAYLIST(id)
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
    await MAIN_STORE.COMMIT.PAUSE_PLAYLIST(id)
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
    await MAIN_STORE.COMMIT.PAUSE_TRACK(id)
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
  newId: YouTubeResultId | null
}) {
  const { trackId, newId } = params
  try {
    if (loadingController.isLoading) return
    await MAIN_STORE.COMMIT.CHANGE_YT_TRACK_SELECTION({ trackId, newId })
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
    await MAIN_STORE.COMMIT.CUSTOM_TRACK_URL({ details, trackId })
    await reflectRendererKey('convertedTracks')
  } catch (err) {
    console.error('EROR AT YTTRACKDETAILS:: ipc"ytTrackDetails"', err)
    throw err
  }
}

export async function openYtVideo(id: YouTubeResultId) {
  if (!id) return
  await openUrl('https://www.youtube.com/watch?v=' + encodeURIComponent(id))
}

export async function searchYtVideo(query: string) {
  if (!query) return
  await openUrl(
    'https://www.youtube.com/results?search_query=' + encodeURIComponent(query)
  )
}

export async function showChangelog() {
  await openUrl(CHANGELOG_URL)
}
