'use client'

import { useState } from 'react'

interface VacancyCardProps {
  id: string
  title: string
  description: string
  location: string
  workday: 'FULL_TIME' | 'PART_TIME' | 'PROJECT_BASED' | 'INTERNSHIP'
  modality: 'ON_SITE' | 'REMOTE' | 'HYBRID'
  salary?: string
  requirements?: string
  benefits?: string
  onApply: (id: string, title: string) => void
}

export default function VacancyCard({ id, title, description, location, workday, modality, salary, requirements, benefits, onApply }: VacancyCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const workdayLabels = {
    'FULL_TIME': 'Jornada Completa',
    'PART_TIME': 'Media Jornada',
    'PROJECT_BASED': 'Por Proyecto',
    'INTERNSHIP': 'Pasantía'
  }

  const modalityLabels = {
    'ON_SITE': 'Presencial',
    'REMOTE': 'Remoto',
    'HYBRID': 'Híbrido'
  }

  const workdayBadgeColors = {
    'FULL_TIME': 'bg-primary-100 text-primary-700',
    'PART_TIME': 'bg-yellow-100 text-yellow-700',
    'PROJECT_BASED': 'bg-purple-100 text-purple-700',
    'INTERNSHIP': 'bg-green-100 text-green-700'
  }

  const modalityBadgeColors = {
    'ON_SITE': 'bg-blue-100 text-blue-700',
    'REMOTE': 'bg-teal-100 text-teal-700',
    'HYBRID': 'bg-indigo-100 text-indigo-700'
  }

  return (
    <div className="group card-lift bg-white rounded-xl shadow-sm p-6 hover:shadow-xl border border-gray-200 hover:border-primary-400 transform-gpu">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Información principal */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            {/* Badge de jornada */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold transition-transform duration-200 group-hover:scale-105 ${workdayBadgeColors[workday]}`}>
              {workdayLabels[workday]}
            </span>
            {/* Badge de modalidad */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold transition-transform duration-200 group-hover:scale-105 ${modalityBadgeColors[modality]}`}>
              {modalityLabels[modality]}
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

          {/* Descripción */}
          <p className="text-gray-600 leading-relaxed whitespace-pre-line">
            {description}
          </p>

          {/* Detalles expandibles */}
          {showDetails && (
            <div className="mt-6 space-y-4 animate-fade-in">
              {/* Requisitos */}
              {requirements && (
                <div className="border-t pt-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Requisitos
                  </h4>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{requirements}</p>
                </div>
              )}

              {/* Beneficios */}
              {benefits && (
                <div className="border-t pt-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    Beneficios
                  </h4>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line">{benefits}</p>
                </div>
              )}
            </div>
          )}

          {/* Botón Ver más detalles / Ver menos */}
          {(requirements || benefits) && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              title={showDetails ? 'Ver menos' : 'Ver más detalles'}
              className="btn-motion mt-4 text-primary-500 hover:text-primary-600 font-bold text-xl flex items-center gap-1"
            >
              <span>{showDetails ? '−' : '+'}</span>
            </button>
          )}
        </div>

        {/* Botón "Postularme" */}
        <div className="md:ml-6 shrink-0">
          <button
            onClick={() => onApply(id, title)}
            className="btn-motion relative w-full md:w-auto px-8 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 hover:shadow-2xl whitespace-nowrap overflow-hidden group-hover:scale-105 shine-effect"
          >
            Postularme
          </button>
        </div>
      </div>
    </div>
  )
}
