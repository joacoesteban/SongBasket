import { SongBasketTrack, SongBasketTrackQuery } from '../@types/SongBasket'
import { SpotifyPlaylist } from '../@types/Spotify'
import customGetters from './Store/Helpers/customGetters'

type PlaylistWithSyncState = SpotifyPlaylist & { synced: boolean }
let ALL_PLAYLISTS: PlaylistWithSyncState[] = []
let ALL_TRACKS: SongBasketTrack[] = []

export function makeConversionQueries(): SongBasketTrack[] {
  const syncedPlaylists: PlaylistWithSyncState[] = customGetters
    .SyncedPlaylistsSp()
    .map((playlist) => {
      if (playlist.isPaused) return null
      return {
        ...playlist,
        synced: true
      }
    })
    .filter((playlist): playlist is PlaylistWithSyncState => playlist !== null)
  const queuedPlaylists: PlaylistWithSyncState[] = customGetters
    .queuedPlaylistsObj()
    .map((playlist) => ({
      ...playlist,
      synced: false
    }))
  if (!(queuedPlaylists.length + syncedPlaylists.length)) return []

  ALL_PLAYLISTS = [...syncedPlaylists, ...queuedPlaylists]
  ALL_TRACKS = customGetters.convertedTracks()
  if (
    !findDuplicatedTracks() &&
    !ALL_TRACKS.some((track) => track.flags.conversionError)
  )
    throw new Error('NOTHING') // TODO replace error throw with something else

  makeQueries()

  return ALL_TRACKS
}

function findDuplicatedTracks(): boolean {
  const playlistsToFetch: {
    id: string
    tracks: SpotifyPlaylist['tracks']['items']
  }[] = []
  for (let i = 0; i < ALL_PLAYLISTS.length; i++) {
    const playlist = ALL_PLAYLISTS[i]
    if (!playlist) continue
    let tracks = playlist.tracks.items
    if (playlist.synced) tracks = playlist.tracks.added
    if (tracks.length === 0) {
      ALL_PLAYLISTS.splice(i, 1)
      i -= 1
      continue
    }
    playlistsToFetch.push({ id: playlist.id, tracks })
  }
  if (playlistsToFetch.length === 0) return false

  for (const playlist of playlistsToFetch) {
    for (const dirtyTrack of playlist.tracks) {
      let found: number | undefined
      for (let i = 0; i < ALL_TRACKS.length; i++) {
        const cleanTrack = ALL_TRACKS[i]
        if (!cleanTrack) continue
        if (dirtyTrack.id === cleanTrack.id) {
          found = i
          break
        }
      }

      const playlistTrack = { id: playlist.id }
      if (found !== undefined) {
        const existingTrack = ALL_TRACKS[found]
        if (!existingTrack) continue
        if (!existingTrack.playlists.some(({ id }) => id === playlistTrack.id))
          existingTrack.playlists.push(playlistTrack)
        continue
      }

      ALL_TRACKS.push({
        id: dirtyTrack.id,
        data: dirtyTrack,
        playlists: [playlistTrack],
        conversion: null,
        selection: null,
        custom: null,
        query: null,
        flags: {
          converted: false,
          conversionError: false,
          processed: false,
          paused: false,
          selectionIsApplied: false
        },
        duration: null
      })
    }
  }
  return true
}

function makeQueries(): void {
  for (let i = 0; i < ALL_TRACKS.length; i++) {
    const songTrack = ALL_TRACKS[i]
    if (!songTrack || songTrack.query) continue
    const artist = songTrack.data.artists[0]
    if (!artist) continue

    const query = `${songTrack.data.name} ${artist.name}`
    const durationInMinutes = songTrack.data.duration_ms / 1000 / 60
    let duration: SongBasketTrackQuery['duration'] = 'short'
    if (durationInMinutes > 20) duration = 'long'
    if (durationInMinutes <= 20 && durationInMinutes >= 4) duration = 'medium'

    songTrack.query = {
      query,
      duration,
      duration_s: songTrack.data.duration_ms / 1000,
      id: songTrack.data.id
    }
  }
}
