import axios, { AxiosInstance } from 'axios'

import { SongBasketTrack } from '../../../@types/SongBasket'
import {
  ExternalUrls,
  Image,
  PlaylistUser,
  SpotifyApiPlaylistsResponse,
  SpotifyArtist,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifyUser
} from '../../../@types/Spotify'
import { TrackConversionResponse, YouTubeResult } from '../../../@types/YouTube'
import PATHS from '../../Global/PATHS'
import REGEX from '../../Global/REGEX'
import { getSongbasketId, getUserId } from '../../Global/state'

type JsonObject = Record<string, unknown>
type NameToken = {
  str: string
  regex: string
}
console.log('BACKEND: ', PATHS.BASE)

let Api: AxiosInstance = getAxiosInstance()

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, key: string): string {
  if (!isObject(value) || typeof value[key] !== 'string') {
    throw new Error(`Invalid API response: ${key}`)
  }
  return value[key]
}

function readNumber(value: unknown, key: string): number {
  if (!isObject(value) || typeof value[key] !== 'number') {
    throw new Error(`Invalid API response: ${key}`)
  }
  return value[key]
}

function readBoolean(value: unknown, key: string): boolean {
  if (!isObject(value) || typeof value[key] !== 'boolean') {
    throw new Error(`Invalid API response: ${key}`)
  }
  return value[key]
}

function readArray(value: unknown, key: string): unknown[] {
  if (!isObject(value) || !Array.isArray(value[key])) {
    throw new Error(`Invalid API response: ${key}`)
  }
  return value[key]
}

function readNullableString(value: unknown, key: string): string | null {
  if (!isObject(value)) throw new Error(`Invalid API response: ${key}`)
  const item = value[key]
  if (item === null) return null
  if (typeof item !== 'string') throw new Error(`Invalid API response: ${key}`)
  return item
}

function readProperty(value: unknown, key: string): unknown {
  if (!isObject(value)) throw new Error(`Invalid API response: ${key}`)
  return value[key]
}

function parseExternalUrls(value: unknown): ExternalUrls {
  return { spotify: readString(value, 'spotify') }
}

function parseImage(value: unknown): Image {
  return {
    height: readNumber(value, 'height'),
    url: readString(value, 'url'),
    width: readNumber(value, 'width')
  }
}

function parsePlaylistUser(value: unknown): PlaylistUser {
  return {
    display_name: readString(value, 'display_name'),
    external_urls: parseExternalUrls(readProperty(value, 'external_urls')),
    href: readString(value, 'href'),
    id: readString(value, 'id'),
    type: readString(value, 'type'),
    uri: readString(value, 'uri')
  }
}

function parseSpotifyArtist(value: unknown): SpotifyArtist {
  return {
    external_urls: parseExternalUrls(readProperty(value, 'external_urls')),
    id: readString(value, 'id'),
    name: readString(value, 'name')
  }
}

function parseSpotifyTrack(value: unknown): SpotifyTrack {
  if (!isObject(value)) throw new Error('Invalid API response: track')
  return {
    album: {
      external_urls: parseExternalUrls(value['album']),
      id: readString(value['album'], 'id'),
      images: readArray(value['album'], 'images').map(parseImage),
      name: readString(value['album'], 'name')
    },
    artists: readArray(value, 'artists').map(parseSpotifyArtist),
    duration_ms: readNumber(value, 'duration_ms'),
    external_urls: parseExternalUrls(value['external_urls']),
    id: readString(value, 'id'),
    name: readString(value, 'name'),
    preview_url: readString(value, 'preview_url')
  }
}

function parseSpotifyUser(value: unknown): SpotifyUser {
  if (!isObject(value)) throw new Error('Invalid API response: user')
  const explicitContent = value['explicit_content']
  const user: SpotifyUser = {
    country: readString(value, 'country'),
    display_name: readString(value, 'display_name'),
    email: readString(value, 'email'),
    external_urls: parseExternalUrls(value['external_urls']),
    followers: {
      href: readNullableString(value['followers'], 'href'),
      total: readNumber(value['followers'], 'total')
    },
    href: readString(value, 'href'),
    id: readString(value, 'id'),
    images: readArray(value, 'images').map(parseImage),
    product: readString(value, 'product'),
    type: readString(value, 'type'),
    uri: readString(value, 'uri')
  }
  if (explicitContent === undefined) return user
  if (!isObject(explicitContent)) {
    throw new Error('Invalid API response: explicit_content')
  }
  user.explicit_content = {
    filter_enabled: readBoolean(explicitContent, 'filter_enabled'),
    filter_locked: readBoolean(explicitContent, 'filter_locked')
  }
  return user
}

