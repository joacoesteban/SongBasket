import { Result } from 'neverthrow'

import type {
  SongBasketSaveFile,
  SongBasketTrack,
  SongBasketTrackQuery
} from '../../../@types/SongBasket'
import type {
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUser
} from '../../../@types/Spotify'
import type {
  TrackConversionResponse,
  YouTubeResult
} from '../../../@types/YouTube'
import { type LegacyImportError, legacyImportError } from '../sqlite/errors'

type RecordValue = Record<string, unknown>
export type LegacyState = SongBasketSaveFile

class DecodeFailure extends Error {
  readonly fieldPath: string

  constructor(fieldPath: string, message: string) {
    super(message)
    this.fieldPath = fieldPath
  }
}

const fail = (fieldPath: string, message: string): never => {
  throw new DecodeFailure(fieldPath, message)
}

const record = (value: unknown, fieldPath: string): RecordValue => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(fieldPath, 'expected an object')
  }
  return Object.fromEntries(Object.entries(value))
}

const valueAt = (
  source: RecordValue,
  key: string,
  fieldPath: string
): unknown => {
  if (!(key in source)) {
    return fail(`${fieldPath}.${key}`, 'is required')
  }
  return source[key]
}

const stringValue = (value: unknown, fieldPath: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    return fail(fieldPath, 'expected a non-empty string')
  }
  return value
}

const textValue = (value: unknown, fieldPath: string): string => {
  if (typeof value !== 'string') {
    return fail(fieldPath, 'expected a string')
  }
  return value
}

const numberValue = (value: unknown, fieldPath: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(fieldPath, 'expected a finite number')
  }
  return value
}

const integerValue = (value: unknown, fieldPath: string): number => {
  const number = numberValue(value, fieldPath)
  if (!Number.isInteger(number) || number < 0) {
    return fail(fieldPath, 'expected a non-negative integer')
  }
  return number
}

const booleanValue = (value: unknown, fieldPath: string): boolean => {
  if (typeof value !== 'boolean') {
    return fail(fieldPath, 'expected a boolean')
  }
  return value
}

const nullableString = (value: unknown, fieldPath: string): string | null => {
  if (value === null) return null
  return stringValue(value, fieldPath)
}

const arrayValue = (value: unknown, fieldPath: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    return fail(fieldPath, 'expected an array')
  }
  return value
}
const dimensionValue = (value: unknown, fieldPath: string): number => {
  if (value === null) return 0
  return numberValue(value, fieldPath)
}

const externalUrls = (value: unknown, path: string): { spotify: string } => {
  const source = record(value, path)
  return {
    spotify: stringValue(valueAt(source, 'spotify', path), `${path}.spotify`)
  }
}
const nullableTextAsEmpty = (value: unknown, fieldPath: string): string => {
  if (value === null) return ''
  return textValue(value, fieldPath)
}

const images = (
  value: unknown,
  path: string
): { height: number; url: string; width: number }[] =>
  arrayValue(value, path).map((entry, index) => {
    const imagePath = `${path}[${index}]`
    const source = record(entry, imagePath)
    return {
      height: dimensionValue(
        valueAt(source, 'height', imagePath),
        `${imagePath}.height`
      ),
      url: stringValue(valueAt(source, 'url', imagePath), `${imagePath}.url`),
      width: dimensionValue(
        valueAt(source, 'width', imagePath),
        `${imagePath}.width`
      )
    }
  })

const playlistUser = (value: unknown, path: string) => {
  const source = record(value, path)
  return Object.assign(source, {
    display_name: textValue(
      valueAt(source, 'display_name', path),
      `${path}.display_name`
    ),
    external_urls: externalUrls(
      valueAt(source, 'external_urls', path),
      `${path}.external_urls`
    ),
    href: textValue(valueAt(source, 'href', path), `${path}.href`),
    id: stringValue(valueAt(source, 'id', path), `${path}.id`),
    type: textValue(valueAt(source, 'type', path), `${path}.type`),
    uri: textValue(valueAt(source, 'uri', path), `${path}.uri`)
  })
}

