import { P, match } from 'ts-pattern'

export const routeNames = {
  loading: 'loading',
  setup: 'setup',
  folderView: 'folder-view',
  empty: 'empty',
  home: 'home',
  playlistsList: 'playlists-list',
  tracksList: 'tracks-list',
  playlistView: 'playlist-view',
  trackReview: 'track-review',
  downloadsView: 'downloads-view'
} satisfies Record<string, string>

export type RouteName = (typeof routeNames)[keyof typeof routeNames]
export type AnimationPhase = 'pull' | 'push' | 'left' | 'right'

export interface AnimationPair {
  readonly exit: AnimationPhase
  readonly enter: AnimationPhase
}
const LEFT_RIGHT: AnimationPair = { exit: 'left', enter: 'right' }
const RIGHT_LEFT: AnimationPair = { exit: 'right', enter: 'left' }
const PULL_PUSH: AnimationPair = { exit: 'pull', enter: 'push' }
const PUSH_PULL: AnimationPair = { exit: 'push', enter: 'pull' }

const HOME_ROUTE_PATTERN = P.union(
  routeNames.home,
  routeNames.playlistsList,
  routeNames.tracksList,
  routeNames.playlistView,
  routeNames.trackReview,
  routeNames.downloadsView
)

const HOME_LIST_FROM_PATTERN = P.union(
  routeNames.playlistsList,
  routeNames.tracksList
)

const HOME_LIST_TO_PATTERN = P.union(
  routeNames.playlistsList,
  routeNames.tracksList
)

const HOME_RETURN_FROM_PATTERN = P.union(
  routeNames.home,
  routeNames.playlistView,
  routeNames.downloadsView
)
export const isHomeRoute = (name: unknown): boolean =>
  match(name)
    .with(HOME_ROUTE_PATTERN, () => true)
    .otherwise(() => false)
const isNotHomeRoute = (name: unknown): boolean => !isHomeRoute(name)

export const animationFor = (from: unknown, to: unknown): AnimationPair =>
  match({ from, to })
    .with({ to: routeNames.trackReview }, () => LEFT_RIGHT)
    .with({ from: routeNames.trackReview }, () => RIGHT_LEFT)
    .with(
      {
        from: HOME_LIST_FROM_PATTERN,
        to: routeNames.tracksList
      },
      () => LEFT_RIGHT
    )
    .with(
      {
        from: HOME_LIST_FROM_PATTERN,
        to: routeNames.playlistsList
      },
      () => RIGHT_LEFT
    )
    .with(
      {
        from: HOME_RETURN_FROM_PATTERN,
        to: HOME_LIST_TO_PATTERN
      },
      () => PULL_PUSH
    )
    .with(
      { from: P.when(isNotHomeRoute), to: HOME_ROUTE_PATTERN },
      () => PULL_PUSH
    )
    .otherwise(() => PUSH_PULL)