function parseSpotifyPlaylist(value: unknown): SpotifyPlaylist {
  if (!isObject(value)) throw new Error('Invalid API response: playlist')
  const tracks = value['tracks']
  if (!isObject(tracks))
    throw new Error('Invalid API response: playlist tracks')
  const playlist: SpotifyPlaylist = {
    collaborative: readBoolean(value, 'collaborative'),
    description: readString(value, 'description'),
    external_urls: parseExternalUrls(value['external_urls']),
    href: readString(value, 'href'),
    id: readString(value, 'id'),
    images: readArray(value, 'images').map(parseImage),
    name: readString(value, 'name'),
    owner: parsePlaylistUser(value['owner']),
    primary_color: readNullableString(value, 'primary_color'),
    public: readBoolean(value, 'public'),
    snapshot_id: readString(value, 'snapshot_id'),
    tracks: {
      added: readArray(tracks, 'added').map(parseSpotifyTrack),
      href: readString(tracks, 'href'),
      items: readArray(tracks, 'items').map(parseSpotifyTrack),
      removed: readArray(tracks, 'removed').map(parseSpotifyTrack),
      total: readNumber(tracks, 'total')
    },
    type: 'playlist',
    uri: readString(value, 'uri')
  }
  const isPaused = value['isPaused']
  if (typeof isPaused === 'boolean') playlist.isPaused = isPaused
  const folderName = value['folderName']
  if (folderName === null || typeof folderName === 'string') {
    playlist.folderName = folderName
  }
  return playlist
}

function parsePlaylistsResponse(value: unknown): SpotifyApiPlaylistsResponse {
  return {
    href: readString(value, 'href'),
    items: readArray(value, 'items').map(parseSpotifyPlaylist),
    limit: readNumber(value, 'limit'),
    next: readString(value, 'next'),
    offset: readNumber(value, 'offset'),
    previous: readString(value, 'previous'),
    total: readNumber(value, 'total')
  }
}

function parseYouTubeResult(value: unknown): YouTubeResult {
  if (!isObject(value)) throw new Error('Invalid API response: YouTube result')
  const snippet = value['snippet']
  if (!isObject(snippet))
    throw new Error('Invalid API response: YouTube snippet')
  const thumbnails = snippet['thumbnails']
  if (!isObject(thumbnails)) {
    throw new Error('Invalid API response: YouTube thumbnails')
  }
  const localized = snippet['localized']
  if (!isObject(localized)) {
    throw new Error('Invalid API response: YouTube localized snippet')
  }
  return {
    id: readString(value, 'id'),
    duration: readNumber(value, 'duration'),
    snippet: {
      publishedAt: readString(snippet, 'publishedAt'),
      channelId: readString(snippet, 'channelId'),
      title: readString(snippet, 'title'),
      description: readString(snippet, 'description'),
      thumbnails: {
        default: parseImage(thumbnails['default']),
        medium: parseImage(thumbnails['medium']),
        high: parseImage(thumbnails['high']),
        standard: parseImage(thumbnails['standard'])
      },
      channelTitle: readString(snippet, 'channelTitle'),
      tags: readArray(snippet, 'tags').map((tag) => {
        if (typeof tag !== 'string')
          throw new Error('Invalid API response: tag')
        return tag
      }),
      categoryId: readString(snippet, 'categoryId'),
      liveBroadcastContent: readString(snippet, 'liveBroadcastContent'),
      localized: {
        title: readString(localized, 'title'),
        description: readString(localized, 'description')
      }
    },
    youtube_id: readString(value, 'youtube_id'),
    nameFormatted: readString(value, 'nameFormatted'),
    nameTokensMap: readArray(value, 'nameTokensMap').map((item) => {
      if (typeof item !== 'boolean') {
        throw new Error('Invalid API response: name token map')
      }
      return item
    }),
    matchedTokensCount: readNumber(value, 'matchedTokensCount'),
    durationDiff: readNumber(value, 'durationDiff'),
    durationScore: readNumber(value, 'durationScore'),
    wordScore: readNumber(value, 'wordScore'),
    isDoubtlyConversion: readBoolean(value, 'isDoubtlyConversion'),
    isBestMatch: readBoolean(value, 'isBestMatch')
  }
}

