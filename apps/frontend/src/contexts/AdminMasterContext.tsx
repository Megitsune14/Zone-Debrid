import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'admin_master_auth'

interface AdminMasterContextValue {
  isMasterAuthenticated: boolean
  authenticateMasterPassword: (password: string) => Promise<void>
  clearMasterAuth: () => void
}

const AdminMasterContext = createContext<AdminMasterContextValue | undefined>(undefined)

export function AdminMasterProvider ({ children }: { children: ReactNode }) {
  const [isMasterAuthenticated, setIsMasterAuthenticated] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  })

  const authenticateMasterPassword = useCallback(async (password: string) => {
    const { default: metricsService } = await import('../services/metricsService')
    await metricsService.authenticateMasterPassword(password)
    sessionStorage.setItem(STORAGE_KEY, '1')
    setIsMasterAuthenticated(true)
  }, [])

  const clearMasterAuth = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setIsMasterAuthenticated(false)
  }, [])

  const value: AdminMasterContextValue = {
    isMasterAuthenticated,
    authenticateMasterPassword,
    clearMasterAuth
  }

  return (
    <AdminMasterContext.Provider value={value}>
      {children}
    </AdminMasterContext.Provider>
  )
}

export function useAdminMaster () {
  const ctx = useContext(AdminMasterContext)
  if (ctx === undefined) {
    throw new Error('useAdminMaster must be used within AdminMasterProvider')
  }
  return ctx
}
