import { API_CONFIG } from '../config/api'
import { request } from './httpClient'

export interface DownloadHistoryFile {
  url: string
  filename: string
  fileSize?: number
}

export interface DownloadHistoryItem {
  _id: string
  userId: string
  title: string
  type: 'films' | 'series' | 'mangas'
  status: 'downloading' | 'completed' | 'error' | 'cancelled' | 'paused'
  cleared: boolean
  startTime: string
  endTime?: string
  errorMessage?: string
  zipFilename?: string
  fileSize?: number
  language?: string
  quality?: string
  season?: string
  episodes?: string[]
  downloadUrl?: string
  files?: DownloadHistoryFile[]
  createdAt: string
  updatedAt: string
}

export interface DownloadStats {
  total: number
  completed: number
  error: number
  cancelled: number
  cleared: number
  totalSize: number
}

/**
 * Obtenir l'historique des téléchargements de l'utilisateur
 */
const getDownloadHistory = async (options?: {
  limit?: number
  skip?: number
  status?: string
}): Promise<DownloadHistoryItem[]> => {
  const params = new URLSearchParams()
  if (options?.limit) params.append('limit', options.limit.toString())
  if (options?.skip) params.append('skip', options.skip.toString())
  if (options?.status) params.append('status', options.status)
  const res = await request<{ data: DownloadHistoryItem[] }>(`${API_CONFIG.DOWNLOAD_HISTORY_URL}?${params}`)
  return res.data
}

/**
 * Créer un nouvel enregistrement d'historique de téléchargement
 */
const createDownloadHistory = async (data: {
  title: string
  type: 'films' | 'series' | 'mangas'
  language?: string
  quality?: string
  season?: string
  episodes?: string[]
  downloadUrl?: string
  files?: DownloadHistoryFile[]
}): Promise<DownloadHistoryItem> => {
  const res = await request<{ data: DownloadHistoryItem }>(API_CONFIG.DOWNLOAD_HISTORY_URL, {
    method: 'POST',
    body: data
  })
  return res.data
}

/**
 * Mettre à jour un enregistrement d'historique de téléchargement
 */
const updateDownloadHistory = async (
  downloadId: string,
  data: {
    status?: 'downloading' | 'completed' | 'error' | 'cancelled' | 'paused'
    cleared?: boolean
    endTime?: string
    errorMessage?: string
    zipFilename?: string
    fileSize?: number
  }
): Promise<DownloadHistoryItem> => {
  const res = await request<{ data: DownloadHistoryItem }>(`${API_CONFIG.DOWNLOAD_HISTORY_URL}/${downloadId}`, {
    method: 'PUT',
    body: data
  })
  return res.data
}

/**
 * Effacer l'historique des téléchargements (marquer comme "cleared")
 */
const clearDownloadHistory = async (): Promise<{ clearedCount: number }> => {
  const res = await request<{ data: { clearedCount: number } }>(`${API_CONFIG.DOWNLOAD_HISTORY_URL}/clear`, {
    method: 'DELETE'
  })
  return res.data
}

/**
 * Marquer tous les téléchargements comme "cleared" (même comportement que clearDownloadHistory)
 */
const deleteDownloadHistory = async (): Promise<{ clearedCount: number }> => {
  const res = await request<{ data: { clearedCount: number } }>(API_CONFIG.DOWNLOAD_HISTORY_URL, {
    method: 'DELETE'
  })
  return res.data
}

/**
 * Obtenir les statistiques des téléchargements
 */
const getDownloadStats = async (): Promise<DownloadStats> => {
  const res = await request<{ data: DownloadStats }>(`${API_CONFIG.DOWNLOAD_HISTORY_URL}/stats`)
  return res.data
}

const DownloadHistoryService = {
  getDownloadHistory,
  createDownloadHistory,
  updateDownloadHistory,
  clearDownloadHistory,
  deleteDownloadHistory,
  getDownloadStats
};

export default DownloadHistoryService
