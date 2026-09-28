<template>
  <div class="tkl-container">
    <div
      class="actual-list row hideable-container"
      :class="{ hide: navigationPending || filterPending }"
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
import { computed } from 'vue'

import { navigationPending } from '../../router'
import { useSearchFilter, useSongBasketState } from '../../state'
import Track from './PlaylistView/Track.vue'
import type { Track as TrackModel } from './model'
import { trackMatches } from './model'
import { sortTracksByStatus } from './track-status'

const { state, downloadedTracks } = useSongBasketState()
const { query: searchQuery, pending: filterPending } = useSearchFilter()
const sortedTracks = computed<readonly TrackModel[]>(() => {
  const value = state.value
  if (value === null) return []
  return sortTracksByStatus(value.convertedTracks, downloadedTracks.value)
})
const tracks = computed<readonly TrackModel[]>(() =>
  sortedTracks.value.filter((track) => trackMatches(track, searchQuery.value))
)
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
