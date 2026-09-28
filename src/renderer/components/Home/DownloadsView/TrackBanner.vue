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
          <span class="uppercase half-op point5-em semibold">
            {{ downloadStatus.state }} {{ downloadStatus.ptg }}%
          </span>
        </div>
      </div>
      <div class="track-data w100">
        <div class="track-image">
          <div v-if="isDownload" class="see-track-link">
            <span class="sb-link uppercase semibold">see track</span>
          </div>
          <Card
            row-classes="w100 h100 p-0imp track-banner-card"
            :item="cardItem"
            :options="cardOptions"
          />
        </div>
        <div class="track-info df fldc jucb ellipsis h100">
          <div class="df alic">
            <div
              v-if="isConversion"
              class="sb-tag mr-1 hidable-item gradient-background-cycle-less"
              :class="{ hidden: !isSelected }"
              style="--fz: 0.7em"
            >
              <b>Selected</b>
            </div>
            <div
              v-if="isConversion && trackFormatted.issue"
              class="df alic text-secondary"
            >
              <span
                v-if="trackFormatted.issue.warn"
                class="svg-icon"
                style="--size: 0.75em; margin-right: 0.3em"
              >
                <WarningIcon />
              </span>
              <span class="conversion-status df alic">
                <span
                  class="bold point75-em color-transition"
                  :style="{ color: trackFormatted.issue.color || '' }"
                >
                  {{ trackFormatted.issue.label }}
                </span>
              </span>
            </div>
          </div>
          <div class="ellipsis lh1point5">
            <span class="name">
              <template
                v-for="(segment, index) in trackFormatted.nameSegments"
                :key="`${index}-${segment.text}`"
              >
                <span v-if="segment.matched" class="matching-token">
                  {{ segment.text }}
                </span>
                <template v-else>{{ segment.text }}</template>
              </template>
            </span>
          </div>
          <div class="ellipsis">
            <span class="artists">{{ trackFormatted.creator }}</span>
          </div>
          <div v-if="isConversion" class="track-controls df mt-1">
            <button
              v-if="selectLabel !== null"
              class="link-button m-0"
              type="button"
              @click="select"
            >
              {{ selectLabel }}
            </button>
            <button class="link-button m-0" type="button" @click="openVideo">
              Open
            </button>
          </div>
          <div
            v-if="!isConversion && trackFormatted.playlists.length > 0"
            class="ellipsis"
          >
            <span class="playlists">
              Inside <b>{{ trackFormatted.playlists }}</b>
            </span>
          </div>
          <div
            v-if="!isConversion && !isDownload && trackFormatted.status"
            class="df"
          >
            <span
              class="bold uppercase point5-em color-transition"
              :style="{ color: trackFormatted.status.color }"
            >
              {{ trackFormatted.status.label }}
            </span>
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
import { P, match } from 'ts-pattern'
import { computed } from 'vue'

import {
  type FormattedTextSegment,
  formattedTextSegments
} from '../../../../shared/formatted-text'
import WarningIcon from '../../../assets/icons/warning-icon.vue'
import { useSongBasketActions, useSongBasketState } from '../../../state'
import Banner from '../Generic/Banner.vue'
import Card from '../Generic/Card.vue'
import { resultIssue, selectAction } from '../conversion-result'
import type { Track, TrackItem, YoutubeResult } from '../model'
import {
  artistsString,
  formatMinutes,
  trackImage,
  trackName,
  trackPlaylistNames,
  youtubeCreator,
  youtubeImage
} from '../model'
import { trackStatus } from '../track-status'

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
const { state, downloadedTracks } = useSongBasketState()
const cardOptions = {}

const titleSegments = (
  item: YoutubeResult
): readonly FormattedTextSegment[] => {
  if (item.isCustomTrack === true) {
    return [{ text: item.snippet.title, matched: false }]
  }
  return formattedTextSegments(item.nameFormatted)
}

