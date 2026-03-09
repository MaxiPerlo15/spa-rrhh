const SENSITIVE_KEY_PATTERN = /(email|phone|token|secret|password|authorization|cookie|resume|message|name|ip|dsn)/i

function maskString(value: string) {
  if (value.length <= 6) {
    return '***'
  }

  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

function redactByKey(key: string, value: unknown): unknown {
  if (!SENSITIVE_KEY_PATTERN.test(key)) {
    return value
  }

  if (typeof value === 'string') {
    return maskString(value)
  }

  if (typeof value === 'number') {
    return 0
  }

  if (typeof value === 'boolean') {
    return value
  }

  return '[REDACTED]'
}

export function redactSensitiveData(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item))
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return Object.fromEntries(
      entries.map(([key, entryValue]) => {
        if (entryValue && typeof entryValue === 'object') {
          return [key, redactSensitiveData(entryValue)]
        }
        return [key, redactByKey(key, entryValue)]
      })
    )
  }

  return value
}
