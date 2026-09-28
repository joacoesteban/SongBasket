export type PersistenceError = Readonly<{
  kind: 'persistence'
  message: string
  cause?: unknown
}>

export type LegacyImportError = Readonly<{
  kind: 'legacy-import'
  message: string
  path?: string
  fieldPath?: string
  cause?: unknown
}>

export const persistenceError = (
  message: string,
  cause?: unknown
): PersistenceError => {
  if (cause === undefined) return { kind: 'persistence', message }
  return { kind: 'persistence', message, cause }
}

export const legacyImportError = (
  message: string,
  fieldPath?: string,
  path?: string,
  cause?: unknown
): LegacyImportError => {
  const result: {
    kind: 'legacy-import'
    message: string
    fieldPath?: string
    path?: string
    cause?: unknown
  } = { kind: 'legacy-import', message }
  if (fieldPath !== undefined) result.fieldPath = fieldPath
  if (path !== undefined) result.path = path
  if (cause !== undefined) result.cause = cause
  return result
}
