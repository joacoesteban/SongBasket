<template>
  <div v-if="playlist !== null" class="container">
    <div class="header">
      Are you sure you want to unsync
      <span class="bold">{{ playlist.name }}</span
      >?
    </div>
    <div class="info light">
      {{ playlist.tracks.total }} tracks will be deleted from your Hard Drive
    </div>
    <div class="controls df jucc aliic">
      <button class="button accept" @click="accept">Yes</button>
      <button class="button cancel" @click="emit('close')">No</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { SpotifyPlaylistId } from '../../../@types/Spotify'
import { useSongBasketActions } from '../../state/useSongBasketActions'
import { useSongBasketState } from '../../state/useSongBasketState'

defineOptions({ name: 'UnsyncModal' })

const props = defineProps<{ playlistId: SpotifyPlaylistId }>()
const emit = defineEmits<{ close: [] }>()
const actions = useSongBasketActions()
const state = useSongBasketState()
const playlist = computed(
  () =>
    state.state.value?.playlists.find(({ id }) => id === props.playlistId) ??
    null
)

const accept = async (): Promise<void> => {
  await actions.unsyncPlaylist(props.playlistId)
  emit('close')
}
</script>

<style lang="scss" scoped>
.container {
  padding: 1em;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info {
  font-size: 0.7em;
}

.controls {
  margin-top: 1em;

  .button {
    margin: 0 0.3em;
    width: 5em;
  }
}
</style>
