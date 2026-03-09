'use client'
import Image from 'next/image'

interface ServiceCardProps {
  title: string
  description: string
  imageUrl: string
  isVisible: boolean
  delayMs: number
}

export default function ServiceCard({ title, description, imageUrl, isVisible, delayMs }: ServiceCardProps) {
  return (
    <article 
      className={`group card-lift bg-white rounded-2xl shadow-card overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 animate-on-scroll ${
        isVisible ? 'is-visible' : ''
      }`}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {/* Imagen del servicio */}
      <div className="relative h-56 w-full overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={title}
          fill
          loading="eager"
          fetchPriority="high"
          className="object-cover transition-transform duration-200 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Overlay sutil */}
        <div className="absolute inset-0 bg-linear-to-t from-primary-900/40 to-transparent"></div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors duration-200">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed overflow-hidden [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]">
          {description}
        </p>
      </div>
    </article>
  )
}
