import { Result, ResultAsync } from 'neverthrow'

import { importLegacyStateIfNeeded } from './legacy/importer'
import {
  type CommitTrackChanges,
  type ReplaceConversions,
  type ReplacePlaylistPage,
  type ReplacePlaylistTracks,
  type SetCustomTrack,
  type SetPlaylistCache,
  type SetTrackSelection,
  clearPlaylistCache,
  commitTrackChanges,
  readSnapshot,
  replaceConversions,
  replacePlaylistPage,
  replacePlaylistTracks,
  setCustomTrack,
  setPlaylistCache,
  setPlaylistPaused,
  setTrackPaused,
  setTrackSelection
} from './repository'
import type { DesktopStateSnapshot } from './repository'
import {
  type LibraryDatabase,
  closeLibraryDatabase,
  openLibraryDatabase
} from './sqlite/database'
import {
  type LegacyImportError,
  type PersistenceError,
  persistenceError
} from './sqlite/errors'

export type PersistenceSession = Readonly<{
  libraryPath: string
  database: LibraryDatabase
}>
export type PersistedCommand =
  | Readonly<{ kind: 'replace-playlist-page'; command: ReplacePlaylistPage }>
  | Readonly<{
      kind: 'replace-playlist-tracks'
      command: ReplacePlaylistTracks
    }>
  | Readonly<{ kind: 'replace-conversions'; command: ReplaceConversions }>
  | Readonly<{ kind: 'commit-track-changes'; command: CommitTrackChanges }>
  | Readonly<{ kind: 'set-playlist-cache'; command: SetPlaylistCache }>
  | Readonly<{ kind: 'clear-playlist-cache'; playlistId: string }>
  | Readonly<{ kind: 'set-track-selection'; command: SetTrackSelection }>
  | Readonly<{ kind: 'set-custom-track'; command: SetCustomTrack }>
  | Readonly<{
      kind: 'set-playlist-paused'
      command: { playlistId: string; paused: boolean }
    }>
  | Readonly<{
      kind: 'set-track-paused'
      command: { trackId: string; paused: boolean }
    }>

const stopLegacyWriter = (): ResultAsync<void, PersistenceError> =>
  ResultAsync.fromSafePromise(Promise.resolve(undefined))

type OpenError = PersistenceError | LegacyImportError

export const openLibraryPersistence = (
  libraryPath: string
): ResultAsync<PersistenceSession, OpenError> =>
  importLegacyStateIfNeeded({ libraryPath, stopLegacyWriter }).andThen(() =>
    openLibraryDatabase(`${libraryPath}/.songbasket.db`).map((database) => ({
      libraryPath,
      database
    }))
  )

export const executePersistedCommand = (
  session: PersistenceSession,
  command: PersistedCommand
): ResultAsync<void, PersistenceError> =>
  ResultAsync.fromThrowable(
    async () => {
      const result = (() => {
        switch (command.kind) {
          case 'replace-playlist-page':
            return replacePlaylistPage(session.database, command.command)
          case 'replace-playlist-tracks':
            return replacePlaylistTracks(session.database, command.command)
          case 'replace-conversions':
            return replaceConversions(session.database, command.command)
          case 'commit-track-changes':
            return commitTrackChanges(session.database, command.command)
          case 'set-playlist-cache':
            return setPlaylistCache(session.database, command.command)
          case 'clear-playlist-cache':
            return clearPlaylistCache(session.database, command.playlistId)
          case 'set-track-selection':
            return setTrackSelection(session.database, command.command)
          case 'set-custom-track':
            return setCustomTrack(session.database, command.command)
          case 'set-playlist-paused':
            return setPlaylistPaused(
              session.database,
              command.command.playlistId,
              command.command.paused
            )
          case 'set-track-paused':
            return setTrackPaused(
              session.database,
              command.command.trackId,
              command.command.paused
            )
        }
      })()
      if (result.isErr()) throw result.error
    },
    (error: unknown) =>
      persistenceError('Executing persisted command failed', error)
  )()

export const closeLibraryPersistence = (
  session: PersistenceSession
): ResultAsync<void, PersistenceError> =>
  ResultAsync.fromThrowable(
    async () => {
      const result = closeLibraryDatabase(session.database)
      if (result.isErr()) throw result.error
    },
    (error: unknown) =>
      persistenceError('Closing persistence session failed', error)
  )()

export const readPersistenceSnapshot = (
  session: PersistenceSession
): Result<DesktopStateSnapshot, PersistenceError> =>
  readSnapshot(session.database)
