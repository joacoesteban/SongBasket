import { ResultAsync } from 'neverthrow'
import { readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

import type { LibraryDatabase } from './sqlite/database'
import { type PersistenceError, persistenceError } from './sqlite/errors'

const filesUnder = async (
  root: string,
  current: string
): Promise<readonly string[]> => {
  const entries = await readdir(current, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(current, entry.name)
      if (entry.isDirectory()) return filesUnder(root, path)
      return [relative(root, path)]
    })
  )
  return nested.flat()
}

export const reconcileDownloadedFiles = (
  database: LibraryDatabase,
  libraryPath: string
): ResultAsync<void, PersistenceError> =>
  ResultAsync.fromThrowable(
    async () => {
      const paths = await filesUnder(libraryPath, libraryPath)
      database.exec('BEGIN IMMEDIATE')
      try {
        const statement = database.prepare(
          'INSERT OR REPLACE INTO downloaded_file (relative_path,track_id,youtube_id,playlist_id,playlist_folder,discovered_at_ms) VALUES (?,?,?,?,?,?)'
        )
        paths
          .filter((path) => path.toLowerCase().endsWith('.mp3'))
          .forEach((path) =>
            statement.run(path, null, null, null, '', Date.now())
          )
        database.exec('COMMIT')
      } catch (error: unknown) {
        database.exec('ROLLBACK')
        throw error
      }
    },
    (error: unknown) =>
      persistenceError('Downloaded file reconciliation failed', error)
  )()
