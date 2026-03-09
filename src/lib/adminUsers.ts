import bcrypt from 'bcrypt'

type PrismaUserDelegate = {
  findUnique: (args: {
    where: { email: string }
    select?: { id?: true; name?: true; email?: true; role?: true }
  }) => Promise<{ id: string; name: string | null; email?: string; role?: string } | null>
  update: (args: {
    where: { id: string }
    data: { passwordHash: string; role: 'ADMIN'; name?: string }
    select: { id: true; email: true; name: true; role: true }
  }) => Promise<{ id: string; email: string; name: string | null; role: string }>
  create: (args: {
    data: { email: string; name: string; passwordHash: string; role: 'ADMIN' }
    select: { id: true; email: true; name: true; role: true }
  }) => Promise<{ id: string; email: string; name: string | null; role: string }>
}

type PrismaLike = {
  user: PrismaUserDelegate
}

export type AdminUserInput = {
  email: string
  password: string
  name?: string
}

export function normalizeAdminEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function createOrUpdateAdminUser(prisma: PrismaLike, input: AdminUserInput) {
  const normalizedEmail = normalizeAdminEmail(input.email)
  const normalizedName = input.name?.trim()
  const passwordHash = await bcrypt.hash(input.password, 10)

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true }
  })

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: 'ADMIN',
        ...(normalizedName ? { name: normalizedName } : {})
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })
  }

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      name: normalizedName || 'Administrador',
      passwordHash,
      role: 'ADMIN'
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  })
}
