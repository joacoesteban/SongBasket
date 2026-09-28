import { ResultAsync } from 'neverthrow'
import { readFile, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

import { insertLegacyState, readSnapshot } from '../repository'
import { compareImportedSnapshot } from '../snapshot'
import { closeLibraryDatabase, openLibraryDatabase } from '../sqlite/database'
import {
  type LegacyImportError,
  type PersistenceError,
  persistenceError
} from '../sqlite/errors'
import { type LegacyState, decodeLegacyState } from './decoder'
import { parseLegacyJson } from './json-parser'

export type ImportReport = Readonly<{
  playlistCount: number
  trackCount: number
  membershipCount: number
  conversionResultCount: number
  syncedCount: number
}>

type ImportError = LegacyImportError | PersistenceError

const isLegacyError = (error: unknown): error is LegacyImportError =>
  typeof error === 'object' &&
  error !== null &&
  'kind' in error &&
  error.kind === 'legacy-import'

const isPersistenceError = (error: unknown): error is PersistenceError =>
  typeof error === 'object' &&
  error !== null &&
  'kind' in error &&
  error.kind === 'persistence'

const importError = (error: unknown): ImportError => {
  if (isLegacyError(error)) return error
  if (isPersistenceError(error)) return error
  return persistenceError('Legacy import failed', error)
}

const importState = async (
  libraryPath: string,
  importingPath: string,
  state: LegacyState
): Promise<ImportReport> => {
  const databaseResult = await openLibraryDatabase(importingPath)
  if (databaseResult.isErr()) throw databaseResult.error
  const database = databaseResult.value
  try {
    const inserted = insertLegacyState(database, state)
    if (inserted.isErr()) throw inserted.error
    const actualResult = readSnapshot(database)
    if (actualResult.isErr()) throw actualResult.error
    const comparison = compareImportedSnapshot(state, actualResult.value)
    if (comparison.isErr()) throw comparison.error
    const checkpoint = closeLibraryDatabase(database)
    if (checkpoint.isErr()) throw checkpoint.error
    await rename(importingPath, join(libraryPath, '.songbasket.db'))
    return {
      playlistCount: state.playlists.length + state.deletedPlaylists.length,
      trackCount: state.convertedTracks.length,
      membershipCount: state.playlists
        .concat(state.deletedPlaylists)
        .reduce(
          (total, playlist) =>
            total +
            playlist.tracks.items.length +
            playlist.tracks.added.length +
            playlist.tracks.removed.length,
          0
        ),
      conversionResultCount: state.convertedTracks.reduce((total, track) => {
        let customCount = 0
        if (track.custom !== null) customCount = 1
        return total + (track.conversion?.yt.length ?? 0) + customCount
      }, 0),
      syncedCount: state.syncedPlaylists.length
    }
  } catch (error: unknown) {
    closeLibraryDatabase(database)
    await rm(importingPath, { force: true })
    throw error
  }
}

export const importLegacyStateIfNeeded = (
  params: Readonly<{
    libraryPath: string
    stopLegacyWriter: () => ResultAsync<void, PersistenceError>
  }>
): ResultAsync<ImportReport | null, ImportError> =>
  ResultAsync.fromThrowable(
    async () => {
      const databasePath = join(params.libraryPath, '.songbasket.db')
      const importingPath = `${databasePath}.importing`
      try {
        await stat(databasePath)
        return null
      } catch {
        await rm(importingPath, { force: true })
      }
      const stopped = await params.stopLegacyWriter()
      if (stopped.isErr()) throw stopped.error
      const sourcePath = join(params.libraryPath, '.songbasket')
      const source = await readFile(sourcePath, 'utf8')
      const parsed = parseLegacyJson(source, sourcePath)
      if (parsed.isErr()) throw parsed.error
      const decoded = decodeLegacyState(parsed.value)
      if (decoded.isErr()) throw decoded.error
      const report = await importState(
        params.libraryPath,
        importingPath,
        decoded.value
      )
      console.log(
        'SQLite legacy import complete',
        report.playlistCount,
        'playlists'
      )
      return report
    },
    (error: unknown) => importError(error)
  )()
