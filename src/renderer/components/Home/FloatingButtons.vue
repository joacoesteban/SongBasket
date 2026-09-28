<template>
  <div v-if="isHome" class="floating-buttons-container show">
    <div class="gradient" />
    <div class="df jucb">
      <div class="df floater-container">
        <div class="floater">
          <button class="sb-fab" type="button" @click="logout">⌃</button>
        </div>
      </div>
      <div class="df floater-container">
        <div v-if="showRefresh" class="floater">
          <button class="sb-fab" type="button" @click="refresh">
            <sync-icon />
          </button>
        </div>
        <div v-if="showSync" class="floater">
          <button class="sb-fab" type="button" @click="convert">
            <cloud-search-icon />
          </button>
        </div>
        <div v-if="showDownload" class="floater">
          <button class="sb-fab" type="button" @click="download">
            <download-icon />
          </button>
        </div>
        <div v-if="error" class="floater error-floater">
          <div class="sb-fab error-pill-container show">
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import CloudSearchIcon from '../../assets/icons/cloud-search-icon.vue'
import DownloadIcon from '../../assets/icons/download-icon.vue'
import SyncIcon from '../../assets/icons/sync-icon.vue'
import { routeNames } from '../../router'
import { useSongBasketActions, useSongBasketState } from '../../state'

const route = useRoute()
const { isConnected, ffmpegBinariesDownloaded, loading, error, state } =
  useSongBasketState()
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
const loadingTarget = computed(() => loading.value.target)
const showRefresh = computed(() => !loading.value.value && isConnected.value)
const showSync = computed(
  () =>
    !loading.value.value &&
    isConnected.value &&
    (state.value?.queuedPlaylists.length ?? 0) > 0
)
const showDownload = computed(
  () =>
    (!loading.value.value || loadingTarget.value === 'DOWNLOAD') &&
    ffmpegBinariesDownloaded.value
)

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
.floating-buttons-container {
  pointer-events: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.gradient {
  z-index: 0;
  position: absolute;
  inset: auto 0 0;
  height: 5em;
  background: linear-gradient(to top, black, transparent);
}

.floater-container {
  padding: 0.5em var(--container-padding-x);
}

.floater {
  z-index: 1;
  display: flex;
  align-items: center;
  margin: 0 0.5em;
}

.sb-fab {
  -webkit-app-region: no-drag;
  box-sizing: border-box;
  cursor: pointer;
  pointer-events: all;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--button-purple);
  color: var(--text-white);
  border: 0;
  border-radius: 10em;
  padding: 0.5em;
  width: 2em;
  height: 2em;
}

.error-pill-container {
  width: initial;
  height: initial;
  padding: 0.5em 1em;
  background-color: var(--red-cancel);
}
</style>
