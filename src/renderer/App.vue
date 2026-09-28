<template>
  <div class="app-container">
    <RouterView v-slot="{ Component }">
      <div class="app-router" :class="routerClasses">
        <component :is="Component" />
      </div>
    </RouterView>
    <Modal />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'

import './CSS/styles-loader'
import Modal from './components/Modal/Modal.vue'
import { navigationDirection, navigationFast, navigationScope } from './router'

const routerClasses = computed<Record<string, boolean>>(() => ({
  [navigationDirection.value]: navigationScope.value === 'root',
  fast: navigationFast.value && navigationScope.value === 'root'
}))
</script>
<style lang="scss">
.app-container {
  height: 100%;
  position: relative;
  z-index: 0;
}
.app-router {
  $transition: var(--home-transition);
  transition:
    transform $transition,
    opacity $transition;
  opacity: 1;
  transform: scale(1);
  transform-origin: bottom;

  &.fast {
    transition: transform 0s;
  }

  &:not(.release) {
    transition-timing-function: var(--bezier-out);
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

  &.left {
    transform: translateX(-3em);
  }

  &.right {
    transform: translateX(3em);
  }

  &.release {
    opacity: 1;
    transform: scale(1) translateX(0);
  }
}
</style>
