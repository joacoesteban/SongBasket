import { ResultAsync } from 'neverthrow'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'

import { importLegacyStateIfNeeded } from '../src/main/persistence/legacy/importer'
import {
  type PersistenceSession,
  closeLibraryPersistence,
  executePersistedCommand,
  openLibraryPersistence,
  readPersistenceSnapshot
} from '../src/main/persistence/persistence-coordinator'
import type { DesktopStateSnapshot } from '../src/main/persistence/repository'
import { openLibraryDatabase } from '../src/main/persistence/sqlite/database'

const IMAGE_SET: readonly unknown[] = []
const trackData = {
  album: {
    external_urls: { spotify: 'album-url' },
    id: 'album-1',
    images: IMAGE_SET,
    name: 'Album'
  },
  artists: [
    {
      external_urls: { spotify: 'artist-url' },
      id: 'artist-1',
      name: 'Artist'
    }
  ],
  duration_ms: 1000,
  external_urls: { spotify: 'track-url' },
  id: 'track-1',
  name: 'Track',
  preview_url: ''
}
const membershipTrack = {
  ...trackData,
  id: 'membership-only',
  name: 'Membership only'
}
const YOUTUBE_IMAGE = { height: 1, url: 'image-url', width: 1 }
const youtubeSnippet = {
  thumbnails: {
    default: YOUTUBE_IMAGE,
    medium: YOUTUBE_IMAGE,
    high: YOUTUBE_IMAGE,
    standard: YOUTUBE_IMAGE
  }
}
const youtubeResult = {
  id: 'youtube-1',
  duration: 90,
  snippet: youtubeSnippet,
  youtube_id: 'youtube-1'
}
const customResult = {
  id: 'youtube-1',
  duration: 120,
  snippet: youtubeSnippet,
  youtube_id: 'youtube-1',
  isCustomTrack: true
}
const playlistOwner = {
  display_name: 'Test User',
  external_urls: { spotify: 'user-url' },
  href: 'user-href',
  id: 'user-1',
  type: 'user',
  uri: 'user-uri'
}
const playlist = {
  collaborative: false,
  description: '',
  external_urls: { spotify: 'playlist-url' },
  href: 'playlist-href',
  id: 'pl-1',
  images: IMAGE_SET,
  name: 'Playlist',
  owner: playlistOwner,
  primary_color: null,
  public: true,
  snapshot_id: 'snapshot-1',
  tracks: {
    href: '',
    total: 2,
    items: [trackData, membershipTrack],
    added: [],
    removed: []
  },
  type: 'playlist',
  uri: 'playlist-uri'
}
const fixtureState = {
  user: {
    country: 'US',
    display_name: 'Test User',
    email: 'test@example.invalid',
    external_urls: { spotify: 'user-url' },
    followers: { href: null, total: 0 },
    href: 'user-href',
    id: 'user-1',
    images: IMAGE_SET,
    product: 'premium',
    type: 'user',
    uri: 'user-uri'
  },
  playlists: [playlist],
  syncedPlaylists: ['pl-1'],
  queuedPlaylists: [],
  cachedPlaylists: [{ id: 'pl-1', time: 1234, snapshot_id: 'snapshot-1' }],
  deletedPlaylists: [],
  convertedTracks: [
    {
      id: 'track-1',
      data: trackData,
      playlists: [{ id: 'pl-1' }],
      conversion: {
        id: 'conversion-1',
        bestMatch: 'youtube-1',
        nameTokens: [],
        yt: [youtubeResult]
      },
      selection: null,
      custom: customResult,
      query: null,
      flags: {
        converted: false,
        conversionError: false,
        processed: false,
        paused: false,
        selectionIsApplied: false
      },
      duration: null
    }
  ],
  currentPlaylist: 'pl-1',
  control: { total: 1, offset: 1 },
  lastSync: 1234567890
}

const copyFixture = async (): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'songbasket-test-'))
  await writeFile(join(directory, '.songbasket'), JSON.stringify(fixtureState))
  return directory
}

const snapshot = (state: DesktopStateSnapshot): string => JSON.stringify(state)

type Opened = Readonly<{ directory: string; session: PersistenceSession }>

const openImported = async (): Promise<Opened> => {
  const directory = await copyFixture()
  const result = await openLibraryPersistence(directory)
  if (result.isErr()) {
    let fieldPath = ''
    if ('fieldPath' in result.error) fieldPath = result.error.fieldPath ?? ''
    throw new Error(`${result.error.message} ${fieldPath}`)
  }
  return { directory, session: result.value }
}

