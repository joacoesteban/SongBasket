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
        <span v-if="statusLabel" class="bold uppercase point75-em">{{
          statusLabel
        }}</span>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { routeNames } from '../../../router'
import Card from '../Generic/Card.vue'
import type { TrackItem } from '../model'
import { artistsString, trackImage, trackName } from '../model'

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

const router = useRouter()
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
const statusLabel = computed(() => {
  if (!('flags' in props.item)) return ''
  if (props.item.flags.paused) return 'Paused'
  if (props.item.flags.conversionError) return 'Error'
  if (props.item.flags.selectionIsApplied) return 'Ready'
  return ''
})

const handleClick = (): void => {
  void router.push({
    name: routeNames.trackReview,
    params: { id: props.item.id }
  })
}
</script>

<style lang="scss" scoped></style>
