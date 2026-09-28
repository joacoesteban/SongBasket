<template>
  <svg-icon :path="path" :icon-color="iconColor" :class-name="className" />
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'

const path = 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z'
const iconColor = 'var(--icon-color)'
const className = 'icon home-icon'
</script>
