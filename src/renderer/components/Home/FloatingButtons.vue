<template>
  <div v-if="isHome" class="floating-buttons-container show">
    <div class="gradient" />
    <div class="df jucb">
      <div v-if="buttonsMounted" class="df floater-container">
        <div v-if="isDev" class="floater rel">
          <button
            class="sb-fab"
            :class="{ show: buttonVisibility.dropdown }"
            type="button"
            @click="logout"
          >
            ⌃
          </button>
        </div>
      </div>
      <div v-if="buttonsMounted" class="df floater-container">
        <div class="floater">
          <button
            class="sb-fab"
            :class="{ show: buttonVisibility.refresh }"
            type="button"
            @click="refresh"
          >
            <sync-icon />
          </button>
        </div>
        <div class="floater">
          <button
            class="sb-fab"
            :class="{ show: buttonVisibility.sync }"
            type="button"
            @click="convert"
          >
            <cloud-search-icon />
          </button>
        </div>
        <div class="floater">
          <button
            class="sb-fab"
            :class="{ show: buttonVisibility.download }"
            type="button"
            @click="download"
          >
            <download-icon />
          </button>
        </div>
      </div>
      <div v-if="pillMounted" class="floater error-floater">
        <div class="sb-fab error-pill-container" :class="{ show: pillShown }">
          <span>{{ errorPillMessage }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import CloudSearchIcon from '../../assets/icons/cloud-search-icon.vue'
import DownloadIcon from '../../assets/icons/download-icon.vue'
import SyncIcon from '../../assets/icons/sync-icon.vue'
import { routeNames } from '../../router'
import { useSongBasketActions, useSongBasketState } from '../../state'
import {
  type ErrorPill,
  appErrorPill,
  connectionErrorPill,
  floatingButtons
} from './floating-buttons'

const route = useRoute()
const isDev = import.meta.env.DEV
const {
  connectedToInternet,
  connectedToApi,
  ffmpegBinariesDownloaded,
  loading,
  error,
  state
} = useSongBasketState()
const {
  refresh: refreshAction,
  convertYoutube,
  download: downloadTracks,
  logout: logoutAction
} = useSongBasketActions()

const isHome = computed(() => {
  const name = route.name
  return (
    name === routeNames.home ||
    name === routeNames.playlistsList ||
    name === routeNames.tracksList ||
    name === routeNames.playlistView ||
    name === routeNames.trackReview ||
    name === routeNames.downloadsView
  )
})

const fullConnection = computed(
  () => connectedToInternet.value && connectedToApi.value
)
const activeErrorPill = ref<ErrorPill | null>(null)
const buttonsHidden = ref(false)
const buttonsMounted = ref(true)
const pillMounted = ref(false)
const pillShown = ref(false)
const timers = new Set<ReturnType<typeof setTimeout>>()

const buttonVisibility = computed(() =>
  floatingButtons({
    loading: loading.value.value,
    loadingTarget: loading.value.target,
    internet: connectedToInternet.value,
    api: connectedToApi.value,
    ffmpeg: ffmpegBinariesDownloaded.value,
    queuedPlaylists: state.value?.queuedPlaylists.length ?? 0,
    syncedPlaylists: state.value?.syncedPlaylists.length ?? 0,
    dev: isDev,
    errorPill: buttonsHidden.value
  })
)
const errorPillMessage = computed(() => {
  const pill = activeErrorPill.value
  if (pill === null) return ''
  return pill.message
})

const clearTimers = (): void => {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
}

const schedule = (callback: () => void, delay: number): void => {
  const timer = setTimeout(() => {
    timers.delete(timer)
    callback()
  }, delay)
  timers.add(timer)
}

const hideErrorPill = (): void => {
  if (
    activeErrorPill.value === null &&
    !pillMounted.value &&
    !buttonsHidden.value
  ) {
    return
  }
  clearTimers()
  pillShown.value = false
  schedule(() => {
    pillMounted.value = false
    activeErrorPill.value = null
    buttonsMounted.value = true
    schedule(() => {
      buttonsHidden.value = false
    }, 100)
  }, 400)
}

const showErrorPill = (pill: ErrorPill): void => {
  clearTimers()
  activeErrorPill.value = pill
  buttonsHidden.value = true
  if (pillMounted.value) {
    pillShown.value = true
    schedule(hideErrorPill, pill.hideAfterMs)
    return
  }
  pillShown.value = false
  schedule(() => {
    buttonsMounted.value = false
    pillMounted.value = true
    schedule(() => {
      pillShown.value = true
      schedule(hideErrorPill, pill.hideAfterMs)
    }, 100)
  }, 400)
}

watch(error, (nextError) => {
  if (nextError === null) return
  showErrorPill(appErrorPill(nextError))
})
watch(fullConnection, (connected) => {
  if (connected) {
    hideErrorPill()
    return
  }
  const pill = connectionErrorPill({
    internet: connectedToInternet.value,
    api: connectedToApi.value
  })
  if (pill !== null) showErrorPill(pill)
})
onBeforeUnmount(clearTimers)

const refresh = (): void => {
  void refreshAction()
}
const convert = (): void => {
  void convertYoutube()
}
const download = (): void => {
  void downloadTracks()
}
const logout = (): void => {
  void logoutAction()
}
</script>

<style lang="scss" scoped>
$t: var(--ts-g);
$offsetY: 0.5em;
$gradient-height: 5em;
$whole-height: 5em;

.floating-buttons-container {
  pointer-events: none;
  position: fixed;
  bottom: -$whole-height;
  left: 0;
  right: 0;
  transition: bottom $t;

  .floater-container {
    padding: $offsetY var(--container-padding-x);
  }

  z-index: 10;

  &.show {
    bottom: 0;
  }
}

.gradient {
  z-index: 0;
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;

  height: $gradient-height;

  background: linear-gradient(to top, black, transparent);
}

.floater {
  z-index: 1;
  display: flex;
  align-items: center;
  // width: 100%;
  margin-left: 0.5em;
  margin-right: 0.5em;

  &:nth-child(1) {
    justify-content: flex-start;
  }

  &:nth-child(2),
  &.error-floater {
    justify-content: center;
  }

  &:nth-child(3) {
    justify-content: flex-end;
  }
}
</style>

<style lang="scss">
$offsetY: 0.5em;
$t: var(--ts-g);

.sb-fab {
  -webkit-app-region: no-drag;
  box-sizing: border-box;
  border: none;
  padding: 0;
  font: inherit;
  appearance: none;
  cursor: pointer;
  pointer-events: all;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-purple);
  color: var(--text-white);
  border-radius: 10em;
  $sh-color: rgba(0, 0, 0, 0.2);

  box-shadow:
    inset 3px 3px 10px $sh-color,
    0 4px 7px 2px $sh-color;

  $padding: 0.5em;
  padding: $padding;

  $size: 2em;
  width: $size;
  height: $size;

  min-width: $size;
  max-width: $size;
  min-height: $size;
  max-height: $size;

  position: relative;
  bottom: -($size + $offsetY + 1em);

  transition:
    transform $t,
    opacity $t,
    bottom $t;

  &.show,
  &.error-pill-container.show {
    bottom: 0;
  }

  &:hover {
    transform: scale(1.15);
  }

  &:active {
    transform: scale(0.95);
    opacity: 0.7;
  }

  &.error-pill-container {
    &:hover {
      transform: scale(1.03);
    }

    &:active {
      transform: scale(0.98);
      opacity: 0.7;
    }

    width: initial;
    height: initial;

    min-width: initial;
    max-width: initial;
    min-height: initial;
    max-height: initial;
    bottom: -120%;

    background-color: var(--red-cancel);

    font-weight: 500;
    // white-space: nowrap;
    padding-left: 1em;
    padding-right: 1em;

    span {
      font-size: 0.65;
    }
  }
}
</style>
