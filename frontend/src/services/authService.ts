import type { 
  AuthResponse, 
  ProfileResponse, 
  RegisterRequest, 
  LoginRequest, 
  UpdateProfileRequest 
} from '../types/auth'
import { API_CONFIG } from '../config/api'

interface UpdatePasswordRequest {
  currentPassword: string
  newPassword: string
}

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
 * Register a new user account
 * @param {RegisterRequest} data - Registration data (username, password, allDebridApiKey)
 * @returns {Promise<AuthResponse>} Authentication response with user data and token
 * @throws {Error} When registration fails
 */
const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await fetch(`${API_CONFIG.AUTH_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de l\'inscription')
  }

  return result
}

/**
 * Authenticate user and get access token
 * @param {LoginRequest} data - Login credentials (username, password)
 * @returns {Promise<AuthResponse>} Authentication response with user data and token
 * @throws {Error} When login fails
 */
const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await fetch(`${API_CONFIG.AUTH_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de la connexion')
  }

  return result
}

/**
 * Get authenticated user profile information
 * @returns {Promise<ProfileResponse>} User profile data
 * @throws {Error} When profile retrieval fails
 */
const getProfile = async (): Promise<ProfileResponse> => {
  const response = await fetch(`${API_CONFIG.AUTH_URL}/profile`, {
    method: 'GET',
    headers: getAuthHeaders()
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de la récupération du profil')
  }

  return result
}

/**
 * Update authenticated user profile (AllDebrid API key)
 * @param {UpdateProfileRequest} data - Profile update data
 * @returns {Promise<ProfileResponse>} Updated user profile data
 * @throws {Error} When profile update fails
 */
const updateProfile = async (data: UpdateProfileRequest): Promise<ProfileResponse> => {
  const response = await fetch(`${API_CONFIG.AUTH_URL}/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de la mise à jour du profil')
  }

  return result
}

/**
 * Update authenticated user password
 * @param {UpdatePasswordRequest} data - Password update data (currentPassword, newPassword)
 * @returns {Promise<{success: boolean; message: string}>} Update result
 * @throws {Error} When password update fails
 */
const updatePassword = async (data: UpdatePasswordRequest): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.AUTH_URL}/password`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data)
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de la modification du mot de passe')
  }

  return result
}

/**
 * Validate an AllDebrid API key
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<{success: boolean; message: string}>} Validation result
 * @throws {Error} When validation fails
 */
const validateAllDebridApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.AUTH_URL}/validate-api-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ allDebridApiKey: apiKey })
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de la validation de la clé API')
  }

  return result
}

/**
 * Delete authenticated user account
 * @param {string} password - User password for confirmation
 * @returns {Promise<{success: boolean; message: string}>} Deletion result
 * @throws {Error} When account deletion fails
 */
const deleteAccount = async (password: string): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_CONFIG.AUTH_URL}/account`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ password })
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Erreur lors de la suppression du compte')
  }

  return result
}

/**
 * Store authentication token in localStorage
 * @param {string} token - JWT token to store
 */
const setToken = (token: string): void => {
  localStorage.setItem('token', token)
}

/**
 * Retrieve authentication token from localStorage
 * @returns {string | null} Stored JWT token or null if not found
 */
const getToken = (): string | null => {
  return localStorage.getItem('token')
}

/**
 * Remove authentication token from localStorage
 */
const removeToken = (): void => {
  localStorage.removeItem('token')
}

/**
 * Check if user is authenticated (has valid token)
 * @returns {boolean} True if user is authenticated, false otherwise
 */
const isAuthenticated = (): boolean => {
  return !!getToken()
}

const AuthService = {
  register,
  login,
  getProfile,
  updateProfile,
  updatePassword,
  validateAllDebridApiKey,
  deleteAccount,
  setToken,
  getToken,
  removeToken,
  isAuthenticated
};

export default AuthService
