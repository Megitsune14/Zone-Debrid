import type { SearchResponse } from '../types'
import { API_CONFIG } from '../config/api'
import { request } from './httpClient'

/**
 * Check API health status
 * @returns {Promise<{status: string; message: string}>} API health information
 * @throws {Error} When health check fails
 */
const healthCheck = async (): Promise<{ status: string; message: string }> => {
  return request<{ status: string; message: string }>(`${API_CONFIG.API_URL}/health`)
}

/**
 * Search for content on Zone Téléchargement
 * @param {string} query - Search query string
 * @param {string} [contentType] - Optional content type filter (films, series, mangas)
 * @param {number} [year] - Optional year filter
 * @returns {Promise<SearchResponse>} Search results
 * @throws {Error} When search fails or API key is invalid
 */
const searchContent = async (
  query: string,
  contentType?: string,
  year?: number,
  signal?: AbortSignal
): Promise<SearchResponse> => {
  let url = `${API_CONFIG.API_URL}/search?query=${encodeURIComponent(query)}`
  if (contentType && contentType !== 'all') {
    url += `&type=${encodeURIComponent(contentType)}`
  }
  if (year) {
    url += `&year=${year}`
  }
  try {
    return await request<SearchResponse>(url, { signal })
  } catch (e) {
    const err = e as Error & { code?: string }
    if (err.code === 'INVALID_API_KEY' || err.code === 'MISSING_API_KEY') {
      const customError = new Error(err.message || 'Clé API AllDebrid invalide')
      customError.name = 'InvalidApiKeyError'
      ;(customError as unknown as { code?: string }).code = err.code
      throw customError
    }
    throw e
  }
}

/**
 * Check download availability for links using AllDebrid
 * @param {Object} options - Download check options
 * @param {string} options.downloadLink - URL of the download page
 * @param {'films' | 'series' | 'mangas'} options.type - Content type
 * @param {string[]} [options.episodes] - Optional specific episodes to check
 * @param {string} [options.sessionId] - Optional session ID for progress tracking
 * @returns {Promise<any>} Download availability result
 * @throws {Error} When download check fails
 */
const checkDownloadAvailability = async (options: {
  downloadLink: string
  type: 'films' | 'series' | 'mangas'
  episodes?: string[]
  sessionId?: string
}): Promise<any> => {
  return request(`${API_CONFIG.API_URL}/downloads/check`, {
    method: 'POST',
    body: options
  })
}

/**
 * Cancel an ongoing download availability check
 * @param {string} sessionId - Session ID to cancel
 * @returns {Promise<any>} Cancellation result
 * @throws {Error} When cancellation fails
 */
const cancelDownloadCheck = async (sessionId: string): Promise<any> => {
  return request(`${API_CONFIG.API_URL}/downloads/cancel`, {
    method: 'POST',
    body: { sessionId }
  })
}

/**
 * Get a signed URL for native browser download (single file). No fetch/stream on client.
 */
const getSignedProxyUrl = async (
  url: string,
  filename: string,
  totalBytes?: number | null,
  historyId?: string
): Promise<{ downloadUrl: string; downloadSessionId: string }> => {
  const params = new URLSearchParams({ url, filename })
  if (totalBytes != null && totalBytes > 0) params.set('totalBytes', String(totalBytes))
  if (historyId) params.set('historyId', historyId)
  return request<{ downloadUrl: string; downloadSessionId: string }>(
    `${API_CONFIG.DOWNLOADS_URL}/signed-proxy?${params}`
  )
}

/**
 * Get a signed URL for native browser download (ZIP). No fetch/stream on client.
 */
const getSignedProxyZipUrl = async (
  files: { url: string; filename: string; fileSize?: number }[],
  zipFilename: string,
  historyId?: string
): Promise<{ downloadUrl: string; downloadSessionId: string }> => {
  return request<{ downloadUrl: string; downloadSessionId: string }>(
    `${API_CONFIG.DOWNLOADS_URL}/signed-proxy/zip`,
    { method: 'POST', body: { files, zipFilename, ...(historyId && { historyId }) } }
  )
}

/**
 * Get active download sessions (for panel). Server-driven state.
 */
type SessionItem = {
  id: string
  filename: string
  totalBytes: number | null
  bytesSent: number
  status: string
  startedAt: string
  type: string
}

const getActiveDownloadSessions = async (): Promise<SessionItem[]> => {
  try {
    const data = await request<{ data?: SessionItem[] }>(`${API_CONFIG.DOWNLOADS_URL}/sessions?status=active`)
    return data.data ?? []
  } catch {
    return []
  }
}

/**
 * Cancel an active download session (mark as cancelled on server).
 */
const cancelDownloadSession = async (sessionId: string): Promise<void> => {
  await request(`${API_CONFIG.DOWNLOADS_URL}/sessions/${sessionId}/cancel`, {
    method: 'POST'
  })
}

/**
 * Get Zone Téléchargement site status and URL information
 * @returns {Promise<Object>} Site status information including current URL, history, and health
 * @throws {Error} When site status retrieval fails
 */
const getSiteStatus = async (): Promise<{
  success: boolean
  data: {
    currentUrl: string
    urlHistory: string[]
    lastChecked: string
    responseTime: number
    isHealthy: boolean
  }
  timestamp: string
}> => {
  return request(`${API_CONFIG.API_URL}/site-status`)
}

const ApiService = {
  healthCheck,
  searchContent,
  checkDownloadAvailability,
  cancelDownloadCheck,
  getSiteStatus,
  getSignedProxyUrl,
  getSignedProxyZipUrl,
  getActiveDownloadSessions,
  cancelDownloadSession
};

export default ApiService
