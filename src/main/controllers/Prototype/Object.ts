type Indexable = Record<string, unknown>

Object.defineProperty(Object, 'isObject', {
  value(object: unknown) {
    return !!object && typeof object === 'object' && !Array.isArray(object)
  }
})

Object.defineProperty(Object.prototype, 'isSameObject', {
  value(this: Indexable, object: Indexable) {
    if (!this) throw new TypeError()
    if (!object) return false
    if (this === object) return true

    const myKeys = Object.keys(this)
    if (myKeys.length !== Object.keys(object).length) return false

    return !myKeys.some((key) => {
      if (!object.propertyIsEnumerable(key)) return true

      const myVal = this[key]
      const theirVal = object[key]
      if (typeof myVal !== typeof theirVal) return true
      if (myVal === theirVal) return false
      if (Object.isObject(myVal) && Object.isObject(theirVal))
        return !(myVal as Indexable).isSameObject(theirVal as Indexable)
      return true
    })
  }
})

export default null
