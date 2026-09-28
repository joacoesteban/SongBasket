import assert from 'node:assert/strict'
import test from 'node:test'

import {
  type FloatingButtonsInput,
  appErrorPill,
  connectionErrorPill,
  floatingButtons
} from '../src/renderer/components/Home/floating-buttons'

const idle: FloatingButtonsInput = {
  loading: false,
  loadingTarget: undefined,
  internet: true,
  api: true,
  ffmpeg: true,
  queuedPlaylists: 0,
  syncedPlaylists: 1,
  dev: false,
  errorPill: false
}

const visible = (overrides: Partial<FloatingButtonsInput>) =>
  floatingButtons({ ...idle, ...overrides })

test('refresh needs both internet and API connectivity and no loading', () => {
  assert.equal(visible({}).refresh, true)
  assert.equal(visible({ api: false }).refresh, false)
  assert.equal(visible({ internet: false }).refresh, false)
  assert.equal(
    visible({ loading: true, loadingTarget: 'REFRESH' }).refresh,
    false
  )
})

test('sync needs queued or synced playlists and full connectivity', () => {
  assert.equal(visible({ syncedPlaylists: 1, queuedPlaylists: 0 }).sync, true)
  assert.equal(visible({ syncedPlaylists: 0, queuedPlaylists: 2 }).sync, true)
  assert.equal(visible({ syncedPlaylists: 0, queuedPlaylists: 0 }).sync, false)
  assert.equal(visible({ api: false }).sync, false)
  assert.equal(visible({ loading: true }).sync, false)
})

test('download needs synced playlists, internet, and ffmpeg but not the API', () => {
  assert.equal(visible({ api: false }).download, true)
  assert.equal(
    visible({ syncedPlaylists: 0, queuedPlaylists: 3 }).download,
    false
  )
  assert.equal(visible({ internet: false }).download, false)
  assert.equal(visible({ ffmpeg: false }).download, false)
  assert.equal(
    visible({ loading: true, loadingTarget: 'DOWNLOAD' }).download,
    true
  )
  assert.equal(
    visible({ loading: true, loadingTarget: 'REFRESH' }).download,
    false
  )
})

test('the logout dropdown only shows in development builds', () => {
  assert.equal(visible({ dev: false }).dropdown, false)
  assert.equal(visible({ dev: true }).dropdown, true)
})

test('an error pill hides every button', () => {
  assert.deepEqual(
    visible({ dev: true, queuedPlaylists: 1, errorPill: true }),
    {
      refresh: false,
      sync: false,
      download: false,
      dropdown: false
    }
  )
})

test('connection loss explains which side is down and hides after ten seconds', () => {
  assert.deepEqual(connectionErrorPill({ internet: false, api: false }), {
    message: 'Check your connection',
    hideAfterMs: 10_000
  })
  assert.deepEqual(connectionErrorPill({ internet: true, api: false }), {
    message: 'SongBasket servers are experiencing connection issues',
    hideAfterMs: 10_000
  })
  assert.equal(connectionErrorPill({ internet: true, api: true }), null)
})

test('application errors show their message and hide after four seconds', () => {
  assert.deepEqual(
    appErrorPill({ name: 'Error', message: 'Download failed' }),
    {
      message: 'Download failed',
      hideAfterMs: 4_000
    }
  )
})
