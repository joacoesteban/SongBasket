import { SongBasketSaveFile, SongBasketTrack } from '../../../@types/SongBasket'
import {
  SpotifyPlaylist,
  SpotifyPlaylistId,
  SpotifySnapshotId
} from '../../../@types/Spotify'
import { cloneObject } from '../../../MAIN_PROCESS_UTILS'
import MAIN_STORE from '../mainProcessStore'

const store = {
  get state() {
    return MAIN_STORE.STATE()
  },
  get safe(): SongBasketSaveFile {
    return cloneObject(MAIN_STORE.STATE())
  }
}
class CustomGetters {
  // Gives spotify object
  get playlistsOffset(): number {
    return store.state.playlists.filter(
      (pl) => !store.state.syncedPlaylists.some((id) => id === pl.id)
    ).length
  }

  playlistById(id: SpotifyPlaylistId): SpotifyPlaylist | null {
    return store.safe.playlists.find((pl) => pl.id === id) || null
  }

  SyncedPlaylistsSp(): SpotifyPlaylist[] {
    const all: SpotifyPlaylist[] = []
    for (const syncPl of store.state.syncedPlaylists) {
      const playlist = store.state.playlists.find((pl) => pl.id === syncPl)
      if (playlist) all.push(playlist)
    }
    return all
  }

  SyncedPlaylistsSp_SAFE(): SpotifyPlaylist[] {
    return this.SyncedPlaylistsSp().filter((pl) => !pl.isPaused)
  }

  get pausedPlaylists(): SpotifyPlaylistId[] {
    return store.state.syncedPlaylists.filter((id) => {
      const playlist = this.playlistById(id)
      return playlist !== null && playlist.isPaused === true
    })
  }

  syncedPlaylistsSnapshots(): {
    id: SpotifyPlaylistId
    snapshot_id: SpotifySnapshotId | undefined
  }[] {
    const snapshotIdsList: {
      id: SpotifyPlaylistId
      snapshot_id: SpotifySnapshotId | undefined
    }[] = []

    for (const playlistId of store.state.syncedPlaylists) {
      const playlist = store.state.playlists.find((pl) => pl.id === playlistId)
      if (!playlist || playlist.isPaused) continue
      snapshotIdsList.push({
        id: playlist.id,
        snapshot_id: playlist.snapshot_id
      })
    }

    return snapshotIdsList
  }

  giveMePlFolderName(id: SpotifyPlaylistId): string | null {
    const playlist = store.state.playlists.find((pl) => pl.id === id)
    if (!playlist) return null
    return playlist.folderName || playlist.name
  }

  currentUserId(): string {
    return store.state.user.id
  }

  uncachedPlaylists(): SpotifyPlaylistId[] {
    return store.state.queuedPlaylists.filter(
      (id) => !store.state.cachedPlaylists.some((c) => c.id === id)
    )
  }

  convertedTracks(): SongBasketTrack[] {
    return store.safe.convertedTracks
  }

  convertedTracks_SAFE(): SongBasketTrack[] {
    return this.convertedTracks().filter((track) => {
      if (track.flags.conversionError) return false
      if (!track.conversion?.yt.length && !track.custom) return false
      return track.playlists.length > 0
    })
  }

  anythingToConvert(): void {}

  queuedPlaylistsObj(): SpotifyPlaylist[] {
    const playlists: SpotifyPlaylist[] = []
    for (const id of store.state.queuedPlaylists) {
      const playlist = store.state.playlists.find((pl) => pl.id === id)
      if (playlist) playlists.push(playlist)
    }
    return playlists
  }
}

export default new CustomGetters()
