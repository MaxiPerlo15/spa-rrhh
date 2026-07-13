import { afterEach, describe, expect, it, vi } from 'vitest'

import { applyCorsHeaders, isAllowedOrigin, isPublicCorsRequest } from '../cors'

describe('cors helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('acepta null origin y origins explícitamente permitidos', () => {
    vi.stubEnv('NEXTAUTH_URL', 'https://spa-rrhh.vercel.app/auth/signin')
    vi.stubEnv('CORS_ALLOWED_ORIGINS', 'https://preview.spa-rrhh.app, https://admin.spa-rrhh.app/login')

    expect(isAllowedOrigin(null)).toBe(true)
    expect(isAllowedOrigin('https://spa-rrhh.vercel.app')).toBe(true)
    expect(isAllowedOrigin('https://preview.spa-rrhh.app')).toBe(true)
    expect(isAllowedOrigin('https://admin.spa-rrhh.app')).toBe(true)
    expect(isAllowedOrigin('https://evil.example')).toBe(false)
  })

  it('permite localhost solo fuera de producción', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true)
    expect(isAllowedOrigin('http://127.0.0.1:4314')).toBe(true)

    vi.stubEnv('NODE_ENV', 'production')
    expect(isAllowedOrigin('http://localhost:3000')).toBe(false)
  })

  it('ignora origins inválidos en configuración y aplica headers default/requested', () => {
    vi.stubEnv('NEXTAUTH_URL', 'not-a-url')
    vi.stubEnv('CORS_ALLOWED_ORIGINS', 'notaurl, https://ok.example/path')

    expect(isAllowedOrigin('https://ok.example')).toBe(true)

    const headers = new Headers()
    applyCorsHeaders(headers, 'https://ok.example')
    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://ok.example')
    expect(headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization, X-Requested-With')

    const requested = new Headers()
    applyCorsHeaders(requested, 'https://ok.example', 'X-Custom, Authorization')
    expect(requested.get('Access-Control-Allow-Headers')).toBe('X-Custom, Authorization')
    expect(requested.get('Access-Control-Allow-Credentials')).toBeNull()
  })

  it('solo habilita CORS para endpoints públicos explícitos', () => {
    expect(isPublicCorsRequest('/api/vacancies', 'GET')).toBe(true)
    expect(isPublicCorsRequest('/api/vacancies/123', 'GET')).toBe(true)
    expect(isPublicCorsRequest('/api/applications', 'POST')).toBe(true)
    expect(isPublicCorsRequest('/api/contacts', 'POST')).toBe(true)

    expect(isPublicCorsRequest('/api/admin/candidates', 'GET')).toBe(false)
    expect(isPublicCorsRequest('/api/contacts', 'GET')).toBe(false)
    expect(isPublicCorsRequest('/api/vacancies/123', 'PATCH')).toBe(false)
  })

  it('solo agrega allow-credentials cuando se pide explícitamente', () => {
    const headers = new Headers()
    applyCorsHeaders(headers, 'https://ok.example', null, { allowCredentials: true })

    expect(headers.get('Access-Control-Allow-Credentials')).toBe('true')
  })
})
