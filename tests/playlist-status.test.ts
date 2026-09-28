import assert from 'node:assert/strict'
import test from 'node:test'

import type { SpotifyPlaylist } from '../src/@types/Spotify'
import {
  playlistStatus,
  sortPlaylistsByStatus
} from '../src/renderer/components/Home/playlist-status'
import type { SongBasketTrackDto, TrackListDto } from '../src/shared/ipc'
import {
  convertedTrack,
  playlist,
  result,
  spotifyTrack,
  track
} from './fixtures'

const best = result({ youtube_id: 'yt-best' })
const doubtful = result({ youtube_id: 'yt-doubt', isDoubtlyConversion: true })
const inList = (id: string) => [{ id }]

const ready = (id: string, playlistId: string): SongBasketTrackDto =>
  convertedTrack(id, best, { playlists: inList(playlistId) })
const review = (id: string, playlistId: string): SongBasketTrackDto =>
  convertedTrack(id, doubtful, { playlists: inList(playlistId) })
const failed = (id: string, playlistId: string): SongBasketTrackDto =>
  track({ id, playlists: inList(playlistId), flags: { conversionError: true } })
const unconverted = (id: string, playlistId: string): SongBasketTrackDto =>
  track({ id, playlists: inList(playlistId), flags: { converted: false } })
const missing = (id: string, playlistId: string): SongBasketTrackDto =>
  track({ id, playlists: inList(playlistId), conversion: null })

const statusOf = (
  convertedTracks: readonly SongBasketTrackDto[],
  {
    downloaded = null,
    syncedPlaylists = ['p'],
    overrides = {}
  }: {
    downloaded?: TrackListDto | null
    syncedPlaylists?: string[]
    overrides?: Partial<SpotifyPlaylist>
  } = {}
): readonly [string, string, string] => {
  const { slug, label, color } = playlistStatus(
    playlist({ id: 'p', ...overrides }),
    { syncedPlaylists, convertedTracks: [...convertedTracks] },
    downloaded
  )
  return [slug, label, color]
}

test('unsynced playlists ask to be synced', () => {
  assert.deepEqual(statusOf([failed('a', 'p')], { syncedPlaylists: [] }), [
    'unsynced',
    'click to sync',
    'var(--button-purple)'
  ])
})

test('paused playlists report paused regardless of their tracks', () => {
  assert.deepEqual(
    statusOf([failed('a', 'p')], { overrides: { isPaused: true } }),
    ['paused', 'Paused', 'var(--global-grey)']
  )
})

test('the most urgent track state wins and reports its count', () => {
  const tracks = [
    failed('a', 'p'),
    failed('b', 'p'),
    review('c', 'p'),
    unconverted('d', 'p'),
    ready('e', 'p')
  ]

  assert.deepEqual(statusOf(tracks), [
    'error',
    '2 conversion errors',
    'var(--red-cancel)'
  ])
  assert.deepEqual(statusOf(tracks.slice(2)), [
    'review',
    '1 track to review',
    'var(--orange-warning)'
  ])
  assert.deepEqual(statusOf([missing('f', 'p'), ...tracks.slice(2)]), [
    'review',
    '2 tracks to review',
    'var(--orange-warning)'
  ])
  assert.deepEqual(statusOf(tracks.slice(3)), [
    'convert',
    '1 track to convert',
    'var(--button-purple)'
  ])
})

test('synced playlists count tracks left to download', () => {
  const downloaded = { e: { 'yt-best': { playlists: ['P'] } } }
  const tracks = [ready('e', 'p'), ready('f', 'p'), ready('g', 'p')]

  assert.deepEqual(statusOf(tracks, { downloaded }), [
    'synced',
    '2 to download',
    'var(--green-accept)'
  ])
  assert.deepEqual(statusOf(tracks.slice(0, 1), { downloaded }), [
    'synced',
    'Synced',
    'var(--green-accept)'
  ])
})

test('tracks from other playlists and paused tracks do not count', () => {
  const tracks = [
    failed('a', 'other'),
    track({ id: 'b', playlists: inList('p'), flags: { paused: true } }),
    ready('c', 'p')
  ]

  assert.equal(statusOf(tracks)[1], '1 to download')
})

test('sortPlaylistsByStatus orders by urgency, track changes, then count', () => {
  const synced = ['calm', 'paused', 'error', 'review', 'changed', 'convert']
  const change = spotifyTrack({ id: 'change' })
  const playlists = [
    playlist({ id: 'calm' }),
    playlist({ id: 'paused', isPaused: true }),
    playlist({ id: 'error' }),
    playlist({ id: 'review' }),
    playlist({
      id: 'changed',
      tracks: {
        href: '',
        total: 1,
        items: [],
        added: [change, change],
        removed: [change]
      }
    }),
    playlist({ id: 'convert' })
  ]
  const convertedTracks = [
    ready('a', 'calm'),
    failed('b', 'error'),
    review('c', 'review'),
    review('d', 'review'),
    failed('e', 'changed'),
    unconverted('f', 'convert')
  ]

  assert.deepEqual(
    sortPlaylistsByStatus(
      playlists,
      { syncedPlaylists: synced, convertedTracks },
      null
    ).map(({ id }) => id),
    ['changed', 'review', 'error', 'convert', 'calm', 'paused']
  )
  assert.equal(playlists[0]?.id, 'calm')
})
