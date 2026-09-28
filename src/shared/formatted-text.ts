export type FormattedTextSegment = {
  text: string
  matched: boolean
}

const MATCHED_TEXT = /<span class="matching-token">([\s\S]*?)<\/span>/g

export const formattedTextSegments = (
  value: string
): readonly FormattedTextSegment[] => {
  const segments: FormattedTextSegment[] = []
  let cursor = 0
  for (const match of value.matchAll(MATCHED_TEXT)) {
    const index = match.index
    const text = match[1]
    if (index === undefined || text === undefined) continue
    if (index > cursor) {
      segments.push({ text: value.slice(cursor, index), matched: false })
    }
    segments.push({ text, matched: true })
    cursor = index + match[0].length
  }
  if (cursor < value.length) {
    segments.push({ text: value.slice(cursor), matched: false })
  }
  if (segments.length === 0) return [{ text: value, matched: false }]
  return segments
}
