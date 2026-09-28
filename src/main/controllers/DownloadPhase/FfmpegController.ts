import axios from 'axios'
import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'
import * as NodeID3 from 'node-id3'

import { SpotifyTrack } from '../../../@types/Spotify'
import { YouTubeResultId } from '../../../@types/YouTube'
import { Tags } from '../../../@types/globals'

type ExtractionProgress = {
  frames: number
  currentFps: number
  currentKbps: number
  targetSize: number
  timemark: string
  percent?: number | undefined
}

export function extractMp3(
  pathmp3: string,
  sourcePath: string,
  progressCb: (progress: ExtractionProgress) => void
): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>()

  ffmpeg(sourcePath)
    .on('progress', progressCb)
    .on('error', reject)
    .on('end', async () => {
      try {
        await fs.unlink(sourcePath)
      } catch (err) {
        console.error(err)
      }
      resolve()
    })
    .save(pathmp3)

  return promise
}

export async function applyTags(
  pathmp3: string,
  data: SpotifyTrack,
  ytSelection: YouTubeResultId
) {
  let imageBuffer: Buffer | null = null
  try {
    const image = data.album.images[0]
    if (!image) throw new Error('Track has no album artwork')
    imageBuffer = await getPhoto(image.url)
  } catch {
    console.error('Error when getting track photo, applying tracks anyway')
  }

  const tags: Tags = {
    title: data.name,
    // artist: data.artists.map(a => a.name).join(';'), // TODO Try multiple artists
    artist: data.artists[0]?.name ?? data.name,
    album: data.album.name,
    userDefinedText: [
      {
        description: 'songbasket_spotify_id',
        value: data.id
      },
      {
        description: 'songbasket_youtube_id',
        value: ytSelection
      }
    ],
    image: {
      mime: 'png/jpeg', // TODO Check if this is correct
      type: {
        id: 3,
        name: 'front cover'
      },
      description: 'Cover',
      imageBuffer: imageBuffer || Buffer.alloc(0)
    }
  }

  if (!imageBuffer) delete tags.image

  await NodeID3.Promise.write(tags, pathmp3)
}

export async function getPhoto(url: string): Promise<Buffer> {
  const { data } = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer'
  })
  return Buffer.from(data)
}
