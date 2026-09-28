import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import { setEnvironment, configureApp } from './environment'

const VueApp = new Vue({
  router,
  store,
  render: h => h(App)
})

export default VueApp

setEnvironment()
configureApp()

VueApp.$mount('#app')
