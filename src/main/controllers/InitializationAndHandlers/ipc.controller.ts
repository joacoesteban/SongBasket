import { ipcMain } from 'electron'

const IpcController = {
  async send(channel: string, data?: unknown): Promise<void> {
    global.CONSTANTS.MAIN_WINDOW?.webContents.send(channel, data)
  },
  answerRenderer<T>(channel: string, handler: (data: T) => unknown) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, (_event, data) => handler(data))
  }
}

export default IpcController
