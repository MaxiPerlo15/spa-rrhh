interface VacancyCardProps {
  id: string
  title: string
  description: string
  location: string
  type: 'full-time' | 'part-time' | 'freelance'
  salary?: string
  onApply: (id: string, title: string) => void
}

export default function VacancyCard({ id, title, description, location, type, salary, onApply }: VacancyCardProps) {
  const typeLabels = {
    'full-time': 'Tiempo Completo',
    'part-time': 'Medio Tiempo',
    'freelance': 'Freelance'
  }

  const typeBadgeColors = {
    'full-time': 'bg-primary-100 text-primary-700',
    'part-time': 'bg-yellow-100 text-yellow-700',
    'freelance': 'bg-purple-100 text-purple-700'
  }

  return (
    <div className="group bg-white rounded-xl shadow-sm p-6 hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-primary-400 hover:scale-[1.02] transform">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Información principal */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            {/* Badge del tipo */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeBadgeColors[type]}`}>
              {typeLabels[type]}
            </span>
            {salary && (
              <span className="text-sm text-gray-600 font-medium">
                {salary}
              </span>
            )}
          </div>

          {/* Título de la vacante */}
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 group-hover:text-primary-500 transition-colors duration-300">
            {title}
          </h3>

          {/* Ubicación */}
          <div className="flex items-center gap-2 text-gray-600 mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">{location}</span>
          </div>

          {/* Descripción resumida */}
          <p className="text-gray-600 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>

        {/* Botón "Postularme" */}
        <div className="md:ml-6 shrink-0">
          <button
            onClick={() => onApply(id, title)}
            className="relative w-full md:w-auto px-8 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl whitespace-nowrap overflow-hidden group-hover:scale-105 shine-effect"
          >
            Postularme
          </button>
        </div>
      </div>
    </div>
  )
}