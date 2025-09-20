import { API_CONFIG } from '../config/api'

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

  const response = await fetch(`${API_CONFIG.DOWNLOAD_HISTORY_URL}?${params}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to get download history')
  }

  const data = await response.json()
  return data.data
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
}): Promise<DownloadHistoryItem> => {
  const response = await fetch(API_CONFIG.DOWNLOAD_HISTORY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to create download history')
  }

  const result = await response.json()
  return result.data
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
  const response = await fetch(`${API_CONFIG.DOWNLOAD_HISTORY_URL}/${downloadId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to update download history')
  }

  const result = await response.json()
  return result.data
}

/**
 * Effacer l'historique des téléchargements (marquer comme "cleared")
 */
const clearDownloadHistory = async (): Promise<{ clearedCount: number }> => {
  const response = await fetch(`${API_CONFIG.DOWNLOAD_HISTORY_URL}/clear`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to clear download history')
  }

  const result = await response.json()
  return result.data
}

/**
 * Marquer tous les téléchargements comme "cleared" (même comportement que clearDownloadHistory)
 */
const deleteDownloadHistory = async (): Promise<{ clearedCount: number }> => {
  const response = await fetch(API_CONFIG.DOWNLOAD_HISTORY_URL, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to clear download history')
  }

  const result = await response.json()
  return result.data
}

/**
 * Obtenir les statistiques des téléchargements
 */
const getDownloadStats = async (): Promise<DownloadStats> => {
  const response = await fetch(`${API_CONFIG.DOWNLOAD_HISTORY_URL}/stats`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to get download stats')
  }

  const result = await response.json()
  return result.data
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
