import { Result } from 'neverthrow'

import { type LegacyImportError, legacyImportError } from '../sqlite/errors'

const parseUnknown = (source: string): unknown => JSON.parse(source)

export const parseLegacyJson = (
  source: string,
  path: string
): Result<unknown, LegacyImportError> =>
  Result.fromThrowable(
    () => parseUnknown(source),
    (error: unknown) =>
      legacyImportError('Legacy JSON is malformed', '$', path, error)
  )()
