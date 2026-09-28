import { execFile } from 'child_process'
import ffmpeg from 'fluent-ffmpeg'
import { promisify } from 'util'

import { ensureReleaseBinaries } from './github-release-binaries'

const YT_DLP_REPO = 'yt-dlp/yt-dlp'
const FFMPEG_REPO = 'eugeneware/ffmpeg-static'

// ffmpeg-static names its release assets after node's own platform/arch pairs.
const target = `${process.platform}-${process.arch}`
const executableSuffix =
  ({ win32: '.exe' } as Record<string, string>)[process.platform] ?? ''

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
  const assetName = YT_DLP_ASSETS[target]
  if (!assetName)
    throw new Error(`yt-dlp does not publish a binary for ${target}`)

  const binaryName = `yt-dlp${executableSuffix}`
  const paths = await ensureReleaseBinaries({
    repo: YT_DLP_REPO,
    directory: global.CONSTANTS.YTDL_BINARIES_PATH,
    versionFilePath: global.CONSTANTS.YTDL_VERSION_CONTROL_PATH,
    binaries: [{ binaryName, assetName, gzipped: false }]
  })

  ytDlp.path = paths[binaryName]
  console.log('yt-dlp binary is', ytDlp.path)
}

export async function setupFfmpeg() {
  const binaries = ['ffmpeg', 'ffprobe'].map((name) => ({
    binaryName: `${name}${executableSuffix}`,
    assetName: `${name}-${target}.gz`,
    gzipped: true
  }))

  const paths = await ensureReleaseBinaries({
    repo: FFMPEG_REPO,
    directory: global.CONSTANTS.FFMPEG_BINARIES_PATH,
    versionFilePath: global.CONSTANTS.FFMPEG_VERSION_CONTROL_PATH,
    binaries
  })

  ffmpeg.setFfmpegPath(paths[`ffmpeg${executableSuffix}`])
  ffmpeg.setFfprobePath(paths[`ffprobe${executableSuffix}`])
  console.log('ffmpeg binaries are', paths)
}
