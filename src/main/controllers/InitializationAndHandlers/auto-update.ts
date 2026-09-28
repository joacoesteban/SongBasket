import { dialog } from 'electron'
import { ProgressInfo, UpdateInfo, autoUpdater } from 'electron-updater'

import { ENV_PROD } from '../../Global/constants'
import { getAppStatus, getMainWindow } from '../../Global/state'
import * as handlers from './handlers'

const FLAGS = getAppStatus().UPDATES

function init() {
  setEventListeners()
}

function resetFlags() {
  FLAGS.updateError = null
  FLAGS.updateAvailable = false
  FLAGS.updateVersion = null
  FLAGS.downloadInProgress = false
  FLAGS.downloadPtg = 0
  FLAGS.updateDownloaded = false
}

const setEventListeners = async () => {
  try {
    console.log('SETTING AUTO-UPDATE EVENT HANDLERS')
    autoUpdater.on('error', onError)
    autoUpdater.on('checking-for-update', onCheckingForUpdate)
    autoUpdater.on('update-available', onUpdateAvailable)
    autoUpdater.on('update-not-available', onUpdateNotAvailable)
    autoUpdater.on('download-progress', onDownloadProgress)
    autoUpdater.on('update-downloaded', onUpdateDownloaded)

    await autoUpdater.checkForUpdatesAndNotify()
  } catch (error) {
    console.error('UPDATE FAILED', error)
  }
}

const onError = (error: Error) => {
  console.error('ERROR UPDATING', error)
  FLAGS.updateError = error
}

const onCheckingForUpdate = () => {
  console.log('checking for update')
  resetFlags()
}
const onUpdateAvailable = (info: UpdateInfo) => {
  console.log('update available')
  FLAGS.updateAvailable = true
  FLAGS.updateVersion = info.version
}
const onUpdateNotAvailable = () => {
  resetFlags()
  console.log('update NOT available')
}
const onDownloadProgress = (progressObj: ProgressInfo) => {
  FLAGS.downloadInProgress = true
  FLAGS.downloadPtg = progressObj.percent
}
const onUpdateDownloaded = async () => {
  FLAGS.downloadInProgress = false
  FLAGS.updateDownloaded = true
  FLAGS.downloadPtg = 100

  // ipcSend('READY_TO_UPDATE', FLAGS)
  const message = `Version ${FLAGS.updateVersion} has been downloaded\nDo you want to install it now?`
  const mainWindow = getMainWindow()
  let res: Electron.MessageBoxReturnValue | null = null
  if (mainWindow) {
    res = await dialog.showMessageBox(mainWindow, {
      message,
      buttons: ['Yes', 'No', 'See changelog']
    })
  }
  switch (res && res.response) {
    case 0:
      // Yes
      onUserUpdateConfirmation()
      break
    case 1:
      // No
      break
    case 2:
      // See changelog
      handlers.showChangelog()
      break
    case null:
      // TODO MAIN_WINDOW is null, handle this
      break
  }
}

const onUserUpdateConfirmation = () => {
  if (ENV_PROD) {
    console.log('Not updating on dev')
    return
  }
  if (FLAGS.updateAvailable && FLAGS.updateDownloaded) {
    autoUpdater.quitAndInstall()
  }
}
const updateHandlers = {
  onUserUpdateConfirmation
}

export default {
  init,
  handlers: updateHandlers
}
