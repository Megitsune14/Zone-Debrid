/**
 * Service de téléchargement côté client utilisant les APIs natives du navigateur
 */

import { API_CONFIG } from '../config/api'

export interface DownloadItem {
  url: string
  filename: string
  episodeNumber?: string
  filesize?: number
}

export interface DownloadProgress {
  current: number
  total: number
  currentFile: string
  percentage: number
  bytesReceived?: number
  bytesTotal?: number
  fileProgress?: number
  currentFileBytesReceived?: number
  currentFileBytesTotal?: number
}

export interface DownloadOptions {
  type: 'films' | 'series' | 'mangas'
  title: string
  season?: string
  language: string
  quality: string
  episodes?: string[]
  items: DownloadItem[]
}

/**
 * Prefer client bandwidth for downloads
 */
let useClientBandwidth = true
let currentAbortController: AbortController | null = null
/**
 * Download a single file (film or single episode) with progress tracking
 * @param {DownloadItem} item - File to download with URL and filename
 * @param {(progress: DownloadProgress) => void} [onProgress] - Optional progress callback
 * @returns {Promise<void>} Resolves when download completes
 * @throws {Error} When download fails or is cancelled
 */
const downloadSingleFile = async (item: DownloadItem, onProgress?: (progress: DownloadProgress) => void): Promise<void> => {
  try {
    // Créer un AbortController pour ce téléchargement
    currentAbortController = new AbortController()
    
    // Utiliser le proxy serveur avec streaming progressif pour avoir la progression
    const proxyUrl = `${API_CONFIG.API_URL}/downloads/proxy?url=${encodeURIComponent(item.url)}`
    
    const response = await fetch(proxyUrl, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      signal: currentAbortController.signal
    })
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`)
    }

    // Lire le stream progressivement
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Impossible de lire le stream')
    }

    const chunks: Uint8Array[] = []
    let receivedLength = 0
    const contentLength = response.headers.get('content-length')
    const totalBytes = contentLength ? parseInt(contentLength) : (item.filesize || undefined)

    while (true) {
      const { done, value } = await reader.read()
      
      if (done) break
      
      chunks.push(value)
      receivedLength += value.length
      
      // Mettre à jour la progression
      const fileProgress = totalBytes ? Math.round((receivedLength / totalBytes) * 100) : undefined
      
      if (onProgress) {
        onProgress({
          current: 1,
          total: 1,
          currentFile: item.filename,
          percentage: fileProgress || 0,
          bytesReceived: receivedLength,
          bytesTotal: totalBytes,
          fileProgress: fileProgress
        })
      }        
    }

    // Créer le blob et télécharger
    const blob = new Blob(chunks as BlobPart[])
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = item.filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setTimeout(() => URL.revokeObjectURL(url), 1000)      
  } catch (error) {
    // Nettoyer l'AbortController
    currentAbortController = null
    
    // Ne pas traiter l'annulation comme une erreur
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Download cancelled')
    }
    
    console.error('Error downloading single file:', error)
    throw error
  }
}


/**
 * Download multiple files as a ZIP with folder structure
 * Uses progressive streams like AllDebrid
 * @param {DownloadOptions} options - Download options including files and metadata
 * @param {(progress: DownloadProgress) => void} [onProgress] - Optional progress callback
 * @returns {Promise<void>} Resolves when ZIP download completes
 * @throws {Error} When download fails or is cancelled
 */
const downloadMultipleFilesAsZip = async (
  options: DownloadOptions,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {
  try {
    // Créer un AbortController pour ce téléchargement
    currentAbortController = new AbortController()
    
    // Importer JSZip dynamiquement
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    // Créer la structure de dossiers
    const seriesFolder = zip.folder(options.title)
    const seasonFolder = options.season ? seriesFolder?.folder(`Saison ${options.season}`) : seriesFolder

    if (!seasonFolder) {
      throw new Error('Impossible de créer la structure de dossiers')
    }

    // Télécharger et ajouter chaque fichier au ZIP avec streams progressifs
    for (let i = 0; i < options.items.length; i++) {
      // Vérifier si le téléchargement a été annulé
      if (currentAbortController?.signal.aborted) {
        throw new Error('Download cancelled')
      }
      
      const item = options.items[i]
      
      // Mettre à jour la progression
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: options.items.length,
          currentFile: item.filename,
          percentage: Math.round(((i + 1) / options.items.length) * 100),
          currentFileBytesReceived: 0,
          currentFileBytesTotal: item.filesize
        })
      }

      try {
        // Utiliser le proxy serveur avec streaming progressif
        const proxyUrl = `${API_CONFIG.API_URL}/downloads/proxy?url=${encodeURIComponent(item.url)}`
        
        const response = await fetch(proxyUrl, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          signal: currentAbortController.signal
        })
        
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`)
        }

        // Lire le stream progressivement
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Impossible de lire le stream')
        }

        const chunks: Uint8Array[] = []
        let receivedLength = 0
        const contentLength = response.headers.get('content-length')
        const totalBytes = contentLength ? parseInt(contentLength) : (item.filesize || undefined)

        try {
          while (true) {
            // Vérifier si le téléchargement a été annulé
            if (currentAbortController?.signal.aborted) {
              throw new Error('Download cancelled')
            }
            
            const { done, value } = await reader.read()
            
            if (done) break
            
            chunks.push(value)
            receivedLength += value.length
            
            // Mettre à jour la progression du fichier en cours
            const fileProgress = totalBytes ? Math.round((receivedLength / totalBytes) * 100) : undefined
            
            if (onProgress) {
              onProgress({
                current: i + 1,
                total: options.items.length,
                currentFile: item.filename,
                percentage: Math.round(((i + 1) / options.items.length) * 100),
                bytesReceived: receivedLength,
                bytesTotal: totalBytes,
                fileProgress: fileProgress,
                currentFileBytesReceived: receivedLength,
                currentFileBytesTotal: totalBytes
              })
            }              
          }
        } catch (readError) {
          // Si c'est une erreur de lecture due à l'annulation, la propager
          if (readError instanceof Error && readError.name === 'AbortError') {
            throw new Error('Download cancelled')
          }
          throw readError
        }

        // Créer le blob à partir des chunks
        const blob = new Blob(chunks as BlobPart[])
        
        // Ajouter au ZIP avec le nom formaté
        const filename = formatEpisodeFilename(
          item.episodeNumber || '',
          options.language,
          options.quality
        )
        
        seasonFolder.file(filename, blob)          
      } catch (error) {
        // Ne pas afficher l'erreur si c'est une annulation
        if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Download cancelled')) {
          throw error // Propager l'erreur d'annulation
        }
        console.error(`Error downloading ${item.filename}:`, error)
        // Continuer avec les autres fichiers même si un échoue
      }
    }

    // Vérifier si le téléchargement a été annulé avant de générer le ZIP
    if (currentAbortController?.signal.aborted) {
      throw new Error('Download cancelled')
    }

    // Générer le ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    // Vérifier à nouveau avant de télécharger
    if (currentAbortController?.signal.aborted) {
      throw new Error('Download cancelled')
    }

    // Télécharger le ZIP
    const zipFilename = formatZipFilename(options)
    downloadBlob(zipBlob, zipFilename)      
  } catch (error) {
    // Nettoyer l'AbortController
    currentAbortController = null
    
    // Ne pas traiter l'annulation comme une erreur
    if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Download cancelled')) {
      throw new Error('Download cancelled')
    }
    
    console.error('Error creating ZIP:', error)
    throw error
  }
}

