type IterationCallback = (item: unknown, index: number, array: unknown[]) => unknown
type AsyncIterationCallback = (item: unknown, index: number, array: unknown[]) => Promise<unknown>

Object.defineProperties(Array.prototype, {
  lastIndex: {
    get (this: unknown[]) {
      return this.length - 1
    }
  },
  last: {
    get (this: unknown[]) {
      return this[this.length - 1]
    }
  },
  head: {
    get (this: unknown[]) {
      return this[0]
    }
  },
  indexOfSearch: {
    value (this: unknown[], cb: IterationCallback): number {
      for (let i = 0; i < this.length; i++) {
        if (cb(this[i], i, this)) return i
      }
      return -1
    }
  },
  lastIndexOfSearch: {
    value (this: unknown[], cb: IterationCallback): number {
      for (let i = this.length - 1; i > -1; i--) {
        if (cb(this[i], i, this)) return i
      }
      return -1
    }
  },
  asyncForEachParallel: {
    async value (this: unknown[], cb: AsyncIterationCallback) {
      await Promise.all(this.map((item, index) => cb(item, index, this)))
    }
  },
  asyncForEach: {
    async value (this: unknown[], cb: AsyncIterationCallback) {
      let i = 0
      for (const item of this) {
        await cb(item, i++, this)
      }
    }
  },
  asyncFilter: {
    async value (this: unknown[], cb: AsyncIterationCallback) {
      const filtered = []
      let i = 0
      for (const item of this) {
        if (await cb(item, i, this)) filtered.push(item)
        i++
      }
      return filtered
    }
  }
})

export default null
