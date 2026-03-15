import { useState, useEffect } from 'react'
import { FiEye, FiEyeOff, FiLoader, FiKey, FiLock, FiSave, FiAlertCircle, FiCheckCircle, FiCheck, FiX, FiTrash2 } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import authService from '../services/authService'
import { useNavigate } from 'react-router-dom'

const SettingsPage = () => {
  const { user, updateProfile, logout } = useAuth()
  const navigate = useNavigate()
  
  // État pour le formulaire de mot de passe
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  // État pour le formulaire de clé API
  const [apiKeyForm, setApiKeyForm] = useState({
    allDebridApiKey: user?.allDebridApiKey || ''
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState(false)
  const [apiKeyError, setApiKeyError] = useState('')
  const [apiKeySuccess, setApiKeySuccess] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [apiKeyMessage, setApiKeyMessage] = useState('')

  // État pour la configuration Aria2
  const [aria2Form, setAria2Form] = useState({
    aria2Enabled: user?.aria2Enabled ?? false,
    aria2RpcUrl: user?.aria2RpcUrl || '',
    aria2RpcSecret: user?.aria2RpcSecret || '',
    aria2DownloadBasePath: user?.aria2DownloadBasePath || '',
    aria2PathFilms: user?.aria2PathFilms || '',
    aria2PathSeries: user?.aria2PathSeries || '',
    aria2PathAnimes: user?.aria2PathAnimes || '',
    aria2PathSeriesSeason: user?.aria2PathSeriesSeason || ''
  })
  const [isUpdatingAria2, setIsUpdatingAria2] = useState(false)
  const [aria2Error, setAria2Error] = useState('')
  const [aria2Success, setAria2Success] = useState('')
  const [showAria2Secret, setShowAria2Secret] = useState(false)

  // État pour la suppression de compte
  const [deleteForm, setDeleteForm] = useState({
    password: '',
    confirmText: ''
  })
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value
    })
    setPasswordError('')
    setPasswordSuccess('')
  }

  // Validation de la clé API AllDebrid avec debounce
  useEffect(() => {
    // Ne pas valider si c'est la clé actuelle de l'utilisateur
    if (apiKeyForm.allDebridApiKey === user?.allDebridApiKey) {
      setApiKeyStatus('idle')
      setApiKeyMessage('')
      return
    }

    if (!apiKeyForm.allDebridApiKey || apiKeyForm.allDebridApiKey.length < 10) {
      setApiKeyStatus('idle')
      setApiKeyMessage('')
      return
    }

    const timeoutId = setTimeout(async () => {
      setApiKeyStatus('validating')
      setApiKeyMessage('Validation de la clé API...')
      
      try {
        await authService.validateAllDebridApiKey(apiKeyForm.allDebridApiKey)
        setApiKeyStatus('valid')
        setApiKeyMessage('Clé API valide')
      } catch (error: any) {
        setApiKeyStatus('invalid')
        setApiKeyMessage(error.message || 'Clé API invalide')
      }
    }, 1000) // Debounce de 1 seconde

    return () => clearTimeout(timeoutId)
  }, [apiKeyForm.allDebridApiKey, user?.allDebridApiKey])

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeyForm({
      ...apiKeyForm,
      [e.target.name]: e.target.value
    })
    setApiKeyError('')
    setApiKeySuccess('')
  }

  const handleAria2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target
    setAria2Form(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setAria2Error('')
    setAria2Success('')
  }

  // Synchroniser les champs Aria2 quand l'utilisateur (profil) change
  useEffect(() => {
    if (!user) return
    setAria2Form(prev => ({
      ...prev,
      aria2Enabled: user.aria2Enabled ?? false,
      aria2RpcUrl: user.aria2RpcUrl || '',
      aria2RpcSecret: user.aria2RpcSecret ?? '',
      aria2DownloadBasePath: user.aria2DownloadBasePath || '',
      aria2PathFilms: user.aria2PathFilms || '',
      aria2PathSeries: user.aria2PathSeries || '',
      aria2PathAnimes: user.aria2PathAnimes || '',
      aria2PathSeriesSeason: user.aria2PathSeriesSeason || ''
    }))
  }, [user?.id, user?.aria2Enabled, user?.aria2RpcUrl, user?.aria2RpcSecret, user?.aria2DownloadBasePath, user?.aria2PathFilms, user?.aria2PathSeries, user?.aria2PathAnimes, user?.aria2PathSeriesSeason])

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères')
      return
    }

    setIsChangingPassword(true)

    try {
      await authService.updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
      
      setPasswordSuccess('Mot de passe modifié avec succès')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      setPasswordError(error.message || 'Erreur lors de la modification du mot de passe')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setApiKeyError('')
    setApiKeySuccess('')

    if (!apiKeyForm.allDebridApiKey.trim()) {
      setApiKeyError('La clé API AllDebrid est requise')
      return
    }

    // Vérifier si la clé a changé et si elle est valide
    if (apiKeyForm.allDebridApiKey !== user?.allDebridApiKey) {
      if (apiKeyStatus === 'invalid') {
        setApiKeyError('Veuillez fournir une clé API AllDebrid valide')
        return
      }

      if (apiKeyStatus === 'validating') {
        setApiKeyError('Veuillez attendre la validation de la clé API')
        return
      }
    }

    setIsUpdatingApiKey(true)

    try {
      await updateProfile({
        allDebridApiKey: apiKeyForm.allDebridApiKey.trim()
      })
      
      setApiKeySuccess('Clé API AllDebrid mise à jour avec succès')
    } catch (error: any) {
      setApiKeyError(error.message || 'Erreur lors de la mise à jour de la clé API')
    } finally {
      setIsUpdatingApiKey(false)
    }
  }

  const handleAria2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAria2Error('')
    setAria2Success('')

    if (aria2Form.aria2Enabled) {
      if (!aria2Form.aria2RpcUrl.trim()) {
        setAria2Error('L\'URL RPC Aria2 est requise lorsque Aria2 est activé')
        return
      }
      const hasBase = Boolean(aria2Form.aria2DownloadBasePath?.trim())
      const hasFilms = Boolean(aria2Form.aria2PathFilms?.trim())
      const hasSeries = Boolean(aria2Form.aria2PathSeries?.trim())
      const hasAnimes = Boolean(aria2Form.aria2PathAnimes?.trim())
      if (!hasBase && !hasFilms && !hasSeries && !hasAnimes) {
        setAria2Error('Configurez au moins un chemin : chemin de base ou chemins films/séries/animes')
        return
      }
    }

    setIsUpdatingAria2(true)
    try {
      if (aria2Form.aria2Enabled && aria2Form.aria2RpcUrl.trim()) {
        await authService.validateAria2Connection(
          aria2Form.aria2RpcUrl.trim(),
          aria2Form.aria2RpcSecret.trim() || undefined
        )
      }
      await updateProfile({
        aria2Enabled: aria2Form.aria2Enabled,
        aria2RpcUrl: aria2Form.aria2Enabled ? (aria2Form.aria2RpcUrl.trim() || undefined) : undefined,
        aria2RpcSecret: aria2Form.aria2RpcSecret.trim() || undefined,
        aria2DownloadBasePath: aria2Form.aria2Enabled ? (aria2Form.aria2DownloadBasePath.trim() || undefined) : undefined,
        aria2PathFilms: aria2Form.aria2Enabled ? (aria2Form.aria2PathFilms.trim() || undefined) : undefined,
        aria2PathSeries: aria2Form.aria2Enabled ? (aria2Form.aria2PathSeries.trim() || undefined) : undefined,
        aria2PathAnimes: aria2Form.aria2Enabled ? (aria2Form.aria2PathAnimes.trim() || undefined) : undefined,
        aria2PathSeriesSeason: aria2Form.aria2Enabled ? (aria2Form.aria2PathSeriesSeason.trim() || undefined) : undefined
      })
      setAria2Success('Configuration Aria2 mise à jour avec succès')
    } catch (error: any) {
      setAria2Error(error.message || 'Erreur lors de la mise à jour de la configuration Aria2')
    } finally {
      setIsUpdatingAria2(false)
    }
  }

  const handleDeleteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeleteForm({
      ...deleteForm,
      [e.target.name]: e.target.value
    })
    setDeleteError('')
  }

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeleteError('')

    // Validation
    if (!deleteForm.password) {
      setDeleteError('Le mot de passe est requis')
      return
    }

    if (deleteForm.confirmText !== 'SUPPRIMER') {
      setDeleteError('Veuillez taper "SUPPRIMER" pour confirmer')
      return
    }

    setIsDeletingAccount(true)

    try {
      await authService.deleteAccount(deleteForm.password)
      
      // Déconnexion et redirection
      logout()
      navigate('/auth')
    } catch (error: any) {
      setDeleteError(error.message || 'Erreur lors de la suppression du compte')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Paramètres</h1>
        <p className="text-gray-400">Gérez vos informations de compte et préférences</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Section Mot de passe */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FiLock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Modifier le mot de passe</h2>
              <p className="text-sm text-gray-400">Changez votre mot de passe de connexion</p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordError && (
              <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <FiAlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-400 text-sm">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <FiCheckCircle className="h-4 w-4 text-green-400" />
                <p className="text-green-400 text-sm">{passwordSuccess}</p>
              </div>
            )}

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  className="input-field w-full pr-10"
                  placeholder="Votre mot de passe actuel"
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  disabled={isChangingPassword}
                >
                  {showCurrentPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  required
                  className="input-field w-full pr-10"
                  placeholder="Votre nouveau mot de passe"
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  disabled={isChangingPassword}
                >
                  {showNewPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirmer le nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  className="input-field w-full pr-10"
                  placeholder="Confirmez votre nouveau mot de passe"
                  disabled={isChangingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  disabled={isChangingPassword}
                >
                  {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {isChangingPassword ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  <span>Modification...</span>
                </>
              ) : (
                <>
                  <FiSave className="h-4 w-4" />
                  <span>Modifier le mot de passe</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Section Clé API */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <FiKey className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Clé API AllDebrid</h2>
              <p className="text-sm text-gray-400">Mettez à jour votre clé API pour les téléchargements</p>
            </div>
          </div>

          <form onSubmit={handleApiKeySubmit} className="space-y-4">
            {apiKeyError && (
              <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <FiAlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-400 text-sm">{apiKeyError}</p>
              </div>
            )}

            {apiKeySuccess && (
              <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <FiCheckCircle className="h-4 w-4 text-green-400" />
                <p className="text-green-400 text-sm">{apiKeySuccess}</p>
              </div>
            )}

            <div>
              <label htmlFor="allDebridApiKey" className="block text-sm font-medium text-gray-300 mb-2">
                Clé API AllDebrid
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  id="allDebridApiKey"
                  name="allDebridApiKey"
                  value={apiKeyForm.allDebridApiKey}
                  onChange={handleApiKeyChange}
                  required
                  className={`input-field w-full pr-20 ${
                    apiKeyStatus === 'valid' ? 'border-green-500' : 
                    apiKeyStatus === 'invalid' ? 'border-red-500' : ''
                  }`}
                  placeholder="Votre clé API AllDebrid"
                  disabled={isUpdatingApiKey}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  {apiKeyStatus === 'validating' && (
                    <FiLoader className="h-4 w-4 animate-spin text-blue-400" />
                  )}
                  {apiKeyStatus === 'valid' && (
                    <FiCheck className="h-4 w-4 text-green-400" />
                  )}
                  {apiKeyStatus === 'invalid' && (
                    <FiX className="h-4 w-4 text-red-400" />
                  )}
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-gray-400 hover:text-gray-300"
                    disabled={isUpdatingApiKey}
                  >
                    {showApiKey ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {apiKeyMessage && (
                <p className={`text-xs mt-1 ${
                  apiKeyStatus === 'valid' ? 'text-green-400' : 
                  apiKeyStatus === 'invalid' ? 'text-red-400' : 
                  'text-blue-400'
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
              disabled={isUpdatingApiKey || (apiKeyForm.allDebridApiKey !== user?.allDebridApiKey && (apiKeyStatus === 'validating' || apiKeyStatus === 'invalid'))}
              className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingApiKey ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  <span>Mise à jour...</span>
                </>
              ) : (
                <>
                  <FiSave className="h-4 w-4" />
                  <span>Mettre à jour la clé API</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Section Aria2 / NAS - pleine largeur */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between space-x-3 mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <FiSave className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Téléchargement vers NAS (Aria2)</h2>
                <p className="text-sm text-gray-400">Configurez votre instance Aria2 et les chemins de téléchargement (films, séries, animes, saisons)</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/aria2-help')}
              className="text-xs sm:text-sm px-3 py-2 rounded-lg border border-brand-border text-gray-300 hover:text-white hover:border-brand-primary hover:bg-brand-surface-hover transition-colors duration-200"
            >
              En savoir plus
            </button>
          </div>

          <form onSubmit={handleAria2Submit} className="space-y-4">
            {aria2Error && (
              <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <FiAlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-400 text-sm">{aria2Error}</p>
              </div>
            )}

            {aria2Success && (
              <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <FiCheckCircle className="h-4 w-4 text-green-400" />
                <p className="text-green-400 text-sm">{aria2Success}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="aria2Enabled" className="block text-sm font-medium text-gray-300 mb-1">
                  Activer le téléchargement vers NAS
                </label>
                <p className="text-xs text-gray-500">
                  Utilise Aria2 RPC pour envoyer les téléchargements directement vers votre NAS.
                </p>
              </div>
              <div>
                <label className="inline-flex items-center cursor-pointer">
                  <span className="sr-only">Activer Aria2</span>
                  <input
                    type="checkbox"
                    id="aria2Enabled"
                    name="aria2Enabled"
                    checked={aria2Form.aria2Enabled}
                    onChange={handleAria2Change}
                    className="sr-only peer"
                    disabled={isUpdatingAria2}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:bg-purple-500 relative transition-colors duration-200">
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${aria2Form.aria2Enabled ? 'translate-x-5' : ''}`} />
                  </div>
                </label>
              </div>
            </div>

            {aria2Form.aria2Enabled && (
              <>
            <div>
              <label htmlFor="aria2RpcUrl" className="block text-sm font-medium text-gray-300 mb-2">
                URL RPC Aria2
              </label>
              <input
                type="text"
                id="aria2RpcUrl"
                name="aria2RpcUrl"
                value={aria2Form.aria2RpcUrl}
                onChange={handleAria2Change}
                className="input-field w-full"
                placeholder="http://mon-nas:6800/jsonrpc"
                disabled={isUpdatingAria2}
              />
              <p className="text-xs text-gray-500 mt-1">
                URL complète de l&apos;interface JSON-RPC. La connexion est vérifiée (getVersion) au clic sur &quot;Mettre à jour la configuration Aria2&quot;.
              </p>
            </div>

            <div>
              <label htmlFor="aria2RpcSecret" className="block text-sm font-medium text-gray-300 mb-2">
                Secret RPC Aria2
              </label>
              <div className="relative">
                <input
                  type={showAria2Secret ? 'text' : 'password'}
                  id="aria2RpcSecret"
                  name="aria2RpcSecret"
                  value={aria2Form.aria2RpcSecret}
                  onChange={handleAria2Change}
                  className="input-field w-full pr-10"
                  placeholder="MonSecretAria2"
                  disabled={isUpdatingAria2}
                />
                <button
                  type="button"
                  onClick={() => setShowAria2Secret(!showAria2Secret)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  disabled={isUpdatingAria2}
                  aria-label={showAria2Secret ? 'Masquer le secret' : 'Afficher le secret'}
                >
                  {showAria2Secret ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Secret RPC Aria2. La connexion est vérifiée (getVersion) au clic sur &quot;Mettre à jour la configuration Aria2&quot;.
              </p>
            </div>

            <div>
              <label htmlFor="aria2DownloadBasePath" className="block text-sm font-medium text-gray-300 mb-2">
                Chemin de base des téléchargements
              </label>
              <input
                type="text"
                id="aria2DownloadBasePath"
                name="aria2DownloadBasePath"
                value={aria2Form.aria2DownloadBasePath}
                onChange={handleAria2Change}
                className="input-field w-full"
                placeholder="/media"
                disabled={isUpdatingAria2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Point de départ par défaut si les chemins films/séries ne sont pas renseignés (ex. <code className="font-mono text-gray-300">/media</code>).
              </p>
            </div>

            <div className="grid sm:grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-brand-border">
              <div>
                <label htmlFor="aria2PathFilms" className="block text-sm font-medium text-gray-300 mb-2">
                  Chemin de téléchargement pour films
                </label>
                <input
                  type="text"
                  id="aria2PathFilms"
                  name="aria2PathFilms"
                  value={aria2Form.aria2PathFilms}
                  onChange={handleAria2Change}
                  className="input-field w-full"
                  placeholder="/media/films"
                  disabled={isUpdatingAria2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dossier racine des films. Sous-dossiers titre (année) créés automatiquement.
                </p>
              </div>
              <div>
                <label htmlFor="aria2PathSeries" className="block text-sm font-medium text-gray-300 mb-2">
                  Chemin de téléchargement pour séries
                </label>
                <input
                  type="text"
                  id="aria2PathSeries"
                  name="aria2PathSeries"
                  value={aria2Form.aria2PathSeries}
                  onChange={handleAria2Change}
                  className="input-field w-full"
                  placeholder="/media/series"
                  disabled={isUpdatingAria2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dossier racine des séries. Sous-dossiers série puis saison créés automatiquement.
                </p>
              </div>
              <div>
                <label htmlFor="aria2PathAnimes" className="block text-sm font-medium text-gray-300 mb-2">
                  Chemin de téléchargement pour animes
                </label>
                <input
                  type="text"
                  id="aria2PathAnimes"
                  name="aria2PathAnimes"
                  value={aria2Form.aria2PathAnimes}
                  onChange={handleAria2Change}
                  className="input-field w-full"
                  placeholder="/media/animes"
                  disabled={isUpdatingAria2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dossier racine des animes. Sous-dossiers anime puis saison créés automatiquement.
                </p>
              </div>
              <div>
                <label htmlFor="aria2PathSeriesSeason" className="block text-sm font-medium text-gray-300 mb-2">
                Chemin de téléchargement de la saison
                </label>
                <input
                  type="text"
                  id="aria2PathSeriesSeason"
                  name="aria2PathSeriesSeason"
                  value={aria2Form.aria2PathSeriesSeason}
                  onChange={handleAria2Change}
                  className="input-field w-full"
                  placeholder="Saison {season}"
                  disabled={isUpdatingAria2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nom du dossier de saison. <code className="font-mono text-gray-300">{'{season}'}</code> = numéro (ex. Saison 01).
                </p>
              </div>
            </div>
              </>
            )}

            <button
              type="submit"
              disabled={isUpdatingAria2}
              className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdatingAria2 ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  <span>Mise à jour...</span>
                </>
              ) : (
                <>
                  <FiSave className="h-4 w-4" />
                  <span>{aria2Form.aria2Enabled ? 'Mettre à jour la configuration Aria2' : 'Enregistrer'}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Section Suppression de compte */}
      <div className="card border-red-500/20 bg-red-500/5">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <FiTrash2 className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Zone de danger</h2>
            <p className="text-sm text-gray-400">Supprimer définitivement votre compte</p>
          </div>
        </div>


        {!showDeleteConfirmation ? (
          <button
            onClick={() => setShowDeleteConfirmation(true)}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 border border-red-500/30 hover:border-red-500/50"
          >
            <FiTrash2 className="h-4 w-4" />
            <span>Supprimer mon compte</span>
          </button>
        ) : (
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            {deleteError && (
              <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <FiAlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-red-400 text-sm">{deleteError}</p>
              </div>
            )}

            <div>
              <label htmlFor="deletePassword" className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe de confirmation
              </label>
              <div className="relative">
                <input
                  type={showDeletePassword ? 'text' : 'password'}
                  id="deletePassword"
                  name="password"
                  value={deleteForm.password}
                  onChange={handleDeleteChange}
                  required
                  className="input-field w-full pr-10"
                  placeholder="Votre mot de passe actuel"
                  disabled={isDeletingAccount}
                />
                <button
                  type="button"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  disabled={isDeletingAccount}
                >
                  {showDeletePassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmText" className="block text-sm font-medium text-gray-300 mb-2">
                Tapez "SUPPRIMER" pour confirmer
              </label>
              <input
                type="text"
                id="confirmText"
                name="confirmText"
                value={deleteForm.confirmText}
                onChange={handleDeleteChange}
                required
                className="input-field w-full"
                placeholder="SUPPRIMER"
                disabled={isDeletingAccount}
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(false)
                  setDeleteForm({ password: '', confirmText: '' })
                  setDeleteError('')
                }}
                className="btn-secondary flex-1"
                disabled={isDeletingAccount}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isDeletingAccount || deleteForm.confirmText !== 'SUPPRIMER' || !deleteForm.password}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-medium py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border border-red-500/30 hover:border-red-500/50"
              >
                {isDeletingAccount ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    <span>Suppression...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 className="h-4 w-4" />
                    <span>Supprimer définitivement</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default SettingsPage