function parseTrackConversionResponse(value: unknown): TrackConversionResponse {
  if (!isObject(value)) {
    throw new Error('Invalid API response: track conversion')
  }
  const nameTokensValue = value['nameTokens']
  let nameTokens: NameToken[] = []
  if (nameTokensValue !== undefined) {
    if (!Array.isArray(nameTokensValue)) {
      throw new Error('Invalid API response: nameTokens')
    }
    nameTokens = nameTokensValue.map((token) => {
      if (!isObject(token)) throw new Error('Invalid API response: name token')
      return {
        str: readString(token, 'str'),
        regex: readString(token, 'regex')
      }
    })
  }
  let bestMatch = ''
  if (value['bestMatch'] !== undefined) {
    bestMatch = readString(value, 'bestMatch')
  }
  return {
    id: readString(value, 'id'),
    yt: readArray(value, 'yt').map(parseYouTubeResult),
    nameTokens,
    bestMatch
  }
}

function getAxiosInstance(): AxiosInstance {
  const baseURL = PATHS.BASE
  if (!baseURL) throw new Error('BACKEND is not configured')
  return axios.create({
    baseURL,
    timeout: 20000,
    headers: {
      Authorization: 'Bearer ' + (getSongbasketId() ?? ''),
      user_id: getUserId() ?? ''
    },
    validateStatus: (status) =>
      (status >= 200 && status < 300) || status === 304
  })
}

export function createAxiosInstance(): void {
  Api = getAxiosInstance()
}

export async function ytDetails(id: string): Promise<YouTubeResult> {
  const reg = REGEX.videoUrl.exec(id)
  if (!reg && !REGEX.videoId.test(id)) {
    throw new Error('INVALID YOUTUBE VIDEO ID')
  }
  const videoId = reg?.[1] ?? id
  console.log('gettin', PATHS.VIDEO(videoId))
  const response = await Api.get<unknown>(PATHS.VIDEO(videoId))
  return parseYouTubeResult(response.data)
}

export const getMe = async (): Promise<SpotifyUser> => {
  const response = await Api.get<unknown>(PATHS.ME)
  return parseSpotifyUser(response.data)
}

export const getUserPlaylists = async (
  userId: string,
  params: { offset: number | null } = { offset: null }
): Promise<SpotifyApiPlaylistsResponse> => {
  const response = await Api.get<unknown>(PATHS.USER_PLAYLISTS(userId), {
    params: { offset: params.offset ?? 0 }
  })
  return parsePlaylistsResponse(response.data)
}

export const getPlaylist = async (params: {
  id: string
  snapshot_id?: string
}): Promise<SpotifyPlaylist | null> => {
  const response = await Api.get<unknown>(PATHS.PLAYLIST(params.id), {
    params: { snapshot_id: params.snapshot_id ?? null }
  })
  if (response.status === 304) return null
  return parseSpotifyPlaylist(response.data)
}

export async function youtubizeAll(
  tracks: SongBasketTrack[],
  isConvertable: (track: SongBasketTrack) => boolean,
  completionCallback: ((total: number) => void) | null
): Promise<{ tracks: SongBasketTrack[]; failed: number }> {
  const convertibleTracks = tracks.filter(isConvertable)
  let failed = 0

  await Promise.all(
    convertibleTracks.map(async (track) => {
      try {
        const response = await Api.post<unknown>(PATHS.YOUTUBIZE, {
          track: JSON.stringify(track.query)
        })
        track.conversion = parseTrackConversionResponse(response.data)
        track.flags.converted = true
        track.flags.conversionError = false
      } catch {
        track.conversion = null
        track.flags.converted = false
        track.flags.conversionError = true
        failed += 1
      } finally {
        track.flags.processed = false
        completionCallback?.(convertibleTracks.length)
      }
    })
  )

  return { tracks, failed }
}
