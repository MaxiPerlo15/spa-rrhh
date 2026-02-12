'use client'
import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

export default function Hero() {
  const [scrollY, setScrollY] = useState(0)
  const [stats, setStats] = useState({
    candidates: 0,
    companies: 0,
    satisfaction: 0,
  })
  const hasAnimatedStatsRef = useRef(false)
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation<HTMLDivElement>(0.3)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) {
      return
    }

    let ticking = false
    const handleScroll = () => {
      if (ticking) {
        return
      }

      ticking = true
      requestAnimationFrame(() => {
        setScrollY(window.scrollY)
        ticking = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [prefersReducedMotion])

  useEffect(() => {
    if (!statsVisible || hasAnimatedStatsRef.current) {
      return
    }

    const targetStats = {
      candidates: 100,
      companies: 50,
      satisfaction: 98,
    }

    hasAnimatedStatsRef.current = true

    if (prefersReducedMotion) {
      const reducedMotionTimer = setTimeout(() => {
        setStats(targetStats)
      }, 0)
      return () => clearTimeout(reducedMotionTimer)
    }

    const duration = 1400
    const startTime = performance.now()
    let animationFrame = 0

    const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3)

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1)
      const easedProgress = easeOutCubic(progress)

      setStats({
        candidates: Math.round(targetStats.candidates * easedProgress),
        companies: Math.round(targetStats.companies * easedProgress),
        satisfaction: Math.round(targetStats.satisfaction * easedProgress),
      })

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationFrame)
  }, [statsVisible, prefersReducedMotion])

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(sectionId)
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.scrollY
      const offsetPosition = elementPosition - 64
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })
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
      <div className="container-custom relative z-10 text-center px-4 pb-24 sm:pb-32">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-tight drop-shadow-lg animate-fade-in">
            Conectamos <span className="text-yellow-400 inline-block hover:scale-110 transition-transform duration-300">Talento</span> con{' '}
            <span className="text-yellow-400 inline-block hover:scale-110 transition-transform duration-300">Oportunidades</span>
          </h1>
          
          <p className="text-base sm:text-xl md:text-2xl text-white/95 max-w-3xl mx-auto drop-shadow-md animate-fade-in" style={{ animationDelay: '0.14s' }}>
            Somos una consultora especializada en Recursos Humanos que acompaña a empresas 
            y profesionales en su crecimiento. Encuentra tu próxima oportunidad laboral con nosotros.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-fade-in" style={{ animationDelay: '0.28s' }}>
            <button
              onClick={() => scrollToSection('#vacantes')}
              className="btn-motion group relative w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-primary-500 text-white font-semibold text-base sm:text-lg rounded-lg shadow-2xl hover:bg-primary-600 hover:shadow-xl hover:scale-105 overflow-hidden"
            >
              <span className="relative z-10">Ver Vacantes</span>
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
            <button
              onClick={() => scrollToSection('#contacto')}
              className="btn-motion group w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-primary-500 font-semibold text-base sm:text-lg rounded-lg shadow-2xl hover:bg-gray-50 hover:scale-105 border-2 border-white/20 hover:border-primary-300"
            >
              Contactanos
            </button>
          </div>

          {/* Stats con animación y mejor visibilidad */}
          <div
            ref={statsRef}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-8 pt-10 md:pt-16 pb-8 max-w-3xl mx-auto animate-fade-in"
            style={{ animationDelay: '0.42s' }}
          >
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">+{stats.candidates}</p>
              <p className="text-xs md:text-base text-white font-medium mt-2">Postulantes</p>
            </div>
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">+{stats.companies}</p>
              <p className="text-xs md:text-base text-white font-medium mt-2">Empresas</p>
            </div>
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">{stats.satisfaction}%</p>
              <p className="text-xs md:text-base text-white font-medium mt-2">Satisfacción</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-float pointer-events-none absolute -left-12 top-28 h-40 w-40 rounded-full bg-yellow-400/15 blur-3xl"></div>
      <div className="hero-float hero-float-delay pointer-events-none absolute -right-10 top-44 h-48 w-48 rounded-full bg-primary-200/25 blur-3xl"></div>

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
