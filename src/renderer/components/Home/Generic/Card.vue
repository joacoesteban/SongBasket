<template>
  <div
    class="card-container window-nodrag"
    :class="classObject"
    :style="styleObject"
  >
    <slot name="outside" />
    <div
      class="transformation-parent rel-full"
      @mousemove="onMouseMove"
      @mouseenter="onMouseEnter"
      @mouseleave="onMouseLeave"
      @mousedown="setMouseListener"
      @click="emit('click')"
    >
      <div ref="contentContainer" class="card-content">
        <div class="card-background abs-full">
          <div class="rel-full ovfh">
            <div
              class="card-img"
              :style="{ backgroundImage: `url(${bgImage})` }"
            />
            <div class="gradient" />
            <div ref="lightShine" class="light-shine" />
          </div>
        </div>
        <div class="card-default-slot" :style="cardSlotStyle">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'

defineOptions({ name: 'CardView' })

type CardItem = {
  backgroundImage?: string | undefined
}

type CardOptions = {
  height?: string
  size?: string
  paddingX?: string
  paddingY?: string
  xRotationFactor?: number
  yRotationFactor?: number
  hovScaleFactor?: number | boolean
}

const props = withDefaults(
  defineProps<{
    item: CardItem
    rowClasses?: string
    options?: CardOptions
    pressed?: boolean
  }>(),
  {
    rowClasses: 'col-lg-4 col-md-6 col-xs-12',
    options: () => ({})
  }
)

const emit = defineEmits<{ click: [] }>()
const contentContainer = ref<HTMLElement | null>(null)
const lightShine = ref<HTMLElement | null>(null)
const hovering = ref(false)
const hoverTransitionsTimeout = ref<number | undefined>(undefined)
const bounds = ref<DOMRect | null>(null)
const lastMove = ref(0)

const bgImage = computed(() => props.item?.backgroundImage ?? '')
const xRotationFactor = computed(() => props.options.xRotationFactor ?? 0.05)
const yRotationFactor = computed(() => props.options.yRotationFactor ?? 0.1)
const scaleFactor = computed(() => {
  const scale = props.options.hovScaleFactor
  if (scale === false) return ''
  const value = scale ?? 1.05
  return `scale3d(${value}, ${value}, 1)`
})
const classObject = computed(() => ({
  [props.rowClasses ?? 'col-lg-4 col-md-6 col-xs-12']: true,
  pressed: props.pressed === true
}))
const styleObject = computed(() => ({
  'padding-top': props.options.paddingY ?? '',
  'padding-bottom': props.options.paddingY ?? '',
  'padding-left': props.options.paddingX ?? '',
  'padding-right': props.options.paddingX ?? ''
}))
const cardSlotStyle = computed(() => ({
  height: props.options.height ?? '4em',
  'font-size': props.options.size ?? ''
}))

const clearHoverTransitions = (): void => {
  contentContainer.value?.style.setProperty('transition', '')
  lightShine.value?.style.setProperty('transition', '')
  hoverTransitionsTimeout.value = undefined
}

const animateHover = (): void => {
  const timeout = hoverTransitionsTimeout.value
  if (timeout !== undefined) window.clearTimeout(timeout)
  contentContainer.value?.style.setProperty(
    'transition',
    'transform var(--card-hover-transition)'
  )
  lightShine.value?.style.setProperty(
    'transition',
    'all var(--card-hover-transition-fast)'
  )
  hoverTransitionsTimeout.value = window.setTimeout(clearHoverTransitions, 1000)
}

const getBounds = (): DOMRect | null => {
  const element = contentContainer.value
  if (element === null) return null
  if (bounds.value === null) bounds.value = element.getBoundingClientRect()
  return bounds.value
}

const restoreTransformation = (force = false): void => {
  if (!force && (hovering.value || Date.now() - lastMove.value < 50)) return
  window.removeEventListener('mouseup', onMouseUp)
  contentContainer.value?.style.setProperty(
    'transform',
    'perspective(1000px) rotateX(0deg) rotateY(0deg)'
  )
  lightShine.value?.style.setProperty('background-position', '')
  lightShine.value?.style.setProperty('transform', '')
}
const onMouseUp = (): void => restoreTransformation()

const onMouseEnter = (): void => {
  hovering.value = true
  animateHover()
}

const onMouseLeave = (): void => {
  hovering.value = false
  restoreTransformation(true)
  animateHover()
}

const setMouseListener = (): void => {
  window.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (event: MouseEvent): void => {
  const element = contentContainer.value
  const rect = getBounds()
  if (element === null || rect === null) return
  lastMove.value = Date.now()
  const x = (event.clientX - rect.x) / rect.width
  const y = (event.clientY - rect.y) / rect.height
  let rotateX = ((y - 0.5) * 90 * yRotationFactor.value).toFixed(4)
  let rotateY = ((x - 0.5) * 90 * xRotationFactor.value).toFixed(4)
  if (Number(rotateX) < -4) rotateX = '-4'
  if (Number(rotateX) > 4) rotateX = '4'
  if (Number(rotateY) < -2.4) rotateY = '-2.4'
  if (Number(rotateY) > 2.4) rotateY = '2.4'
  let scale = scaleFactor.value
  if (props.pressed === true) scale = ''
  element.style.setProperty(
    'transform',
    `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ${scale}`
  )
  lightShine.value?.style.setProperty(
    'transform',
    `rotate(${-Number(rotateX) / 2}deg) translateX(${x * 5}%)`
  )
}

onBeforeUnmount(() => {
  window.removeEventListener('mouseup', onMouseUp)
  const timeout = hoverTransitionsTimeout.value
  if (timeout !== undefined) window.clearTimeout(timeout)
})
</script>

<style lang="scss" scoped>
.card-container {
  box-sizing: border-box;
  padding: var(--container-padding-x) calc(var(--container-padding-x) / 2);
  padding-top: 0;
  z-index: 0;
  flex-shrink: 0;

  .transformation-parent {
    transition: transform var(--card-hover-transition);

    &:hover {
      transform: scale(1.03);

      .light-shine {
        transition: opacity var(--card-hover-transition);
        opacity: 1;
      }
    }
  }

  &.pressed .transformation-parent {
    transform: scale(0.98);
  }

  .card-content {
    position: relative;
    overflow: hidden;
    border-radius: var(--card-border-radius, 0.5em);
    background: var(--global-grey);
  }

  .card-default-slot {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    padding: 0.5em;
  }

  .card-img {
    position: absolute;
    inset: 0;
    background-position: center;
    background-size: cover;
  }

  .gradient {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #000c, #0002);
  }

  .light-shine {
    position: absolute;
    inset: 0;
    opacity: 0;
    background: linear-gradient(
      110deg,
      transparent 30%,
      #fff5,
      transparent 70%
    );
  }
}
</style>
