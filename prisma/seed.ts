import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL || 'postgresql://maxiperlo@localhost:5432/spa_rrhh_db?schema=public'
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Crear vacantes de ejemplo
  const vacancies = await prisma.vacancy.createMany({
    data: [
      {
        title: 'Desarrollador Full Stack',
        description: 'Buscamos un desarrollador full stack con experiencia en React y Node.js para unirse a nuestro equipo de desarrollo.',
        location: 'Las Varillas, Córdoba',
        type: 'FULL_TIME',
        salary: '$1,500,000 - $2,000,000',
        requirements: 'Experiencia mínima de 3 años en desarrollo web, conocimientos en React, Node.js, TypeScript, PostgreSQL.',
        benefits: 'Salario competitivo, trabajo remoto flexible, capacitaciones constantes.',
        status: 'ACTIVE'
      },
      {
        title: 'Diseñador UX/UI',
        description: 'Estamos en búsqueda de un diseñador UX/UI creativo para mejorar la experiencia de usuario en nuestras plataformas digitales.',
        location: 'Remoto',
        type: 'FULL_TIME',
        salary: '$1,200,000 - $1,800,000',
        requirements: 'Portfolio de diseño, experiencia con Figma, Adobe XD, conocimientos en diseño responsive.',
        benefits: 'Trabajo 100% remoto, horarios flexibles, días de descanso adicionales.',
        status: 'ACTIVE'
      },
      {
        title: 'Analista de Datos',
        description: 'Únete a nuestro equipo como analista de datos para ayudar a transformar información en insights accionables.',
        location: 'Buenos Aires',
        type: 'FULL_TIME',
        salary: '$1,400,000 - $1,900,000',
        requirements: 'Experiencia en SQL, Python, Power BI, conocimientos en estadística y análisis de datos.',
        benefits: 'Excelente ambiente laboral, capacitación continua, bonos por desempeño.',
        status: 'ACTIVE'
      },
      {
        title: 'Asistente Administrativo',
        description: 'Buscamos un asistente administrativo para dar soporte en tareas organizacionales y de gestión.',
        location: 'Las Varillas, Córdoba',
        type: 'PART_TIME',
        salary: '$600,000 - $800,000',
        requirements: 'Experiencia en administración, manejo de herramientas ofimáticas, habilidades organizativas.',
        benefits: 'Horario flexible, oportunidad de crecimiento, ambiente colaborativo.',
        status: 'ACTIVE'
      },
      {
        title: 'Especialista en Marketing Digital',
        description: 'Se requiere especialista en marketing digital para desarrollar estrategias de crecimiento online.',
        location: 'Remoto',
        type: 'FREELANCE',
        salary: 'A convenir según proyecto',
        requirements: 'Experiencia en SEO, SEM, redes sociales, Google Analytics, campañas de email marketing.',
        benefits: 'Proyectos flexibles, trabajo desde casa, colaboración con marcas reconocidas.',
        status: 'ACTIVE'
      }
    ]
  })

  console.log(`✅ Creadas ${vacancies.count} vacantes`)
  console.log('🎉 Seed completado exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
