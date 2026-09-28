import * as electron from 'electron'

import * as remoteMain from '@electron/remote/main'

import { Platform } from '../@types/App'
import { ENV_PROD, PLATFORM } from './Global/constants'
import { getMainWindow, setFfmpegBinariesDownloaded } from './Global/state'
import updater from './controllers/InitializationAndHandlers/auto-update'
import connectionController from './controllers/InitializationAndHandlers/connection.controller'
import core from './controllers/InitializationAndHandlers/core.controller'
import * as handlers from './controllers/InitializationAndHandlers/handlers'
import { ipcSend } from './controllers/InitializationAndHandlers/ipc.controller'
import ipcRoutes from './controllers/InitializationAndHandlers/ipc.routes'
import protocolController from './controllers/InitializationAndHandlers/protocol.controller'
import WindowController from './controllers/InitializationAndHandlers/window.controller'
import { emptyFn } from './environment-init'
import { setupFfmpeg, setupYtDlp } from './utils/binaries'

async function bootstrapFfmpeg() {
  await setupFfmpeg()
  setFfmpegBinariesDownloaded(true)
  handlers.onFfmpegBinaries()
}

export default async () => {
  const { promise: electronInitPromise, resolve: onElectronReady } =
    Promise.withResolvers<void>()

  const createMenu = () => {
    const { globalShortcut } = electron
    if (ENV_PROD) {
      globalShortcut.register('f5', emptyFn)
      globalShortcut.register('CmdOrCtrl+R', emptyFn)
    }
  }

  const onReady = async () => {
    remoteMain.initialize()
    ipcRoutes()
    WindowController.createLoadingWindow()

    if (ENV_PROD) updater.init()
    protocolController.startProtocols()
    connectionController.init({
      connectionChangeCallback: (value: boolean) => {
        ipcSend('CONNECTION:CHANGE', value)
      },
      apiConnectionChangeCallback: (value: boolean) => {
        ipcSend('API_CONNECTION:CHANGE', value)
      }
    })
    createMenu()
    await core.setAppStatus()

    onElectronReady()
  }

  electron.app.on('window-all-closed', () => {
    if (PLATFORM !== Platform.mac) electron.app.quit()
  })

  electron.app.on('activate', () => {
    if (getMainWindow() === null) WindowController.onAppInit()
  })

  electron.app.on('will-quit', () => {
    electron.globalShortcut.unregisterAll()
  })

  await electron.app.whenReady()
  await onReady()

  electronInitPromise.then(WindowController.onAppInit)

  await Promise.all([bootstrapFfmpeg(), setupYtDlp(), electronInitPromise])
}
