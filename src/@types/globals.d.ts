import type { BrowserWindow } from 'electron'
import type * as NodeID3 from 'node-id3'

declare global {
  namespace Electron {
    interface BrowserWindow {
      setPositionSafe: BrowserWindow['setPosition']
    }
  }
}

export type Tags = Omit<NodeID3.Tags, 'userDefinedText'> & {
  userDefinedText?: Array<{
    description: string
    value: string
  }>
}
