import type { SpotifyPlaylistId, SpotifyTrackId } from '../../../@types/Spotify'
import type { YouTubeResultId } from '../../../@types/YouTube'
import * as handlers from './handlers'
import { registerInvokeHandler } from './ipc.controller'
import WindowController from './window.controller'

export default function registerIpcRoutes(): void {
  registerInvokeHandler('GET_STATUS', handlers.sendStatus)

  registerInvokeHandler('WINDOW:LOCK', () => WindowController.lockWindow())
  registerInvokeHandler('WINDOW:UNLOCK', () => WindowController.unlockWindow())
  registerInvokeHandler('WINDOW:MINIMIZE', () => WindowController.minimize())
  registerInvokeHandler('WINDOW:TOGGLE_MAXIMIZE', () =>
    WindowController.toggleMaximize()
  )
  registerInvokeHandler('WINDOW:CLOSE', () => WindowController.close())

  registerInvokeHandler('YOUTUBE_DETAILS:GET', handlers.getYtTrackDetails)

  registerInvokeHandler('DOWNLOAD', handlers.download)

  registerInvokeHandler('VIDEO:OPEN', handlers.openYtVideo)
  registerInvokeHandler('VIDEO:SEARCH', handlers.searchYtVideo)

  registerInvokeHandler('HOME_FOLDERS:ASK', handlers.askHomeFolder)
  registerInvokeHandler('HOME_FOLDER:SET', handlers.setHomeFolder)
  registerInvokeHandler('HOME_FOLDER:OPEN', handlers.openHomeFolder)

  registerInvokeHandler('LOGIN', handlers.login)
  registerInvokeHandler('LOGOUT', handlers.logout)
  registerInvokeHandler('REFRESH', handlers.refresh)
  registerInvokeHandler('PLAYLISTS:LOAD_MORE', handlers.loadMorePlaylists)
  registerInvokeHandler('YOUTUBE:CONVERT', handlers.youtubize)

  registerInvokeHandler('PLAYLISTS:QUEUE', async (id: SpotifyPlaylistId) => {
    await handlers.queuePlaylist(id)
  })
  registerInvokeHandler(
    'PLAYLISTS:UNSYNC',
    async ({ id }: { id: SpotifyPlaylistId }) => {
      await handlers.unsyncPlaylist(id)
    }
  )
  registerInvokeHandler(
    'PLAYLISTS:PAUSE',
    async ({ id }: { id: SpotifyPlaylistId }) => {
      await handlers.pausePlaylist(id)
    }
  )
  registerInvokeHandler(
    'TRACK:PAUSE',
    async ({ id }: { id: SpotifyTrackId }) => {
      await handlers.pauseTrack(id)
    }
  )
  registerInvokeHandler(
    'TRACK:CHANGE_SELECTION',
    async ({
      trackId,
      newId
    }: {
      trackId: SpotifyTrackId
      newId: YouTubeResultId | null
    }) => {
      await handlers.changeYtTrackSelection({ trackId, newId })
    }
  )
}
