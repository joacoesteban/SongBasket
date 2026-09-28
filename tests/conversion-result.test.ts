import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resultIssue,
  selectAction
} from '../src/renderer/components/Home/conversion-result'
import { convertedTrack, result, track } from './fixtures'

test('doubtful results explain which part does not match', () => {
  assert.deepEqual(
    resultIssue(result({ isDoubtlyConversion: true, wordScore: 0 })),
    { label: "Name doesn't match", warn: true, color: null }
  )
  assert.deepEqual(
    resultIssue(
      result({ isDoubtlyConversion: true, nameTokensMap: [false, true] })
    ),
    { label: "Name doesn't match", warn: true, color: null }
  )
  assert.deepEqual(
    resultIssue(
      result({ isDoubtlyConversion: true, wordScore: 0.4, durationScore: 0.1 })
    ),
    { label: "Duration doesn't match", warn: true, color: null }
  )
})

test('custom results are labeled custom instead of doubtful', () => {
  assert.deepEqual(
    resultIssue(result({ isCustomTrack: true, isDoubtlyConversion: true })),
    {
      label: 'Custom',
      warn: false,
      color: 'var(--custom-selection-color)'
    }
  )
})

test('confident results have no issue', () => {
  assert.equal(resultIssue(result()), null)
})

test('only unselected results or an unapplied doubtful selection can be selected', () => {
  const best = result({ youtube_id: 'yt-best' })
  const other = result({ youtube_id: 'yt-other' })
  const doubtful = result({ youtube_id: 'yt-doubt', isDoubtlyConversion: true })
  const confident = convertedTrack('t', best)
  const unsure = convertedTrack('t', doubtful)
  const applied = convertedTrack('t', doubtful, {
    flags: { selectionIsApplied: true }
  })

  assert.equal(selectAction(other, confident), 'Select')
  assert.equal(selectAction(best, confident), null)
  assert.equal(selectAction(doubtful, unsure), 'Apply Selection')
  assert.equal(selectAction(doubtful, applied), null)
  assert.equal(selectAction(doubtful, confident), 'Select')
})

test('the custom result counts as selected when the selection points to it', () => {
  const custom = result({ youtube_id: 'yt-custom', isCustomTrack: true })

  assert.equal(selectAction(custom, track({ custom, selection: false })), null)
  assert.equal(selectAction(custom, track({ custom })), 'Select')
})
