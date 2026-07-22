// @vitest-environment jsdom

import { createElement, type ReactElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}))

vi.mock('next/font/google', () => ({
  Geist_Mono: () => ({ variable: 'geist-mono' }),
  Manrope: () => ({ variable: 'manrope' }),
  Sora: () => ({ variable: 'sora' }),
}))

vi.mock('next/headers', () => ({ headers: headersMock }))
vi.mock('@/components/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => createElement('div', { 'data-provider': 'auth' }, children),
}))
vi.mock('@/components/CookieNotice', () => ({
  default: () => createElement('div', { 'data-provider': 'cookie-notice' }),
}))
vi.mock('@/components/SentryUserContext', () => ({
  SentryUserContext: () => createElement('div', { 'data-provider': 'sentry-user-context' }),
}))
vi.mock('@/contexts/CspNonceContext', () => ({
  CspNonceProvider: ({ children }: { children: ReactNode }) => createElement('div', { 'data-provider': 'csp-nonce' }, children),
}))
vi.mock('@/contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: ReactNode }) => createElement('div', { 'data-provider': 'toast' }, children),
}))

function hasElementType(node: ReactNode, type: string): boolean {
  if (!node || typeof node !== 'object') return false

  const element = node as ReactElement<{ children?: ReactNode }>
  const elementType = typeof element.type === 'function' ? element.type.name : element.type
  if (elementType === type) return true

  const children = element.props?.children
  return Array.isArray(children)
    ? children.some((child) => hasElementType(child, type))
    : hasElementType(children, type)
}

async function renderRootLayout(springAuthEnabled: boolean) {
  process.env.SPRING_AUTH_ENABLED = String(springAuthEnabled)
  vi.resetModules()
  const { default: RootLayout } = await import('../layout')

  return RootLayout({ children: <main>Admin content</main> })
}

describe('RootLayout auth mode boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    headersMock.mockResolvedValue(new Headers({ 'x-nonce': 'nonce' }))
  })

  it('omits global NextAuth and Sentry user providers in Spring auth mode', async () => {
    const layout = await renderRootLayout(true)

    expect(hasElementType(layout, 'AuthProvider')).toBe(false)
    expect(hasElementType(layout, 'SentryUserContext')).toBe(false)
    expect(hasElementType(layout, 'ToastProvider')).toBe(true)
  })

  it('retains global NextAuth and Sentry user providers in legacy auth mode', async () => {
    const layout = await renderRootLayout(false)

    expect(hasElementType(layout, 'AuthProvider')).toBe(true)
    expect(hasElementType(layout, 'SentryUserContext')).toBe(true)
  })
})
