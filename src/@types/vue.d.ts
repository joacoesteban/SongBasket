import { RendererIpc } from '../renderer/environment/ipc'
import Vue from 'vue'
import SbRouter from '../renderer/environment/sbRouter'
import coreController from '../renderer/controllers/Core.controller'
import setupController from '../renderer/controllers/Setup.controller'
import trackController from '../renderer/controllers/Track.controller'
import playlistController from '../renderer/controllers/Playlist.controller'
import utilsController from '../renderer/controllers/Utils.controller'
import modalController from '../renderer/controllers/Modal.controller'

type shared = {
  $: JQueryStatic,
  $uuid: () => string,
  $sleep: (time: number) => Promise<void>,
  $jsonClone: (obj: {}) => {},
  $setRootVar: (key: string, val: string, valJs?: unknown) => void,
  $sbRouter: SbRouter,
  $ComponentRefs: {},
  $IPC: RendererIpc,
  $controllers: {
    setup: typeof setupController,
    core: typeof coreController,
    track: typeof trackController,
    playlist: typeof playlistController,
    utils: typeof utilsController,
    modal: typeof modalController,
  }
}

declare module 'vue/types/vue' {
  interface Vue extends shared {
    DOWNLOADED_TRACKS: {},
    SEARCH_INPUT: {
      writeEvent: boolean,
      value: string
    },
    cardTransformInvalidation: number,
    OPEN_MODAL: () => void
  }

  interface VueConstructor extends shared { }
}
