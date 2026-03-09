import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, ApiRequestError } from '../api/http'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reintenta GET ante error 500 y luego resuelve', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('error', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([{ id: '1' }]), { status: 200 }))

    vi.stubGlobal('fetch', fetchMock)

    const response = await apiFetch('/api/vacancies')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(response.ok).toBe(true)
  })

  it('no reintenta POST ante error de red', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('socket hang up'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      apiFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ a: 1 })
      })
    ).rejects.toBeInstanceOf(ApiRequestError)

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('falla por timeout con mensaje amigable', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockImplementation((_input, init?: RequestInit) => {
      const signal = init?.signal
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const request = apiFetch('/api/vacancies', { timeoutMs: 20, retries: 0 })
    const assertion = expect(request).rejects.toMatchObject({
      name: 'ApiRequestError',
      message: 'La solicitud tardó demasiado. Intenta nuevamente.'
    })
    await vi.advanceTimersByTimeAsync(25)

    await assertion
  })
})