/**
 * Download a blob as a file
 * @param {Blob} blob - Blob data to download
 * @param {string} filename - Name for the downloaded file
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Nettoyer l'URL après un délai
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Format filename for a film
 * @param {string} title - Film title
 * @param {string} language - Language version
 * @param {string} quality - Video quality
 * @returns {string} Formatted filename
 */
const formatFilmFilename = (title: string, language: string, quality: string): string => {
  const sanitizedTitle = sanitizeFilename(title)
  return `${sanitizedTitle} - ${language} - ${quality}.mkv`
}

/**
 * Format filename for an episode
 * @param {string} episodeNumber - Episode number
 * @param {string} language - Language version
 * @param {string} quality - Video quality
 * @returns {string} Formatted filename
 */
const formatEpisodeFilename = (episodeNumber: string, language: string, quality: string): string => {
  return `Episode ${episodeNumber} - ${language} - ${quality}.mkv`
}

/**
 * Format filename for a single episode of a series
 * @param {string} title - Series title
 * @param {string} season - Season number
 * @param {string} episodeNumber - Episode number
 * @param {string} language - Language version
 * @param {string} quality - Video quality
 * @returns {string} Formatted filename
 */
const formatSingleEpisodeFilename = (
  title: string, 
  season: string, 
  episodeNumber: string, 
  language: string, 
  quality: string
): string => {
  const sanitizedTitle = sanitizeFilename(title)
  return `${sanitizedTitle} - Saison ${season} - Episode ${episodeNumber} - ${language} - ${quality}.mkv`
}

