<template>
  <RouterView />
  <Modal />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

import './CSS/Bootstrap/bootstrap.css'
import './CSS/GlobalStyles.vue'
import './CSS/fonts.css'
import './CSS/helpers.scss'
import './CSS/title-bar.scss'
import './CSS/user-select.css'
import './CSS/variables.scss'
import Modal from './components/Modal/Modal.vue'
</script>
