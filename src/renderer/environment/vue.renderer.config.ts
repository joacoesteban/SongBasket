import $ from 'jquery'
import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowRight,
  faArrowLeft,
  faChevronUp
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { camelCase } from 'change-case'
import * as utils from '../utils'
import SbRouter from './sbRouter'
import setIpcRoutes from './ipc.renderer.config'
import Vue, { VueConstructor } from 'vue'
import VueApp from '../main'
import setupController from '../controllers/Setup.controller'
import coreController from '../controllers/Core.controller'
import trackController from '../controllers/Track.controller'
import playlistController from '../controllers/Playlist.controller'
import utilsController from '../controllers/Utils.controller'
import modalController from '../controllers/Modal.controller'

library.add(
  faArrowRight,
  faArrowLeft,
  faChevronUp
)

const VueProto: VueConstructor<Vue> = Vue

export function vueProtoConfig () {
  VueProto.config.productionTip = false

  VueProto.component('FontAwesomeIcon', FontAwesomeIcon)
}

export function vueAppConfig (): void {
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

function setControllers () {
  VueApp.$controllers = {
    setup: setupController,
    core: coreController,
    track: trackController,
    playlist: playlistController,
    utils: utilsController,
    modal: modalController
  }
}
