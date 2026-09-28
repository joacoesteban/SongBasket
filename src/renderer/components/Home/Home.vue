<template>
  <div class="whole-container">
    <div class="home-container">
      <div class="rel-full" style="height: initial">
        <TopBar />
        <SearchBar />
      </div>
      <div class="home-router">
        <RouterView v-slot="{ Component }">
          <Transition :name="navigationDirection">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
      <FloatingButtons style="z-index: 1" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import { navigationDirection, routeNames } from '../../router'
import { useSongBasketState } from '../../state'
import FloatingButtons from './FloatingButtons.vue'
import SearchBar from './TopBar/SearchBar.vue'
import TopBar from './TopBar/TopBar.vue'

defineOptions({ name: 'HomeView' })

const router = useRouter()
const route = useRoute()
const { state } = useSongBasketState()

watch(
  () => state.value?.currentPlaylist,
  (playlistId) => {
    if (playlistId === null || playlistId === undefined) return
    void router.push({
      name: routeNames.playlistView,
      params: { id: playlistId }
    })
  }
)

onMounted(() => {
  const playlists = state.value?.playlists
  if (playlists !== undefined && playlists.length === 0) {
    void router.push({ name: routeNames.empty })
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
  transition: padding var(--ts-g);
  padding-top: var(--filters-container-height);
  display: flex;
  box-sizing: border-box;
  overflow: auto;
}
</style>
<style lang="scss" scoped>
// .router-view {
//   $transition: var(--home-transition);
//   transition: transform $transition, opacity $transition;
//   opacity: 1;
//   transform: scale(1);
//   transform-origin: bottom;

//   &.fast {
//     transition: transform 0s
//   }
//   &:not(.release) {
//     transition-timing-function: var(--bezier-out);
//   }
//   &.push {
//     transform: scale(.75);
//     opacity: 0;
//   }
//   &.pull {
//     transform: scale(1.5);
//     opacity: 0;
//   }
//   &.release {
//     opacity: 1;
//     transform: scale(1)
//   }
// }
</style>
