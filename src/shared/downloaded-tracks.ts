import type { DownloadedFileDto, TrackListDto } from './ipc'

type ReadonlyTrackListDto = {
  readonly [spotifyId: string]: {
    readonly [youtubeId: string]: { readonly playlists: readonly string[] }
  }
}

const taggedFileIds = (
  file: DownloadedFileDto
): { spotifyId: string; youtubeId: string } | null => {
  if (file.spotify_id === null || file.youtube_id === null) return null
  return { spotifyId: file.spotify_id, youtubeId: file.youtube_id }
}

export const withDownloadedFile = (
  tracks: TrackListDto,
  file: DownloadedFileDto
): TrackListDto => {
  const ids = taggedFileIds(file)
  if (ids === null) return tracks

  const spotifyTracks = tracks[ids.spotifyId]
  const youtubeTrack = spotifyTracks?.[ids.youtubeId]
  const playlists = youtubeTrack?.playlists ?? []
  if (playlists.includes(file.playlist)) return tracks

  return {
    ...tracks,
    [ids.spotifyId]: {
      ...spotifyTracks,
      [ids.youtubeId]: { playlists: [...playlists, file.playlist] }
    }
  }
}

export const withoutDownloadedFile = (
  tracks: TrackListDto,
  file: DownloadedFileDto
): TrackListDto => {
  const ids = taggedFileIds(file)
  if (ids === null) return tracks

  const spotifyTracks = tracks[ids.spotifyId]
  const youtubeTrack = spotifyTracks?.[ids.youtubeId]
  if (spotifyTracks === undefined || youtubeTrack === undefined) return tracks

  const playlists = youtubeTrack.playlists.filter(
    (playlist) => playlist !== file.playlist
  )
  if (playlists.length === youtubeTrack.playlists.length) return tracks

  const updatedYoutubeTracks = { ...spotifyTracks }
  if (playlists.length === 0) {
    delete updatedYoutubeTracks[ids.youtubeId]
  } else {
    updatedYoutubeTracks[ids.youtubeId] = { playlists }
  }

  if (Object.keys(updatedYoutubeTracks).length === 0) {
    const updatedTracks = { ...tracks }
    delete updatedTracks[ids.spotifyId]
    return updatedTracks
  }

  return { ...tracks, [ids.spotifyId]: updatedYoutubeTracks }
}

export const isDownloaded = (
  tracks: ReadonlyTrackListDto | null,
  spotifyId: string,
  youtubeId: string
): boolean => {
  if (tracks === null) return false
  const spotifyTracks = tracks[spotifyId]
  if (spotifyTracks === undefined) return false
  return spotifyTracks[youtubeId] !== undefined
}
