import logFile from 'electron-log'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'

import './Global/core.CONSTANTS'
import './controllers/Prototype'
import './env'

const PROD = global.CONSTANTS.ENV_PROD

global.log = (...aa) =>
  aa.forEach((a: any) =>
    console.log(util.inspect(a, { showHidden: false, depth: null }))
  )

const CATCH_TO_FILE = false

;(function setErrorHandling() {
  if (PROD || CATCH_TO_FILE) {
    console.log = console.info
    const toLogFile: (error: Error) => void = (error) => {
      console.error('----------UNCAUGHT----------\n', error)
      logFile.error(error)
    }
    process.on('uncaughtException', toLogFile)
    process.on('unhandledRejection:', toLogFile)

    const logsPath = path.join(global.CONSTANTS.APP_SUPPORT_PATH, 'logs')

    if (!fs.existsSync(logsPath)) fs.mkdirSync(logsPath)

    const now = new Date()
    const filePath = path.join(
      logsPath,
      `${
        now.toDateString() +
        ' @' +
        (() => {
          const hours = now.getHours()
          const minutes = now.getMinutes()
          return `${(hours < 10 && '0' + hours) || hours} - ${(minutes < 10 && '0' + minutes) || minutes}`
        })()
      }.log`
    )

    fs.closeSync(fs.openSync(filePath, 'w'))
    const access = fs.createWriteStream(filePath)

    process.env.ELECTRON_NO_ATTACH_CONSOLE = 'true'
    // @ts-ignore
    process.stdout.write = process.stderr.write = access.write.bind(access)
  }
})()

global.emptyFn = () => {}
