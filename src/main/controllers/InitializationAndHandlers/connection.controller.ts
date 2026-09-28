import axios from 'axios'
import * as dns from 'dns'

import { BACKEND, HEROKU_PING_INTERVAL } from '../../Global/constants'
import {
  getConnectedToApi,
  getConnectedToInternet,
  setConnectedToApi,
  setConnectedToInternet
} from '../../Global/state'

type ConnectionCallback = (connected: boolean) => void

let connectionCallback: ConnectionCallback = () => {}
let apiConnectionCallback: ConnectionCallback = () => {}

export default {
  init(params: {
    connectionChangeCallback: ConnectionCallback
    apiConnectionChangeCallback: ConnectionCallback
  }): void {
    connectionCallback = params.connectionChangeCallback
    apiConnectionCallback = params.apiConnectionChangeCallback
    checkInternet()
    void pingApi()
  }
}

const checkInternet = (): void => {
  dns.lookup('youtube.com', (error) => {
    const connected = !(error && error.code === 'ENOTFOUND')
    if (connected !== getConnectedToInternet()) {
      setConnectedToInternet(connected)
      connectionCallback(connected)
    }
    let retryInterval = 5000
    if (connected) retryInterval = 10000
    setTimeout(checkInternet, retryInterval)
  })
}

const pingApi = async (): Promise<void> => {
  let connected = false
  try {
    if (!BACKEND) throw new Error('BACKEND is not configured')
    await axios.get(BACKEND + '/ping')
    connected = true
  } catch {
    connected = false
  }
  if (getConnectedToApi() !== connected) {
    setConnectedToApi(connected)
    apiConnectionCallback(connected)
  }
  let time = 5000
  if (getConnectedToApi()) time = HEROKU_PING_INTERVAL
  setTimeout(pingApi, time)
}
