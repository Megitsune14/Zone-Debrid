import { Request, Response } from 'express'
import { sendErrorToDiscord } from '@/services/discordWebhookService'
import Logger from '@/base/Logger'

/** Cooldown en ms : pas deux rapports identiques avant ce délai */
const REPORT_COOLDOWN_MS = 60_000
const MAX_MESSAGE_LENGTH = 2000
const MAX_STACK_LENGTH = 3000

const lastSentByKey = new Map<string, number>()

function simpleHash (str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i) | 0
  }
  return String(h)
}

function sanitize (s: string | undefined, maxLen: number): string {
  if (s == null || typeof s !== 'string') return ''
  return s.slice(0, maxLen).replace(/\b(token|password|secret|apiKey|key)\s*[:=]\s*[\w-]+/gi, '$1=***')
}

/**
 * POST /api/client-errors
 * Body: { message: string, stack?: string, route?: string, componentStack?: string, url?: string }
 * Reçoit les erreurs critiques frontend et les relaie vers Discord (non bloquant).
 * Pas d'auth requise. Rate limit léger pour éviter le spam.
 */
export async function reportClientError (req: Request, res: Response): Promise<void> {
  try {
    const body = req.body
    const message = sanitize(body?.message, MAX_MESSAGE_LENGTH)
    if (!message || message.length < 2) {
      res.status(400).json({ success: false, message: 'message requis' })
      return
    }

    const route = sanitize(body?.route, 500)
    const stack = sanitize(body?.stack, MAX_STACK_LENGTH)
    const componentStack = sanitize(body?.componentStack, 2000)
    const key = simpleHash(message + route)
    const now = Date.now()
    if (lastSentByKey.get(key) != null && now - lastSentByKey.get(key)! < REPORT_COOLDOWN_MS) {
      res.status(204).end()
      return
    }
    lastSentByKey.set(key, now)

    res.status(204).end()

    sendErrorToDiscord({
      statusCode: 500,
      message: `[Frontend] ${message}`,
      route: route || req.path,
      method: req.method,
      source: 'frontend',
      stack: stack || undefined,
      componentStack: componentStack || undefined,
    }).catch(() => {})
  } catch (err) {
    Logger.error(`client-errors report failed: ${err instanceof Error ? err.message : err}`)
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Erreur serveur' })
    }
  }
}
