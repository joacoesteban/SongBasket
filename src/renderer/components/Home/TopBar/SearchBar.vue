<template>
  <div class="global-search-bar-container" :class="{ hide: hidden }">
    <div class="filters-container">
      <div class="filters-content">
        <div class="search-bar global-scroll-shadow">
          <div class="filters-background show-on-scroll" />
          <input
            v-model.trim="searchInputValue"
            placeholder="Start Typing"
            autofocus
            class="input-light semibold"
            type="text"
          />
        </div>
        <div class="filter-buttons" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { routeNames } from '../../../router'

const route = useRoute()
const searchInputValue = ref('')
const hidden = ref(false)

const setVisibility = (): void => {
  const isHidden =
    route.name === routeNames.trackReview ||
    route.name === routeNames.downloadsView
  hidden.value = isHidden
  let height = '4em'
  if (isHidden) height = '0'
  document.documentElement.style.setProperty(
    '--filters-container-height',
    height
  )
}
const resetSearch = (): void => {
  searchInputValue.value = ''
}

watch(
  () => route.name,
  () => {
    resetSearch()
    setVisibility()
  }
)

onMounted(() => {
  setVisibility()
})

onBeforeUnmount(() => {
  document.documentElement.style.removeProperty('--filters-container-height')
})
</script>

<style lang="scss" scoped>
.global-search-bar-container {
  position: absolute;
  height: 4em;
  bottom: -4em;
  width: 100%;
  z-index: 2;
  pointer-events: none;

  .filters-container {
    pointer-events: none;
    padding: 0.5em;
    top: 0;
    z-index: 1;
    box-sizing: border-box;
    height: var(--filters-container-height);
    $t: var(--ts-g);
    transition:
      opacity $t,
      height $t;

    .filters-background {
      background: linear-gradient(
        180deg,
        var(--global-grey-secondary),
        transparent
      );
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: -1;
    }

    .filters-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .search-bar {
      pointer-events: all;

      .filters-background {
        background: var(--global-grey-secondary);
      }

      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      border-radius: 10em;
      padding-left: 1em;
      padding-right: 0.2em;
    }
  }

  &.hide {
    opacity: 0;

    &,
    * {
      pointer-events: none !important;
    }
  }
}
</style>
