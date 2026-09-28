import { BrowserWindow } from 'electron'

import { SongBasketId, SongBasketTrack } from '../../../@types/SongBasket'
import {
  SpotifyPlaylistId,
  SpotifySnapshotId,
  SpotifyUserId
} from '../../../@types/Spotify'
import { asyncForEachParallel } from '../../../UTILS'
import {
  BACKEND,
  CLEAN_CREDS_ON_LOGOUT,
  POPUP_WINDOW_CONFIG
} from '../../Global/constants'
import {
  getAppStatus,
  getHomeFolder,
  getLoginWindow,
  getUserId,
  setLoginWindow,
  setSongbasketId,
  setUserId
} from '../../Global/state'
import GETTERS from '../../Store/Helpers/customGetters'
import VUEX_MAIN from '../../Store/mainProcessStore'
import * as QUERY_MAKER from '../../queryMaker'
import {
  deleteCredential,
  getCredential,
  setCredential
} from '../../utils/credentials'
import FSController from '../FileSystem'
import ProtocolController, { UrlDecomposed } from './protocol.controller'
import * as API from './sbFetch'

type PlaylistVersionMap = {
  id: SpotifyPlaylistId
  snapshot_id?: SpotifySnapshotId
}
type CompletionCb = (
  err: Error | null,
  pl: PlaylistVersionMap,
  playlists: PlaylistVersionMap[]
) => void

