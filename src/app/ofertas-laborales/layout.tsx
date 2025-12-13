import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ofertas Laborales Disponibles',
  description: 'Explora todas las oportunidades laborales disponibles. Encuentra empleos presenciales, remotos e híbridos en diversas áreas. Filtra por modalidad, jornada y ubicación.',
  keywords: ['empleos', 'ofertas laborales', 'trabajo', 'vacantes', 'buscar empleo', 'oportunidades laborales', 'Las Varillas', 'Córdoba', 'trabajo remoto', 'trabajo presencial'],
  openGraph: {
    title: 'Ofertas Laborales Disponibles | Meinardi&Perlo RRHH',
    description: 'Explora todas las oportunidades laborales disponibles. Encuentra empleos presenciales, remotos e híbridos.',
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
