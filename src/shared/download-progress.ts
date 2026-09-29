import { P, match } from 'ts-pattern'

import type { DownloadEvent, DownloadStartItem } from './ipc'

type Info = DownloadStartItem['info']

const currentStatusOf = (type: DownloadEvent['type']): string =>
  match(type)
    .with('download:start', 'download:progress', () => 'downloading')
    .with('download:error', () => 'download_error')
    .with('download:end', () => 'download_end')
    .with('extraction:start', 'extraction:progress', () => 'extracting')
    .with('extraction:error', () => 'extraction_error')
    .with('extraction:end', () => 'extraction_end')
    .with('tags:start', 'tags:progress', () => 'tags')
    .with('tags:error', () => 'tags_error')
    .with('tags:end', () => 'tags_end')
    .exhaustive()

const ptgOf = (event: DownloadEvent, info: Info): number =>
  match(event)
    .with(
      { type: P.union('download:start', 'extraction:start', 'tags:start') },
      () => 0
    )
    .with(
      { type: P.union('download:end', 'extraction:end', 'tags:end') },
      () => 100
    )
    .with({ ptg: P.number }, ({ ptg }) => ptg)
    .otherwise(() => info.ptg)

export const applyDownloadEvent = (
  items: readonly DownloadStartItem[],
  event: DownloadEvent
): DownloadStartItem[] =>
  items.map((item) =>
    match(item)
      .with({ id: event.id }, ({ id, info }) => ({
        id,
        info: {
          ...info,
          currentStatus: currentStatusOf(event.type),
          ptg: ptgOf(event, info)
        }
      }))
      .otherwise((unchanged) => unchanged)
  )
