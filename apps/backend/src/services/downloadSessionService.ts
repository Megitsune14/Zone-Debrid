import crypto from 'crypto'
import DownloadSession, { IDownloadSession, IZipFileEntry } from '@/models/DownloadSession'
import Logger from '@/base/Logger'

/** Durée de validité des liens signés de téléchargement (2 heures). */
const SIGNATURE_TTL_SEC = 7200
const SIGNATURE_ALGO = 'sha256'

function getSignatureSecret(): string {
  const secret = process.env.DOWNLOAD_SIGNATURE_SECRET || process.env.JWT_SECRET
  if (!secret) {
    throw new Error('DOWNLOAD_SIGNATURE_SECRET or JWT_SECRET must be set for signed download URLs')
  }
  return secret
}

export function createSignature(sessionId: string, expiresAt: number): string {
  const secret = getSignatureSecret()
  const payload = `${sessionId}:${expiresAt}`
  return crypto.createHmac(SIGNATURE_ALGO, secret).update(payload).digest('hex')
}

export function verifySignature(sessionId: string, expiresAt: number, signature: string): boolean {
  if (Date.now() > expiresAt * 1000) return false
  const expected = createSignature(sessionId, expiresAt)
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}

export async function createFileSession(
  userId: string,
  sourceUrl: string,
  filename: string,
  totalBytes?: number | null,
  historyId?: string
): Promise<IDownloadSession> {
  const session = new DownloadSession({
    userId,
    filename,
    totalBytes: totalBytes ?? null,
    bytesSent: 0,
    status: 'started',
    startedAt: new Date(),
    type: 'file',
    sourceUrl,
    ...(historyId && { historyId }),
    updatedAt: new Date()
  })
  await session.save()
  Logger.info(`Download session created (file): ${session._id} for user ${userId}`)
  return session
}

export async function createZipSession(
  userId: string,
  zipFilename: string,
  zipFiles: IZipFileEntry[],
  totalBytes?: number | null,
  historyId?: string
): Promise<IDownloadSession> {
  const session = new DownloadSession({
    userId,
    filename: zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`,
    totalBytes: totalBytes ?? null,
    bytesSent: 0,
    status: 'started',
    startedAt: new Date(),
    type: 'zip',
    zipFilename: zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`,
    zipFiles,
    ...(historyId && { historyId }),
    updatedAt: new Date()
  })
  await session.save()
  Logger.info(`Download session created (zip): ${session._id} for user ${userId}`)
  return session
}

export async function getSessionById(sessionId: string): Promise<IDownloadSession | null> {
  return DownloadSession.findById(sessionId).exec()
}

export async function getSessionByIdAndUser(
  sessionId: string,
  userId: string
): Promise<IDownloadSession | null> {
  return DownloadSession.findOne({ _id: sessionId, userId }).exec()
}

export async function updateBytesSent(
  sessionId: string,
  bytesSent: number
): Promise<IDownloadSession | null> {
  return DownloadSession.findOneAndUpdate(
    { _id: sessionId },
    { bytesSent, updatedAt: new Date() },
    { returnDocument: 'after' }
  ).exec()
}

export async function setSessionStatus(
  sessionId: string,
  status: IDownloadSession['status'],
  errorMessage?: string
): Promise<IDownloadSession | null> {
  const update: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
    ...(status !== 'started' && { finishedAt: new Date() }),
    ...(errorMessage && { errorMessage })
  }
  return DownloadSession.findOneAndUpdate(
    { _id: sessionId },
    update,
    { returnDocument: 'after' }
  ).exec()
}

export async function getActiveSessionsByUserId(userId: string): Promise<IDownloadSession[]> {
  return DownloadSession.find({ userId, status: 'started' })
    .sort({ startedAt: -1 })
    .lean()
    .exec() as Promise<IDownloadSession[]>
}

export async function cancelSession(sessionId: string, userId: string): Promise<boolean> {
  const session = await getSessionByIdAndUser(sessionId, userId)
  if (!session || session.status !== 'started') return false
  await setSessionStatus(sessionId, 'cancelled')
  Logger.info(`Download session cancelled: ${sessionId}`)
  return true
}

export function getSignedDownloadUrl(baseUrl: string, sessionId: string): { url: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SEC
  const signature = createSignature(sessionId, expiresAt)
  const url = `${baseUrl}/api/downloads/stream/${sessionId}?expires=${expiresAt}&signature=${signature}`
  return { url, expiresAt }
}

export function getSignedZipDownloadUrl(baseUrl: string, sessionId: string): { url: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + SIGNATURE_TTL_SEC
  const signature = createSignature(sessionId, expiresAt)
  const url = `${baseUrl}/api/downloads/stream/zip/${sessionId}?expires=${expiresAt}&signature=${signature}`
  return { url, expiresAt }
}

export default {
  createSignature,
  verifySignature,
  createFileSession,
  createZipSession,
  getSessionById,
  getSessionByIdAndUser,
  updateBytesSent,
  setSessionStatus,
  getActiveSessionsByUserId,
  cancelSession,
  getSignedDownloadUrl,
  getSignedZipDownloadUrl
}
