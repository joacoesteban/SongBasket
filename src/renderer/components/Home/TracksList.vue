<template>
  <div ref="listElement" class="tkl-container">
    <div
      ref="actual-list"
      class="actual-list row hideable-container"
      :class="{ hide: navigationPending }"
      style="--list-transition-time: 250ms"
    >
      <div v-if="tracks.length === 0" class="no-tracks">No Tracks found</div>
      <div class="list row">
        <Track v-for="track in tracks" :key="track.id" :item="track" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { navigationPending } from '../../router'
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
$bezier: cubic-bezier(0, 1, 0, 1);
$bezier-chill: cubic-bezier(0, 1, 0.5, 1);

.tkl-container {
  --padding-x: var(--container-padding-x);
  --card-padding-x: 0.5em;
  /* margin-bottom: 2.4rem; */
  text-align: center;
  height: fit-content;
  width: 100%;
  box-sizing: border-box;
  padding: var(--container-padding-x) 0;
  padding-top: 0;
}

.actual-list {
  > .list {
    padding: 0 var(--padding-x);
  }
}

.filters-container {
  pointer-events: none;
  padding: 0.5em;
  margin-bottom: 1em;
  position: sticky;
  top: 0;
  z-index: 1;

  .filters-background {
    background: linear-gradient(
      180deg,
      var(--global-grey-secondary),
      transparent
    );
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: -1;
  }

  .filters-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    // padding: 0 1em;
  }

  .search-bar {
    pointer-events: all;

    .filters-background {
      background: var(--global-grey-secondary);
    }

    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    border-radius: 10em;
    padding-left: 1em;
    padding-right: 0.2em;
  }
}

.no-playlists {
  margin: 4em 0;
}

.background-container {
  position: sticky;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}
</style>
