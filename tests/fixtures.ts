import type { SpotifyPlaylist, SpotifyTrack } from '../src/@types/Spotify'
import type { SongBasketTrackDto, YouTubeResultDto } from '../src/shared/ipc'

export const spotifyTrack = (
  overrides: Partial<SpotifyTrack> = {}
): SpotifyTrack => ({
  album: { external_urls: { spotify: '' }, id: 'album', images: [], name: '' },
  artists: [],
  duration_ms: 200_000,
  external_urls: { spotify: '' },
  id: 'spotify-track',
  name: 'Track',
  preview_url: '',
  ...overrides
})

export const artist = (name: string): SpotifyTrack['artists'][number] => ({
  external_urls: { spotify: '' },
  id: name,
  name
})

export const result = (
  overrides: Partial<YouTubeResultDto> = {}
): YouTubeResultDto => ({
  id: 'result',
  duration: 200,
  snippet: {
    publishedAt: '',
    channelId: '',
    title: 'Video',
    description: '',
    thumbnails: {},
    channelTitle: 'Channel',
    tags: [],
    categoryId: '',
    liveBroadcastContent: '',
    localized: { title: '', description: '' }
  },
  youtube_id: 'yt-result',
  nameFormatted: 'Video',
  nameTokensMap: [true],
  matchedTokensCount: 1,
  durationDiff: 0,
  durationScore: 1,
  wordScore: 1,
  isDoubtlyConversion: false,
  isBestMatch: false,
  ...overrides
})

type TrackOverrides = Partial<Omit<SongBasketTrackDto, 'flags'>> & {
  flags?: Partial<SongBasketTrackDto['flags']>
}

export const track = ({
  flags = {},
  ...overrides
}: TrackOverrides = {}): SongBasketTrackDto => ({
  id: 'track',
  data: spotifyTrack(),
  playlists: [],
  conversion: null,
  selection: null,
  custom: null,
  flags: {
    converted: true,
    conversionError: false,
    processed: false,
    paused: false,
    selectionIsApplied: false,
    ...flags
  },
  duration: null,
  ...overrides
})

export const convertedTrack = (
  id: string,
  best: YouTubeResultDto,
  overrides: TrackOverrides = {}
): SongBasketTrackDto =>
  track({
    id,
    conversion: {
      id,
      yt: [best],
      nameTokens: [],
      bestMatch: best.youtube_id
    },
    ...overrides
  })

export const playlist = (
  overrides: Partial<SpotifyPlaylist> = {}
): SpotifyPlaylist => ({
  collaborative: false,
  description: '',
  external_urls: { spotify: '' },
  href: '',
  id: 'playlist',
  images: [],
  name: 'Playlist',
  owner: {
    display_name: 'owner',
    external_urls: { spotify: '' },
    href: '',
    id: 'owner',
    type: 'user',
    uri: ''
  },
  primary_color: null,
  public: true,
  snapshot_id: '',
  tracks: { href: '', total: 0, items: [], added: [], removed: [] },
  type: 'playlist',
  uri: '',
  ...overrides
})