const spotifyUser = (value: unknown, path: string): SpotifyUser => {
  const source = record(value, path)
  const followers = record(
    valueAt(source, 'followers', path),
    `${path}.followers`
  )
  return Object.assign(source, {
    country: textValue(valueAt(source, 'country', path), `${path}.country`),
    display_name: textValue(
      valueAt(source, 'display_name', path),
      `${path}.display_name`
    ),
    email: textValue(valueAt(source, 'email', path), `${path}.email`),
    external_urls: externalUrls(
      valueAt(source, 'external_urls', path),
      `${path}.external_urls`
    ),
    followers: {
      href: nullableString(
        valueAt(followers, 'href', `${path}.followers`),
        `${path}.followers.href`
      ),
      total: integerValue(
        valueAt(followers, 'total', `${path}.followers`),
        `${path}.followers.total`
      )
    },
    href: textValue(valueAt(source, 'href', path), `${path}.href`),
    id: stringValue(valueAt(source, 'id', path), `${path}.id`),
    images: images(valueAt(source, 'images', path), `${path}.images`),
    product: textValue(valueAt(source, 'product', path), `${path}.product`),
    type: textValue(valueAt(source, 'type', path), `${path}.type`),
    uri: textValue(valueAt(source, 'uri', path), `${path}.uri`)
  })
}

const spotifyTrack = (value: unknown, path: string): SpotifyTrack => {
  const source = record(value, path)
  const album = record(valueAt(source, 'album', path), `${path}.album`)
  const artists = arrayValue(
    valueAt(source, 'artists', path),
    `${path}.artists`
  ).map((entry, index) => {
    const artistPath = `${path}.artists[${index}]`
    const artist = record(entry, artistPath)
    return Object.assign(artist, {
      external_urls: externalUrls(
        valueAt(artist, 'external_urls', artistPath),
        `${artistPath}.external_urls`
      ),
      id: stringValue(valueAt(artist, 'id', artistPath), `${artistPath}.id`),
      name: textValue(valueAt(artist, 'name', artistPath), `${artistPath}.name`)
    })
  })
  return Object.assign(source, {
    album: Object.assign(album, {
      external_urls: externalUrls(
        valueAt(album, 'external_urls', `${path}.album`),
        `${path}.album.external_urls`
      ),
      id: stringValue(
        valueAt(album, 'id', `${path}.album`),
        `${path}.album.id`
      ),
      images: images(
        valueAt(album, 'images', `${path}.album`),
        `${path}.album.images`
      ),
      name: textValue(
        valueAt(album, 'name', `${path}.album`),
        `${path}.album.name`
      )
    }),
    artists,
    duration_ms: integerValue(
      valueAt(source, 'duration_ms', path),
      `${path}.duration_ms`
    ),
    external_urls: externalUrls(
      valueAt(source, 'external_urls', path),
      `${path}.external_urls`
    ),
    id: stringValue(valueAt(source, 'id', path), `${path}.id`),
    name: textValue(valueAt(source, 'name', path), `${path}.name`),
    preview_url: nullableTextAsEmpty(
      valueAt(source, 'preview_url', path),
      `${path}.preview_url`
    )
  })
}

const youtubeImage = (
  value: unknown,
  path: string
): { height: number; url: string; width: number } => {
  const source = record(value, path)
  return {
    height: dimensionValue(valueAt(source, 'height', path), `${path}.height`),
    url: stringValue(valueAt(source, 'url', path), `${path}.url`),
    width: dimensionValue(valueAt(source, 'width', path), `${path}.width`)
  }
}

