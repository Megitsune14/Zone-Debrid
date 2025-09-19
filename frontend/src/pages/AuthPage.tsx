import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiDownload } from 'react-icons/fi'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'

const AuthPage = () => {
  const [searchParams] = useSearchParams()
  const [isLogin, setIsLogin] = useState(true)

  // Déterminer le mode initial basé sur le paramètre URL
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'register') {
      setIsLogin(false)
    } else {
      setIsLogin(true)
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo et titre */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <FiDownload className="h-16 w-16 text-primary-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Zone-Debrid</h1>
          <p className="text-gray-400">Authentification requise</p>
        </div>

        {/* Formulaire */}
        <div className="card">
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>

        {/* Informations supplémentaires */}
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
