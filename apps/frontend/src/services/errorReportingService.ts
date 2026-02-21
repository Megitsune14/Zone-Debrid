import { API_CONFIG } from '../config/api'
import { log } from '../config/api'

const REPORT_URL = `${API_CONFIG.API_URL}/client-errors`
const TIMEOUT_MS = 4000
const MAX_MESSAGE_LENGTH = 2000
const MAX_STACK_LENGTH = 3000

function truncate (s: string | undefined, max: number): string {
  if (s == null || typeof s !== 'string') return ''
  return s.slice(0, max)
}

/**
 * Envoie une erreur critique frontend au backend (relay Discord).
 * Non bloquant : ne jamais bloquer l'UI, pas d'await côté appelant.
 * À utiliser pour : ErrorBoundary (crash React), erreurs API 5xx.
 */
export function reportClientError (payload: {
  message: string
  stack?: string
  route?: string
  componentStack?: string
}): void {
  const body = {
    message: truncate(payload.message, MAX_MESSAGE_LENGTH),
    stack: truncate(payload.stack, MAX_STACK_LENGTH) || undefined,
    route: truncate(payload.route, 500) || undefined,
    componentStack: truncate(payload.componentStack, 2000) || undefined
  }
  if (!body.message) return

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  fetch(REPORT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: controller.signal
  }).then(() => {
    clearTimeout(timeout)
  }).catch((e) => {
    clearTimeout(timeout)
    log.warn('Error report failed (non-blocking):', e instanceof Error ? e.message : e)
  })
}
