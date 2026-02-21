import { FiAlertTriangle } from 'react-icons/fi'

interface ServiceUnavailableModalProps {
  isOpen: boolean
  onRetry: () => void
  isRetrying?: boolean
  /** Message pour Auth (serveur) vs Search (services) */
  variant?: 'server' | 'services'
}

const MESSAGES = {
  server: {
    title: 'Serveur indisponible',
    body: 'Impossible de contacter le serveur. Veuillez réessayer dans quelques instants.'
  },
  services: {
    title: 'Service temporairement indisponible',
    body: 'Un service est temporairement indisponible. Le staff a été contacté. Merci de réessayer plus tard.'
  }
}

/**
 * Modal bloquant : pas fermable, message simple, bouton Réessayer.
 * Design cohérent avec le thème (brand).
 */
export default function ServiceUnavailableModal ({
  isOpen,
  onRetry,
  isRetrying = false,
  variant = 'services'
}: ServiceUnavailableModalProps) {
  if (!isOpen) return null

  const { title, body } = MESSAGES[variant]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card max-w-md w-full text-center shadow-xl">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-amber-500/20">
            <FiAlertTriangle className="h-10 w-10 text-amber-400" />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-gray-400 text-sm mb-6">{body}</p>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {isRetrying ? (
            <>
              <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Vérification...
            </>
          ) : (
            'Réessayer'
          )}
        </button>
      </div>
    </div>
  )
}
