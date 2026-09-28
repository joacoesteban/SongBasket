<template>
  <div class="whole-container">
    <div class="home-container">
      <div class="rel-full" style="height: initial">
        <TopBar />
        <SearchBar />
      </div>
      <div class="home-router">
        <RouterView v-slot="{ Component }">
          <div class="router-view" :class="routerClasses">
            <component :is="Component" :key="route.fullPath" />
          </div>
        </RouterView>
      </div>
      <FloatingButtons style="z-index: 1" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

import {
  navigate,
  navigationDirection,
  navigationFast,
  routeNames
} from '../../router'
import { useSongBasketState } from '../../state'
import FloatingButtons from './FloatingButtons.vue'
import SearchBar from './TopBar/SearchBar.vue'
import TopBar from './TopBar/TopBar.vue'

defineOptions({ name: 'HomeView' })

const route = useRoute()
const { state } = useSongBasketState()
const routerClasses = computed<Record<string, boolean>>(() => ({
  [navigationDirection.value]: true,
  fast: navigationFast.value
}))

watch(
  () => state.value?.currentPlaylist,
  (playlistId) => {
    if (playlistId === null || playlistId === undefined) return
    void navigate({
      name: routeNames.playlistView,
      params: { id: playlistId }
    })
  }
)

onMounted(() => {
  const playlists = state.value?.playlists
  if (playlists !== undefined && playlists.length === 0) {
    void navigate({ name: routeNames.empty })
  }
})
</script>

<style lang="scss">
.whole-container {
  z-index: 0;
}

.home-container {
  z-index: 0;
  position: relative;
  display: flex;
  text-align: center;
  height: var(--max-container-height);
  overflow: hidden;
  flex-direction: column;
}

.home-router {
  z-index: 1;
  max-height: 100%;
  transition: padding var(--ts-g);
  padding-top: var(--filters-container-height);
  display: flex;
  box-sizing: border-box;
  overflow: auto;
}

.router-view {
  $transition: var(--home-transition);
  transition:
    transform $transition,
    opacity $transition;
  opacity: 1;
  transform: scale(1) translateX(0);
  transform-origin: bottom;

  &.fast {
    transition: transform 0s;
  }

  &.push,
  &.pull,
  &.left,
  &.right {
    opacity: 0;
  }

  &.push {
    transform: scale(0.75);
  }

  &.pull {
    transform: scale(1.5);
  }

  $x-offset: 3em;

  &.left {
    transform: translateX(-$x-offset);
  }

  &.right {
    transform: translateX($x-offset);
  }

  &.release {
    opacity: 1;
    transform: scale(1) translateX(0);
  }
}
</style>
