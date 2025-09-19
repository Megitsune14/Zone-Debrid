import { useState, useEffect } from 'react'
import { FiUsers, FiDownload, FiCheckCircle, FiXCircle, FiEye, FiEyeOff, FiLock, FiBarChart, FiActivity, FiGlobe, FiClock, FiArchive } from 'react-icons/fi'
import { useAuth } from '../contexts/AuthContext'
import metricsService from '../services/metricsService'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface MetricsData {
    users: {
        total: number
        recent: number
    }
    downloads: {
        total: number
        completed: number
        error: number
        cancelled: number
        cleared: number
        byType: Array<{ _id: string; count: number }>
        byDay: Array<{ _id: string; count: number }>
    }
    topUsers: Array<{ username: string; downloadCount: number }>
    siteStatus: {
        currentUrl: string
        urlHistory: string[]
        lastChecked: string
        responseTime: number
        isHealthy: boolean
    } | null
}

const MetricsPage = () => {
    const { user } = useAuth()
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [isSettingPassword, setIsSettingPassword] = useState(false)
    const [isModifyingPassword, setIsModifyingPassword] = useState(false)
    const [masterPassword, setMasterPassword] = useState('')
    const [currentMasterPassword, setCurrentMasterPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [metrics, setMetrics] = useState<MetricsData | null>(null)
    const [loading, setLoading] = useState(false)

    // Vérifier si l'utilisateur est Megitsune
    const isMegitsune = user?.username === 'megitsune'

    useEffect(() => {
        if (isMegitsune && isAuthenticated) {
            fetchMetrics()
        }
    }, [isMegitsune, isAuthenticated])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const response = await metricsService.getMetrics()
      setMetrics(response.data)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Couleurs pour les graphiques
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  // Données pour le graphique en secteurs des téléchargements par type
  const downloadsByTypeData = metrics?.downloads.byType.map((item, index) => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: item.count,
    color: COLORS[index % COLORS.length]
  })) || []

  // Données pour le graphique en barres des téléchargements par jour
  const downloadsByDayData = metrics?.downloads.byDay.map(item => ({
    date: item._id,
    count: item.count
  })) || []

  // Données pour le graphique des utilisateurs actifs
  const topUsersData = metrics?.topUsers.slice(0, 5).map((user, index) => ({
    name: user.username,
    downloads: user.downloadCount,
    color: COLORS[index % COLORS.length]
  })) || []

    const handleSetMasterPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!masterPassword) {
            setError('Le nouveau mot de passe maître est requis')
            return
        }

        if (masterPassword.length < 8) {
            setError('Le mot de passe maître doit contenir au moins 8 caractères')
            return
        }

        setIsSettingPassword(true)

        try {
            await metricsService.setMasterPassword(masterPassword, currentMasterPassword || undefined)
            setSuccess('Mot de passe maître modifié avec succès')
            setMasterPassword('')
            setCurrentMasterPassword('')
            setIsModifyingPassword(false)
        } catch (error: any) {
            setError(error.message)
        } finally {
            setIsSettingPassword(false)
        }
    }

    const handleAuthenticate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (!masterPassword) {
            setError('Le mot de passe maître est requis')
            return
        }

        try {
            await metricsService.authenticateMasterPassword(masterPassword)
            setIsAuthenticated(true)
            setSuccess('Authentification réussie')
            setMasterPassword('')
        } catch (error: any) {
            setError(error.message)
        }
    }

    const handleLogout = () => {
        setIsAuthenticated(false)
        setMetrics(null)
        setMasterPassword('')
        setCurrentMasterPassword('')
        setError('')
        setSuccess('')
        setIsModifyingPassword(false)
    }

    const handleCancelModification = () => {
        setMasterPassword('')
        setCurrentMasterPassword('')
        setError('')
        setSuccess('')
        setIsModifyingPassword(false)
    }

    if (!isMegitsune) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="text-center py-12">
                    <FiLock className="h-16 w-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Accès Refusé</h1>
                    <p className="text-gray-400">Seul l'utilisateur Megitsune peut accéder à cette page.</p>
                </div>
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="mb-8 text-center">
                    <FiBarChart className="h-12 w-12 text-primary-400 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-white mb-2">Métriques</h1>
                    <p className="text-gray-400">Accédez aux métriques de l'application avec votre mot de passe maître</p>
                </div>

                <div className="card">
                    {!isModifyingPassword ? (
                        // Étape 1: Authentification
                        <form onSubmit={handleAuthenticate} className="space-y-4">
                            {error && (
                                <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <FiXCircle className="h-4 w-4 text-red-400" />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                    <FiCheckCircle className="h-4 w-4 text-green-400" />
                                    <p className="text-green-400 text-sm">{success}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="masterPassword" className="block text-sm font-medium text-gray-300 mb-2">
                                    Mot de passe maître
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="masterPassword"
                                        value={masterPassword}
                                        onChange={(e) => setMasterPassword(e.target.value)}
                                        required
                                        className="input-field w-full pr-10"
                                        placeholder="Votre mot de passe maître"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                    >
                                        {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!masterPassword}
                                className="btn-primary w-full"
                            >
                                Accéder aux métriques
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setIsModifyingPassword(true)}
                                    className="text-sm text-gray-400 hover:text-gray-300 underline"
                                >
                                    Modifier le mot de passe maître
                                </button>
                            </div>
                        </form>
                    ) : (
                        // Étape 2: Modification du mot de passe
                        <form onSubmit={handleSetMasterPassword} className="space-y-4">
                            {error && (
                                <div className="flex items-center space-x-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <FiXCircle className="h-4 w-4 text-red-400" />
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            {success && (
                                <div className="flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                    <FiCheckCircle className="h-4 w-4 text-green-400" />
                                    <p className="text-green-400 text-sm">{success}</p>
                                </div>
                            )}

                            <div>
                                <label htmlFor="currentMasterPassword" className="block text-sm font-medium text-gray-300 mb-2">
                                    Ancien mot de passe maître
                                </label>
                                <div className="relative">
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        id="currentMasterPassword"
                                        value={currentMasterPassword}
                                        onChange={(e) => setCurrentMasterPassword(e.target.value)}
                                        className="input-field w-full pr-10"
                                        placeholder="Ancien mot de passe maître"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                    >
                                        {showCurrentPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="newMasterPassword" className="block text-sm font-medium text-gray-300 mb-2">
                                    Nouveau mot de passe maître
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="newMasterPassword"
                                        value={masterPassword}
                                        onChange={(e) => setMasterPassword(e.target.value)}
                                        required
                                        className="input-field w-full pr-10"
                                        placeholder="Nouveau mot de passe maître"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                                    >
                                        {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    type="button"
                                    onClick={handleCancelModification}
                                    className="btn-secondary flex-1"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSettingPassword || !masterPassword}
                                    className="btn-primary flex-1"
                                >
                                    {isSettingPassword ? 'Modification...' : 'Modifier le mot de passe'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Métriques</h1>
                    <p className="text-gray-400">Tableau de bord des métriques de l'application</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="btn-secondary flex items-center space-x-2"
                >
                    <FiLock className="h-4 w-4" />
                    <span>Déconnexion</span>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <FiActivity className="h-8 w-8 animate-spin text-primary-400 mx-auto mb-4" />
                    <p className="text-gray-400">Chargement des métriques...</p>
                </div>
            ) : metrics ? (
                <div className="space-y-8">
                    {/* Statistiques générales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                        <div className="card">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <FiUsers className="h-5 w-5 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Utilisateurs</p>
                                    <p className="text-2xl font-bold text-white">{metrics.users.total}</p>
                                    <p className="text-xs text-green-400">+{metrics.users.recent} cette semaine</p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <FiDownload className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Téléchargements</p>
                                    <p className="text-2xl font-bold text-white">{metrics.downloads.total}</p>
                                    <p className="text-xs text-gray-400">Total</p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                    <FiCheckCircle className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Terminés</p>
                                    <p className="text-2xl font-bold text-white">{metrics.downloads.completed}</p>
                                    <p className="text-xs text-green-400">{Math.round((metrics.downloads.completed / metrics.downloads.total) * 100)}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-red-500/20 rounded-lg">
                                    <FiXCircle className="h-5 w-5 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Erreurs</p>
                                    <p className="text-2xl font-bold text-white">{metrics.downloads.error}</p>
                                    <p className="text-xs text-red-400">{Math.round((metrics.downloads.error / metrics.downloads.total) * 100)}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-orange-500/20 rounded-lg">
                                    <FiXCircle className="h-5 w-5 text-orange-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-400">Annulés</p>
                                    <p className="text-2xl font-bold text-white">{metrics.downloads.cancelled}</p>
                                    <p className="text-xs text-orange-400">{Math.round((metrics.downloads.cancelled / metrics.downloads.total) * 100)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Graphique en secteurs - Téléchargements par type */}
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Téléchargements par type</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={downloadsByTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {downloadsByTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graphique en barres - Utilisateurs actifs */}
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Top 5 Utilisateurs Actifs</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topUsersData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                    <Bar dataKey="downloads" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Graphique linéaire - Téléchargements par jour */}
          {downloadsByDayData.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Téléchargements des 7 derniers jours</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={downloadsByDayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      fontSize={12}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

                    {/* Statut du site */}
                    {metrics.siteStatus && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="card">
                                <h3 className="text-lg font-semibold text-white mb-4">Statut Zone Téléchargement</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-3">
                                        <FiGlobe className="h-5 w-5 text-blue-400" />
                                        <div>
                                            <p className="text-sm text-gray-400">URL actuelle</p>
                                            <p className="text-white font-medium truncate">{metrics.siteStatus.currentUrl}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <FiClock className="h-5 w-5 text-green-400" />
                                        <div>
                                            <p className="text-sm text-gray-400">Temps de réponse</p>
                                            <p className="text-white font-medium">{metrics.siteStatus.responseTime}ms</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <div className={`p-1 rounded-full ${metrics.siteStatus.isHealthy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                            <div className={`h-2 w-2 rounded-full ${metrics.siteStatus.isHealthy ? 'bg-green-400' : 'bg-red-400'}`} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400">Statut</p>
                                            <p className={`font-medium ${metrics.siteStatus.isHealthy ? 'text-green-400' : 'text-red-400'}`}>
                                                {metrics.siteStatus.isHealthy ? 'En ligne' : 'Hors ligne'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                                    <FiArchive className="h-5 w-5 text-yellow-400" />
                                    <span>Historique des URLs</span>
                                </h3>
                                {metrics.siteStatus.urlHistory && metrics.siteStatus.urlHistory.length > 0 ? (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {metrics.siteStatus.urlHistory.map((url, index) => (
                                            <div key={index} className="flex items-center space-x-3 p-2 bg-dark-700/50 rounded-lg">
                                                <span className="text-xs text-gray-400 font-mono bg-dark-600 px-2 py-1 rounded">
                                                    #{metrics.siteStatus!.urlHistory.length - index}
                                                </span>
                                                <p className="text-sm text-gray-300 truncate flex-1">{url}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <FiArchive className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                                        <p className="text-gray-500 text-sm">Aucun historique d'URL disponible</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12">
                    <FiXCircle className="h-8 w-8 text-red-400 mx-auto mb-4" />
                    <p className="text-gray-400">Erreur lors du chargement des métriques</p>
                </div>
            )}
        </div>
    )
}

export default MetricsPage
