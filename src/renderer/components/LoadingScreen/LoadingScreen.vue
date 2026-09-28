<template>
  <div class="loading-container">
    <div>Loading</div>
    <div v-if="status !== null">{{ status.appVersion }}</div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'

import { routeNames } from '../../router'
import { useSongBasketState } from '../../state'

const router = useRouter()
const { status } = useSongBasketState()

watch(
  status,
  (value) => {
    if (value === null) return
    if (value.APP_STATUS.IS_LOGGED) {
      void router.replace({ name: routeNames.home })
      return
    }
    if (value.APP_STATUS.FOLDERS.paths.length > 0) {
      void router.replace({ name: routeNames.folderView })
      return
    }
    void router.replace({ name: routeNames.setup })
  },
  { immediate: true }
)
</script>
<style scoped lang="scss">
.loading-container {
  -webkit-app-region: drag;
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  align-self: center;
  height: var(--max-container-height);
  font-weight: bold;
}
</style>
