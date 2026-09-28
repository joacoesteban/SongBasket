import { spawn } from 'child_process'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

import { ytDlp } from '../../utils/binaries'

export type DownloadProgress = {
  downloadedBytes: number
  totalBytes: number | null
}

type DownloadHandlers = {
  onStart: (progress: DownloadProgress) => void
  onProgress: (progress: DownloadProgress) => void
}

const PROGRESS_PREFIX = 'SB_PROGRESS'
const AUDIO_FORMAT = 'bestaudio[ext=m4a]/bestaudio/best'

// yt-dlp reports unknown numeric fields as the literal string NA.
const parseProgress = (line: string): DownloadProgress | null => {
  if (!line.startsWith(PROGRESS_PREFIX)) return null

  const [, downloaded, total] = line.split(' ')
  const downloadedBytes = Number(downloaded)
  if (!Number.isFinite(downloadedBytes)) return null

  const totalBytes = Number(total)
  if (!Number.isFinite(totalBytes)) return { downloadedBytes, totalBytes: null }
  return { downloadedBytes, totalBytes }
}

export async function downloadAudio(
  videoId: string,
  destination: string,
  { onStart, onProgress }: DownloadHandlers
): Promise<void> {
  const child = spawn(
    ytDlp.path,
    [
      '--no-playlist',
      '--no-warnings',
      '--newline',
      '--progress',
      '--progress-template',
      `download:${PROGRESS_PREFIX} %(progress.downloaded_bytes)s %(progress.total_bytes,progress.total_bytes_estimate)s`,
      '--format',
      AUDIO_FORMAT,
      '--output',
      '-',
      `https://www.youtube.com/watch?v=${videoId}`
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )

  const { promise: exited, resolve, reject } = Promise.withResolvers<void>()
  const diagnostics: string[] = []
  let started = false
  let buffered = ''

  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    buffered += chunk
    const lines = buffered.split('\n')
    buffered = lines.pop() ?? ''

    for (const line of lines) {
      const progress = parseProgress(line)
      if (!progress) {
        diagnostics.push(line)
        continue
      }
      if (started) onProgress(progress)
      else {
        started = true
        onStart(progress)
      }
    }
  })

  child.on('error', reject)
  child.on('close', (code) => {
    if (code === 0) resolve()
    else
      reject(
        new Error(
          `yt-dlp exited with ${code}\n${diagnostics.slice(-10).join('\n')}`
        )
      )
  })

  try {
    await Promise.all([
      pipeline(child.stdout, createWriteStream(destination)),
      exited
    ])
  } catch (error) {
    child.kill()
    throw error
  }
}
