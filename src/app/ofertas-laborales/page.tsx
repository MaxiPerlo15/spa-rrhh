import PublicVacanciesClient from './PublicVacanciesClient'
import { logger } from '@/lib/logger'
import { loadPublicVacancies } from '@/lib/server/publicVacancies'

export default async function VacantesPage() {
  const { vacancies, locations, loadError } = await resolvePublicVacancies()

  return (
    <PublicVacanciesClient
      initialVacancies={vacancies}
      initialLocations={locations}
      initialLoadError={loadError}
    />
  )
}

async function resolvePublicVacancies() {
  try {
    const { vacancies, locations } = await loadPublicVacancies()

    return { vacancies, locations, loadError: null }
  } catch (error) {
    logger.error('Failed to load public vacancies', error)

    return {
      vacancies: [],
      locations: [],
      loadError: 'Ocurrió un error al cargar vacantes.'
    }
  }
}
