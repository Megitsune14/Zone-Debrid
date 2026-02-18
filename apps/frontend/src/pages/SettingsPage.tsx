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
                Obtenez votre clé sur <a href="https://alldebrid.com" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300">alldebrid.com</a>
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
