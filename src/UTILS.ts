type AsyncCallback<T> = (item: T, index: number, array: T[]) => Promise<unknown>

export async function asyncForEach<T>(
  array: T[],
  callback: AsyncCallback<T>
): Promise<void> {
  let index = 0
  for (const item of array) {
    await callback(item, index, array)
    index += 1
  }
}

export async function asyncForEachParallel<T>(
  array: T[],
  callback: AsyncCallback<T>
): Promise<void> {
  await Promise.all(array.map((item, index) => callback(item, index, array)))
}

export async function asyncFilter<T>(
  array: T[],
  callback: AsyncCallback<T>
): Promise<T[]> {
  const filtered: T[] = []
  let index = 0
  for (const item of array) {
    if (await callback(item, index, array)) filtered.push(item)
    index += 1
  }
  return filtered
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isSameObject(first: unknown, second: unknown): boolean {
  if (!isObject(first) || !isObject(second)) return first === second
  if (first === second) return true

  const keys = Object.keys(first)
  if (keys.length !== Object.keys(second).length) return false

  for (const key of keys) {
    if (!Object.prototype.propertyIsEnumerable.call(second, key)) return false
    const firstValue = first[key]
    const secondValue = second[key]
    if (firstValue === secondValue) continue
    if (isObject(firstValue) && isObject(secondValue)) {
      if (!isSameObject(firstValue, secondValue)) return false
      continue
    }
    return false
  }
  return true
}

export const dateFormatter = (dateParam: string | number | Date) => {
  const now = new Date()
  dateParam = new Date(dateParam)
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]

  const month = months[dateParam.getMonth()]
  if (!month) throw new Error('Invalid date')

  const date = {
    today:
      dateParam.getFullYear() === now.getFullYear() &&
      dateParam.getMonth() === now.getMonth() &&
      dateParam.getDate() === now.getDate(),
    sameYear: dateParam.getFullYear() === now.getFullYear(),
    month: month.substring(0, 3),
    date: dateParam.getDate(),
    year: dateParam.getFullYear()
  }

  const time = {
    hours: dateParam.getHours(),
    minutes: String(dateParam.getMinutes()).padStart(2, '0')
  }

  return { date, time }
}