const trackFormatted = computed(() =>
  match(props.track)
    .with({ snippet: P._ }, (item) => ({
      nameSegments: titleSegments(item),
      image: youtubeImage(item),
      creator: youtubeCreator(item),
      issue: resultIssue(item),
      playlists: '',
      status: null
    }))
    .with({ data: P._ }, (item) => ({
      nameSegments: [{ text: trackName(item), matched: false }],
      image: trackImage(item),
      creator: artistsString(item),
      issue: null,
      playlists: trackPlaylistNames(item, state.value?.playlists ?? []),
      status: trackStatus(item, downloadedTracks.value)
    }))
    .otherwise((item) => ({
      nameSegments: [{ text: trackName(item), matched: false }],
      image: trackImage(item),
      creator: artistsString(item),
      issue: null,
      playlists: '',
      status: null
    }))
)
const containerClass = computed(() => {
  if (props.isDownload) return `download ${props.downloadStatus.state}`
  if (props.isConversion) return 'conversion'
  return ''
})
const cardItem = computed(() => ({
  backgroundImage: trackFormatted.value.image
}))
const selectLabel = computed(() => {
  if (!props.isConversion) return null
  const parent = props.parentRef
  if (parent === null) return null
  return match(props.track)
    .with({ snippet: P._ }, (item) => selectAction(item, parent))
    .otherwise(() => null)
})
const duration = computed(() => {
  if (props.isDownload) return { str: '', color: '' }
  const seconds = match(props.track)
    .with({ snippet: P._ }, (item) => item.duration)
    .with(
      { data: P._ },
      (item) => item.duration ?? item.data.duration_ms / 1000
    )
    .otherwise((item) => item.duration_ms / 1000)
  const durationDiff = match({
    isConversion: props.isConversion,
    parentRef: props.parentRef
  })
    .with({ isConversion: true, parentRef: P.not(null) }, ({ parentRef }) => {
      const parentDuration =
        parentRef.duration ?? parentRef.data.duration_ms / 1000
      return parentDuration - seconds
    })
    .otherwise(() => 0)
  return {
    str: formatMinutes(Math.round(seconds)),
    color: durationColor(durationDiff)
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
  const id = match(props.track)
    .with({ youtube_id: P.string }, ({ youtube_id }) => youtube_id)
    .otherwise(({ id }) => id)
  void openVideoAction(id)
}
</script>

<style lang="scss" scoped>
$err1: rgba(255, 0, 100, 0.75) 1.53%;
$err2: rgba(255, 35, 0, 0.75) 100%;
$error-bg: linear-gradient(258.84deg, $err1, $err2);

$dl1: rgba(36, 255, 0, 0.75) 1.53%;
$dl2: rgba(0, 255, 136, 0.75) 100%;
$download-bg: linear-gradient(258.84deg, $dl1, $dl2);

$ex1: rgba(148, 0, 204, 0.75) 1.53%;
$ex2: rgba(251, 0, 255, 0.75) 100%;
$extraction-bg: linear-gradient(258.84deg, $ex1, $ex2);

.track-banner-container {
  height: 7em;
  transition:
    opacity var(--ts-g),
    background-color var(--ts-g);
  z-index: 0;
  position: relative;

  &.download {
    &.awaiting,
    &.finished {
      opacity: 0.5;
    }

    &.downloading,
    &.extracting,
    &.tags {
      background-color: var(--global-grey);
      box-shadow: inset 0 0 48px 17px #0005;
    }

    &[class*='end'] {
      .background-progress {
        opacity: 0;
      }
    }

    &[class*='error'] {
      .background-progress {
        --progress: 100% !important;
        background: $error-bg;
      }
    }
  }

  &.conversion {
    .track-info .name {
      font-size: 1em;
    }
  }
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
  box-shadow: inset 0 0 48px 17px #0004;

  &.downloading {
    background: $download-bg;
  }

  &.extracting {
    background: $extraction-bg;
  }

  &.tags {
    --p: #ffe500 -150%, #ff00ff;
    animation: background-cycle-less 5s infinite var(--bezier-chill);
    --progress: 100% !important;
  }

  .progress-label {
    padding: 0.2em 0.3em;
    white-space: nowrap;
  }
}

.track-info {
  padding-left: 0.7em;

  > div > span {
    line-height: 1;
  }

  $name-size: 2em;
  text-align: left;

  .name {
    font-weight: 500;
    font-size: $name-size;
  }

  .artists {
    font-weight: bold;
    display: flex;
    margin-top: 0.2em;
    font-size: $name-size * 0.4;
  }

  .playlists {
    font-size: $name-size * 0.3;
  }
}

.see-track-link {
  position: absolute;
  cursor: pointer;
  $w: 1.5em;
  left: -$w;
  width: $w;
  top: 0;
  bottom: 0;
  writing-mode: tb-rl;
  transform: rotate(180deg);
  opacity: 0.7;

  > span {
    display: inline-block;
    // padding-bottom: 0.5em;
    font-size: 0.4em;
  }
}

.matching-token {
  color: var(--green-accept);
  font-weight: 500;
}

.track-controls {
  gap: 0.5em;
}
</style>
<style lang="scss">
.card-container.track-banner-card {
  .card-background {
    .gradient {
      --gradient-offset: 0%;
    }

    .card-img {
      --card-img-width: 100%;
    }
  }
}
</style>
