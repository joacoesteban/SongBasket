<template>
  <div class="tracklist-container">
    <Card
      v-for="track in items"
      :key="track.id"
      :item="{ backgroundImage: undefined }"
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
