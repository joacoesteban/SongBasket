import axios from 'axios'
import { createWriteStream, promises as fs } from 'fs'
import * as PATH from 'path'
import { pipeline } from 'stream/promises'
import { createGunzip } from 'zlib'

import { GithubRelease } from '../../@types/Lib'
import { createDirRecursive } from '../../MAIN_PROCESS_UTILS'

export type BinarySpec = {
  binaryName: string
  assetName: string
  gzipped: boolean
}

export type ReleaseBinaries = {
  repo: string
  directory: string
  versionFilePath: string
  binaries: BinarySpec[]
}

type InstalledRelease = {
  releaseId: number
  tag: string
}

const isInstalled = (path: string) =>
  fs.access(path).then(
    () => true,
    () => false
  )

async function installBinary(
  release: GithubRelease,
  spec: BinarySpec,
  destination: string
) {
  const asset = release.assets.find(({ name }) => name === spec.assetName)
  if (!asset)
    throw new Error(
      `Release ${release.tag_name} has no asset named ${spec.assetName}`
    )

  await fs.unlink(destination).catch(() => {})

  const { data } = await axios.get(asset.browser_download_url, {
    responseType: 'stream'
  })
  const target = createWriteStream(destination)

  if (spec.gzipped) await pipeline(data, createGunzip(), target)
  else await pipeline(data, target)

  await fs.chmod(destination, 0o755)
}

export async function ensureReleaseBinaries({
  repo,
  directory,
  versionFilePath,
  binaries
}: ReleaseBinaries): Promise<Record<string, string>> {
  const paths = Object.fromEntries(
    binaries.map(({ binaryName }) => [
      binaryName,
      PATH.join(directory, binaryName)
    ])
  )

  const [installed, latest, present] = await Promise.all([
    fs
      .readFile(versionFilePath, 'utf8')
      .then((contents) => JSON.parse(contents) as InstalledRelease)
      .catch(() => null),
    axios
      .get<GithubRelease>(
        `https://api.github.com/repos/${repo}/releases/latest`
      )
      .then(({ data }) => data)
      .catch((error) => {
        console.error(`Unable to resolve the latest ${repo} release`, error)
        return null
      }),
    Promise.all(Object.values(paths).map(isInstalled)).then((results) =>
      results.every(Boolean)
    )
  ])

  if (present && installed && (!latest || installed.releaseId === latest.id)) {
    console.log(`${repo} is up to date on ${installed.tag}`)
    return paths
  }

  if (!latest)
    throw new Error(
      `No local ${repo} binaries and the latest release could not be resolved`
    )

  console.log(`Installing ${repo} ${latest.tag_name} into ${directory}`)
  await createDirRecursive(directory)

  try {
    await Promise.all(
      binaries.map((spec) =>
        installBinary(latest, spec, paths[spec.binaryName])
      )
    )
    await fs.writeFile(
      versionFilePath,
      JSON.stringify({ releaseId: latest.id, tag: latest.tag_name })
    )
  } catch (error) {
    await fs.unlink(versionFilePath).catch(() => {})
    throw error
  }

  return paths
}