test('imports the fixture and preserves its relational snapshot', async () => {
  const { directory, session } = await openImported()
  const state = readPersistenceSnapshot(session)
  assert.equal(state.isOk(), true)
  if (state.isErr()) return
  assert.ok(state.value.user.id.length > 0)
  assert.ok(
    state.value.playlists.length + state.value.deletedPlaylists.length > 0
  )
  assert.ok(state.value.convertedTracks.length > 0)
  assert.equal(state.value.control.offset >= 0, true)
  const closed = await closeLibraryPersistence(session)
  assert.equal(closed.isOk(), true)
  await rm(directory, { recursive: true, force: true })
})
test('round-trips conversion results, custom matches, and registry membership', async () => {
  const { directory, session } = await openImported()
  const state = readPersistenceSnapshot(session)
  assert.equal(state.isOk(), true)
  if (state.isErr()) return
  const track = state.value.convertedTracks.find(
    (item) => item.id === 'track-1'
  )
  assert.ok(track)
  if (!track) return
  assert.equal(track.flags.converted, false)
  assert.ok(track.conversion)
  if (track.conversion === null) return
  assert.deepEqual(
    track.conversion.yt.map((result) => result.id),
    ['youtube-1']
  )
  assert.equal(track.custom?.id, 'youtube-1')
  assert.equal(
    state.value.convertedTracks.some((item) => item.id === 'membership-only'),
    false
  )
  const playlist = state.value.playlists.find((item) => item.id === 'pl-1')
  assert.ok(playlist)
  if (!playlist) return
  assert.deepEqual(
    playlist.tracks.items.map((item) => item.id),
    ['track-1', 'membership-only']
  )
  const closed = await closeLibraryPersistence(session)
  assert.equal(closed.isOk(), true)
  await rm(directory, { recursive: true, force: true })
})

test('targeted writes survive reopen without changing unrelated state', async () => {
  const { directory, session } = await openImported()
  const before = readPersistenceSnapshot(session)
  assert.equal(before.isOk(), true)
  if (before.isErr()) return
  const track = before.value.convertedTracks[0]
  assert.ok(track)
  if (!track) return
  const playlist = before.value.playlists[0]
  assert.ok(playlist)
  if (!playlist) return
  const write = await executePersistedCommand(session, {
    kind: 'set-track-paused',
    command: { trackId: track.id, paused: !track.flags.paused }
  })
  assert.equal(write.isOk(), true)
  const closed = await closeLibraryPersistence(session)
  assert.equal(closed.isOk(), true)
  const reopened = await openLibraryPersistence(directory)
  assert.equal(reopened.isOk(), true)
  if (reopened.isErr()) return
  const after = readPersistenceSnapshot(reopened.value)
  assert.equal(after.isOk(), true)
  if (after.isErr()) return
  const changed = after.value.convertedTracks.find(
    (item) => item.id === track.id
  )
  assert.ok(changed)
  if (!changed) return
  assert.equal(changed.flags.paused, !track.flags.paused)
  assert.equal(after.value.user.id, before.value.user.id)
  assert.equal(after.value.playlists.length, before.value.playlists.length)
  const closedAgain = await closeLibraryPersistence(reopened.value)
  assert.equal(closedAgain.isOk(), true)
  await rm(directory, { recursive: true, force: true })
})

test('a failed relational write rolls back', async () => {
  const { directory, session } = await openImported()
  const before = readPersistenceSnapshot(session)
  assert.equal(before.isOk(), true)
  if (before.isErr()) return
  const invalid = structuredClone(before.value)
  invalid.currentPlaylist = 'missing-playlist'
  const write = await executePersistedCommand(session, {
    kind: 'replace-playlist-page',
    command: { state: invalid, previousState: before.value }
  })
  assert.equal(write.isErr(), true)
  const after = readPersistenceSnapshot(session)
  assert.equal(after.isOk(), true)
  if (after.isErr()) return
  assert.equal(snapshot(after.value), snapshot(before.value))
  const closed = await closeLibraryPersistence(session)
  assert.equal(closed.isOk(), true)
  await rm(directory, { recursive: true, force: true })
})

test('failed import preserves source and removes temporary database', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'songbasket-import-failure-'))
  const source = join(directory, '.songbasket')
  await writeFile(source, '{"not":"a save file"}')
  const before = await readFile(source)
  const result = await importLegacyStateIfNeeded({
    libraryPath: directory,
    stopLegacyWriter: () =>
      ResultAsync.fromSafePromise(Promise.resolve(undefined))
  })
  assert.equal(result.isErr(), true)
  assert.deepEqual(await readFile(source), before)
  await assert.rejects(readFile(join(directory, '.songbasket.db')))
  await assert.rejects(readFile(join(directory, '.songbasket.db.importing')))
  await rm(directory, { recursive: true, force: true })
})

test('leftover imports are replaced and newer databases are refused', async () => {
  const directory = await copyFixture()
  await writeFile(join(directory, '.songbasket.db.importing'), 'stale')
  const imported = await openLibraryPersistence(directory)
  assert.equal(imported.isOk(), true)
  if (imported.isOk()) {
    const closed = await closeLibraryPersistence(imported.value)
    assert.equal(closed.isOk(), true)
  }
  const newer = join(directory, 'newer.db')
  const database = new DatabaseSync(newer)
  database.exec('PRAGMA user_version = 99')
  database.close()
  const refused = await openLibraryDatabase(newer)
  assert.equal(refused.isErr(), true)
  await rm(directory, { recursive: true, force: true })
})
