import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatMinutes,
  playlistMatches,
  trackMatches,
  trackPlaylistNames
} from '../src/renderer/components/Home/model'
import { artist, playlist, spotifyTrack, track } from './fixtures'

test('formatMinutes renders zero-padded, floored MM:SS', () => {
  assert.equal(formatMinutes(205), '03:25')
  assert.equal(formatMinutes(239.6), '03:59')
  assert.equal(formatMinutes(59.5), '00:59')
  assert.equal(formatMinutes(0), '00:00')
  assert.equal(formatMinutes(3725), '62:05')
})

test('track search matches name or any artist, case-insensitively', () => {
  const data = spotifyTrack({
    name: 'Windowlicker',
    artists: [artist('Aphex Twin'), artist('Richard D. James')]
  })
  const converted = track({ data })

  assert.equal(trackMatches(converted, 'WINDOW'), true)
  assert.equal(trackMatches(converted, 'd. jam'), true)
  assert.equal(trackMatches(converted, 'squarepusher'), false)
  assert.equal(trackMatches(data, 'aphex'), true)
  assert.equal(trackMatches(data, 'autechre'), false)
})

test('playlist search matches the playlist name, case-insensitively', () => {
  const item = playlist({ name: 'Late Night Drive' })

  assert.equal(playlistMatches(item, 'night'), true)
  assert.equal(playlistMatches(item, 'LATE N'), true)
  assert.equal(playlistMatches(item, 'owner'), false)
})

test('an empty search matches everything', () => {
  assert.equal(trackMatches(track(), ''), true)
  assert.equal(playlistMatches(playlist(), ''), true)
})

test('trackPlaylistNames lists the known playlists a track belongs to', () => {
  const playlists = [
    playlist({ id: 'a', name: 'Road Trip' }),
    playlist({ id: 'b', name: 'Gym' }),
    playlist({ id: 'c', name: 'Unrelated' })
  ]
  const item = track({ playlists: [{ id: 'b' }, { id: 'gone' }, { id: 'a' }] })

  assert.equal(trackPlaylistNames(item, playlists), 'Gym, Road Trip')
  assert.equal(trackPlaylistNames(track(), playlists), '')
})
