import { API_CONFIG } from '../config/api'
import { reportClientError } from './errorReportingService'

function getAuthHeaders (): HeadersInit {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  skipReport?: boolean
}

/**
 * Wrapper HTTP centralisé : en-têtes d'auth, parsing JSON, rapport des 5xx au backend (Discord).
 * Ne bloque jamais l'UI ; le reporting est fire-and-forget.
 */
export async function request<T = unknown> (
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, skipReport = false, ...init } = options
  const headers = { ...getAuthHeaders(), ...init.headers }
  const res = await fetch(url, {
    ...init,
    headers,
    body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body)
  })

  const text = await res.text()
  let data: { message?: string } = {}
  try {
    if (text) data = JSON.parse(text)
  } catch {
    // ignore
  }

  if (!res.ok) {
    const message = data.message ?? res.statusText ?? 'Erreur réseau'
    if (res.status >= 500 && !skipReport) {
      reportClientError({
        message: `API ${res.status}: ${message}`,
        route: url.replace(API_CONFIG.API_URL, ''),
        stack: undefined
      })
    }
    const err = new Error(message) as Error & { code?: string }
    const d = data as { code?: string; errorCode?: string }
    if (typeof d.code === 'string') err.code = d.code
    else if (typeof d.errorCode === 'string') err.code = d.errorCode
    throw err
  }

  return (text ? JSON.parse(text) : {}) as T
}

/**
 * Récupère les en-têtes d'auth (pour usages qui font leur propre fetch).
 */
export { getAuthHeaders }
