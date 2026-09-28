import { execFile } from 'child_process'
import ffmpeg from 'fluent-ffmpeg'
import { promisify } from 'util'

import {
  FFMPEG_BINARIES_PATH,
  FFMPEG_VERSION_CONTROL_PATH,
  YTDL_BINARIES_PATH,
  YTDL_VERSION_CONTROL_PATH
} from '../Global/constants'
import { ensureReleaseBinaries } from './github-release-binaries'

const YT_DLP_REPO = 'yt-dlp/yt-dlp'
const FFMPEG_REPO = 'eugeneware/ffmpeg-static'

// ffmpeg-static names its release assets after node's own platform/arch pairs.
const TARGET = `${process.platform}-${process.arch}`
const EXECUTABLE_SUFFIX = (() => {
  if (process.platform === 'win32') return '.exe'
  return ''
})()

const YT_DLP_ASSETS: Record<string, string> = {
  'darwin-arm64': 'yt-dlp_macos',
  'darwin-x64': 'yt-dlp_macos',
  'win32-x64': 'yt-dlp.exe',
  'win32-arm64': 'yt-dlp_arm64.exe',
  'win32-ia32': 'yt-dlp_x86.exe',
  'linux-x64': 'yt-dlp_linux',
  'linux-arm64': 'yt-dlp_linux_aarch64'
}

const run = promisify(execFile)

export const ytDlp = {
  path: '',
  async flushCache(): Promise<string> {
    const { stdout } = await run(ytDlp.path, ['--rm-cache-dir'])
    return stdout
  }
}

export async function setupYtDlp() {
  const assetName = YT_DLP_ASSETS[TARGET]
  if (!assetName)
    throw new Error(`yt-dlp does not publish a binary for ${TARGET}`)

  const binaryName = `yt-dlp${EXECUTABLE_SUFFIX}`
  const paths = await ensureReleaseBinaries({
    repo: YT_DLP_REPO,
    directory: YTDL_BINARIES_PATH,
    versionFilePath: YTDL_VERSION_CONTROL_PATH,
    binaries: [{ binaryName, assetName, gzipped: false }]
  })

  const ytDlpPath = paths[binaryName]
  if (!ytDlpPath) throw new Error('yt-dlp binary path is unavailable')
  ytDlp.path = ytDlpPath
  console.log('yt-dlp binary is', ytDlp.path)
}

export async function setupFfmpeg() {
  const binaries = ['ffmpeg', 'ffprobe'].map((name) => ({
    binaryName: `${name}${EXECUTABLE_SUFFIX}`,
    assetName: `${name}-${TARGET}.gz`,
    gzipped: true
  }))

  const paths = await ensureReleaseBinaries({
    repo: FFMPEG_REPO,
    directory: FFMPEG_BINARIES_PATH,
    versionFilePath: FFMPEG_VERSION_CONTROL_PATH,
    binaries
  })

  const ffmpegPath = paths[`ffmpeg${EXECUTABLE_SUFFIX}`]
  const ffprobePath = paths[`ffprobe${EXECUTABLE_SUFFIX}`]
  if (!ffmpegPath || !ffprobePath)
    throw new Error('ffmpeg binary paths are unavailable')
  ffmpeg.setFfmpegPath(ffmpegPath)
  ffmpeg.setFfprobePath(ffprobePath)
  console.log('ffmpeg binaries are', paths)
}
