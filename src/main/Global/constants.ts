import { app } from 'electron'
import * as PATH from 'path'

import { Platform } from '../../@types/App'

export const ENV_PROD = app.isPackaged
export const IS_DEV = !ENV_PROD
export const FEATURES = {
  FLOAT_MENU: {
    DROPDOWN: IS_DEV
  },
  FOLDER_VIEW: false
}

const USE_PROD_BACKEND = true
const HEIGHT = 500
const WIDTH = 1000
export const PROCESS_CWD = process.cwd()
export const APP_CWD = PATH.join(app.getAppPath())
export const APP_VERSION = app.getVersion()

let supportPath = app.getPath('userData')
if (!ENV_PROD) supportPath = PATH.join(process.cwd(), 'APPLICATION_SUPPORT')
export const APP_SUPPORT_PATH = supportPath

const CONFIGURED_BACKEND = process.env['BACKEND']
let backend = CONFIGURED_BACKEND
if (!backend) {
  if (ENV_PROD || USE_PROD_BACKEND) backend = 'https://api.songbasket.com'
  else backend = 'http://localhost:5000'
  process.env['BACKEND'] = backend
}
export const BACKEND = backend

export const PLATFORM = (() => {
  switch (process.platform) {
    case 'darwin':
      return Platform.mac
    default:
      if (process.platform.includes('win')) return Platform.windows
      return Platform.linux
  }
})()

let versionString = `${APP_VERSION} Closed Beta`
if (IS_DEV) versionString = `${APP_VERSION} Electron. Development`
export const APP_VERSION_STRING = versionString

let nodeModulesBase = PROCESS_CWD
if (ENV_PROD) nodeModulesBase = APP_CWD.replace('app.asar', 'app.asar.unpacked')

export const NODE_MODULES_PATH = PATH.join(nodeModulesBase, 'node_modules')
export const TEMP_PATH = app.getPath('temp')
export const FFMPEG_BINARIES_PATH = PATH.join(APP_SUPPORT_PATH, 'bin', 'ffmpeg')
export const FFMPEG_VERSION_CONTROL_PATH = PATH.join(
  APP_SUPPORT_PATH,
  'ffmpeg-version.json'
)
export const YTDL_BINARIES_PATH = PATH.join(APP_SUPPORT_PATH, 'bin', 'ytdlp')
export const YTDL_VERSION_CONTROL_PATH = PATH.join(
  APP_SUPPORT_PATH,
  'ytdlp-version.json'
)
export const PROTOCOL_PATHS: { BASE: 'songbasket' } = { BASE: 'songbasket' }

export const MAIN_WINDOW_CONFIG = {
  width: WIDTH,
  height: HEIGHT,
  frame: false,
  minWidth: WIDTH,
  minHeight: HEIGHT,
  backgroundColor: '#151515',
  useContentSize: false,
  resizable: true,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: PATH.join(__dirname, '../preload/index.js')
  }
}

export const LOADING_WINDOW_CONFIG = {
  width: WIDTH,
  height: HEIGHT,
  frame: false,
  minWidth: WIDTH,
  minHeight: HEIGHT,
  backgroundColor: '#151515',
  useContentSize: false,
  resizable: false,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    preload: PATH.join(__dirname, '../preload/index.js')
  }
}

export const POPUP_WINDOW_CONFIG = {
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true
  },
  width: 550,
  height: 830,
  minWidth: 550,
  minHeight: 830,
  useContentSize: true
}

export const HEROKU_PING_INTERVAL = 1000 * 60 * 2
export const CHANGELOG_URL = 'https://download.songbasket.com'
export const CLEAN_CREDS_ON_LOGOUT = false
