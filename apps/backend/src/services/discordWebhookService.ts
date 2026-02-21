/**
 * Envoi des erreurs critiques vers un webhook Discord.
 * Non bloquant : timeout court, jamais d'exception propagée vers la requête.
 */

const WEBHOOK_TIMEOUT_MS = 5000
const ENV = process.env.NODE_ENV ?? 'development'

export interface DiscordErrorPayload {
  statusCode: number
  message: string
  stack?: string
  route?: string
  method?: string
  userId?: string
  /** 'frontend' pour erreurs client (React, API 5xx côté client) */
  source?: 'backend' | 'frontend'
  componentStack?: string
}

function buildEmbed (payload: DiscordErrorPayload): object {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [
    { name: 'Source', value: payload.source === 'frontend' ? 'Frontend' : 'Backend', inline: true },
    { name: 'Environnement', value: ENV, inline: true },
    { name: 'Statut HTTP', value: String(payload.statusCode), inline: true },
    { name: 'Route', value: payload.route ?? '—', inline: true },
    { name: 'Méthode', value: payload.method ?? '—', inline: true },
    { name: 'User ID', value: payload.userId ?? '—', inline: true },
    { name: 'Message', value: payload.message?.slice(0, 1000) ?? '—', inline: false }
  ]
  if (payload.stack && ENV !== 'production') {
    fields.push({ name: 'Stack', value: `\`\`\`\n${payload.stack.slice(0, 1000)}\n\`\`\``, inline: false })
  }
  if (payload.componentStack && ENV !== 'production') {
    fields.push({ name: 'Component Stack', value: `\`\`\`\n${payload.componentStack.slice(0, 800)}\n\`\`\``, inline: false })
  }
  return {
    title: 'Zone-Debrid Error',
    color: 0xED4245,
    fields,
    timestamp: new Date().toISOString()
  }
}

/**
 * Envoie une notification d'erreur au webhook Discord.
 * Ne lance jamais d'exception : les erreurs sont absorbées.
 * À appeler uniquement pour status >= 500, proxy, zip, DB, crash.
 */
export async function sendErrorToDiscord (payload: DiscordErrorPayload): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url || typeof url !== 'string' || !url.startsWith('https://discord.com/api/webhooks/')) {
    return
  }

  const body = JSON.stringify({
    embeds: [buildEmbed(payload)]
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal
    })
    if (!res.ok) {
      // Log but do not throw
      const text = await res.text().catch(() => '')
      console.error(`[DiscordWebhook] HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
  } catch (e) {
    // Ne jamais faire échouer la requête à cause de Discord
    console.error('[DiscordWebhook] Request failed:', e instanceof Error ? e.message : e)
  } finally {
    clearTimeout(timeout)
  }
}

const SERVICE_DOWN_COOLDOWN_MS = 10 * 60 * 1000
const lastServiceDownAlert = new Map<string, number>()

export function clearServiceDownCooldown (serviceName: string): void {
  lastServiceDownAlert.delete(serviceName)
}

/**
 * Alerte Discord "Service Down" avec @everyone.
 * Anti-spam : pas de nouvel envoi pour le même service dans les 10 min.
 * Appeler clearServiceDownCooldown(serviceName) quand le service est de nouveau up.
 */
export async function sendServiceDownAlert (serviceName: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL
  if (!url || typeof url !== 'string' || !url.startsWith('https://discord.com/api/webhooks/')) {
    return
  }

  const now = Date.now()
  const last = lastServiceDownAlert.get(serviceName)
  if (last != null && now - last < SERVICE_DOWN_COOLDOWN_MS) {
    return
  }
  lastServiceDownAlert.set(serviceName, now)

  const body = JSON.stringify({
    content: '@everyone',
    embeds: [{
      title: 'Service Down Alert',
      color: 0xED4245,
      fields: [
        { name: 'Service', value: serviceName, inline: true },
        { name: 'Environnement', value: ENV, inline: true },
        { name: 'Timestamp', value: new Date().toISOString(), inline: false }
      ],
      timestamp: new Date().toISOString()
    }]
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[DiscordWebhook] Service down alert HTTP ${res.status}: ${text.slice(0, 200)}`)
    }
  } catch (e) {
    console.error('[DiscordWebhook] Service down alert failed:', e instanceof Error ? e.message : e)
  } finally {
    clearTimeout(timeout)
  }
}
