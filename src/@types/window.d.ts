import type {
  EventChannel,
  EventPayload,
  InvokeArgs,
  InvokeChannel,
  InvokeResponse,
  RuntimePlatform
} from '../shared/ipc'

declare global {
  interface SongBasketWindowApi {
    platform: RuntimePlatform
    invoke<Channel extends InvokeChannel>(
      channel: Channel,
      ...args: InvokeArgs<Channel>
    ): Promise<InvokeResponse<Channel>>
    on<Channel extends EventChannel>(
      channel: Channel,
      listener: (payload: EventPayload<Channel>) => void
    ): () => void
  }

  interface Window {
    songbasket: SongBasketWindowApi
  }
}

export {}
