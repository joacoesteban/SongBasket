import assert from 'node:assert/strict'
import test from 'node:test'

import { shortcutFor } from '../src/renderer/shortcut-mapping'

const command = (code: string, shift = false) =>
  shortcutFor({ key: code, code, command: true, shift })

const plain = (code: string, key = code) =>
  shortcutFor({ key, code, command: false, shift: false })

test('maps command navigation and view shortcuts by event code', () => {
  assert.equal(command('BracketLeft'), 'back')
  assert.equal(command('BracketRight'), 'forward')
  assert.equal(command('KeyP'), 'navigate-playlists')
  assert.equal(command('KeyT'), 'navigate-tracks')
  assert.equal(command('KeyD'), 'navigate-downloads')
  assert.equal(command('KeyD', true), 'download-current-playlist')
})

test('maps refresh and debug shortcuts', () => {
  assert.equal(command('KeyR', true), 'refresh')
  assert.equal(command('Slash'), 'toggle-debug-outlines')
  assert.equal(command('KeyR'), undefined)
})

test('maps typing and backspace to search focus', () => {
  assert.equal(plain('KeyA', 'a'), 'focus-search')
  assert.equal(plain('Digit5', '5'), 'focus-search')
  assert.equal(plain('Backspace'), 'focus-search')
  assert.equal(command('KeyA'), undefined)
})
