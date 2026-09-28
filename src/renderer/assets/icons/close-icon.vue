<template>
  <svg-icon :path="path" :icon-color="iconColor" :class-name="className" />
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'

const path =
  'M20 6.91L17.09 4L12 9.09L6.91 4L4 6.91L9.09 12L4 17.09L6.91 20L12 14.91L17.09 20L20 17.09L14.91 12L20 6.91Z'
const iconColor = 'var(--icon-color)'
const className = 'icon close-icon'
</script>
