<template>
  <svg
    height="100%"
    width="100%"
    :style="iconStyle"
    :class="className"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path :d="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Props = {
  path: string
  iconColor: string
  className: string
}

const props = defineProps<Props>()
const iconStyle = computed(() => ({
  background: 'none',
  fill: props.iconColor
}))
</script>
