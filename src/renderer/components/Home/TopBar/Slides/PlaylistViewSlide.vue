<template>
  <div v-if="playlist" class="pl-view-slide-container">
    <div class="image" :style="imageStyle">
      <div class="gradient abs-full" />
      <div class="gradient-y abs-full" />
    </div>
    <div class="data">
      <div class="title">
        <span class="bold">{{ playlist.name }}</span>
      </div>
      <div class="track-count">
        <span>{{ trackAmountText }}</span>
      </div>
      <div
        v-if="status"
        class="playlist-status-indicator"
        :style="{ '--status-color': status.color }"
      >
        <span class="bold uppercase">{{ status.message }}</span>
      </div>
      <div class="controls-container">
        <div class="icon-wrapper show">
          <button
            class="icon window-nodrag"
            aria-label="Download playlist"
            @click="downloadPlaylist"
          >
            <download-icon />
          </button>
        </div>
        <div class="icon-wrapper show">
          <button
            class="icon window-nodrag"
            aria-label="Unsync playlist"
            @click="unsyncPlaylist"
          >
            <close-icon />
          </button>
        </div>
        <div v-if="showPause" class="icon-wrapper show">
          <button
            class="icon window-nodrag"
            aria-label="Pause playlist"
            @click="pausePlaylist"
          >
            <pause-icon />
          </button>
        </div>
        <div v-if="showUnpause" class="icon-wrapper show">
          <button
            class="icon window-nodrag"
            aria-label="Resume playlist"
            @click="pausePlaylist"
          >
            <play-icon />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import CloseIcon from '../../../../assets/icons/close-icon.vue'
import DownloadIcon from '../../../../assets/icons/download-icon.vue'
import PauseIcon from '../../../../assets/icons/pause-icon.vue'
import PlayIcon from '../../../../assets/icons/play-icon.vue'
import { routeNames } from '../../../../router'
import { useSongBasketActions, useSongBasketState } from '../../../../state'
import { useModal } from '../../../../state/useModal'

type PlaylistStatus = {
  slug: 'unsynced' | 'paused' | 'synced' | 'error' | 'review' | 'convert'
  message: string
  color: string
}

const route = useRoute()
const router = useRouter()
const state = useSongBasketState()
const actions = useSongBasketActions()
const { openModal } = useModal()

const playlist = computed(() => {
  const id = route.params['id']
  if (typeof id !== 'string') return null
  return state.state.value?.playlists.find((item) => item.id === id) ?? null
})
const playlistTrackIds = computed(() => {
  const current = playlist.value
  if (current === null) return new Set<string>()
  return new Set(current.tracks.items.map((track) => track.id))
})
const status = computed<PlaylistStatus | null>(() => {
  const current = playlist.value
  if (current === null) return null
  if (!state.state.value?.syncedPlaylists.includes(current.id)) {
    return {
      slug: 'unsynced',
      message: 'Click to sync',
      color: 'var(--button-purple)'
    }
  }
  if (current.isPaused) {
    return { slug: 'paused', message: 'Paused', color: 'var(--global-grey)' }
  }

  const tracks = state.state.value?.convertedTracks.filter((track) =>
    playlistTrackIds.value.has(track.id)
  )
  const errorCount =
    tracks?.filter((track) => track.flags.conversionError).length ?? 0
  if (errorCount > 0) {
    return {
      slug: 'error',
      message: `${errorCount} conversion error${pluralSuffix(errorCount)}`,
      color: 'var(--red-cancel)'
    }
  }
  const conversionCount =
    tracks?.filter((track) => !track.flags.converted).length ?? 0
  if (conversionCount > 0) {
    return {
      slug: 'convert',
      message: `${conversionCount} track${pluralSuffix(conversionCount)} to convert`,
      color: 'var(--button-purple)'
    }
  }
  return { slug: 'synced', message: 'Synced', color: 'var(--green-accept)' }
})
const trackAmountText = computed(() => {
  const amount = playlist.value?.tracks.total ?? 0
  return `${amount} Track${pluralSuffix(amount)}`
})
const imageStyle = computed<Record<string, string>>(() => {
  const image = playlist.value?.images[0]?.url
  if (image === undefined) return {}
  return { backgroundImage: `url("${image}")` }
})
const showPause = computed(() => status.value?.slug !== 'paused')
const showUnpause = computed(() => status.value?.slug === 'paused')

const pluralSuffix = (amount: number): string => {
  if (amount === 1) return ''
  return 's'
}
const downloadPlaylist = (): void => {
  const current = playlist.value
  if (current === null) return
  void actions.download([current.id])
  void router.push({ name: routeNames.downloadsView })
}
const unsyncPlaylist = (): void => {
  const current = playlist.value
  if (current === null) return
  openModal({ kind: 'unsync', playlistId: current.id })
}
const pausePlaylist = (): void => {
  const current = playlist.value
  if (current === null) return
  void actions.pausePlaylist(current.id)
}
</script>

<style lang="scss" scoped>
.pl-view-slide-container {
  padding-left: var(--container-padding-x);
  position: relative;
  display: flex;
}

$tit-fz: 1.2em;

.image {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  z-index: 0;
  width: 12em;
  max-width: 40%;
  background-position: center;
  background-size: cover;

  .gradient {
    background: linear-gradient(
      to right,
      var(--global-grey-secondary),
      transparent 150%
    );
  }

  .gradient-y {
    background: linear-gradient(
      to top,
      var(--global-grey-secondary),
      transparent 150%
    );
  }
}

.data {
  margin-top: calc(var(--tb-title-height) * 1.5);
  margin-bottom: 1em;
  z-index: 1;

  > div {
    line-height: 1;
    display: flex;
  }

  .title {
    span {
      font-size: $tit-fz;
    }
  }

  .track-count {
    span {
      font-size: $tit-fz * 0.5;
    }
  }

  .playlist-status-indicator {
    margin-top: 0.5em;
    color: var(--status-color);
  }
}

.controls-container {
  display: flex;
  align-items: center;
  padding-left: 0.25em;
  $icon-size: 1.5em;

  .icon-wrapper {
    box-sizing: border-box;
    width: 0;
    padding: 0;
    transition: var(--hover-n-active-transitions);
    transform: scale(0.7);
    opacity: 0;
    pointer-events: none;

    &.show {
      $p: 0.2em;
      pointer-events: all;
      transform: initial;
      padding: 0 $p;
      opacity: 1;
      width: $icon-size + 2 * $p;
    }
  }

  button.icon {
    &:hover {
      background-color: var(--button-purple);
    }

    box-shadow: none;
    transition:
      box-shadow var(--ts-g),
      var(--hover-n-active-transitions);

    &:active {
      opacity: 0.7;
      transform: scale(0.95);
    }

    background-color: transparent;
    border-radius: 50%;
    padding: 0.3em;
    width: $icon-size;
    height: $icon-size;
    outline: 0;
    border: 0;

    svg {
      padding: 0;
    }
  }
}
</style>
