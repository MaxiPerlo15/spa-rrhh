import Image from 'next/image'

interface FounderCardProps {
  name: string
  role: string
  description: string
  imageUrl: string
}

export default function FounderCard({ name, role, description, imageUrl }: FounderCardProps) {
  return (
    <div className="group bg-white rounded-2xl shadow-card p-8 hover:shadow-2xl transition-all duration-500 text-left transform hover:-translate-y-2 hover:scale-105">
      {/* Imagen cuadrada con bordes redondeados */}
      <div className="relative w-48 h-48 mx-auto mb-6 transform group-hover:scale-110 transition-transform duration-500">
        <div className="absolute inset-0 bg-primary-100 rounded-2xl group-hover:bg-primary-200 transition-colors duration-500"></div>
        <div className="relative w-full h-full rounded-2xl overflow-hidden border-4 border-white shadow-md group-hover:shadow-xl transition-shadow duration-500">
          {imageUrl && imageUrl.startsWith('/') ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 192px, 192px"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-primary-200 to-primary-300 flex items-center justify-center">
              <svg 
                className="w-24 h-24 text-primary-500" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Nombre */}
      <h3 className="text-2xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors duration-300">{name}</h3>
      
      {/* Rol/Título profesional */}
      <p className="text-primary-500 font-semibold mb-4 group-hover:text-primary-700 transition-colors duration-300">{role}</p>
      
      {/* Descripción breve */}
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  )
}
