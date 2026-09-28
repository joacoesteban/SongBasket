import { Result } from 'neverthrow'
import type { SQLOutputValue } from 'node:sqlite'

import type {
  SongBasketSaveFile,
  SongBasketTrack
} from '../../@types/SongBasket'
import type {
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUser
} from '../../@types/Spotify'
import type {
  TrackConversionResponse,
  YouTubeResult
} from '../../@types/YouTube'
import type { LibraryDatabase } from './sqlite/database'
import { type PersistenceError, persistenceError } from './sqlite/errors'

export type DesktopStateSnapshot = SongBasketSaveFile
export type ReplacePlaylistPage = Readonly<{
  state: SongBasketSaveFile
  previousState?: SongBasketSaveFile
}>
export type ReplacePlaylistTracks = Readonly<{
  state: SongBasketSaveFile
  previousState?: SongBasketSaveFile
  playlistId?: string
}>
export type SetPlaylistCache = Readonly<{
  playlistId: string
  time: number
  snapshotId: string
}>
export type ReplaceConversions = Readonly<{
  state: SongBasketSaveFile
  previousState?: SongBasketSaveFile
}>
export type SetTrackSelection = Readonly<{
  trackId: string
  selection: null | false | string
  applied: boolean
}>
export type SetCustomTrack = Readonly<{
  trackId: string
  result: YouTubeResult
}>

export type CommitTrackChanges = Readonly<{
  state: SongBasketSaveFile
  previousState?: SongBasketSaveFile
}>

export type PersistenceWriteError = PersistenceError

