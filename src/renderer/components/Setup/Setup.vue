<template>
  <div
    class="login-container window-drag-recursive"
    :style="{ '--offset': `${offsetPtg}%` }"
  >
    <SetHomeFolder @handle-click="setHomeFolder" />
    <div class="user-login-container">
      <div class="setup-header">
        {{ headerText }}
      </div>
      <div class="slider-container">
        <div class="slider" :style="{ '--offset-x': offsetXPtg }">
          <Login v-if="showLogin" @login="login" />
        </div>
      </div>
      <div v-if="setupError" class="setup-error">{{ setupError }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { routeNames } from '../../router'
import { useSongBasketActions } from '../../state/useSongBasketActions'
import Login from '../Login.vue'
import SetHomeFolder from './SetHomeFolder.vue'

defineOptions({ name: 'SetupView' })

const router = useRouter()
const actions = useSongBasketActions()
const currentSlide = ref(0)
const setupError = ref<string | null>(null)

const headerText = computed(() => {
  if (currentSlide.value === 1) return 'Log in to find your music'
  return "Let's find your music"
})
const offsetPtg = computed(() => currentSlide.value * 100)
const offsetXPtg = computed(() => `${currentSlide.value * -100}%`)
const showLogin = computed(() => currentSlide.value === 1)

const setHomeFolder = async (): Promise<void> => {
  setupError.value = null
  const result = await actions.askHomeFolder()
  if (result.error !== null) {
    if (result.error.message === 'CANCELLED') return
    setupError.value = result.error.message
    return
  }
  if (result.isLogged) {
    await router.push({ name: routeNames.home })
    return
  }
  currentSlide.value = 1
}

const login = async (): Promise<void> => {
  setupError.value = null
  await actions.login()
  await actions.unlockWindow()
  await router.push({ name: routeNames.home })
}
</script>

<style scoped lang="scss">
.login-container {
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-between;
  height: var(--max-container-height);
  position: relative;
  --offset: 0px;
  transition: bottom var(--ts-g-symmetric-inverted);
  transition-duration: 1.2s;
  bottom: calc(var(--offset) * -1);

  > div {
    min-height: 100%;
    min-width: 100vw;
  }
}

.user-login-container {
  display: flex;
  flex-direction: column;

  .slider-container {
    height: 100%;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }

  .slider {
    position: relative;
    left: var(--offset-x);
    transition: left var(--ts-g);
    display: flex;
    width: auto;
    height: 100%;

    > div {
      min-width: 100%;
      height: 100%;
    }
  }
}

.setup-error {
  color: var(--red-cancel);
  text-align: center;
  padding: 0.5rem 1rem;
}
</style>
