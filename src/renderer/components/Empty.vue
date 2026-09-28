<template>
  <div class="empty-container">
    <div class="header">It's quiet . . .</div>
    <div class="info">
      We couldn't find any Playlists associated with this User.
    </div>
    <button class="button" type="button" @click="goBack">Go Back</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { routeNames } from '../router'
import { useSongBasketState } from '../state'

defineOptions({ name: 'EmptyView' })

const router = useRouter()
const { state } = useSongBasketState()

const goBack = (): void => {
  void router.push({ name: routeNames.setup })
}

onMounted(() => {
  if ((state.value?.playlists.length ?? 0) > 0) {
    void router.push({ name: routeNames.home })
  }
})
</script>

<style lang="scss" scoped>
.empty-container {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.header {
  font-size: 2em;
  padding: 0.67em 0;
  font-weight: bold;
}

.info {
  font-size: 0.67em;
  margin-bottom: 2em;
}
</style>