const optionalYoutubeImage = (
  source: RecordValue,
  key: string,
  fallback: unknown,
  path: string
): { height: number; url: string; width: number } => {
  const value = source[key] ?? fallback
  return youtubeImage(value, `${path}.${key}`)
}
const youtubeSnippet = (
  value: unknown,
  path: string
): YouTubeResult['snippet'] => {
  const source = record(value, path)
  const thumbnails = record(
    valueAt(source, 'thumbnails', path),
    `${path}.thumbnails`
  )
  const localizedValue = source['localized']
  let localized: RecordValue = {}
  if (localizedValue !== undefined) {
    localized = record(localizedValue, `${path}.localized`)
  }
  const tagsValue = source['tags']
  let tags: string[] = []
  if (Array.isArray(tagsValue)) {
    tags = tagsValue.map((entry, index) =>
      textValue(entry, `${path}.tags[${index}]`)
    )
  }
  return {
    publishedAt: optionalText(source, 'publishedAt', path, ''),
    channelId: optionalText(source, 'channelId', path, ''),
    title: optionalText(source, 'title', path, ''),
    description: optionalText(source, 'description', path, ''),
    thumbnails: {
      default: optionalYoutubeImage(
        thumbnails,
        'default',
        thumbnails['medium'],
        `${path}.thumbnails`
      ),
      medium: optionalYoutubeImage(
        thumbnails,
        'medium',
        thumbnails['default'],
        `${path}.thumbnails`
      ),
      high: optionalYoutubeImage(
        thumbnails,
        'high',
        thumbnails['default'],
        `${path}.thumbnails`
      ),
      standard: optionalYoutubeImage(
        thumbnails,
        'standard',
        thumbnails['default'],
        `${path}.thumbnails`
      )
    },
    channelTitle: optionalText(source, 'channelTitle', path, ''),
    tags,
    categoryId: optionalText(source, 'categoryId', path, ''),
    liveBroadcastContent: optionalText(
      source,
      'liveBroadcastContent',
      path,
      ''
    ),
    localized: {
      title: optionalText(localized, 'title', `${path}.localized`, ''),
      description: optionalText(
        localized,
        'description',
        `${path}.localized`,
        ''
      )
    }
  }
}

const PLAYLIST_TYPE: SpotifyPlaylist['type'] = 'playlist'

const youtubeResult = (value: unknown, path: string): YouTubeResult => {
  const source = record(value, path)
  const snippet = youtubeSnippet(
    valueAt(source, 'snippet', path),
    `${path}.snippet`
  )
  const idValue = source['id'] ?? source['youtube_id']
  const youtubeIdValue = source['youtube_id'] ?? source['id']
  return Object.assign(source, {
    id: stringValue(idValue, `${path}.id`),
    duration: integerValue(
      valueAt(source, 'duration', path),
      `${path}.duration`
    ),
    snippet,
    youtube_id: stringValue(youtubeIdValue, `${path}.youtube_id`),
    nameFormatted: optionalText(source, 'nameFormatted', path, ''),
    nameTokensMap: (() => {
      const valueAtKey = source['nameTokensMap']
      if (valueAtKey === undefined) return []
      return arrayValue(valueAtKey, `${path}.nameTokensMap`).map(
        (entry, index) => booleanValue(entry, `${path}.nameTokensMap[${index}]`)
      )
    })(),
    matchedTokensCount: optionalInteger(source, 'matchedTokensCount', path, 0),
    durationDiff: optionalNumber(source, 'durationDiff', path, 0),
    durationScore: optionalNumber(source, 'durationScore', path, 0),
    wordScore: optionalNumber(source, 'wordScore', path, 0),
    isDoubtlyConversion: optionalBoolean(
      source,
      'isDoubtlyConversion',
      path,
      false
    ),
    isBestMatch: optionalBoolean(source, 'isBestMatch', path, false)
  })
}

const conversion = (value: unknown, path: string): TrackConversionResponse => {
  const source = record(value, path)
  const tokens = arrayValue(
    valueAt(source, 'nameTokens', path),
    `${path}.nameTokens`
  ).map((entry, index) => {
    const tokenPath = `${path}.nameTokens[${index}]`
    const token = record(entry, tokenPath)
    return Object.assign(token, {
      str: textValue(valueAt(token, 'str', tokenPath), `${tokenPath}.str`),
      regex: textValue(valueAt(token, 'regex', tokenPath), `${tokenPath}.regex`)
    })
  })
  const results = arrayValue(valueAt(source, 'yt', path), `${path}.yt`).map(
    (entry, index) => youtubeResult(entry, `${path}.yt[${index}]`)
  )
  const bestMatch = optionalText(source, 'bestMatch', path, '')
  if (
    bestMatch !== '' &&
    !results.some(
      (result) => result.id === bestMatch || result.youtube_id === bestMatch
    )
  ) {
    return fail(`${path}.bestMatch`, 'does not identify a conversion result')
  }
  return Object.assign(source, {
    id: stringValue(valueAt(source, 'id', path), `${path}.id`),
    yt: results,
    nameTokens: tokens,
    bestMatch
  })
}

