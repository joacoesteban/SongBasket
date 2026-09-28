import { promises as fs } from 'fs'
import * as fsCb from 'fs'
// import NodeID3 from 'node-id3'
import * as iconv from 'iconv-lite'
import * as PATH from 'path'

import {
  SongBasketSaveFile,
  SongBasketTrackFile,
  SongbasketCustomMp3Tag,
  SongbasketFoldersFile
} from '../../../@types/SongBasket'
import { SpotifyPlaylistId } from '../../../@types/Spotify'
import { Constants } from '../../../@types/constants'
import * as utils from '../../../MAIN_PROCESS_UTILS'
import { asyncForEachParallel } from '../../../UTILS'
import REGEX from '../../Global/REGEX'
import { APP_SUPPORT_PATH } from '../../Global/constants'
import {
  getHomeFolder,
  getSessionFolderPaths,
  setSessionFolderPaths
} from '../../Global/state'
import customGetters from '../../Store/Helpers/customGetters'
import Helpers from './Helpers'

type Tag = {
  name: SongbasketCustomMp3Tag
  value: string
}
type Track = SongBasketTrackFile

const isFoldersFile = (value: unknown): value is SongbasketFoldersFile => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('paths' in value) ||
    !('selected' in value)
  ) {
    return false
  }
  const paths = value.paths
  const selected = value.selected
  return (
    Array.isArray(paths) &&
    paths.every((path) => typeof path === 'string') &&
    (typeof selected === 'string' || selected === null)
  )
}

const isSongBasketSaveFile = (value: unknown): value is SongBasketSaveFile => {
  if (typeof value !== 'object' || value === null) return false
  if (
    !('user' in value) ||
    !('playlists' in value) ||
    !('syncedPlaylists' in value) ||
    !('queuedPlaylists' in value) ||
    !('cachedPlaylists' in value) ||
    !('deletedPlaylists' in value) ||
    !('convertedTracks' in value) ||
    !('currentPlaylist' in value) ||
    !('control' in value) ||
    !('lastSync' in value)
  ) {
    return false
  }
  const playlists = value.playlists
  const syncedPlaylists = value.syncedPlaylists
  const queuedPlaylists = value.queuedPlaylists
  const deletedPlaylists = value.deletedPlaylists
  const convertedTracks = value.convertedTracks
  const control = value.control
  return (
    typeof value.user === 'object' &&
    value.user !== null &&
    Array.isArray(playlists) &&
    playlists.every(
      (playlist) => typeof playlist === 'object' && playlist !== null
    ) &&
    Array.isArray(syncedPlaylists) &&
    syncedPlaylists.every((id) => typeof id === 'string') &&
    Array.isArray(queuedPlaylists) &&
    queuedPlaylists.every((id) => typeof id === 'string') &&
    Array.isArray(value.cachedPlaylists) &&
    Array.isArray(deletedPlaylists) &&
    deletedPlaylists.every(
      (playlist) => typeof playlist === 'object' && playlist !== null
    ) &&
    Array.isArray(convertedTracks) &&
    convertedTracks.every(
      (track) => typeof track === 'object' && track !== null
    ) &&
    (typeof value.currentPlaylist === 'string' ||
      value.currentPlaylist === null) &&
    typeof control === 'object' &&
    control !== null &&
    'total' in control &&
    'offset' in control &&
    typeof control.total === 'number' &&
    typeof control.offset === 'number' &&
    (typeof value.lastSync === 'string' ||
      typeof value.lastSync === 'number' ||
      value.lastSync === null)
  )
}

const PATHS = {
  userDataPath: APP_SUPPORT_PATH,
  get foldersJsonPath() {
    return PATH.join(this.userDataPath, '.songbasket-folders')
  },
  stateFileName: '/.songbasket'
}

const getEmptyFolders: () => Constants['APP_STATUS']['FOLDERS'] = () => ({
  paths: [],
  selected: null
})

setSessionFolderPaths(getEmptyFolders())

console.log('Folder Path: ', PATHS.foldersJsonPath)
const homeFolderPath = () => getHomeFolder()

class UserMethods {
  async getFolders(): Promise<SongbasketFoldersFile | null> {
    if (await utils.pathDoesExist(PATHS.foldersJsonPath)) {
      const parsedFolders: unknown = JSON.parse(
        await fs.readFile(PATHS.foldersJsonPath, 'utf8')
      )
      let folders: SongbasketFoldersFile
      if (isFoldersFile(parsedFolders)) folders = parsedFolders
      else folders = await this.resetFolderPaths()
      setSessionFolderPaths(folders)
      return folders
    }
    return null
  }

  isValidFolderStructure(paths: SongbasketFoldersFile): boolean {
    const them = Object.keys(paths)
    const def = Object.keys(getEmptyFolders())
    return them.length === def.length && them.every((key) => def.includes(key))
  }

