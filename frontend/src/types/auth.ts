export interface User {
  id: string
  username: string
  allDebridApiKey: string
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: {
    user: User
    token: string
  }
}

export interface ProfileResponse {
  success: boolean
  data: {
    user: User
  }
}

export interface ErrorResponse {
  success: false
  message: string
  errors?: string[]
}

export interface RegisterRequest {
  username: string
  password: string
  allDebridApiKey: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface UpdateProfileRequest {
  allDebridApiKey: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
