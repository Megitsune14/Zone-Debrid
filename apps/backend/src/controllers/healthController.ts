import { Request, Response } from 'express'
import ZTUrl from '@/models/ZTUrl'
import Logger from '@/base/Logger'
import { sendServiceDownAlert, clearServiceDownCooldown } from '@/services/discordWebhookService'

const CHECK_TIMEOUT_MS = 4500

async function checkZoneTelechargement (): Promise<'up' | 'down'> {
  try {
    const zt = await ZTUrl.findOne().lean()
    const url = zt?.currentUrl ?? 'https://zone-telechargement.diy/'
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
    const res = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Zone-Debrid-HealthCheck/1.0' }
    })
    clearTimeout(timeout)
    return res.ok || res.status < 500 ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

async function checkAllDebrid (): Promise<'up' | 'down'> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)
    const res = await fetch('https://api.alldebrid.com/v4/', {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'Zone-Debrid-HealthCheck/1.0' }
    })
    clearTimeout(timeout)
    return res.status < 500 ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

/**
 * GET / — Healthcheck global (serveur alive)
 */
export function healthRoot (_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    environment: process.env.NODE_ENV ?? 'development',
    timestamp: Date.now()
  })
}

/**
 * GET /api/health/services — Vérification Zone-Téléchargement + AllDebrid
 */
export async function healthServices (_req: Request, res: Response): Promise<void> {
  const [zoneTelechargement, allDebrid] = await Promise.all([
    checkZoneTelechargement(),
    checkAllDebrid()
  ])

  if (zoneTelechargement === 'down') {
    Logger.error('Healthcheck: Zone-Téléchargement est down')
    sendServiceDownAlert('Zone-Téléchargement').catch(() => {})
  } else {
    clearServiceDownCooldown('Zone-Téléchargement')
  }
  if (allDebrid === 'down') {
    Logger.error('Healthcheck: AllDebrid est down')
    sendServiceDownAlert('AllDebrid').catch(() => {})
  } else {
    clearServiceDownCooldown('AllDebrid')
  }

  res.status(200).json({
    server: 'up',
    zoneTelechargement,
    allDebrid
  })
}
