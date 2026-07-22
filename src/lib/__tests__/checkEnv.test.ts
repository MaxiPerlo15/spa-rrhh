import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { validateRuntimeEnv } from '@/lib/checkEnv'

const ORIGINAL_ENV = process.env

describe('validateRuntimeEnv', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
    const env = process.env as Record<string, string | undefined>

    env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/spa_rrhh_db?schema=public'
    env.NEXTAUTH_SECRET = 'secret'
    delete env.NEXTAUTH_URL
    delete env.UPLOADTHING_TOKEN
    delete env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    delete env.TURNSTILE_SECRET_KEY
    delete env.UPSTASH_REDIS_REST_URL
    delete env.UPSTASH_REDIS_REST_TOKEN
    delete env.AUDIT_CRON_SECRET
    delete env.CV_RETENTION_CRON_SECRET
    delete env.RESEND_API_KEY
    delete env.FROM_EMAIL
    delete env.BACKEND_URL
    delete env.BACKEND_INTERNAL_API_TOKEN
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
    vi.restoreAllMocks()
  })

  it('fails in production when DATABASE_URL disables ssl', () => {
    const env = process.env as Record<string, string | undefined>

    env.NODE_ENV = 'production'
    env.DATABASE_URL = 'postgresql://user:pass@db.example.com/app?sslmode=disable'
    env.NEXTAUTH_URL = 'https://app.example.com'
    env.UPLOADTHING_TOKEN = 'token'
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    env.TURNSTILE_SECRET_KEY = 'secret-key'
    env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
    env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token'
    env.AUDIT_CRON_SECRET = 'audit'
    env.CV_RETENTION_CRON_SECRET = 'cv'
    env.RESEND_API_KEY = 'resend'
    env.FROM_EMAIL = 'noreply@example.com'

    expect(() => validateRuntimeEnv()).toThrow('DATABASE_URL no puede deshabilitar SSL en producción')
  })

  it('warns in production when Neon URL is not using the pooler host', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const env = process.env as Record<string, string | undefined>

    env.NODE_ENV = 'production'
    env.DATABASE_URL = 'postgresql://user:pass@ep-cool-darkness-123456.us-east-2.aws.neon.tech/app?sslmode=require'
    env.NEXTAUTH_URL = 'https://app.example.com'
    env.UPLOADTHING_TOKEN = 'token'
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    env.TURNSTILE_SECRET_KEY = 'secret-key'
    env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
    env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token'
    env.AUDIT_CRON_SECRET = 'audit'
    env.CV_RETENTION_CRON_SECRET = 'cv'
    env.RESEND_API_KEY = 'resend'
    env.FROM_EMAIL = 'noreply@example.com'

    expect(() => validateRuntimeEnv()).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('DATABASE_URL apunta a Neon sin hostname de pooler')
    )
  })

  it('fails in production when BACKEND_URL is configured without the internal token', () => {
    const env = process.env as Record<string, string | undefined>

    env.NODE_ENV = 'production'
    env.DATABASE_URL = 'postgresql://user:pass@db.example.com/app?sslmode=require'
    env.NEXTAUTH_URL = 'https://app.example.com'
    env.UPLOADTHING_TOKEN = 'token'
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    env.TURNSTILE_SECRET_KEY = 'secret-key'
    env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
    env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token'
    env.AUDIT_CRON_SECRET = 'audit'
    env.CV_RETENTION_CRON_SECRET = 'cv'
    env.RESEND_API_KEY = 'resend'
    env.FROM_EMAIL = 'noreply@example.com'
    env.BACKEND_URL = 'https://spring.example.com'

    expect(() => validateRuntimeEnv()).toThrow('BACKEND_INTERNAL_API_TOKEN')
  })

  it('fails in production when BACKEND_URL points to localhost', () => {
    const env = process.env as Record<string, string | undefined>

    env.NODE_ENV = 'production'
    env.DATABASE_URL = 'postgresql://user:pass@db.example.com/app?sslmode=require'
    env.NEXTAUTH_URL = 'https://app.example.com'
    env.UPLOADTHING_TOKEN = 'token'
    env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = 'site-key'
    env.TURNSTILE_SECRET_KEY = 'secret-key'
    env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
    env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token'
    env.AUDIT_CRON_SECRET = 'audit'
    env.CV_RETENTION_CRON_SECRET = 'cv'
    env.RESEND_API_KEY = 'resend'
    env.FROM_EMAIL = 'noreply@example.com'
    env.BACKEND_URL = 'http://localhost:8080'
    env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'

    expect(() => validateRuntimeEnv()).toThrow('BACKEND_URL cannot point to localhost in production')
  })

  it('fails when BACKEND_URL does not use http or https', () => {
    const env = process.env as Record<string, string | undefined>

    env.BACKEND_URL = 'ftp://spring.example.com'
    env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'

    expect(() => validateRuntimeEnv()).toThrow('BACKEND_URL must use http/https protocol')
  })

  it('rejects a public Spring mode flag that disagrees with the server mode', () => {
    const env = process.env as Record<string, string | undefined>

    env.SPRING_AUTH_ENABLED = 'true'
    env.BACKEND_URL = 'https://spring.example.com'
    env.BACKEND_INTERNAL_API_TOKEN = 'shared-secret'
    env.NEXT_PUBLIC_SPRING_AUTH_ENABLED = 'false'

    expect(() => validateRuntimeEnv()).toThrow('NEXT_PUBLIC_SPRING_AUTH_ENABLED must match SPRING_AUTH_ENABLED')
  })
})
