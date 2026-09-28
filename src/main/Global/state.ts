import type { BrowserWindow } from 'electron'

import type { SongbasketFoldersFile } from '../../@types/SongBasket'
import type { SpotifyUser } from '../../@types/Spotify'
import type { Constants } from '../../@types/constants'

export type AppStatusState = Constants['APP_STATUS']

let mainWindow: BrowserWindow | null = null
let loadingWindow: BrowserWindow | null = null
let loginWindow: BrowserWindow | null = null
let ffmpegBinariesDownloaded = false
let userId: SpotifyUser['id'] | null = null
let songbasketId: string | null = null
let connectedToInternet = false
let connectedToApi = false
let sessionFolderPaths: SongbasketFoldersFile = {
  paths: [],
  selected: null
}
let appStatus: AppStatusState = {
  IS_LOGGED: false,
  FOLDERS: sessionFolderPaths,
  UPDATES: {
    updateError: null,
    updateAvailable: false,
    updateVersion: null,
    downloadInProgress: false,
    downloadPtg: 0,
    updateDownloaded: false
  }
}

export const getMainWindow = (): BrowserWindow | null => mainWindow
export const setMainWindow = (window: BrowserWindow | null): void => {
  mainWindow = window
}
export const getLoadingWindow = (): BrowserWindow | null => loadingWindow
export const setLoadingWindow = (window: BrowserWindow | null): void => {
  loadingWindow = window
}
export const getLoginWindow = (): BrowserWindow | null => loginWindow
export const setLoginWindow = (window: BrowserWindow | null): void => {
  loginWindow = window
}

export const getFfmpegBinariesDownloaded = (): boolean =>
  ffmpegBinariesDownloaded
export const setFfmpegBinariesDownloaded = (value: boolean): void => {
  ffmpegBinariesDownloaded = value
}

export const getUserId = (): SpotifyUser['id'] | null => userId
export const setUserId = (value: SpotifyUser['id'] | null): void => {
  userId = value
}
export const getSongbasketId = (): string | null => songbasketId
export const setSongbasketId = (value: string | null): void => {
  songbasketId = value
}

export const getConnectedToInternet = (): boolean => connectedToInternet
export const setConnectedToInternet = (value: boolean): void => {
  connectedToInternet = value
}
export const getConnectedToApi = (): boolean => connectedToApi
export const setConnectedToApi = (value: boolean): void => {
  connectedToApi = value
}

export const getSessionFolderPaths = (): SongbasketFoldersFile =>
  sessionFolderPaths
export const setSessionFolderPaths = (value: SongbasketFoldersFile): void => {
  sessionFolderPaths = value
  appStatus.FOLDERS = value
}
export const getHomeFolder = (): string => {
  if (sessionFolderPaths.selected === null) {
    throw new Error('CURRENT HOME FOLDER MISSING')
  }
  return sessionFolderPaths.selected
}

export const getAppStatus = (): AppStatusState => appStatus
export const setAppStatus = (value: AppStatusState): void => {
  appStatus = value
  sessionFolderPaths = value.FOLDERS
}
