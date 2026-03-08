import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import apiService from '../services/api'
import clientDownloadService from '../services/clientDownloadService'
import type { ZipFileItem } from '../services/clientDownloadService'

export type ActiveDownloadStatus = 'downloading' | 'completed' | 'error' | 'cancelled'

export interface ActiveDownload {
  id: string
  url: string
  filename: string
  status: ActiveDownloadStatus
  progress: number
  speedMBps: number
  etaSeconds: number | null
  bytesReceived: number
  totalBytes: number | null
  startTime: number
  errorMessage?: string
  /** 'aria2' pour les téléchargements envoyés au NAS, absent pour les natifs */
  type?: string
}

export interface StartDownloadOptions {
  historyId?: string
  fileSize?: number
}

interface ActiveDownloadContextValue {
  downloads: ActiveDownload[]
  startDownload: (url: string, filename: string, options?: StartDownloadOptions) => string
  startZipDownload: (files: ZipFileItem[], zipFilename: string, options?: StartDownloadOptions) => string
  cancelDownload: (id: string) => void
  removeDownload: (id: string) => void
  refetchSessions: () => Promise<void>
}

const ActiveDownloadContext = createContext<ActiveDownloadContextValue | undefined>(undefined)

const POLL_INTERVAL_MS = 2000

function mapServerSessionToDownload(s: {
  id: string
  filename: string
  totalBytes: number | null
  bytesSent: number
  status: string
  startedAt: string
  type: string
  downloadSpeed?: number
  errorMessage?: string
}): ActiveDownload {
  const status = (s.status === 'started' || s.status === 'queued') ? 'downloading' : (s.status as ActiveDownloadStatus)
  const totalBytes = s.totalBytes ?? null
  const progress = totalBytes != null && totalBytes > 0
    ? Math.min(100, (s.bytesSent / totalBytes) * 100)
    : 0
  const speedMBps = (s.downloadSpeed != null && s.downloadSpeed > 0) ? s.downloadSpeed / (1024 * 1024) : 0
  return {
    id: s.id,
    url: '',
    filename: s.filename,
    status,
    progress,
    speedMBps,
    etaSeconds: null,
    bytesReceived: s.bytesSent,
    totalBytes,
    startTime: new Date(s.startedAt).getTime(),
    errorMessage: s.errorMessage,
    type: s.type
  }
}

export function ActiveDownloadProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<ActiveDownload[]>([])
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  const fetchSessions = useCallback(async () => {
    try {
      const sessions = await apiService.getActiveDownloadSessions()
      const mapped = sessions.map(mapServerSessionToDownload)
      setDownloads(mapped)
    } catch {
      setDownloads([])
    }
  }, [])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const hasActiveDownloads = downloads.some((d) => d.status === 'downloading')

  useEffect(() => {
    if (!hasActiveDownloads) return
    const interval = setInterval(fetchSessions, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [hasActiveDownloads, fetchSessions])

  const startDownload = useCallback((url: string, filename: string, options?: StartDownloadOptions): string => {
    const { historyId, fileSize } = options ?? {}

    const run = async () => {
      const { downloadUrl } = await apiService.getSignedProxyUrl(
        url,
        filename,
        fileSize ?? undefined,
        historyId
      )
      clientDownloadService.startNativeDownload(downloadUrl)
      await fetchSessions()
    }
    run().catch(() => {})
    return 'session'
  }, [fetchSessions])

  const startZipDownload = useCallback((
    files: ZipFileItem[],
    zipFilename: string,
    options?: StartDownloadOptions
  ): string => {
    const { historyId } = options ?? {}

    const run = async () => {
      const { downloadUrl } = await apiService.getSignedProxyZipUrl(
        files,
        zipFilename,
        historyId
      )
      clientDownloadService.startNativeDownload(downloadUrl)
      await fetchSessions()
    }
    run().catch(() => {})
    return 'session'
  }, [fetchSessions])

  const cancelDownload = useCallback(async (id: string) => {
    try {
      await apiService.cancelDownloadSession(id)
      await fetchSessions()
    } catch {
      setDownloads((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'cancelled' as const } : d))
      )
    }
  }, [fetchSessions])

  const removeDownload = useCallback((id: string) => {
    setHiddenIds((prev) => new Set(prev).add(id))
  }, [])

  const visibleDownloads = useMemo(
    () => downloads.filter((d) => !hiddenIds.has(d.id)),
    [downloads, hiddenIds]
  )

  const value = useMemo(
    () => ({
      downloads: visibleDownloads,
      startDownload,
      startZipDownload,
      cancelDownload,
      removeDownload,
      refetchSessions: fetchSessions
    }),
    [visibleDownloads, startDownload, startZipDownload, cancelDownload, removeDownload, fetchSessions]
  )

  return (
    <ActiveDownloadContext.Provider value={value}>
      {children}
    </ActiveDownloadContext.Provider>
  )
}

export function useActiveDownloads() {
  const ctx = useContext(ActiveDownloadContext)
  if (ctx === undefined) {
    throw new Error('useActiveDownloads must be used within ActiveDownloadProvider')
  }
  return ctx
}
