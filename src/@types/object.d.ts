declare interface Object {
  isSameObject: (obj: Record<string, unknown>) => boolean
}

declare interface ObjectConstructor {
  isObject: (obj: unknown) => boolean
}
