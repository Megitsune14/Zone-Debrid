export interface User {
  id: string
  username: string
  allDebridApiKey: string
  isAdmin?: boolean
  createdAt: string
  updatedAt: string
  aria2Enabled?: boolean
  aria2RpcUrl?: string
  aria2RpcSecret?: string
  aria2DownloadBasePath?: string
  aria2PathFilms?: string
  aria2PathSeries?: string
  aria2PathAnimes?: string
  aria2PathSeriesSeason?: string
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
  allDebridApiKey?: string
  aria2Enabled?: boolean
  aria2RpcUrl?: string
  aria2RpcSecret?: string
  aria2DownloadBasePath?: string
  aria2PathFilms?: string
  aria2PathSeries?: string
  aria2PathAnimes?: string
  aria2PathSeriesSeason?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
