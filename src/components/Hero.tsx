'use client'
import { useState, useEffect } from 'react'

export default function Hero() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 pt-16">
      {/* Imagen de fondo con efecto parallax */}
      <div 
        className="absolute inset-0 w-full h-[120%] bg-cover bg-center transition-transform duration-100"
        style={{ 
          transform: `translateY(${scrollY * 0.3}px)`, 
          top: '-10%',
          backgroundImage: 'url(/hero-bg.jpg)',
          filter: 'blur(2px)'
        }}
      />

      {/* Overlay con gradiente mejorado para contraste y color azul francia */}
      <div className="absolute inset-0 bg-linear-to-b from-primary-600/70 via-primary-500/60 to-primary-700/70"></div>
      
      {/* Contenido superpuesto */}
      <div className="container-custom relative z-10 text-center px-4 pb-32">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight drop-shadow-lg animate-fade-in">
            Conectamos <span className="text-yellow-400 inline-block hover:scale-110 transition-transform duration-300">Talento</span> con{' '}
            <span className="text-yellow-400 inline-block hover:scale-110 transition-transform duration-300">Oportunidades</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/95 max-w-3xl mx-auto drop-shadow-md animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Somos una consultora especializada en Recursos Humanos que acompaña a empresas 
            y profesionales en su crecimiento. Encuentra tu próxima oportunidad laboral con nosotros.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={() => scrollToSection('#vacantes')}
              className="group relative px-10 py-5 bg-primary-500 text-white font-semibold text-lg rounded-lg shadow-2xl hover:bg-primary-600 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10">Ver Vacantes</span>
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
            <button
              onClick={() => scrollToSection('#contacto')}
              className="group px-10 py-5 bg-white text-primary-500 font-semibold text-lg rounded-lg shadow-2xl hover:bg-gray-50 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 border-2 border-white/20 hover:border-primary-300"
            >
              Contactanos
            </button>
          </div>

          {/* Stats con animación y mejor visibilidad */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 pt-12 md:pt-16 pb-8 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">+100</p>
              <p className="text-xs md:text-base text-white font-medium mt-2">Postulantes</p>
            </div>
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">+50</p>
              <p className="text-xs md:text-base text-white font-medium mt-2">Empresas</p>
            </div>
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">98%</p>
              <p className="text-xs md:text-base text-white font-medium mt-2">Satisfacción</p>
            </div>
          </div>
        </div>
      </div>

      {/* Onda decorativa inferior */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="white"
          />
        </svg>
      </div>
    </section>
  )
}