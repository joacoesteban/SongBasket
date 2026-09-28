import { camelCase } from 'change-case'
import $ from 'jquery'
import Vue, { VueConstructor } from 'vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowLeft,
  faArrowRight,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import coreController from '../controllers/Core.controller'
import modalController from '../controllers/Modal.controller'
import playlistController from '../controllers/Playlist.controller'
import setupController from '../controllers/Setup.controller'
import trackController from '../controllers/Track.controller'
import utilsController from '../controllers/Utils.controller'
import VueApp from '../main'
import * as utils from '../utils'
import setIpcRoutes from './ipc.renderer.config'
import SbRouter from './sbRouter'

library.add(faArrowRight, faArrowLeft, faChevronUp)

const VueProto: VueConstructor<Vue> = Vue

export function vueProtoConfig() {
  VueProto.config.productionTip = false

  VueProto.component('FontAwesomeIcon', FontAwesomeIcon)
}

export function vueAppConfig(): void {
  VueApp.$ = $
  VueApp.$uuid = () => crypto.randomUUID()
  VueApp.$sleep = utils.sleep
  VueApp.$jsonClone = utils.jsonClone
  VueApp.$setRootVar = (key, val, valJs) => {
    $(':root')[0].style.setProperty('--' + key, val)
    window.ROOT_VARS[camelCase(key)] = valJs || val
  }

  VueApp.$ComponentRefs = {
    slides: {}
  }
  setControllers()
  setIpcRoutes()
  // -----sb-router-----
  window.VUEAPP = VueApp
  VueApp.$sbRouter = new SbRouter()
}

function setControllers() {
  VueApp.$controllers = {
    setup: setupController,
    core: coreController,
    track: trackController,
    playlist: playlistController,
    utils: utilsController,
    modal: modalController
  }
}
