import * as PATH from 'path'

import type { SongBasketTrackFile } from '../../../@types/SongBasket'
import type { SpotifyPlaylistId, SpotifyTrack } from '../../../@types/Spotify'
import * as utils from '../../../MAIN_PROCESS_UTILS'
import type {
  AppErrorDto,
  DownloadStartItem,
  DownloadEvent as RendererDownloadEvent
} from '../../../shared/ipc'
import { APP_SUPPORT_PATH } from '../../Global/constants'
import { getConnectedToInternet, getHomeFolder } from '../../Global/state'
import customGetters from '../../Store/Helpers/customGetters'
import { ytDlp } from '../../utils/binaries'
import { ipcSend } from '../InitializationAndHandlers/ipc.controller'
import { applyTags, extractMp3 } from './FfmpegController'
import { QueryTrack, downloadLinkRemove } from './StoredTracksChecker'
import { downloadAudio } from './yt-dlp'

export enum DownloadStatus {
  Awaiting = 'awaiting',
  Downloading = 'downloading',
  DownloadError = 'download_error',
  DownloadEnd = 'download_end',
  Extracting = 'extracting',
  ExtractionError = 'extraction_error',
  ExtractionEnd = 'extraction_end',
  Tags = 'tags',
  TagsError = 'tags_error',
  TagsEnd = 'tags_end'
}

enum LifeCycle {
  Start = 'start',
  Progress = 'progress',
  Error = 'error',
  End = 'end'
}

type DownloadEvent = {
  type: LifeCycle
  id: string
  ptg?: number
}

type DownloaderInstance = {
  info: {
    size: number
    currentSize: number
  }
  downloadVideo: () => Promise<void>
}

type ExtractorInstance = {
  converter: {
    convert: () => Promise<void>
    move: () => Promise<void>
  }
}

type DownloadInstance = {
  id: string
  info: {
    download: {
      ptg: number
      finished: boolean
      error: Error | null
      size: number
      currentSize: number
    }
    extraction: {
      ptg: number
      finished: boolean
      error: Error | null
    }
    tags: {
      finished: boolean
      error: Error | null
    }
    currentStatus: DownloadStatus
    ptg: number
    finished: boolean
  }
  yt: string
  data: SpotifyTrack
  playlists: {
    id: SpotifyPlaylistId
    folderName: string | null
  }[]
  paths: {
    downloadCWD: string
    mp4FilePath: string
    mp3FilePath: string
    mp3FilePathFinal: string
    mp3FilePathFinalAlt: string
    fileName: string
    fileNameAlt: string
  }
  controller: {
    constructDownload: () => void
    constructExtraction: () => void
    execute: () => Promise<void>
  }
  download: DownloaderInstance | null
  extraction: ExtractorInstance | null
}
function toError(value: unknown): Error {
  if (value instanceof Error) return value
  return new Error(String(value))
}

function selectedYoutubeId(track: QueryTrack): string {
  switch (track.selection) {
    case null:
      if (!track.conversion) throw new Error('NO TRACK CONVERSION')
      return track.conversion.bestMatch
    case false:
      if (!track.custom) throw new Error('NO CUSTOM TRACK')
      return track.custom.id
    default:
      return track.selection
  }
}

const tempDownloadsFolderPath = () =>
  PATH.join(APP_SUPPORT_PATH, 'temp', 'downloads')

let lastEvent: RendererDownloadEvent | null = null
type EventGroup = 'download' | 'extraction' | 'tags'
const eventTypes = {
  download: {
    start: 'download:start',
    progress: 'download:progress',
    error: 'download:error',
    end: 'download:end'
  },
  extraction: {
    start: 'extraction:start',
    progress: 'extraction:progress',
    error: 'extraction:error',
    end: 'extraction:end'
  },
  tags: {
    start: 'tags:start',
    progress: 'tags:progress',
    error: 'tags:error',
    end: 'tags:end'
  }
} satisfies Record<EventGroup, Record<LifeCycle, RendererDownloadEvent['type']>>

