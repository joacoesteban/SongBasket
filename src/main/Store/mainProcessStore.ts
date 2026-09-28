import {
  SongBasketSaveFile,
  SongBasketTrack,
  SongBasketTrackConversionSelection
} from '../../@types/SongBasket'
import {
  SpotifyApiPlaylistsResponse,
  SpotifyPlaylist,
  SpotifyPlaylistId,
  SpotifySnapshotId,
  SpotifyTrack,
  SpotifyTrackId,
  SpotifyUser
} from '../../@types/Spotify'
import { YouTubeResult } from '../../@types/YouTube'
import * as UTILS from '../../MAIN_PROCESS_UTILS'
import { getHomeFolder } from '../Global/state'
import FileWatchers from '../controllers/FileSystem/FileWatchers'
import UserMethods from '../controllers/FileSystem/UserMethods'
import trackUtils from './Helpers/Tracks'

const FSController = {
  UserMethods,
  FileWatchers
}

let saveQueue = 0

const BLOCK = false
function saveToDisk(check: boolean = false): void {
  if (BLOCK) return
  if (!check) {
    saveQueue++
    setTimeout(() => saveToDisk(true), 1000)
    return
  }

  if (--saveQueue > 0) return
  console.log(
    '::::::::::::::::::::::::::::SAVING::::::::::::::::::::::::::::::::'
  )
  FSController.UserMethods.saveState({ state, path: getHomeFolder() })
}

const getDefaultState: () => SongBasketSaveFile = () => {
  return {
    user: {
      country: '',
      display_name: '',
      email: '',
      external_urls: {
        spotify: ''
      },
      followers: {
        href: null,
        total: 0
      },
      href: '',
      id: '',
      images: [],
      product: '',
      type: '',
      uri: ''
    },
    playlists: [],
    syncedPlaylists: [],
    queuedPlaylists: [],
    cachedPlaylists: [],
    deletedPlaylists: [],
    convertedTracks: [],
    currentPlaylist: '',
    control: {
      total: 0,
      offset: 0
    },
    lastSync: null
  }
}

const getters = {
  get syncedPlaylists_safe(): SpotifyPlaylistId[] {
    return state.syncedPlaylists.filter((id) => {
      const playlist = state.playlists.find((pl) => pl.id === id)
      return playlist !== undefined && !playlist.isPaused
    })
  }
}

let state = getDefaultState()

