import type { SpotifyPlaylistId, SpotifyTrackId } from '../@types/Spotify'
import type { YouTubeResultId } from '../@types/YouTube'

export type SongBasketTrackConversionSelection = null | false | YouTubeResultId

export type SongBasketTrackQuery = {
  query: string
  duration: 'long' | 'medium' | 'short'
  duration_s: number
  id: SpotifyTrackId
}

export type { SpotifyPlaylistId, SpotifyTrackId, YouTubeResultId }
