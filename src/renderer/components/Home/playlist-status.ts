import { match } from 'ts-pattern'
import type { DeepReadonly } from 'vue'

import type { SongBasketStateDto, TrackListDto } from '../../../shared/ipc'
import type { Playlist } from './model'
import { type TrackStatusSlug, trackStatus } from './track-status'

export type PlaylistStatusSlug =
  'unsynced' | 'paused' | 'error' | 'review' | 'convert' | 'synced'

export type PlaylistStatus = {
  slug: PlaylistStatusSlug
  label: string
  color: string
  count: number
}

type PlaylistState = Pick<
  DeepReadonly<SongBasketStateDto>,
  'syncedPlaylists' | 'convertedTracks'
>

const statusPriority: Record<PlaylistStatusSlug, number> = {
  error: 1,
  review: 1,
  convert: 2,
  synced: 3,
  paused: 4,
  unsynced: 5
}

const countLabel = (
  count: number,
  singular: string,
  plural: string
): string => {
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural}`
}

const trackStatusForPlaylist = (
  playlist: Playlist,
  state: PlaylistState,
  downloaded: DeepReadonly<TrackListDto> | null
): readonly TrackStatusSlug[] =>
  state.convertedTracks
    .filter((track) =>
      track.playlists.some((membership) => membership.id === playlist.id)
    )
    .map((track) => trackStatus(track, downloaded).slug)

const changeCount = (playlist: Playlist): number =>
  playlist.tracks.added.length + playlist.tracks.removed.length

type TrackCounts = {
  error: number
  review: number
  convert: number
  toDownload: number
}

const countTrackCategories = (slugs: readonly TrackStatusSlug[]): TrackCounts =>
  slugs.reduce<TrackCounts>(
    (counts, slug) =>
      match(slug)
        .with('error', () => ({ ...counts, error: counts.error + 1 }))
        .with('no-conversion', 'review-conversion', () => ({
          ...counts,
          review: counts.review + 1
        }))
        .with('awaiting-conversion', () => ({
          ...counts,
          convert: counts.convert + 1
        }))
        .with('awaiting-download', 'custom:awaiting-download', () => ({
          ...counts,
          toDownload: counts.toDownload + 1
        }))
        .with('paused', 'downloaded', () => counts)
        .exhaustive(),
    { error: 0, review: 0, convert: 0, toDownload: 0 }
  )

const statusForTrackCounts = (counts: TrackCounts): PlaylistStatus => {
  const syncedLabel = match(counts.toDownload)
    .with(0, () => 'Synced')
    .otherwise((count) => `${count} to download`)
  const synced: PlaylistStatus = {
    slug: 'synced',
    label: syncedLabel,
    color: 'var(--green-accept)',
    count: counts.toDownload
  }
  const candidates: readonly PlaylistStatus[] = [
    {
      slug: 'error',
      label: countLabel(counts.error, 'conversion error', 'conversion errors'),
      color: 'var(--red-cancel)',
      count: counts.error
    },
    {
      slug: 'review',
      label: countLabel(counts.review, 'track to review', 'tracks to review'),
      color: 'var(--orange-warning)',
      count: counts.review
    },
    {
      slug: 'convert',
      label: countLabel(
        counts.convert,
        'track to convert',
        'tracks to convert'
      ),
      color: 'var(--button-purple)',
      count: counts.convert
    },
    synced
  ]
  return candidates.find((candidate) => candidate.count > 0) ?? synced
}

export const playlistStatus = (
  playlist: Playlist,
  state: PlaylistState,
  downloaded: DeepReadonly<TrackListDto> | null
): PlaylistStatus => {
  if (!state.syncedPlaylists.includes(playlist.id)) {
    return {
      slug: 'unsynced',
      label: 'click to sync',
      color: 'var(--button-purple)',
      count: 0
    }
  }
  if (playlist.isPaused === true) {
    return {
      slug: 'paused',
      label: 'Paused',
      color: 'var(--global-grey)',
      count: 0
    }
  }

  const trackSlugs = trackStatusForPlaylist(playlist, state, downloaded)
  return statusForTrackCounts(countTrackCategories(trackSlugs))
}

export const sortPlaylistsByStatus = (
  playlists: readonly Playlist[],
  state: PlaylistState,
  downloaded: DeepReadonly<TrackListDto> | null
): readonly Playlist[] =>
  playlists
    .map((playlist, index) => ({
      playlist,
      index,
      status: playlistStatus(playlist, state, downloaded),
      trackChanges: changeCount(playlist)
    }))
    .sort((left, right) => {
      const priorityDifference =
        statusPriority[left.status.slug] - statusPriority[right.status.slug]
      if (priorityDifference !== 0) return priorityDifference
      const changesDifference = right.trackChanges - left.trackChanges
      if (changesDifference !== 0) return changesDifference
      const countDifference = right.status.count - left.status.count
      if (countDifference !== 0) return countDifference
      return left.index - right.index
    })
    .map(({ playlist }) => playlist)