/**
 * Format ZIP filename based on download options
 * @param {DownloadOptions} options - Download options with title, season, episodes, etc.
 * @returns {string} Formatted ZIP filename
 */
const formatZipFilename = (options: DownloadOptions): string => {
  const sanitizedTitle = sanitizeFilename(options.title)
  const seasonPart = options.season ? ` - Saison ${options.season}` : ''
  const episodeCount = options.items.length
  const episodePart = episodeCount > 1 ? ` (${episodeCount} épisodes)` : ''
  
  return `${sanitizedTitle}${seasonPart}${episodePart} - ${options.language} - ${options.quality}.zip`
}

/**
 * Sanitize filename to avoid invalid characters
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*]/g, '') // Supprimer les caractères invalides
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim()
}

/**
 * Determine if a ZIP should be created or download directly
 * @param {DownloadItem[]} items - Array of download items
 * @returns {boolean} True if ZIP should be created (multiple files), false for direct download
 */
const shouldCreateZip = (items: DownloadItem[]): boolean => {
  return items.length > 1
}

/**
 * Toggle between using client or server bandwidth
 * @param {boolean} useClient - True to use client bandwidth, false for server
 */
const setUseClientBandwidth = (useClient: boolean): void => {
  useClientBandwidth = useClient
}

/**
 * Get current bandwidth mode
 * @returns {boolean} True if using client bandwidth, false if using server
 */
const isUsingClientBandwidth = (): boolean => {
  return useClientBandwidth
}

/**
 * Cancel the current download
 */
const cancelDownload = (): void => {
  if (currentAbortController) {
    currentAbortController.abort()
  }
}

/**
 * Check if a download is currently in progress
 * @returns {boolean} True if download is in progress, false otherwise
 */
const isDownloading = (): boolean => {
  return currentAbortController !== null
}

/**
 * Download based on type (single file or ZIP)
 * @param {DownloadOptions} options - Download options with files and metadata
 * @param {(progress: DownloadProgress) => void} [onProgress] - Optional progress callback
 * @returns {Promise<void>} Resolves when download completes
 * @throws {Error} When download fails or is cancelled
 */
const download = async (
  options: DownloadOptions,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {
  if (shouldCreateZip(options.items)) {
    await downloadMultipleFilesAsZip(options, onProgress)
  } else {
    // Téléchargement simple avec progression
    const item = options.items[0]
    if (options.type === 'films') {
      item.filename = formatFilmFilename(options.title, options.language, options.quality)
    } else {
      // Épisode unique de série
      item.filename = formatSingleEpisodeFilename(
        options.title,
        options.season || '1',
        item.episodeNumber || '1',
        options.language,
        options.quality
      )
    }
    await downloadSingleFile(item, onProgress)
  }
}

const ClientDownloadService = {
  downloadSingleFile,
  downloadMultipleFilesAsZip,
  formatFilmFilename,
  formatEpisodeFilename,
  formatSingleEpisodeFilename,
  formatZipFilename,
  shouldCreateZip,
  setUseClientBandwidth,
  isUsingClientBandwidth,
  cancelDownload,
  isDownloading,
  download
};

export default ClientDownloadService
