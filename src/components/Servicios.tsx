'use client'
import ServiceCard from './ServiceCard'
import { services } from '@/data/services'

export default function Servicios() {
  return (
    <section id="servicios" className="section-padding bg-white">
      <div className="container-custom">
        {/* Título y descripción */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Nuestros <span className="text-primary-500">Servicios</span>
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            Ofrecemos soluciones integrales en Recursos Humanos para impulsar el crecimiento 
            de tu organización y el desarrollo de tu equipo.
          </p>
        </div>

        {/* Grid de servicios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              description={service.description}
              imageUrl={service.imageUrl}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
