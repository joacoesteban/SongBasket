<template>
  <div class="w100">
    <div class="banner-list w100">
      <TrackBanner
        v-for="track in downloads"
        :key="track.id"
        :download-status="downloadStatus(track.id)"
        :is-download="true"
        :track="track"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useSongBasketState } from '../../../state'
import type { Track } from '../model'
import TrackBanner from './TrackBanner.vue'

const { state, downloadItems } = useSongBasketState()
const downloads = computed<readonly Track[]>(() => {
  const tracks = state.value?.convertedTracks ?? []
  return downloadItems.value
    .map((item) => tracks.find((track) => track.id === item.id))
    .filter((track): track is Track => track !== undefined)
})

const downloadStatus = (id: string): { state: string; ptg: number } => {
  const item = downloadItems.value.find((candidate) => candidate.id === id)
  if (item === undefined) return { state: 'awaiting', ptg: 0 }
  return {
    state: item.info.currentStatus,
    ptg: item.info.ptg
  }
}
</script>

<style lang="scss" scoped>
.banner-list {
  position: relative;
}
</style>
