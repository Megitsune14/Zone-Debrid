import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiUsers, FiDownload, FiClock, FiBarChart, FiList, FiSearch, FiUserPlus } from 'react-icons/fi'
import adminService from '../../services/adminService'

const quickLinks = [
  {
    to: '/admin/downloads',
    icon: FiBarChart,
    title: 'Téléchargements',
    description: 'Métriques, liste et statut Zone Téléchargement',
    gradient: 'from-violet-500/20 to-purple-600/10',
    iconColor: 'text-violet-400'
  },
  {
    to: '/admin/searches',
    icon: FiSearch,
    title: 'Recherches',
    description: 'Historique des recherches des utilisateurs',
    gradient: 'from-amber-500/20 to-orange-600/10',
    iconColor: 'text-amber-400'
  },
  {
    to: '/admin/users',
    icon: FiUserPlus,
    title: 'Utilisateurs',
    description: 'Liste, rôle et création d’utilisateurs',
    gradient: 'from-blue-500/20 to-cyan-600/10',
    iconColor: 'text-blue-400'
  }
]

export default function AdminHomePage () {
  const [summary, setSummary] = useState<{
    usersTotal: number
    downloadsTotal: number
    downloadsLast24h: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    adminService
      .getDashboardSummary()
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-5xl">
      {/* En-tête */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
          Bienvenue sur le back-office
        </h1>
        <p className="text-gray-400 text-lg">
          Vue d’ensemble de l’activité. Utilisez le menu ou les raccourcis ci-dessous pour accéder aux sections.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Cartes statistiques */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Résumé
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-white/5 border border-white/10 p-6 animate-pulse"
              >
                <div className="h-10 w-10 rounded-lg bg-white/10 mb-4" />
                <div className="h-4 w-20 rounded bg-white/10 mb-2" />
                <div className="h-8 w-16 rounded bg-white/15" />
              </div>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="group rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/25 p-6 transition-all duration-200 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-blue-500/25">
                  <FiUsers className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-400/80">Total</span>
              </div>
              <p className="mt-4 text-2xl font-bold text-white tabular-nums">
                {summary.usersTotal}
              </p>
              <p className="mt-1 text-sm text-gray-400">Utilisateurs</p>
            </div>

            <div className="group rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/25 p-6 transition-all duration-200 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-emerald-500/25">
                  <FiDownload className="h-6 w-6 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-emerald-400/80">Total</span>
              </div>
              <p className="mt-4 text-2xl font-bold text-white tabular-nums">
                {summary.downloadsTotal}
              </p>
              <p className="mt-1 text-sm text-gray-400">Téléchargements</p>
            </div>

            <div className="group rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/25 p-6 transition-all duration-200 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/25">
                  <FiClock className="h-6 w-6 text-amber-400" />
                </div>
                <span className="text-xs font-medium text-amber-400/80">24 h</span>
              </div>
              <p className="mt-4 text-2xl font-bold text-white tabular-nums">
                {summary.downloadsLast24h}
              </p>
              <p className="mt-1 text-sm text-gray-400">Dernières 24 heures</p>
            </div>
          </div>
        ) : null}
      </section>

      {/* Accès rapide */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Accès rapide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-start gap-4 rounded-xl bg-white/[0.03] border border-white/10 p-5 transition-all duration-200 hover:bg-white/[0.06] hover:border-brand-primary/30 hover:shadow-lg hover:shadow-brand-primary/5"
              >
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${link.gradient} shrink-0`}>
                  <Icon className={`h-5 w-5 ${link.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white group-hover:text-brand-primary transition-colors">
                    {link.title}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">{link.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
