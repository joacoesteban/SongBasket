import assert from 'node:assert/strict'
import test from 'node:test'

import {
  type TrackStatusSlug,
  canReviewTrack,
  selectedResult,
  sortTracksByStatus,
  trackStatus
} from '../src/renderer/components/Home/track-status'
import type { SongBasketTrackDto, TrackListDto } from '../src/shared/ipc'
import { convertedTrack, result, track } from './fixtures'

const best = result({ youtube_id: 'yt-best', isBestMatch: true })
const other = result({ youtube_id: 'yt-other' })
const custom = result({ youtube_id: 'yt-custom', isCustomTrack: true })
const doubtful = result({ youtube_id: 'yt-doubt', isDoubtlyConversion: true })

const slugOf = (
  item: SongBasketTrackDto,
  downloaded: TrackListDto | null = null
): TrackStatusSlug => trackStatus(item, downloaded).slug

test('selectedResult resolves the explicit, best-match, and custom selections', () => {
  const conversion = {
    id: 't',
    yt: [best, other],
    nameTokens: [],
    bestMatch: 'yt-best'
  }

  assert.equal(selectedResult(track({ conversion })), best)
  assert.equal(
    selectedResult(track({ conversion, selection: 'yt-other' })),
    other
  )
  assert.equal(
    selectedResult(track({ conversion, custom, selection: 'yt-custom' })),
    custom
  )
  assert.equal(
    selectedResult(track({ conversion, custom, selection: false })),
    custom
  )
  assert.equal(
    selectedResult(track({ conversion, selection: 'yt-missing' })),
    null
  )
  assert.equal(selectedResult(track({ conversion: null })), null)
  assert.equal(
    selectedResult(track({ conversion, flags: { conversionError: true } })),
    null
  )
})

test('trackStatus follows the legacy precedence', () => {
  assert.equal(
    slugOf(track({ flags: { paused: true, conversionError: true } })),
    'paused'
  )
  assert.equal(
    slugOf(track({ flags: { conversionError: true, converted: false } })),
    'error'
  )
  assert.equal(
    slugOf(track({ flags: { converted: false } })),
    'awaiting-conversion'
  )
  assert.equal(slugOf(track({ conversion: null })), 'no-conversion')
  assert.equal(
    slugOf(track({ custom, selection: false })),
    'custom:awaiting-download'
  )
  assert.equal(slugOf(convertedTrack('t', best)), 'awaiting-download')
  assert.equal(slugOf(convertedTrack('t', doubtful)), 'review-conversion')
  assert.equal(
    slugOf(
      convertedTrack('t', doubtful, { flags: { selectionIsApplied: true } })
    ),
    'awaiting-download'
  )
})

test('a track is downloaded only when its selected result has a file', () => {
  const item = convertedTrack('t', best)

  assert.equal(
    slugOf(item, { t: { 'yt-best': { playlists: ['Gym'] } } }),
    'downloaded'
  )
  assert.equal(
    slugOf(item, { t: { 'yt-other': { playlists: ['Gym'] } } }),
    'awaiting-download'
  )
  assert.equal(
    slugOf(convertedTrack('t', doubtful), {
      t: { 'yt-doubt': { playlists: ['Gym'] } }
    }),
    'downloaded'
  )
  assert.equal(
    slugOf(track({ flags: { paused: true } }), {
      track: { 'yt-best': { playlists: ['Gym'] } }
    }),
    'paused'
  )
})

test('statuses use the legacy labels and colors', () => {
  const cases = [
    [track({ flags: { paused: true } }), 'paused', 'var(--global-grey)'],
    [
      track({ flags: { conversionError: true } }),
      'conversion error',
      'var(--red-cancel)'
    ],
    [
      track({ flags: { converted: false } }),
      'awaiting conversion',
      'var(--global-grey)'
    ],
    [track({ conversion: null }), 'no conversion found', 'var(--global-grey)'],
    [
      track({ custom, selection: false }),
      'awaiting download | custom',
      'var(--custom-selection-color)'
    ],
    [convertedTrack('t', best), 'awaiting download', 'var(--button-purple)'],
    [
      convertedTrack('t', doubtful),
      'review conversion',
      'var(--orange-warning)'
    ]
  ] as const

  cases.forEach(([item, label, color]) => {
    const status = trackStatus(item, null)
    assert.equal(status.label, label)
    assert.equal(status.color, color)
  })
  assert.equal(
    trackStatus(convertedTrack('t', best), {
      t: { 'yt-best': { playlists: ['Gym'] } }
    }).color,
    'var(--green-accept)'
  )
})

test('sortTracksByStatus puts tracks that need attention first', () => {
  const downloaded = { d: { 'yt-best': { playlists: ['Gym'] } } }
  const tracks = [
    track({ id: 'paused', flags: { paused: true } }),
    convertedTrack('d', best),
    convertedTrack('ready', best),
    track({ id: 'custom', custom, selection: false }),
    track({ id: 'unconverted', flags: { converted: false } }),
    convertedTrack('review', doubtful),
    track({ id: 'missing', conversion: null }),
    track({ id: 'error', flags: { conversionError: true } })
  ]

  assert.deepEqual(
    sortTracksByStatus(tracks, downloaded).map(({ id }) => id),
    [
      'error',
      'missing',
      'review',
      'unconverted',
      'ready',
      'custom',
      'd',
      'paused'
    ]
  )
  assert.equal(tracks[0]?.id, 'paused')
})

test('only reviewable statuses open track review', () => {
  const cases: readonly (readonly [TrackStatusSlug, boolean])[] = [
    ['paused', true],
    ['error', false],
    ['awaiting-conversion', false],
    ['downloaded', true],
    ['no-conversion', true],
    ['custom:awaiting-download', true],
    ['awaiting-download', true],
    ['review-conversion', true]
  ]

  cases.forEach(([slug, expected]) => {
    assert.equal(canReviewTrack(slug), expected, slug)
  })
})
