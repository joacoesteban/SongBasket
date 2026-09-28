import type * as Electron from 'electron'

// The renderer runs with node integration, so the real module is only reachable
// through node's require; Vite would otherwise try to bundle it for the browser.
const electron: typeof Electron = window.require('electron')

export const { ipcRenderer, shell, clipboard, webFrame, contextBridge } =
  electron
export default electron