const optionalNumber = (
  source: RecordValue,
  key: string,
  path: string,
  fallback: number
): number => {
  const value = source[key]
  if (value === undefined) return fallback
  return numberValue(value, `${path}.${key}`)
}

const optionalInteger = (
  source: RecordValue,
  key: string,
  path: string,
  fallback: number
): number => {
  const value = source[key]
  if (value === undefined) return fallback
  return integerValue(value, `${path}.${key}`)
}

const optionalBoolean = (
  source: RecordValue,
  key: string,
  path: string,
  fallback: boolean
): boolean => {
  const value = source[key]
  if (value === undefined) return fallback
  return booleanValue(value, `${path}.${key}`)
}

const optionalText = (
  source: RecordValue,
  key: string,
  path: string,
  fallback: string
): string => {
  const value = source[key]
  if (value === undefined) return fallback
  return textValue(value, `${path}.${key}`)
}

const optionalExternalUrls = (
  source: RecordValue,
  path: string
): { spotify: string } => {
  const value = source['external_urls']
  if (value === undefined) return { spotify: '' }
  return externalUrls(value, `${path}.external_urls`)
}

const playlist = (value: unknown, path: string): SpotifyPlaylist => {
  const source = record(value, path)
  const tracks = record(valueAt(source, 'tracks', path), `${path}.tracks`)
  const trackList = (key: string): SpotifyTrack[] =>
    arrayValue(
      valueAt(tracks, key, `${path}.tracks`),
      `${path}.tracks.${key}`
    ).map((entry, index) =>
      spotifyTrack(entry, `${path}.tracks.${key}[${index}]`)
    )
  const primaryValue = source['primary_color'] ?? null
  return Object.assign(source, {
    collaborative: optionalBoolean(source, 'collaborative', path, false),
    description: optionalText(source, 'description', path, ''),
    external_urls: optionalExternalUrls(source, path),
    href: optionalText(source, 'href', path, ''),
    id: stringValue(valueAt(source, 'id', path), `${path}.id`),
    images: images(valueAt(source, 'images', path), `${path}.images`),
    name: textValue(valueAt(source, 'name', path), `${path}.name`),
    owner: playlistUser(valueAt(source, 'owner', path), `${path}.owner`),
    primary_color: nullableString(primaryValue, `${path}.primary_color`),
    public: booleanValue(valueAt(source, 'public', path), `${path}.public`),
    snapshot_id: stringValue(
      valueAt(source, 'snapshot_id', path),
      `${path}.snapshot_id`
    ),
    tracks: Object.assign(tracks, {
      href: optionalText(tracks, 'href', `${path}.tracks`, ''),
      total: integerValue(
        valueAt(tracks, 'total', `${path}.tracks`),
        `${path}.tracks.total`
      ),
      items: trackList('items'),
      added: trackList('added'),
      removed: trackList('removed')
    }),
    type: PLAYLIST_TYPE,
    uri: optionalText(source, 'uri', path, '')
  })
}
const nonNegativeNumber = (value: unknown, fieldPath: string): number => {
  const number = numberValue(value, fieldPath)
  if (number < 0) return fail(fieldPath, 'expected a non-negative number')
  return number
}

const queryInteger = (value: unknown, path: string): number => {
  if (value === null) return 0
  return nonNegativeNumber(value, path)
}

const query = (value: unknown, path: string): SongBasketTrackQuery => {
  const source = record(value, path)
  const durationValue = textValue(
    valueAt(source, 'duration', path),
    `${path}.duration`
  )
  let duration: SongBasketTrackQuery['duration']
  if (
    durationValue === 'long' ||
    durationValue === 'medium' ||
    durationValue === 'short'
  ) {
    duration = durationValue
  } else {
    return fail(`${path}.duration`, 'has an invalid value')
  }
  return Object.assign(source, {
    query: textValue(valueAt(source, 'query', path), `${path}.query`),
    duration,
    duration_s: queryInteger(
      valueAt(source, 'duration_s', path),
      `${path}.duration_s`
    ),
    id: stringValue(valueAt(source, 'id', path), `${path}.id`)
  })
}

