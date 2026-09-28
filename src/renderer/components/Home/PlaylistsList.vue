<template>
  <div ref="listElement" class="pll-container">
    <div
      class="actual-list row hideable-container"
      :class="{ hide: navigationPending }"
      style="--list-transition-time: 250ms"
    >
      <div v-if="playlists.length === 0" class="no-playlists">
        No Playlists found{{ allLoadedLabel }}
      </div>
      <div class="horizontal-scroller">
        <Playlist
          v-for="playlist in syncedPlaylists"
          :key="playlist.id"
          :playlist="playlist"
          @open-playlist="openPlaylist"
        />
      </div>
      <div class="list">
        <Playlist
          v-for="playlist in unsyncedPlaylists"
          :key="playlist.id"
          :playlist="playlist"
          @open-playlist="openPlaylist"
        />
      </div>
      <div v-if="!allLoaded" class="df aliic jucc col-xs-12 p-0">
        <button class="button" type="button" @click="loadMore">
          Load More
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { navigate, navigationPending, routeNames } from '../../router'
import { useSongBasketActions, useSongBasketState } from '../../state'
import Playlist from './Playlist.vue'
import type { Playlist as PlaylistModel } from './model'
import { sortPlaylistsByStatus } from './playlist-status'

const { state, downloadedTracks } = useSongBasketState()
const { loadMorePlaylists } = useSongBasketActions()
const listElement = ref<HTMLElement | null>(null)

const playlists = computed<readonly PlaylistModel[]>(
  () => state.value?.playlists ?? []
)
const syncedPlaylists = computed(() => {
  const value = state.value
  if (value === null) return []
  const synced = value.syncedPlaylists
    .map((id) => playlists.value.find((playlist) => playlist.id === id))
    .filter((playlist): playlist is PlaylistModel => playlist !== undefined)
  return sortPlaylistsByStatus(synced, value, downloadedTracks.value)
})
const unsyncedPlaylists = computed(() => {
  const value = state.value
  if (value === null) return []
  return playlists.value.filter(
    (playlist) => !value.syncedPlaylists.includes(playlist.id)
  )
})
const allLoaded = computed(() => {
  const control = state.value?.control
  if (control === undefined) return true
  return control.total - control.offset <= 0
})
const allLoadedLabel = computed(() => {
  if (allLoaded.value) return ''
  return ', try loading some more'
})

const openPlaylist = (id: string): void => {
  void navigate({ name: routeNames.playlistView, params: { id } })
}

const loadMore = (): void => {
  void loadMorePlaylists()
}

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

.pll-container {
  --padding-x: var(--container-padding-x);
  /* margin-bottom: 2.4rem; */
  text-align: center;
  height: fit-content;
  width: 100%;
  box-sizing: border-box;
  padding: var(--container-padding-x) 0;
  padding-top: 0;
}

.actual-list {
  // TODO Adapt transition to global trasition scale factor
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
