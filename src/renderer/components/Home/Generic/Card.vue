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
$q-false-color: #1b1b1b;
$q-true-color: rgb(103, 214, 0);

// $playlist-height: 4em;
$title-size: 0.8em;
$transition-soft: var(--card-hover-transition);
$transition-hard: var(--ts-g-hard);

.card-container {
  --borr: 0;
  box-sizing: border-box;
  padding: var(--container-padding-x) calc(var(--container-padding-x) / 2);
  padding-top: 0;
  z-index: 0;
  flex-shrink: 0;

  &:not(.pressed).transformation-parent {
    &:hover {
      transform: scale(1.03);

      .card-background {
        .light-shine {
          transition: opacity $transition-soft;
          opacity: 1;
        }
      }
    }
  }

  .transformation-parent {
    &:hover {
      transform: scale(1.03);

      .card-background {
        .light-shine {
          // transition: opacity $transition-soft;
          opacity: 1;
        }
      }
    }

    transition:
      transform $transition-soft,
      opacity $transition-soft;
    perspective: 1000px;
    perspective-origin: 50% 100px;

    &:active {
      transition:
        transform $transition-hard,
        opacity $transition-hard;
      transition-delay: 0.0575s;
      transform: scale(0.98);
      opacity: 0.7;
    }

    > .card-content {
      cursor: pointer;
      position: relative;
      background: $q-false-color;
      $transition: var(--card-hover-transition);
      transition:
        background-color $transition,
        box-shadow $transition;
      border-radius: var(--borr);
      overflow: hidden;
      // transform $transition;
      transform-style: preserve-3d;
      will-change: transform;
      color: #f0f0f0;
      // box-shadow: 0.1em 0.1em 0.3em 0 rgba(0, 0, 0, 0.4);
    }
  }

  .card-background {
    --gradient-offset: 50%;

    .rel-full {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .gradient {
      position: absolute;
      $offset: -3px;
      top: $offset;
      bottom: $offset;
      right: $offset;
      left: $offset;
      background: linear-gradient(
        to right,
        $q-false-color var(--gradient-offset),
        transparent 200%
      );
    }

    .light-shine {
      position: absolute;
      pointer-events: none;
      z-index: 1;
      $offset: -30;
      top: $offset * 1px;
      bottom: $offset * 1px;
      right: $offset * 0.5 * 1em;
      left: $offset * 0.5 * 1em;
      transition: opacity var(--card-hover-transition-fast);
      // transition: opacity $transition-soft;
      opacity: 0.5;
      background: linear-gradient(
        31deg,
        transparent 50%,
        rgba(255, 255, 255, 0.045) 50%,
        transparent 100%
      );
      // background: linear-gradient(31deg, transparent -100%,  rgba(0,0,0,.5) 50%, rgba(255,255,255,.045) 50%, transparent 100%);
      background-position: center;
    }

    .card-img {
      --card-img-width: 50%;
      background-size: cover;
      background-repeat: no-repeat;
      background-position: center;
      height: 100%;
      width: var(--card-img-width);
    }
  }

  .card-default-slot {
    text-align-last: left;
    position: relative;
    display: flex;
    padding: 0.6em 0.5em;
  }

  // -----------------STATES-----------------

  &.pressed {
    .transformation-parent {
      transform: scale(0.9);
      opacity: 0.7;

      &:active {
        transform: scale(0.85);
        opacity: 0.5;
      }
    }
  }
}
</style>
