import { type IpcMainInvokeEvent, ipcMain } from 'electron'

import type {
  EventArgs,
  EventChannel,
  InvokeChannel,
  InvokeRequest,
  InvokeResponse
} from '../../../shared/ipc'
import {
  getLoadingWindow,
  getLoginWindow,
  getMainWindow
} from '../../Global/state'

const isTrustedSender = (event: IpcMainInvokeEvent): boolean => {
  const senderId = event.sender.id
  const mainWindow = getMainWindow()
  if (mainWindow?.webContents.id === senderId) return true
  const loadingWindow = getLoadingWindow()
  if (loadingWindow?.webContents.id === senderId) return true
  const loginWindow = getLoginWindow()
  return loginWindow?.webContents.id === senderId
}

export async function ipcSend<Channel extends EventChannel>(
  channel: Channel,
  ...args: EventArgs<Channel>
): Promise<void> {
  const window = getMainWindow()
  if (!window) return
  if (args.length === 0) {
    window.webContents.send(channel)
    return
  }
  window.webContents.send(channel, args[0])
}

type RendererHandler<Channel extends InvokeChannel> = (
  request: InvokeRequest<Channel>
) => InvokeResponse<Channel> | Promise<InvokeResponse<Channel>>

export function registerInvokeHandler<Channel extends InvokeChannel>(
  channel: Channel,
  handler: RendererHandler<Channel>
): void {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, (event, request: InvokeRequest<Channel>) => {
    if (!isTrustedSender(event)) {
      throw new Error('Untrusted renderer sender')
    }
    return handler(request)
  })
}

export type RendererEventSender = <Channel extends EventChannel>(
  channel: Channel,
  ...args: EventArgs<Channel>
) => Promise<void>
