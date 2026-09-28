<template>
  <div class="track-review-container">
    <div class="container-fluid text-left pt-2" style="--px: 2em">
      <div class="default-title text-secondary" style="--fz: 1.2em">
        {{ heading }}
      </div>
    </div>
    <div v-if="track" class="conversions-list">
      <TrackBanner
        v-for="item in conversions"
        :key="item.id"
        :track="item"
        :parent-ref="track"
        :is-conversion="true"
        :is-selected="isSelected(item.youtube_id)"
        @select="selectVideo(item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useSongBasketActions, useSongBasketState } from '../../../state'
import TrackBanner from '../DownloadsView/TrackBanner.vue'
import type { Track, YoutubeResult } from '../model'
import { trackSelectionId } from '../model'

const route = useRoute()
const { state } = useSongBasketState()
const { changeTrackSelection } = useSongBasketActions()

const trackId = computed(() => {
  const id = route.params['id']
  if (typeof id === 'string') return id
  return ''
})
const track = computed<Track | null>(() => {
  const value = state.value
  if (value === null) return null
  return value.convertedTracks.find((item) => item.id === trackId.value) ?? null
})
const conversions = computed<readonly YoutubeResult[]>(() => {
  const value = track.value
  if (value === null) return []
  const result = value.conversion?.yt ?? []
  if (value.custom === null) return result
  return [value.custom, ...result]
})
const heading = computed(() => {
  if (conversions.value.length > 0) return 'Conversions'
  return 'No conversions found, try adding a custom url'
})
const isSelected = (id: string): boolean => trackSelectionId(track.value) === id

const selectVideo = (item: YoutubeResult): void => {
  const value = track.value
  if (value === null) return
  void changeTrackSelection({ trackId: value.id, newId: item.youtube_id })
}
</script>

<style lang="scss" scoped>
.track-review-container {
  width: 100%;
  max-width: 100vw;
}
</style>
