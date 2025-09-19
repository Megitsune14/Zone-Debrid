import { useState } from 'react'
import { FiDownload, FiX, FiPause, FiPlay, FiCheckCircle, FiAlertCircle, FiChevronUp, FiChevronDown, FiTrash2 } from 'react-icons/fi'
import type { DownloadProgress } from '../services/clientDownloadService'

interface DownloadItem {
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

interface DownloadPanelProps {
    isOpen: boolean
    onToggle: () => void
    downloads: DownloadItem[]
    onCancel: (id: string) => void
    onPause: (id: string) => void
    onResume: (id: string) => void
    onRemove: (id: string) => void
    onClearHistory?: () => void
    onDeleteHistory?: () => void
}

export default function DownloadPanel({
    isOpen,
    onToggle,
    downloads,
    onCancel,
    onPause,
    onResume,
    onRemove,
    onClearHistory,
    onDeleteHistory
}: DownloadPanelProps) {
    const [isMinimized, setIsMinimized] = useState(false)
    const [showAllHistory, setShowAllHistory] = useState(false)

    const activeDownloads = downloads.filter(d => d.status === 'downloading' || d.status === 'paused')
    const completedDownloads = downloads.filter(d =>
        (d.status === 'completed' || d.status === 'error' || d.status === 'cancelled') &&
        !d.cleared
    )

    const getStatusIcon = (status: DownloadItem['status']) => {
        switch (status) {
            case 'downloading':
                return <FiDownload className="h-4 w-4 text-blue-500 animate-pulse" />
            case 'paused':
                return <FiPause className="h-4 w-4 text-yellow-500" />
            case 'completed':
                return <FiCheckCircle className="h-4 w-4 text-green-500" />
            case 'error':
                return <FiAlertCircle className="h-4 w-4 text-red-500" />
            case 'cancelled':
                return <FiX className="h-4 w-4 text-orange-500" />
            default:
                return <FiDownload className="h-4 w-4 text-gray-500" />
        }
    }

    const getStatusText = (download: DownloadItem) => {
        switch (download.status) {
            case 'downloading':
                // Déterminer si c'est un téléchargement multi-fichiers (ZIP) ou simple
                const isMultiFile = download.episodes && download.episodes.length > 1
                const isSingleEpisode = download.type !== 'films' && download.episodes && download.episodes.length === 1
                const isFilm = download.type === 'films'

                if (isFilm || isSingleEpisode) {
                    return 'Téléchargement en cours...'
                } else if (isMultiFile) {
                    return 'Création du fichier ZIP...'
                } else {
                    // Fallback basé sur la progression si les épisodes ne sont pas définis
                    if (download.progress && download.progress.total === 1) {
                        return 'Téléchargement en cours...'
                    }
                    return 'Création du fichier ZIP...'
                }
            case 'paused':
                return 'En pause'
            case 'completed':
                return 'Terminé'
            case 'error':
                return 'Erreur'
            case 'cancelled':
                return 'Annulé'
            default:
                return 'Inconnu'
        }
    }

    const getTypeText = (type: string) => {
        switch (type) {
            case 'films':
                return 'Film'
            case 'series':
                return 'Série'
            case 'mangas':
                return 'Anime'
            default:
                return type
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'films':
                return '🎬'
            case 'series':
                return '📺'
            case 'mangas':
                return '🎌'
            default:
                return '📁'
        }
    }

    const formatEpisodes = (episodes?: string[]) => {
        if (!episodes || episodes.length === 0) return ''

        if (episodes.length === 1) {
            return `Épisode ${episodes[0]}`
        }

        // Trier les épisodes numériquement
        const sortedEpisodes = episodes.map(ep => parseInt(ep)).sort((a, b) => a - b)

        // Grouper les épisodes consécutifs
        const groups: number[][] = []
        let currentGroup: number[] = [sortedEpisodes[0]]

        for (let i = 1; i < sortedEpisodes.length; i++) {
            if (sortedEpisodes[i] === sortedEpisodes[i - 1] + 1) {
                currentGroup.push(sortedEpisodes[i])
            } else {
                groups.push(currentGroup)
                currentGroup = [sortedEpisodes[i]]
            }
        }
        groups.push(currentGroup)

        // Formater les groupes
        const formattedGroups = groups.map(group => {
            if (group.length === 1) {
                return group[0].toString()
            } else {
                return `${group[0]}-${group[group.length - 1]}`
            }
        })

        return `Épisodes ${formattedGroups.join(', ')}`
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return ''
        const mb = bytes / (1024 * 1024)
        return `${mb.toFixed(1)} MB`
    }

    const formatDuration = (startTime: Date, endTime?: Date) => {
        const end = endTime || new Date()
        const duration = Math.floor((end.getTime() - startTime.getTime()) / 1000)
        const minutes = Math.floor(duration / 60)
        const seconds = duration % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    if (!isOpen) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={onToggle}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors relative"
                >
                    <FiDownload className="h-6 w-6" />
                    {activeDownloads.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {activeDownloads.length}
                        </span>
                    )}
                </button>
            </div>
        )
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 bg-dark-800 border border-gray-700 rounded-lg shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                    <FiDownload className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-semibold text-white">Téléchargements</h3>
                    {activeDownloads.length > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                            {activeDownloads.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        {isMinimized ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                    </button>
                    <button
                        onClick={onToggle}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <FiX className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="max-h-80 overflow-y-auto">
                    {/* Téléchargements actifs */}
                    {activeDownloads.length > 0 && (
                        <div className="p-4">
                            <h4 className="text-sm font-medium text-gray-300 mb-3">En cours</h4>
                            <div className="space-y-3">
                                {activeDownloads.map((download) => (
                                    <div key={download.id} className="bg-dark-700 rounded-lg p-3">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    {getStatusIcon(download.status)}
                                                    <span className="text-lg">{getTypeIcon(download.type)}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white truncate">
                                                        {download.title}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="bg-gray-600 px-2 py-0.5 rounded text-xs">
                                                                {getTypeText(download.type)}
                                                            </span>
                                                            {download.language && (
                                                                <span className="bg-blue-600 px-2 py-0.5 rounded text-xs">
                                                                    {download.language}
                                                                </span>
                                                            )}
                                                            {download.quality && (
                                                                <span className="bg-green-600 px-2 py-0.5 rounded text-xs">
                                                                    {download.quality}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {(download.season || download.episodes) && (
                                                            <div className="mt-1 text-xs text-gray-300">
                                                                {download.season && `Saison ${download.season}`}
                                                                {download.season && download.episodes && ' • '}
                                                                {formatEpisodes(download.episodes)}
                                                            </div>
                                                        )}
                                                        <div className="mt-1 text-xs text-gray-400">
                                                            {getStatusText(download)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                {download.status === 'downloading' && (
                                                    <button
                                                        onClick={() => onPause(download.id)}
                                                        className="text-gray-600 cursor-not-allowed opacity-50"
                                                        disabled
                                                    >
                                                        <FiPause className="h-4 w-4" />
                                                    </button>
                                                )}
                                                {download.status === 'paused' && (
                                                    <button
                                                        onClick={() => onResume(download.id)}
                                                        className="text-gray-600 cursor-not-allowed opacity-50"
                                                        disabled
                                                    >
                                                        <FiPlay className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onCancel(download.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <FiX className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        {download.progress && download.status === 'downloading' && (
                                            <div className="space-y-2">
                                                {download.progress.total === 1 ? (
                                                    /* Progression pour fichier unique */
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs text-gray-400">
                                                            <span>Progression</span>
                                                            <span>{download.progress.fileProgress || download.progress.percentage}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${download.progress.fileProgress || download.progress.percentage}%` }}
                                                            />
                                                        </div>
                                                        {download.progress.bytesReceived && (
                                                            <div className="text-xs text-gray-400">
                                                                {formatFileSize(download.progress.bytesReceived)}
                                                                {download.progress.bytesTotal && ` / ${formatFileSize(download.progress.bytesTotal)}`}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    /* Progression pour plusieurs fichiers (ZIP) */
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-xs text-gray-400">
                                                            <span>Progression globale</span>
                                                            <span>{download.progress.percentage}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                                            <div
                                                                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${download.progress.percentage}%` }}
                                                            />
                                                        </div>

                                                        {download.progress.fileProgress !== undefined && (
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-xs text-gray-400">
                                                                    <span>Fichier en cours</span>
                                                                    <span>{download.progress.fileProgress}%</span>
                                                                </div>
                                                                <div className="w-full bg-gray-700 rounded-full h-1">
                                                                    <div
                                                                        className="bg-gradient-to-r from-green-500 to-blue-500 h-1 rounded-full transition-all duration-300"
                                                                        style={{ width: `${download.progress.fileProgress}%` }}
                                                                    />
                                                                </div>
                                                                {download.progress.currentFileBytesReceived && (
                                                                    <div className="text-xs text-gray-400">
                                                                        {formatFileSize(download.progress.currentFileBytesReceived)}
                                                                        {download.progress.currentFileBytesTotal && ` / ${formatFileSize(download.progress.currentFileBytesTotal)}`}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                                            <span>{formatDuration(download.startTime)}</span>
                                            {download.progress?.currentFile && (
                                                <span className="truncate max-w-48">
                                                    {download.progress.currentFile}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Historique */}
                    {completedDownloads.length > 0 && (
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-gray-300">Historique</h4>
                                <div className="flex items-center space-x-2">
                                    {onClearHistory && (
                                        <button
                                            onClick={onClearHistory}
                                            className="text-xs text-gray-400 hover:text-yellow-500 transition-colors"
                                            title="Effacer l'historique (marquer comme effacé)"
                                        >
                                            <FiX className="h-3 w-3" />
                                        </button>
                                    )}
                                    {onDeleteHistory && (
                                        <button
                                            onClick={onDeleteHistory}
                                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                                            title="Effacer l'historique (marquer comme effacé)"
                                        >
                                            <FiTrash2 className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-2">
                                {(showAllHistory ? completedDownloads : completedDownloads.slice(0, 5)).map((download) => (
                                    <div key={download.id} className="bg-dark-700 rounded p-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start space-x-3 flex-1 min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    {getStatusIcon(download.status)}
                                                    <span className="text-lg">{getTypeIcon(download.type)}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-white truncate">
                                                        {download.title}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-1">
                                                        <div className="flex items-center space-x-2">
                                                            <span className="bg-gray-600 px-2 py-0.5 rounded text-xs">
                                                                {getTypeText(download.type)}
                                                            </span>
                                                            {download.language && (
                                                                <span className="bg-blue-600 px-2 py-0.5 rounded text-xs">
                                                                    {download.language}
                                                                </span>
                                                            )}
                                                            {download.quality && (
                                                                <span className="bg-green-600 px-2 py-0.5 rounded text-xs">
                                                                    {download.quality}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {(download.season || download.episodes) && (
                                                            <div className="mt-1 text-xs text-gray-300">
                                                                {download.season && `Saison ${download.season}`}
                                                                {download.season && download.episodes && ' • '}
                                                                {formatEpisodes(download.episodes)}
                                                            </div>
                                                        )}
                                                        <div className="mt-1 flex items-center space-x-2 text-xs text-gray-400">
                                                            <span>{getStatusText(download)}</span>
                                                            <span>•</span>
                                                            <span>{formatDuration(download.startTime, download.endTime)}</span>
                                                            {download.fileSize && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>{formatFileSize(download.fileSize)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onRemove(download.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors ml-2"
                                            >
                                                <FiX className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bouton pour afficher plus/moins d'historique */}
                            {completedDownloads.length > 5 && (
                                <div className="mt-3 text-center">
                                    <button
                                        onClick={() => setShowAllHistory(!showAllHistory)}
                                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                    >
                                        {showAllHistory
                                            ? `Afficher moins (${completedDownloads.length - 5} de plus)`
                                            : `Afficher tout (${completedDownloads.length} téléchargements)`
                                        }
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Message vide */}
                    {downloads.length === 0 && (
                        <div className="p-8 text-center">
                            <FiDownload className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">Aucun téléchargement</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
