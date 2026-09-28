import * as PATH from 'path'
import windowStateKeeper from 'electron-window-state'
import Positioner from 'electron-positioner'
import { BrowserWindow } from 'electron'
import { enable as enableRemote } from '@electron/remote/main'

const RENDERER_ENTRY = PATH.join(__dirname, '../renderer/index.html')

const loadRenderer = (window: BrowserWindow) => {
  const devServer = process.env.ELECTRON_RENDERER_URL
  if (devServer) return window.loadURL(devServer)
  return window.loadFile(RENDERER_ENTRY)
}

const windowController = {
  windowState: null as windowStateKeeper.State | null,
  positioner: null as Positioner | null,
  lockWindow ({ setSize = true }: { setSize?: boolean } = {}) {
    const window = global.CONSTANTS.MAIN_WINDOW
    if (!window) return
    setSize && window.setSize(global.CONSTANTS.MAIN_WINDOW_CONFIG.width, global.CONSTANTS.MAIN_WINDOW_CONFIG.height)
    window.resizable = false
    windowController.positioner?.move('center')
  },
  unlockWindow ({ setSize = true, setPosition = true }: { setSize?: boolean, setPosition?: boolean } = {}) {
    const window = global.CONSTANTS.MAIN_WINDOW
    if (!window) return

    window.resizable = true
    setTimeout(() => {
      const windowState = windowController.windowState
      if (windowState) {
        setSize && window.setSize(windowState.width, windowState.height)
        setPosition && windowState.x && windowState.y && window.setPosition(windowState.x, windowState.y, true)
        windowState.manage(window)
      }
    }, 500)
  },
  onAppInit () {
    windowController.createMainWindow()
    global.CONSTANTS.LOADING_WINDOW?.close()
  },
  createMainWindow () {
    windowController.windowState = windowStateKeeper({
      defaultWidth: global.CONSTANTS.MAIN_WINDOW_CONFIG.width,
      defaultHeight: global.CONSTANTS.MAIN_WINDOW_CONFIG.height
    })
    const window = global.CONSTANTS.MAIN_WINDOW = new BrowserWindow({
      ...global.CONSTANTS.MAIN_WINDOW_CONFIG,
      width: global.CONSTANTS.MAIN_WINDOW_CONFIG.width,
      height: global.CONSTANTS.MAIN_WINDOW_CONFIG.height
    })
    window.setPositionSafe = window.setPosition
    window.setPosition = (x, y, animate = true) => window.setPositionSafe(x, y, animate)

    windowController.positioner = new Positioner(window)

    enableRemote(window.webContents)
    loadRenderer(window)
    window.on('closed', () => {
      global.CONSTANTS.MAIN_WINDOW = null
      windowController.windowState = null
      windowController.positioner = null
    })
  },
  createLoadingWindow () {
    const window = global.CONSTANTS.LOADING_WINDOW = new BrowserWindow(global.CONSTANTS.LOADING_WINDOW_CONFIG)

    enableRemote(window.webContents)
    loadRenderer(window)
    window.on('closed', () => {
      global.CONSTANTS.LOADING_WINDOW = null
      // windowController.windowState = null
      // windowController.positioner = null
    })
  }
}

export default windowController
