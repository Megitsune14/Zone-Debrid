import React, { createContext, useContext, useReducer, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { User, AuthState, RegisterRequest, LoginRequest, UpdateProfileRequest } from '../types/auth'
import authService from '../services/authService'

// Types pour le contexte
interface AuthContextType extends AuthState {
  register: (data: RegisterRequest) => Promise<void>
  login: (data: LoginRequest) => Promise<void>
  logout: () => void
  updateProfile: (data: UpdateProfileRequest) => Promise<void>
  loadUser: () => Promise<void>
}

// Actions pour le reducer
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAIL' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: User }

// État initial
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true
}

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      }
    case 'AUTH_FAIL':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      }
    case 'UPDATE_PROFILE':
      return {
        ...state,
        user: action.payload
      }
    default:
      return state
  }
}

// Créer le contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async (): Promise<void> => {
    try {
      const token = authService.getToken()
      if (!token) {
        dispatch({ type: 'AUTH_FAIL' })
        return
      }

      const response = await authService.getProfile()
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: response.data.user, token }
      })
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error)
      authService.removeToken()
      dispatch({ type: 'AUTH_FAIL' })
    }
  }

  const register = async (data: RegisterRequest): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' })
      const response = await authService.register(data)
      authService.setToken(response.data.token)
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: response.data.user, token: response.data.token }
      })
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAIL' })
      throw error
    }
  }

  const login = async (data: LoginRequest): Promise<void> => {
    try {
      dispatch({ type: 'AUTH_START' })
      const response = await authService.login(data)
      authService.setToken(response.data.token)
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: response.data.user, token: response.data.token }
      })
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAIL' })
      throw error
    }
  }

  const logout = (): void => {
    authService.removeToken()
    dispatch({ type: 'LOGOUT' })
  }

  const updateProfile = async (data: UpdateProfileRequest): Promise<void> => {
    try {
      const response = await authService.updateProfile(data)
      dispatch({ type: 'UPDATE_PROFILE', payload: response.data.user })
    } catch (error: any) {
      throw error
    }
  }

  const value: AuthContextType = {
    ...state,
    register,
    login,
    logout,
    updateProfile,
    loadUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook personnalisé pour utiliser le contexte
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}
