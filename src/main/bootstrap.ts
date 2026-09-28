import * as electron from 'electron'
import * as remoteMain from '@electron/remote/main'
import * as handlers from './controllers/InitializationAndHandlers/handlers'

import connectionController from './controllers/InitializationAndHandlers/connection.controller'
import protocolController from './controllers/InitializationAndHandlers/protocol.controller'
import updater from './controllers/InitializationAndHandlers/auto-update'
import IpcController from './controllers/InitializationAndHandlers/ipc.controller'
import WindowController from './controllers/InitializationAndHandlers/window.controller'
import core from './controllers/InitializationAndHandlers/core.controller'
import ipcRoutes from './controllers/InitializationAndHandlers/ipc.routes'
import { setupFfmpeg, setupYtDlp, ytDlp } from './utils/binaries'
import { Platform } from '../@types/App'

global.ipcSend = IpcController.send
global.flushYtDlCache = ytDlp.flushCache

async function bootstrapFfmpeg () {
  await setupFfmpeg()
  global.CONSTANTS.FFMPEG_BINS_DOWNLOADED = true
  handlers.onFfmpegBinaries()
}

// ---------------------FLOW---------------------
export default async () => {
  const { promise: electronInitPromise, resolve: onElectronReady } = Promise.withResolvers<void>()

  const createMenu = () => {
    const { globalShortcut } = electron
    if (global.ENV_PROD) {
      globalShortcut.register('f5', global.emptyFn)
      globalShortcut.register('CmdOrCtrl+R', global.emptyFn)
    }
  }

  const onReady = async () => {
    remoteMain.initialize()
    ipcRoutes()
    WindowController.createLoadingWindow()

    global.CONSTANTS.ENV_PROD && updater.init()
    protocolController.startProtocols()
    connectionController.init({
      connectionChangeCallback: (value: boolean) => {
        global.ipcSend('CONNECTION:CHANGE', value)
      },
      apiConnectionChangeCallback: (value: boolean) => {
        global.ipcSend('API_CONNECTION:CHANGE', value)
      }
    })
    createMenu()
    await core.setAppStatus()

    onElectronReady()
  }

  electron.app.on('window-all-closed', () => {
    if (global.CONSTANTS.PLATFORM !== Platform.mac) {
      // TODO Manage background processing on every platform
      electron.app.quit()
    }
  })

  electron.app.on('activate', () => {
    if (global.CONSTANTS.MAIN_WINDOW === null) WindowController.onAppInit()
  })

  electron.app.on('will-quit', () => {
    electron.globalShortcut.unregisterAll()
  })

  await electron.app.whenReady()
  await onReady()

  electronInitPromise.then(WindowController.onAppInit)

  await Promise.all([
    bootstrapFfmpeg(),
    setupYtDlp(),
    electronInitPromise
  ])
}
