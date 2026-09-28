<template>
  <Card
    :item="itemFormatted"
    :row-classes="rowClasses"
    :options="cardOptions"
    @click="handleClick"
  >
    <div class="w100 point75-em">
      <div class="ellipsis">
        <span class="bold">{{ trackName(item) }}</span>
      </div>
      <div class="ellipsis">
        <span class="regular point75-em">{{ artistsString(item) }}</span>
      </div>
      <div class="ellipsis track-status">
        <span v-if="isNew" class="bold uppercase point75-em color-green"
          >new</span
        >
        <span v-if="isRemoved" class="bold uppercase point75-em color-red"
          >removed</span
        >
        <span
          v-if="status !== null"
          class="bold uppercase point75-em"
          :style="{ color: status.color }"
        >
          {{ status.label }}
        </span>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { navigate, routeNames } from '../../../router'
import { useSongBasketState } from '../../../state'
import Card from '../Generic/Card.vue'
import { artistsString, trackImage, trackName } from '../model'
import type { TrackItem } from '../model'
import { canReviewTrack, trackStatus } from '../track-status'

defineOptions({ name: 'TrackCard' })

const props = withDefaults(
  defineProps<{
    item: TrackItem
    isNew?: boolean
    isRemoved?: boolean
    isReviewing?: boolean
  }>(),
  {
    isNew: false,
    isRemoved: false,
    isReviewing: false
  }
)

const { downloadedTracks } = useSongBasketState()

const HOVER_SCALE_OFF = false
const cardOptions = computed(() => {
  let size = ''
  if (props.isNew || props.isRemoved) size = '.8em'
  return {
    height: '2.5em',
    xRotationFactor: 0.01,
    hovScaleFactor: HOVER_SCALE_OFF,
    paddingY: '.5em',
    paddingX: 'var(--card-padding-x)',
    size
  }
})
const rowClasses = computed(() => {
  if (props.isReviewing) return 'col-sm-12'
  return 'col-lg-3 col-md-4 col-s-6 col-xs-12'
})
const itemFormatted = computed(() => ({
  backgroundImage: trackImage(props.item)
}))
const status = computed(() => {
  if (!('flags' in props.item)) return null
  return trackStatus(props.item, downloadedTracks.value)
})

const handleClick = (): void => {
  const currentStatus = status.value
  if (currentStatus === null || !canReviewTrack(currentStatus.slug)) return
  void navigate({
    name: routeNames.trackReview,
    params: { id: props.item.id }
  })
}
</script>

<style lang="scss" scoped></style>
