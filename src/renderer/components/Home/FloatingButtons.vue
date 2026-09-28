<template>
  <div v-if="isHome" class="floating-buttons-container show">
    <div class="gradient" />
    <div class="df jucb">
      <div class="df floater-container">
        <div class="floater rel">
          <button class="sb-fab show" type="button" @click="logout">⌃</button>
        </div>
      </div>
      <div class="df floater-container">
        <div v-if="showRefresh" class="floater">
          <button class="sb-fab show" type="button" @click="refresh">
            <sync-icon />
          </button>
        </div>
        <div v-if="showSync" class="floater">
          <button class="sb-fab show" type="button" @click="convert">
            <cloud-search-icon />
          </button>
        </div>
        <div v-if="showDownload" class="floater">
          <button class="sb-fab show" type="button" @click="download">
            <download-icon />
          </button>
        </div>
        <div v-if="error" class="floater error-floater">
          <div class="sb-fab error-pill-container show">
            <span>{{ error.message }}</span>
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
