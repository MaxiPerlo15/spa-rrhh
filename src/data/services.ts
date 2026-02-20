export interface Service {
  id: number
  title: string
  description: string
  imageUrl: string
}

export const services: Service[] = [
  {
    id: 1,
    title: "Entrevistas Virtuales",
    description: "Realizamos entrevistas remotas profesionales que permiten evaluar candidatos de manera eficiente, ahorrando tiempo y ampliando el alcance geográfico en los procesos de selección.",
    imageUrl: "/servicio1.webp"
  },
  {
    id: 2,
    title: "Comunicación Organizacional",
    description: "Diseñamos e implementamos estrategias de comunicación interna que fortalecen la cultura organizacional, mejoran el clima laboral y alinean a todos los equipos con los objetivos de la empresa.",
    imageUrl: "/servicio3.webp"
  },
  {
    id: 3,
    title: "Evaluación de Desempeño",
    description: "Implementamos sistemas de evaluación objetivos que permiten medir el rendimiento, identificar fortalezas y áreas de mejora en tu equipo de trabajo, impulsando el desarrollo profesional.",
    imageUrl: "/servicio2.webp"
  },
  {
    id: 4,
    title: "Cultura Organizacional",
    description: "Trabajamos en el desarrollo y fortalecimiento de la cultura empresarial, alineando valores, comportamientos y prácticas para crear un ambiente laboral positivo y productivo.",
    imageUrl: "/servicio4.webp"
  }
]
