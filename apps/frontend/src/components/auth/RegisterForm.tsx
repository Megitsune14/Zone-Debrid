import { useState, useEffect } from 'react'
import { FiEyeOff, FiEye, FiLoader, FiCheck, FiX } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import authService from '../../services/authService'

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    allDebridApiKey: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid' | 'unavailable'>('idle')
  const [apiKeyMessage, setApiKeyMessage] = useState('')
  const { register, isLoading } = useAuth()

  // Validation de la clé API AllDebrid avec debounce
  useEffect(() => {
    if (!formData.allDebridApiKey || formData.allDebridApiKey.length < 10) {
      setApiKeyStatus('idle')
      setApiKeyMessage('')
      return
    }

    const timeoutId = setTimeout(async () => {
      setApiKeyStatus('validating')
      setApiKeyMessage('Validation de la clé API...')

      try {
        await authService.validateAllDebridApiKey(formData.allDebridApiKey)
        setApiKeyStatus('valid')
        setApiKeyMessage('Clé API valide')
      } catch (err: unknown) {
        const error = err as Error & { code?: string }
        if (error.code === 'ALLDEBRID_UNAVAILABLE') {
          setApiKeyStatus('unavailable')
          setApiKeyMessage('Service AllDebrid temporairement indisponible. Réessayez dans quelques minutes.')
        } else if (error.code === 'NETWORK_ERROR') {
          setApiKeyStatus('unavailable')
          setApiKeyMessage('Erreur de connexion temporaire. Réessayez.')
        } else {
          setApiKeyStatus('invalid')
          setApiKeyMessage(error.message || 'Clé API invalide')
        }
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [formData.allDebridApiKey])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (formData.username.length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères')
      return
    }

    if (apiKeyStatus === 'invalid') {
      setError('Veuillez fournir une clé API AllDebrid valide.')
      return
    }

    if (apiKeyStatus === 'validating') {
      setError('Veuillez attendre la validation de la clé API.')
      return
    }

    try {
      await register({
        username: formData.username,
        password: formData.password,
        allDebridApiKey: formData.allDebridApiKey
      })
    } catch (err: unknown) {
      const error = err as Error & { code?: string }
      if (error.code === 'ALLDEBRID_UNAVAILABLE') {
        setError('Le service AllDebrid est temporairement indisponible. Veuillez réessayer dans quelques minutes.')
      } else if (error.code === 'NETWORK_ERROR') {
        setError('Erreur de connexion temporaire. Veuillez réessayer.')
      } else {
        setError(error.message || 'Une erreur est survenue lors de l\'inscription.')
      }
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Inscription</h2>
        <p className="text-gray-400">Créez votre compte</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
            Nom d'utilisateur
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
            className="input-field w-full"
            placeholder="Votre nom d'utilisateur"
            disabled={isLoading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Lettres, chiffres, tirets et underscores uniquement
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Mot de passe
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="input-field w-full pr-10"
              placeholder="Votre mot de passe"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              disabled={isLoading}
            >
              {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Au moins 6 caractères
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="input-field w-full pr-10"
              placeholder="Confirmez votre mot de passe"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              disabled={isLoading}
            >
              {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="allDebridApiKey" className="block text-sm font-medium text-gray-300 mb-2">
            Clé API AllDebrid
          </label>
          <div className="relative">
            <input
              type="password"
              id="allDebridApiKey"
              name="allDebridApiKey"
              value={formData.allDebridApiKey}
              onChange={handleChange}
              required
              className={`input-field w-full pr-10 ${
                apiKeyStatus === 'valid' ? 'border-green-500' : ''
              } ${apiKeyStatus === 'invalid' ? 'border-red-500' : ''} ${
                apiKeyStatus === 'unavailable' ? 'border-amber-500/50' : ''
              }`}
              placeholder="Votre clé API AllDebrid"
              disabled={isLoading}
            />
            {apiKeyStatus === 'validating' && (
              <FiLoader className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-blue-400" />
            )}
            {apiKeyStatus === 'valid' && (
              <FiCheck className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-400" />
            )}
            {apiKeyStatus === 'invalid' && (
              <FiX className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-400" />
            )}
          </div>
          {apiKeyMessage && (
            <p className={`text-xs mt-1 ${
              apiKeyStatus === 'valid' ? 'text-green-400' : ''
            } ${apiKeyStatus === 'invalid' ? 'text-red-400' : ''} ${
              apiKeyStatus === 'unavailable' ? 'text-amber-400' : ''
            } ${apiKeyStatus === 'validating' ? 'text-blue-400' : ''} ${
              apiKeyStatus === 'idle' ? 'text-blue-400' : ''
            }`}>
              {apiKeyMessage}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Obtenez votre clé sur <a href="https://alldebrid.com" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:text-brand-variant">alldebrid.com</a>
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || apiKeyStatus === 'validating' || apiKeyStatus === 'invalid'}
          className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <FiLoader className="h-4 w-4 animate-spin" />
              <span>Création du compte...</span>
            </>
          ) : (
            <span>Créer le compte</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-400">
          Déjà un compte ?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-brand-primary hover:text-brand-variant font-medium"
            disabled={isLoading}
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  )
}

export default RegisterForm
