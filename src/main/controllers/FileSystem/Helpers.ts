import axios from 'axios'
import { exec } from 'child_process'
import { randomUUID as uuid } from 'crypto'
import { promises as fs } from 'fs'
import * as fsCb from 'fs'
import Jimp from 'jimp'
import * as PATH from 'path'
import toIco from 'to-ico'

import { Platform } from '../../../@types/App'
import * as utils from '../../../MAIN_PROCESS_UTILS'
import { NODE_MODULES_PATH, PLATFORM, TEMP_PATH } from '../../Global/constants'
import UserMethods from './UserMethods'

type FolderIconController = {
  set: (path: string, imageTempPath: string) => Promise<void>
  test: (path: string) => Promise<boolean>
  remove: (path: string) => Promise<void>
}

type IconDownload = {
  imageUrl: string
  path: string
  imageTempPath: string
  exec: () => Promise<void>
}

type PlaylistIcon = {
  path: string
  imageUrl: string
}

type WindowsGuidelines = {
  iconName: string
  iniName: string
  iconInIniTest: string
  iniContents: string
  setSysProtectedCmd: (path: string) => string
}

type WindowsFolderIconController = FolderIconController & {
  guidelines: WindowsGuidelines
  validateIcon: (imagePath: string) => Promise<Buffer>
  convertIcon: (path: string) => Promise<Buffer>
  hideFile: (path: string) => Promise<void>
  makeIcon: (path: string, buff: Buffer) => Promise<void>
  createIniFile: (path: string) => Promise<void>
}

type MacFolderIconController = FolderIconController & {
  fileIconPath: string
}

type FolderIconControllers = {
  [Platform.mac]: MacFolderIconController
  [Platform.windows]: WindowsFolderIconController
  [Platform.linux]: FolderIconController
}

const TEMP_IMAGE_PATH = TEMP_PATH + '/image/'
const computed: { folderIconFnc: FolderIconController | null } = {
  folderIconFnc: null
}

const getFolderIconController = (): FolderIconController =>
  computed.folderIconFnc || (computed.folderIconFnc = folderFns[PLATFORM])

const downloadPlaylistIcon = (
  playlist: PlaylistIcon,
  iconSetterHelper: FolderIconController
): IconDownload | null => {
  if (!playlist.path || !playlist.imageUrl) return null
  UserMethods.checkPathThenCreate(TEMP_IMAGE_PATH)

  const { path, imageUrl } = playlist
  const imageTempPath = PATH.join(TEMP_IMAGE_PATH, uuid())
  const exec = (): Promise<void> =>
    axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    }).then((response) => {
      const { promise, resolve, reject } = Promise.withResolvers<void>()
      const writer = fsCb.createWriteStream(imageTempPath)
      response.data.pipe(writer)
      writer.on('error', reject)
      writer.on('finish', () => {
        iconSetterHelper
          .set(path, imageTempPath)
          .then(() => fs.unlink(imageTempPath))
          .then(resolve)
          .catch(reject)
      })
      return promise
    })

  return { imageUrl, path, imageTempPath, exec }
}

export default {
  getIconSetterHelper: getFolderIconController,
  plIconDownloader: downloadPlaylistIcon
}

const MAC_FILE_ICON_PATH = PATH.join(
  NODE_MODULES_PATH,
  'fileicon',
  'bin',
  'fileicon'
)
const macFolderIconController: MacFolderIconController = {
  fileIconPath: MAC_FILE_ICON_PATH,
  set(folderPath, iconPath) {
    const { promise, resolve, reject } = Promise.withResolvers<void>()
    if (!folderPath) {
      reject(new Error('NO FOLDER PATH'))
      return promise
    }
    if (!iconPath) {
      reject(new Error('NO ICON PATH'))
      return promise
    }
    exec(`${MAC_FILE_ICON_PATH} set ${folderPath} ${iconPath}`, (error) => {
      if (error) reject(error)
      else resolve()
    })
    return promise
  },
  test(path) {
    const { promise, resolve, reject } = Promise.withResolvers<boolean>()
    if (!path) {
      reject(new Error('NO PATH'))
      return promise
    }
    exec(`${MAC_FILE_ICON_PATH} test ${path}`, (error, message) => {
      if (error) resolve(false)
      else resolve(message.includes('HAS custom icon'))
    })
    return promise
  },
  remove(path) {
    const { promise, resolve, reject } = Promise.withResolvers<void>()
    if (!path) {
      reject(new Error('NO PATH'))
      return promise
    }
    exec(`${MAC_FILE_ICON_PATH} rm ${path}`, (error) => {
      if (error) reject(error)
      else resolve()
    })
    return promise
  }
}

