import { ref } from 'vue'
import {
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

export const routeNames = {
  loading: 'loading',
  setup: 'setup',
  folderView: 'folder-view',
  empty: 'empty',
  home: 'home',
  playlistsList: 'playlists-list',
  tracksList: 'tracks-list',
  playlistView: 'playlist-view',
  trackReview: 'track-review',
  downloadsView: 'downloads-view'
}

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

export const navigationDirection = ref<'pull' | 'push' | 'release'>('release')
export const navigationPending = ref(false)

const router = createRouter({
  history: createWebHashHistory(),
  routes: ROUTES
})

router.beforeEach((to) => {
  navigationPending.value = true
  if (to.name === routeNames.home) navigationDirection.value = 'pull'
  else navigationDirection.value = 'push'
  return true
})

router.afterEach(() => {
  navigationDirection.value = 'release'
  navigationPending.value = false
})

router.onError(() => {
  navigationDirection.value = 'release'
  navigationPending.value = false
})

export default router
