import assert from 'node:assert/strict'
import test from 'node:test'

import { applyDownloadEvent } from '../src/shared/download-progress'
import type { DownloadStartItem } from '../src/shared/ipc'

const item = (id: string): DownloadStartItem => ({
  id,
  info: {
    download: { ptg: 0, finished: false, error: null, size: 0, currentSize: 0 },
    extraction: { ptg: 0, finished: false, error: null },
    tags: { finished: false, error: null },
    currentStatus: 'awaiting',
    ptg: 0,
    finished: false
  }
})

const statusOf = (items: readonly DownloadStartItem[], id: string) =>
  items
    .filter((candidate) => candidate.id === id)
    .map(({ info }) => ({ state: info.currentStatus, ptg: info.ptg }))

test('events move only their own track through the download lifecycle', () => {
  const started = applyDownloadEvent([item('a'), item('b')], {
    type: 'download:progress',
    id: 'a',
    ptg: 40
  })

  assert.deepEqual(statusOf(started, 'a'), [{ state: 'downloading', ptg: 40 }])
  assert.deepEqual(statusOf(started, 'b'), [{ state: 'awaiting', ptg: 0 }])

  const extracting = applyDownloadEvent(started, {
    type: 'extraction:start',
    id: 'a'
  })
  assert.deepEqual(statusOf(extracting, 'a'), [{ state: 'extracting', ptg: 0 }])

  const failed = applyDownloadEvent(extracting, {
    type: 'extraction:error',
    id: 'a'
  })
  assert.deepEqual(statusOf(failed, 'a'), [
    { state: 'extraction_error', ptg: 0 }
  ])
})
