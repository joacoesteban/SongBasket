import { ref } from 'vue'
import {
  type NavigationFailure,
  type RouteLocationRaw,
  type RouteRecordRaw,
  createRouter,
  createWebHashHistory
} from 'vue-router'

import Empty from '../components/Empty.vue'
import FolderView from '../components/FolderView/FolderView.vue'
import DownloadsView from '../components/Home/DownloadsView/DownloadsView.vue'
import Home from '../components/Home/Home.vue'
import PlaylistView from '../components/Home/PlaylistView/PlaylistView.vue'
import PlaylistsList from '../components/Home/PlaylistsList.vue'
import TrackReview from '../components/Home/TrackReview/TrackReview.vue'
import TracksList from '../components/Home/TracksList.vue'
import LoadingScreen from '../components/LoadingScreen/LoadingScreen.vue'
import Setup from '../components/Setup/Setup.vue'
import { type AnimationPhase, animationFor, routeNames } from './animation'

export { routeNames } from './animation'

const ROUTES: RouteRecordRaw[] = [
  {
    path: '/',
    name: routeNames.loading,
    component: LoadingScreen
  },
  {
    path: '/setup',
    name: routeNames.setup,
    component: Setup
  },
  {
    path: '/folder-view',
    name: routeNames.folderView,
    component: FolderView
  },
  {
    path: '/empty',
    name: routeNames.empty,
    component: Empty
  },
  {
    path: '/home',
    name: routeNames.home,
    component: Home,
    redirect: { name: routeNames.playlistsList },
    children: [
      {
        path: 'playlists-list',
        name: routeNames.playlistsList,
        component: PlaylistsList
      },
      {
        path: 'tracks-list',
        name: routeNames.tracksList,
        component: TracksList
      },
      {
        path: 'playlist-view/:id',
        name: routeNames.playlistView,
        component: PlaylistView,
        props: true
      },
      {
        path: 'track-review/:id',
        name: routeNames.trackReview,
        component: TrackReview,
        props: true
      },
      {
        path: 'downloads-view',
        name: routeNames.downloadsView,
        component: DownloadsView
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: routeNames.loading }
  }
]

export const navigationDirection = ref<AnimationPhase | 'release'>('release')
export const navigationFast = ref(false)
export const navigationPending = ref(false)

const TRANSITION_EXIT_MS = 300
const TRANSITION_PHASE_MS = 100

let isTransitioning = false
let transitionCompletionScheduled = false

const sleep = (duration: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>()
  window.setTimeout(resolve, duration)
  return promise
}

const resetTransition = (): void => {
  navigationDirection.value = 'release'
  navigationFast.value = false
  navigationPending.value = false
  isTransitioning = false
  transitionCompletionScheduled = false
}

const finishTransition = async (): Promise<void> => {
  if (transitionCompletionScheduled) return
  transitionCompletionScheduled = true
  await sleep(TRANSITION_PHASE_MS)
  navigationFast.value = false
  navigationDirection.value = 'release'
  await sleep(TRANSITION_PHASE_MS)
  navigationPending.value = false
  isTransitioning = false
  transitionCompletionScheduled = false
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: ROUTES
})

router.beforeEach(async (to, from) => {
  if (from.name === undefined) return true
  isTransitioning = true
  navigationPending.value = true
  const animation = animationFor(from.name, to.name)
  navigationDirection.value = animation.exit
  navigationFast.value = false
  document.querySelector<HTMLElement>('.home-router')?.scrollTo({ top: 0 })

  await sleep(TRANSITION_EXIT_MS)
  navigationDirection.value = animation.enter
  navigationFast.value = true
  return true
})

router.afterEach((_to, _from, failure) => {
  if (failure !== undefined) {
    window.setTimeout(() => {
      if (isTransitioning) void finishTransition()
    }, TRANSITION_EXIT_MS)
    return
  }
  void finishTransition()
})

router.onError(() => {
  resetTransition()
})
export const navigate = (
  location: RouteLocationRaw
): Promise<void | NavigationFailure> => {
  if (isTransitioning) return Promise.resolve()
  return router.push(location)
}
export const navigateReplace = (
  location: RouteLocationRaw
): Promise<void | NavigationFailure> => {
  if (isTransitioning) return Promise.resolve()
  return router.replace(location)
}

export const navigateBack = (): void => {
  if (isTransitioning) return
  router.back()
}

export const navigateForward = (): void => {
  if (isTransitioning) return
  router.forward()
}

export default router