  async setCurrentFolder(path: string | null): Promise<void> {
    if (!path) path = null
    getSessionFolderPaths().selected = path
    await this.writeHomeFolders()
  }

  async addFolder(path: string, params = { set: true }): Promise<void> {
    console.log('path', path)
    const folders = await this.getFolders()
    if (!folders) return
    if (!folders.paths.find((p) => p === path)) folders.paths.push(path)
    setSessionFolderPaths(folders)

    if (params.set) await this.setCurrentFolder(path)
    else this.writeHomeFolders()
  }

  async removeFolder(path: string): Promise<void> {
    const folders = await this.getFolders()
    if (!folders) return
    folders.paths = folders.paths.filter((p) => p !== path)
    if (path === folders.selected) folders.selected = null
    setSessionFolderPaths(folders)
    this.writeHomeFolders()
  }

  async unsetCurrentFolder(): Promise<void> {
    const folders = await this.getFolders()
    if (!folders) return
    folders.selected = null
    setSessionFolderPaths(folders)
    await this.writeHomeFolders()
  }

  async retrieveFolders(): Promise<SongbasketFoldersFile> {
    try {
      let folders = await this.getFolders()
      if (!folders) {
        console.log('Folder paths file missing, Creating')
        folders = await this.resetFolderPaths()
      }
      return folders
    } catch (error) {
      console.error(
        'ERROR WHEN FOLDER PATHS JSON FILE::: FileSystem/index.js',
        PATHS.foldersJsonPath,
        error
      )
      throw error
    }
  }

  async resetFolderPaths(): Promise<SongbasketFoldersFile> {
    const emptyFolders = getEmptyFolders()
    await this.writeHomeFolders(emptyFolders)
    return emptyFolders
  }

  async writeHomeFolders(
    folders: SongbasketFoldersFile = getSessionFolderPaths()
  ): Promise<void> {
    await fs.writeFile(PATHS.foldersJsonPath, JSON.stringify(folders), 'utf8')
    setSessionFolderPaths(folders)
  }

  async saveState(params: {
    state: SongBasketSaveFile
    path: string
  }): Promise<void> {
    const { state, path } = params
    // console.log('Saving state to', path)
    if (!(await utils.pathDoesExist(path))) {
      // TODO Handle non existing folder
    } else {
      const jsonState = JSON.stringify(state)
      await fs.writeFile(
        PATH.join(path, PATHS.stateFileName),
        jsonState,
        'utf8'
      )
    }
  }

  async retrieveState(path: string): Promise<SongBasketSaveFile> {
    const filePath = path + PATHS.stateFileName
    console.log('retrieving from ', path)
    await fs.access(filePath)
    const data = await fs.readFile(filePath, 'utf-8')
    try {
      const parsedState: unknown = JSON.parse(data)
      if (!isSongBasketSaveFile(parsedState)) {
        throw new Error('Invalid state file')
      }
      return parsedState
    } catch (error) {
      console.error(
        'ERROR WHEN PARSING STATE JSON FILE::: FileSystem/index.js',
        error
      )
      throw error
    }
  }

  async retrieveLocalTracks(
    plFilter: SpotifyPlaylistId[] = []
  ): Promise<Track[]> {
    const syncedPlaylists = customGetters
      .SyncedPlaylistsSp()
      .filter((pl) => plFilter.some((toExclude) => toExclude === pl.id))
      .map((pl) => ({
        id: pl.id,
        path: PATH.join(
          homeFolderPath(),
          utils.encodeIntoFilename(pl.folderName || pl.name)
        )
      }))

    const tracksByPlaylist = await Promise.all(
      syncedPlaylists.map(async (playlist) => {
        if (!(await this.checkPathThenCreate(playlist.path))) return []
        const filenames = (await fs.readdir(playlist.path)).filter((file) =>
          REGEX.mp3File.test(file)
        )
        return (
          await Promise.all(
            filenames.map(async (file) => {
              const filePath = PATH.join(playlist.path, file)
              const tags = await this.retrieveMP3FileTags(filePath)
              if (!tags.length) return null
              const track: Track = {
                playlist: playlist.id,
                path: filePath,
                file
              }
              tags.forEach((tag) => {
                track[tag.name] = tag.value
              })
              return track
            })
          )
        ).filter((track): track is Track => track !== null)
      })
    )
    return tracksByPlaylist.flat()
  }

  async deletePlaylist(playlistName: string): Promise<void> {
    const folderName = utils.encodeIntoFilename(playlistName)
    await fs.rm(PATH.join(homeFolderPath(), folderName), {
      recursive: true,
      force: true
    })
    console.log('Playlist ' + folderName + ' Deleted')
  }

