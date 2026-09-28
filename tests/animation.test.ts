import assert from 'node:assert/strict'
import test from 'node:test'

import { animationFor, routeNames } from '../src/renderer/router/animation'

const pair = (
  exit: string,
  enter: string
): { exit: string; enter: string } => ({
  exit,
  enter
})

test('animationFor follows the legacy route precedence table', () => {
  assert.deepEqual(
    animationFor(routeNames.setup, routeNames.home),
    pair('pull', 'push')
  )
  assert.deepEqual(
    animationFor(routeNames.setup, routeNames.playlistsList),
    pair('pull', 'push')
  )
  assert.deepEqual(
    animationFor(routeNames.playlistsList, routeNames.tracksList),
    pair('left', 'right')
  )
  assert.deepEqual(
    animationFor(routeNames.tracksList, routeNames.playlistsList),
    pair('right', 'left')
  )
  assert.deepEqual(
    animationFor(routeNames.setup, routeNames.trackReview),
    pair('left', 'right')
  )
  assert.deepEqual(
    animationFor(routeNames.trackReview, routeNames.setup),
    pair('right', 'left')
  )
  assert.deepEqual(
    animationFor(routeNames.home, routeNames.trackReview),
    pair('left', 'right')
  )
  assert.deepEqual(
    animationFor(routeNames.trackReview, routeNames.playlistsList),
    pair('right', 'left')
  )
  assert.deepEqual(
    animationFor(routeNames.home, routeNames.playlistsList),
    pair('pull', 'push')
  )
  assert.deepEqual(
    animationFor(routeNames.playlistView, routeNames.playlistsList),
    pair('pull', 'push')
  )
  assert.deepEqual(
    animationFor(routeNames.playlistView, routeNames.tracksList),
    pair('pull', 'push')
  )
  assert.deepEqual(
    animationFor(routeNames.home, routeNames.downloadsView),
    pair('push', 'pull')
  )
  assert.deepEqual(
    animationFor(routeNames.playlistView, routeNames.empty),
    pair('push', 'pull')
  )
})
