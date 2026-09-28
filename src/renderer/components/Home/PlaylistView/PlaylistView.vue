<template>
  <div class="plv-container w100">
    <div class="track-list row hideable-container">
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
        <Track v-for="item in iterableItems" :key="item.id" :item="item" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { routeNames } from '../../../router'
import { useSongBasketState } from '../../../state'
import type { Playlist, TrackItem } from '../model'
import Track from './Track.vue'

const route = useRoute()
const router = useRouter()
const { state } = useSongBasketState()
const changesContainer = ref<HTMLElement | null>(null)
const changesHeight = ref(0)

const playlistId = computed(() => {
  const id = route.params['id']
  if (typeof id === 'string') return id
  return ''
})
const playlist = computed<Playlist | null>(() => {
  const value = state.value
  if (value === null) return null
  return value.playlists.find((item) => item.id === playlistId.value) ?? null
})
const convertedItems = computed<readonly TrackItem[]>(() => {
  const value = state.value
  if (value === null) return []
  return value.convertedTracks.filter((track) =>
    track.playlists.some((membership) => membership.id === playlistId.value)
  )
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
const changesHeightLabel = computed(() => {
  if (!showingChanges.value) return '0px'
  return `${changesHeight.value}px`
})

const calculateChangesHeight = (): void => {
  const element = changesContainer.value
  if (element === null) return
  changesHeight.value = Array.from(element.children).reduce(
    (height, child) => height + child.getBoundingClientRect().height,
    0
  )
}

let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  void nextTick(calculateChangesHeight)
  if (changesContainer.value !== null && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(calculateChangesHeight)
    resizeObserver.observe(changesContainer.value)
  }
})

watch([playlistId, showingChanges], () => {
  void nextTick(calculateChangesHeight)
})

watch(playlist, (value) => {
  if (value !== null) return
  void router.push({ name: routeNames.playlistsList })
})

onBeforeUnmount(() => resizeObserver?.disconnect())
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
