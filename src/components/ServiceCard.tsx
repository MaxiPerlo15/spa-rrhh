'use client'
import Image from 'next/image'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

interface ServiceCardProps {
  title: string
  description: string
  imageUrl: string
}

export default function ServiceCard({ title, description, imageUrl }: ServiceCardProps) {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <article 
      ref={ref}
      className={`bg-white rounded-2xl shadow-card overflow-hidden transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:scale-105 ${
        isVisible ? 'animate-on-scroll is-visible' : 'animate-on-scroll'
      }`}
    >
      {/* Imagen del servicio */}
      <div className="relative h-56 w-full overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Overlay sutil */}
        <div className="absolute inset-0 bg-linear-to-t from-primary-900/40 to-transparent"></div>
      </div>

      {/* Contenido */}
      <div className="p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary-600 transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {description}
        </p>
      </div>
    </article>
  )
}
