import { useState, useCallback, useEffect } from 'react'
import type { DownloadProgress } from '../services/clientDownloadService'
import downloadHistoryService, { type DownloadHistoryItem } from '../services/downloadHistoryService'
import clientDownloadService from '../services/clientDownloadService'
import { useAuth } from '../contexts/AuthContext'

export interface DownloadItem {
  id: string
  title: string
  type: 'films' | 'series' | 'mangas'
  progress: DownloadProgress | null
  status: 'downloading' | 'completed' | 'error' | 'cancelled' | 'paused'
  cleared: boolean
  startTime: Date
  endTime?: Date
  errorMessage?: string
  zipFilename?: string
  isExpanded?: boolean
  // Champs pour l'historique persistant
  historyId?: string
  language?: string
  quality?: string
  season?: string
  episodes?: string[]
  fileSize?: number
}

/**
 * Custom hook for managing download state and operations
 * @returns {Object} Download management functions and state
 */
export function useDownloads() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([])
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const { isAuthenticated } = useAuth()

  /**
   * Load download history from server
   */
  const loadDownloadHistory = useCallback(async () => {
    // Ne pas charger l'historique si l'utilisateur n'est pas authentifié
    if (!isAuthenticated) {
      return
    }

    try {
      setIsLoadingHistory(true)
      const historyItems = await downloadHistoryService.getDownloadHistory({ limit: 100 })
      
      // Convertir les éléments d'historique en DownloadItem
      const convertedDownloads: DownloadItem[] = historyItems.map(item => ({
        id: item._id,
        title: item.title,
        type: item.type,
        progress: null,
        status: item.status,
        cleared: item.cleared,
        startTime: new Date(item.startTime),
        endTime: item.endTime ? new Date(item.endTime) : undefined,
        errorMessage: item.errorMessage,
        zipFilename: item.zipFilename,
        historyId: item._id,
        language: item.language,
        quality: item.quality,
        season: item.season,
        episodes: item.episodes,
        fileSize: item.fileSize
      }))
      
      setDownloads(convertedDownloads)
    } catch (error) {
      console.error('Error loading download history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [isAuthenticated])

  /**
   * Add a new download to the list
   * @param {Omit<DownloadItem, 'id' | 'startTime' | 'status'>} download - Download data without auto-generated fields
   * @param {any} [downloadOptions] - Optional download options for immediate execution
   * @returns {Promise<string>} Download ID
   */
  const addDownload = useCallback(async (download: Omit<DownloadItem, 'id' | 'startTime' | 'status'>, downloadOptions?: any) => {
    try {
      // Créer l'enregistrement dans l'historique persistant
      const historyItem = await downloadHistoryService.createDownloadHistory({
        title: download.title,
        type: download.type,
        language: download.language,
        quality: download.quality,
        season: download.season,
        episodes: download.episodes
      })

      const newDownload: DownloadItem = {
        ...download,
        id: historyItem._id,
        startTime: new Date(historyItem.startTime),
        status: 'downloading',
        cleared: false,
        historyId: historyItem._id
      }
      
      setDownloads(prev => [newDownload, ...prev])
      setIsPanelOpen(true) // Ouvrir automatiquement le panel
      
      // Lancer le téléchargement si les options sont fournies
      if (downloadOptions) {
        clientDownloadService.download(downloadOptions, (progress) => {
          updateProgress(newDownload.id, progress)
        }).then(async () => {
          // Marquer comme terminé
          await completeDownload(newDownload.id, newDownload.zipFilename)
        }).catch(async (error) => {
          // Ne pas traiter l'annulation comme une erreur
          if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Download cancelled')) {
            await cancelDownload(newDownload.id)
            return
          }
          
          // Marquer comme erreur
          await errorDownload(newDownload.id, error instanceof Error ? error.message : 'Erreur inconnue')
        })
      }
      
      return newDownload.id
    } catch (error) {
      console.error('Error creating download history:', error)
      // Fallback: créer un téléchargement local sans persistance
      const newDownload: DownloadItem = {
        ...download,
        id: `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startTime: new Date(),
        status: 'downloading',
        cleared: false
      }
      
      setDownloads(prev => [newDownload, ...prev])
      setIsPanelOpen(true)
      
      // Lancer le téléchargement si les options sont fournies
      if (downloadOptions) {
        clientDownloadService.download(downloadOptions, (progress) => {
          updateProgress(newDownload.id, progress)
        }).then(async () => {
          // Marquer comme terminé
          await completeDownload(newDownload.id, newDownload.zipFilename)
        }).catch(async (error) => {
          // Ne pas traiter l'annulation comme une erreur
          if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Download cancelled')) {
            await cancelDownload(newDownload.id)
            return
          }
          
          // Marquer comme erreur
          await errorDownload(newDownload.id, error instanceof Error ? error.message : 'Erreur inconnue')
        })
      }
      
      return newDownload.id
    }
  }, [])

  /**
   * Update download progress
   * @param {string} id - Download ID
   * @param {DownloadProgress} progress - Progress information
   */
  const updateProgress = useCallback((id: string, progress: DownloadProgress) => {
    setDownloads(prev => prev.map(download => 
      download.id === id 
        ? { ...download, progress }
        : download
    ))
  }, [])

  /**
   * Mark a download as completed
   * @param {string} id - Download ID
   * @param {string} [zipFilename] - Optional ZIP filename for completed download
   */
  const completeDownload = useCallback(async (id: string, zipFilename?: string) => {
    const endTime = new Date()
    
    setDownloads(prev => {
      const updatedDownloads = prev.map(download => 
        download.id === id 
          ? { 
              ...download, 
              status: 'completed' as const,
              endTime,
              zipFilename
            }
          : download
      )

      // Mettre à jour l'historique persistant
      const download = prev.find(d => d.id === id)
      if (download?.historyId) {
        downloadHistoryService.updateDownloadHistory(download.historyId, {
          status: 'completed',
          endTime: endTime.toISOString(),
          zipFilename
        }).catch(error => {
          console.error('Error updating download history:', error)
        })
      }

      return updatedDownloads
    })
  }, [])

  /**
   * Mark a download as failed with error message
   * @param {string} id - Download ID
   * @param {string} errorMessage - Error message describing the failure
   */
  const errorDownload = useCallback(async (id: string, errorMessage: string) => {
    const endTime = new Date()
    
    setDownloads(prev => {
      const updatedDownloads = prev.map(download => 
        download.id === id 
          ? { 
              ...download, 
              status: 'error' as const,
              endTime,
              errorMessage
            }
          : download
      )

      // Mettre à jour l'historique persistant
      const download = prev.find(d => d.id === id)
      if (download?.historyId) {
        downloadHistoryService.updateDownloadHistory(download.historyId, {
          status: 'error',
          endTime: endTime.toISOString(),
          errorMessage
        }).catch(error => {
          console.error('Error updating download history:', error)
        })
      }

      return updatedDownloads
    })
  }, [])

  /**
   * Cancel a download
   * @param {string} id - Download ID
   */
  const cancelDownload = useCallback(async (id: string) => {
    const endTime = new Date()
    
    // Annuler le téléchargement en cours dans le service
    clientDownloadService.cancelDownload()
    
    setDownloads(prev => {
      const updatedDownloads = prev.map(download => 
        download.id === id 
          ? { 
              ...download, 
              status: 'cancelled' as const,
              endTime
            }
          : download
      )

      // Mettre à jour l'historique persistant
      const download = prev.find(d => d.id === id)
      if (download?.historyId) {
        downloadHistoryService.updateDownloadHistory(download.historyId, {
          status: 'cancelled',
          endTime: endTime.toISOString()
        }).catch(error => {
          console.error('Error updating download history:', error)
        })
      }

      return updatedDownloads
    })
  }, [])

  /**
   * Pause a download
   * @param {string} id - Download ID
   */
  const pauseDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(download => 
      download.id === id 
        ? { ...download, status: 'paused' as const }
        : download
    ))
  }, [])

  /**
   * Resume a paused download
   * @param {string} id - Download ID
   */
  const resumeDownload = useCallback((id: string) => {
    setDownloads(prev => prev.map(download => 
      download.id === id 
        ? { ...download, status: 'downloading' as const }
        : download
    ))
  }, [])

  /**
   * Remove a download from the list
   * @param {string} id - Download ID
   */
  const removeDownload = useCallback((id: string) => {
    setDownloads(prev => prev.filter(download => download.id !== id))
  }, [])

  /**
   * Toggle download panel visibility
   */
  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev)
  }, [])

  /**
   * Get a download by ID
   * @param {string} id - Download ID
   * @returns {DownloadItem | undefined} Download item or undefined if not found
   */
  const getDownload = useCallback((id: string) => {
    return downloads.find(download => download.id === id)
  }, [downloads])

  /**
   * Get active downloads (downloading or paused)
   * @returns {DownloadItem[]} Array of active downloads
   */
  const getActiveDownloads = useCallback(() => {
    return downloads.filter(d => d.status === 'downloading' || d.status === 'paused')
  }, [downloads])

  /**
   * Get completed downloads (not cleared)
   * @returns {DownloadItem[]} Array of completed downloads
   */
  const getCompletedDownloads = useCallback(() => {
    return downloads.filter(d => 
      (d.status === 'completed' || d.status === 'error' || d.status === 'cancelled') && 
      !d.cleared
    )
  }, [downloads])

  /**
   * Clear download history (mark as "cleared")
   * @returns {Promise<number>} Number of cleared downloads
   */
  const clearDownloadHistory = useCallback(async () => {
    try {
      const result = await downloadHistoryService.clearDownloadHistory()
      
      // Mettre à jour l'état local
      setDownloads(prev => prev.map(download => 
        (download.status === 'completed' || download.status === 'error' || download.status === 'cancelled')
          ? { ...download, cleared: true }
          : download
      ))
      
      return result.clearedCount
    } catch (error) {
      console.error('Error clearing download history:', error)
      throw error
    }
  }, [])

  /**
   * Delete download history (mark all as "cleared")
   * @returns {Promise<number>} Number of cleared downloads
   */
  const deleteDownloadHistory = useCallback(async () => {
    try {
      const result = await downloadHistoryService.deleteDownloadHistory()
      
      // Mettre à jour l'état local (même comportement que clearDownloadHistory)
      setDownloads(prev => prev.map(download => 
        (download.status === 'completed' || download.status === 'error' || download.status === 'cancelled')
          ? { ...download, cleared: true }
          : download
      ))
      
      return result.clearedCount
    } catch (error) {
      console.error('Error clearing download history:', error)
      throw error
    }
  }, [])

  /**
   * Load history on component mount and when authentication changes
   */
  useEffect(() => {
    loadDownloadHistory()
  }, [loadDownloadHistory])

  /**
   * Reset downloads when user logs out
   */
  useEffect(() => {
    if (!isAuthenticated) {
      setDownloads([])
      setIsPanelOpen(false)
    }
  }, [isAuthenticated])

  return {
    downloads,
    isPanelOpen,
    isLoadingHistory,
    addDownload,
    updateProgress,
    completeDownload,
    errorDownload,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    removeDownload,
    togglePanel,
    getDownload,
    getActiveDownloads,
    getCompletedDownloads,
    loadDownloadHistory,
    clearDownloadHistory,
    deleteDownloadHistory
  }
}
