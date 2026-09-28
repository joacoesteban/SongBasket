import { BrowserWindow } from 'electron'
import Positioner from 'electron-positioner'
import windowStateKeeper from 'electron-window-state'
import * as PATH from 'path'

import {
  LOADING_WINDOW_CONFIG,
  MAIN_WINDOW_CONFIG
} from '../../Global/constants'
import {
  getLoadingWindow,
  getMainWindow,
  setLoadingWindow,
  setMainWindow
} from '../../Global/state'

const RENDERER_ENTRY = PATH.join(__dirname, '../renderer/index.html')

const loadRenderer = (window: BrowserWindow): Promise<void> => {
  const devServer = process.env['ELECTRON_RENDERER_URL']
  if (devServer) return window.loadURL(devServer)
  return window.loadFile(RENDERER_ENTRY)
}

const windowController: {
  windowState: windowStateKeeper.State | null
  positioner: Positioner | null
  lockWindow: (params?: { setSize?: boolean }) => void
  unlockWindow: (params?: { setSize?: boolean; setPosition?: boolean }) => void
  minimize: () => void
  toggleMaximize: () => void
  close: () => void
  onAppInit: () => void
  createMainWindow: () => void
  createLoadingWindow: () => void
} = {
  windowState: null,
  positioner: null,

  lockWindow({ setSize = true }: { setSize?: boolean } = {}) {
    const window = getMainWindow()
    if (!window) return
    if (setSize) {
      window.setSize(MAIN_WINDOW_CONFIG.width, MAIN_WINDOW_CONFIG.height)
    }
    window.resizable = false
    windowController.positioner?.move('center')
  },
  unlockWindow({
    setSize = true,
    setPosition = true
  }: { setSize?: boolean; setPosition?: boolean } = {}) {
    const window = getMainWindow()
    if (!window) return

    window.resizable = true
    setTimeout(() => {
      const windowState = windowController.windowState
      if (windowState) {
        if (setSize) {
          window.setSize(windowState.width, windowState.height)
        }
        if (
          setPosition &&
          windowState.x !== undefined &&
          windowState.y !== undefined
        ) {
          window.setPosition(windowState.x, windowState.y, true)
        }
        windowState.manage(window)
      }
    }, 500)
  },
  minimize() {
    getMainWindow()?.minimize()
  },
  toggleMaximize() {
    const window = getMainWindow()
    if (!window) return
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
  },
  close() {
    getMainWindow()?.close()
  },
  onAppInit() {
    windowController.createMainWindow()
    getLoadingWindow()?.close()
  },
  createMainWindow() {
    windowController.windowState = windowStateKeeper({
      defaultWidth: MAIN_WINDOW_CONFIG.width,
      defaultHeight: MAIN_WINDOW_CONFIG.height
    })
    const window = new BrowserWindow({
      ...MAIN_WINDOW_CONFIG,
      width: MAIN_WINDOW_CONFIG.width,
      height: MAIN_WINDOW_CONFIG.height
    })
    setMainWindow(window)
    window.setPositionSafe = window.setPosition
    window.setPosition = (x, y, animate = true) =>
      window.setPositionSafe(x, y, animate)

    windowController.positioner = new Positioner(window)

    loadRenderer(window)
    window.on('closed', () => {
      setMainWindow(null)
      windowController.windowState = null
      windowController.positioner = null
    })
  },
  createLoadingWindow() {
    const window = new BrowserWindow(LOADING_WINDOW_CONFIG)
    setLoadingWindow(window)

    loadRenderer(window)
    window.on('closed', () => {
      setLoadingWindow(null)
      // windowController.windowState = null
      // windowController.positioner = null
    })
  }
}

export default windowController
