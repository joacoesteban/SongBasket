<template>
  <div class="container">
    <div class="header"><b>Enter a YouTube URL</b></div>
    <div class="info light">
      <input
        ref="input"
        v-model="url"
        class="std-input"
        type="text"
        @keyup.enter="accept"
      />
      <div
        :class="{
          valid: valid === true,
          invalid: valid === false,
          hide: url === ''
        }"
        class="valid-container"
      />
    </div>
    <div :class="{ hide: hideControls }" class="controls df jucc aliic">
      <button class="button accept" :disabled="valid !== true" @click="accept">
        Accept
      </button>
      <button class="button cancel" @click="emit('close')">Cancel</button>
    </div>
    <div :class="{ hide: !hideControls }" class="controls loading">
      {{ loadingText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { SpotifyTrackId } from '../../../@types/Spotify'
import { useModal } from '../../state/useModal'
import { useSongBasketActions } from '../../state/useSongBasketActions'

const props = defineProps<{ trackId: SpotifyTrackId }>()
const emit = defineEmits<{ close: [] }>()
const actions = useSongBasketActions()
const { modal } = useModal()
const input = ref<HTMLInputElement | null>(null)
const url = ref('')
const hideControls = ref(false)
const loadingText = ref('Loading')
const valid = computed<boolean | null>(() => {
  if (url.value === '') return null
  return (
    /^https:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}$/.test(
      url.value
    ) || /^[a-zA-Z0-9_-]{11}$/.test(url.value)
  )
})
let resetHandle: ReturnType<typeof setTimeout> | undefined

const focusInput = async (): Promise<void> => {
  await nextTick()
  input.value?.focus()
}

const reset = (): void => {
  url.value = ''
  hideControls.value = false
  loadingText.value = 'Loading'
}

const accept = async (): Promise<void> => {
  if (valid.value !== true) return
  hideControls.value = true
  try {
    await actions.getYoutubeDetails(url.value, props.trackId)
    emit('close')
  } catch {
    loadingText.value = 'Video not found'
    if (resetHandle !== undefined) clearTimeout(resetHandle)
    resetHandle = setTimeout(() => {
      hideControls.value = false
      loadingText.value = 'Loading'
    }, 200)
  }
}

watch(modal, (request) => {
  if (request?.kind === 'custom-track-url') {
    void focusInput()
    return
  }
  reset()
})

onMounted(() => void focusInput())
onBeforeUnmount(() => {
  if (resetHandle !== undefined) clearTimeout(resetHandle)
})
</script>

<style lang="scss" scoped>
.container {
  padding: 1em;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.info {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.7em;
  margin: 1em 0;
}

$transition: 0.2s cubic-bezier(0.12, 0.82, 0, 0.99);

.valid-container {
  transition:
    width $transition,
    background-color $transition;
  width: 100%;
  height: 0.2em;

  &.hide {
    width: 0;
  }

  &.valid {
    background-color: var(--green-accept);
  }

  &.invalid {
    background-color: var(--red-cancel);
  }
}

.std-input {
  font-size: 2em;
  width: 65vw;
  border-bottom: 1px solid #666;
}

.controls {
  margin-top: 1em;
  transition:
    opacity $transition,
    transform $transition;
  transform-origin: bottom;
  transform: scale(1);
  opacity: 1;

  &.hide {
    transform: scale(0.75);
    opacity: 0;
  }

  .button {
    margin: 0 0.3em;
    width: 5em;
  }

  &.loading {
    position: absolute;
    bottom: 1em;
  }
}
</style>
