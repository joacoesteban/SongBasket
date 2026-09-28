<template>
  <div ref="listElement" class="pll-container">
    <div class="actual-list row hideable-container">
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
import { useRouter } from 'vue-router'

import { routeNames } from '../../router'
import { useSongBasketActions, useSongBasketState } from '../../state'
import Playlist from './Playlist.vue'
import type { Playlist as PlaylistModel } from './model'

const router = useRouter()
const { state } = useSongBasketState()
const { loadMorePlaylists } = useSongBasketActions()
const listElement = ref<HTMLElement | null>(null)

const playlists = computed<readonly PlaylistModel[]>(
  () => state.value?.playlists ?? []
)
const syncedPlaylists = computed(() => {
  const value = state.value
  if (value === null) return []
  return value.syncedPlaylists
    .map((id) => playlists.value.find((playlist) => playlist.id === id))
    .filter((playlist): playlist is PlaylistModel => playlist !== undefined)
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
  void router.push({ name: routeNames.playlistView, params: { id } })
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
.pll-container {
  --padding-x: var(--container-padding-x);
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

.no-playlists {
  margin: 4em 0;
}
</style>
