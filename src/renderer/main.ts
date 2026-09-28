import Vue from 'vue'

import App from './App.vue'
import { configureApp, setEnvironment } from './environment'
import router from './router'
import store from './store'

const VueApp = new Vue({
  router,
  store,
  render: (h) => h(App)
})

export default VueApp

setEnvironment()
configureApp()

VueApp.$mount('#app')
