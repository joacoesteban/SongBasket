<template>
  <div class="plv-container w100">
    <div
      class="track-list row hideable-container"
      :class="{ hide: navigationPending || filterPending }"
      style="--list-transition-time: 250ms"
    >
      <div
        ref="changesContainer"
        class="changes-container"
        :class="{ show: showingChanges }"
        :style="{ '--changes-height': changesHeightLabel }"
      >
        <div v-if="added.length" class="pb-1">
          <div class="list">
            <div class="label-container">
              <span class="point75-em"
                >Added
                <span class="color-green">+{{ added.length }}</span></span
              >
            </div>
          </div>
          <div class="horizontal-scroller pt-0">
            <Track
              v-for="item in added"
              :key="item.id"
              :is-new="true"
              :item="item"
            />
          </div>
        </div>
        <div v-if="removed.length" class="pb-1">
          <div class="list">
            <div class="label-container">
              <span class="point75-em"
                >Removed
                <span class="color-red">-{{ removed.length }}</span></span
              >
            </div>
          </div>
          <div class="horizontal-scroller pt-0">
            <Track
              v-for="item in removed"
              :key="item.id"
              :is-removed="true"
              :item="item"
            />
          </div>
        </div>
      </div>
      <div class="list">
        <Track
          v-for="item in filteredIterableItems"
          :key="item.id"
          :item="item"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  ref,
  watch
} from 'vue'
import { useRoute } from 'vue-router'

import { navigate, navigationPending, routeNames } from '../../../router'
import { useSearchFilter, useSongBasketState } from '../../../state'
import type { Playlist, TrackItem } from '../model'
import { trackMatches } from '../model'
import { sortTracksByStatus } from '../track-status'
import Track from './Track.vue'

const route = useRoute()
const { state, downloadedTracks } = useSongBasketState()
const isActive = computed(() => route.name === routeNames.playlistView)
const { query: searchQuery, pending: filterPending } = useSearchFilter()
const changesContainer = ref<HTMLElement | null>(null)
const changesHeight = ref(0)

const playlistId = ref('')
const updatePlaylistId = (): void => {
  if (route.name !== routeNames.playlistView) return
  const id = route.params['id']
  if (typeof id !== 'string') return
  playlistId.value = id
}
watch([() => route.name, () => route.params['id']], updatePlaylistId, {
  immediate: true
})
const playlist = computed<Playlist | null>(() => {
  const value = state.value
  if (value === null) return null
  return value.playlists.find((item) => item.id === playlistId.value) ?? null
})
const convertedItems = computed<readonly TrackItem[]>(() => {
  const value = state.value
  if (value === null) return []
  const tracks = value.convertedTracks.filter((track) =>
    track.playlists.some((membership) => membership.id === playlistId.value)
  )
  return sortTracksByStatus(tracks, downloadedTracks.value)
})
const added = computed<readonly TrackItem[]>(
  () => playlist.value?.tracks.added ?? []
)
const removed = computed<readonly TrackItem[]>(
  () => playlist.value?.tracks.removed ?? []
)
const isSynced = computed(
  () => state.value?.syncedPlaylists.includes(playlistId.value) ?? false
)
const isPaused = computed(() => playlist.value?.isPaused === true)
const showingChanges = computed(() => isSynced.value && !isPaused.value)
const iterableItems = computed<readonly TrackItem[]>(() => {
  if (isSynced.value) return convertedItems.value
  return playlist.value?.tracks.items ?? []
})
const filteredIterableItems = computed<readonly TrackItem[]>(() =>
  iterableItems.value.filter((item) => trackMatches(item, searchQuery.value))
)
const changesHeightLabel = computed(() => {
  if (!showingChanges.value) return '0px'
  return `${changesHeight.value}px`
})

const calculateChangesHeight = (): void => {
  if (!isActive.value) return
  const element = changesContainer.value
  if (element === null) return
  changesHeight.value = Array.from(element.children).reduce(
    (height, child) => height + child.getBoundingClientRect().height,
    0
  )
}

let resizeObserver: ResizeObserver | undefined
const disconnectResizeObserver = (): void => {
  resizeObserver?.disconnect()
  resizeObserver = undefined
}
const observeChangesContainer = (): void => {
  if (resizeObserver !== undefined) return
  const element = changesContainer.value
  if (element === null || !('ResizeObserver' in window)) return
  resizeObserver = new ResizeObserver(calculateChangesHeight)
  resizeObserver.observe(element)
}
const redirectIfPlaylistMissing = (): void => {
  if (!isActive.value || state.value === null || playlist.value !== null) return
  void navigate({ name: routeNames.playlistsList })
}

onActivated(() => {
  redirectIfPlaylistMissing()
  void nextTick(() => {
    calculateChangesHeight()
    observeChangesContainer()
  })
})

onDeactivated(disconnectResizeObserver)

watch([playlistId, showingChanges], () => {
  if (!isActive.value) return
  void nextTick(calculateChangesHeight)
})

watch([playlist, isActive], redirectIfPlaylistMissing)

onBeforeUnmount(disconnectResizeObserver)
</script>

<style lang="scss" scoped>
.track-list {
  --card-padding-x: 0.5em;
  --padding-x: 1em;
  width: 100%;
  overflow: hidden;
  padding: var(--padding-x) 0;
  padding-top: 0;
  box-sizing: border-box;

  .list {
    padding: 0 var(--padding-x);
  }
}

.changes-container {
  .label-container {
    font-weight: bold;
    text-transform: uppercase;
    text-align: left;
    padding-left: calc(0.3em + var(--card-padding-x));
  }

  --changes-height: 0px;
  height: var(--changes-height);
  opacity: 0;

  &,
  * {
    box-sizing: border-box;
  }

  transition:
    var(--hover-n-active-transitions),
    height var(--ts-g);

  &.show {
    opacity: 1;
  }
}
</style>
