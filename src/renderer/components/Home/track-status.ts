import { match } from 'ts-pattern'
import type { DeepReadonly } from 'vue'

import { isDownloaded } from '../../../shared/downloaded-tracks'
import type { TrackListDto } from '../../../shared/ipc'
import type { Track, YoutubeResult } from './model'

export type TrackStatusSlug =
  | 'paused'
  | 'error'
  | 'awaiting-conversion'
  | 'downloaded'
  | 'no-conversion'
  | 'custom:awaiting-download'
  | 'awaiting-download'
  | 'review-conversion'

export type TrackStatus = {
  slug: TrackStatusSlug
  label: string
  color: string
}

const statusDetails: Record<
  TrackStatusSlug,
  { label: string; color: string; order: number }
> = {
  paused: {
    label: 'paused',
    color: 'var(--global-grey)',
    order: 1000
  },
  error: {
    label: 'conversion error',
    color: 'var(--red-cancel)',
    order: 1
  },
  'awaiting-conversion': {
    label: 'awaiting conversion',
    color: 'var(--global-grey)',
    order: 5
  },
  downloaded: {
    label: 'downloaded',
    color: 'var(--green-accept)',
    order: 100
  },
  'no-conversion': {
    label: 'no conversion found',
    color: 'var(--global-grey)',
    order: 2
  },
  'custom:awaiting-download': {
    label: 'awaiting download | custom',
    color: 'var(--custom-selection-color)',
    order: 10
  },
  'awaiting-download': {
    label: 'awaiting download',
    color: 'var(--button-purple)',
    order: 10
  },
  'review-conversion': {
    label: 'review conversion',
    color: 'var(--orange-warning)',
    order: 3
  }
}

export const selectedResult = (track: Track): YoutubeResult | null => {
  if (track.flags.conversionError) return null
  if (track.selection === false) return track.custom

  const conversion = track.conversion
  if (conversion === null) return null
  const selectionId = track.selection ?? conversion.bestMatch
  const result = conversion.yt.find((item) => item.youtube_id === selectionId)
  if (result !== undefined) return result

  const custom = track.custom
  if (custom?.youtube_id === selectionId) return custom
  return null
}

export const trackStatus = (
  track: Track,
  downloaded: DeepReadonly<TrackListDto> | null
): TrackStatus => {
  const slug: TrackStatusSlug = match(track.flags)
    .returnType<TrackStatusSlug>()
    .with({ paused: true }, () => 'paused')
    .with({ conversionError: true }, () => 'error')
    .with({ converted: false }, () => 'awaiting-conversion')
    .otherwise(() => {
      const result = selectedResult(track)
      if (result === null) return 'no-conversion'
      if (isDownloaded(downloaded, track.id, result.youtube_id)) {
        return 'downloaded'
      }
      if (result.isCustomTrack === true) return 'custom:awaiting-download'
      if (track.flags.selectionIsApplied || !result.isDoubtlyConversion) {
        return 'awaiting-download'
      }
      return 'review-conversion'
    })

  const details = statusDetails[slug]
  return { slug, label: details.label, color: details.color }
}

export const sortTracksByStatus = (
  tracks: readonly Track[],
  downloaded: DeepReadonly<TrackListDto> | null
): readonly Track[] =>
  tracks
    .map((track, index) => ({
      track,
      index,
      status: trackStatus(track, downloaded)
    }))
    .sort((left, right) => {
      const orderDifference =
        statusDetails[left.status.slug].order -
        statusDetails[right.status.slug].order
      if (orderDifference !== 0) return orderDifference
      return left.index - right.index
    })
    .map(({ track }) => track)

export const canReviewTrack = (slug: TrackStatusSlug): boolean =>
  match(slug)
    .with('error', 'awaiting-conversion', () => false)
    .otherwise(() => true)
