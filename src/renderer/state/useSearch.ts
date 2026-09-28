import {
  type Ref,
  onBeforeUnmount,
  onDeactivated,
  readonly,
  ref,
  watch
} from 'vue'

const FILTER_DELAY_MS = 250

const searchQueryRef = ref('')

type SearchFilter = {
  query: Readonly<Ref<string>>
  pending: Readonly<Ref<boolean>>
}

export const useSearch = () => ({
  searchQuery: readonly(searchQueryRef),
  setSearchQuery: (query: string): void => {
    searchQueryRef.value = query
  },
  resetSearch: (): void => {
    searchQueryRef.value = ''
  }
})

export const useSearchFilter = (): SearchFilter => {
  const query = ref(searchQueryRef.value)
  const pending = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = (): void => {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
  }

  const schedule = (): void => {
    clearTimer()
    pending.value = true
    timer = setTimeout(() => {
      timer = undefined
      query.value = searchQueryRef.value
      pending.value = false
    }, FILTER_DELAY_MS)
  }

  watch(searchQueryRef, schedule)

  onDeactivated(() => {
    clearTimer()
    query.value = searchQueryRef.value
    pending.value = false
  })

  onBeforeUnmount(clearTimer)

  return {
    query: readonly(query),
    pending: readonly(pending)
  }
}