const core = {
  // ---------------- FILESYSTEM ----------------
  setAppStatus: async () => {
    const status = getAppStatus()
    let folders
    try {
      folders = await FSController.UserMethods.retrieveFolders()
      if (!folders.paths.length || !folders.selected) {
        status.IS_LOGGED = false
        return false
      }

      await core.setHomeFolder(folders.selected)
      await core.setSongbasketIdGlobally()
      status.IS_LOGGED = true
      return true
    } catch (error) {
      if (!folders) throw error
      if (folders.selected) {
        await FSController.UserMethods.removeFolder(folders.selected)
      }
      await core.setAppStatus()
      return false
    }
  },
  addHomeFolder: async (path: string) => {
    await FSController.UserMethods.addFolder(path)
  },
  setHomeFolder: async (path: string) => {
    await core.addHomeFolder(path)
    await core.retrieveAndStoreState()
  },
  retrieveAndStoreState: async (path = getHomeFolder()) => {
    const data = await FSController.UserMethods.retrieveState(path)
    VUEX_MAIN.COMMIT.STORE_DATA_FROM_DISK(data)
    // Check if folder has synced playlists to setup watchers
    await FSController.UserMethods.setFolderIcons()
    await FSController.FileWatchers.createPlaylistWatchers()
  },
  stateExists: async (path = getHomeFolder()) => {
    try {
      const data = await FSController.UserMethods.retrieveState(path)
      return !!data
    } catch {
      return false
    }
  },
  clearUser: async () => {
    if (CLEAN_CREDS_ON_LOGOUT) await core.removeCredentials()
    setUserId(null)
    getAppStatus().IS_LOGGED = false
  },
  logout: async () => {
    await FSController.FileWatchers.clearAll()
    await FSController.UserMethods.unsetCurrentFolder()
    VUEX_MAIN.COMMIT.LOGOUT()
    await core.clearUser()
  },
  // -------------
  initializeLogin: async () => {
    if (getLoginWindow()) throw new Error('LOGIN WINDOW EXISTS')

    const loginWindow = new BrowserWindow(POPUP_WINDOW_CONFIG)
    setLoginWindow(loginWindow)

    loginWindow.loadURL(`${BACKEND}/init`, {
      extraHeaders: 'pragma: no-cache\n'
    })
    ProtocolController.on('auth', core.onLogin)

    await new Promise<void>((resolve) => {
      loginWindow.on('closed', () => {
        setLoginWindow(null)
        ProtocolController.off('auth', core.onLogin)
        console.log('---Login window closed---')
        if (getAppStatus().IS_LOGGED) resolve()
      })
    })
  },
  onLogin: async (params: UrlDecomposed) => {
    if (
      typeof params.payload !== 'object' ||
      params.payload === null ||
      !('spotify_authorization_success' in params.payload) ||
      !('user_data' in params.payload) ||
      params.payload.spotify_authorization_success !== true
    ) {
      throw new Error('AUTHORIZATION FAILED')
    }
    const userData = params.payload.user_data
    if (typeof userData !== 'object' || userData === null) {
      throw new Error('NO USER DATA')
    }
    if (!('id' in userData) || typeof userData.id !== 'string') {
      throw new Error('NO USER ID')
    }
    if (
      !('songbasket_id' in userData) ||
      typeof userData.songbasket_id !== 'string'
    ) {
      throw new Error('NO SONGBASKET_ID')
    }

    await core.setCredentials(userData.id, userData.songbasket_id)
    await core.setSongbasketIdGlobally(userData.id)
    await core.updateAll()
    getAppStatus().IS_LOGGED = true
    const loginWindow = getLoginWindow()
    if (loginWindow) await loginWindow.close()

    console.log('Login successfull')
  },
  setCredentials: async (id: SpotifyUserId, songbasket_id: SongBasketId) => {
    await setCredential(id, songbasket_id)
  },
  removeCredentials: async (id = getUserId()) => {
    if (!id) throw new Error('CURRENT USER ID MISSING')
    await deleteCredential(id)
  },
  getCredentials: async (id = getUserId()) => {
    if (!id) throw new Error('CURRENT USER ID MISSING')
    return getCredential(id)
  },
  setSongbasketIdGlobally: async (id = GETTERS.currentUserId()) => {
    if (!id) throw new Error("USER ID DOESN'T EXIST")
    setUserId(id)
    setSongbasketId(await core.getCredentials())
    API.createAxiosInstance()
  },
  updateAll: async (
    params: { playlistCompletionCallback: CompletionCb | null } = {
      playlistCompletionCallback: null
    }
  ) => {
    await core.updateSelf()
    await core.updatePlaylists(params.playlistCompletionCallback ?? null)
  },
  updateSelf: async () => {
    VUEX_MAIN.COMMIT.SET_USER(await API.getMe())
  },
  loadMorePlaylists: async () => {
    const userId = getUserId()
    if (userId) {
      const response = await API.getUserPlaylists(userId, {
        offset: GETTERS.playlistsOffset
      })
      VUEX_MAIN.COMMIT.UPDATE_USER_ENTITIES(response, { isLoadMore: true })
    }
  },
  updatePlaylists: async (completionCb?: CompletionCb | null) => {
    const playlists: PlaylistVersionMap[] =
      GETTERS.syncedPlaylistsSnapshots().map((playlist) => {
        const version: PlaylistVersionMap = { id: playlist.id }
        if (playlist.snapshot_id) version.snapshot_id = playlist.snapshot_id
        return version
      })
    await core.getAndStorePlaylists(playlists, completionCb ?? null)
    const userId = getUserId()
    if (userId) {
      const response = await API.getUserPlaylists(userId)
      VUEX_MAIN.COMMIT.UPDATE_USER_ENTITIES(response)
    }
  },
  getAndStorePlaylists: async (
    playlists: PlaylistVersionMap[],
    completionCb?: CompletionCb | null
  ): Promise<void> => {
    if (!playlists.length) return

    await asyncForEachParallel(playlists, async (pl) => {
      const err: Error | null = null
      try {
        console.log('playlist', pl)
        const request: {
          id: SpotifyPlaylistId
          snapshot_id?: SpotifySnapshotId
        } = {
          id: pl.id
        }
        if (pl.snapshot_id) request.snapshot_id = pl.snapshot_id
        const playlist = await API.getPlaylist(request)
        if (playlist) VUEX_MAIN.COMMIT.PLAYLIST_STORE_TRACKS(playlist)
      } catch (error) {
        console.error('ERROR WHEN FETCHING PLAYLIST')
        throw error
      } finally {
        if (completionCb) completionCb(err, pl, playlists)
      }
    })
  },
  populateQueuedPlaylists: async () => {
    const ids = GETTERS.uncachedPlaylists()
    console.log('aber', ids)
    if (ids.length) {
      await core.getAndStorePlaylists(ids.map((id) => ({ id })))
    }
    return true
  },
  youtubize: async (
    params: { trackCompletionCallback: ((total: number) => void) | null } = {
      trackCompletionCallback: null
    }
  ) => {
    await core.populateQueuedPlaylists()
    const queries: SongBasketTrack[] = []
    try {
      queries.push(...QUERY_MAKER.makeConversionQueries())
    } catch (error) {
      if (error instanceof Error && error.message === 'NOTHING') {
        console.log('no queries')
      } else {
        throw error
      }
    }

    if (queries.length) {
      const pausedPlaylists = GETTERS.pausedPlaylists
      const trackShouldConvert = (track: SongBasketTrack) =>
        !(
          (track.flags.converted && !track.flags.conversionError) ||
          track.flags.paused ||
          track.playlists.every(({ id }) => pausedPlaylists.includes(id))
        )
      const { tracks, failed } = await API.youtubizeAll(
        queries,
        trackShouldConvert,
        params.trackCompletionCallback
      )
      VUEX_MAIN.COMMIT.YOUTUBIZE_RESULT(tracks)
      if (failed) throw new Error()
    } else {
      console.log('nothing to do, just committing')
    }
    VUEX_MAIN.COMMIT.COMMIT_ALL_CHANGES()
    console.log('Youtubize done from core')
  }
}

export default core
