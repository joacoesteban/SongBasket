<template>
  <div ref="listElement" class="tkl-container">
    <div class="actual-list row hideable-container">
      <div v-if="tracks.length === 0" class="no-tracks">No Tracks found</div>
      <div class="list row">
        <Track v-for="track in tracks" :key="track.id" :item="track" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useSongBasketState } from '../../state'
import Track from './PlaylistView/Track.vue'
import type { Track as TrackModel } from './model'

const { state } = useSongBasketState()
const listElement = ref<HTMLElement | null>(null)
const tracks = computed<readonly TrackModel[]>(
  () => state.value?.convertedTracks ?? []
)

const onScroll = (): void => {
  const element = listElement.value
  if (element === null) return
  const ratio = Math.min(element.scrollTop / 100, 1)
  element.style.setProperty('--scroll-opacity', String(ratio))
}

onMounted(() => {
  listElement.value?.addEventListener('scroll', onScroll)
})

onBeforeUnmount(() => {
  listElement.value?.removeEventListener('scroll', onScroll)
})
</script>

<style lang="scss" scoped>
.tkl-container {
  --padding-x: var(--container-padding-x);
  --card-padding-x: 0.5em;
  --scroll-opacity: 0;
  text-align: center;
  height: fit-content;
  width: 100%;
  box-sizing: border-box;
  padding: var(--container-padding-x) 0;
  padding-top: 0;
}

.actual-list > .list {
  padding: 0 var(--padding-x);
}

.no-tracks {
  margin: 4em 0;
}
</style>
