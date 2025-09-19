/**
 * Get API base URL based on environment
 * @returns {string} API base URL
 */
const getApiBaseUrl = (): string => {
  // Utiliser la variable d'environnement si définie
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // En production, utiliser l'URL actuelle
  if (import.meta.env.PROD) {
    return window.location.origin
  }
  
  // En développement, utiliser localhost:3000 par défaut
  return 'http://localhost:3000'
}

/**
 * Get Socket.IO URL based on environment
 * @returns {string} Socket.IO URL
 */
const getSocketUrl = (): string => {
  // Utiliser la variable d'environnement si définie
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL
  }
  
  // En production, utiliser l'URL actuelle
  if (import.meta.env.PROD) {
    return window.location.origin
  }
  
  // En développement, utiliser localhost:3000 par défaut
  return 'http://localhost:3000'
}

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  API_URL: `${getApiBaseUrl()}/api`,
  AUTH_URL: `${getApiBaseUrl()}/api/auth`,
  SOCKET_URL: getSocketUrl(),
  DOWNLOAD_HISTORY_URL: `${getApiBaseUrl()}/api/download-history`,
  DOWNLOADS_URL: `${getApiBaseUrl()}/api/downloads`
} as const

/**
 * Get complete API URL for an endpoint
 * @param {string} endpoint - API endpoint path
 * @returns {string} Complete API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}

/**
 * Get complete authentication URL for an endpoint
 * @param {string} endpoint - Auth endpoint path
 * @returns {string} Complete authentication URL
 */
export const getAuthUrl = (endpoint: string): string => {
  return `${API_CONFIG.AUTH_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
}

/**
 * Debug and logging configuration
 */
export const DEBUG_CONFIG = {
  ENABLED: import.meta.env.VITE_DEBUG === 'true',
  LOG_LEVEL: import.meta.env.VITE_LOG_LEVEL || 'info',
  OPTIMIZE: import.meta.env.VITE_OPTIMIZE === 'true'
} as const

/**
 * Utility functions for conditional logging
 */
export const log = {
  debug: (...args: any[]) => {
    if (DEBUG_CONFIG.ENABLED && DEBUG_CONFIG.LOG_LEVEL === 'debug') {
      console.log('[DEBUG]', ...args)
    }
  },
  info: (...args: any[]) => {
    if (DEBUG_CONFIG.LOG_LEVEL === 'debug' || DEBUG_CONFIG.LOG_LEVEL === 'info') {
      console.info('[INFO]', ...args)
    }
  },
  warn: (...args: any[]) => {
    if (DEBUG_CONFIG.LOG_LEVEL !== 'error') {
      console.warn('[WARN]', ...args)
    }
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
  }
}
