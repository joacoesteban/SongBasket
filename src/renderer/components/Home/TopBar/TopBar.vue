<template>
  <div
    class="tb-container window-drag-recursive"
    :class="{ 'showing-loading-bar': loadingBarVisible }"
    :data-navigation-direction="navigationDirection"
  >
    <div class="drop-shadow abs-full show-on-scroll" />
    <div class="drop-gradient abs-full hide-on-scroll" />

    <div class="title-bar-container abs-full">
      <div id="title-bar" class="mac title-section">
        <div v-if="isMac" class="title-bar-buttons-container">
          <button
            id="min-btn"
            class="bar-btn button-minimize"
            aria-label="Minimize window"
            @click="minimizeWindow"
          >
            <div class="mask" />
          </button>
          <button
            id="max-btn"
            class="bar-btn button-maximize"
            aria-label="Maximize window"
            @click="toggleMaximizeWindow"
          >
            <div class="mask" />
          </button>
          <button
            id="close-btn"
            class="bar-btn button-close"
            aria-label="Close window"
            @click="closeWindow"
          >
            <div class="mask" />
          </button>
        </div>
      </div>

      <div class="tb-mid-section title-section df aliic jucc">
        <button
          class="navigation-btn left window-nodrag"
          :class="{ show: showPreviousButton }"
          :disabled="!showPreviousButton"
          aria-label="Go back"
          @click="navigateBack"
        >
          <svg-icon
            path="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
            icon-color="var(--icon-color)"
            class-name="navigation-icon"
          />
        </button>
        <div class="status-container">
          <span>{{ status }}</span>
        </div>
        <button
          class="navigation-btn right window-nodrag"
          :class="{ show: showForwardButton }"
          :disabled="!showForwardButton"
          aria-label="Go forward"
          @click="navigateForward"
        >
          <svg-icon
            path="m10 6-1.41 1.41L13.17 12l-4.58 4.59L10 18l6-6z"
            icon-color="var(--icon-color)"
            class-name="navigation-icon"
          />
        </button>
      </div>

      <div class="title-section">
        <div id="title-bar" class="windows">
          <div v-if="!isMac" class="title-bar-buttons-container window-nodrag">
            <button
              id="min-btn"
              class="bar-btn button-minimize"
              aria-label="Minimize window"
              @click="minimizeWindow"
            >
              <div class="mask" />
            </button>
            <button
              id="max-btn"
              class="bar-btn button-unmaximize"
              aria-label="Maximize window"
              @click="toggleMaximizeWindow"
            >
              <div class="mask" />
            </button>
            <button
              id="close-btn"
              class="bar-btn button-close"
              aria-label="Close window"
              @click="closeWindow"
            >
              <div class="mask" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="bar-slider-container h-fc rel-full df" :style="sliderStyle">
      <div class="df fldc aliend bar-slide h-fc show">
        <div class="section-switcher-container">
          <div class="section-switcher-list">
            <div
              v-for="section in sections"
              :key="section.routeName"
              class="section-switch window-nodrag"
              :class="{ active: activeSection === section.routeName }"
            >
              <button
                class="section-title semibold"
                :disabled="navigationPending"
                @click="section.cb"
              >
                {{ section.title }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <playlist-view-slide
        :class="{ show: currentPath === routeNames.playlistView }"
        class="bar-slide"
        style="--slide-height: 6em"
      />
      <track-review-slide
        :class="{ show: currentPath === routeNames.trackReview }"
        class="bar-slide hidden-of"
        style="--slide-height: 10em"
      />
      <downloads-view-slide
        :class="{ show: currentPath === routeNames.downloadsView }"
        class="bar-slide"
      />
    </div>

    <div
      class="loading-bar"
      :style="loadingBarStyle"
      :class="loadingBarClasses"
    >
      <div class="actual-loading-bar gradient-background-cycle-less" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  navigate,
  navigateBack,
  navigateForward,
  navigationDirection,
  navigationPending,
  routeNames
} from '../../../router'
import { useSongBasketActions, useSongBasketState } from '../../../state'
import { dateFormatter } from '../../../utils'
import DownloadsViewSlide from './Slides/DownloadsViewSlide.vue'
import PlaylistViewSlide from './Slides/PlaylistViewSlide.vue'
import TrackReviewSlide from './Slides/TrackReviewSlide.vue'

const route = useRoute()
const state = useSongBasketState()
const actions = useSongBasketActions()

const isMac = /mac/i.test(navigator.platform)
const currentPath = computed(() => String(route.name ?? ''))
const activeSection = computed(() => {
  if (route.name === routeNames.tracksList) return routeNames.tracksList
  return routeNames.playlistsList
})
const sections = [
  {
    title: 'Tracks',
    routeName: routeNames.tracksList,
    cb: () => goTo(routeNames.tracksList)
  },
  {
    title: 'Playlists',
    routeName: routeNames.playlistsList,
    cb: () => goTo(routeNames.playlistsList)
  }
]

