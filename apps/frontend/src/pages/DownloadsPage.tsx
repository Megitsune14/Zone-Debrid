import { useState, useEffect, useRef } from 'react'
import { FiDownload, FiLoader, FiFilm, FiTv, FiPlay, FiTrash2, FiCheckCircle, FiAlertCircle, FiX } from 'react-icons/fi'
import downloadHistoryService, { type DownloadHistoryItem } from '../services/downloadHistoryService'
import { useActiveDownloads } from '../contexts/ActiveDownloadContext'

/** Statuts affichés sur la page : uniquement l'historique (terminé / annulé / erreur). */
const HISTORY_STATUSES = ['completed', 'cancelled', 'error'] as const
type StatusFilter = 'all' | 'completed' | 'cancelled' | 'error'

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'completed', label: 'Téléchargé' },
  { value: 'cancelled', label: 'Annulé' },
  { value: 'error', label: 'Erreur' }
]

const DownloadsPage = () => {
  const { downloads: activeDownloads } = useActiveDownloads()
  const [history, setHistory] = useState<DownloadHistoryItem[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prevHasActiveDownloading = useRef(false)

  /** Ne montrer que l'historique (pas les téléchargements en cours). */
  const historyOnly = history.filter((item) =>
    HISTORY_STATUSES.includes(item.status as (typeof HISTORY_STATUSES)[number])
  )
  const filteredHistory = statusFilter === 'all'
    ? historyOnly
    : historyOnly.filter((item) => item.status === statusFilter)

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await downloadHistoryService.getDownloadHistory({ limit: 100 })
      setHistory(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const hasActiveDownloading = activeDownloads.some((d) => d.status === 'downloading')

  /** Quand un téléchargement se termine, rafraîchir l'historique une seule fois pour afficher la nouvelle entrée (évite le polling et les re-renders). */
  useEffect(() => {
    if (prevHasActiveDownloading.current && !hasActiveDownloading) {
      loadHistory()
    }
    prevHasActiveDownloading.current = hasActiveDownloading
  }, [hasActiveDownloading])

  const handleClearHistory = async () => {
    try {
      await downloadHistoryService.clearDownloadHistory()
      await loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'films': return <FiFilm className="h-5 w-5 text-blue-400" />
      case 'series': return <FiTv className="h-5 w-5 text-green-400" />
      case 'mangas': return <FiPlay className="h-5 w-5 text-orange-400" />
      default: return <FiDownload className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <FiCheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <FiAlertCircle className="h-4 w-4 text-red-500" />
      case 'cancelled': return <FiX className="h-4 w-4 text-orange-500" />
      default: return <FiDownload className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed': return 'Téléchargé'
      case 'error': return 'Erreur'
      case 'cancelled': return 'Annulé'
      default: return status
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} Mo`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <FiLoader className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <FiDownload className="h-8 w-8 text-brand-primary" />
          Téléchargements
        </h1>
        {historyOnly.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="btn-secondary flex items-center gap-2 text-sm text-gray-400 hover:text-red-400"
          >
            <FiTrash2 className="h-4 w-4" />
            Effacer l’historique
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {historyOnly.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400">Statut :</span>
          {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === value
                  ? 'bg-brand-primary text-white'
                  : 'bg-brand-surface text-gray-400 hover:text-white border border-brand-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-16 panel-glass">
          <FiDownload className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Aucun téléchargement</p>
          <p className="text-gray-500 text-sm mt-2">
            L’historique des téléchargements terminés apparaîtra ici.
          </p>
        </div>
      ) : historyOnly.length === 0 ? (
        <div className="text-center py-16 panel-glass">
          <FiLoader className="h-12 w-12 text-brand-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Téléchargement(s) en cours</p>
          <p className="text-gray-500 text-sm mt-2">
            Les téléchargements en cours s’affichent dans le panel ci-dessus.
          </p>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-16 panel-glass">
          <p className="text-gray-400 text-lg">Aucun téléchargement pour ce filtre</p>
          <p className="text-gray-500 text-sm mt-2">
            Choisissez un autre statut.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div
              key={item._id}
              className="panel-glass p-4 sm:p-5"
            >
              <div className="flex items-start gap-3 min-w-0">
                {getTypeIcon(item.type)}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white truncate">{item.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-400">
                    <span className="capitalize">{item.type}</span>
                    {item.language && <span>• {item.language}</span>}
                    {item.quality && <span>• {item.quality}</span>}
                    {item.season && <span>• Saison {item.season}</span>}
                    {item.episodes && item.episodes.length > 0 && (
                      <span>• {item.episodes.length} épisode(s)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                    {getStatusIcon(item.status)}
                    <span>{getStatusLabel(item.status)}</span>
                    <span>• {formatDate(item.startTime)}</span>
                    {item.fileSize ? (
                      <span>• {formatFileSize(item.fileSize)}</span>
                    ) : null}
                    {item.errorMessage && (
                      <span className="text-red-400" title={item.errorMessage}>• {item.errorMessage}</span>
                    )}
                  </div>
                  {item.files && item.files.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.files.length} fichier{item.files.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DownloadsPage
