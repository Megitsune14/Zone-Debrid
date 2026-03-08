import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FiHome, FiDownload, FiSearch, FiUsers, FiLogOut, FiArrowLeft, FiEye, FiEyeOff, FiBarChart } from 'react-icons/fi'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useAdminMaster } from '../contexts/AdminMasterContext'
import metricsService from '../services/metricsService'

const navItems = [
  { to: '/admin', end: true, icon: FiHome, label: 'Accueil' },
  { to: '/admin/downloads', end: false, icon: FiDownload, label: 'Téléchargements' },
  { to: '/admin/searches', end: true, icon: FiSearch, label: 'Recherches' },
  { to: '/admin/users', end: true, icon: FiUsers, label: 'Utilisateurs' }
]

export default function AdminLayout () {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isMasterAuthenticated, authenticateMasterPassword, clearMasterAuth } = useAdminMaster()
  const [masterPassword, setMasterPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [showModifyForm, setShowModifyForm] = useState(false)
  const [currentMasterPassword, setCurrentMasterPassword] = useState('')
  const [newMasterPassword, setNewMasterPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [modifyLoading, setModifyLoading] = useState(false)
  const [modifyError, setModifyError] = useState('')

  const handleMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!masterPassword.trim()) return
    setLoading(true)
    try {
      await authenticateMasterPassword(masterPassword)
      setMasterPassword('')
    } catch (err: any) {
      setError(err.message || 'Mot de passe maître incorrect')
    } finally {
      setLoading(false)
    }
  }

  const handleModifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModifyError('')
    if (!newMasterPassword.trim()) return
    if (newMasterPassword.length < 8) {
      setModifyError('Le mot de passe maître doit contenir au moins 8 caractères')
      return
    }
    setModifyLoading(true)
    try {
      await metricsService.setMasterPassword(newMasterPassword, currentMasterPassword.trim() || undefined)
      setSuccess('Mot de passe maître modifié. Entrez-le ci-dessous pour accéder au dashboard.')
      setShowModifyForm(false)
      setCurrentMasterPassword('')
      setNewMasterPassword('')
    } catch (err: any) {
      setModifyError(err.message || 'Erreur')
    } finally {
      setModifyLoading(false)
    }
  }

  const handleCancelModify = () => {
    setShowModifyForm(false)
    setCurrentMasterPassword('')
    setNewMasterPassword('')
    setModifyError('')
  }

  const handleRetour = () => {
    clearMasterAuth()
    navigate('/')
  }

  const handleLogout = () => {
    clearMasterAuth()
    logout()
    navigate('/')
  }

  if (!isMasterAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="card max-w-md w-full">
          <div className="text-center mb-6">
            <FiBarChart className="h-12 w-12 text-brand-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400">Entrez votre mot de passe maître pour accéder au back-office</p>
          </div>

          {!showModifyForm ? (
            <>
              <form onSubmit={handleMasterSubmit} className="space-y-4">
                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
                {success && (
                  <p className="text-sm text-green-400">{success}</p>
                )}
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Mot de passe maître"
                    className="input-field w-full pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
                <button type="submit" disabled={!masterPassword.trim() || loading} className="btn-primary w-full">
                  {loading ? 'Vérification...' : 'Accéder au dashboard'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowModifyForm(true)}
                  className="text-sm text-gray-400 hover:text-gray-300 underline"
                >
                  Modifier le mot de passe maître
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleModifySubmit} className="space-y-4">
              <p className="text-sm text-gray-400 mb-2">Définir ou modifier le mot de passe maître (min. 8 caractères).</p>
              {modifyError && (
                <p className="text-sm text-red-400">{modifyError}</p>
              )}
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentMasterPassword}
                  onChange={(e) => setCurrentMasterPassword(e.target.value)}
                  placeholder="Ancien mot de passe maître (si déjà défini)"
                  className="input-field w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showCurrentPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  placeholder="Nouveau mot de passe maître"
                  className="input-field w-full pr-10"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showNewPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCancelModify}
                  className="btn-secondary flex-1"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newMasterPassword.trim() || newMasterPassword.length < 8 || modifyLoading}
                  className="btn-primary flex-1"
                >
                  {modifyLoading ? 'Modification...' : 'Modifier'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-bg flex">
      <aside className="w-56 flex-shrink-0 border-r border-brand-border panel-glass flex flex-col">
        <div className="p-4 border-b border-brand-border">
          <h2 className="text-lg font-bold text-white">Back-office</h2>
          <p className="text-xs text-gray-400 mt-0.5">{user?.username}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-primary/20 text-brand-primary border border-brand-primary/30'
                    : 'text-gray-400 hover:bg-brand-surface hover:text-gray-200'
                }`
              }
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-brand-border space-y-1">
          <button
            type="button"
            onClick={handleRetour}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-brand-surface hover:text-gray-200 transition-colors"
          >
            <FiArrowLeft className="h-5 w-5" />
            Retour au site
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <FiLogOut className="h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
