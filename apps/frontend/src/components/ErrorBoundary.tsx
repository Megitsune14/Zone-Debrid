import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportClientError } from '../services/errorReportingService'
import { log } from '../config/api'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary global : intercepte les erreurs de rendu React et les envoie au backend (Discord).
 * Affiche un fallback sans bloquer l'UI. Le reporting est fait de façon non bloquante.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor (props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError (error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch (error: Error, errorInfo: ErrorInfo): void {
    log.error('ErrorBoundary caught:', error.message, errorInfo.componentStack)
    reportClientError({
      message: error.message,
      stack: error.stack,
      route: window.location.pathname || undefined,
      componentStack: errorInfo.componentStack ?? undefined
    })
  }

  render (): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6 bg-brand-bg">
          <div className="card max-w-md text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Une erreur est survenue</h2>
            <p className="text-gray-400 text-sm mb-4">
              L'application a rencontré un problème. Vous pouvez recharger la page ou revenir à l'accueil.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-primary"
              >
                Recharger
              </button>
              <button
                type="button"
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
                className="btn-secondary"
              >
                Accueil
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
