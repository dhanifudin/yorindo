export function isToday(dateStr: string, timezone: string): boolean {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: timezone })
  const eventDay = new Date(dateStr).toLocaleDateString('en-CA', { timeZone: timezone })
  return today === eventDay
}

export function formatIndonesianDate(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatEventTime(dateStr: string, timezone: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}
