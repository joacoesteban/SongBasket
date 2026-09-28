<template>
  <div class="app-container">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
    <Modal />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

import './CSS/styles-loader'
import Modal from './components/Modal/Modal.vue'
import useShortcuts from './shortcuts'

useShortcuts()
</script>
<style lang="scss">
.app-container {
  height: 100%;
  position: relative;
  z-index: 0;
}
</style>
