// Tipos
export interface Vacancy {
  id: string
  title: string
  description: string
  location: string
  type: 'full-time' | 'part-time' | 'freelance'
  salary?: string
  requirements?: string[]
  responsibilities?: string[]
  createdAt: string
}

export interface Founder {
  id: string
  name: string
  role: string
  description: string
  imageUrl: string
}

// Datos mock de vacantes
export const mockVacancies: Vacancy[] = [
  {
    id: '1',
    title: 'Desarrollador Full Stack',
    description: 'Buscamos un desarrollador Full Stack con experiencia en React y Node.js para unirse a un equipo innovador. Trabajarás en proyectos desafiantes y tendrás oportunidades de crecimiento profesional.',
    location: 'Buenos Aires, Argentina',
    type: 'full-time',
    salary: '$150.000 - $200.000',
    requirements: [
      'Experiencia mínima de 3 años en desarrollo Full Stack',
      'Conocimientos sólidos en React, Node.js y TypeScript',
      'Experiencia con bases de datos SQL y NoSQL',
      'Inglés intermedio'
    ],
    responsibilities: [
      'Desarrollar y mantener aplicaciones web',
      'Colaborar con el equipo de diseño',
      'Participar en revisiones de código',
      'Optimizar el rendimiento de aplicaciones'
    ],
    createdAt: '2025-12-01'
  },
  {
    id: '2',
    title: 'Diseñador UX/UI',
    description: 'Empresa líder en tecnología busca diseñador UX/UI creativo y apasionado. Serás responsable de crear experiencias digitales excepcionales para nuestros usuarios.',
    location: 'Remoto',
    type: 'full-time',
    salary: '$120.000 - $160.000',
    requirements: [
      'Portfolio demostrable',
      'Experiencia con Figma o Adobe XD',
      'Conocimientos de diseño centrado en el usuario',
      'Habilidades de prototipado'
    ],
    responsibilities: [
      'Diseñar interfaces intuitivas',
      'Realizar investigación de usuarios',
      'Crear wireframes y prototipos',
      'Colaborar con desarrolladores'
    ],
    createdAt: '2025-12-05'
  },
  {
    id: '3',
    title: 'Project Manager IT',
    description: 'Buscamos un Project Manager con experiencia en metodologías ágiles para liderar proyectos tecnológicos. Serás responsable de coordinar equipos multidisciplinarios y garantizar la entrega exitosa de proyectos.',
    location: 'Córdoba, Argentina',
    type: 'full-time',
    salary: '$180.000 - $220.000',
    requirements: [
      'Certificación PMP o Scrum Master',
      'Experiencia mínima de 5 años en gestión de proyectos',
      'Conocimiento de metodologías ágiles',
      'Excelentes habilidades de comunicación'
    ],
    responsibilities: [
      'Planificar y ejecutar proyectos',
      'Coordinar equipos de desarrollo',
      'Gestionar stakeholders',
      'Monitorear presupuestos y tiempos'
    ],
    createdAt: '2025-12-08'
  },
  {
    id: '4',
    title: 'Analista de Datos',
    description: 'Empresa en expansión busca Analista de Datos para transformar información en insights accionables. Trabajarás con grandes volúmenes de datos y herramientas de visualización.',
    location: 'Rosario, Argentina',
    type: 'part-time',
    salary: '$80.000 - $100.000',
    requirements: [
      'Experiencia con SQL y Python',
      'Conocimientos de Power BI o Tableau',
      'Habilidades analíticas y estadísticas',
      'Atención al detalle'
    ],
    responsibilities: [
      'Analizar conjuntos de datos',
      'Crear dashboards y reportes',
      'Identificar tendencias y patrones',
      'Presentar hallazgos al equipo'
    ],
    createdAt: '2025-12-10'
  },
  {
    id: '5',
    title: 'Community Manager',
    description: 'Agencia de marketing digital busca Community Manager creativo para gestionar redes sociales de clientes destacados. Crearás contenido atractivo y gestionarás comunidades online.',
    location: 'Mendoza, Argentina',
    type: 'freelance',
    salary: 'A convenir',
    requirements: [
      'Experiencia mínima de 2 años en redes sociales',
      'Excelente redacción',
      'Conocimientos de diseño básico',
      'Creatividad y proactividad'
    ],
    responsibilities: [
      'Gestionar redes sociales',
      'Crear contenido multimedia',
      'Interactuar con la comunidad',
      'Analizar métricas de engagement'
    ],
    createdAt: '2025-12-12'
  }
]

// Datos mock de fundadores
export const mockFounders: Founder[] = [
  {
    id: '1',
    name: 'María García',
    role: 'Co-Fundadora & Directora de RRHH',
    description: 'Licenciada en Recursos Humanos con más de 15 años de experiencia en selección y desarrollo de talento. Especializada en gestión estratégica y consultoría organizacional.',
    imageUrl: '/logorrhh.webp'
  },
  {
    id: '2',
    name: 'Laura Rodríguez',
    role: 'Co-Fundadora & Consultora Senior',
    description: 'Psicóloga Laboral con expertise en evaluación de competencias y coaching ejecutivo. Apasionada por el desarrollo profesional y el bienestar organizacional.',
    imageUrl: '/logorrhh.webp'
  }
]
