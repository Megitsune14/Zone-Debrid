import { Request, Response, NextFunction } from 'express'
import Logger from '@/base/Logger'
import { sendErrorToDiscord } from '@/services/discordWebhookService'

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

/**
 * Wrapper pour les handlers async : toute exception ou rejet est passé à next(err).
 */
export function asyncHandler (fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export type ErrorLevel = 'info' | 'warning' | 'critical'

/**
 * Erreur applicative avec code HTTP et optionnellement code métier.
 * Utiliser dans les controllers: next(new AppError('Message', 500, 'PROXY_ERROR'))
 */
export class AppError extends Error {
  statusCode: number
  errorCode?: string
  level: ErrorLevel

  constructor (
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    level?: ErrorLevel
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.level = level ?? (statusCode >= 500 ? 'critical' : statusCode >= 400 ? 'warning' : 'info')
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * Messages génériques pour ne pas exposer de détails en production
 */
const SAFE_MESSAGES: Record<number, string> = {
  400: 'Requête invalide',
  401: 'Non autorisé',
  403: 'Accès refusé',
  404: 'Ressource non trouvée',
  502: 'Erreur réseau. Réessayez plus tard.',
  500: 'Une erreur interne est survenue.'
}

function getMessage (err: Error | AppError, statusCode: number): string {
  const isProd = process.env.NODE_ENV === 'production'
  if (err instanceof AppError && err.statusCode === statusCode) {
    return err.message
  }
  if (err && typeof err === 'object' && 'name' in err) {
    const e = err as Error
    if (e.name === 'JsonWebTokenError') return 'Token invalide'
    if (e.name === 'TokenExpiredError') return 'Token expiré'
  }
  if (statusCode >= 500 && isProd) {
    return SAFE_MESSAGES[500]
  }
  if (statusCode === 502 && isProd) {
    return SAFE_MESSAGES[502]
  }
  return err instanceof Error ? err.message : String(err)
}

function getLevel (statusCode: number): ErrorLevel {
  if (statusCode >= 500) return 'critical'
  if (statusCode >= 400) return 'warning'
  return 'info'
}

function resolveStatus (err: unknown): number {
  if (err instanceof AppError) return err.statusCode
  if (err && typeof err === 'object' && 'statusCode' in err && typeof (err as any).statusCode === 'number') {
    return (err as any).statusCode
  }
  if (err && typeof err === 'object' && 'name' in err) {
    const e = err as Error
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') return 401
    if (e.name === 'ValidationError') return 400
    if (e.name === 'AbortError') return 499
  }
  return 500
}

/**
 * Middleware global de gestion des erreurs.
 * À placer en dernier (après toutes les routes).
 * Ne jamais exposer la stack en production.
 */
export function errorHandler (err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const statusCode = resolveStatus(err)
  const message = getMessage(err instanceof Error ? err : new Error(String(err)), statusCode)
  const level = err instanceof AppError ? err.level : getLevel(statusCode)
  const errorCode = err instanceof AppError ? err.errorCode : undefined

  const isProd = process.env.NODE_ENV === 'production'
  const stack = err instanceof Error ? err.stack : undefined

  if (level === 'critical') {
    Logger.error(`[${statusCode}] ${message}${stack && !isProd ? `\n${stack}` : ''}`)
  } else if (level === 'warning') {
    Logger.debug(`[${statusCode}] ${message}`)
  } else {
    Logger.info(`[${statusCode}] ${message}`)
  }

  // Ne pas notifier Discord pour les annulations client (499 / ABORTED)
  const isAborted = statusCode === 499 || errorCode === 'ABORTED'
  if (statusCode >= 500 && !isAborted) {
    sendErrorToDiscord({
      statusCode,
      message,
      stack: isProd ? undefined : stack,
      route: _req.path,
      method: _req.method,
      userId: _req.user != null ? String(_req.user._id ?? _req.user.id ?? '') : undefined
    }).catch(() => {})
  }

  if (res.headersSent) {
    return
  }

  const payload: { success: false; message: string; errorCode?: string } = {
    success: false,
    message
  }
  if (errorCode) payload.errorCode = errorCode

  res.status(statusCode).json(payload)
}

/**
 * Gestionnaire 404 — à enregistrer après les routes, avant errorHandler
 */
export function notFoundHandler (_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Ressource non trouvée', 404))
}