  async renameFolder(params: { oldName: string; newName: string }) {
    let { oldName, newName } = params
    newName = utils.encodeIntoFilename(newName)
    oldName = utils.encodeIntoFilename(oldName)

    const base = homeFolderPath() + '/'
    const oldPath = PATH.join(base, oldName)
    const newPath = PATH.join(base, newName)
    if (!(await utils.pathDoesExist(oldPath))) return

    console.log('RENAMING FOLDER: ' + oldName + ' => ' + newName)
    await fs.rename(oldPath, newPath)
  }

  retrieveMP3FileTags(path: string): Promise<Tag[]> {
    const { promise, resolve, reject } = Promise.withResolvers<Tag[]>()

    fsCb.open(path, 'r', (openError, fd) => {
      if (openError) {
        reject(openError)
        return
      }

      fsCb.fstat(fd, (statError, stats) => {
        if (statError) {
          closeFile(fd, statError, [])
          return
        }

        const max = 1024
        let bufferSize = max
        if (stats.size < max) bufferSize = stats.size
        const buffer = Buffer.alloc(bufferSize)

        fsCb.read(fd, buffer, 0, bufferSize, 0, () => {
          const headerPointer = buffer.indexOf('TXXX')
          if (headerPointer === -1) {
            closeFile(fd, null, [])
            return
          }

          const tagsBuffer = Buffer.alloc(bufferSize - headerPointer)
          buffer.copy(tagsBuffer, 0, headerPointer)

          let fileContents = iconv
            .decode(tagsBuffer, 'ISO-8859-1')
            .replace(/\0/g, '')
          fileContents = fileContents.substring(
            fileContents.indexOf('songbasket')
          )
          let tagPosition = fileContents.indexOf('songbasket')
          const tags: Tag[] = []

          while (tagPosition !== -1) {
            const tagEnd = fileContents.substring(tagPosition).indexOf('ÿþ')
            const tagName = getTagName(fileContents.slice(tagPosition, tagEnd))

            fileContents = fileContents.substring(tagEnd + 2)

            let tagLength = 0
            if (tagName) tagLength = giveMeTagLength(tagName)
            const tagValue = fileContents.substring(0, tagLength)
            fileContents = fileContents.substring(
              fileContents.indexOf('songbasket')
            )

            if (tagName && tagValue)
              tags.push({ name: tagName, value: tagValue })
            tagPosition = fileContents.indexOf('songbasket')
          }

          closeFile(fd, null, tags)
        })
      })
    })

    return promise

    function getTagName(name: string): SongbasketCustomMp3Tag | null {
      switch (name) {
        case SongbasketCustomMp3Tag.songbasket_spotify_id:
          return SongbasketCustomMp3Tag.songbasket_spotify_id
        case SongbasketCustomMp3Tag.songbasket_youtube_id:
          return SongbasketCustomMp3Tag.songbasket_youtube_id
        default:
          return null
      }
    }

    function giveMeTagLength(name: SongbasketCustomMp3Tag): number {
      switch (name) {
        case SongbasketCustomMp3Tag.songbasket_spotify_id:
          return 22
        case SongbasketCustomMp3Tag.songbasket_youtube_id:
          return 11
      }
    }

    function closeFile(fd: number, error: Error | null, tags: Tag[]): void {
      fsCb.close(fd, () => {
        if (error) reject(error)
        else resolve(tags)
      })
    }
  }

  async setFolderIcons(
    plFilter?: SpotifyPlaylistId | SpotifyPlaylistId[],
    params = { force: false }
  ): Promise<void> {
    let playlistFilter: SpotifyPlaylistId[] = []
    if (typeof plFilter === 'string') playlistFilter = [plFilter]
    else if (Array.isArray(plFilter)) playlistFilter = plFilter

    const iconSetter = Helpers.getIconSetterHelper()
    const playlists = customGetters
      .SyncedPlaylistsSp_SAFE()
      .filter(
        (playlist) =>
          !playlistFilter.length || playlistFilter.includes(playlist.id)
      )
      .map(({ folderName, name, images }) => ({
        path: PATH.join(
          homeFolderPath(),
          utils.encodeIntoFilename(folderName || name)
        ).replace(/ /g, '\\ '),
        imageUrl: images?.[0]?.url
      }))
      .filter(
        (playlist): playlist is { path: string; imageUrl: string } =>
          typeof playlist.imageUrl === 'string'
      )

    await asyncForEachParallel(playlists, async (playlist) => {
      if (!params.force && (await iconSetter.test(playlist.path))) return
      try {
        await Helpers.plIconDownloader(playlist, iconSetter)?.exec()
      } catch (error) {
        console.error('Unable to set the folder icon for', playlist.path, error)
      }
    })
  }

  async checkPathThenCreate(path: string) {
    const pathExists = await utils.pathDoesExist(path)
    if (!pathExists) await fs.mkdir(path)
    return pathExists
  }
}

export default new UserMethods()
