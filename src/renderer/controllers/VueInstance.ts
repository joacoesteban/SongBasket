import Vue from 'vue'

import VueApp from '../main'

const env = {
  get instance(): Vue {
    return VueApp
  },
  get ipc() {
    return this.instance?.$IPC
  },
  get root() {
    // console.log('////', this.instance)
    return this.instance?.$root
  },
  get store() {
    return this.instance?.$store
  },
  get controllers() {
    return this.root?.$controllers
  },
  get router() {
    return this.instance?.$router
  },
  get sbRouter() {
    return this.root?.$sbRouter
  }
}

export default env
