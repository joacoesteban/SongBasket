import type * as Remote from '@electron/remote'

const remote: typeof Remote = window.require('@electron/remote')

export const {
  BrowserWindow,
  app,
  dialog,
  getGlobal,
  getCurrentWindow,
  getCurrentWebContents
} = remote
export default remote