const loadingBarVisible = computed(() => state.loading.value.value)
const loadingBarStyle = computed<Record<string, string>>(() => ({
  '--ptg': `${((state.loading.value.ptg ?? 0) * 100).toFixed(2)}%`
}))
const loadingBarClasses = computed<Record<string, boolean>>(() => ({
  show: loadingBarVisible.value,
  static: state.loading.value.ptg === undefined,
  dynamic: state.loading.value.ptg !== undefined
}))
const sliderPosition = computed(() => {
  if (
    currentPath.value === routeNames.playlistView ||
    currentPath.value === routeNames.trackReview ||
    currentPath.value === routeNames.downloadsView
  ) {
    return -100
  }
  return 0
})
const sliderStyle = computed<Record<string, string>>(() => ({
  '--position-ptg': `${sliderPosition.value}%`
}))
const navigationHistory = computed(() => ({
  currentPath: route.fullPath,
  historyState: history.state
}))
const showPreviousButton = computed(() => {
  const current = navigationHistory.value
  if (current.currentPath === '') return false
  return (
    current.historyState['back'] !== null &&
    current.historyState['back'] !== undefined &&
    !navigationPending.value
  )
})
const showForwardButton = computed(() => {
  const current = navigationHistory.value
  if (current.currentPath === '') return false
  return (
    current.historyState['forward'] !== null &&
    current.historyState['forward'] !== undefined &&
    !navigationPending.value
  )
})
const status = computed(() => {
  const loading = state.loading.value
  if (loading.value) return loading.target ?? 'Loading'

  const formatted = dateFormatter(state.state.value?.lastSync ?? Date.now())
  if (formatted === null) return 'Last Sync: unavailable'
  let date = 'Today'
  if (!formatted.date.today) {
    date = `${formatted.date.month} / ${formatted.date.date}`
    if (!formatted.date.sameYear) date += ` / ${formatted.date.year}`
  }
  return `Last Sync: ${date} @ ${formatted.time.hours}:${formatted.time.minutes}`
})

const goTo = (name: string): void => {
  void navigate({ name })
}
const minimizeWindow = (): void => {
  void actions.minimizeWindow()
}
const toggleMaximizeWindow = (): void => {
  void actions.toggleMaximizeWindow()
}
const closeWindow = (): void => {
  void actions.closeWindow()
}

watch(
  state.isConnected,
  (connected) => {
    document.documentElement.classList.toggle('disconnected', !connected)
  },
  { immediate: true }
)

onMounted(() => {
  document.documentElement.classList.toggle(
    'disconnected',
    !state.isConnected.value
  )
})
</script>

<style lang="scss" scoped>
$tb-title-height: var(--tb-title-height);
$loading-bar-height: 3px;

.tb-container {
  text-align: left;
  min-height: fit-content;
  width: 100%;
  display: flex;
  background: var(--global-grey-secondary);
  flex-direction: row;
  flex-wrap: nowrap;
  z-index: 0;
  justify-content: space-between;
  position: relative;
  transition: height var(--ts-g);
  transition-timing-function: var(--bezier-symmetric);

  &.showing-loading-bar {
    .bar-slide {
      overflow: hidden;
    }
  }
}

.title-bar-container {
  z-index: 1;
  height: $tb-title-height;
  bottom: initial;
  display: flex;

  .title-section {
    width: 100%;
    display: flex;

    &:nth-child(1) {
      justify-content: flex-start;
    }

    &:nth-child(2) {
      justify-content: center;
    }

    &:nth-child(3) {
      justify-content: flex-end;
    }
  }
}

.drop-gradient {
  bottom: -200%;
  top: 100%;
  z-index: -1;
  background: linear-gradient(
    to bottom,
    var(--global-grey-secondary),
    transparent
  );
  opacity: var(--scroll-opacity-inverted);
}

.drop-shadow {
  top: 100%;
  bottom: -120%;
  z-index: -1;
  background: linear-gradient(
    to bottom,
    var(--global-grey-secondary) -50%,
    transparent
  );
}

.tb-mid-section {
  padding-top: 0.25em;
  min-width: 50%;
  bottom: initial;

  .status-container {
    font-size: 0.5em;
  }
}

.bar-slider-container {
  transition: transform var(--top-bar-slider-transition);
  transform: translateX(var(--position-ptg));
}

.bar-slide {
  min-width: 100%;
  box-sizing: border-box;
  transition: height var(--top-bar-slider-transition);
  height: var(--slide-height);

  &:not(.show) {
    --slide-height: 0 !important;
  }

  &.hidden-of {
    overflow: hidden;
  }
}

.loading-bar {
  position: absolute;
  display: flex;
  align-items: center;
  bottom: 0;
  left: 0;
  right: 100%;
  pointer-events: none;
  transition:
    left var(--ts-g),
    right var(--ts-g),
    width var(--ts-g);
  --ptg: 0%;
  width: var(--ptg);

  .actual-loading-bar {
    height: $loading-bar-height;
    width: 100%;
  }

  &.show {
    &.static {
      left: 0;
      width: 100%;
    }

    &.dynamic {
      .actual-loading-bar {
        animation: none;
        background-color: var(--green-accept);
      }
    }
  }

  &:not(.show) {
    left: 100%;
    width: 100%;
  }
}

.section-switcher-container {
  margin: 1em var(--container-padding-x);
}

.section-switcher-list {
  display: flex;
  align-items: flex-end;
}

.section-switch {
  margin-left: 0.3em;
  cursor: pointer;
  opacity: 0.5;
  transition: var(--hover-n-active-transitions);

  .section-title {
    font-size: 0.75em;
    line-height: 1;
    transition: font-size var(--ts-g);
    color: inherit;
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
  }

  &:not(.active) {
    &:hover {
      opacity: 0.8;
    }

    &:active {
      opacity: 0.5;
      transform: scale(0.98);
    }
  }

  &.active {
    opacity: 1;

    .section-title {
      font-size: 1.25em;
    }
  }
}

.navigation-btn {
  cursor: pointer;
  display: flex;
  margin: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
  transition:
    opacity var(--ts-g),
    transform var(--ts-g);
  opacity: 0.1;
  transform: scale(0.8);

  &.right {
    margin-left: 0.5em;
  }

  &.left {
    margin-right: 0.5em;
  }

  &.show {
    opacity: 1;
    transform: scale(1);
  }

  &:disabled {
    cursor: default;
  }
}

.navigation-icon {
  width: 1em;
  height: 1em;
}
</style>
