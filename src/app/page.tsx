import type { Metadata } from 'next'
import HomeClient from '@/app/home-client'

export const metadata: Metadata = {
  title: {
    absolute: 'Consultora de Recursos Humanos en Las Varillas | Meinardi & Perlo'
  },
  description:
    'Consultora de Recursos Humanos en Las Varillas, Córdoba. Selección de personal, búsqueda laboral y desarrollo profesional.'
}

export default function HomePage() {
  return <HomeClient />
}
