'use client'
import ServiceCard from './ServiceCard'
import { services } from '@/data/services'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function Servicios() {
  const { ref: sectionRef, isVisible } = useScrollAnimation<HTMLElement>()
  
  return (
    <section ref={sectionRef} id="servicios" className={`section-padding bg-white animate-on-scroll ${isVisible ? 'is-visible' : ''}`}>
      <div className="container-custom">
        {/* Título y descripción */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className={`text-4xl md:text-5xl font-bold text-gray-900 mb-6 animate-on-scroll ${isVisible ? 'is-visible' : ''}`}>
            Nuestros <span className="text-primary-500 inline-block hover:scale-110 transition-transform duration-300">Servicios</span>
          </h2>
          <p className={`text-lg text-gray-600 leading-relaxed animate-on-scroll reveal-delay-2 ${isVisible ? 'is-visible' : ''}`}>
            Ofrecemos soluciones integrales en Recursos Humanos para impulsar el crecimiento 
            de tu organización y el desarrollo de tu equipo.
          </p>
        </div>

        {/* Grid de servicios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              description={service.description}
              imageUrl={service.imageUrl}
              isVisible={isVisible}
              delayMs={220 + (index * 180)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