const serializeError = (error: Error | null): AppErrorDto | null => {
  if (error === null) return null
  const result: AppErrorDto = {
    name: error.name,
    message: error.message
  }
  if (error.stack) result.stack = error.stack
  return result
}

const emitEvent = {
  send: ipcSend,
  timeoutInProgress: false,
  makeTimeout: (params: DownloadEvent, key: EventGroup) => {
    lastEvent = {
      ...params,
      type: eventTypes[key][params.type]
    }

    if (emitEvent.timeoutInProgress) return
    emitEvent.timeoutInProgress = true
    setTimeout(() => {
      const event = lastEvent
      if (event !== null) emitEvent.send('DOWNLOAD:EVENT', event)
      emitEvent.timeoutInProgress = false
    }, 300)
  },
  downloadStarted: (tracks: DownloadInstance[]) => {
    const items: DownloadStartItem[] = tracks.map(({ id, info }) => ({
      id,
      info: {
        ...info,
        download: {
          ...info.download,
          error: serializeError(info.download.error)
        },
        extraction: {
          ...info.extraction,
          error: serializeError(info.extraction.error)
        },
        tags: {
          ...info.tags,
          error: serializeError(info.tags.error)
        }
      }
    }))
    emitEvent.send('DOWNLOAD:START', items)
  },
  downloadFinished: () => {
    emitEvent.send('DOWNLOAD:END')
  },
  download: (params: DownloadEvent) => {
    emitEvent.makeTimeout(params, 'download')
  },
  extraction: (params: DownloadEvent) => {
    emitEvent.makeTimeout(params, 'extraction')
  },
  tags: (params: DownloadEvent) => {
    emitEvent.makeTimeout(params, 'tags')
  }
}

let ALL_TRACKS: DownloadInstance[] = []
export default {
  async onDowloadStart() {
    console.log('--------------DOWNLOAD STARTED--------------')
    if (ALL_TRACKS.length) emitEvent.downloadStarted(ALL_TRACKS)
  },
  async downloadSyncedPlaylists(
    localTracks: SongBasketTrackFile[],
    plFilter: SpotifyPlaylistId[]
  ) {
    console.log('Stored tracks: ', localTracks.length)
    let tracksToDownload = customGetters.convertedTracks_SAFE()
    if (plFilter)
      tracksToDownload = tracksToDownload.filter((t) =>
        t.playlists.some((pl) => plFilter.includes(pl.id))
      )
    ALL_TRACKS = constructDownloads(
      await downloadLinkRemove(
        localTracks,
        utils.cloneObject(tracksToDownload),
        plFilter
      )
    )
    this.onDowloadStart()

    let hasErrors = false
    for (const track of ALL_TRACKS) {
      try {
        await track.controller.execute()
      } catch {
        if (getConnectedToInternet()) {
          await ytDlp.flushCache()
          continue
        } else {
          hasErrors = true
          break
        }
      }
    }

    if (hasErrors) console.error('ERRORS DURING DOWNLOAD')
    else console.log('ALL TRACKS DOWNLOADED')
    emitEvent.downloadFinished()
    ALL_TRACKS = []
  }
}

