import { useState, useEffect, useCallback } from 'react'
import adminService, { type SearchHistoryItem } from '../../services/adminService'

export default function AdminSearchesPage () {
  const [items, setItems] = useState<SearchHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const fetchSearches = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminService.listSearches({
        page,
        limit,
        search: search || undefined,
        type: typeFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined
      })
      setItems(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, typeFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchSearches()
  }, [fetchSearches])

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

  const applyFilters = () => {
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Recherches</h1>
        <p className="text-gray-400">Historique des recherches effectuées par les utilisateurs (requête, type, année).</p>
      </div>

      {error && <div className="card border-red-500/30 text-red-400 mb-4">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Rechercher dans la requête..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
          className="input-field flex-1 min-w-[180px]"
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="input-field w-auto min-w-[120px]"
        >
          <option value="">Tous les types</option>
          <option value="films">Films</option>
          <option value="series">Séries</option>
          <option value="mangas">Mangas</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="input-field w-auto"
          title="Du"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="input-field w-auto"
          title="Au"
        />
        <button type="button" onClick={applyFilters} className="btn-secondary">
          Filtrer
        </button>
        <span className="text-sm text-gray-400 self-center">{total} recherche(s)</span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Aucune recherche</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600 text-left text-gray-400">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Utilisateur</th>
                <th className="pb-2 pr-4">Requête</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Année</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-gray-700/50 hover:bg-brand-surface/30">
                  <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td className="py-3 pr-4 font-medium text-white">{row.username}</td>
                  <td className="py-3 pr-4 text-white break-all">{row.query}</td>
                  <td className="py-3 pr-4 text-gray-400">{row.type ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-400">{row.year ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-700">
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}
              className="input-field w-20"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary disabled:opacity-50"
              >
                Précédent
              </button>
              <span className="text-sm text-gray-400">Page {page} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-secondary disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
