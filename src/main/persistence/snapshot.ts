import { Result, err, ok } from 'neverthrow'

import type { LegacyState } from './legacy/decoder'
import { type DesktopStateSnapshot, readSnapshot } from './repository'
import type { LibraryDatabase } from './sqlite/database'
import {
  type LegacyImportError,
  type PersistenceError,
  legacyImportError
} from './sqlite/errors'

export const buildDesktopStateSnapshot = (
  database: LibraryDatabase
): Result<DesktopStateSnapshot, PersistenceError> => readSnapshot(database)

const normalized = (value: unknown): string => {
  const encoded = JSON.stringify(value)
  if (encoded === undefined) throw new Error('Snapshot cannot be encoded')
  return encoded
}

const firstDifference = (
  expected: unknown,
  actual: unknown,
  path: string
): string | null => {
  if (normalized(expected) === normalized(actual)) return null
  if (Object.is(expected, actual)) return null
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length)
      return `${path}: lengths ${expected.length} and ${actual.length}`
    for (let index = 0; index < expected.length; index += 1) {
      const difference = firstDifference(
        expected[index],
        actual[index],
        `${path}[${index}]`
      )
      if (difference !== null) return difference
    }
    return null
  }
  if (
    typeof expected === 'object' &&
    expected !== null &&
    typeof actual === 'object' &&
    actual !== null &&
    !Array.isArray(expected) &&
    !Array.isArray(actual)
  ) {
    const expectedRecord = Object.fromEntries(Object.entries(expected))
    const actualRecord = Object.fromEntries(Object.entries(actual))
    const keys = new Set([
      ...Object.keys(expectedRecord),
      ...Object.keys(actualRecord)
    ])
    for (const key of keys) {
      if (!(key in expectedRecord) || !(key in actualRecord))
        return `${path}.${key}: missing on one side`
      const difference = firstDifference(
        expectedRecord[key],
        actualRecord[key],
        `${path}.${key}`
      )
      if (difference !== null) return difference
    }
    return null
  }
  return `${path}: ${normalized(expected)} !== ${normalized(actual)}`
}

export const compareImportedSnapshot = (
  expected: LegacyState,
  actual: DesktopStateSnapshot
): Result<void, LegacyImportError> => {
  try {
    const difference = firstDifference(expected, actual, '$')
    if (difference !== null)
      return err(
        legacyImportError(
          `Imported database readback differs from legacy source at ${difference}`
        )
      )
    return ok(undefined)
  } catch (error: unknown) {
    return err(
      legacyImportError(
        'Imported snapshot comparison failed',
        '$',
        undefined,
        error
      )
    )
  }
}
