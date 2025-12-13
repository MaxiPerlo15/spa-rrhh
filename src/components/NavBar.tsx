'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { href: '/#inicio', label: 'Inicio' },
    { href: '/#nosotros', label: 'Nosotros' },
    { href: '/#servicios', label: 'Servicios' },
    { href: '/#empresas', label: 'Empresas' },
    { href: '/#contacto', label: 'Contacto' },
  ]

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Si es un enlace externo (como /ofertas-laborales), no prevenir default
    if (href.startsWith('/ofertas-laborales')) {
      setMobileMenuOpen(false)
      return
    }
    
    e.preventDefault()
    // Si el href incluye "/" significa que estamos en otra página
    const sectionId = href.includes('/') ? href.split('#')[1] : href.substring(1)
    
    if (href.includes('/')) {
      // Si estamos en otra página, navegar a home primero
      window.location.assign(href)
    } else {
      const target = document.querySelector(`#${sectionId}`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setMobileMenuOpen(false)
      }
    }
  }
  
  return (
    <nav className={`fixed top-0 w-full shadow-lg z-50 transition-all duration-300 ${
      scrolled ? 'bg-primary-600 shadow-2xl' : 'bg-primary-500'
    }`}>
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-2xl font-bold text-white tracking-tight">
              Meinardi&Perlo{' '}
              <span className="text-yellow-400 animate-pulse-subtle inline-block">
                RRHH
              </span>
            </span>
          </Link>

          {/* Links desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleScrollToSection(e, link.href)}
                className="text-white hover:text-yellow-400 font-medium transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            {/* Botón CTA Ver Ofertas */}
            <a
              href="/ofertas-laborales"
              className="px-6 py-2.5 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              Ver Ofertas Laborales
            </a>
          </div>

          {/* Botón hamburguesa para mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-primary-600 transition-colors"
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20 animate-fade-in">
            <div className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleScrollToSection(e, link.href)}
                  className="text-white hover:text-yellow-400 font-medium transition-colors duration-200 py-2"
                >
                  {link.label}
                </a>
              ))}
              {/* Botón CTA en mobile */}
              <a
                href="/ofertas-laborales"
                className="px-6 py-3 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-all duration-300 text-center"
              >
                Ver Ofertas Laborales
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}