import type {
  AuthResponse,
  ProfileResponse,
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest
} from '../types/auth'
import { API_CONFIG } from '../config/api'
import { request } from './httpClient'

interface UpdatePasswordRequest {
  currentPassword: string
  newPassword: string
}

const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  return request<AuthResponse>(`${API_CONFIG.AUTH_URL}/register`, {
    method: 'POST',
    body: data
  })
}

const login = async (data: LoginRequest): Promise<AuthResponse> => {
  return request<AuthResponse>(`${API_CONFIG.AUTH_URL}/login`, {
    method: 'POST',
    body: data
  })
}

const getProfile = async (): Promise<ProfileResponse> => {
  return request<ProfileResponse>(`${API_CONFIG.AUTH_URL}/profile`)
}

const updateProfile = async (data: UpdateProfileRequest): Promise<ProfileResponse> => {
  return request<ProfileResponse>(`${API_CONFIG.AUTH_URL}/profile`, {
    method: 'PUT',
    body: data
  })
}

const updatePassword = async (data: UpdatePasswordRequest): Promise<{ success: boolean; message: string }> => {
  return request(`${API_CONFIG.AUTH_URL}/password`, {
    method: 'PUT',
    body: data
  })
}

const validateAllDebridApiKey = async (apiKey: string): Promise<{ success: boolean; message: string }> => {
  return request(`${API_CONFIG.AUTH_URL}/validate-api-key`, {
    method: 'POST',
    body: { allDebridApiKey: apiKey }
  })
}

const deleteAccount = async (password: string): Promise<{ success: boolean; message: string }> => {
  return request(`${API_CONFIG.AUTH_URL}/account`, {
    method: 'DELETE',
    body: { password }
  })
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
