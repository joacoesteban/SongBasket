import { ipcMain } from 'electron'

import { getMainWindow } from '../../Global/state'

export async function ipcSend(channel: string, data?: unknown): Promise<void> {
  getMainWindow()?.webContents.send(channel, data)
}

const IpcController = {
  send: ipcSend,
  answerRenderer<T>(channel: string, handler: (data: T) => unknown) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, (_event, data) => handler(data))
  }
}

export default IpcController
