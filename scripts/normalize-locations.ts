import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { normalizeLocation } from '@/lib/utils'


const connectionString = process.env.DATABASE_URL || 'postgresql://maxiperlo@localhost:5432/spa_rrhh_db?schema=public'
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })


async function normalizeAllLocations() {
  try {
    console.log('🔄 Iniciando normalización de ubicaciones...\n')

    // Obtener todas las vacantes
    const vacancies = await prisma.vacancy.findMany()
    
    console.log(`📋 Encontradas ${vacancies.length} vacantes\n`)

    let updatedCount = 0

    // Normalizar cada ubicación
    for (const vacancy of vacancies) {
      const normalizedLocation = normalizeLocation(vacancy.location)
      
      if (vacancy.location !== normalizedLocation) {
        console.log(`✏️  Actualizando: "${vacancy.location}" → "${normalizedLocation}"`)
        
        await prisma.vacancy.update({
          where: { id: vacancy.id },
          data: { location: normalizedLocation }
        })
        
        updatedCount++
      } else {
        console.log(`✓  Ya normalizada: "${vacancy.location}"`)
      }
    }

    console.log(`\n✅ Proceso completado!`)
    console.log(`   - Total de vacantes: ${vacancies.length}`)
    console.log(`   - Actualizadas: ${updatedCount}`)
    console.log(`   - Sin cambios: ${vacancies.length - updatedCount}`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

normalizeAllLocations()
