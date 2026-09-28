import { randomUUID as uuid } from 'crypto'
import * as PATH from 'path'

import {
  SongBasketTrack,
  SongBasketTrackFile
} from '../../../@types/SongBasket'
import { SpotifyPlaylistId } from '../../../@types/Spotify'
import * as utils from '../../../MAIN_PROCESS_UTILS'
import { asyncFilter, asyncForEachParallel } from '../../../UTILS'
import { getHomeFolder } from '../../Global/state'
import customGetters from '../../Store/Helpers/customGetters'

type LocalTrack = SongBasketTrackFile & { dontUnlink?: boolean }

export type QueryTrack = SongBasketTrack & {
  downloadFlags: {
    download: boolean
    path?: string
    file?: string
    linkData?: {
      path: string
      file: string
    }
  }
}

export async function downloadLinkRemove(
  localTracks: SongBasketTrackFile[],
  queryTracks: SongBasketTrack[],
  plFilter: SpotifyPlaylistId[] = []
): Promise<QueryTrack[]> {
  return VTWO(localTracks, queryTracks, plFilter)
}

export async function unlink(path: string) {
  if (await utils.pathDoesExist(path)) await utils.unlink(path)
}
export async function link(path: string, newPath: string) {
  console.log('linking ', path, newPath)
  if (!(await utils.pathDoesExist(path))) throw new Error()
  if (await utils.pathDoesExist(newPath)) return false
  await utils.link(path, newPath)
  return true
}

async function VTWO(
  sourceLocalTracks: SongBasketTrackFile[],
  sourceQueryTracks: SongBasketTrack[] = [],
  plFilter: SpotifyPlaylistId[] = []
): Promise<QueryTrack[]> {
  const pausedPlaylists = customGetters.pausedPlaylists
  const dontUnlinkFrom = [...plFilter, ...pausedPlaylists]

  const localTracks: LocalTrack[] = sourceLocalTracks.map((track) => ({
    ...track
  }))
  if (plFilter.length) {
    localTracks.forEach((lTrack) => {
      lTrack.dontUnlink = !dontUnlinkFrom.includes(lTrack.playlist)
    })
  }

  let queryTracks: QueryTrack[] = []
  for (const sourceTrack of sourceQueryTracks) {
    const conversion = sourceTrack.conversion
    if (!conversion) continue

    let selection = sourceTrack.selection
    if (selection === null) selection = conversion.bestMatch
    if (selection === false) selection = sourceTrack.custom?.youtube_id ?? false
    const qTrack: QueryTrack = {
      ...sourceTrack,
      playlists: [...sourceTrack.playlists],
      selection,
      downloadFlags: {
        download: !(
          sourceTrack.flags.paused ||
          sourceTrack.playlists.every(({ id }) => pausedPlaylists.includes(id))
        )
      }
    }

    const isStored = localTracks.some((lTrack, index) => {
      if (
        lTrack.songbasket_spotify_id !== qTrack.id ||
        lTrack.songbasket_youtube_id !== qTrack.selection
      )
        return false

      qTrack.downloadFlags.download = false
      if (!qTrack.downloadFlags.linkData) {
        qTrack.downloadFlags.linkData = {
          path: lTrack.path,
          file: lTrack.file
        }
      }

      if (qTrack.playlists.some((pl) => pl.id === lTrack.playlist)) {
        lTrack.dontUnlink = true
        qTrack.playlists = qTrack.playlists.filter(
          (pl) => pl.id !== lTrack.playlist
        )
      }

      if (!qTrack.playlists.length) {
        localTracks.splice(index, 1)
        return true
      }
      return false
    })

    if (!isStored || qTrack.downloadFlags.download) queryTracks.push(qTrack)
  }

  console.log(
    'to download',
    queryTracks.filter((t) => t.downloadFlags.download).map((t) => t.data.name)
  )
  console.log(
    'to link',
    queryTracks
      .filter((t) => {
        if (t.downloadFlags.download) return false
        return t.downloadFlags.linkData !== undefined
      })
      .map((t) => t.data.name)
  )
  console.log(
    'to unlink',
    localTracks.filter((t) => !t.dontUnlink).map((t) => t.path)
  )

  queryTracks = await asyncFilter(queryTracks, async (qTrack) => {
    if (qTrack.downloadFlags.download) return true
    if (qTrack.downloadFlags.linkData) await linkTrackToPlaylists(qTrack)
    return false
  })

  localTracks.forEach(async (lTrack) => {
    // TODO make async with Promise.all
    if (!lTrack.dontUnlink) await unlink(lTrack.path)
  })

  return queryTracks
}

const linkTrackToPlaylists = async (track: QueryTrack) => {
  const linkData = track.downloadFlags.linkData
  if (!linkData) return

  await asyncForEachParallel(track.playlists, async (pl) => {
    let plPath = customGetters.giveMePlFolderName(pl.id)
    console.log(plPath)
    if (!plPath) return
    plPath = PATH.join(getHomeFolder(), utils.encodeIntoFilename(plPath))
    const fileName = linkData.file.replace('.mp3', '')
    let didLink = false

    for (let i = 0; !didLink && i < 10; i++) {
      let suffix = ''
      if (i > 0) suffix = ' - ' + uuid()
      if (i > 1) suffix += ' - ' + i
      try {
        didLink = await link(
          linkData.path,
          PATH.join(plPath, fileName + suffix + '.mp3')
        )
        if (didLink) return
      } catch (error) {
        console.error(error || "TRACK TO LINK DOESN'T EXIST")
        return
      }
    }
    throw new Error('COULD NOT LINK TRACK')
  })
}
