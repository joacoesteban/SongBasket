export type DateFormatted = {
  today: boolean
  sameYear: boolean
  month: string
  date: number
  year: number
  raw: Date
}

export type TimeFormatted = {
  rawHours: number
  rawMinutes: number
  rawSeconds: number
  hours: string
  minutes: string
  seconds: string
}

export type DateFormatResult = {
  date: DateFormatted
  time: TimeFormatted
} | null

export type CssVariableValue = string | number

export function setCssVariable(name: string, value: CssVariableValue): void {
  document.documentElement.style.setProperty(`--${name}`, String(value))
}

export function convertMS(milliseconds: number): {
  minutes: number
  seconds: number
} {
  const totalSeconds = Math.floor(milliseconds / 1000)
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60
  }
}

export const sleep = (time: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, time)
  })

export function dateFormatter(
  dateParam: Date | number | string
): DateFormatResult {
  if (!dateParam) return null

  const parsedDate = new Date(dateParam)
  if (Number.isNaN(parsedDate.getTime())) return null

  const now = new Date()
  const month = MONTHS[parsedDate.getMonth()]
  if (month === undefined) return null

  const date: DateFormatted = {
    today:
      parsedDate.getFullYear() === now.getFullYear() &&
      parsedDate.getMonth() === now.getMonth() &&
      parsedDate.getDate() === now.getDate(),
    sameYear: parsedDate.getFullYear() === now.getFullYear(),
    month: month.substring(0, 3),
    date: parsedDate.getDate(),
    year: parsedDate.getFullYear(),
    raw: parsedDate
  }

  const rawHours = parsedDate.getHours()
  const rawMinutes = parsedDate.getMinutes()
  const rawSeconds = parsedDate.getSeconds()
  const time: TimeFormatted = {
    rawHours,
    rawMinutes,
    rawSeconds,
    hours: padTimeComponent(rawHours),
    minutes: padTimeComponent(rawMinutes),
    seconds: padTimeComponent(rawSeconds)
  }

  return { date, time }
}

const padTimeComponent = (value: number): string =>
  String(value).padStart(2, '0')

const MONTHS = [
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
