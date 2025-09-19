import React, { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react';

interface NotificationState {
  invalidApiKeyModal: {
    isOpen: boolean
    message?: string
  }
}

type NotificationAction = 
  | { type: 'SHOW_INVALID_API_KEY_MODAL'; payload?: { message?: string } }
  | { type: 'HIDE_INVALID_API_KEY_MODAL' }

const initialState: NotificationState = {
  invalidApiKeyModal: {
    isOpen: false,
    message: undefined
  }
}

const notificationReducer = (state: NotificationState, action: NotificationAction): NotificationState => {
  switch (action.type) {
    case 'SHOW_INVALID_API_KEY_MODAL':
      return {
        ...state,
        invalidApiKeyModal: {
          isOpen: true,
          message: action.payload?.message
        }
      }
    case 'HIDE_INVALID_API_KEY_MODAL':
      return {
        ...state,
        invalidApiKeyModal: {
          isOpen: false,
          message: undefined
        }
      }
    default:
      return state
  }
}

interface NotificationContextType {
  state: NotificationState
  showInvalidApiKeyModal: (message?: string) => void
  hideInvalidApiKeyModal: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState)

  const showInvalidApiKeyModal = (message?: string) => {
    dispatch({ type: 'SHOW_INVALID_API_KEY_MODAL', payload: { message } })
  }

  const hideInvalidApiKeyModal = () => {
    dispatch({ type: 'HIDE_INVALID_API_KEY_MODAL' })
  }

  const value: NotificationContextType = {
    state,
    showInvalidApiKeyModal,
    hideInvalidApiKeyModal
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}