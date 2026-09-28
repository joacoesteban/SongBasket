import * as chokidar from 'chokidar'
import { FSWatcher } from 'chokidar'
import * as PATH from 'path'

import {
  SongbasketCustomMp3TagNormalized,
  SongbasketCustomMp3TagsNormalized
} from '../../../@types/SongBasket'
import { SpotifyTrackId } from '../../../@types/Spotify'
import { YouTubeResultId } from '../../../@types/YouTube'
import * as utils from '../../../MAIN_PROCESS_UTILS'
import REGEX from '../../Global/REGEX'
import { getHomeFolder } from '../../Global/state'
import customGetters from '../../Store/Helpers/customGetters'
import UserMethods from './UserMethods'

type NormalizedTagMap = Record<SongbasketCustomMp3TagsNormalized, string | null>
export type TrackList = Record<
  SpotifyTrackId,
  Record<YouTubeResultId, { playlists: string[] }>
>
export type TrackFileEntry = NormalizedTagMap & { playlist: string }
export enum FSWatcherEvent {
  ADD = 'add',
  CHANGE = 'change',
  UNLINK = 'unlink',
  UNLINKDIR = 'unlinkDir',
  ERROR = 'error',
  READY = 'ready',
  RAW = 'raw'
}
export enum SBWatcherEvent {
  READY = 'ready',
  ADDED = 'added',
  REMOVED = 'removed'
}

const homeFolderPath = () => getHomeFolder()

type WatcherCallback = (track?: TrackFileEntry) => unknown

const ON_READY_FNS: WatcherCallback[] = []
const ON_TRACK_ADDED_FNS: WatcherCallback[] = []
const ON_TRACK_REMOVED_FNS: WatcherCallback[] = []

