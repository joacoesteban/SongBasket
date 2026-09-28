import { ipcRenderer } from 'electron'

export type RendererIpc = {
  callMain: <T = unknown>(channel: string, data?: unknown) => Promise<T>
  answerMain: <T>(channel: string, handler: (data: T) => unknown) => void
}

const ipc: RendererIpc = {
  callMain: (channel, data) => ipcRenderer.invoke(channel, data),
  answerMain: (channel, handler) => {
    ipcRenderer.on(channel, (_event, data) => handler(data))
  }
}

export default ipc
