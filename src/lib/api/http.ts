import { ApiRequestError } from './errors'

const DEFAULT_TIMEOUT_MS = 12_000
const DEFAULT_RETRIES = 1
const BASE_RETRY_DELAY_MS = 600

interface FetchJsonOptions extends RequestInit {
  timeoutMs?: number
  retries?: number
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function createTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal
  clear: () => void
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId)
  }
}

export async function apiFetch(input: RequestInfo | URL, options: FetchJsonOptions = {}): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries,
    method = 'GET',
    ...init
  } = options

  const normalizedMethod = method.toUpperCase()
  const maxRetries = retries ?? (normalizedMethod === 'GET' ? DEFAULT_RETRIES : 0)

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const timeout = createTimeoutSignal(timeoutMs)

    try {
      const response = await fetch(input, {
        ...init,
        method,
        signal: timeout.signal
      })

      if (response.ok) {
        return response
      }

      const shouldRetry = attempt < maxRetries && normalizedMethod === 'GET' && isRetryableStatus(response.status)
      if (!shouldRetry) {
        return response
      }

      await wait(BASE_RETRY_DELAY_MS * (attempt + 1))
      continue
    } catch (error) {
      const isTimeout = error instanceof DOMException && error.name === 'AbortError'
      const message = isTimeout
        ? 'La solicitud tardó demasiado. Intenta nuevamente.'
        : 'No se pudo conectar con el servidor. Intenta nuevamente.'

      const shouldRetry = attempt < maxRetries && normalizedMethod === 'GET'
      if (shouldRetry) {
        await wait(BASE_RETRY_DELAY_MS * (attempt + 1))
        continue
      }

      throw new ApiRequestError(message, {
        code: isTimeout ? 'TIMEOUT' : 'NETWORK'
      })
    } finally {
      timeout.clear()
    }
  }

  throw new ApiRequestError('No se pudo completar la solicitud.', {
    code: 'NETWORK'
  })
}

export { ApiRequestError } from './errors'
