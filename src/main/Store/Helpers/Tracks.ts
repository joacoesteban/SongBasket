import * as he from 'he'

import { SongBasketTrack } from '../../../@types/SongBasket'
import { TrackConversionResponse, YouTubeResult } from '../../../@types/YouTube'
import { cloneObject } from '../../../MAIN_PROCESS_UTILS'

type NameTokens = TrackConversionResponse['nameTokens']

export default {
  calculateBestMatch(track: SongBasketTrack, force: boolean = false) {
    if (
      (!force && track.flags.processed) ||
      track.flags.conversionError ||
      !track.conversion
    )
      return track

    const processedTrack = cloneObject(track)
    const conversion = processedTrack.conversion
    if (!conversion) return processedTrack

    conversion.nameTokens = [
      ...processedTrack.data.name
        .split(separators)
        .map((str) => makeValidRegex(str))
        .filter((str) => str.str.length > 2 && !isInvalidWord(str.str)),
      ...processedTrack.data.artists.map((artist) =>
        makeValidRegex(artist.name)
      )
    ]

    const nameTokens = conversion.nameTokens.filter(
      (token, index, tokens) =>
        tokens.findIndex((candidate) => candidate.str === token.str) === index
    )

    conversion.yt.forEach((conv) =>
      exec({
        track: processedTrack,
        conv,
        nameTokens
      })
    )
    calcBestMatch(processedTrack)
    processedTrack.flags.processed = true
    return processedTrack
  }
}
const separators = /, | |\(|\)/

const INVALID_WORDS = ['the']

const isInvalidWord = (str: string) => INVALID_WORDS.includes(str.toLowerCase())

const normalizeConversion = (conv: YouTubeResult): void => {
  if (!conv.youtube_id) conv.youtube_id = conv.id
}

const exec: (params: {
  track: SongBasketTrack
  conv: YouTubeResult
  nameTokens: NameTokens
}) => void = ({ track, conv, nameTokens }) => {
  const conversion = track.conversion
  if (!conversion) return

  normalizeConversion(conv)
  findTokens(conv, nameTokens)
  const duration = track.duration || track.data.duration_ms / 1000
  track.duration = duration
  conv.durationDiff = round(conv.duration - duration)
  conv.durationScore = round(1 / 1.1 ** (Math.abs(conv.durationDiff) / 10))
  conv.wordScore = round(conv.matchedTokensCount / conversion.nameTokens.length)
  const firstTokenMatches = conv.nameTokensMap[0] === true
  conv.isDoubtlyConversion =
    conv.wordScore === 0 ||
    !firstTokenMatches ||
    conv.wordScore + conv.durationScore < 1
}

const findTokens = (conv: YouTubeResult, nameTokens: NameTokens): void => {
  conv.nameFormatted = conv.snippet.title = he.decode(conv.snippet.title)
  conv.nameTokensMap = new Array(nameTokens.length)
  conv.matchedTokensCount = 0

  nameTokens.forEach((token, index) => {
    conv.nameTokensMap[index] = conv.snippet.title
      .toLowerCase()
      .includes(token.str.toLowerCase())
    const matches = conv.nameTokensMap[index] === true

    if (matches) {
      conv.matchedTokensCount++
      conv.nameFormatted = conv.nameFormatted.replace(
        new RegExp(token.regex, 'gi'),
        `<span class="matching-token">${token.str}</span>`
      )
    }
  })
}

const calcBestMatch = (track: SongBasketTrack): void => {
  const conversion = track.conversion
  if (!conversion || !conversion.yt.length) return

  const sorted = conversion.yt.sort((a, b) => {
    if (!a.wordScore && b.wordScore) return 1
    if (!b.wordScore && a.wordScore) return -1
    if (
      a.durationScore + a.wordScore * 1.5 >
      b.durationScore + b.wordScore * 1.5
    )
      return -1
    return 1
  })
  const bestMatch = sorted[0]
  if (!bestMatch) return
  conversion.bestMatch = bestMatch.youtube_id
  bestMatch.isBestMatch = true
}

const makeValidRegex = (str: string) => {
  let regex = str
  regex = regex.replace(/\*/g, '\\*')
  regex = regex.replace(/\(/g, '\\(')
  regex = regex.replace(/\)/g, '\\)')
  regex = regex.replace(/\[/g, '\\[')
  regex = regex.replace(/\]/g, '\\]')
  regex = regex.replace(/\?/g, '\\?')

  return { str, regex }
}

const round = (num: number) => +num.toFixed(5)