const mutations = {
  SET_STATE(newState: SongBasketSaveFile): void {
    state = UTILS.cloneObject(newState)
  },
  STORE_DATA_FROM_DISK(data: SongBasketSaveFile): void {
    const {
      cachedPlaylists,
      control,
      playlists,
      queuedPlaylists,
      syncedPlaylists,
      deletedPlaylists,
      user,
      convertedTracks,
      lastSync
    } = data

    state.playlists = playlists
    state.user = user
    state.cachedPlaylists = cachedPlaylists
    state.control = control
    state.playlists = playlists
    state.queuedPlaylists = queuedPlaylists
    state.syncedPlaylists = syncedPlaylists
    state.deletedPlaylists = deletedPlaylists
    state.user = user
    state.convertedTracks = convertedTracks
    state.lastSync = (lastSync && new Date(lastSync)) || null

    console.log('DATA STORED. ', playlists.length, 'playlists')

    const initialMutation = false
    if (initialMutation) this.REPROCESS_ALL_TRACKS()
    // this.INVALIDATE_SYNCED_SNAPSHOT_IDS()
    // SAVE_TO_DISK()
  },
  SET_USER(userData: SpotifyUser): void {
    state.user = userData
  },
  UPDATE_USER_ENTITIES(
    playlists: SpotifyApiPlaylistsResponse,
    params = { isLoadMore: false }
  ) {
    function isCachedOrSynced(id: SpotifyPlaylistId): {
      c: SpotifySnapshotId | boolean
      s: boolean
    } {
      // If it's cached I want to compare the version with the currently stored one.
      // If they match I will keep the tracks (currently stored version)
      // If they don't I will keep the new version without tracks and the playlist will be uncached
      const cacheEntry = findById(id, state.cachedPlaylists)
      let c: SpotifySnapshotId | boolean = false
      if (cacheEntry >= 0) {
        const cache = state.cachedPlaylists[cacheEntry]
        if (cache) c = cache.snapshot_id
      }

      const s = findById(id, state.syncedPlaylists) >= 0
      return { c, s }
    }
    function normalizePlaylist(pl: SpotifyPlaylist): SpotifyPlaylist {
      pl.tracks.items = []
      pl.tracks.added = []
      pl.tracks.removed = []
      return pl
    }

    if (!params.isLoadMore) {
      if (
        state.cachedPlaylists.length > 0 ||
        state.syncedPlaylists.length > 0
      ) {
        for (let i = 0; i < playlists.items.length; i++) {
          const currentPlaylist = playlists.items[i]
          if (!currentPlaylist) continue
          const cachedOrSynced = isCachedOrSynced(currentPlaylist.id)
          if (!cachedOrSynced.c && !cachedOrSynced.s) {
            normalizePlaylist(currentPlaylist)
          }

          if (cachedOrSynced.c !== false) {
            if (cachedOrSynced.c === currentPlaylist.snapshot_id) {
              const currentIndex = findById(currentPlaylist.id, state.playlists)
              const storedPlaylist = state.playlists[currentIndex]
              if (storedPlaylist) {
                playlists.items.splice(i, 1, storedPlaylist)
              }
            } else {
              this.FIND_AND_UNCACHE({ id: currentPlaylist.id })
            }
            continue
          }
          if (cachedOrSynced.s) {
            const index = findById(currentPlaylist.id, state.playlists)
            const storedPlaylist = state.playlists[index]
            if (storedPlaylist) {
              playlists.items.splice(i, 1, storedPlaylist)
            }
            continue
          }
        }
      } else {
        // console.log('NO CACHED OR SYNCED PLS')
        playlists.items.forEach(normalizePlaylist)
      }

      // FIXME deprecate or rethink this logic
      // TODO this doesnt truly reflect if a playlist has been deleted, the request might have a limit to the number of playlists returned,
      // TODO so if the playlist is not in the response it is assumed to have been deleted wrongly
      // TODO if there's need to implement this logic, it should also unlink the playlist from every track in convertedTracks which contains the playlist
      for (let i = 0; i < state.syncedPlaylists.length; i++) {
        const playlistId = state.syncedPlaylists[i]
        if (!playlistId) continue
        const index = findById(playlistId, playlists.items)
        if (index === -1) {
          const deletedPlaylist = state.playlists.find(
            (playlist) => playlist.id === playlistId
          )
          if (deletedPlaylist) state.deletedPlaylists.push(deletedPlaylist)
          state.syncedPlaylists.splice(i--, 1)
        }
      }

      state.playlists = playlists.items
    } else {
      playlists.items.forEach(
        (pl) =>
          state.playlists.every((local) => local.id !== pl.id) &&
          state.playlists.push(normalizePlaylist(pl))
      )
    }

    state.control = {
      total: playlists.total,
      offset: state.playlists.length
    }

    if (!params.isLoadMore) state.lastSync = new Date()
    saveToDisk()
  },

  LOGOUT() {
    console.log('CLEARING::::::::')
    Object.assign(state, getDefaultState())
  },

  PLAYLIST_STORE_TRACKS(playlist: SpotifyPlaylist): void {
    const index = findById(playlist.id, state.playlists)
    if (index === -1)
      throw new Error(
        'PLAYLIST NOT FOUND WHEN SETTING TRACKS INSIDE STATE (VUEX)'
      )

    const statePl = state.playlists[index]
    if (!statePl)
      throw new Error(
        'PLAYLIST NOT FOUND WHEN SETTING TRACKS INSIDE STATE (VUEX)'
      )

    if (state.syncedPlaylists.some((p) => p === playlist.id)) {
      if (statePl.name !== playlist.name) {
        const oldName = statePl.folderName || statePl.name
        statePl.folderName = null
        if (playlist.folderName) {
          void FSController.UserMethods.renameFolder({
            oldName,
            newName: playlist.folderName
          })
        }
      }

      const stateImage = statePl.images[0]?.url
      const playlistImage = playlist.images[0]?.url
      if (stateImage !== playlistImage) {
        console.log('new folder image', statePl.name, stateImage, playlistImage)
        void FSController.UserMethods.setFolderIcons(playlist.id, {
          force: true
        })
      }

      if (statePl.folderName) {
        playlist.folderName = statePl.folderName
      } else {
        let name = playlist.name
        if (
          state.playlists.some(
            (p) => p.name === playlist.name && p.id !== playlist.id
          )
        )
          name += ' - ' + playlist.id
        playlist.folderName = name
      }

      const oldPl = [...statePl.tracks.items, ...statePl.tracks.removed]
      const { items, removed, added } = playlistComputeChanges(
        oldPl,
        playlist.tracks.items
      )
      playlist.tracks.items = items
      playlist.tracks.added = added
      playlist.tracks.removed = removed
      console.log(
        'CHANGES',
        playlist.tracks.added.map((i) => i.name),
        playlist.tracks.removed.map((i) => i.name)
      )
    } else {
      playlist.tracks = {
        ...playlist.tracks,
        added: [],
        removed: []
      }
      const { id, snapshot_id } = playlist
      this.PLAYLIST_UPDATE_CACHED({ id, snapshot_id })
      void FSController.UserMethods.setFolderIcons(playlist.id, { force: true })
    }
    state.playlists[index] = playlist

    saveToDisk()
  },

  PLAYLIST_UPDATE_CACHED(params: {
    id: SpotifyPlaylistId
    snapshot_id: SpotifySnapshotId
  }): void {
    const { id, snapshot_id } = params
    let found = false
    for (let i = 0; i < state.cachedPlaylists.length; i++) {
      const cachedPlaylist = state.cachedPlaylists[i]
      if (!cachedPlaylist || cachedPlaylist.id !== id) continue
      state.cachedPlaylists[i] = { id, time: Date.now(), snapshot_id }
      found = true
      break
    }
    if (!found)
      state.cachedPlaylists = [
        ...state.cachedPlaylists,
        { id, time: Date.now(), snapshot_id }
      ]
    saveToDisk()
  },
  SET_CURRENT_PLAYLIST(id: SpotifyPlaylistId): void {
    state.currentPlaylist = id
  },
  QUEUE_PLAYLIST(id: SpotifyPlaylistId): void {
    let found = false
    for (let i = 0; i < state.queuedPlaylists.length; i++) {
      const pl = state.queuedPlaylists[i]
      if (pl === id) {
        // Unqueues if found
        found = true
        state.queuedPlaylists.splice(i, 1)
      }
    }
    if (!found) state.queuedPlaylists = [...state.queuedPlaylists, id]
  },
  FIND_AND_UNQUEUE(params: { id: SpotifyPlaylistId }): void {
    const { id } = params
    const index = findById(
      id,
      state.queuedPlaylists.map((pl) => {
        return { id: pl }
      })
    )
    // console.log('Unqueueing', id, index)
    if (index >= 0) {
      state.queuedPlaylists.splice(index, 1)
    }
  },
  FIND_AND_UNCACHE(params: { id: SpotifyPlaylistId }): void {
    const { id } = params
    const index = findById(id, state.cachedPlaylists)
    // console.log('Uncaching', id, index)
    if (index >= 0) {
      state.cachedPlaylists.splice(index, 1)
    }
    saveToDisk()
  },
  REMOVE_CONVERSION_DUPLICATES(): void {
    const seen = new Set<string>()
    state.convertedTracks = state.convertedTracks.filter((track) => {
      if (seen.has(track.id)) return false
      seen.add(track.id)
      return true
    })
  },
  CLEAN_TRACKS(): void {
    const playlists = state.syncedPlaylists
      .map((id) => state.playlists.find((pl) => pl.id === id))
      .filter((playlist): playlist is SpotifyPlaylist => playlist !== undefined)
    state.convertedTracks = UTILS.cloneObject(state.convertedTracks).filter(
      (track) => {
        track.playlists = track.playlists.filter((pl) => {
          const playlist = playlists.find((p) => p.id === pl.id)
          if (!playlist) return false
          return playlist.tracks.items.some((t) => t.id === track.id)
        })
        return track.playlists.length > 0
      }
    )
  },
  REPROCESS_ALL_TRACKS(
    params: { resetSelection: boolean; forceCustom: boolean } = {
      resetSelection: false,
      forceCustom: false
    }
  ): void {
    state.convertedTracks = state.convertedTracks.map((convertedTrack) => {
      if (params.resetSelection) convertedTrack.selection = null
      if (convertedTrack.custom) {
        convertedTrack.custom.isCustomTrack = true
        if (params.forceCustom) convertedTrack.selection = false
        if (!convertedTrack.custom.youtube_id)
          convertedTrack.custom.youtube_id = convertedTrack.custom.id
      }
      if (convertedTrack.conversion) {
        convertedTrack.conversion.yt.forEach((t) => {
          if (!t.youtube_id) t.youtube_id = t.id
        })
      }
      return trackUtils.calculateBestMatch(convertedTrack, true)
    })
    console.log('all tracks reprocessed')
  },
  async YOUTUBIZE_RESULT(convertedTracks: SongBasketTrack[]): Promise<void> {
    state.convertedTracks = convertedTracks.map((convertedTrack) =>
      trackUtils.calculateBestMatch(convertedTrack)
    )
    ;[...state.queuedPlaylists].forEach((pl) => {
      state.syncedPlaylists.push(pl)
      state.queuedPlaylists = state.queuedPlaylists.filter((p) => p !== pl)
      state.cachedPlaylists = state.cachedPlaylists.filter((p) => p.id !== pl)
    })
    console.log('Total converted tracks', state.convertedTracks.length)
    saveToDisk()
  },
  COMMIT_ALL_CHANGES(): void {
    getters.syncedPlaylists_safe.forEach((pl) => this.COMMIT_TRACK_CHANGES(pl))
    saveToDisk()
  },
  INVALIDATE_SYNCED_SNAPSHOT_IDS(): void {
    getters.syncedPlaylists_safe
      .map((id) => state.playlists.find((pl) => pl.id === id))
      .forEach((pl) => {
        if (!pl) throw new Error('SYNCED PLAYLIST NOT FOUND IN PLAYLIST LIST')
        pl.snapshot_id = ''
      })
  },
  SET_CONVERTED_TRACKS_PROCESSED_FLAG(val: boolean = true): void {
    state.convertedTracks.forEach((t) => (t.flags.processed = val))
  },
  COMMIT_TRACK_CHANGES(id: SpotifyPlaylistId): void {
    const index = findById(id, state.playlists)
    if (index === -1) {
      console.error('PLAYLIST NOT FOUND WHEN COMMITING CHANGES')
      return
    }
    const playlist = state.playlists[index]
    if (!playlist) return
    const tracks = playlist.tracks

    tracks.removed.forEach((rem) => {
      for (let o = 0; o < state.convertedTracks.length; o++) {
        const track = state.convertedTracks[o]
        if (!track || rem.id !== track.id) continue
        track.playlists = track.playlists.filter((pl) => pl.id !== id)
        if (!track.playlists.length) state.convertedTracks.splice(o, 1)
        break
      }
    })

    playlist.tracks.items.push(...tracks.added)
    playlist.tracks.added = []
    playlist.tracks.removed = []
  },
  CHANGE_YT_TRACK_SELECTION(params: {
    trackId: SpotifyTrackId
    newId: SongBasketTrackConversionSelection
  }) {
    const { trackId, newId } = params
    if (newId === undefined)
      throw new Error(
        'New selection id does not exist:: @ mainProcessStore :: CHANGE_YT_TRACK_SELECTION'
      )
    if (!trackId)
      throw new Error(
        'SP Track id does not exist:: @ mainProcessStore :: CHANGE_YT_TRACK_SELECTION'
      )

    const track = state.convertedTracks.find((t) => t.id === trackId)
    if (!track)
      throw new Error(
        'Converted Track not found:: @ mainProcessStore :: CHANGE_YT_TRACK_SELECTION'
      )
    if (!track.conversion?.yt.length && newId !== false)
      throw new Error('NO CONVERSION RESULTS TO CHANGE')

    track.selection = newId
    track.flags.selectionIsApplied = newId !== null

    saveToDisk()
  },
  async UNSYNC_PLAYLIST(id: SpotifyPlaylistId): Promise<void> {
    console.log('UNSYNCING ', id)
    if (!state.syncedPlaylists.some((pl) => pl === id))
      throw new Error('Playlist not found inside SyncedPlaylists list')
    state.syncedPlaylists = state.syncedPlaylists.filter((pl) => pl !== id)
    const playlist = state.playlists.find((pl) => pl.id === id)
    if (!playlist) throw new Error('Playlists not found inside playlists list')

    playlist.tracks.removed = playlist.tracks.items
    playlist.tracks.items = []
    playlist.tracks.added = []

    this.COMMIT_TRACK_CHANGES(id)

    await FSController.UserMethods.deletePlaylist(
      playlist.folderName || playlist.name
    )
    saveToDisk()
  },
  PAUSE_PLAYLIST(id: SpotifyPlaylistId): void {
    console.log('PAUSING ', id)
    if (!state.syncedPlaylists.some((pl) => pl === id))
      throw new Error('Playlist not found inside SyncedPlaylists list')
    const playlist = state.playlists.find((pl) => pl.id === id)
    if (!playlist) throw new Error('Playlists not found inside playlists list')

    playlist.isPaused = !playlist.isPaused

    saveToDisk()
  },
  PAUSE_TRACK(id: SpotifyTrackId): void {
    if (!id)
      throw new Error(
        'New selection id does not exist:: @ mainProcessStore :: CHANGE_YT_TRACK_SELECTION'
      )

    const track = state.convertedTracks.find((t) => t.id === id)
    if (!track)
      throw new Error(
        'Converted Track not found:: @ mainProcessStore :: CHANGE_YT_TRACK_SELECTION'
      )

    track.flags.paused = !track.flags.paused

    saveToDisk()
  },
  CUSTOM_TRACK_URL(params: {
    details: YouTubeResult
    trackId: SpotifyTrackId
  }): void {
    const { details, trackId } = params
    const track =
      state.convertedTracks[findById(trackId, state.convertedTracks)]
    if (!track)
      return console.error(
        'TRACK NOT FOUND IN CONVERTED TRACKS :: CUSTOM_TRACK_URL'
      )

    details.isCustomTrack = true
    track.custom = details
    track.selection = false
    saveToDisk()
  }
}

