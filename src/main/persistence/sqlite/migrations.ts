import { Result } from 'neverthrow'
import type { DatabaseSync } from 'node:sqlite'

import { type PersistenceError, persistenceError } from './errors'
import { SCHEMA_SQL } from './schema'

export type LibraryDatabase = DatabaseSync

const readUserVersion = (database: LibraryDatabase): number => {
  const row = database.prepare('PRAGMA user_version').get()
  const value = row?.['user_version']
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error('Invalid PRAGMA user_version')
  }
  return value
}

export const migrateLibraryDatabase = (
  database: LibraryDatabase
): Result<void, PersistenceError> =>
  Result.fromThrowable(
    () => {
      const version = readUserVersion(database)
      if (version > 1) {
        throw new Error(
          `Database version ${version} is newer than supported version 1`
        )
      }
      if (version === 0) {
        database.exec('BEGIN IMMEDIATE')
        try {
          database.exec(SCHEMA_SQL)
          database.exec('PRAGMA user_version = 1')
          database.exec('COMMIT')
        } catch (error: unknown) {
          database.exec('ROLLBACK')
          throw error
        }
      }
    },
    (error: unknown) => persistenceError('Database migration failed', error)
  )()
