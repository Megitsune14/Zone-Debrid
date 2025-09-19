import { useState, useEffect } from 'react'
import { FiFilm, FiTv, FiPlay, FiGlobe, FiStar, FiDownload, FiX, FiCalendar, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'
import type { SearchResult, SearchItem } from '../types'
import apiService from '../services/api'
import clientDownloadService from '../services/clientDownloadService'
import { useDownloadContext } from '../contexts/DownloadContext'
import { API_CONFIG } from '../config/api'

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
 * Gère la vérification de disponibilité et crée le téléchargement dans le DownloadPanel
 */
const DownloadModal = ({ result, item, isOpen, onClose }: DownloadModalProps) => {
  const { addDownload } = useDownloadContext()
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
   * Créer le téléchargement dans le DownloadPanel
   */
  const startClientDownload = async () => {
    try {
      // Préparer les éléments à télécharger
      const downloadItems: any[] = []
      
      if (result.type === 'films') {
        // Film unique
        const filmResult = verificationResults?.availability?.film
        if (filmResult?.available && filmResult.link) {
          downloadItems.push({
            url: filmResult.link,
            filename: clientDownloadService.formatFilmFilename(item.title, selectedLanguage, selectedQuality),
            filesize: filmResult.filesize ? parseInt(filmResult.filesize) : undefined
          })
        }
      } else {
        // Séries/Animes
        if (selectedEpisodes.length > 0) {
          // Épisodes spécifiques
          for (const episode of selectedEpisodes) {
            const episodeKey = `episode_${episode}`
            const episodeResult = verificationResults?.availability?.[episodeKey]
            if (episodeResult?.available && episodeResult.link) {
              downloadItems.push({
                url: episodeResult.link,
                filename: '',
                episodeNumber: episode.toString(),
                filesize: episodeResult.filesize ? parseInt(episodeResult.filesize) : undefined
              })
            }
          }
        } else {
          // Tous les épisodes disponibles
          Object.entries(verificationResults?.availability || {}).forEach(([key, episode]: [string, any]) => {
            if (key.startsWith('episode_') && episode.available && episode.link) {
              const episodeNumber = key.replace('episode_', '')
              downloadItems.push({
                url: episode.link,
                filename: '',
                episodeNumber,
                filesize: episode.filesize ? parseInt(episode.filesize) : undefined
              })
            }
          })
        }
      }

      if (downloadItems.length === 0) {
        throw new Error('Aucun élément disponible pour le téléchargement')
      }

      // Préparer les options de téléchargement
      const downloadOptions = {
        type: result.type,
        title: item.title,
        season: selectedSeason.replace('SAISON_', ''),
        language: selectedLanguage,
        quality: selectedQuality,
        episodes: selectedEpisodes.map(ep => ep.toString()),
        items: downloadItems
      }

      // Créer le téléchargement dans le panel et lancer le téléchargement
      await addDownload({
        title: item.title,
        type: result.type,
        progress: null,
        cleared: false,
        zipFilename: clientDownloadService.shouldCreateZip(downloadItems) 
          ? clientDownloadService.formatZipFilename(downloadOptions) 
          : undefined,
        language: selectedLanguage,
        quality: selectedQuality,
        season: selectedSeason.replace('SAISON_', ''),
        episodes: selectedEpisodes.map(ep => ep.toString()),
        fileSize: downloadItems.reduce((total, item) => total + (item.filesize || 0), 0)
      }, downloadOptions)

      // Fermer le modal immédiatement après avoir lancé le téléchargement
      onClose()
      
    } catch (error) {
      console.error('Error during client download:', error)
      // L'erreur sera gérée par le DownloadPanel
    }
  }

  const handleClose = async () => {
    // Si une vérification est en cours, l'annuler
    if (isChecking && sessionId) {
      try {
        await apiService.cancelDownloadCheck(sessionId)
      } catch (error) {
        console.error('Error cancelling download check:', error)
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
            : 'Nous vérifions les liens et testons leur disponibilité avec AllDebrid'
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
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
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

      {/* Résumé des résultats */}
      {verificationResults && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          
          {result.type === 'films' ? (
            <div className="space-y-2">
              {verificationResults.availability.film?.available ? (
                <div className="text-green-400">
                  <p>✅ Disponible sur <span className="font-medium">{verificationResults.availability.film.host}</span></p>
                  <p className="text-sm text-gray-400">Lien débridé prêt pour le téléchargement</p>
                </div>
              ) : (
                <div className="text-red-400">
                  <p>❌ Aucun hébergeur disponible</p>
                  <p className="text-sm text-gray-400">{verificationResults.availability.film?.error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              
              {selectedEpisodes.length > 0 ? (
                // Épisodes sélectionnés
                <div className="space-y-3">
                  {selectedEpisodes.map(episode => (
                    <div key={episode}>
                      <p className="text-gray-300 mb-2">
                        <span className="font-medium">Épisode {episode} :</span>
                      </p>
                      {verificationResults.availability[`episode_${episode}`]?.available ? (
                        <div className="text-green-400">
                          <p>✅ Disponible sur <span className="font-medium">{verificationResults.availability[`episode_${episode}`].host}</span></p>
                          <p className="text-sm text-gray-400">Lien débridé prêt pour le téléchargement</p>
                        </div>
                      ) : (
                        <div className="text-red-400">
                          <p>❌ Aucun hébergeur disponible</p>
                          <p className="text-sm text-gray-400">{verificationResults.availability[`episode_${episode}`]?.error}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Saison complète
                <div>
                  <p className="text-gray-300 mb-2">
                    <span className="font-medium">Saison complète :</span>
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1 pr-2">
                    {Object.entries(verificationResults.availability).map(([episodeKey, episodeData]: [string, any]) => {
                      const episodeNum = episodeKey.replace('episode_', '')
                      return (
                        <div key={episodeKey} className="flex items-center justify-between py-1">
                          <span className="text-gray-300">Épisode {episodeNum} :</span>
                          {episodeData.available ? (
                            <span className="text-green-400 text-sm">
                              ✅ {episodeData.host}
                            </span>
                          ) : (
                            <span className="text-red-400 text-sm">
                              ❌ Non disponible
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Statistiques */}
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Épisodes disponibles :</span>
                      <span className="text-green-400 font-medium">
                        {Object.values(verificationResults.availability).filter((ep: any) => ep.available).length} / {Object.keys(verificationResults.availability).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {currentProgress === 100 ? (
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Fermer
          </button>
          <button
            onClick={async () => {
              try {
                // Lancer le téléchargement côté client
                await startClientDownload()
              } catch (error) {
                console.error('Error starting download:', error)
                // Ici vous pourriez afficher une notification d'erreur
              }
            }}
            className="btn-primary flex-1"
            disabled={!verificationResults}
          >
            {result.type !== 'films' && selectedEpisodes.length === 0 ? 
              `Télécharger ${Object.values(verificationResults?.availability || {}).filter((ep: any) => ep.available).length} épisodes` : 
              'Lancer le téléchargement'
            }
          </button>
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
                console.error('Error cancelling download check:', error)
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
                : 'border-gray-600 bg-dark-700 text-gray-300 hover:border-gray-500'
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
                  : 'border-gray-600 bg-dark-700 text-gray-300 hover:border-gray-500'
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

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-lg font-medium text-white">
          <FiStar className="h-5 w-5 text-yellow-400" />
          <span>Choisissez la qualité</span>
        </div>
        
        {availableQualities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Aucune qualité disponible pour cette combinaison saison/langue</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {availableQualities.map((quality) => {
              const fileSize = getFileSize(selectedLanguage, quality, selectedSeason)
              return (
                <button
                  key={quality}
                  onClick={() => setSelectedQuality(quality)}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    selectedQuality === quality
                      ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                      : 'border-gray-600 bg-dark-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="text-center">
                    <div className="font-medium">{quality}</div>
                    {fileSize && (
                      <div className="text-sm opacity-75">{fileSize}</div>
                    )}
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
              : 'border-gray-600 bg-dark-700 text-gray-300 hover:border-gray-500'
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
              : 'border-gray-600 bg-dark-700 text-gray-300 hover:border-gray-500'
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
              className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
            >
              Effacer
            </button>
          </div>
        </div>
        
        {selectedEpisodes.length > 0 && (
          <div className="text-sm text-gray-300">
            {selectedEpisodes.length} épisode{selectedEpisodes.length > 1 ? 's' : ''} sélectionné{selectedEpisodes.length > 1 ? 's' : ''} : {selectedEpisodes.join(', ')}
          </div>
        )}
        
        <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
          {Array.from({ length: episodeCount }, (_, i) => i + 1).map((episode) => (
            <button
              key={episode}
              onClick={() => toggleEpisode(episode)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                selectedEpisodes.includes(episode)
                  ? 'border-orange-500 bg-orange-500/20 text-orange-400'
                  : 'border-gray-600 bg-dark-700 text-gray-300 hover:border-gray-500'
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            {getTypeIcon(result.type)}
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Progress indicator - only show if not in progress step */}
        {!showProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Étape {currentStep} sur {getMaxSteps()}</span>
              <span>{Math.round((currentStep / getMaxSteps()) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / getMaxSteps()) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="mb-6">
          {renderCurrentStep()}
        </div>

        {/* Navigation - only show if not in progress step */}
        {!showProgress && (
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={handlePrevious}
                className="btn-secondary flex-1"
              >
                Précédent
              </button>
            )}
            
            {currentStep < getMaxSteps() ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!isStepValid()}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