function constructDownloads(tracks: QueryTrack[]) {
  const exec = () => tracks.map(generateDownloadObject)

  // CONSTRUCTOR FUNCTIONS
  const generateDownloadObject = (track: QueryTrack): DownloadInstance => {
    const { id, playlists, data } = track
    const instance: DownloadInstance = {
      id,
      info: {
        download: {
          ptg: 0,
          finished: false,
          error: null,
          size: 0,
          currentSize: 0
        },
        extraction: {
          ptg: 0,
          finished: false,
          error: null
        },
        tags: {
          finished: false,
          error: null
        },
        currentStatus: DownloadStatus.Awaiting,
        ptg: 0,
        finished: false
      },
      yt: selectedYoutubeId(track),
      data,
      playlists: playlists.map(({ id }) => ({
        id,
        folderName: customGetters.giveMePlFolderName(id)
      })),
      paths: {
        downloadCWD: '',
        mp4FilePath: '',
        mp3FilePath: '',
        mp3FilePathFinal: '',
        mp3FilePathFinalAlt: '',
        fileName: '',
        fileNameAlt: ''
      },
      controller: {
        constructDownload: () => constructVideoDownload(instance),
        constructExtraction: () => constructVideoExtraction(instance),
        execute: async () => executeDownload(instance)
      },
      download: null,
      extraction: null
    }

    const paths = instance.paths
    const fileName = (paths.fileName = utils.encodeIntoFilename(data.name))
    const fileNameAlt = (paths.fileNameAlt = `${fileName} - ${id}`)
    const firstPlaylist = instance.playlists[0]
    if (!firstPlaylist) throw new Error('NO PLAYLIST')
    paths.downloadCWD = PATH.join(tempDownloadsFolderPath(), firstPlaylist.id)
    paths.mp4FilePath = PATH.join(
      paths.downloadCWD,
      id + '.songbasket_preprocessed_file'
    )
    paths.mp3FilePath = PATH.join(paths.downloadCWD, id + '.mp3')
    if (firstPlaylist.folderName) {
      paths.mp3FilePathFinal = PATH.join(
        getHomeFolder(),
        utils.encodeIntoFilename(firstPlaylist.folderName),
        fileName + '.mp3'
      )
      paths.mp3FilePathFinalAlt = PATH.join(
        getHomeFolder(),
        utils.encodeIntoFilename(firstPlaylist.folderName),
        fileNameAlt + '.mp3'
      )
    }

    return instance
  }

  const constructVideoDownload = (instance: DownloadInstance) => {
    instance.download = {
      info: {
        size: 0,
        currentSize: 0
      },
      downloadVideo: async () => {
        if (!instance.yt) throw new Error('NO TRACK SELECTION')
        console.log('about to download', instance.yt)

        try {
          await downloadAudio(instance.yt, instance.paths.mp4FilePath, {
            onStart: ({ totalBytes }) => {
              instance.info.download.size = totalBytes ?? 0
              instance.info.currentStatus = DownloadStatus.Downloading
              emitEvent.download({ type: LifeCycle.Start, id: instance.id })
            },
            onProgress: ({ downloadedBytes, totalBytes }) => {
              instance.info.download.currentSize = downloadedBytes
              const size = totalBytes ?? instance.info.download.size
              if (!size) return

              const ptg = Math.round((downloadedBytes / size) * 100)
              instance.info.ptg = instance.info.download.ptg = ptg
              emitEvent.download({
                type: LifeCycle.Progress,
                id: instance.id,
                ptg
              })
            }
          })
        } catch (error) {
          console.error('Error when downloading video::::', error)
          instance.info.download.error = toError(error)
          instance.info.currentStatus = DownloadStatus.DownloadError
          emitEvent.download({ type: LifeCycle.Error, id: instance.id })
          throw error
        }

        instance.info.download.finished = true
        instance.info.download.ptg = 100
        instance.info.currentStatus = DownloadStatus.DownloadEnd
        console.log('video downloaded')
        emitEvent.download({ type: LifeCycle.End, id: instance.id })
      }
    }
  }

  const constructVideoExtraction = (instance: DownloadInstance) => {
    instance.extraction = {
      converter: {
        convert: async () => {
          try {
            instance.info.currentStatus = DownloadStatus.Extracting
            emitEvent.extraction({ type: LifeCycle.Start, id: instance.id })
            instance.info.ptg = 0
            await extractMp3(
              instance.paths.mp3FilePath,
              instance.paths.mp4FilePath,
              (progress) => {
                const ptg = Math.round(progress.percent ?? 0)
                instance.info.ptg = instance.info.extraction.ptg = ptg
                emitEvent.extraction({
                  type: LifeCycle.Progress,
                  id: instance.id,
                  ptg
                })
              }
            )
          } catch (err) {
            instance.info.extraction.error = toError(err)
            instance.info.currentStatus = DownloadStatus.ExtractionError
            emitEvent.extraction({ type: LifeCycle.Error, id: instance.id })
            throw err
          } finally {
            instance.info.extraction.finished = true
            if (!instance.info.extraction.error) {
              instance.info.extraction.ptg = 100
              instance.info.currentStatus = DownloadStatus.ExtractionEnd
            }
            emitEvent.extraction({ type: LifeCycle.End, id: instance.id })
          }

          try {
            instance.info.currentStatus = DownloadStatus.Tags
            emitEvent.tags({ type: LifeCycle.Start, id: instance.id })
            await applyTags(
              instance.paths.mp3FilePath,
              instance.data,
              instance.yt
            )
            console.log('finished tags')
            emitEvent.tags({ type: LifeCycle.End, id: instance.id })
          } catch (err) {
            instance.info.tags.error = toError(err)
            instance.info.currentStatus = DownloadStatus.TagsError
            emitEvent.tags({ type: LifeCycle.Error, id: instance.id })
            throw err
          } finally {
            if (!instance.info.tags.error)
              instance.info.currentStatus = DownloadStatus.TagsEnd
            instance.info.tags.finished = true
            instance.info.finished = true
          }
        },
        move: async () => {
          let moveFunction = utils.copyNRemove
          if (await utils.pathDoesExist(instance.paths.mp3FilePathFinal))
            instance.paths.mp3FilePathFinal = instance.paths.mp3FilePathFinalAlt
          if (
            utils.isSameDisk(
              instance.paths.mp3FilePath,
              instance.paths.mp3FilePathFinal
            )
          )
            moveFunction = utils.linkNRemove

          await moveFunction(
            instance.paths.mp3FilePath,
            instance.paths.mp3FilePathFinal
          )
        }
      }
    }
  }

  const executeDownload = async (instance: DownloadInstance) => {
    if (!instance.download) throw new Error('NO DOWNLOADER')
    if (!instance.extraction) throw new Error('NO EXTRACTOR')

    instance.controller.constructDownload()
    instance.controller.constructExtraction()

    try {
      await utils.createDirRecursive(instance.paths.downloadCWD)
    } catch (err) {
      console.error('ERROR CREATING TEMP DOWNLOAD PATH')
      throw err
    }

    try {
      await instance.download.downloadVideo()
    } catch (err) {
      console.error('ERROR DOWNLOADING VIDEO', err)
      throw err
    }

    try {
      await instance.extraction.converter.convert()
      console.log('finished extraction')
    } catch (error) {
      console.error('ERROR EXTRACTING AUDIO')
      throw error
    }

    try {
      await instance.extraction.converter.move()
      console.log('track moved')
    } catch (error) {
      console.error('ERROR MOVING TRACK')
      throw error
    }

    if (instance.playlists.length === 1) return

    instance.playlists.forEach(async (pl) => {
      // TODO: make this async
      if (!pl.folderName) throw new Error('NO FOLDER NAME')
      const folderPath = PATH.join(getHomeFolder(), pl.folderName)

      let fullPath = PATH.join(folderPath, instance.paths.fileName + '.mp3')
      if (await utils.pathDoesExist(fullPath))
        fullPath = PATH.join(folderPath, instance.paths.fileNameAlt + '.mp3')
      try {
        await utils.link(instance.paths.mp3FilePathFinal, fullPath)
      } catch (err) {
        console.error('ERROR LINKING TRACK TO OTHER PLAYLISTS')
        throw err
      }
    })
  }

  return exec()
}
