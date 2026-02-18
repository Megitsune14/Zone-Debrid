import { API_CONFIG } from '../config/api'

/**
 * Get authentication headers for API requests
 * @returns {HeadersInit} Headers object with authorization token if available
 */
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

/**
 * Set master password for Megitsune user
 * @param {string} masterPassword - The new master password to set
 * @param {string} currentMasterPassword - The current master password (required if one exists)
 * @returns {Promise<{success: boolean; message: string}>} Set result
 * @throws {Error} When setting master password fails
 */
const setMasterPassword = async (masterPassword: string, currentMasterPassword?: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.API_URL}/metrics/set-master-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ masterPassword, currentMasterPassword })
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de la définition du mot de passe maître')
  }

  return result
}

/**
 * Authenticate with master password for metrics access
 * @param {string} masterPassword - The master password to authenticate with
 * @returns {Promise<{success: boolean; message: string}>} Authentication result
 * @throws {Error} When authentication fails
 */
const authenticateMasterPassword = async (masterPassword: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.API_URL}/metrics/authenticate-master`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ masterPassword })
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de l\'authentification maître')
  }

  return result
}

/**
 * Get application metrics
 * @returns {Promise<any>} Metrics data
 * @throws {Error} When fetching metrics fails
 */
const getMetrics = async (): Promise<any> => {
  const response = await fetch(`${API_CONFIG.API_URL}/metrics`, {
    method: 'GET',
    headers: getAuthHeaders()
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de la récupération des métriques')
  }

  return result
}

const MetricsService = {
  setMasterPassword,
  authenticateMasterPassword,
  getMetrics
}

export default MetricsService
