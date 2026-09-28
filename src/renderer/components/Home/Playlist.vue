<template>
  <Card
    :pressed="isQueued"
    :item="playlistFormatted"
    :options="cardOptions"
    :row-classes="rowClasses"
    @click="handleClick"
  >
    <div class="playlist-data">
      <div v-if="showChanges" class="track-changes-container">
        <div v-if="playlist.tracks.added.length" class="track-change added">
          <span class="bold">+{{ playlist.tracks.added.length }}</span>
        </div>
        <div v-if="playlist.tracks.removed.length" class="track-change removed">
          <span class="bold">-{{ playlist.tracks.removed.length }}</span>
        </div>
      </div>
      <div class="title">
        <span class="bold">{{ playlist.name }}</span>
      </div>
      <div class="track-ammount">
        <span class="regular">{{ trackAmountStr }}</span>
      </div>
      <div
        class="playlist-status-indicator"
        :class="status.slug"
        :style="{ '--status-color': status.color }"
      >
        <span class="bold uppercase">{{ status.msg }}</span>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { SpotifyPlaylistId } from '../../../@types/Spotify'
import { useSongBasketActions, useSongBasketState } from '../../state'
import Card from './Generic/Card.vue'
import { type Playlist, playlistImage, playlistStatus } from './model'

defineOptions({ name: 'PlaylistCard' })

type Status = ReturnType<typeof playlistStatus>

const props = defineProps<{
  playlist: Playlist
}>()
const emit = defineEmits<{ openPlaylist: [id: SpotifyPlaylistId] }>()

const { state } = useSongBasketState()
const { queuePlaylist } = useSongBasketActions()

const currentState = computed(() => state.value)
const status = computed<Status>(() => {
  const value = currentState.value
  if (value === null) {
    return {
      baseState: 'idle',
      color: 'var(--button-purple)',
      msg: 'Not synced',
      slug: 'not-synced'
    }
  }
  return playlistStatus(props.playlist, value)
})
const isSynced = computed(() => status.value.baseState === 'synced')
const isQueued = computed(() => status.value.baseState === 'queued')
const showChanges = computed(
  () => isSynced.value && status.value.baseState !== 'paused'
)
const trackAmountStr = computed(() => {
  const count = props.playlist.tracks.total
  let suffix = ' Tracks'
  if (count === 1) suffix = ' Track'
  return `${count}${suffix}`
})
const playlistFormatted = computed(() => ({
  backgroundImage: playlistImage(props.playlist)
}))
const cardOptions = computed(() => {
  if (isSynced.value) return { size: '.8em', height: '3.5em' }
  return {}
})
const rowClasses = computed(() => {
  if (status.value.baseState === 'paused') return 'col-lg-3 col-md-5 col-xs-12'
  return 'col-lg-4 col-md-6 col-xs-12'
})

const handleClick = (): void => {
  if (isSynced.value) {
    emit('openPlaylist', props.playlist.id)
    return
  }
  void queuePlaylist(props.playlist.id)
}
</script>

<style lang="scss" scoped>
$q-false-color: #1b1b1b;
$q-true-color: rgb(103, 214, 0);
$bezier-tranka: cubic-bezier(0.12, 0.82, 0, 1);

$playlist-height: 4em;
$title-size: 0.8em;

.playlist-data {
  text-align-last: left;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
  width: 100%;

  .title {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    > span {
      font-size: $title-size;
    }
  }

  .track-ammount {
    > span {
      font-size: $title-size * 0.75;
    }
  }
}

.track-changes-container {
  position: absolute;
  display: flex;
  bottom: 0;
  right: 0;

  .track-change {
    // $size: 1.5em;
    // width: $size;
    // height: $size;
    // margin: 0 $size/10;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;

    &:nth-last-child(1) {
      margin-left: 0.3em;
    }

    > span {
      line-height: 1;
      font-size: 1.25em;
    }

    &.added {
      color: var(--green-accept);
    }

    &.removed {
      color: var(--red-cancel);
    }
  }
}
</style>

<style lang="scss">
$title-size: 0.8em;

.playlist-status-indicator {
  color: var(--status-color);

  > span {
    font-size: $title-size * 0.75;
  }
}
</style>
