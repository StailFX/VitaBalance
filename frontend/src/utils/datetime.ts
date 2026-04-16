function normalizeApiDate(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.includes('T')) return trimmed
  if (/[zZ]$|[+\-]\d{2}:\d{2}$/.test(trimmed)) return trimmed
  return `${trimmed}Z`
}

export function formatMoscowDateTime(value: string, includeTime = true): string {
  const parsed = new Date(normalizeApiDate(value))
  if (Number.isNaN(parsed.getTime())) return value

  const formatted = parsed.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })

  return includeTime && value.includes('T') ? `${formatted} МСК` : formatted
}