const WINDOWS_GUIDELINES: WindowsGuidelines = {
  iconName: 'foldericon.ico',
  iniName: 'desktop.ini',
  iconInIniTest: 'IconResource=foldericon.ico,0',
  iniContents:
    '[.ShellClassInfo]\r\nIconResource=foldericon.ico,0\r\n[ViewState]\r\nMode=\r\nVid=\r\nFolderType=Pictures\r\n',
  setSysProtectedCmd: (path) => `attrib +s +h ${path} /S /D`
}

const validateWindowsIcon = (imagePath: string): Promise<Buffer> =>
  Jimp.read(imagePath).then((image) => {
    const { promise, resolve, reject } = Promise.withResolvers<Buffer>()
    image.cover(256, 256, (error, coveredImage) => {
      if (error) {
        reject(error)
        return
      }
      coveredImage.getBufferAsync(Jimp.MIME_PNG).then(resolve).catch(reject)
    })
    return promise
  })

const hideWindowsFile = (path: string): Promise<void> => {
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  exec(WINDOWS_GUIDELINES.setSysProtectedCmd(path), (error) => {
    if (error) reject(error)
    else resolve()
  })
  return promise
}

const convertWindowsIcon = async (path: string): Promise<Buffer> =>
  toIco(await validateWindowsIcon(path))

const makeWindowsIcon = async (path: string, buff: Buffer): Promise<void> => {
  await fs.writeFile(path, buff)
  await hideWindowsFile(path)
}

const createWindowsIniFile = async (path: string): Promise<void> => {
  const iniPath = PATH.join(path, WINDOWS_GUIDELINES.iniName)
  if (await utils.pathDoesExist(iniPath)) {
    const contents = await fs.readFile(iniPath, 'utf-8')
    if (contents.includes(WINDOWS_GUIDELINES.iconInIniTest)) return
  }

  await fs.writeFile(iniPath, WINDOWS_GUIDELINES.iniContents, 'utf16le')
  await hideWindowsFile(iniPath)
}

const setWindowsFolderIcon = async (
  folderPath: string,
  imagePath: string
): Promise<void> => {
  if (!folderPath) throw new Error('NO FOLDER PATH')
  if (!imagePath) throw new Error('NO ICON PATH')
  const finalIconPath = PATH.join(folderPath, WINDOWS_GUIDELINES.iconName)

  await removeWindowsFolderIcon(folderPath)
  const buff = await convertWindowsIcon(imagePath)
  await makeWindowsIcon(finalIconPath, buff)
  await createWindowsIniFile(folderPath)
}

const testWindowsFolderIcon = async (path: string): Promise<boolean> => {
  if (!path) throw new Error('NO PATH')

  const join = (part: string) => PATH.join(path, part)
  if (!(await utils.pathDoesExist(join(WINDOWS_GUIDELINES.iconName)))) {
    return false
  }
  if (!(await utils.pathDoesExist(join(WINDOWS_GUIDELINES.iniName)))) {
    return false
  }

  return (await fs.readFile(join(WINDOWS_GUIDELINES.iniName))).includes(
    WINDOWS_GUIDELINES.iconInIniTest
  )
}

const removeWindowsFolderIcon = async (path: string): Promise<void> => {
  await utils.unlinkSafe(PATH.join(path, WINDOWS_GUIDELINES.iniName))
  await utils.unlinkSafe(PATH.join(path, WINDOWS_GUIDELINES.iconName))
}

const windowsFolderIconController: WindowsFolderIconController = {
  guidelines: WINDOWS_GUIDELINES,
  validateIcon: validateWindowsIcon,
  convertIcon: convertWindowsIcon,
  hideFile: hideWindowsFile,
  makeIcon: makeWindowsIcon,
  createIniFile: createWindowsIniFile,
  set: setWindowsFolderIcon,
  test: testWindowsFolderIcon,
  remove: removeWindowsFolderIcon
}

const linuxFolderIconController: FolderIconController = {
  set: async () => {},
  test: async () => false,
  remove: async () => {}
}

const folderFns: FolderIconControllers = {
  [Platform.mac]: macFolderIconController,
  [Platform.windows]: windowsFolderIconController,
  [Platform.linux]: linuxFolderIconController
}
