<template>
  <div class="track-review-slide-container">
    <track-banner v-if="track" class="parent-track-container" :track="track" />
    <div class="controls-container df alic container-fluid">
      <button
        v-if="showPause || showUnpause"
        class="link-button"
        @click="pauseTrack"
      >
        <span>{{ pauseLabel }}</span>
        <span class="icon-wrapper show">
          <span v-if="showPause" class="icon window-nodrag">
            <pause-icon />
          </span>
          <span v-if="showUnpause" class="icon window-nodrag">
            <play-icon />
          </span>
        </span>
      </button>
      <button class="link-button" @click="customUrl">
        <span>Custom Url</span>
        <span class="icon-wrapper show">
          <span class="icon window-nodrag">
            <link-icon />
          </span>
        </span>
      </button>
      <button class="link-button" @click="searchYt">
        <span>Search YouTube</span>
        <span class="icon-wrapper show">
          <span class="icon window-nodrag">
            <magnifier-icon />
          </span>
        </span>
      </button>
      <button
        class="link-button hidable-item"
        :class="{ hidden: !showReset }"
        :disabled="!showReset"
        @click="reset"
      >
        <span>Reset Selection</span>
        <span class="icon-wrapper show">
          <span class="icon window-nodrag">
            <restart-icon />
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import LinkIcon from '../../../../assets/icons/link-icon.vue'
import MagnifierIcon from '../../../../assets/icons/magnifier-icon.vue'
import PauseIcon from '../../../../assets/icons/pause-icon.vue'
import PlayIcon from '../../../../assets/icons/play-icon.vue'
import RestartIcon from '../../../../assets/icons/restart-icon.vue'
import { useSongBasketActions, useSongBasketState } from '../../../../state'
import { useModal } from '../../../../state/useModal'
import TrackBanner from '../../DownloadsView/TrackBanner.vue'

const route = useRoute()
const state = useSongBasketState()
const actions = useSongBasketActions()
const { openModal } = useModal()

const track = computed(() => {
  const id = route.params['id']
  if (typeof id !== 'string') return null
  return (
    state.state.value?.convertedTracks.find((item) => item.id === id) ?? null
  )
})
const showPause = computed(() => track.value?.flags.paused === false)
const showUnpause = computed(() => track.value?.flags.paused === true)
const pauseLabel = computed(() => {
  if (showPause.value) return 'Pause'
  return 'Unpause'
})
const showReset = computed(() => {
  const current = track.value
  if (current === null || current.conversion === null) return false
  return current.conversion.yt.length > 0 && !current.flags.selectionIsApplied
})

const pauseTrack = (): void => {
  const current = track.value
  if (current === null) return
  void actions.pauseTrack(current.id)
}
const customUrl = (): void => {
  const current = track.value
  if (current === null) return
  openModal({ kind: 'custom-track-url', trackId: current.id })
}
const searchYt = (): void => {
  const query = track.value?.query?.query
  if (query === undefined || query.length === 0) return
  void actions.searchVideo(query)
}
const reset = (): void => {
  const current = track.value
  if (current === null) return
  void actions.changeTrackSelection({
    trackId: current.id,
    newId: null
  })
}
</script>

<style lang="scss" scoped>
.track-review-slide-container {
  padding-top: var(--tb-title-height);
}

.controls-container {
  display: flex;
  align-items: center;
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

  span.icon {
    display: flex;
    box-shadow: none;
    transition:
      box-shadow var(--ts-g),
      var(--hover-n-active-transitions);
    background-color: transparent;
    border-radius: 50%;
    padding: 0.3em;
    min-width: $icon-size;
    height: $icon-size;

    svg {
      padding: 0;
    }
  }
}
</style>
