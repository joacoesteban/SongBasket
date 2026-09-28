import { safeStorage } from 'electron'
import { promises as fs } from 'fs'
import * as PATH from 'path'

import { SongBasketId } from '../../@types/SongBasket'
import { SpotifyUserId } from '../../@types/Spotify'
import { APP_SUPPORT_PATH } from '../Global/constants'

type CredentialStore = Record<SpotifyUserId, string>

const storePath = () => PATH.join(APP_SUPPORT_PATH, 'credentials.json')

function isCredentialStore(value: unknown): value is CredentialStore {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return false
  return Object.values(value).every((entry) => typeof entry === 'string')
}

async function readStore(): Promise<CredentialStore> {
  try {
    const value: unknown = JSON.parse(await fs.readFile(storePath(), 'utf8'))
    if (isCredentialStore(value)) return value
  } catch {
    return {}
  }
  return {}
}

async function writeStore(store: CredentialStore) {
  await fs.writeFile(storePath(), JSON.stringify(store), { mode: 0o600 })
}

function assertEncryptionAvailable() {
  if (safeStorage.isEncryptionAvailable()) return
  throw new Error(
    'The OS credential store is unavailable, so SongBasket cannot persist your session'
  )
}

export async function setCredential(
  userId: SpotifyUserId,
  value: SongBasketId
) {
  assertEncryptionAvailable()
  const store = await readStore()
  store[userId] = safeStorage.encryptString(value).toString('base64')
  await writeStore(store)
}

export async function getCredential(
  userId: SpotifyUserId
): Promise<SongBasketId | null> {
  const store = await readStore()
  const encrypted = store[userId]
  if (!encrypted) return null

  assertEncryptionAvailable()
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
}

export async function deleteCredential(userId: SpotifyUserId) {
  const store = await readStore()
  delete store[userId]
  await writeStore(store)
}