type Row = Record<string, SQLOutputValue>
type RecordValue = Record<string, unknown>
const storedRecord = (value: unknown): RecordValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Stored JSON is not an object')
  return Object.fromEntries(Object.entries(value))
}
const storedString = (value: unknown): string => {
  if (typeof value !== 'string')
    throw new Error('Stored JSON value is not a string')
  return value
}
const storedNumber = (value: unknown): number => {
  if (typeof value !== 'number')
    throw new Error('Stored JSON value is not a number')
  return value
}
const storedBoolean = (value: unknown): boolean => {
  if (typeof value !== 'boolean')
    throw new Error('Stored JSON value is not a boolean')
  return value
}
const storedDimension = (value: unknown): number => {
  if (value === null) return 0
  return storedNumber(value)
}
const storedImage = (
  value: unknown
): { height: number; url: string; width: number } => {
  const source = storedRecord(value)
  return {
    height: storedDimension(source['height']),
    url: storedString(source['url']),
    width: storedDimension(source['width'])
  }
}
const storedImages = (
  value: unknown
): { height: number; url: string; width: number }[] => {
  if (!Array.isArray(value)) throw new Error('Stored images are not an array')
  return value.map(storedImage)
}
const storedExternalUrls = (value: unknown): { spotify: string } => {
  const source = storedRecord(value)
  return { spotify: storedString(source['spotify']) }
}
const storedTrack = (value: unknown): SpotifyTrack => {
  const source = storedRecord(value)
  const album = storedRecord(source['album'])
  const artistsValue = source['artists']
  if (!Array.isArray(artistsValue))
    throw new Error('Stored artists are not an array')
  const artists = artistsValue.map((entry) => {
    const artist = storedRecord(entry)
    return {
      external_urls: storedExternalUrls(artist['external_urls']),
      id: storedString(artist['id']),
      name: storedString(artist['name'])
    }
  })
  const known: SpotifyTrack = {
    album: {
      external_urls: storedExternalUrls(album['external_urls']),
      id: storedString(album['id']),
      images: storedImages(album['images']),
      name: storedString(album['name'])
    },
    artists,
    duration_ms: storedNumber(source['duration_ms']),
    external_urls: storedExternalUrls(source['external_urls']),
    id: storedString(source['id']),
    name: storedString(source['name']),
    preview_url: storedString(source['preview_url'])
  }
  return Object.assign(known, source)
}
const storedYoutubeResult = (value: unknown): YouTubeResult => {
  const source = storedRecord(value)
  const snippet = storedRecord(source['snippet'])
  const thumbnails = storedRecord(snippet['thumbnails'])
  const localized = storedRecord(snippet['localized'])
  const tagsValue = snippet['tags']
  if (!Array.isArray(tagsValue)) throw new Error('Stored tags are not an array')
  const namesValue = source['nameTokensMap']
  let nameTokensMap: boolean[] = []
  if (Array.isArray(namesValue)) nameTokensMap = namesValue.map(storedBoolean)
  const known: YouTubeResult = {
    id: storedString(source['id']),
    duration: storedNumber(source['duration']),
    snippet: {
      publishedAt: storedString(snippet['publishedAt']),
      channelId: storedString(snippet['channelId']),
      title: storedString(snippet['title']),
      description: storedString(snippet['description']),
      thumbnails: {
        default: storedImage(thumbnails['default']),
        medium: storedImage(thumbnails['medium']),
        high: storedImage(thumbnails['high']),
        standard: storedImage(thumbnails['standard'])
      },
      channelTitle: storedString(snippet['channelTitle']),
      tags: tagsValue.map(storedString),
      categoryId: storedString(snippet['categoryId']),
      liveBroadcastContent: storedString(snippet['liveBroadcastContent']),
      localized: {
        title: storedString(localized['title']),
        description: storedString(localized['description'])
      }
    },
    youtube_id: storedString(source['youtube_id']),
    nameFormatted: storedString(source['nameFormatted']),
    nameTokensMap,
    matchedTokensCount: storedNumber(source['matchedTokensCount']),
    durationDiff: storedNumber(source['durationDiff']),
    durationScore: storedNumber(source['durationScore']),
    wordScore: storedNumber(source['wordScore']),
    isDoubtlyConversion: storedBoolean(source['isDoubtlyConversion']),
    isBestMatch: storedBoolean(source['isBestMatch'])
  }
  const customValue = source['isCustomTrack']
  if (customValue === undefined) return Object.assign(known, source)
  return Object.assign(known, source, {
    isCustomTrack: storedBoolean(customValue)
  })
}
const storedTokens = (value: unknown): { str: string; regex: string }[] => {
  if (!Array.isArray(value)) throw new Error('Stored tokens are not an array')
  return value.map((entry) => {
    const token = storedRecord(entry)
    return {
      str: storedString(token['str']),
      regex: storedString(token['regex'])
    }
  })
}
const storedUser = (payload: RecordValue, row: Row): SpotifyUser => {
  const followers = storedRecord(JSON.parse(rowString(row, 'followers_json')))
  let followerHref: string | null = null
  if (followers['href'] !== null) followerHref = storedString(followers['href'])
  return Object.assign(payload, {
    country: rowString(row, 'country'),
    display_name: rowString(row, 'display_name'),
    email: rowString(row, 'email'),
    external_urls: storedExternalUrls(
      JSON.parse(rowString(row, 'external_urls_json'))
    ),
    followers: {
      href: followerHref,
      total: storedNumber(followers['total'])
    },
    href: rowString(row, 'href'),
    id: rowString(row, 'id'),
    images: storedImages(JSON.parse(rowString(row, 'images_json'))),
    product: rowString(row, 'product'),
    type: rowString(row, 'type'),
    uri: rowString(row, 'uri')
  })
}
const storedOwner = (value: unknown) => {
  const source = storedRecord(value)
  return {
    display_name: storedString(source['display_name']),
    external_urls: storedExternalUrls(source['external_urls']),
    href: storedString(source['href']),
    id: storedString(source['id']),
    type: storedString(source['type']),
    uri: storedString(source['uri'])
  }
}
const storedPlaylist = (value: unknown): SpotifyPlaylist => {
  const source = storedRecord(value)
  const tracks = storedRecord(source['tracks'])
  const itemsValue = tracks['items']
  const addedValue = tracks['added']
  const removedValue = tracks['removed']
  if (
    !Array.isArray(itemsValue) ||
    !Array.isArray(addedValue) ||
    !Array.isArray(removedValue)
  )
    throw new Error('Stored playlist tracks are invalid')
  let primaryColor: string | null = null
  if (source['primary_color'] !== null) {
    primaryColor = storedString(source['primary_color'])
  }
  const known: SpotifyPlaylist = {
    collaborative: storedBoolean(source['collaborative']),
    description: storedString(source['description']),
    external_urls: storedExternalUrls(source['external_urls']),
    href: storedString(source['href']),
    id: storedString(source['id']),
    images: storedImages(source['images']),
    name: storedString(source['name']),
    owner: storedOwner(source['owner']),
    primary_color: primaryColor,
    public: storedBoolean(source['public']),
    snapshot_id: storedString(source['snapshot_id']),
    tracks: {
      href: storedString(tracks['href']),
      total: storedNumber(tracks['total']),
      items: itemsValue.map(storedTrack),
      added: addedValue.map(storedTrack),
      removed: removedValue.map(storedTrack)
    },
    type: 'playlist',
    uri: storedString(source['uri'])
  }
  return Object.assign(known, source)
}

const rowValue = (row: Row, key: string): SQLOutputValue => {
  const value = row[key]
  if (value === undefined) throw new Error(`Missing column ${key}`)
  return value
}
const rowString = (row: Row, key: string): string => {
  const value = rowValue(row, key)
  if (typeof value !== 'string')
    throw new Error(`Expected string column ${key}`)
  return value
}
const rowNumber = (row: Row, key: string): number => {
  const value = rowValue(row, key)
  if (typeof value !== 'number')
    throw new Error(`Expected number column ${key}`)
  return value
}
const rowNullableNumber = (row: Row, key: string): number | null => {
  const value = rowValue(row, key)
  if (value === null) return null
  if (typeof value !== 'number')
    throw new Error(`Expected nullable number column ${key}`)
  return value
}
const rowNullableString = (row: Row, key: string): string | null => {
  const value = rowValue(row, key)
  if (value === null) return null
  if (typeof value !== 'string')
    throw new Error(`Expected nullable string column ${key}`)
  return value
}
const bool = (value: number): boolean => value === 1
const recordPayload = (value: string): RecordValue => {
  const parsed: unknown = JSON.parse(value)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error('Payload is not an object')
  return Object.fromEntries(Object.entries(parsed))
}
const json = (value: unknown): string => {
  const encoded = JSON.stringify(value)
  if (encoded === undefined) throw new Error('Value cannot be encoded as JSON')
  return encoded
}

