<template>
  <div class="loading-container">
    <div>Loading</div>
    <div v-if="status !== null" class="regular point5-em mt-2">
      Version {{ status.appVersion }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'

import { navigateReplace, routeNames } from '../../router'
import { useSongBasketState } from '../../state'

const { status } = useSongBasketState()

watch(
  status,
  (value) => {
    if (value === null) return
    if (value.APP_STATUS.IS_LOGGED) {
      void navigateReplace({ name: routeNames.home })
      return
    }
    if (value.APP_STATUS.FOLDERS.paths.length > 0) {
      void navigateReplace({ name: routeNames.folderView })
      return
    }
    void navigateReplace({ name: routeNames.setup })
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
