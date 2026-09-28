import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isDownloaded,
  withDownloadedFile,
  withoutDownloadedFile
} from '../src/shared/downloaded-tracks'
import type { TrackListDto } from '../src/shared/ipc'

const file = (playlist: string, youtubeId = 'yt-1') => ({
  spotify_id: 'track-1',
  youtube_id: youtubeId,
  playlist
})

test('an added file marks only its own YouTube selection as downloaded', () => {
  const tracks = withDownloadedFile({}, file('Road Trip'))

  assert.equal(isDownloaded(tracks, 'track-1', 'yt-1'), true)
  assert.equal(isDownloaded(tracks, 'track-1', 'yt-2'), false)
  assert.equal(isDownloaded(tracks, 'track-2', 'yt-1'), false)
  assert.equal(isDownloaded(null, 'track-1', 'yt-1'), false)
})

test('a track stays downloaded until its file is gone from every playlist folder', () => {
  const both = withDownloadedFile(
    withDownloadedFile({}, file('Road Trip')),
    file('Gym')
  )
  const one = withoutDownloadedFile(both, file('Road Trip'))
  const none = withoutDownloadedFile(one, file('Gym'))

  assert.equal(isDownloaded(one, 'track-1', 'yt-1'), true)
  assert.equal(isDownloaded(none, 'track-1', 'yt-1'), false)
  assert.deepEqual(none, {})
})

test('repeated watcher events for the same file are idempotent', () => {
  const twice = withDownloadedFile(
    withDownloadedFile({}, file('Road Trip')),
    file('Road Trip')
  )
  const removed = withoutDownloadedFile(twice, file('Road Trip'))

  assert.equal(isDownloaded(removed, 'track-1', 'yt-1'), false)
  assert.deepEqual(withoutDownloadedFile({}, file('Road Trip')), {})
})

test('files without SongBasket tags are ignored', () => {
  const untagged = { spotify_id: null, youtube_id: 'yt-1', playlist: 'Gym' }
  const unselected = {
    spotify_id: 'track-1',
    youtube_id: null,
    playlist: 'Gym'
  }

  assert.deepEqual(withDownloadedFile({}, untagged), {})
  assert.deepEqual(withDownloadedFile({}, unselected), {})
})

test('updates return new maps and leave the previous map untouched', () => {
  const before: TrackListDto = {
    'track-1': { 'yt-1': { playlists: ['Road Trip'] } }
  }
  const snapshot = structuredClone(before)

  const added = withDownloadedFile(before, file('Gym'))
  const removed = withoutDownloadedFile(before, file('Road Trip'))

  assert.notEqual(added, before)
  assert.notEqual(removed, before)
  assert.deepEqual(before, snapshot)
})
