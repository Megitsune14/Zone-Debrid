import { useState, useEffect } from 'react'
import { FiFilm, FiTv, FiPlay, FiGlobe, FiStar, FiDownload, FiX, FiCalendar, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import type { SearchResult, SearchItem } from '../types'
import apiService from '../services/api'
import clientDownloadService from '../services/clientDownloadService'
import downloadHistoryService from '../services/downloadHistoryService'
import { useActiveDownloads } from '../contexts/ActiveDownloadContext'
import { useAuth } from '../contexts/AuthContext'
import { API_CONFIG, log } from '../config/api'
import { sortQualities, getQualityBar } from '../utils/quality'

interface DownloadModalProps {
  result: SearchResult
  item: SearchItem
  isOpen: boolean
  onClose: () => void
}

interface ProgressUpdate {
  type: 'progress' | 'status' | 'error' | 'complete';
  message: string;
  progress?: number;
  data?: any;
}

/**
 * Modal pour configurer et lancer un téléchargement
 * Gère la vérification de disponibilité et enregistre les fichiers dans la page Téléchargements
 */
const DownloadModal = ({ result, item, isOpen, onClose }: DownloadModalProps) => {
  const { startDownload, startZipDownload, refetchSessions } = useActiveDownloads()
  const { user } = useAuth()
  const [selectedLanguage, setSelectedLanguage] = useState<string>('')
  const [selectedQuality, setSelectedQuality] = useState<string>('')
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [downloadType, setDownloadType] = useState<'full_season' | 'episode'>('full_season')
  const [selectedEpisodes, setSelectedEpisodes] = useState<number[]>([])
  const [currentStep, setCurrentStep] = useState<number>(1)
  
  // États pour le suivi de progression
  const [isChecking, setIsChecking] = useState(false)
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([])
  const [currentProgress, setCurrentProgress] = useState(0)
  const [sessionId, setSessionId] = useState<string>('')
  const [verificationResults, setVerificationResults] = useState<any>(null)
  const [showProgress, setShowProgress] = useState(false)
  

  // Extraire les options disponibles selon le type
  const getAvailableOptions = () => {
    if (!item.details) return { languages: [], qualities: [], seasons: [] }

    if (result.type === 'films') {
      const details = item.details as { [language: string]: { [quality: string]: { link: string } } }
      const languages = Object.keys(details)
      const qualities = languages.length > 0 ? Object.keys(details[languages[0]]) : []
      
      return {
        languages,
        qualities,
        seasons: []
      }
    } else {
      const details = item.details as { [season: string]: { episodes?: number; versions: { [language: string]: { [quality: string]: { link: string; fileSize?: string } } } } }
      const seasons = Object.keys(details)
      const firstSeason = seasons[0]
      const languages = firstSeason ? Object.keys(details[firstSeason].versions) : []
      const qualities = languages.length > 0 ? Object.keys(details[firstSeason].versions[languages[0]]) : []
      
      return {
        languages,
        qualities,
        seasons
      }
    }
  }

  const { languages, qualities, seasons } = getAvailableOptions()

  const getFileSize = (language: string, quality: string, season?: string) => {
    if (!item.details || result.type === 'films') return null

    const details = item.details as { [season: string]: { versions: { [language: string]: { [quality: string]: { fileSize?: string } } } } }
    if (season) {
      return details[season]?.versions[language]?.[quality]?.fileSize
    }
    return null
  }

  const getEpisodesCount = (season: string) => {
    if (!item.details || result.type === 'films') return null
    
    const details = item.details as { [season: string]: { episodes?: number } }
    return details[season]?.episodes
  }

  /** Liste unifiée des éléments vérifiés (film ou épisodes) pour affichage et bouton */
  const getVerifiedItemsList = (): Array<{ key: string; label: string; available: boolean; host?: string | null; error?: string }> => {
    if (!verificationResults?.availability) return []
    const entries = Object.entries(verificationResults.availability) as [string, { available: boolean; host?: string | null; error?: string }][]
    return entries
      .map(([key, data]) => ({
        key,
        label: key === 'film' ? 'Film' : `Épisode ${key.replace('episode_', '')}`,
        available: data.available,
        host: data.host,
        error: data.error
      }))
      .sort((a, b) => {
        if (a.key === 'film') return -1
        if (b.key === 'film') return 1
        const numA = parseInt(a.key.replace('episode_', ''), 10)
        const numB = parseInt(b.key.replace('episode_', ''), 10)
        return numA - numB
      })
  }

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLanguage('')
      setSelectedQuality('')
      setSelectedSeason('')
      setDownloadType('full_season')
      setSelectedEpisodes([])
      setCurrentStep(1)
      setIsChecking(false)
      setProgressUpdates([])
          setCurrentProgress(0)
    setSessionId('')
    setVerificationResults(null)
    setShowProgress(false)
    }
  }, [isOpen])

  // Auto-select first available options
  useEffect(() => {
    if (result.type === 'films') {
      if (languages.length > 0 && !selectedLanguage) {
        setSelectedLanguage(languages[0])
      }
      if (selectedLanguage && qualities.length > 0 && !selectedQuality) {
        setSelectedQuality(qualities[0])
      }
    } else {
      if (seasons.length > 0 && !selectedSeason) {
        setSelectedSeason(seasons[0])
      }
      if (selectedSeason && languages.length > 0 && !selectedLanguage) {
        setSelectedLanguage(languages[0])
      }
      if (selectedSeason && selectedLanguage && qualities.length > 0 && !selectedQuality) {
        setSelectedQuality(qualities[0])
      }
    }
  }, [result.type, languages, qualities, seasons, selectedSeason, selectedLanguage, selectedQuality])

  // Reset quality when season or language changes
  useEffect(() => {
    if (result.type !== 'films' && selectedSeason && selectedLanguage) {
      const details = item.details as { [season: string]: { versions: { [language: string]: { [quality: string]: { link: string; fileSize?: string } } } } }
      const availableQualities = Object.keys(details[selectedSeason]?.versions[selectedLanguage] || {})
      if (availableQualities.length > 0) {
        setSelectedQuality(availableQualities[0])
      } else {
        setSelectedQuality('')
      }
    }
  }, [selectedSeason, selectedLanguage, item.details, result.type])

  // WebSocket connection for progress tracking
  useEffect(() => {
    if (isChecking && sessionId) {
      // Connect to WebSocket
      const socketInstance = (window as any).io(API_CONFIG.SOCKET_URL)
      // setSocket(socketInstance) // Supprimé car non utilisé

      // Listen for progress updates
      socketInstance.on(`download-progress-${sessionId}`, (update: ProgressUpdate) => {
        setProgressUpdates(prev => [...prev, update])
        if (update.progress !== undefined) {
          setCurrentProgress(update.progress)
        }
        
        if (update.type === 'complete') {
          setIsChecking(false)
          setVerificationResults(update.data)
        } else if (update.type === 'error') {
          setIsChecking(false)
        }
      })

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [isChecking, sessionId])

  // Auto-scroll to top when new messages arrive
  useEffect(() => {
    if (progressUpdates.length > 0) {
      const progressContainer = document.querySelector('.progress-updates-container')
      if (progressContainer) {
        // Faire défiler vers le haut pour voir les nouveaux messages
        progressContainer.scrollTop = 0
      }
    }
  }, [progressUpdates])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'films':
        return <FiFilm className="h-5 w-5" />
      case 'series':
        return <FiTv className="h-5 w-5" />
      case 'mangas':
        return <FiPlay className="h-5 w-5" />
      default:
        return <FiFilm className="h-5 w-5" />
    }
  }

  const handleNext = () => {
    if (currentStep < getMaxSteps()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getMaxSteps = () => {
    if (result.type === 'films') {
      return 2 // Langue et qualité seulement
    } else {
      // Saison, Langue, Qualité, Type de téléchargement, Épisode (si applicable)
      return downloadType === 'episode' ? 5 : 4
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1: // Saison (si applicable) ou Langue (pour films)
        if (result.type === 'films') {
          return selectedLanguage !== ''
        }
        return selectedSeason !== ''
      case 2: // Langue (si applicable) ou Qualité (pour films)
        if (result.type === 'films') {
          return selectedQuality !== ''
        }
        return selectedLanguage !== ''
      case 3: // Qualité (si applicable) ou Type de téléchargement (pour films)
        if (result.type === 'films') {
          return true // Pas d'étape 3 pour les films
        }
        return selectedQuality !== ''
      case 4: // Type de téléchargement
        return true
      case 5: // Épisode (si applicable)
        return selectedEpisodes.length > 0
      default:
        return false
    }
  }

  /**
   * Lancer immédiatement le téléchargement (1 fichier ou ZIP) et créer l'entrée d'historique.
   * Le téléchargement actif s'affiche dans le panel uniquement ; pas de redirection.
   */
  const startClientDownload = async () => {
    try {
      const downloadItems: { url: string; filename: string; fileSize?: number }[] = []

      if (result.type === 'films') {
        const filmResult = verificationResults?.availability?.film
        if (filmResult?.available && filmResult.link) {
          downloadItems.push({
            url: filmResult.link,
            filename: clientDownloadService.formatFilmFilename(item.title, selectedLanguage, selectedQuality),
            fileSize: filmResult.filesize ? parseInt(filmResult.filesize) : undefined
          })
        }
      } else {
        if (selectedEpisodes.length > 0) {
          for (const episode of selectedEpisodes) {
            const episodeKey = `episode_${episode}`
            const episodeResult = verificationResults?.availability?.[episodeKey]
            if (episodeResult?.available && episodeResult.link) {
              const filename = clientDownloadService.formatSingleEpisodeFilename(
                item.title,
                selectedSeason.replace('SAISON_', ''),
                episode.toString(),
                selectedLanguage,
                selectedQuality
              )
              downloadItems.push({
                url: episodeResult.link,
                filename,
                fileSize: episodeResult.filesize ? parseInt(episodeResult.filesize) : undefined
              })
            }
          }
        } else {
          Object.entries(verificationResults?.availability || {}).forEach(([key, episode]: [string, any]) => {
            if (key.startsWith('episode_') && episode.available && episode.link) {
              const episodeNumber = key.replace('episode_', '')
              const filename = clientDownloadService.formatSingleEpisodeFilename(
                item.title,
                selectedSeason.replace('SAISON_', ''),
                episodeNumber,
                selectedLanguage,
                selectedQuality
              )
              downloadItems.push({
                url: episode.link,
                filename,
                fileSize: episode.filesize ? parseInt(episode.filesize) : undefined
              })
            }
          })
        }
      }

      if (downloadItems.length === 0) {
        throw new Error('Aucun élément disponible pour le téléchargement')
      }

      const totalFileSize = downloadItems.reduce((t, i) => t + (i.fileSize || 0), 0)
      const created = await downloadHistoryService.createDownloadHistory({
        title: item.title,
        type: result.type,
        language: selectedLanguage,
        quality: selectedQuality,
        season: selectedSeason.replace('SAISON_', ''),
        episodes: selectedEpisodes.map(ep => ep.toString()),
        files: downloadItems
      })

      if (downloadItems.length === 1) {
        startDownload(downloadItems[0].url, downloadItems[0].filename, {
          historyId: created._id,
          fileSize: totalFileSize || undefined
        })
      } else {
        const zipFilename = clientDownloadService.buildZipFilename(
          item.title,
          result.type,
          result.type === 'films' ? undefined : selectedSeason.replace('SAISON_', '')
        )
        startZipDownload(
          downloadItems.map(f => ({ url: f.url, filename: f.filename, fileSize: f.fileSize })),
          zipFilename,
          { historyId: created._id, fileSize: totalFileSize || undefined }
        )
      }

      onClose()
    } catch (error) {
      log.error('Error starting download:', error)
    }
  }

  /**
   * Envoyer les téléchargements vérifiés vers Aria2 (NAS utilisateur).
   */
  const startNasDownload = async () => {
    try {
      const downloadItems: { url: string; filename: string; fileSize?: number }[] = []

      if (result.type === 'films') {
        const filmResult = verificationResults?.availability?.film
        if (filmResult?.available && filmResult.link) {
          downloadItems.push({
            url: filmResult.link,
            filename: clientDownloadService.formatFilmFilename(item.title, selectedLanguage, selectedQuality),
            fileSize: filmResult.filesize ? parseInt(filmResult.filesize) : undefined
          })
        }
      } else {
        if (selectedEpisodes.length > 0) {
          for (const episode of selectedEpisodes) {
            const episodeKey = `episode_${episode}`
            const episodeResult = verificationResults?.availability?.[episodeKey]
            if (episodeResult?.available && episodeResult.link) {
              const filename = clientDownloadService.formatSingleEpisodeFilename(
                item.title,
                selectedSeason.replace('SAISON_', ''),
                episode.toString(),
                selectedLanguage,
                selectedQuality
              )
              downloadItems.push({
                url: episodeResult.link,
                filename,
                fileSize: episodeResult.filesize ? parseInt(episodeResult.filesize) : undefined
              })
            }
          }
        } else {
          Object.entries(verificationResults?.availability || {}).forEach(([key, episode]: [string, any]) => {
            if (key.startsWith('episode_') && episode.available && episode.link) {
              const episodeNumber = key.replace('episode_', '')
              const filename = clientDownloadService.formatSingleEpisodeFilename(
                item.title,
                selectedSeason.replace('SAISON_', ''),
                episodeNumber,
                selectedLanguage,
                selectedQuality
              )
              downloadItems.push({
                url: episode.link,
                filename,
                fileSize: episode.filesize ? parseInt(episode.filesize) : undefined
              })
            }
          })
        }
      }

      if (downloadItems.length === 0) {
        throw new Error('Aucun élément disponible pour l\'envoi vers le NAS')
      }

      const year = item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : undefined

      await apiService.sendToAria2({
        type: result.type,
        title: item.title,
        year: Number.isFinite(year as number) ? year : undefined,
        season: result.type === 'films' ? undefined : selectedSeason.replace('SAISON_', ''),
        items: downloadItems.map(d => ({
          url: d.url,
          filename: d.filename
        }))
      })

      await refetchSessions()
      onClose()
    } catch (error) {
      log.error('Error sending to NAS:', error)
      const err = error as Error & { code?: string }
      const isAria2Unreachable = err?.code === 'ARIA2_ERROR'
      const displayMessage = isAria2Unreachable
        ? "Votre NAS n'a pas l'air d'être disponible car Aria2 ne répond pas."
        : (error instanceof Error ? error.message : String(error))
      setProgressUpdates(prev => [
        ...prev,
        {
          type: 'error',
          message: displayMessage
        }
      ])
    }
  }

  const handleClose = async () => {
    // Si une vérification est en cours, l'annuler
    if (isChecking && sessionId) {
      try {
        await apiService.cancelDownloadCheck(sessionId)
      } catch (error) {
        log.error('Error cancelling download check:', error)
      }
    }
    onClose()
  }

  const handleConfirm = async () => {
    let downloadLink: string | undefined
    
    if (result.type === 'films') {
      // Structure pour les films: details[language][quality].link
      if (item.details && selectedLanguage && selectedQuality) {
        const filmDetails = item.details as { [language: string]: { [quality: string]: { link: string } } }
        downloadLink = filmDetails[selectedLanguage]?.[selectedQuality]?.link
      }
    } else {
      // Structure pour les séries/animes: details[season].versions[language][quality].link
      if (item.details && selectedSeason && selectedLanguage && selectedQuality) {
        const seriesDetails = item.details as { [season: string]: { versions: { [language: string]: { [quality: string]: { link: string; fileSize?: string } } } } }
        downloadLink = seriesDetails[selectedSeason]?.versions?.[selectedLanguage]?.[selectedQuality]?.link
      }
    }

    if (!downloadLink) {
      return
    }

    // Générer un ID de session unique
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setSessionId(newSessionId)
    setIsChecking(true)
    setShowProgress(true)
    setProgressUpdates([])
    setCurrentProgress(0)

    try {
      // Appeler l'API pour démarrer la vérification
      await apiService.checkDownloadAvailability({
        downloadLink,
        type: result.type,
        episodes: selectedEpisodes.map(ep => ep.toString()),
        sessionId: newSessionId
      })

      // L'API va répondre immédiatement et le processus continuera en arrière-plan
      // Les mises à jour arriveront via WebSocket
    } catch (error) {
      setIsChecking(false)
      setProgressUpdates(prev => [...prev, {
        type: 'error',
        message: `Erreur lors du démarrage de la vérification: ${error}`
      }])
    }
  }

  const renderProgressStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          {currentProgress === 100 ? (
            <FiCheckCircle className="h-12 w-12 text-green-500" />
          ) : currentProgress > 0 ? (
            <FiLoader className="h-12 w-12 text-blue-500 animate-spin" />
          ) : (
            <FiLoader className="h-12 w-12 text-gray-500 animate-spin" />
          )}
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">
          {currentProgress === 100 ? 'Vérification terminée !' : 'Vérification de disponibilité en cours...'}
        </h3>
        
        <p className="text-gray-400 mb-4">
          {currentProgress === 100 
            ? ''
            : (
              <>
                Nous vérifions les liens et testons leur disponibilité avec AllDebrid.
                <br />
                ⚠️Suite à un problème récent de Alldebrid, le débridage des liens peuvent être un petit peu plus long..
              </>
            )
          }
        </p>
      </div>

      {/* Progress bar - only show during verification */}
      {currentProgress < 100 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Progression</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <div className="w-full h-3 progress-track">
            <div
              className="progress-fill h-full"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress updates - only show during verification */}
      {currentProgress < 100 && (
        <div className="space-y-2 max-h-48 overflow-y-auto progress-updates-container">
          {progressUpdates.slice().reverse().map((update, index) => (
            <div
              key={index}
              className={`flex items-start space-x-2 p-2 rounded-lg ${
                update.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                update.type === 'complete' ? 'bg-green-500/10 border border-green-500/20' :
                'bg-blue-500/10 border border-blue-500/20'
              }`}
            >
              {update.type === 'error' ? (
                <FiAlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              ) : update.type === 'complete' ? (
                <FiCheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <FiLoader className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0 animate-spin" />
              )}
              <span className="text-sm text-gray-300">{update.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Résumé des résultats : liste unifiée (film, 1 épisode, N épisodes ou saison) */}
      {verificationResults && (() => {
        const items = getVerifiedItemsList()
        const availableCount = items.filter(i => i.available).length
        return (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className={`space-y-2 ${items.length > 5 ? 'max-h-64 overflow-y-auto pr-2' : ''}`}>
              {items.map(({ key, label, available, host, error }) => (
                <div key={key} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="text-gray-300 font-medium">{label}</span>
                  {available ? (
                    <span className="text-green-400 text-sm">✅ {host}</span>
                  ) : (
                    <span className="text-red-400 text-sm" title={error}>❌ Non disponible</span>
                  )}
                </div>
              ))}
            </div>
            {items.length > 1 && (
              <div className="mt-3 pt-3 border-t border-brand-border flex justify-between text-sm">
                <span className="text-gray-400">Disponibles :</span>
                <span className="text-green-400 font-medium">{availableCount} / {items.length}</span>
              </div>
            )}
          </div>
        )
      })()}

      {/* Erreurs survenues après la vérification (ex. envoi vers NAS) */}
      {currentProgress === 100 && progressUpdates.some(u => u.type === 'error') && (
        <div className="space-y-2">
          {progressUpdates.filter(u => u.type === 'error').map((update, index) => (
            <div
              key={index}
              className="flex items-start space-x-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
            >
              <FiAlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-200">{update.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {currentProgress === 100 ? (
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Fermer
          </button>
          {(() => {
            const list = getVerifiedItemsList()
            const availableCount = list.filter(i => i.available).length
            if (availableCount === 0) return null
            return (
              <div className="flex flex-1 space-x-3">
                <button
                  onClick={async () => {
                    try {
                      await startClientDownload()
                    } catch (error) {
                      log.error('Error starting download:', error)
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  {availableCount === 1 ? 'Télécharger' : 'Télécharger (ZIP)'}
                </button>
                {user?.aria2Enabled && (
                  <button
                    onClick={async () => {
                      try {
                        await startNasDownload()
                      } catch (error) {
                        log.error('Error sending to NAS:', error)
                      }
                    }}
                    className="btn-secondary flex-1"
                  >
                    Télécharger vers NAS
                  </button>
                )}
              </div>
            )
          })()}
        </div>
      ) : currentProgress > 0 && currentProgress < 100 ? (
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              try {
                if (sessionId) {
                  await apiService.cancelDownloadCheck(sessionId)
                }
                setIsChecking(false)
                setShowProgress(false)
                setCurrentProgress(0)
                setProgressUpdates([])
                onClose()
              } catch (error) {
                log.error('Error cancelling download check:', error)
                // Fermer quand même le modal
                onClose()
              }
            }}
            className="btn-secondary flex-1"
          >
            Annuler
          </button>
        </div>
      ) : null}
    </div>
  )

  const renderSeasonStep = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-lg font-medium text-white">
        <FiCalendar className="h-5 w-5 text-green-400" />
        <span>Choisissez la saison</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {seasons.map((season) => (
          <button
            key={season}
            onClick={() => setSelectedSeason(season)}
            className={`p-3 rounded-lg border-2 transition-colors ${
              selectedSeason === season
                ? 'border-green-500 bg-green-500/20 text-green-400'
                : 'border-brand-border bg-brand-surface text-gray-300 hover:border-brand-primary'
            }`}
          >
            <div className="text-center">
              <div className="font-medium">{season.replace('SAISON_', 'Saison ')}</div>
              {getEpisodesCount(season) && (
                <div className="text-sm opacity-75">{getEpisodesCount(season)} épisodes</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderLanguageStep = () => {
    const availableLanguages = result.type === 'films' ? languages : 
      (selectedSeason ? Object.keys((item.details as any)[selectedSeason]?.versions || {}) : languages)

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-lg font-medium text-white">
          <FiGlobe className="h-5 w-5 text-blue-400" />
          <span>Choisissez la langue</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {availableLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                selectedLanguage === lang
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-brand-border bg-brand-surface text-gray-300 hover:border-brand-primary'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderQualityStep = () => {
    const availableQualities = result.type === 'films' ? 
      (selectedLanguage ? Object.keys((item.details as any)[selectedLanguage] || {}) : qualities) :
      (selectedSeason && selectedLanguage ? Object.keys((item.details as any)[selectedSeason]?.versions[selectedLanguage] || {}) : qualities)
    const sortedQualities = sortQualities([...availableQualities])

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-lg font-medium text-white">
          <FiStar className="h-5 w-5 text-yellow-400" />
          <span>Choisissez la qualité</span>
        </div>
        
        {sortedQualities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Aucune qualité disponible pour cette combinaison saison/langue</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedQualities.map((quality) => {
              const fileSize = getFileSize(selectedLanguage, quality, selectedSeason)
              return (
                <button
                  key={quality}
                  onClick={() => setSelectedQuality(quality)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedQuality === quality
                      ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                      : 'border-brand-border bg-brand-surface text-gray-300 hover:border-brand-primary'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-medium">
                      {quality}
                      {fileSize && <span className="font-normal text-gray-400"> ({fileSize})</span>}
                      <span className="ml-1 text-yellow-400/80 text-sm">{getQualityBar(quality)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderDownloadTypeStep = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-lg font-medium text-white">
        <FiDownload className="h-5 w-5 text-purple-400" />
        <span>Type de téléchargement</span>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={() => setDownloadType('full_season')}
          className={`w-full p-4 rounded-lg border-2 transition-colors ${
            downloadType === 'full_season'
              ? 'border-purple-500 bg-purple-500/20 text-purple-400'
              : 'border-brand-border bg-brand-surface text-gray-300 hover:border-brand-primary'
          }`}
        >
          <div className="text-center">
            <div className="font-medium">Saison complète</div>
            <div className="text-sm opacity-75">Télécharger tous les épisodes de la saison {selectedSeason.replace('SAISON_', '')}</div>
          </div>
        </button>
        
        <button
          onClick={() => setDownloadType('episode')}
          className={`w-full p-4 rounded-lg border-2 transition-colors ${
            downloadType === 'episode'
              ? 'border-purple-500 bg-purple-500/20 text-purple-400'
              : 'border-brand-border bg-brand-surface text-gray-300 hover:border-brand-primary'
          }`}
        >
          <div className="text-center">
            <div className="font-medium">Épisode(s) spécifique(s)</div>
            <div className="text-sm opacity-75">Choisir un/des épisode(s) particulier(s)</div>
          </div>
        </button>
      </div>
    </div>
  )

  const renderEpisodeStep = () => {
    const episodeCount = getEpisodesCount(selectedSeason) || 12 // Default to 12 if not specified
    
    const toggleEpisode = (episode: number) => {
      setSelectedEpisodes(prev => {
        if (prev.includes(episode)) {
          return prev.filter(ep => ep !== episode)
        } else {
          return [...prev, episode].sort((a, b) => a - b)
        }
      })
    }

    const selectAllEpisodes = () => {
      setSelectedEpisodes(Array.from({ length: episodeCount }, (_, i) => i + 1))
    }

    const clearSelection = () => {
      setSelectedEpisodes([])
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-lg font-medium text-white">
            <FiPlay className="h-5 w-5 text-orange-400" />
            <span>Choisissez un/des épisode(s)</span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={selectAllEpisodes}
              className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Tout sélectionner
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-xs bg-brand-surface hover:bg-brand-surface-hover text-white rounded transition-colors border border-brand-border"
            >
              Effacer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
          {Array.from({ length: episodeCount }, (_, i) => i + 1).map((episode) => (
            <button
              key={episode}
              onClick={() => toggleEpisode(episode)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                selectedEpisodes.includes(episode)
                  ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                  : 'border-brand-border bg-brand-surface text-gray-300 hover:border-brand-primary'
              }`}
            >
              Épisode {episode.toString().padStart(2, '0')}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderCurrentStep = () => {
    // Si on est en train de vérifier ou si on a des résultats, afficher l'étape de progression
    if (showProgress) {
      return renderProgressStep()
    }

    if (result.type === 'films') {
      // Pour les films : Langue -> Qualité
      switch (currentStep) {
        case 1:
          return renderLanguageStep()
        case 2:
          return renderQualityStep()
        default:
          return renderLanguageStep()
      }
    } else {
      // Pour les séries/animes : Saison -> Langue -> Qualité -> Type de téléchargement
      switch (currentStep) {
        case 1:
          return renderSeasonStep()
        case 2:
          return renderLanguageStep()
        case 3:
          return renderQualityStep()
        case 4:
          return renderDownloadTypeStep()
        case 5:
          return renderEpisodeStep()
        default:
          return renderSeasonStep()
      }
    }
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="panel-glass p-3 sm:p-4 md:p-6 w-full max-w-xs sm:max-w-lg md:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            {getTypeIcon(result.type)}
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white truncate">{item.title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
          >
            <FiX className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
          </button>
        </div>

        {/* Progress indicator - only show if not in progress step */}
        {!showProgress && (
          <div className="mb-4 sm:mb-5 md:mb-6">
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-400 mb-2">
              <span>Étape {currentStep} sur {getMaxSteps()}</span>
              <span>{Math.round((currentStep / getMaxSteps()) * 100)}%</span>
            </div>
            <div className="w-full h-1.5 sm:h-2 progress-track">
              <div
                className="progress-fill h-full"
                style={{ width: `${(currentStep / getMaxSteps()) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          {renderCurrentStep()}
        </div>

        {/* Navigation - only show if not in progress step */}
        {!showProgress && (
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="btn-secondary flex-1 order-2 sm:order-1"
              >
                Précédent
              </button>
            )}
            
            {currentStep < getMaxSteps() ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              >
                Suivant
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!isStepValid()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
              >
                Vérifier la disponibilité
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

export default DownloadModal
