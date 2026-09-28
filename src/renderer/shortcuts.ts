import { match } from 'ts-pattern'
import { onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import type { RuntimePlatform } from '../shared/ipc'
import { navigate, navigateBack, navigateForward, routeNames } from './router'
import { shortcutFor } from './shortcut-mapping'
import { useModal } from './state/useModal'
import { useSongBasketActions } from './state/useSongBasketActions'

const isTextEntry = (): boolean => {
  const element = document.activeElement
  if (element === null) return false
  if (element instanceof HTMLInputElement) return true
  if (element instanceof HTMLTextAreaElement) return true
  return element instanceof HTMLElement && element.isContentEditable
}

const focusSearch = (onlyWithText: boolean): void => {
  const input = document.querySelector<HTMLInputElement>(
    '.global-search-bar-container input[type="text"]'
  )
  if (input === null) return
  if (onlyWithText && input.value.length === 0) return
  input.focus()
}

const hasDragRegion = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false
  return (
    window.getComputedStyle(target).getPropertyValue('-webkit-app-region') ===
    'drag'
  )
}

const toggleDebugOutlines = (): void => {
  if (import.meta.env.DEV) {
    document.documentElement.classList.toggle('debug-outlines')
  }
}

const useShortcuts = (): void => {
  const route = useRoute()
  const actions = useSongBasketActions()
  const { modal } = useModal()
  const RUNTIME_PLATFORM: RuntimePlatform = window.songbasket.platform

  const onKeyDown = (event: KeyboardEvent): void => {
    if (modal.value !== null) return
    const command = match(RUNTIME_PLATFORM)
      .with('darwin', () => event.metaKey)
      .otherwise(() => event.ctrlKey)
    const action = shortcutFor({
      key: event.key,
      code: event.code,
      command,
      shift: event.shiftKey
    })
    if (action === undefined) return

    match(action)
      .with('back', () => {
        event.preventDefault()
        navigateBack()
      })
      .with('forward', () => {
        event.preventDefault()
        navigateForward()
      })
      .with('download-current-playlist', () => {
        event.preventDefault()
        const id = route.params['id']
        if (route.name === routeNames.playlistView && typeof id === 'string') {
          void actions.download([id])
        }
        void navigate({ name: routeNames.downloadsView })
      })
      .with('navigate-downloads', () => {
        event.preventDefault()
        void navigate({ name: routeNames.downloadsView })
      })
      .with('refresh', () => {
        event.preventDefault()
        void actions.refresh()
      })
      .with('navigate-playlists', () => {
        event.preventDefault()
        void navigate({ name: routeNames.playlistsList })
      })
      .with('navigate-tracks', () => {
        event.preventDefault()
        void navigate({ name: routeNames.tracksList })
      })
      .with('toggle-debug-outlines', () => {
        if (import.meta.env.DEV) event.preventDefault()
        toggleDebugOutlines()
      })
      .with('focus-search', () => {
        if (isTextEntry()) return
        focusSearch(event.code === 'Backspace')
      })
      .exhaustive()
  }

  const onMouseDown = (event: MouseEvent): void => {
    match(event.button)
      .with(3, () => {
        event.preventDefault()
        navigateBack()
      })
      .with(4, () => {
        event.preventDefault()
        navigateForward()
      })
      .otherwise(() => undefined)
  }

  const onDoubleClick = (event: MouseEvent): void => {
    if (!hasDragRegion(event.target)) return
    event.preventDefault()
    void actions.toggleMaximizeWindow()
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('dblclick', onDoubleClick)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('dblclick', onDoubleClick)
  })
}

export default useShortcuts
