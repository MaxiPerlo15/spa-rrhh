// NOTE: Prisma-based admin user creation removed in Phase 4 (PR 4).
// Admin user creation is now Spring-only via POST /api/v1/admin/users.
// Rollback: re-enable Prisma fallback by restoring the legacy path below.

export type AdminUserInput = {
  email: string
  password: string
  name?: string
}

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase()
}

/**
 * Creates or updates an admin user via Spring backend API.
 * Requires SPRING_AUTH_ENABLED=true and BACKEND_URL to be set.
 */
export async function createOrUpdateAdminUser(_prisma: unknown, input: AdminUserInput) {
  const normalizedEmail = normalizeAdminEmail(input.email)
  const normalizedName = input.name?.trim()

  const backendUrl = process.env.BACKEND_URL?.trim().replace(/\/+$/, '')
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required when SPRING_AUTH_ENABLED is true')
  }

  const response = await fetch(`${backendUrl}/api/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.BACKEND_INTERNAL_API_TOKEN
        ? { 'X-Backend-Api-Key': process.env.BACKEND_INTERNAL_API_TOKEN }
        : {})
    },
    body: JSON.stringify({
      email: normalizedEmail,
      password: input.password,
      name: normalizedName || 'Administrador'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Spring user creation failed: ${response.status} ${error}`)
  }

  return response.json()
}
