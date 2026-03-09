'use client'
import { useState, useEffect, useRef } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { scrollToHashWithOffset } from '@/lib/hashScroll'

interface HeroProps {
  onOpenSpontaneousApplication?: () => void
}

export default function Hero({ onOpenSpontaneousApplication }: HeroProps) {
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
    scrollToHashWithOffset(sectionId, 'smooth')
  }

  return (
    <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-900 pt-16">
      {/* Imagen de fondo con efecto parallax */}
      <div 
        className="absolute inset-0 w-full h-[120%] bg-cover bg-center transition-transform duration-100"
        style={{ 
          transform: `translateY(${scrollY * 0.3}px)`, 
          top: '-10%',
          backgroundImage: 'url(/hero-bg.webp)',
          filter: 'blur(2px)'
        }}
      />

      {/* Overlay con gradiente mejorado para contraste y color azul francia */}
      <div className="absolute inset-0 bg-linear-to-b from-primary-600/70 via-primary-500/60 to-primary-700/70"></div>
      
      {/* Contenido superpuesto */}
      <div className="container-custom relative z-10 text-center px-4 pb-24 sm:pb-32">
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-[1.08] tracking-tight drop-shadow-lg animate-fade-in">
            Conectamos <span className="text-yellow-400 inline-block hover:scale-110 transition-transform duration-300">Talento</span>
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            con <span className="text-yellow-400 inline-block hover:scale-110 transition-transform duration-300">Oportunidades</span>
          </h1>
          
          <p className="text-base sm:text-xl md:text-2xl text-white/95 max-w-3xl mx-auto text-left sm:text-left drop-shadow-md animate-fade-in" style={{ animationDelay: '0.14s' }}>
            Somos una consultora de Recursos Humanos especializada en selección y desarrollo profesional.
            Ayudamos a empresas a encontrar el talento adecuado y a profesionales a impulsar su carrera.
          </p>
          <p className="text-sm sm:text-base text-white/90 max-w-2xl mx-auto text-left sm:text-left animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Consultora de Recursos Humanos en Las Varillas, Córdoba.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 animate-fade-in" style={{ animationDelay: '0.28s' }}>
            <button
              onClick={() => scrollToSection('#vacantes')}
              className="btn-motion group relative w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-primary-600 text-white font-semibold text-base sm:text-lg rounded-lg shadow-[0_14px_38px_-18px_rgba(0,68,137,0.85)] hover:bg-primary-700 hover:shadow-[0_16px_40px_-18px_rgba(0,51,102,0.9)] overflow-hidden"
            >
              <span className="relative z-10">Ver Ofertas Laborales</span>
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>
            <button
              onClick={() => {
                if (onOpenSpontaneousApplication) {
                  onOpenSpontaneousApplication()
                  return
                }
                scrollToSection('#contacto')
              }}
              className="btn-motion group w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white/10 text-white font-semibold text-base sm:text-lg rounded-lg border-2 border-white/60 hover:bg-white/16 hover:border-white"
            >
              Enviar CV
            </button>
          </div>

          {/* Stats con animación y mejor visibilidad */}
          <div
            ref={statsRef}
            className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 md:gap-10 pt-10 md:pt-16 pb-8 max-w-3xl mx-auto animate-fade-in"
            style={{ animationDelay: '0.42s' }}
          >
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">+{stats.candidates}</p>
              <p className="text-sm md:text-lg text-white font-medium mt-2">Postulantes</p>
            </div>
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">+{stats.companies}</p>
              <p className="text-sm md:text-lg text-white font-medium mt-2">Empresas</p>
            </div>
            <div className="text-center group cursor-default bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 hover:bg-white/20 transition-all duration-300">
              <p className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300">{stats.satisfaction}%</p>
              <p className="text-sm md:text-lg text-white font-medium mt-2">Satisfacción</p>
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
