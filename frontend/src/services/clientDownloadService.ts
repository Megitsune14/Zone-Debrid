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
 * Uses progressive streams and memory-efficient processing
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

    // Télécharger et ajouter chaque fichier au ZIP avec streaming optimisé
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

        // Lire le stream progressivement avec gestion mémoire optimisée
        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('Impossible de lire le stream')
        }

        // Vérifier la taille du fichier avant de commencer
        const contentLength = response.headers.get('content-length')
        const totalBytes = contentLength ? parseInt(contentLength) : (item.filesize || undefined)
        
        // Limite de mémoire par fichier (100MB)
        const MAX_CHUNK_SIZE = 100 * 1024 * 1024
        
        // Si le fichier est trop volumineux, le télécharger individuellement
        if (totalBytes && totalBytes > MAX_CHUNK_SIZE) {
          console.warn(`Fichier ${item.filename} trop volumineux (${totalBytes} bytes), téléchargement individuel`)
          
          // Fermer le reader actuel
          reader.releaseLock()
          
          // Télécharger ce fichier individuellement
          const filename = formatEpisodeFilename(
            item.episodeNumber || '',
            options.language,
            options.quality
          )
          
          const individualItem = { ...item, filename }
          await downloadSingleFile(individualItem, (progress) => {
            if (onProgress) {
              onProgress({
                current: i + 1,
                total: options.items.length,
                currentFile: filename,
                percentage: Math.round(((i + 1) / options.items.length) * 100),
                bytesReceived: progress.bytesReceived,
                bytesTotal: progress.bytesTotal,
                fileProgress: progress.percentage,
                currentFileBytesReceived: progress.bytesReceived,
                currentFileBytesTotal: progress.bytesTotal
              })
            }
          })
          
          // Passer au fichier suivant
          continue
        }

        // Pour les fichiers de taille normale, utiliser le streaming classique
        const chunks: Uint8Array[] = []
        let receivedLength = 0
        let currentChunkSize = 0

        try {
          while (true) {
            // Vérifier si le téléchargement a été annulé
            if (currentAbortController?.signal.aborted) {
              throw new Error('Download cancelled')
            }
            
            const { done, value } = await reader.read()
            
            if (done) break
            
            chunks.push(value)
            currentChunkSize += value.length
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

        // Créer le blob à partir des chunks avec gestion d'erreur
        let blob: Blob
        try {
          blob = new Blob(chunks as BlobPart[])
        } catch (blobError) {
          console.error(`Erreur création blob pour ${item.filename}:`, blobError)
          throw new Error(`Impossible de créer le fichier ${item.filename}: mémoire insuffisante`)
        }
        
        // Ajouter au ZIP avec le nom formaté
        const filename = formatEpisodeFilename(
          item.episodeNumber || '',
          options.language,
          options.quality
        )
        
        try {
          seasonFolder.file(filename, blob)
        } catch (zipError) {
          console.error(`Erreur ajout au ZIP pour ${item.filename}:`, zipError)
          throw new Error(`Impossible d'ajouter ${item.filename} au ZIP: mémoire insuffisante`)
        }
        
        // Libérer la mémoire des chunks
        chunks.length = 0
        
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

    // Vérifier si le ZIP contient des fichiers
    const zipFiles = Object.keys(zip.files).filter(name => !zip.files[name].dir)
    
    if (zipFiles.length > 0) {
      // Générer le ZIP avec options de compression optimisées
      let zipBlob: Blob
      try {
        zipBlob = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: {
            level: 6 // Niveau de compression équilibré
          }
        })
      } catch (zipGenError) {
        console.error('Erreur génération ZIP:', zipGenError)
        throw new Error('Impossible de générer le ZIP: mémoire insuffisante')
      }

      // Vérifier à nouveau avant de télécharger
      if (currentAbortController?.signal.aborted) {
        throw new Error('Download cancelled')
      }

      // Télécharger le ZIP
      const zipFilename = `${sanitizeFilename(options.title)} - ${options.language} - ${options.quality}.zip`
      downloadBlob(zipBlob, zipFilename)
      
      console.info(`ZIP créé avec ${zipFiles.length} fichier(s)`)
    } else {
      console.info('Aucun fichier ajouté au ZIP (tous les fichiers étaient trop volumineux)')
    }      
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
 * Download multiple large files individually (fallback for memory issues)
 * @param {DownloadOptions} options - Download options including files and metadata
 * @param {(progress: DownloadProgress) => void} [onProgress] - Optional progress callback
 * @returns {Promise<void>} Resolves when all downloads complete
 * @throws {Error} When download fails or is cancelled
 */
const downloadMultipleFilesIndividually = async (
  options: DownloadOptions,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {
  try {
    // Créer un AbortController pour ce téléchargement
    currentAbortController = new AbortController()
    
    console.info(`Téléchargement de ${options.items.length} fichier(s) individuellement`)
    
    // Télécharger chaque fichier individuellement
    for (let i = 0; i < options.items.length; i++) {
      // Vérifier si le téléchargement a été annulé
      if (currentAbortController?.signal.aborted) {
        throw new Error('Download cancelled')
      }
      
      const item = options.items[i]
      
      // Formater le nom de fichier
      const filename = formatSingleEpisodeFilename(
        options.title,
        options.season || '1',
        item.episodeNumber || '1',
        options.language,
        options.quality
      )
      
      // Créer un item avec le nom formaté
      const formattedItem = { ...item, filename }
      
      // Télécharger le fichier individuellement
      await downloadSingleFile(formattedItem, (progress) => {
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: options.items.length,
            currentFile: filename,
            percentage: Math.round(((i + 1) / options.items.length) * 100),
            bytesReceived: progress.bytesReceived,
            bytesTotal: progress.bytesTotal,
            fileProgress: progress.percentage,
            currentFileBytesReceived: progress.bytesReceived,
            currentFileBytesTotal: progress.bytesTotal
          })
        }
      })
    }
  } catch (error) {
    // Nettoyer l'AbortController
    currentAbortController = null
    
    // Ne pas traiter l'annulation comme une erreur
    if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Download cancelled')) {
      throw new Error('Download cancelled')
    }
    
    console.error('Error downloading files individually:', error)
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
 * Download based on type (single file or multiple files individually)
 * @param {DownloadOptions} options - Download options with files and metadata
 * @param {(progress: DownloadProgress) => void} [onProgress] - Optional progress callback
 * @returns {Promise<void>} Resolves when download completes
 * @throws {Error} When download fails or is cancelled
 */
const download = async (
  options: DownloadOptions,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> => {
  if (options.items.length > 1) {
    // Téléchargement multiple - toujours individuellement
    await downloadMultipleFilesIndividually(options, onProgress)
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
  downloadMultipleFilesIndividually,
  formatFilmFilename,
  formatEpisodeFilename,
  formatSingleEpisodeFilename,
  setUseClientBandwidth,
  isUsingClientBandwidth,
  cancelDownload,
  isDownloading,
  download
};

export default ClientDownloadService
