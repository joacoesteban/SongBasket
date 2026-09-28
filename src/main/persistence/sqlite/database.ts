import { Result, ResultAsync } from 'neverthrow'
import { DatabaseSync } from 'node:sqlite'

import { type PersistenceError, persistenceError } from './errors'
import { type LibraryDatabase, migrateLibraryDatabase } from './migrations'

export type { LibraryDatabase }

export const openLibraryDatabase = (
  path: string
): ResultAsync<LibraryDatabase, PersistenceError> =>
  ResultAsync.fromThrowable(
    async () => {
      const database = new DatabaseSync(path)
      database.exec('PRAGMA foreign_keys = ON')
      database.exec('PRAGMA journal_mode = WAL')
      database.exec('PRAGMA busy_timeout = 5000')
      const migration = migrateLibraryDatabase(database)
      if (migration.isErr()) {
        database.close()
        throw new Error(migration.error.message)
      }
      return database
    },
    (error: unknown) =>
      persistenceError('Opening library database failed', error)
  )()

export const closeLibraryDatabase = (
  database: LibraryDatabase
): Result<void, PersistenceError> =>
  Result.fromThrowable(
    () => {
      database.exec('PRAGMA wal_checkpoint(TRUNCATE)')
      database.close()
    },
    (error: unknown) =>
      persistenceError('Closing library database failed', error)
  )()
