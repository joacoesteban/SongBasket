<template>
  <div class="tracklist-container">
    <Card
      v-for="(track, index) in items"
      :key="index"
      :item="{ backgroundImage: track.data.album.images[0]?.url }"
    />
  </div>
</template>

<script setup lang="ts">
import type { DeepReadonly } from 'vue'

import type { SongBasketTrackDto } from '../../../../shared/ipc'
import Card from './Card.vue'

defineOptions({ name: 'TracklistView' })

const { items } = defineProps<{
  items: readonly DeepReadonly<SongBasketTrackDto>[]
}>()
</script>

<style lang="scss" scoped></style>
