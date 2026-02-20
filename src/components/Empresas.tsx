'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Company {
  id: number
  name: string
  logo?: string
  logoImage?: string
}

// Empresas placeholder - podrás reemplazar con logos reales
const companies: Company[] = [
  { id: 1, name: 'TBEH', logoImage: '/logo-tbeh.webp' },
  { id: 2, name: 'InnovaSoft', logo: '💼' },
  { id: 3, name: 'DataSolutions', logo: '📊' },
  { id: 4, name: 'CloudServe', logo: '☁️' },
  { id: 5, name: 'FinTech Pro', logo: '💰' },
  { id: 6, name: 'StartUp Lab', logo: '🚀' },
  { id: 7, name: 'Global Trade', logo: '🌍' },
  { id: 8, name: 'Smart Systems', logo: '⚙️' },
  { id: 9, name: 'CodeMasters', logo: '💻' },
  { id: 10, name: 'Digital Hub', logo: '🎯' },
]

export default function Empresas() {
  const { ref, isVisible } = useScrollAnimation()
  const prefersReducedMotion = useReducedMotion()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isPausedRef = useRef(false)

  useEffect(() => {
    const scrollElement = scrollContainerRef.current

    if (!scrollElement || prefersReducedMotion || !isVisible) {
      return
    }

    let animationFrame = 0
    let lastTime = performance.now()
    let edgePauseUntil = 0
    let direction: 1 | -1 = 1
    const speedPxPerSecond = 36
    const edgePauseMs = 1200

    const animate = (time: number) => {
      const maxScroll = scrollElement.scrollWidth - scrollElement.clientWidth

      if (maxScroll <= 0) {
        animationFrame = requestAnimationFrame(animate)
        return
      }

      if (isPausedRef.current) {
        lastTime = time
        animationFrame = requestAnimationFrame(animate)
        return
      }

      if (time < edgePauseUntil) {
        lastTime = time
        animationFrame = requestAnimationFrame(animate)
        return
      }

      const deltaSeconds = (time - lastTime) / 1000
      lastTime = time
      let nextScrollLeft = scrollElement.scrollLeft + direction * speedPxPerSecond * deltaSeconds

      if (nextScrollLeft >= maxScroll) {
        nextScrollLeft = maxScroll
        direction = -1
        edgePauseUntil = time + edgePauseMs
      } else if (nextScrollLeft <= 0) {
        nextScrollLeft = 0
        direction = 1
        edgePauseUntil = time + edgePauseMs
      }

      scrollElement.scrollLeft = nextScrollLeft
      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrame)
  }, [isVisible, prefersReducedMotion])

  return (
    <section id="empresas" className="section-padding bg-linear-to-b from-gray-800 to-gray-900">
      <div className="container-custom">
        <div 
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`text-center mb-12 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Empresas que Confían en Nosotros
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Colaboramos con las mejores organizaciones para encontrar el talento que impulsa su crecimiento
          </p>
        </div>

        {/* Contenedor con scroll horizontal */}
        <div className="relative">
          {/* Gradientes de desvanecimiento en los bordes */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-linear-to-r from-gray-900 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-linear-to-l from-gray-900 to-transparent z-10 pointer-events-none"></div>
          
          {/* Scroll horizontal de logos */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide pb-4"
            onMouseEnter={() => {
              isPausedRef.current = true
            }}
            onMouseLeave={() => {
              isPausedRef.current = false
            }}
            onTouchStart={() => {
              isPausedRef.current = true
            }}
            onTouchEnd={() => {
              isPausedRef.current = false
            }}
          >
            <div className="flex gap-8 min-w-max px-4">
              {companies.map((company, index) => (
                <div
                  key={company.id}
                  className={`flex flex-col items-center justify-center p-8 bg-gray-700/50 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-2xl hover:bg-gray-700/70 transition-all duration-500 group cursor-default border border-gray-600/30 min-w-50 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ 
                    transitionDelay: `${index * 50}ms`,
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  {/* Logo - Imagen real o emoji */}
                  {company.logoImage ? (
                    <div className="relative w-32 h-32 mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Image
                        src={company.logoImage}
                        alt={`${company.name} logo`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      {company.logo}
                    </div>
                  )}
                  <p className="text-gray-200 font-semibold text-center group-hover:text-yellow-400 transition-colors duration-300">
                    {company.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mensaje adicional */}
        <div 
          className={`mt-12 text-center transition-all duration-1000 delay-500 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <p className="text-gray-300 text-lg">
            ¿Tu empresa necesita talento de calidad?{' '}
            <a 
              href="#contacto" 
              className="text-yellow-400 hover:text-yellow-300 font-semibold underline decoration-2 underline-offset-4 hover:decoration-yellow-500 transition-all duration-300"
            >
              Contáctanos
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
