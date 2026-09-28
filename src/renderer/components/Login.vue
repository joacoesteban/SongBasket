<template>
  <div class="df fldc global-center">
    <button id="onboarding-login-button" class="button" @click="emit('login')">
      Login to Spotify
    </button>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'LoginView' })
const emit = defineEmits<{ login: [] }>()
</script>

<style lang="scss"></style>