const savedTrack = (value: unknown, path: string): SongBasketTrack => {
  const source = record(value, path)
  const selectionValue = valueAt(source, 'selection', path)
  let selection: null | false | string
  if (selectionValue === null || selectionValue === false) {
    selection = selectionValue
  } else {
    selection = stringValue(selectionValue, `${path}.selection`)
  }
  const flags = record(valueAt(source, 'flags', path), `${path}.flags`)
  const playlists = arrayValue(
    valueAt(source, 'playlists', path),
    `${path}.playlists`
  ).map((entry, index) => {
    const playlistPath = `${path}.playlists[${index}]`
    const membership = record(entry, playlistPath)
    return {
      id: stringValue(
        valueAt(membership, 'id', playlistPath),
        `${playlistPath}.id`
      )
    }
  })
  const customValue = valueAt(source, 'custom', path)
  let custom: YouTubeResult | null
  if (customValue === null) {
    custom = null
  } else {
    custom = youtubeResult(customValue, `${path}.custom`)
  }
  const conversionValue = valueAt(source, 'conversion', path)
  let converted: TrackConversionResponse | null
  if (conversionValue === null) {
    converted = null
  } else {
    converted = conversion(conversionValue, `${path}.conversion`)
  }
  const queryValue = source['query']
  let decodedQuery: SongBasketTrackQuery | null
  if (queryValue === undefined || queryValue === null) {
    decodedQuery = null
  } else {
    decodedQuery = query(queryValue, `${path}.query`)
  }
  const durationValue = source['duration']
  let duration: number | null
  if (durationValue === undefined || durationValue === null) {
    duration = null
  } else {
    duration = nonNegativeNumber(durationValue, `${path}.duration`)
  }
  return Object.assign(source, {
    id: stringValue(valueAt(source, 'id', path), `${path}.id`),
    data: spotifyTrack(valueAt(source, 'data', path), `${path}.data`),
    playlists,
    conversion: converted,
    selection,
    custom,
    query: decodedQuery,
    flags: {
      converted: booleanValue(
        valueAt(flags, 'converted', `${path}.flags`),
        `${path}.flags.converted`
      ),
      conversionError: booleanValue(
        valueAt(flags, 'conversionError', `${path}.flags`),
        `${path}.flags.conversionError`
      ),
      processed: booleanValue(
        valueAt(flags, 'processed', `${path}.flags`),
        `${path}.flags.processed`
      ),
      paused: optionalBoolean(flags, 'paused', `${path}.flags`, false),
      selectionIsApplied: optionalBoolean(
        flags,
        'selectionIsApplied',
        `${path}.flags`,
        false
      )
    },
    duration
  })
}

const dateValue = (value: unknown, path: string): Date | null => {
  if (value === null) return null
  let milliseconds: number
  if (typeof value === 'number') {
    milliseconds = numberValue(value, path)
  } else {
    milliseconds = Date.parse(stringValue(value, path))
  }
  const date = new Date(milliseconds)
  if (!Number.isFinite(date.getTime()))
    return fail(path, 'is not a valid serialized date')
  return date
}

const uniqueIds = (values: readonly string[], path: string): void => {
  const seen = new Set<string>()
  values.forEach((value, index) => {
    if (seen.has(value)) fail(`${path}[${index}]`, 'duplicates an earlier ID')
    seen.add(value)
  })
}

