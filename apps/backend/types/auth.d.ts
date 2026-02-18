declare global {
  interface User {
    id: string
    username: string
    allDebridApiKey: string
    createdAt: Date
    updatedAt: Date
  }

  interface AuthResponse {
    success: boolean
    message: string
    data: {
      user: User
      token: string
    }
  }

  interface ProfileResponse {
    success: boolean
    data: {
      user: User
    }
  }

  interface ErrorResponse {
    success: false
    message: string
    errors?: string[]
  }

  interface RegisterRequest {
    username: string
    password: string
    allDebridApiKey: string
  }

  interface LoginRequest {
    username: string
    password: string
  }

  interface UpdateProfileRequest {
    allDebridApiKey: string
  }
}

export {}
