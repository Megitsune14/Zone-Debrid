import { useState, useEffect, useCallback } from 'react'
import { FiBarChart, FiList, FiGlobe, FiUsers, FiDownload, FiCheckCircle, FiClock, FiGlobe as FiGlobeIcon, FiArchive, FiXCircle, FiHardDrive } from 'react-icons/fi'
import metricsService, { type DownloadListItem } from '../../services/metricsService'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

type TabId = 'metrics' | 'list' | 'zone'

const STATUS_LABELS: Record<string, string> = {
  downloading: 'En cours',
  completed: 'Terminé',
  error: 'Erreur',
  cancelled: 'Annulé',
  paused: 'En pause'
}
const TYPE_LABELS: Record<string, string> = {
  films: 'Films',
  series: 'Séries',
  mangas: 'Mangas'
}

function formatBytes (bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Go`
}
function formatDate (dateStr: string): string {
  return new Date(dateStr).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AdminDownloadsPage () {
  const [activeTab, setActiveTab] = useState<TabId>('metrics')
  const [metrics, setMetrics] = useState<any>(null)
  const [metricsLoading, setMetricsLoading] = useState(false)

  const [downloadsList, setDownloadsList] = useState<DownloadListItem[]>([])
  const [downloadsTotal, setDownloadsTotal] = useState(0)
  const [downloadsPage, setDownloadsPage] = useState(1)
  const [downloadsLimit, setDownloadsLimit] = useState(20)
  const [downloadsTotalPages, setDownloadsTotalPages] = useState(0)
  const [downloadsLoading, setDownloadsLoading] = useState(false)
  const [downloadsSortBy, setDownloadsSortBy] = useState('createdAt')
  const [downloadsSortOrder, setDownloadsSortOrder] = useState<'asc' | 'desc'>('desc')
  const [downloadsFilterStatus, setDownloadsFilterStatus] = useState('')
  const [downloadsFilterType, setDownloadsFilterType] = useState('')
  const [downloadsSearch, setDownloadsSearch] = useState('')
  const [downloadsSearchInput, setDownloadsSearchInput] = useState('')

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true)
    try {
      const res = await metricsService.getMetrics()
      setMetrics(res.data)
    } catch {
      setMetrics(null)
    } finally {
      setMetricsLoading(false)
    }
  }, [])

  const fetchDownloadsList = useCallback(async () => {
    setDownloadsLoading(true)
    try {
      const res = await metricsService.getDownloadsList({
        page: downloadsPage,
        limit: downloadsLimit,
        sortBy: downloadsSortBy,
        sortOrder: downloadsSortOrder,
        ...(downloadsFilterStatus && { status: downloadsFilterStatus }),
        ...(downloadsFilterType && { type: downloadsFilterType }),
        ...(downloadsSearch && { search: downloadsSearch })
      })
      setDownloadsList(res.data)
      setDownloadsTotal(res.total)
      setDownloadsTotalPages(res.totalPages)
    } catch {
      setDownloadsList([])
    } finally {
      setDownloadsLoading(false)
    }
  }, [downloadsPage, downloadsLimit, downloadsSortBy, downloadsSortOrder, downloadsFilterStatus, downloadsFilterType, downloadsSearch])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  useEffect(() => {
    fetchDownloadsList()
  }, [fetchDownloadsList])

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  const downloadsByTypeData = metrics?.downloads?.byType?.map((item: { _id: string; count: number }, index: number) => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: item.count,
    color: COLORS[index % COLORS.length]
  })) ?? []
  const downloadsByDayData = metrics?.downloads?.byDay?.map((item: { _id: string; count: number }) => ({
    date: item._id,
    count: item.count
  })) ?? []
  const topUsersData = metrics?.topUsers?.slice(0, 5).map((u: { username: string; downloadCount: number }, index: number) => ({
    name: u.username,
    downloads: u.downloadCount,
    color: COLORS[index % COLORS.length]
  })) ?? []

  const tabs: { id: TabId; label: string; icon: typeof FiBarChart }[] = [
    { id: 'metrics', label: 'Métriques', icon: FiBarChart },
    { id: 'list', label: 'Liste des téléchargements', icon: FiList },
    { id: 'zone', label: 'Zone Téléchargement', icon: FiGlobe }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Téléchargements</h1>
      <p className="text-gray-400 mb-6">Métriques, liste et statut Zone Téléchargement.</p>

      <div className="flex gap-2 border-b border-brand-border mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'metrics' && (
        <div>
          {metricsLoading ? (
            <div className="card text-center py-8 text-gray-400">Chargement...</div>
          ) : metrics ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="card flex items-center gap-3">
                  <FiUsers className="h-6 w-6 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-400">Utilisateurs</p>
                    <p className="text-xl font-bold text-white">{metrics.users?.total ?? 0}</p>
                    <p className="text-xs text-green-400">+{metrics.users?.recent ?? 0} cette semaine</p>
                  </div>
                </div>
                <div className="card flex items-center gap-3">
                  <FiDownload className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="text-xs text-gray-400">Téléchargements</p>
                    <p className="text-xl font-bold text-white">{metrics.downloads?.total ?? 0}</p>
                  </div>
                </div>
                <div className="card flex items-center gap-3">
                  <FiCheckCircle className="h-6 w-6 text-green-400" />
                  <div>
                    <p className="text-xs text-gray-400">Terminés</p>
                    <p className="text-xl font-bold text-white">{metrics.downloads?.completed ?? 0}</p>
                    <p className="text-xs text-green-400">
                      {metrics.downloads?.total > 0 ? `${Math.round((metrics.downloads.completed / metrics.downloads.total) * 100)}%` : '—'}
                    </p>
                  </div>
                </div>
                <div className="card flex items-center gap-3">
                  <FiXCircle className="h-6 w-6 text-red-400" />
                  <div>
                    <p className="text-xs text-gray-400">Erreurs</p>
                    <p className="text-xl font-bold text-white">{metrics.downloads?.error ?? 0}</p>
                    <p className="text-xs text-red-400">
                      {metrics.downloads?.total > 0 ? `${Math.round((metrics.downloads.error / metrics.downloads.total) * 100)}%` : '—'}
                    </p>
                  </div>
                </div>
                <div className="card flex items-center gap-3">
                  <FiXCircle className="h-6 w-6 text-orange-400" />
                  <div>
                    <p className="text-xs text-gray-400">Annulés</p>
                    <p className="text-xl font-bold text-white">{metrics.downloads?.cancelled ?? 0}</p>
                  </div>
                </div>
                <div className="card flex items-center gap-3">
                  <FiClock className="h-6 w-6 text-cyan-400" />
                  <div>
                    <p className="text-xs text-gray-400">Dernières 24 h</p>
                    <p className="text-xl font-bold text-white">{metrics.downloads?.last24h ?? 0}</p>
                  </div>
                </div>
                {metrics.downloads?.totalVolumeBytes != null && metrics.downloads.totalVolumeBytes > 0 && (
                  <div className="card flex items-center gap-3">
                    <FiHardDrive className="h-6 w-6 text-violet-400" />
                    <div>
                      <p className="text-xs text-gray-400">Volume total</p>
                      <p className="text-xl font-bold text-white">{formatBytes(metrics.downloads.totalVolumeBytes)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card w-full min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-4">Téléchargements par type</h3>
                  <div className="w-full" style={{ height: 256 }}>
                    <ResponsiveContainer width="100%" height={256}>
                      <PieChart>
                        <Pie
                          data={downloadsByTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {downloadsByTypeData.map((entry: { color: string }, index: number) => (
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
                <div className="card w-full min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-4">Top 5 Utilisateurs actifs</h3>
                  <div className="w-full" style={{ height: 256 }}>
                    <ResponsiveContainer width="100%" height={256}>
                      <BarChart data={topUsersData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
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

              {downloadsByDayData.length > 0 && (
                <div className="card w-full min-w-0">
                  <h3 className="text-lg font-semibold text-white mb-4">Téléchargements des 7 derniers jours</h3>
                  <div className="w-full" style={{ height: 256 }}>
                    <ResponsiveContainer width="100%" height={256}>
                      <LineChart data={downloadsByDayData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
                        <YAxis stroke="#9CA3AF" fontSize={12} />
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
            </div>
          ) : (
            <div className="card text-red-400 py-8 text-center">Erreur chargement métriques.</div>
          )}
        </div>
      )}

      {activeTab === 'list' && (
        <div className="card">
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="Rechercher (titre ou utilisateur)..."
              value={downloadsSearchInput}
              onChange={(e) => setDownloadsSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setDownloadsSearch(downloadsSearchInput), setDownloadsPage(1))}
              className="input-field flex-1 min-w-[180px]"
            />
            <button type="button" onClick={() => { setDownloadsSearch(downloadsSearchInput); setDownloadsPage(1) }} className="btn-primary">
              Rechercher
            </button>
            <select value={downloadsFilterStatus} onChange={(e) => { setDownloadsFilterStatus(e.target.value); setDownloadsPage(1) }} className="input-field w-auto">
              <option value="">Tous les statuts</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={downloadsFilterType} onChange={(e) => { setDownloadsFilterType(e.target.value); setDownloadsPage(1) }} className="input-field w-auto">
              <option value="">Tous les types</option>
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="text-sm text-gray-400 self-center">{downloadsTotal} résultat(s)</span>
          </div>
          <div className="overflow-x-auto">
            {downloadsLoading ? (
              <div className="py-8 text-center text-gray-400">Chargement...</div>
            ) : downloadsList.length === 0 ? (
              <div className="py-8 text-center text-gray-500">Aucun téléchargement</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600 text-left text-gray-400">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Utilisateur</th>
                    <th className="pb-2 pr-4">Titre</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Statut</th>
                    <th className="pb-2 pr-4">Taille</th>
                  </tr>
                </thead>
                <tbody>
                  {downloadsList.map((row) => (
                    <tr key={row._id} className="border-b border-gray-700/50 hover:bg-brand-surface/30">
                      <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                      <td className="py-3 pr-4 font-medium text-white">{row.username}</td>
                      <td className="py-3 pr-4 text-gray-300 max-w-[200px] truncate" title={row.title}>{row.title}</td>
                      <td className="py-3 pr-4">{TYPE_LABELS[row.type] ?? row.type}</td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          row.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          row.status === 'error' ? 'bg-red-500/20 text-red-400' :
                          row.status === 'cancelled' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-400">{row.fileSize != null ? formatBytes(row.fileSize) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {downloadsTotalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-700">
              <select value={downloadsLimit} onChange={(e) => { setDownloadsLimit(Number(e.target.value)); setDownloadsPage(1) }} className="input-field w-20">
                {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setDownloadsPage((p) => Math.max(1, p - 1))} disabled={downloadsPage <= 1} className="btn-secondary disabled:opacity-50">Précédent</button>
                <span className="text-sm text-gray-400">Page {downloadsPage} / {downloadsTotalPages}</span>
                <button type="button" onClick={() => setDownloadsPage((p) => Math.min(downloadsTotalPages, p + 1))} disabled={downloadsPage >= downloadsTotalPages} className="btn-secondary disabled:opacity-50">Suivant</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'zone' && (
        <div>
          {metricsLoading ? (
            <div className="card text-center py-8 text-gray-400">Chargement...</div>
          ) : metrics?.siteStatus ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FiGlobeIcon className="h-5 w-5 text-blue-400" />
                  Statut Zone Téléchargement
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">URL actuelle</p>
                    <p className="text-white font-medium truncate">{metrics.siteStatus.currentUrl}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Temps de réponse</p>
                    <p className="text-white font-medium">{metrics.siteStatus.responseTime} ms</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-full ${metrics.siteStatus.isHealthy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                      <div className={`h-2 w-2 rounded-full ${metrics.siteStatus.isHealthy ? 'bg-green-400' : 'bg-red-400'}`} />
                    </div>
                    <span className={metrics.siteStatus.isHealthy ? 'text-green-400' : 'text-red-400'}>
                      {metrics.siteStatus.isHealthy ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FiArchive className="h-5 w-5 text-amber-400" />
                  Historique des URLs
                </h3>
                {metrics.siteStatus.urlHistory?.length ? (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {metrics.siteStatus.urlHistory.map((url: string, i: number) => (
                      <li key={i} className="p-2 bg-brand-surface/50 rounded text-sm text-gray-300 truncate">{url}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">Aucun historique</p>
                )}
              </div>
            </div>
          ) : (
            <div className="card text-gray-500 text-center py-8">Aucune donnée de statut disponible.</div>
          )}
        </div>
      )}
    </div>
  )
}
