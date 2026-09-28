<template>
  <svg-icon :path="path" :icon-color="iconColor" :class-name="className" />
</template>

<script setup lang="ts">
import SvgIcon from './SvgIcon.vue'

const path = 'M8,5.14V19.14L19,12.14L8,5.14Z'
const iconColor = 'var(--icon-color)'
const className = 'icon close-icon'
</script>
