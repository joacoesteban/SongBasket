<template>
  <div class="track-banner-container w100" :class="containerClass">
    <Banner>
      <div
        v-if="isDownload"
        class="background-progress"
        :style="{ '--progress': `${downloadStatus.ptg}%` }"
        :class="downloadStatus.state"
      >
        <div class="progress-label df alic">
          <span class="uppercase half-op point5-em semibold"
            >{{ downloadStatus.state }} {{ downloadStatus.ptg }}%</span
          >
        </div>
      </div>
      <div class="track-data w100">
        <div class="track-image">
          <Card
            row-classes="w100 h100 p-0imp track-banner-card"
            :item="cardItem"
            :options="cardOptions"
          />
        </div>
        <div class="track-info df fldc jucb ellipsis h100">
          <div
            v-if="isConversion && trackFormatted.issue"
            class="df alic text-secondary"
          >
            <span class="bold point75-em color-transition">{{
              trackFormatted.issue
            }}</span>
          </div>
          <div class="ellipsis lh1point5">
            <span class="name">
              <template
                v-for="(segment, index) in trackFormatted.nameSegments"
                :key="`${index}-${segment.text}`"
              >
                <span v-if="segment.matched" class="matching-token">{{
                  segment.text
                }}</span>
                <template v-else>{{ segment.text }}</template>
              </template>
            </span>
          </div>
          <div class="ellipsis">
            <span class="artists">{{ trackFormatted.creator }}</span>
          </div>
          <div v-if="isConversion" class="track-controls df mt-1">
            <button class="link-button m-0" type="button" @click="select">
              {{ selectLabel }}
            </button>
            <button class="link-button m-0" type="button" @click="openVideo">
              Open
            </button>
          </div>
          <div v-if="!isConversion && !isDownload" class="ellipsis">
            <span class="playlists">Inside</span>
          </div>
        </div>
        <div v-if="!isDownload" class="duration">
          <div
            class="default-title bold"
            :style="{ color: duration.color }"
            style="--fz: 2em"
          >
            {{ duration.str }}
          </div>
        </div>
      </div>
    </Banner>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import {
  type FormattedTextSegment,
  formattedTextSegments
} from '../../../../shared/formatted-text'
import { useSongBasketActions } from '../../../state'
import Banner from '../Generic/Banner.vue'
import Card from '../Generic/Card.vue'
import type { Track, TrackItem, YoutubeResult } from '../model'
import {
  formatMinutes,
  trackImage,
  trackName,
  youtubeCreator,
  youtubeImage
} from '../model'

type BannerTrack = TrackItem | YoutubeResult
type DownloadStatus = {
  state: string
  ptg: number
}

const props = withDefaults(
  defineProps<{
    track: BannerTrack
    parentRef?: Track | null
    isDownload?: boolean
    isConversion?: boolean
    isSelected?: boolean
    downloadStatus?: DownloadStatus
  }>(),
  {
    parentRef: null,
    isDownload: false,
    isConversion: false,
    isSelected: false,
    downloadStatus: () => ({ state: 'awaiting', ptg: 0 })
  }
)
const emit = defineEmits<{ select: [] }>()
const { openVideo: openVideoAction } = useSongBasketActions()
const cardOptions = {}
const isYoutubeResult = (track: BannerTrack): track is YoutubeResult =>
  'snippet' in track

const titleSegments = (
  item: YoutubeResult
): readonly FormattedTextSegment[] => {
  if (item.isCustomTrack === true) {
    return [{ text: item.snippet.title, matched: false }]
  }
  return formattedTextSegments(item.nameFormatted)
}

const trackFormatted = computed(() => {
  if (props.isConversion && isYoutubeResult(props.track)) {
    const item = props.track
    let issue: string | null = null
    if (!item.isCustomTrack && item.isDoubtlyConversion)
      issue = 'Does not match'
    return {
      nameSegments: titleSegments(item),
      image: youtubeImage(item),
      creator: youtubeCreator(item),
      issue
    }
  }
  if (isYoutubeResult(props.track)) {
    return {
      nameSegments: titleSegments(props.track),
      image: youtubeImage(props.track),
      creator: youtubeCreator(props.track),
      issue: null
    }
  }
  const name = trackName(props.track)
  return {
    nameSegments: [{ text: name, matched: false }],
    image: trackImage(props.track),
    creator: name,
    issue: null
  }
})
const containerClass = computed(() => {
  if (props.isDownload) return `download ${props.downloadStatus.state}`
  if (props.isConversion) return 'conversion'
  return ''
})
const cardItem = computed(() => ({
  backgroundImage: trackFormatted.value.image
}))
const selectLabel = computed(() => {
  if (props.isSelected) return 'Selected'
  return 'Select'
})
const duration = computed(() => {
  if (props.isDownload) return { str: '', color: '' }
  let seconds = 0
  if (isYoutubeResult(props.track)) {
    seconds = props.track.duration
  } else if ('data' in props.track) {
    seconds = props.track.duration ?? props.track.data.duration_ms / 1000
  } else {
    seconds = props.track.duration_ms / 1000
  }
  return {
    str: formatMinutes(Math.round(seconds)),
    color: durationColor(seconds)
  }
})

const durationColor = (durationDiff: number): string => {
  const factor = 150
  const degree =
    factor - factor * Math.pow(Math.abs(durationDiff / factor), 0.5)
  let hue = degree
  if (degree < 0) hue = 0
  return `hsl(${hue}, 100%, 50%)`
}

const select = (): void => emit('select')
const openVideo = (): void => {
  let id = props.track.id
  if ('youtube_id' in props.track) id = props.track.youtube_id
  void openVideoAction(id)
}
</script>

<style lang="scss" scoped>
.track-banner-container {
  height: 7em;
  transition:
    opacity var(--ts-g),
    background-color var(--ts-g);
  z-index: 0;
  position: relative;
}

.track-image {
  width: 7em;
  min-width: 7em;
  height: 100%;
  position: relative;
}

.track-data {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  padding: 1em 1.5em;
  box-sizing: border-box;
}

.background-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--progress);
  transition: var(--banner-background-transition);
  z-index: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  background: var(--button-purple);
}

.progress-label {
  padding: 0.2em 0.3em;
  white-space: nowrap;
}

.track-info {
  padding-left: 0.7em;
  text-align: left;
}

.name {
  font-weight: 500;
  font-size: 1.5em;
}

.matching-token {
  color: var(--green-accept);
  font-weight: 500;
}

.artists {
  font-weight: bold;
  display: flex;
  margin-top: 0.2em;
  font-size: 0.6em;
}
.track-controls {
  gap: 0.5em;
}
</style>
