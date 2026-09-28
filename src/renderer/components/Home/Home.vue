<template>
  <div class="whole-container">
    <div class="home-container">
      <div class="rel-full" style="height: initial">
        <TopBar />
        <SearchBar />
      </div>
      <div class="home-router" :class="routerClasses">
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="route.fullPath" />
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
  navigationScope,
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
  [navigationDirection.value]: navigationScope.value === 'home',
  fast: navigationFast.value && navigationScope.value === 'home'
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

<style>
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
  transition:
    padding var(--ts-g),
    transform var(--home-transition),
    opacity var(--home-transition);
  padding-top: var(--filters-container-height);
  display: flex;
  box-sizing: border-box;
  overflow: auto;
  opacity: 1;
  transform: scale(1);
  transform-origin: bottom;
}

.home-router.fast {
  transition: transform 0s;
}

.home-router:not(.release) {
  transition-timing-function: var(--bezier-out);
}

.home-router.push,
.home-router.pull,
.home-router.left,
.home-router.right {
  opacity: 0;
}

.home-router.push {
  transform: scale(0.75);
}

.home-router.pull {
  transform: scale(1.5);
}

.home-router.left {
  transform: translateX(-3em);
}

.home-router.right {
  transform: translateX(3em);
}

.home-router.release {
  opacity: 1;
  transform: scale(1) translateX(0);
}
</style>