const insertTrack = (
  database: LibraryDatabase,
  track: SongBasketTrack,
  registryTrack = true
): void => {
  let selectionKind: 'unset' | 'disabled' | 'youtube' = 'unset'
  if (track.selection === false) selectionKind = 'disabled'
  if (typeof track.selection === 'string') selectionKind = 'youtube'
  let selectionId: string | null = null
  if (typeof track.selection === 'string') selectionId = track.selection
  database
    .prepare(
      `INSERT INTO track (spotify_id,name,duration_ms,query_text,query_duration,query_duration_s,selection_kind,selection_youtube_id,converted,registry_track,conversion_error,processed,paused,selection_applied,duration_s,payload_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      track.id,
      track.data.name,
      track.data.duration_ms,
      track.query?.query ?? null,
      track.query?.duration ?? null,
      track.query?.duration_s ?? null,
      selectionKind,
      selectionId,
      Number(track.flags.converted),
      Number(registryTrack),
      Number(track.flags.conversionError),
      Number(track.flags.processed),
      Number(track.flags.paused),
      Number(track.flags.selectionIsApplied),
      track.duration,
      json(track.data)
    )
  track.conversion?.yt.forEach((result) =>
    insertResult(database, track.id, result, 'conversion')
  )
  if (track.conversion !== null) {
    database
      .prepare(
        'INSERT INTO youtube_conversion (track_id,conversion_id,best_match_youtube_id,name_tokens_json,updated_at_ms) VALUES (?,?,?,?,?)'
      )
      .run(
        track.id,
        track.conversion.id,
        track.conversion.bestMatch,
        json(track.conversion.nameTokens),
        Date.now()
      )
  }
  if (track.custom !== null)
    insertResult(database, track.id, track.custom, 'custom')
}

const insertResult = (
  database: LibraryDatabase,
  trackId: string,
  result: YouTubeResult,
  resultKind: 'conversion' | 'custom'
): void => {
  database
    .prepare(
      'INSERT OR REPLACE INTO youtube_result (track_id,youtube_id,result_kind,duration,matched_tokens_count,duration_diff,duration_score,word_score,is_doubtful_conversion,is_best_match,is_custom_track,snippet_json,payload_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )
    .run(
      trackId,
      result.id,
      resultKind,
      result.duration,
      result.matchedTokensCount,
      result.durationDiff,
      result.durationScore,
      result.wordScore,
      Number(result.isDoubtlyConversion),
      Number(result.isBestMatch),
      Number(result.isCustomTrack === true),
      json(result.snippet),
      json(result)
    )
}

export const insertLegacyState = (
  database: LibraryDatabase,
  state: SongBasketSaveFile
): Result<void, PersistenceError> =>
  Result.fromThrowable(
    () => {
      database.exec('BEGIN IMMEDIATE')
      try {
        database.prepare('DELETE FROM library_state').run()
        database.prepare('DELETE FROM playlist_track').run()
        database.prepare('DELETE FROM youtube_result').run()
        database.prepare('DELETE FROM youtube_conversion').run()
        database.prepare('DELETE FROM track').run()
        database.prepare('DELETE FROM playlist').run()
        database.prepare('DELETE FROM spotify_user').run()
        database
          .prepare(
            'INSERT INTO spotify_user (id,country,display_name,email,href,product,type,uri,external_urls_json,followers_json,images_json,payload_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
          )
          .run(
            state.user.id,
            state.user.country,
            state.user.display_name,
            state.user.email,
            state.user.href,
            state.user.product,
            state.user.type,
            state.user.uri,
            json(state.user.external_urls),
            json(state.user.followers),
            json(state.user.images),
            json(state.user)
          )
        const synced = new Map(
          state.syncedPlaylists.map((id, index) => [id, index])
        )
        const queued = new Map(
          state.queuedPlaylists.map((id, index) => [id, index])
        )
        const cached = new Map(
          state.cachedPlaylists.map((entry) => [entry.id, entry])
        )
        const playlists = [
          ...state.playlists.map((playlist) => ({ playlist, deleted: false })),
          ...state.deletedPlaylists.map((playlist) => ({
            playlist,
            deleted: true
          }))
        ]
        playlists.forEach(({ playlist, deleted }) => {
          const syncOrder = synced.get(playlist.id) ?? null
          const queueOrder = queued.get(playlist.id) ?? null
          const cache = cached.get(playlist.id)
          database
            .prepare(
              'INSERT INTO playlist (id,user_id,name,description,href,snapshot_id,tracks_href,tracks_total,collaborative,is_public,type,uri,primary_color,folder_name,is_synced,sync_order,is_queued,queue_order,is_paused,is_deleted,cached_at_ms,cached_snapshot_id,owner_json,external_urls_json,images_json,payload_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
            )
            .run(
              playlist.id,
              state.user.id,
              playlist.name,
              playlist.description,
              playlist.href,
              playlist.snapshot_id,
              playlist.tracks.href,
              playlist.tracks.total,
              Number(playlist.collaborative),
              Number(playlist.public),
              playlist.type,
              playlist.uri,
              playlist.primary_color,
              playlist.folderName ?? null,
              Number(syncOrder !== null),
              syncOrder,
              Number(queueOrder !== null),
              queueOrder,
              Number(playlist.isPaused === true),
              Number(deleted),
              cache?.time ?? null,
              cache?.snapshot_id ?? null,
              json(playlist.owner),
              json(playlist.external_urls),
              json(playlist.images),
              json(playlist)
            )
        })
        state.convertedTracks.forEach((track) => insertTrack(database, track))
        state.playlists.concat(state.deletedPlaylists).forEach((playlist) => {
          const lists: readonly [readonly SpotifyTrack[], string][] = [
            [playlist.tracks.items, 'active'],
            [playlist.tracks.added, 'added'],
            [playlist.tracks.removed, 'removed']
          ]
          lists.forEach(([tracks, kind]) =>
            tracks.forEach((track, position) => {
              const known = state.convertedTracks.find(
                (savedTrack) => savedTrack.id === track.id
              )
              if (known === undefined)
                insertTrack(
                  database,
                  {
                    id: track.id,
                    data: track,
                    playlists: [],
                    conversion: null,
                    selection: null,
                    custom: null,
                    query: null,
                    flags: {
                      converted: false,
                      conversionError: false,
                      processed: false,
                      paused: false,
                      selectionIsApplied: false
                    },
                    duration: null
                  },
                  false
                )
              const registryOrder =
                known?.playlists.findIndex(
                  (membership) => membership.id === playlist.id
                ) ?? -1
              let persistedRegistryOrder: number | null = registryOrder
              if (registryOrder < 0) persistedRegistryOrder = null
              database
                .prepare(
                  'INSERT INTO playlist_track (playlist_id,track_id,position,membership_kind,registry_order) VALUES (?,?,?,?,?)'
                )
                .run(
                  playlist.id,
                  track.id,
                  position,
                  kind,
                  persistedRegistryOrder
                )
            })
          )
        })
        database
          .prepare(
            'INSERT INTO library_state (state_id,user_id,current_playlist_id,control_total,control_offset,last_sync_ms) VALUES (1,?,?,?,?,?)'
          )
          .run(
            state.user.id,
            state.currentPlaylist,
            state.control.total,
            state.control.offset,
            state.lastSync?.getTime() ?? null
          )
        database.exec('COMMIT')
      } catch (error: unknown) {
        database.exec('ROLLBACK')
        throw error
      }
    },
    (error: unknown) => persistenceError('Writing legacy state failed', error)
  )()

export const readSnapshot = (
  database: LibraryDatabase
): Result<DesktopStateSnapshot, PersistenceError> =>
  Result.fromThrowable(
    () => {
      const userRow = database
        .prepare('SELECT * FROM spotify_user LIMIT 1')
        .get()
      if (userRow === undefined) throw new Error('Database has no user')
      const userPayload = recordPayload(rowString(userRow, 'payload_json'))
      const user = storedUser(userPayload, userRow)
      const playlistRows = database
        .prepare('SELECT * FROM playlist ORDER BY rowid')
        .all()
      const memberships = database
        .prepare(
          'SELECT * FROM playlist_track ORDER BY playlist_id,membership_kind,position'
        )
        .all()
      const registryTrackIds = new Set<string>()
      const tracks = new Map<string, SongBasketTrack>()
      database
        .prepare('SELECT * FROM track ORDER BY rowid')
        .all()
        .forEach((row) => {
          const payload = recordPayload(rowString(row, 'payload_json'))
          const selectionKind = rowString(row, 'selection_kind')
          let selection: null | false | string = null
          if (selectionKind === 'disabled') selection = false
          if (selectionKind === 'youtube')
            selection = rowString(row, 'selection_youtube_id')
          const conversionRow = database
            .prepare('SELECT * FROM youtube_conversion WHERE track_id = ?')
            .get(rowString(row, 'spotify_id'))
          let conversion: TrackConversionResponse | null = null
          if (conversionRow !== undefined) {
            const results = database
              .prepare(
                "SELECT * FROM youtube_result WHERE track_id = ? AND result_kind = 'conversion' ORDER BY rowid"
              )
              .all(rowString(row, 'spotify_id'))
              .map((result) =>
                storedYoutubeResult(
                  recordPayload(rowString(result, 'payload_json'))
                )
              )
            const bestMatchValue = rowNullableString(
              conversionRow,
              'best_match_youtube_id'
            )
            const bestMatch = bestMatchValue ?? ''
            conversion = {
              id: rowString(conversionRow, 'conversion_id'),
              bestMatch,
              nameTokens: storedTokens(
                JSON.parse(rowString(conversionRow, 'name_tokens_json'))
              ),
              yt: results
            }
          }
          const customRow = database
            .prepare(
              "SELECT * FROM youtube_result WHERE track_id = ? AND result_kind = 'custom' LIMIT 1"
            )
            .get(rowString(row, 'spotify_id'))
          let custom: YouTubeResult | null = null
          if (customRow !== undefined)
            custom = storedYoutubeResult(
              recordPayload(rowString(customRow, 'payload_json'))
            )
          const queryText = rowNullableString(row, 'query_text')
          const queryDuration = rowNullableString(row, 'query_duration')
          const queryDurationS = rowNullableNumber(row, 'query_duration_s')
          let query: SongBasketTrack['query'] = null
          if (
            queryText !== null &&
            queryDuration !== null &&
            queryDurationS !== null
          ) {
            if (
              queryDuration !== 'long' &&
              queryDuration !== 'medium' &&
              queryDuration !== 'short'
            )
              throw new Error('Invalid query duration')
            query = {
              query: queryText,
              duration: queryDuration,
              duration_s: queryDurationS,
              id: rowString(row, 'spotify_id')
            }
          }
          const track: SongBasketTrack = {
            id: rowString(row, 'spotify_id'),
            data: storedTrack(payload),
            playlists: [],
            conversion,
            selection,
            custom,
            query,
            flags: {
              converted: bool(rowNumber(row, 'converted')),
              conversionError: bool(rowNumber(row, 'conversion_error')),
              processed: bool(rowNumber(row, 'processed')),
              paused: bool(rowNumber(row, 'paused')),
              selectionIsApplied: bool(rowNumber(row, 'selection_applied'))
            },
            duration: rowNullableNumber(row, 'duration_s')
          }
          if (bool(rowNumber(row, 'registry_track')))
            registryTrackIds.add(track.id)
          tracks.set(track.id, track)
        })
      const membershipsByPlaylist = new Map<
        string,
        readonly {
          kind: string
          track: SongBasketTrack
          position: number
          registryOrder: number | null
        }[]
      >()
      const registryMembershipsByTrack = new Map<
        string,
        readonly { playlistId: string; order: number }[]
      >()
      memberships.forEach((row) => {
        const trackId = rowString(row, 'track_id')
        const playlistId = rowString(row, 'playlist_id')
        const track = tracks.get(trackId)
        if (track === undefined)
          throw new Error('Membership references missing track')
        const registryOrder = rowNullableNumber(row, 'registry_order')
        const current = membershipsByPlaylist.get(playlistId) ?? []
        membershipsByPlaylist.set(playlistId, [
          ...current,
          {
            kind: rowString(row, 'membership_kind'),
            track,
            position: rowNumber(row, 'position'),
            registryOrder
          }
        ])
        if (registryOrder !== null) {
          const trackMemberships = registryMembershipsByTrack.get(trackId) ?? []
          if (
            !trackMemberships.some(
              (membership) => membership.playlistId === playlistId
            )
          )
            registryMembershipsByTrack.set(trackId, [
              ...trackMemberships,
              { playlistId, order: registryOrder }
            ])
        }
      })
      registryMembershipsByTrack.forEach((membershipsForTrack, trackId) => {
        const track = tracks.get(trackId)
        if (track === undefined) throw new Error('Registry track disappeared')
        track.playlists = [...membershipsForTrack]
          .sort((left, right) => left.order - right.order)
          .map((membership) => ({ id: membership.playlistId }))
      })
      const playlists: SpotifyPlaylist[] = []
      const deletedPlaylists: SpotifyPlaylist[] = []
      const syncedPlaylists: string[] = []
      const queuedPlaylists: string[] = []
      const cachedPlaylists: {
        id: string
        time: number
        snapshot_id: string
      }[] = []
      playlistRows.forEach((row) => {
        const payload = recordPayload(rowString(row, 'payload_json'))
        const lists = membershipsByPlaylist.get(rowString(row, 'id')) ?? []
        const tracksFor = (kind: string): SpotifyTrack[] =>
          lists
            .filter((entry) => entry.kind === kind)
            .sort((a, b) => a.position - b.position)
            .map((entry) => entry.track.data)
        const playlist = storedPlaylist(payload)
        Object.assign(playlist.tracks, {
          items: tracksFor('active'),
          added: tracksFor('added'),
          removed: tracksFor('removed')
        })
        Object.assign(playlist, {
          id: rowString(row, 'id'),
          name: rowString(row, 'name'),
          snapshot_id: rowString(row, 'snapshot_id')
        })
        if (payload['isPaused'] !== undefined) {
          playlist.isPaused = bool(rowNumber(row, 'is_paused'))
        }
        if (payload['folderName'] !== undefined) {
          playlist.folderName = rowNullableString(row, 'folder_name')
        }
        if (bool(rowNumber(row, 'is_deleted'))) deletedPlaylists.push(playlist)
        else playlists.push(playlist)
        if (bool(rowNumber(row, 'is_synced')))
          syncedPlaylists.push(rowString(row, 'id'))
        if (bool(rowNumber(row, 'is_queued')))
          queuedPlaylists.push(rowString(row, 'id'))
        const cacheTime = rowNullableNumber(row, 'cached_at_ms')
        const cacheSnapshot = rowNullableString(row, 'cached_snapshot_id')
        if (cacheTime !== null && cacheSnapshot !== null)
          cachedPlaylists.push({
            id: rowString(row, 'id'),
            time: cacheTime,
            snapshot_id: cacheSnapshot
          })
      })
      const orderOf = (id: string, column: string): number => {
        const row = playlistRows.find((entry) => rowString(entry, 'id') === id)
        if (row === undefined) throw new Error('Playlist row disappeared')
        return rowNumber(row, column)
      }
      syncedPlaylists.sort(
        (left, right) =>
          orderOf(left, 'sync_order') - orderOf(right, 'sync_order')
      )
      queuedPlaylists.sort(
        (left, right) =>
          orderOf(left, 'queue_order') - orderOf(right, 'queue_order')
      )
      const stateRow = database
        .prepare('SELECT * FROM library_state WHERE state_id = 1')
        .get()
      if (stateRow === undefined)
        throw new Error('Database has no library state')
      const lastSyncMs = rowNullableNumber(stateRow, 'last_sync_ms')
      let lastSync: Date | null = null
      if (lastSyncMs !== null) lastSync = new Date(lastSyncMs)
      return {
        user,
        playlists,
        syncedPlaylists,
        queuedPlaylists,
        cachedPlaylists,
        deletedPlaylists,
        convertedTracks: [...registryTrackIds]
          .map((id) => tracks.get(id))
          .filter((track): track is SongBasketTrack => track !== undefined),
        currentPlaylist: rowNullableString(stateRow, 'current_playlist_id'),
        control: {
          total: rowNumber(stateRow, 'control_total'),
          offset: rowNumber(stateRow, 'control_offset')
        },
        lastSync
      }
    },
    (error: unknown) =>
      persistenceError('Reading database snapshot failed', error)
  )()
const allPlaylists = (
  state: SongBasketSaveFile
): readonly { playlist: SpotifyPlaylist; deleted: boolean }[] => [
  ...state.playlists.map((playlist) => ({ playlist, deleted: false })),
  ...state.deletedPlaylists.map((playlist) => ({ playlist, deleted: true }))
]

const upsertPlaylist = (
  database: LibraryDatabase,
  state: SongBasketSaveFile,
  playlist: SpotifyPlaylist,
  deleted: boolean
): void => {
  const syncOrder = state.syncedPlaylists.indexOf(playlist.id)
  const queueOrder = state.queuedPlaylists.indexOf(playlist.id)
  const cache = state.cachedPlaylists.find((entry) => entry.id === playlist.id)
  const orderValue = (order: number): number | null => {
    if (order < 0) return null
    return order
  }
  const syncValue = orderValue(syncOrder)
  const queueValue = orderValue(queueOrder)
  database
    .prepare(
      `INSERT INTO playlist (id,user_id,name,description,href,snapshot_id,tracks_href,tracks_total,collaborative,is_public,type,uri,primary_color,folder_name,is_synced,sync_order,is_queued,queue_order,is_paused,is_deleted,cached_at_ms,cached_snapshot_id,owner_json,external_urls_json,images_json,payload_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET user_id=excluded.user_id,name=excluded.name,description=excluded.description,href=excluded.href,snapshot_id=excluded.snapshot_id,tracks_href=excluded.tracks_href,tracks_total=excluded.tracks_total,collaborative=excluded.collaborative,is_public=excluded.is_public,type=excluded.type,uri=excluded.uri,primary_color=excluded.primary_color,folder_name=excluded.folder_name,is_synced=excluded.is_synced,sync_order=excluded.sync_order,is_queued=excluded.is_queued,queue_order=excluded.queue_order,is_paused=excluded.is_paused,is_deleted=excluded.is_deleted,cached_at_ms=excluded.cached_at_ms,cached_snapshot_id=excluded.cached_snapshot_id,owner_json=excluded.owner_json,external_urls_json=excluded.external_urls_json,images_json=excluded.images_json,payload_json=excluded.payload_json`
    )
    .run(
      playlist.id,
      state.user.id,
      playlist.name,
      playlist.description,
      playlist.href,
      playlist.snapshot_id,
      playlist.tracks.href,
      playlist.tracks.total,
      Number(playlist.collaborative),
      Number(playlist.public),
      playlist.type,
      playlist.uri,
      playlist.primary_color,
      playlist.folderName ?? null,
      Number(syncOrder >= 0),
      syncValue,
      Number(queueOrder >= 0),
      queueValue,
      Number(playlist.isPaused === true),
      Number(deleted),
      cache?.time ?? null,
      cache?.snapshot_id ?? null,
      json(playlist.owner),
      json(playlist.external_urls),
      json(playlist.images),
      json(playlist)
    )
}

const trackFromPlaylist = (track: SpotifyTrack): SongBasketTrack => ({
  id: track.id,
  data: track,
  playlists: [],
  conversion: null,
  selection: null,
  custom: null,
  query: null,
  flags: {
    converted: false,
    conversionError: false,
    processed: false,
    paused: false,
    selectionIsApplied: false
  },
  duration: null
})

const upsertTrackRow = (
  database: LibraryDatabase,
  track: SongBasketTrack,
  registryTrack = true
): void => {
  let selectionKind: 'unset' | 'disabled' | 'youtube' = 'unset'
  if (track.selection === false) selectionKind = 'disabled'
  if (typeof track.selection === 'string') selectionKind = 'youtube'
  let selectionId: string | null = null
  if (typeof track.selection === 'string') selectionId = track.selection
  database
    .prepare(
      `INSERT INTO track (spotify_id,name,duration_ms,query_text,query_duration,query_duration_s,selection_kind,selection_youtube_id,converted,registry_track,conversion_error,processed,paused,selection_applied,duration_s,payload_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(spotify_id) DO UPDATE SET name=excluded.name,duration_ms=excluded.duration_ms,query_text=excluded.query_text,query_duration=excluded.query_duration,query_duration_s=excluded.query_duration_s,selection_kind=excluded.selection_kind,selection_youtube_id=excluded.selection_youtube_id,converted=excluded.converted,registry_track=MAX(track.registry_track,excluded.registry_track),conversion_error=excluded.conversion_error,processed=excluded.processed,paused=excluded.paused,selection_applied=excluded.selection_applied,duration_s=excluded.duration_s,payload_json=excluded.payload_json`
    )
    .run(
      track.id,
      track.data.name,
      track.data.duration_ms,
      track.query?.query ?? null,
      track.query?.duration ?? null,
      track.query?.duration_s ?? null,
      selectionKind,
      selectionId,
      Number(track.flags.converted),
      Number(registryTrack),
      Number(track.flags.conversionError),
      Number(track.flags.processed),
      Number(track.flags.paused),
      Number(track.flags.selectionIsApplied),
      track.duration,
      json(track.data)
    )
}

const replaceTrackRelations = (
  database: LibraryDatabase,
  track: SongBasketTrack
): void => {
  database
    .prepare('DELETE FROM youtube_result WHERE track_id = ?')
    .run(track.id)
  database
    .prepare('DELETE FROM youtube_conversion WHERE track_id = ?')
    .run(track.id)
  track.conversion?.yt.forEach((result) =>
    insertResult(database, track.id, result, 'conversion')
  )
  if (track.conversion !== null)
    database
      .prepare(
        'INSERT INTO youtube_conversion (track_id,conversion_id,best_match_youtube_id,name_tokens_json,updated_at_ms) VALUES (?,?,?,?,?)'
      )
      .run(
        track.id,
        track.conversion.id,
        track.conversion.bestMatch,
        json(track.conversion.nameTokens),
        Date.now()
      )
  if (track.custom !== null)
    insertResult(database, track.id, track.custom, 'custom')
}

const trackMap = (
  state: SongBasketSaveFile
): ReadonlyMap<string, SongBasketTrack> =>
  new Map(state.convertedTracks.map((track) => [track.id, track]))

const playlistMap = (
  state: SongBasketSaveFile
): ReadonlyMap<string, SpotifyPlaylist> =>
  new Map(allPlaylists(state).map(({ playlist }) => [playlist.id, playlist]))

const encoded = (value: unknown): string => {
  const result = JSON.stringify(value)
  if (result === undefined) throw new Error('Value cannot be encoded')
  return result
}

const replaceMembership = (
  database: LibraryDatabase,
  playlist: SpotifyPlaylist,
  tracks: ReadonlyMap<string, SongBasketTrack>
): void => {
  database
    .prepare('DELETE FROM playlist_track WHERE playlist_id = ?')
    .run(playlist.id)
  const rows: readonly [readonly SpotifyTrack[], string][] = [
    [playlist.tracks.items, 'active'],
    [playlist.tracks.added, 'added'],
    [playlist.tracks.removed, 'removed']
  ]
  rows.forEach(([entries, kind]) =>
    entries.forEach((track, position) => {
      const stored = tracks.get(track.id) ?? trackFromPlaylist(track)
      const registryTrack = tracks.has(track.id)
      upsertTrackRow(database, stored, registryTrack)
      const registryOrder = stored.playlists.findIndex(
        (membership) => membership.id === playlist.id
      )
      let persistedRegistryOrder: number | null = registryOrder
      if (!registryTrack || registryOrder < 0) persistedRegistryOrder = null
      database
        .prepare(
          'INSERT INTO playlist_track (playlist_id,track_id,position,membership_kind,registry_order) VALUES (?,?,?,?,?)'
        )
        .run(playlist.id, track.id, position, kind, persistedRegistryOrder)
    })
  )
}

const writeStateDiff = (
  database: LibraryDatabase,
  previous: SongBasketSaveFile | undefined,
  next: SongBasketSaveFile,
  playlistId: string | undefined
): void => {
  let oldPlaylists: ReadonlyMap<string, SpotifyPlaylist>
  let oldTracks: ReadonlyMap<string, SongBasketTrack>
  if (previous !== undefined) {
    oldPlaylists = playlistMap(previous)
    oldTracks = trackMap(previous)
  } else {
    oldPlaylists = new Map<string, SpotifyPlaylist>()
    oldTracks = new Map<string, SongBasketTrack>()
  }
  const nextPlaylists = playlistMap(next)
  const nextTracks = trackMap(next)
  if (previous === undefined || encoded(previous.user) !== encoded(next.user))
    database
      .prepare(
        'UPDATE spotify_user SET country=?,display_name=?,email=?,href=?,product=?,type=?,uri=?,external_urls_json=?,followers_json=?,images_json=?,payload_json=? WHERE id=?'
      )
      .run(
        next.user.country,
        next.user.display_name,
        next.user.email,
        next.user.href,
        next.user.product,
        next.user.type,
        next.user.uri,
        json(next.user.external_urls),
        json(next.user.followers),
        json(next.user.images),
        json(next.user),
        next.user.id
      )
  allPlaylists(next).forEach(({ playlist, deleted }) => {
    const old = oldPlaylists.get(playlist.id)
    if (old === undefined || encoded(old) !== encoded(playlist))
      upsertPlaylist(database, next, playlist, deleted)
  })
  const ids = new Set([...oldPlaylists.keys(), ...nextPlaylists.keys()])
  ids.forEach((id) => {
    if (nextPlaylists.has(id)) return
    database.prepare('DELETE FROM playlist WHERE id = ?').run(id)
  })
  nextTracks.forEach((track, id) => {
    const old = oldTracks.get(id)
    if (old === undefined || encoded(old) !== encoded(track)) {
      upsertTrackRow(database, track)
      replaceTrackRelations(database, track)
    }
  })
  oldTracks.forEach((_, id) => {
    if (!nextTracks.has(id))
      database.prepare('DELETE FROM track WHERE spotify_id = ?').run(id)
  })
  let membershipIds: ReadonlySet<string>
  if (playlistId === undefined)
    membershipIds = new Set([...oldPlaylists.keys(), ...nextPlaylists.keys()])
  else membershipIds = new Set([playlistId])
  membershipIds.forEach((id) => {
    const old = oldPlaylists.get(id)
    const current = nextPlaylists.get(id)
    if (current === undefined) return
    if (
      old === undefined ||
      encoded(old.tracks.items) !== encoded(current.tracks.items) ||
      encoded(old.tracks.added) !== encoded(current.tracks.added) ||
      encoded(old.tracks.removed) !== encoded(current.tracks.removed)
    )
      replaceMembership(database, current, nextTracks)
  })
  database
    .prepare(
      'UPDATE library_state SET user_id=?,current_playlist_id=?,control_total=?,control_offset=?,last_sync_ms=? WHERE state_id=1'
    )
    .run(
      next.user.id,
      next.currentPlaylist,
      next.control.total,
      next.control.offset,
      next.lastSync?.getTime() ?? null
    )
}

const transaction = (
  database: LibraryDatabase,
  action: () => void
): Result<void, PersistenceError> =>
  Result.fromThrowable(
    () => {
      database.exec('BEGIN IMMEDIATE')
      try {
        action()
        database.exec('COMMIT')
      } catch (error: unknown) {
        database.exec('ROLLBACK')
        throw error
      }
    },
    (error: unknown) => persistenceError('Database write failed', error)
  )()

export const replacePlaylistPage = (
  database: LibraryDatabase,
  command: ReplacePlaylistPage
): Result<void, PersistenceError> =>
  transaction(database, () =>
    writeStateDiff(database, command.previousState, command.state, undefined)
  )

export const replacePlaylistTracks = (
  database: LibraryDatabase,
  command: ReplacePlaylistTracks
): Result<void, PersistenceError> =>
  transaction(database, () =>
    writeStateDiff(
      database,
      command.previousState,
      command.state,
      command.playlistId
    )
  )

export const replaceConversions = (
  database: LibraryDatabase,
  command: ReplaceConversions
): Result<void, PersistenceError> =>
  transaction(database, () =>
    writeStateDiff(database, command.previousState, command.state, undefined)
  )

export const commitTrackChanges = (
  database: LibraryDatabase,
  command: CommitTrackChanges
): Result<void, PersistenceError> =>
  transaction(database, () =>
    writeStateDiff(database, command.previousState, command.state, undefined)
  )

export const setPlaylistCache = (
  database: LibraryDatabase,
  command: SetPlaylistCache
): Result<void, PersistenceError> =>
  transaction(database, () => {
    database
      .prepare(
        'UPDATE playlist SET cached_at_ms = ?, cached_snapshot_id = ? WHERE id = ?'
      )
      .run(command.time, command.snapshotId, command.playlistId)
  })

export const clearPlaylistCache = (
  database: LibraryDatabase,
  playlistId: string
): Result<void, PersistenceError> =>
  transaction(database, () => {
    database
      .prepare(
        'UPDATE playlist SET cached_at_ms = NULL, cached_snapshot_id = NULL WHERE id = ?'
      )
      .run(playlistId)
  })

export const setTrackSelection = (
  database: LibraryDatabase,
  command: SetTrackSelection
): Result<void, PersistenceError> =>
  transaction(database, () => {
    let kind: 'unset' | 'disabled' | 'youtube' = 'unset'
    if (command.selection === false) kind = 'disabled'
    if (typeof command.selection === 'string') kind = 'youtube'
    let id: string | null = null
    if (typeof command.selection === 'string') id = command.selection
    database
      .prepare(
        'UPDATE track SET selection_kind = ?, selection_youtube_id = ?, selection_applied = ? WHERE spotify_id = ?'
      )
      .run(kind, id, Number(command.applied), command.trackId)
  })

export const setPlaylistPaused = (
  database: LibraryDatabase,
  playlistId: string,
  paused: boolean
): Result<void, PersistenceError> =>
  transaction(database, () => {
    database
      .prepare('UPDATE playlist SET is_paused = ? WHERE id = ?')
      .run(Number(paused), playlistId)
  })

export const setTrackPaused = (
  database: LibraryDatabase,
  trackId: string,
  paused: boolean
): Result<void, PersistenceError> =>
  transaction(database, () => {
    database
      .prepare('UPDATE track SET paused = ? WHERE spotify_id = ?')
      .run(Number(paused), trackId)
  })

export const setCustomTrack = (
  database: LibraryDatabase,
  command: SetCustomTrack
): Result<void, PersistenceError> =>
  transaction(database, () => {
    insertResult(database, command.trackId, command.result, 'custom')
    database
      .prepare(
        "UPDATE track SET selection_kind = 'disabled', selection_youtube_id = NULL WHERE spotify_id = ?"
      )
      .run(command.trackId)
  })
