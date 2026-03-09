#!/usr/bin/env tsx

import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { createOrUpdateAdminUser } from '@/lib/adminUsers'

type ParsedArgs = {
  email: string
  password: string
  name?: string
}

export function parseCreateAdminArgs(argv: string[]): ParsedArgs {
  const parsed: Partial<ParsedArgs> = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--help' || arg === '-h') {
      printUsage(0)
    }

    if (arg === '--email' && next) {
      parsed.email = next
      index += 1
      continue
    }

    if (arg === '--password' && next) {
      parsed.password = next
      index += 1
      continue
    }

    if (arg === '--name' && next) {
      parsed.name = next
      index += 1
      continue
    }
  }

  if (!parsed.email || !parsed.password) {
    printUsage(1)
  }

  return parsed as ParsedArgs
}

function printUsage(exitCode: number): never {
  const output = exitCode === 0 ? console.log : console.error
  output('Uso: npm run admin:create -- --email admin@empresa.com --password "Password123!" [--name "Nombre"]')
  process.exit(exitCode)
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ DATABASE_URL no está definida')
    process.exit(1)
  }

  const { email, password, name } = parseCreateAdminArgs(process.argv.slice(2))
  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const admin = await createOrUpdateAdminUser(prisma, { email, password, name })
    console.log(`✅ Admin listo: ${admin.email}`)
    console.log(`   Nombre: ${admin.name ?? 'Administrador'}`)
    console.log(`   Rol: ${admin.role}`)
  } catch (error) {
    console.error('❌ Error al crear/actualizar admin:', error instanceof Error ? error.message : error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

const isDirectExecution = process.argv[1]
  ? fileURLToPath(import.meta.url) === process.argv[1]
  : false

if (isDirectExecution) {
  void main()
}
