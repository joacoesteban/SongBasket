<template>
  <svg-icon :path="path" :icon-color="iconColor" :class-name="className" />
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'

const path = 'M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z'
const iconColor = 'var(--icon-color)'
const className = 'icon download-icon'
</script>
