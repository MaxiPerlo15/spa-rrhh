import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const session = vi.fn(), backend = vi.fn(), headers = vi.fn()
vi.mock('@/lib/springSession', () => ({ getSpringSession: session }))
vi.mock('@/lib/server/springBackend', () => ({ getBackendUrl: backend, getSpringBackendHeaders: headers }))
vi.mock('@/lib/prisma', () => { throw new Error('The settings adapter must not load Prisma') })
const payload = { profile: { id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN' }, preferences: { notificationsEnabled: true, notifyNewApplications: true, notifyNewContacts: false, notifySecurityAlerts: true }, backend: { springVacanciesEnabled: true }, updatedAt: '2026-07-24T12:00:00Z' }
const request = (method = 'GET', body?: unknown) => new NextRequest('https://spa-rrhh.test/api/admin/settings', { method, headers: { Cookie: 'SESSIONID=admin-session', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })

describe('/api/admin/settings Spring adapter', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); backend.mockReturnValue('https://spring.example.com'); headers.mockReturnValue({ 'X-Backend-Api-Key': 'test-token' }); session.mockResolvedValue({ state: 'authorized' }) })
  it('forwards GET and preserves the settings shape with no-store', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })); vi.stubGlobal('fetch', fetchMock)
    const response = await (await import('@/app/api/admin/settings/route')).GET(request())
    expect(response.status).toBe(200); expect(response.headers.get('Cache-Control')).toBe('no-store'); await expect(response.json()).resolves.toEqual(payload)
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/admin/settings', { cache: 'no-store', headers: { 'X-Backend-Api-Key': 'test-token', Cookie: 'SESSIONID=admin-session' } })
  })
  it('validates PATCH then forwards Spring PUT with a rotated session', async () => {
    const setCookie = 'SESSIONID=rotated-session; Path=/; HttpOnly; SameSite=Lax'; session.mockResolvedValue({ state: 'authorized', user: {}, setCookie })
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } })); vi.stubGlobal('fetch', fetchMock)
    const response = await (await import('@/app/api/admin/settings/route')).PATCH(request('PATCH', { name: 'Updated Admin', notifyNewContacts: true }))
    expect(response.status).toBe(200); expect(response.headers.get('Set-Cookie')).toBe(setCookie)
    expect(fetchMock).toHaveBeenCalledWith('https://spring.example.com/api/v1/admin/settings', { method: 'PUT', body: JSON.stringify({ name: 'Updated Admin', notifyNewContacts: true }), cache: 'no-store', headers: { 'Content-Type': 'application/json', 'X-Backend-Api-Key': 'test-token', Cookie: 'SESSIONID=rotated-session' } })
  })
  it.each([[{ state: 'anonymous' }, 401, 'No autorizado'], [{ state: 'forbidden' }, 403, 'No autorizado'], [{ state: 'unavailable' }, 503, 'Spring backend unavailable']])('maps session failures without proxying', async (failed, status, error) => {
    session.mockResolvedValue(failed); const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    const response = await (await import('@/app/api/admin/settings/route')).GET(request())
    expect(response.status).toBe(status); expect(response.headers.get('Cache-Control')).toBe('no-store'); await expect(response.json()).resolves.toEqual({ error }); expect(fetchMock).not.toHaveBeenCalled()
  })
  it('returns the validation envelope before proxying invalid settings', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
    const response = await (await import('@/app/api/admin/settings/route')).PATCH(request('PATCH', {}))
    expect(response.status).toBe(400); await expect(response.json()).resolves.toEqual({ error: 'Datos inválidos', details: [{ field: '', message: 'Debes enviar al menos un campo para actualizar' }] }); expect(fetchMock).not.toHaveBeenCalled()
  })
})
