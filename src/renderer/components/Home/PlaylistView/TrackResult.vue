<template>
  <Card
    :item="itemFormatted"
    :row-classes="rowClasses"
    :options="cardOptions"
    @click="emit('setSelection')"
  >
    <div class="w100 point75-em df alic">
      <div class="ellipsis pr-2">
        <div
          v-if="itemFormatted.issue"
          class="issue color-red point75-em semibold"
        >
          {{ itemFormatted.issue }}
        </div>
        <div class="ellipsis name">
          <span>{{ itemFormatted.name }}</span>
        </div>
        <div class="ellipsis">
          <span class="regular point75-em"
            ><span class="semibold">{{ itemFormatted.uploader }}</span></span
          >
        </div>
      </div>
      <div class="duration-diff">
        <span class="bold" :style="{ color: durationColor }">{{
          itemFormatted.duration
        }}</span>
      </div>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import Card from '../Generic/Card.vue'
import { type YoutubeResult, youtubeImage } from '../model'

defineOptions({ name: 'TrackResultCard' })

const props = defineProps<{
  item: YoutubeResult
  durationColor?: string
  isSelected?: boolean
}>()
const emit = defineEmits<{ setSelection: [] }>()
const HOVER_SCALE_OFF = false

const cardOptions = {
  height: '2.5em',
  xRotationFactor: 0.01,
  hovScaleFactor: HOVER_SCALE_OFF,
  paddingY: '.5em',
  paddingX: 'var(--card-padding-x)'
}
const rowClasses = computed(() => {
  if (props.isSelected === true) return 'col-sm-12 border-green'
  return 'col-sm-12 border-transparent'
})
const itemFormatted = computed(() => {
  const item = props.item
  let issue: string | null = null
  if (!item.isCustomTrack && item.isDoubtlyConversion) {
    issue = 'Does not match'
  }
  let name = item.nameFormatted
  if (item.isCustomTrack === true) name = item.snippet.title
  let duration = `${Math.round(item.durationDiff)}''`
  if (item.isCustomTrack === true) duration = 'CUSTOM'
  return {
    ...item,
    name,
    uploader: item.snippet.channelTitle,
    issue,
    backgroundImage: youtubeImage(item),
    duration
  }
})
</script>

<style lang="scss">
span.matching-token {
  color: var(--green-accept);
  font-weight: 500;
}
</style>
<style lang="scss" scoped>
.duration-diff > span {
  font-size: 3em;
}
</style>
