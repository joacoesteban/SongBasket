<template>
  <div class="folder-view-container window-drag-recursive">
    <div class="setup-header">
      <span>{{ title }}</span>
    </div>
    <div class="list-wrapper df fldc">
      <div class="folder-list row">
        <Folder
          v-for="(path, index) in folders"
          :key="path"
          :path="path"
          :index="index"
          @clicked="openFolder(path)"
        />
      </div>
      <div class="pusher w100" />
    </div>
    <div
      class="w100 df global-center py-2 abs-bot no-click controls-container"
      @click="addFolder"
    >
      <button class="button all-click">Add a new Folder</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { routeNames } from '../../router'
import { useSongBasketActions } from '../../state/useSongBasketActions'
import { useSongBasketState } from '../../state/useSongBasketState'
import Folder from './Folder.vue'

const title = 'Your Folders'
const router = useRouter()
const actions = useSongBasketActions()
const state = useSongBasketState()
const folders = computed(
  () => state.status.value?.APP_STATUS.FOLDERS.paths ?? []
)

const openFolder = async (path: string): Promise<void> => {
  await actions.setHomeFolder(path)
  await router.push({ name: routeNames.home })
}

const addFolder = async (): Promise<void> => {
  const result = await actions.askHomeFolder()
  if (result.error !== null) return
  if (result.isLogged) {
    await router.push({ name: routeNames.home })
    return
  }
  await router.push({ name: routeNames.setup })
}
</script>

<style lang="scss" scoped>
.folder-view-container {
  --controls-height: 3em;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.setup-header {
  --height: 15vw;

  > span {
    font-size: 0.75em;
  }
}

.list-wrapper {
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 1em;
  box-sizing: border-box;

  .pusher {
    min-height: var(--controls-height);
  }
}

.controls-container {
  height: var(--controls-height);
}
</style>
