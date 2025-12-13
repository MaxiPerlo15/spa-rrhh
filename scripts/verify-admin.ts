#!/usr/bin/env tsx
/**
 * Script para verificar que el usuario admin existe en la base de datos
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('❌ DATABASE_URL no está definida')
  process.exit(1)
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🔍 Verificando usuario admin...\n')

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true
    }
  })

  if (admins.length === 0) {
    console.log('❌ No se encontraron usuarios admin')
    console.log('\n💡 Ejecuta: npm run db:seed')
    process.exit(1)
  }

  console.log(`✅ Encontrados ${admins.length} usuario(s) admin:\n`)
  admins.forEach((admin, index) => {
    console.log(`${index + 1}. ${admin.name} (${admin.email})`)
    console.log(`   ID: ${admin.id}`)
    console.log(`   Creado: ${admin.createdAt.toLocaleString('es-AR')}\n`)
  })

  console.log('✅ La base de datos está lista para usar')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
