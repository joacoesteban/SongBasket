import type { DeepReadonly } from 'vue'

import type { SpotifyPlaylist, SpotifyTrack } from '../../../@types/Spotify'
import type {
  SongBasketStateDto,
  SongBasketTrackDto,
  YouTubeResultDto
} from '../../../shared/ipc'

export type Playlist = DeepReadonly<SpotifyPlaylist>
export type Track = DeepReadonly<SongBasketTrackDto>
export type SpotifyTrackModel = DeepReadonly<SpotifyTrack>
export type TrackItem = Track | SpotifyTrackModel
export type YoutubeResult = DeepReadonly<YouTubeResultDto>

export type PlaylistStatus = {
  baseState: 'synced' | 'queued' | 'idle' | 'paused'
  color: string
  msg: string
  slug: string
}

export const playlistImage = (playlist: Playlist): string | undefined => {
  const image = playlist.images[0]
  if (image === undefined) return undefined
  return image.url
}

const spotifyTrack = (track: TrackItem): DeepReadonly<SpotifyTrack> => {
  if ('data' in track) return track.data
  return track
}

export const trackImage = (track: TrackItem): string | undefined => {
  const image = spotifyTrack(track).album.images[0]
  if (image === undefined) return undefined
  return image.url
}

export const artistsString = (track: TrackItem): string =>
  spotifyTrack(track)
    .artists.map((artist) => artist.name)
    .join(', ')

export const trackName = (track: TrackItem): string => spotifyTrack(track).name

export const formatMinutes = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.round(seconds % 60)
  const secondText = String(remaining).padStart(2, '0')
  return `${minutes}:${secondText}`
}

export const playlistStatus = (
  playlist: Playlist,
  state: DeepReadonly<SongBasketStateDto>
): PlaylistStatus => {
  const isSynced = state.syncedPlaylists.includes(playlist.id)
  if (isSynced) {
    if (playlist.isPaused === true) {
      return {
        baseState: 'paused',
        color: 'var(--global-grey)',
        msg: 'Paused',
        slug: 'paused'
      }
    }
    return {
      baseState: 'synced',
      color: 'var(--green-accept)',
      msg: 'Synced',
      slug: 'synced'
    }
  }
  if (state.queuedPlaylists.includes(playlist.id)) {
    return {
      baseState: 'queued',
      color: 'var(--orange-warning)',
      msg: 'Queued',
      slug: 'awaiting-sync'
    }
  }
  return {
    baseState: 'idle',
    color: 'var(--button-purple)',
    msg: 'Not synced',
    slug: 'not-synced'
  }
}

export const playlistTracks = (
  playlist: Playlist
): readonly DeepReadonly<SpotifyTrack>[] => playlist.tracks.items

export const trackMatches = (track: Track, query: string): boolean => {
  const lowered = query.toLowerCase()
  if (track.data.name.toLowerCase().includes(lowered)) return true
  return track.data.artists.some((artist) =>
    artist.name.toLowerCase().includes(lowered)
  )
}

export const youtubeTitle = (item: YoutubeResult): string => {
  if (item.isCustomTrack === true) return item.snippet.title
  return item.nameFormatted
}

export const youtubeImage = (item: YoutubeResult): string => {
  const image = item.snippet.thumbnails['high']
  if (image === undefined) return ''
  return image.url
}

export const youtubeCreator = (item: YoutubeResult): string =>
  item.snippet.channelTitle

export const youtubeSelectionId = (item: YoutubeResult): string =>
  item.youtube_id

export const trackSelectionId = (track: Track | null): string | null => {
  if (track === null) return null
  if (track.selection === null || track.selection === false) return null
  return track.selection
}
