import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

import type {
  EventChannel,
  EventPayload,
  InvokeArgs,
  InvokeChannel,
  InvokeResponse,
  RuntimePlatform
} from '../shared/ipc'

export function typedInvoke<Channel extends InvokeChannel>(
  channel: Channel,
  ...args: InvokeArgs<Channel>
): Promise<InvokeResponse<Channel>>
export function typedInvoke(
  channel: InvokeChannel,
  ...args: [unknown?]
): Promise<unknown> {
  if (args.length === 0) return ipcRenderer.invoke(channel)
  return ipcRenderer.invoke(channel, args[0])
}

export function typedOn<Channel extends EventChannel>(
  channel: Channel,
  listener: (payload: EventPayload<Channel>) => void
): () => void
export function typedOn(
  channel: EventChannel,
  listener: (payload: unknown) => void
): () => void {
  const handler = (_event: IpcRendererEvent, payload: unknown): void => {
    listener(payload)
  }
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}

const RUNTIME_PLATFORM: RuntimePlatform = process.platform

contextBridge.exposeInMainWorld('songbasket', {
  platform: RUNTIME_PLATFORM,
  invoke: typedInvoke,
  on: typedOn
})
