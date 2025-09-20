import { createContext, useContext, ReactNode } from 'react'
import { useDownloads, type DownloadItem } from '../hooks/useDownloads'

interface DownloadContextType {
  downloads: DownloadItem[]
  isPanelOpen: boolean
  isLoadingHistory: boolean
  addDownload: (download: Omit<DownloadItem, 'id' | 'startTime' | 'status'>, downloadOptions?: any) => Promise<string>
  updateProgress: (id: string, progress: any) => void
  completeDownload: (id: string, zipFilename?: string) => Promise<void>
  errorDownload: (id: string, errorMessage: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>
  pauseDownload: (id: string) => void
  resumeDownload: (id: string) => void
  removeDownload: (id: string) => void
  togglePanel: () => void
  getDownload: (id: string) => DownloadItem | undefined
  getActiveDownloads: () => DownloadItem[]
  getCompletedDownloads: () => DownloadItem[]
  loadDownloadHistory: () => Promise<void>
  clearDownloadHistory: () => Promise<number>
  deleteDownloadHistory: () => Promise<number>
}

const DownloadContext = createContext<DownloadContextType | undefined>(undefined)

interface DownloadProviderProps {
  children: ReactNode
}

export function DownloadProvider({ children }: DownloadProviderProps) {
  const downloadState = useDownloads()

  return (
    <DownloadContext.Provider value={downloadState}>
      {children}
    </DownloadContext.Provider>
  )
}

export function useDownloadContext() {
  const context = useContext(DownloadContext)
  if (context === undefined) {
    throw new Error('useDownloadContext must be used within a DownloadProvider')
  }
  return context
}
