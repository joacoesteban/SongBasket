<template>
  <svg-icon :path="path" :icon-color="iconColor" :class-name="className" />
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'

const path = 'M14,19H18V5H14M6,19H10V5H6V19Z'
const iconColor = 'var(--icon-color)'
const className = 'icon close-icon'
</script>
