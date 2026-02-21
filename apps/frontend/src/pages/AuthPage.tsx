import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiDownload, FiLoader } from 'react-icons/fi'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import ServiceUnavailableModal from '../components/ServiceUnavailableModal'
import { checkServerHealth } from '../services/healthService'

const AuthPage = () => {
  const [searchParams] = useSearchParams()
  const [isLogin, setIsLogin] = useState(true)
  const [serverUp, setServerUp] = useState<boolean | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const checkServer = useCallback(async () => {
    const ok = await checkServerHealth()
    setServerUp(ok)
  }, [])

  useEffect(() => {
    checkServer()
  }, [checkServer])

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'register') {
      setIsLogin(false)
    } else {
      setIsLogin(true)
    }
  }, [searchParams])

  const handleRetry = async () => {
    setIsRetrying(true)
    await checkServer()
    setIsRetrying(false)
  }

  if (serverUp === null) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center relative z-10">
        <div className="text-center">
          <FiLoader className="h-8 w-8 animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-gray-400">Vérification du serveur...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      <ServiceUnavailableModal
        isOpen={!serverUp}
        onRetry={handleRetry}
        isRetrying={isRetrying}
        variant="server"
      />
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <FiDownload className="h-12 w-12 sm:h-16 sm:w-16 text-brand-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Zone-Debrid</h1>
          <p className="text-sm sm:text-base text-gray-400">Authentification requise</p>
        </div>

        <div className="card">
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
