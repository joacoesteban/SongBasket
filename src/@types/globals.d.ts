import type * as NodeID3 from 'node-id3'
import type IpcController from '../main/controllers/InitializationAndHandlers/ipc.controller'
import type { Constants } from './constants'
import type { SongbasketFoldersFile, SongBasketId } from './SongBasket'
import type { SpotifyUser } from './Spotify'

declare global {

  var ipcSend: typeof IpcController.send
  var USER_ID: SpotifyUser['id'] | null
  var SONGBASKET_ID: SongBasketId | null
  var ENV_PROD: boolean
  var IS_DEV: boolean
  var CONNECTED_TO_INTERNET: boolean
  var CONNECTED_TO_API: boolean
  var CONSTANTS: Constants
  var log: (...args: unknown[]) => void
  var emptyFn: () => void
  var flushYtDlCache: () => Promise<string>
  var FEATURES: Record<string, unknown>
  var HOME_FOLDER: string
  var SESSION_FOLDER_PATHS: SongbasketFoldersFile
  var openUrl: (url: string) => Promise<void>

  namespace Electron {
    interface BrowserWindow {
      setPositionSafe: BrowserWindow['setPosition']
    }
  }
}

export type Tags = Omit<NodeID3.Tags, 'userDefinedText'> & {
  userDefinedText?: Array<{
    description: string,
    value: string
  }>
}
