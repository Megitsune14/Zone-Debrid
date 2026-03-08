import { useState, useEffect, useCallback } from 'react'
import { FiPlus, FiTrash2, FiUser } from 'react-icons/fi'
import adminService, { type AdminUserListItem } from '../../services/adminService'

export default function AdminUsersPage () {
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createUsername, setCreateUsername] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createApiKey, setCreateApiKey] = useState('')
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await adminService.listUsers({ page, limit, search: search || undefined })
      setUsers(res.data)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch (err: any) {
      setError(err.message || 'Erreur')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, search])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!createUsername.trim() || !createPassword || !createApiKey.trim()) {
      setCreateError('Tous les champs sont requis.')
      return
    }
    setCreateSubmitting(true)
    try {
      await adminService.createUser({
        username: createUsername.trim(),
        password: createPassword,
        allDebridApiKey: createApiKey.trim()
      })
      setSuccess('Utilisateur créé.')
      setCreateModalOpen(false)
      setCreateUsername('')
      setCreatePassword('')
      setCreateApiKey('')
      fetchUsers()
    } catch (err: any) {
      setCreateError(err.message || 'Erreur')
    } finally {
      setCreateSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!id || deleteSubmitting) return
    setDeleteSubmitting(true)
    try {
      await adminService.deleteUser(id)
      setSuccess('Utilisateur supprimé.')
      setDeleteId(null)
      fetchUsers()
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    setRoleUpdatingId(userId)
    setError('')
    try {
      await adminService.updateUserRole(userId, newRole)
      setSuccess('Rôle mis à jour.')
      fetchUsers()
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally {
      setRoleUpdatingId(null)
    }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Utilisateurs</h1>
          <p className="text-gray-400">Liste, création, modification du rôle et suppression.</p>
        </div>
        <button type="button" onClick={() => setCreateModalOpen(true)} className="btn-primary flex items-center gap-2">
          <FiPlus className="h-4 w-4" />
          Créer un utilisateur
        </button>
      </div>

      {success && <div className="card border-green-500/30 text-green-400 mb-4">{success}</div>}
      {error && <div className="card border-red-500/30 text-red-400 mb-4">{error}</div>}

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Rechercher par nom..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
          className="input-field flex-1 min-w-[200px]"
        />
        <button type="button" onClick={() => setSearch(searchInput)} className="btn-secondary">
          Rechercher
        </button>
        <span className="text-sm text-gray-400 self-center">{total} utilisateur(s)</span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Aucun utilisateur</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600 text-left text-gray-400">
                <th className="pb-2 pr-4">Utilisateur</th>
                <th className="pb-2 pr-4">Rôle</th>
                <th className="pb-2 pr-4">Aria2</th>
                <th className="pb-2 pr-4">Créé le</th>
                <th className="pb-2 pr-4 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-700/50 hover:bg-brand-surface/30">
                  <td className="py-3 pr-4 font-medium text-white">{u.username}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as 'user' | 'admin')}
                      disabled={roleUpdatingId === u.id}
                      className="input-field py-1.5 px-2 text-sm w-auto min-w-[100px]"
                    >
                      <option value="user">Utilisateur</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{u.aria2Enabled ? 'Oui' : 'Non'}</td>
                  <td className="py-3 pr-4 text-gray-400">{formatDate(u.createdAt)}</td>
                  <td className="py-3 pr-4">
                    {deleteId === u.id ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(u.id)}
                          disabled={deleteSubmitting}
                          className="text-red-400 hover:underline text-xs"
                        >
                          Confirmer
                        </button>
                        <button type="button" onClick={() => setDeleteId(null)} className="text-gray-400 hover:underline text-xs">
                          Annuler
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteId(u.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Supprimer"
                      >
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-700">
            <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }} className="input-field w-20">
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary disabled:opacity-50">Précédent</button>
              <span className="text-sm text-gray-400">Page {page} / {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary disabled:opacity-50">Suivant</button>
            </div>
          </div>
        )}
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !createSubmitting && setCreateModalOpen(false)}>
          <div className="card max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FiUser className="h-5 w-5" />
              Créer un utilisateur
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {createError && <p className="text-sm text-red-400">{createError}</p>}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nom d’utilisateur</label>
                <input type="text" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} className="input-field w-full" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
                <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className="input-field w-full" required minLength={6} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Clé API AllDebrid</label>
                <input type="text" value={createApiKey} onChange={(e) => setCreateApiKey(e.target.value)} className="input-field w-full" required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setCreateModalOpen(false)} disabled={createSubmitting} className="btn-secondary flex-1">
                  Annuler
                </button>
                <button type="submit" disabled={createSubmitting} className="btn-primary flex-1">
                  {createSubmitting ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
