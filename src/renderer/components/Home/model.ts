import type { DeepReadonly } from 'vue'

import type { SpotifyPlaylist, SpotifyTrack } from '../../../@types/Spotify'
import type { SongBasketTrackDto, YouTubeResultDto } from '../../../shared/ipc'

export type Playlist = DeepReadonly<SpotifyPlaylist>
export type Track = DeepReadonly<SongBasketTrackDto>
export type SpotifyTrackModel = DeepReadonly<SpotifyTrack>
export type TrackItem = Track | SpotifyTrackModel
export type YoutubeResult = DeepReadonly<YouTubeResultDto>

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
  const totalSeconds = Math.floor(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remaining = totalSeconds % 60
  const minuteText = String(minutes).padStart(2, '0')
  const secondText = String(remaining).padStart(2, '0')
  return `${minuteText}:${secondText}`
}

export const playlistTracks = (
  playlist: Playlist
): readonly DeepReadonly<SpotifyTrack>[] => playlist.tracks.items

export const trackMatches = (track: TrackItem, query: string): boolean => {
  const lowered = query.toLowerCase()
  const item = spotifyTrack(track)
  if (item.name.toLowerCase().includes(lowered)) return true
  return item.artists.some((artist) =>
    artist.name.toLowerCase().includes(lowered)
  )
}

export const playlistMatches = (playlist: Playlist, query: string): boolean =>
  playlist.name.toLowerCase().includes(query.toLowerCase())

export const trackPlaylistNames = (
  track: Track,
  playlists: readonly Playlist[]
): string =>
  track.playlists
    .map(({ id }) => playlists.find((playlist) => playlist.id === id)?.name)
    .filter((name): name is string => name !== undefined)
    .join(', ')

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
