<template>
  <div v-show="showWrapper" class="modal-wrapper">
    <div :class="{ show: showLocal }" class="modal-container">
      <div class="content box-shadow">
        <ModalLoader />
      </div>
    </div>
    <div :class="{ show: showLocal }" class="dark-body" @click="close" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useModal } from '../../state/useModal'
import ModalLoader from './ModalLoader.vue'

defineOptions({ name: 'ModalOverlay' })

const transitionTime = 300
const { modal, closeModal } = useModal()
const showLocal = ref(false)
const transitioning = ref(false)
const showWrapper = computed(() => showLocal.value || transitioning.value)
let transitionHandle: ReturnType<typeof setTimeout> | undefined

const onKeyUp = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') close()
}

const close = (): void => {
  if (transitioning.value) return
  if (modal.value === null) return
  closeModal()
}

watch(
  modal,
  (request) => {
    transitioning.value = true
    if (transitionHandle !== undefined) clearTimeout(transitionHandle)
    transitionHandle = setTimeout(() => {
      showLocal.value = request !== null
      transitionHandle = setTimeout(() => {
        transitioning.value = false
      }, transitionTime)
    }, 0)
  },
  { immediate: true }
)

onMounted(() => window.addEventListener('keyup', onKeyUp))
onBeforeUnmount(() => {
  window.removeEventListener('keyup', onKeyUp)
  if (transitionHandle !== undefined) clearTimeout(transitionHandle)
})
</script>

<style lang="scss">
$tst: var(--ts-g);

.modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;

  .modal-container {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 1;
    transition:
      transform $tst,
      opacity $tst;
    transform-origin: bottom;
    opacity: 0;
    transform: scale(0.7);

    &.show {
      opacity: 1;
      transform: scale(1);
    }
  }

  .dark-body {
    position: relative;
    height: 100%;
    width: 100%;
    transition: opacity $tst;
    background-color: #000;
    z-index: 0;
    cursor: pointer;
    opacity: 0;

    &.show {
      opacity: 0.8;
    }
  }

  .content {
    background-color: var(--global-grey-secondary);
    pointer-events: all;
    border-radius: 0.2em;
  }

  .modal-body {
    font-size: 0.7em;
  }

  .modal-controls {
    margin-top: 1em;

    .button {
      margin: 0 0.3em;
      min-width: 11em;
    }
  }
}
</style>
