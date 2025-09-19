import type { SearchResponse, SearchErrorResponse } from '../types'
import { API_CONFIG } from '../config/api'

/**
 * Check API health status
 * @returns {Promise<{status: string; message: string}>} API health information
 * @throws {Error} When health check fails
 */
const healthCheck = async (): Promise<{ status: string; message: string }> => {
  const response = await fetch(`${API_CONFIG.API_URL}/health`)
  if (!response.ok) {
    throw new Error('Health check failed')
  }

  return await response.json()
}

/**
 * Search for content on Zone Téléchargement
 * @param {string} query - Search query string
 * @param {string} [contentType] - Optional content type filter (films, series, mangas)
 * @param {number} [year] - Optional year filter
 * @returns {Promise<SearchResponse>} Search results
 * @throws {Error} When search fails or API key is invalid
 */
const searchContent = async (query: string, contentType?: string, year?: number): Promise<SearchResponse> => {
  let url = `${API_CONFIG.API_URL}/search?query=${encodeURIComponent(query)}`
  
  if (contentType && contentType !== 'all') {
    url += `&type=${encodeURIComponent(contentType)}`
  }
  
  if (year) {
    url += `&year=${year}`
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    const errorData: SearchErrorResponse = await response.json()
    
    // Créer une erreur personnalisée pour les clés API invalides
    if (errorData.code === 'INVALID_API_KEY' || errorData.code === 'MISSING_API_KEY') {
      const customError = new Error(errorData.message || 'Clé API AllDebrid invalide')
      customError.name = 'InvalidApiKeyError'
      ;(customError as any).code = errorData.code
      throw customError
    }
    
    throw new Error(errorData.message || 'Search failed')
  }

  return await response.json()
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
  const response = await fetch(`${API_CONFIG.API_URL}/downloads/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(options)
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Download check failed')
  }

  return await response.json()
}

/**
 * Cancel an ongoing download availability check
 * @param {string} sessionId - Session ID to cancel
 * @returns {Promise<any>} Cancellation result
 * @throws {Error} When cancellation fails
 */
const cancelDownloadCheck = async (sessionId: string): Promise<any> => {
  const response = await fetch(`${API_CONFIG.API_URL}/downloads/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ sessionId })
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Cancel check failed')
  }

  return await response.json()
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
  const response = await fetch(`${API_CONFIG.API_URL}/site-status`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Impossible de récupérer le statut du site')
  }

  return await response.json()
}

const ApiService = {
  healthCheck,
  searchContent,
  checkDownloadAvailability,
  cancelDownloadCheck,
  getSiteStatus
};

export default ApiService
