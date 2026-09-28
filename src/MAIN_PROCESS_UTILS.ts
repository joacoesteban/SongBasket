import * as fs from 'fs'
import * as PATH from 'path'

import { Platform } from './@types/App'
import { PLATFORM } from './main/Global/constants'

export function cloneObject<T>(value: T): T {
  return structuredClone(value)
}

export function removeDuplication<T>(array: T[]): T[] {
  let result = array
  for (const item of array) {
    result = [item, ...result.filter((value) => value !== item)]
  }
  return result
}

type Identifiable = {
  id: PropertyKey
}

export function removeDuplicationId<T extends Identifiable>(array: T[]): T[] {
  let result = array
  for (const item of array) {
    result = [item, ...result.filter((value) => value.id !== item.id)]
  }
  return result
}

export function encodeIntoFilename(text: string): string {
  const reg = /\\|\/|\*|\?|:|\*|\||"|<|>/g
  return text.replace(reg, '-')
}

export async function createDirRecursive(path: string): Promise<void> {
  const pathArray = path.split(/\/|\\/)
  if (await pathDoesExist(path)) return

  let subPath = '/'
  if (PLATFORM === Platform.windows) {
    subPath = `${pathArray.splice(0, 1)}/`
  }
  for (const pathPart of pathArray) {
    subPath = PATH.join(subPath, pathPart)
    if (await pathDoesExist(subPath)) continue
    try {
      await createDir(subPath)
    } catch (error) {
      console.error('ERROR CREATING PATH RECURSIVELY')
      throw error
    }
  }
}

export function pathDoesExist(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    fs.stat(path, (error) => resolve(!error))
  })
}

export function readFile(path: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (error, data) => {
      if (error) reject(error)
      else resolve(data)
    })
  })
}

export function writeFile(path: string, data: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export function link(path: string, path2: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.link(path, path2, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export function unlink(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.unlink(path, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export async function unlinkSafe(path: string): Promise<void> {
  if (await pathDoesExist(path)) await unlink(path)
}

export function createDir(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

export async function linkNRemove(path1: string, path2: string): Promise<void> {
  await link(path1, path2)
  await unlink(path1)
}

export async function copyNRemove(path1: string, path2: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    fs.copyFile(path1, path2, (copyError) => {
      if (copyError) reject(copyError)
      else resolve()
    })
  })
  await unlink(path1)
}

export function isSameDisk(path1: string, path2: string): boolean {
  const normalizedPath1 = path1.toLowerCase()
  const normalizedPath2 = path2.toLowerCase()
  switch (PLATFORM) {
    case Platform.mac:
      if (normalizedPath1.indexOf('/volumes') === 0) {
        if (normalizedPath2.indexOf('/volumes') === 0) {
          const getDisk = (diskPath: string): string => {
            const shorten = diskPath.substring('/volumnes'.length)
            return shorten.slice(0, shorten.indexOf('/'))
          }
          return getDisk(normalizedPath1) === getDisk(normalizedPath2)
        }
        return false
      }
      return normalizedPath2.indexOf('/volumes') !== 0
    case Platform.windows:
      return (
        normalizedPath1.slice(0, normalizedPath1.indexOf(':')) ===
        normalizedPath2.slice(0, normalizedPath2.indexOf(':'))
      )
    case Platform.linux:
      return false
  }
}
