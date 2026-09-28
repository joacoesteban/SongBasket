<template>
  <div v-if="modal !== null">
    <Unsync
      v-if="unsyncRequest !== null"
      :playlist-id="unsyncRequest.playlistId"
      @close="closeModal"
    />
    <CustomTrackUrl
      v-else-if="customTrackUrlRequest !== null"
      :track-id="customTrackUrlRequest.trackId"
      @close="closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { type ModalRequest, useModal } from '../../state/useModal'
import CustomTrackUrl from './CustomTrackUrl.vue'
import Unsync from './Unsync.vue'

type UnsyncRequest = Extract<ModalRequest, { kind: 'unsync' }>
type CustomTrackUrlRequest = Extract<ModalRequest, { kind: 'custom-track-url' }>

const { modal, closeModal } = useModal()
const unsyncRequest = computed<UnsyncRequest | null>(() => {
  const request = modal.value
  if (request?.kind !== 'unsync') return null
  return request
})
const customTrackUrlRequest = computed<CustomTrackUrlRequest | null>(() => {
  const request = modal.value
  if (request?.kind !== 'custom-track-url') return null
  return request
})
</script>
