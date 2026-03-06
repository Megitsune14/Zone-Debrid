import User from '@/models/User'
import Logger from '@/base/Logger'
import aria2Service from '@/services/aria2Service'
import downloadSessionService from '@/services/downloadSessionService'
import downloadHistoryService from '@/services/downloadHistoryService'
import DownloadSession from '@/models/DownloadSession'

const POLL_INTERVAL_MS = 2500
const ARIA2_MAX_RETRIES = 5
const ARIA2_RETRY_INTERVAL_MS = 10_000

/** Suivi des échecs tellStatus par session pour retry puis clôture */
const sessionFailureMap = new Map<string, { failureCount: number; lastFailureAt: number }>()

/** Sessions pour lesquelles forceRemove a échoué (ex. NAS down) ; on réessaie à chaque cycle jusqu'à succès */
const pendingForceRemoveSessionIds = new Set<string>()

/** Mapper statut Aria2 -> statut session app (active→started, waiting→queued, complete→completed, error→error) */
function mapAria2StatusToSession(aria2Status: string): 'started' | 'queued' | 'completed' | 'error' | 'cancelled' {
  switch (aria2Status) {
    case 'active':
      return 'started'
    case 'waiting':
    case 'paused':
      return 'queued'
    case 'complete':
      return 'completed'
    case 'error':
      return 'error'
    case 'removed':
      return 'cancelled'
    default:
      return 'queued'
  }
}

async function pollAria2Sessions(): Promise<void> {
  try {
    for (const sessionId of [...pendingForceRemoveSessionIds]) {
      try {
        const session = await downloadSessionService.getSessionById(sessionId)
        if (!session?.aria2Gid || session.type !== 'aria2') {
          pendingForceRemoveSessionIds.delete(sessionId)
          continue
        }
        const user = await User.findById(session.userId).select('+aria2RpcSecret').exec()
        const rpcUrl = user?.getDecryptedAria2RpcUrl?.()
        if (!rpcUrl) {
          pendingForceRemoveSessionIds.delete(sessionId)
          continue
        }
        await aria2Service.forceRemove(rpcUrl, user!.getDecryptedAria2RpcSecret?.(), session.aria2Gid)
        pendingForceRemoveSessionIds.delete(sessionId)
        Logger.info(`forceRemove différé réussi pour session ${sessionId} (NAS de nouveau joignable)`)
      } catch (e) {
        Logger.debug(`forceRemove différé encore en échec pour ${sessionId}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    const sessions = await downloadSessionService.getActiveAria2Sessions()
    if (sessions.length === 0) return

    const byUser = new Map<string, typeof sessions>()
    for (const s of sessions) {
      const uid = String(s.userId)
      if (!byUser.has(uid)) byUser.set(uid, [])
      byUser.get(uid)!.push(s)
    }

    for (const [userId, userSessions] of byUser) {
      const user = await User.findById(userId).select('+aria2RpcSecret').exec()
      const rpcUrl = user?.getDecryptedAria2RpcUrl?.()
      if (!rpcUrl) continue

      const rpcSecret = user!.getDecryptedAria2RpcSecret?.()

      for (const session of userSessions) {
        if (!session.aria2Gid) continue
        const sessionId = session._id.toString()
        const now = Date.now()
        const failure = sessionFailureMap.get(sessionId)

        if (failure) {
          if (failure.failureCount >= ARIA2_MAX_RETRIES) {
            sessionFailureMap.delete(sessionId)
            continue
          }
          if (now - failure.lastFailureAt < ARIA2_RETRY_INTERVAL_MS) {
            continue
          }
        }

        try {
          const status = await aria2Service.getStatus(
            rpcUrl,
            rpcSecret,
            session.aria2Gid
          )
          sessionFailureMap.delete(sessionId)

          const newStatus = mapAria2StatusToSession(status.status)
          const isTerminal = ['completed', 'error', 'cancelled'].includes(newStatus)

          if (newStatus === 'error' && session.aria2Gid) {
            await aria2Service.forceRemove(
              rpcUrl,
              rpcSecret,
              session.aria2Gid
            ).catch((err) => Logger.debug(`forceRemove après error pour ${sessionId}: ${err instanceof Error ? err.message : String(err)}`))
          }

          await downloadSessionService.updateAria2SessionProgress(sessionId, {
            bytesSent: status.completedLength,
            totalBytes: status.totalLength > 0 ? status.totalLength : undefined,
            status: newStatus,
            downloadSpeed: status.downloadSpeed,
            errorMessage: status.errorMessage
          })

          if (isTerminal && session.historyId) {
            const siblings = await DownloadSession.find({
              historyId: session.historyId,
              userId: session.userId
            }).lean()
            const allTerminal = siblings.every(
              (s) => ['completed', 'error', 'cancelled', 'aborted'].includes(s.status)
            )
            if (allTerminal) {
              const history = await downloadHistoryService.getDownloadHistoryById(session.historyId, userId)
              if (history?.status === 'downloading') {
                const hasError = siblings.some((s) => s.status === 'error')
                await downloadHistoryService.updateDownloadHistory(
                  session.historyId,
                  userId,
                  {
                    status: hasError ? 'error' : 'completed',
                    endTime: new Date(),
                    ...(hasError && siblings.find((s) => s.status === 'error')?.errorMessage && {
                      errorMessage: siblings.find((s) => s.status === 'error')?.errorMessage
                    })
                  }
                )
              }
            }
          }
        } catch (err) {
          const prev = sessionFailureMap.get(sessionId) ?? { failureCount: 0, lastFailureAt: 0 }
          const failureCount = prev.failureCount + 1
          const lastFailureAt = now
          sessionFailureMap.set(sessionId, { failureCount, lastFailureAt })

          if (failureCount >= ARIA2_MAX_RETRIES) {
            if (session.aria2Gid) {
              try {
                await aria2Service.forceRemove(
                  rpcUrl,
                  rpcSecret,
                  session.aria2Gid
                )
              } catch (e) {
                pendingForceRemoveSessionIds.add(sessionId)
                Logger.debug(`forceRemove immédiat en échec pour ${sessionId}, sera réessayé à chaque cycle: ${e instanceof Error ? e.message : String(e)}`)
              }
            }
            const errorMessage = 'Connexion Aria2 perdue après 5 tentatives (NAS ou réseau indisponible)'
            await downloadSessionService.updateAria2SessionProgress(sessionId, {
              bytesSent: session.bytesSent ?? 0,
              status: 'error',
              errorMessage
            }).catch(() => {})
            if (session.historyId) {
              await downloadHistoryService.updateDownloadHistory(
                session.historyId,
                userId,
                { status: 'error', endTime: new Date(), errorMessage }
              ).catch(() => {})
            }
            sessionFailureMap.delete(sessionId)
            Logger.info(`Session Aria2 ${sessionId} marquée en erreur après ${ARIA2_MAX_RETRIES} échecs`)
          } else {
            Logger.debug(`Aria2 tellStatus failed for session ${sessionId} (${failureCount}/${ARIA2_MAX_RETRIES}): ${err instanceof Error ? err.message : String(err)}`)
          }
        }
      }
    }
  } catch (err) {
    Logger.error(`Aria2 polling error: ${err instanceof Error ? err.message : String(err)}`)
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startAria2Polling(): void {
  if (intervalId != null) return
  intervalId = setInterval(pollAria2Sessions, POLL_INTERVAL_MS)
  Logger.info('Aria2 polling started')
}

export function stopAria2Polling(): void {
  if (intervalId != null) {
    clearInterval(intervalId)
    intervalId = null
    Logger.info('Aria2 polling stopped')
  }
}
