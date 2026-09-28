import * as electron from 'electron'

import { PROTOCOL_PATHS } from '../../Global/constants'

export type UrlDecomposed = {
  full: string
  base: string
  payload: unknown
}
type ProtocolCallback = (path: UrlDecomposed) => void | Promise<void>

const paths = PROTOCOL_PATHS
const callbacks: Record<string, ProtocolCallback[]> = {}

const getUrl = (url: string): UrlDecomposed => {
  const decodedUrl = decodeURI(url)
  const full = decodeURI(
    decodedUrl.replace(new RegExp(paths.BASE + '://', 'g'), '')
  )
  const queryStart = full.indexOf('?')
  let base = full
  if (queryStart !== -1) base = full.slice(0, queryStart)
  const payloadStart = '?payload='
  let payload: unknown = null
  const payloadIndex = full.indexOf(payloadStart)
  if (payloadIndex !== -1) {
    payload = JSON.parse(full.substring(payloadIndex + payloadStart.length))
  }

  return { full, base, payload }
}

function startProtocols(): void {
  electron.protocol.registerHttpProtocol(paths.BASE, onRequest)
}

function onRequest(request: electron.ProtocolRequest): void {
  const parsed = getUrl(request.url)
  console.log('----> ' + parsed.base)
  const pathCallbacks = callbacks[parsed.base] ?? []
  pathCallbacks.forEach((callback) => {
    void callback(parsed)
  })
}

function on(path: string, callback: ProtocolCallback): boolean {
  if (!path) throw new Error('PATH NOT SPECIFIED')
  const stack = callbacks[path] ?? []
  if (stack.includes(callback)) {
    console.error('CALLBACK ALREADY ATTACHED')
    return false
  }
  callbacks[path] = [...stack, callback]
  return true
}

function off(path: string, callback: ProtocolCallback): boolean {
  if (!path) throw new Error('PATH NOT SPECIFIED')
  const stack = callbacks[path]
  if (!stack || !stack.length) {
    console.error('CALLBACK STACK IS EMPTY')
    return false
  }
  callbacks[path] = stack.filter((current) => current !== callback)
  return true
}

export default {
  startProtocols,
  on,
  off
}
