import { revalidateTag, unstable_cache } from 'next/cache'
import { buildJobBoardLocations, mapApiVacanciesToJobBoardVacancies } from '@/application/public/jobBoardCollections'
import {
  getBackendUrl,
  getSpringBackendHeaders
} from '@/lib/server/springBackend'
import {
  type SpringVacancyResponse,
  mapSpringToDto
} from '@/lib/server/springVacancyGateway'

export const PUBLIC_VACANCIES_CACHE_TAG = 'public-vacancies'
const PUBLIC_VACANCIES_CACHE_KEY = ['public-vacancies']
const PUBLIC_VACANCIES_REVALIDATE_SECONDS = 300

async function listPublicVacanciesInSpring() {
  const backendUrl = getBackendUrl()
  if (!backendUrl) {
    throw new Error('BACKEND_URL is required for public vacancies')
  }

  const response = await fetch(`${backendUrl}/api/v1/vacancies?all=false`, {
    method: 'GET',
    headers: getSpringBackendHeaders(),
    cache: 'no-store'
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Spring backend rejected public vacancy list (${response.status}): ${errorBody}`)
  }

  const vacancies = await response.json() as SpringVacancyResponse[]
  return vacancies.map(mapSpringToDto)
}

async function listPublicVacancyDtos() {
  return listPublicVacanciesInSpring()
}

export const loadPublicVacancies = unstable_cache(
  async () => {
    const vacancies = mapApiVacanciesToJobBoardVacancies(await listPublicVacancyDtos())
    return {
      vacancies,
      locations: buildJobBoardLocations(vacancies)
    }
  },
  PUBLIC_VACANCIES_CACHE_KEY,
  {
    revalidate: PUBLIC_VACANCIES_REVALIDATE_SECONDS,
    tags: [PUBLIC_VACANCIES_CACHE_TAG]
  }
)

export function revalidatePublicVacanciesCache() {
  revalidateTag(PUBLIC_VACANCIES_CACHE_TAG, 'max')
}