export const decodeLegacyState = (
  input: unknown
): Result<LegacyState, LegacyImportError> =>
  Result.fromThrowable(
    () => {
      const source = record(input, '$')
      const playlists = arrayValue(
        valueAt(source, 'playlists', '$'),
        '$.playlists'
      ).map((entry, index) => playlist(entry, `$.playlists[${index}]`))
      const deletedPlaylists = arrayValue(
        valueAt(source, 'deletedPlaylists', '$'),
        '$.deletedPlaylists'
      ).map((entry, index) => playlist(entry, `$.deletedPlaylists[${index}]`))
      const tracks = arrayValue(
        valueAt(source, 'convertedTracks', '$'),
        '$.convertedTracks'
      ).map((entry, index) => savedTrack(entry, `$.convertedTracks[${index}]`))
      const syncedPlaylists = arrayValue(
        valueAt(source, 'syncedPlaylists', '$'),
        '$.syncedPlaylists'
      ).map((entry, index) => stringValue(entry, `$.syncedPlaylists[${index}]`))
      const queuedPlaylists = arrayValue(
        valueAt(source, 'queuedPlaylists', '$'),
        '$.queuedPlaylists'
      ).map((entry, index) => stringValue(entry, `$.queuedPlaylists[${index}]`))
      const cachedPlaylists = arrayValue(
        valueAt(source, 'cachedPlaylists', '$'),
        '$.cachedPlaylists'
      ).map((entry, index) => {
        const cachePath = `$.cachedPlaylists[${index}]`
        const cache = record(entry, cachePath)
        return {
          id: stringValue(valueAt(cache, 'id', cachePath), `${cachePath}.id`),
          time: numberValue(
            valueAt(cache, 'time', cachePath),
            `${cachePath}.time`
          ),
          snapshot_id: stringValue(
            valueAt(cache, 'snapshot_id', cachePath),
            `${cachePath}.snapshot_id`
          )
        }
      })
      uniqueIds(
        playlists.map((item) => item.id),
        '$.playlists'
      )
      uniqueIds(
        deletedPlaylists.map((item) => item.id),
        '$.deletedPlaylists'
      )
      uniqueIds(
        tracks.map((item) => item.id),
        '$.convertedTracks'
      )
      const playlistIds = new Set(
        [...playlists, ...deletedPlaylists].map((item) => item.id)
      )
      syncedPlaylists.forEach((id, index) => {
        if (!playlistIds.has(id))
          fail(`$.syncedPlaylists[${index}]`, 'does not identify a playlist')
      })
      queuedPlaylists.forEach((id, index) => {
        if (!playlistIds.has(id))
          fail(`$.queuedPlaylists[${index}]`, 'does not identify a playlist')
      })
      tracks.forEach((track, index) =>
        track.playlists.forEach((membership, membershipIndex) => {
          if (!playlistIds.has(membership.id))
            fail(
              `$.convertedTracks[${index}].playlists[${membershipIndex}].id`,
              'does not identify a playlist'
            )
        })
      )
      const canonicalTracks = new Map(
        tracks.map((track) => [track.id, track.data])
      )
      // SQLite stores one canonical Spotify track row, so membership metadata uses the registry entity.
      const canonicalizePlaylist = (
        playlist: SpotifyPlaylist
      ): SpotifyPlaylist => ({
        ...playlist,
        tracks: {
          ...playlist.tracks,
          items: playlist.tracks.items.map(
            (track) => canonicalTracks.get(track.id) ?? track
          ),
          added: playlist.tracks.added.map(
            (track) => canonicalTracks.get(track.id) ?? track
          ),
          removed: playlist.tracks.removed.map(
            (track) => canonicalTracks.get(track.id) ?? track
          )
        }
      })
      const canonicalPlaylists = playlists.map(canonicalizePlaylist)
      const canonicalDeletedPlaylists =
        deletedPlaylists.map(canonicalizePlaylist)
      const currentPlaylistValue = source['currentPlaylist']
      let currentPlaylist: string | null
      if (currentPlaylistValue === null || currentPlaylistValue === '') {
        currentPlaylist = null
      } else {
        currentPlaylist = stringValue(currentPlaylistValue, '$.currentPlaylist')
      }
      if (currentPlaylist !== null && !playlistIds.has(currentPlaylist))
        fail('$.currentPlaylist', 'does not identify a playlist')
      const control = record(valueAt(source, 'control', '$'), '$.control')
      const result = Object.assign(source, {
        user: spotifyUser(valueAt(source, 'user', '$'), '$.user'),
        playlists: canonicalPlaylists,
        syncedPlaylists,
        queuedPlaylists,
        cachedPlaylists,
        deletedPlaylists: canonicalDeletedPlaylists,
        convertedTracks: tracks,
        currentPlaylist,
        control: {
          total: integerValue(
            valueAt(control, 'total', '$.control'),
            '$.control.total'
          ),
          offset: integerValue(
            valueAt(control, 'offset', '$.control'),
            '$.control.offset'
          )
        },
        lastSync: dateValue(valueAt(source, 'lastSync', '$'), '$.lastSync')
      })
      return result
    },
    (error: unknown) => {
      if (error instanceof DecodeFailure)
        return legacyImportError(error.message, error.fieldPath)
      return legacyImportError(
        'Legacy state decoding failed',
        '$',
        undefined,
        error
      )
    }
  )()
