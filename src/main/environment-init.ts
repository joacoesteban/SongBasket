import logFile from 'electron-log'
import * as fs from 'fs'
import * as path from 'path'

import { APP_SUPPORT_PATH, ENV_PROD } from './Global/constants'

export const emptyFn = (): void => {}

const CATCH_TO_FILE = false

export function initializeEnvironment(): void {
  if (!ENV_PROD && !CATCH_TO_FILE) return

  console.log = console.info
  const toLogFile: (error: Error) => void = (error) => {
    console.error('----------UNCAUGHT----------\n', error)
    logFile.error(error)
  }
  process.on('uncaughtException', toLogFile)
  process.on('unhandledRejection:', toLogFile)

  const logsPath = path.join(APP_SUPPORT_PATH, 'logs')
  if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath)

  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const filePath = path.join(
    logsPath,
    `${now.toDateString()} @${hours} - ${minutes}.log`
  )

  fs.closeSync(fs.openSync(filePath, 'w'))
  const access = fs.createWriteStream(filePath)

  process.env['ELECTRON_NO_ATTACH_CONSOLE'] = 'true'
  process.stdout.write = access.write.bind(access)
  process.stderr.write = access.write.bind(access)
}
