import { API_CONFIG } from '../config/api'

const TIMEOUT_MS = 5000

export interface RootHealthResponse {
  status: string
  environment: string
  timestamp: number
}

export interface ServicesHealthResponse {
  server: 'up' | 'down'
  zoneTelechargement: 'up' | 'down'
  allDebrid: 'up' | 'down'
}

/**
 * GET / — Vérifie que le serveur répond (page Auth).
 */
export async function checkServerHealth (): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(API_CONFIG.BASE_URL, {
      method: 'GET',
      signal: controller.signal
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    clearTimeout(timeout)
    return false
  }
}

/**
 * GET /api/health/services — Vérifie Zone-Téléchargement + AllDebrid (page Recherche).
 */
export async function checkServicesHealth (): Promise<ServicesHealthResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${API_CONFIG.API_URL}/health/services`, {
      method: 'GET',
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (!res.ok) {
      return {
        server: 'down',
        zoneTelechargement: 'down',
        allDebrid: 'down'
      }
    }
    const data = await res.json() as ServicesHealthResponse
    return data
  } catch {
    clearTimeout(timeout)
    return {
      server: 'down',
      zoneTelechargement: 'down',
      allDebrid: 'down'
    }
  }
}

export function allServicesUp (data: ServicesHealthResponse): boolean {
  return data.server === 'up' && data.zoneTelechargement === 'up' && data.allDebrid === 'up'
}
