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
    description: "Realizamos entrevistas virtuales ágiles para evaluar mejor a cada candidato y acelerar tus procesos de selección.",
    imageUrl: "/servicio1.webp"
  },
  {
    id: 2,
    title: "Comunicación Organizacional",
    description: "Diseñamos estrategias de comunicación interna que alinean equipos, fortalecen la cultura y mejoran el clima laboral.",
    imageUrl: "/servicio3.webp"
  },
  {
    id: 3,
    title: "Evaluación de Desempeño",
    description: "Implementamos evaluaciones objetivas para medir rendimiento, detectar mejoras y potenciar el desarrollo profesional.",
    imageUrl: "/servicio2.webp"
  },
  {
    id: 4,
    title: "Cultura Organizacional",
    description: "Fortalecemos la cultura de tu empresa alineando valores y prácticas para construir equipos sólidos y productivos.",
    imageUrl: "/servicio4.webp"
  }
]