const STATE_KEYS: (keyof SongBasketSaveFile)[] = [
  'user',
  'playlists',
  'syncedPlaylists',
  'queuedPlaylists',
  'cachedPlaylists',
  'deletedPlaylists',
  'convertedTracks',
  'currentPlaylist',
  'control',
  'lastSync'
]
const controller = {
  COMMIT: mutations,
  STATE: () => state,
  STATE_SAFE: (
    filter?: (keyof SongBasketSaveFile)[]
  ): SongBasketSaveFile | Partial<SongBasketSaveFile> => {
    const safeState = UTILS.cloneObject(controller.STATE())
    if (filter && filter.length > 0) {
      const partialState: Partial<SongBasketSaveFile> = safeState
      for (const key of STATE_KEYS) {
        if (!filter.includes(key)) delete partialState[key]
      }
    }
    return safeState
  }
}

function findById(id: string, obj: (string | { id: string })[]): number {
  for (let i = 0; i < obj.length; i++) {
    const entry = obj[i]
    if (!entry) continue
    if (typeof entry === 'string') {
      if (entry === id) return i
      continue
    }
    if (entry.id === id) return i
  }
  return -1
}

function playlistComputeChanges(
  oldPlaylistTracks: SpotifyTrack[],
  newPlaylistTracks: SpotifyTrack[]
): { added: SpotifyTrack[]; items: SpotifyTrack[]; removed: SpotifyTrack[] } {
  // Starting with both local spotify copy and local youtube copy
  // Tracks will be compared between both arrays and if it's a match, then both will be spliced from both arrays
  // If there are no changes, then both arrays will be empty

  const added = [...newPlaylistTracks]
  let removed = [...oldPlaylistTracks]
  const items: SpotifyTrack[] = []

  if (removed.length > 0) {
    // This checks if the synced playlist has not been added to DB yet, if so, then every song will be 'new'
    let i = 0
    while (i < added.length) {
      const addedTrack = added[i]
      if (!addedTrack) break
      let found = false

      for (let o = 0; o < removed.length; o++) {
        const removedTrack = removed[o]
        if (!removedTrack) continue

        if (addedTrack.id === removedTrack.id) {
          found = true
          removed.splice(o, 1)
          items.push(...added.splice(i, 1))
          break
        }
      }
      if (!found) i++
    }
  } else removed = []
  return { added, items, removed }
}

export default controller
