import type { Track, YoutubeResult } from './model'
import { selectedResult } from './track-status'

export type ResultIssue = {
  label: string
  warn: boolean
  color: string | null
}

export const resultIssue = (result: YoutubeResult): ResultIssue | null => {
  if (result.isCustomTrack === true) {
    return {
      label: 'Custom',
      warn: false,
      color: 'var(--custom-selection-color)'
    }
  }
  if (!result.isDoubtlyConversion) return null
  if (result.wordScore === 0 || result.nameTokensMap[0] !== true) {
    return { label: "Name doesn't match", warn: true, color: null }
  }
  return { label: "Duration doesn't match", warn: true, color: null }
}

export const selectAction = (
  result: YoutubeResult,
  track: Track
): 'Select' | 'Apply Selection' | null => {
  const selected = selectedResult(track)?.youtube_id === result.youtube_id
  const doubtful = result.isDoubtlyConversion && !track.flags.selectionIsApplied
  if (!selected) return 'Select'
  if (doubtful) return 'Apply Selection'
  return null
}