const FileWatchers: {
  tracks: Record<string, NormalizedTagMap>
  watchers: FSWatcher[]
  createPlaylistWatchers: () => Promise<void>
  clearAll: () => Promise<void>
  rebuildWatchers: () => Promise<void>
  retrieveTags: (path: string) => Promise<NormalizedTagMap>
  retrieveTracks: () => TrackList
  addTrack: (path: string, params: NormalizedTagMap) => void
  removeTrack: (path: string) => void
  handleWatcherEvent: (event: FSWatcherEvent, args?: unknown) => Promise<void>
  on: (event: SBWatcherEvent, fn: WatcherCallback) => void
  trigger: (event: SBWatcherEvent, payload: TrackFileEntry) => void
} = {
  tracks: {},
  watchers: [],
  async createPlaylistWatchers() {
    const syncedPlaylists = customGetters.SyncedPlaylistsSp()
    syncedPlaylists.forEach((pl) => {
      const path =
        homeFolderPath() +
        '/' +
        utils.encodeIntoFilename(pl.folderName || pl.name)

      // READY++

      const watcher = chokidar.watch(path, {
        ignored: /[/\\]\./
      })
      this.watchers.push(watcher)

      watcher
        .on(FSWatcherEvent.ADD, (path) =>
          this.handleWatcherEvent(FSWatcherEvent.ADD, path)
        )
        .on(FSWatcherEvent.CHANGE, (path) =>
          this.handleWatcherEvent(FSWatcherEvent.CHANGE, path)
        )
        .on(FSWatcherEvent.UNLINK, (path) =>
          this.handleWatcherEvent(FSWatcherEvent.UNLINK, path)
        )
        .on(FSWatcherEvent.UNLINKDIR, (path) =>
          this.handleWatcherEvent(FSWatcherEvent.UNLINKDIR, path)
        )
        .on(FSWatcherEvent.ERROR, (error) =>
          this.handleWatcherEvent(FSWatcherEvent.ERROR, error)
        )
        .on(FSWatcherEvent.READY, () =>
          this.handleWatcherEvent(FSWatcherEvent.READY)
        )
        .on(FSWatcherEvent.RAW, (event, path, details) =>
          this.handleWatcherEvent(FSWatcherEvent.RAW, [event, path, details])
        )

      // 'add', 'addDir' and 'change' events also receive stat() results as second
      // argument when available: http://nodejs.org/api/fs.html#fs_class_fs_stats
      watcher.on(FSWatcherEvent.CHANGE, function (path, stats) {
        if (stats) console.log('File', path, 'changed size to', stats.size)
      })
    })
  },
  async clearAll() {
    for (const watcher of this.watchers) {
      await watcher.close()
    }
    this.watchers = []
    this.tracks = {}
  },
  async rebuildWatchers() {
    await this.clearAll()
    await this.createPlaylistWatchers()
  },
  async retrieveTags(path) {
    const tags = await UserMethods.retrieveMP3FileTags(path)
    const normalized: NormalizedTagMap = {
      spotify_id: null,
      youtube_id: null
    }

    tags.forEach((tag) => {
      const normalizedTagName = normalizeTagName(
        tag.name.replace('songbasket_', '')
      )
      if (normalizedTagName) normalized[normalizedTagName] = tag.value
    })

    return normalized
  },
  retrieveTracks() {
    const tracksFormatted: TrackList = {}

    for (const key in this.tracks) {
      const track = this.tracks[key]
      if (!track) continue
      const { spotify_id, youtube_id } = track

      if (spotify_id && youtube_id) {
        if (!tracksFormatted[spotify_id]) tracksFormatted[spotify_id] = {}
        if (!tracksFormatted[spotify_id][youtube_id]) {
          tracksFormatted[spotify_id][youtube_id] = { playlists: [] }
        }

        tracksFormatted[spotify_id][youtube_id].playlists.push(
          getNameFromPath(key)
        )
      }
    }
    return tracksFormatted
  },

  addTrack(path, { spotify_id, youtube_id }) {
    for (const key in this.tracks) {
      if (key === path && this.tracks[key]) return
    }

    this.tracks[path] = {
      spotify_id,
      youtube_id
    }

    this.trigger(SBWatcherEvent.ADDED, {
      playlist: getNameFromPath(path),
      spotify_id,
      youtube_id
    })
  },
  removeTrack(path) {
    const trackToDelete = this.tracks[path]
    if (trackToDelete) {
      const playlist = getNameFromPath(path)
      const track: TrackFileEntry = {
        ...trackToDelete,
        playlist
      }
      delete this.tracks[path]
      this.trigger(SBWatcherEvent.REMOVED, track)
    }
  },

  async handleWatcherEvent(event, args) {
    if (event === FSWatcherEvent.RAW || event === FSWatcherEvent.READY) return
    if (event === FSWatcherEvent.ERROR) {
      console.error(args)
      return
    }
    if (typeof args !== 'string' || !isValidAudioPath(args)) return

    switch (event) {
      case FSWatcherEvent.ADD: {
        const tags = await this.retrieveTags(args)
        if (Object.keys(tags).length) this.addTrack(args, tags)
        break
      }
      case FSWatcherEvent.UNLINK:
        this.removeTrack(args)
        break
      case FSWatcherEvent.CHANGE:
      case FSWatcherEvent.UNLINKDIR:
        break
    }
  },

  on(event, fn) {
    if (typeof fn !== 'function') throw new Error('Callback is not a function')
    const stack = giveMeStack(event)
    if (stack) stack.push(fn)
  },
  trigger(event, params) {
    const stack = giveMeStack(event)
    if (stack) stack.forEach((fn) => fn(params))
  }
}

const isValidAudioPath = (path: string) => REGEX.mp3File.test(path)

const getNameFromPath = (path: string) => {
  path = PATH.dirname(path)
  return path.substring(path.lastIndexOf('/') + 1)
}

const normalizeTagName = (
  name: string
): SongbasketCustomMp3TagsNormalized | null => {
  switch (name) {
    case SongbasketCustomMp3TagNormalized.spotify_id:
      return SongbasketCustomMp3TagNormalized.spotify_id
    case SongbasketCustomMp3TagNormalized.youtube_id:
      return SongbasketCustomMp3TagNormalized.youtube_id
    default:
      return null
  }
}

const giveMeStack = (event: SBWatcherEvent): WatcherCallback[] | null => {
  switch (event) {
    case SBWatcherEvent.READY:
      return ON_READY_FNS
    case SBWatcherEvent.ADDED:
      return ON_TRACK_ADDED_FNS
    case SBWatcherEvent.REMOVED:
      return ON_TRACK_REMOVED_FNS
    default:
      return null
  }
}
export default FileWatchers
