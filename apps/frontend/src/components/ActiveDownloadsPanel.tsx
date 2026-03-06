import { useState } from 'react'
import {
  FiDownload,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiMinusCircle
} from 'react-icons/fi'
import { useActiveDownloads, type ActiveDownload, type ActiveDownloadStatus } from '../contexts/ActiveDownloadContext'

function getStatusLabel(status: ActiveDownloadStatus): string {
  switch (status) {
    case 'downloading':
      return 'En cours'
    case 'completed':
      return 'Terminé'
    case 'error':
      return 'Erreur'
    case 'cancelled':
      return 'Annulé'
    default:
      return status
  }
}

function getStatusIcon(status: ActiveDownloadStatus) {
  switch (status) {
    case 'downloading':
      return <FiDownload className="h-4 w-4 text-brand-primary animate-pulse" />
    case 'completed':
      return <FiCheckCircle className="h-4 w-4 text-green-500" />
    case 'error':
      return <FiAlertCircle className="h-4 w-4 text-red-500" />
    case 'cancelled':
      return <FiMinusCircle className="h-4 w-4 text-orange-500" />
    default:
      return <FiDownload className="h-4 w-4 text-gray-500" />
  }
}

export default function ActiveDownloadsPanel() {
  const { downloads, removeDownload, cancelDownload } = useActiveDownloads()
  const [isOpen, setIsOpen] = useState(true)

  const activeCount = downloads.filter((d) => d.status === 'downloading').length

  if (downloads.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] panel-glass shadow-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 border-b border-brand-border hover:bg-brand-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <FiDownload className="h-5 w-5 text-brand-primary" />
          <span className="font-semibold text-white">Téléchargements</span>
          {activeCount > 0 && (
            <span className="bg-gradient-brand text-white text-xs px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {isOpen ? (
          <FiChevronDown className="h-5 w-5 text-gray-400" />
        ) : (
          <FiChevronUp className="h-5 w-5 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="max-h-80 overflow-y-auto">
          {downloads.map((d) => (
            <DownloadRow
              key={d.id}
              download={d}
              onRemove={() => removeDownload(d.id)}
              onCancel={() => cancelDownload(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DownloadRow({
  download,
  onRemove,
  onCancel
}: {
  download: ActiveDownload
  onRemove: () => void
  onCancel: () => void
}) {
  const { filename, status, progress, totalBytes, errorMessage, speedMBps, type } = download
  const isAria2 = type === 'aria2'
  const showCancelAria2 = status === 'downloading' && isAria2
  const showRemove = (status === 'completed' || status === 'error' || status === 'cancelled') || showCancelAria2

  return (
    <div className="p-3 border-b border-brand-border last:border-b-0 bg-brand-surface/80 hover:bg-brand-surface-hover/80 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate" title={filename}>
            {filename}
          </p>
          <div className="flex items-center justify-between gap-2 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-2 shrink-0">
              {getStatusIcon(status)}
              {getStatusLabel(status)}
            </span>
            {status === 'downloading' && (
              <span className="shrink-0 tabular-nums flex items-center gap-2">
                {speedMBps > 0 && (
                  <span>{speedMBps >= 1 ? `${speedMBps.toFixed(1)} Mo/s` : `${(speedMBps * 1024).toFixed(0)} Ko/s`}</span>
                )}
                {totalBytes != null ? `${Math.round(progress)} %` : (speedMBps > 0 ? '' : '—')}
              </span>
            )}
          </div>
        </div>
        {(showRemove) && (
          <button
            type="button"
            onClick={showCancelAria2 ? onCancel : onRemove}
            className="p-1.5 text-gray-400 hover:text-white rounded transition-colors shrink-0"
            title={showCancelAria2 ? 'Annuler le téléchargement' : 'Fermer'}
          >
            <FiX className="h-4 w-4" />
          </button>
        )}
      </div>

      {status === 'downloading' && (
        <div className="mt-1.5 w-full h-2 progress-track">
          {totalBytes != null ? (
            <div
              className="progress-fill h-full"
              style={{ width: `${Math.min(100, Math.round(progress))}%` }}
            />
          ) : (
            <div className="h-full w-full rounded-full animate-pulse bg-gradient-to-r from-brand-primary/30 via-brand-primary to-brand-variant/30" />
          )}
        </div>
      )}

      {status === 'error' && errorMessage && (
        <p className="mt-1 text-xs text-red-400 truncate" title={errorMessage}>
          {errorMessage}
        </p>
      )}
    </div>
  )
}
