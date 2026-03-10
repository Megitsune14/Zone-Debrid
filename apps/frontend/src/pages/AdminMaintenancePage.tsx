import { useEffect, useState } from 'react'
import { FiAlertTriangle, FiSave } from 'react-icons/fi'
import adminService, { type MaintenanceConfig } from '../services/adminService'

export default function AdminMaintenancePage () {
  const [config, setConfig] = useState<MaintenanceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await adminService.getMaintenanceConfig()
        setConfig(res.data)
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement de la configuration')
      } finally {
        setLoading(false)
      }
    }
    void fetchConfig()
  }, [])

  const handleToggle = (checked: boolean) => {
    if (!config) return
    setConfig({ ...config, maintenanceEnabled: checked })
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!config) return
    setConfig({ ...config, maintenanceMessage: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await adminService.updateMaintenanceConfig(config)
      setConfig(res.data)
      setSuccess('Configuration de maintenance mise à jour.')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <FiAlertTriangle className="h-6 w-6 text-amber-400" />
          Mode maintenance
        </h1>
        <p className="text-gray-400">
          Activez le mode maintenance pour afficher une page dédiée aux utilisateurs, avec un message personnalisé.
        </p>
      </div>

      {error && (
        <div className="card border-red-500/30 text-red-400 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="card border-green-500/30 text-green-400 mb-4">
          {success}
        </div>
      )}

      {loading || !config ? (
        <div className="card text-gray-400 py-8 text-center">
          Chargement de la configuration...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="card space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Activer le mode maintenance</p>
                <p className="text-xs text-gray-400 mt-1">
                  Lorsque ce mode est actif, les utilisateurs non-admin verront une page de maintenance à la place du site.
                </p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <span className="mr-3 text-sm text-gray-300">{config.maintenanceEnabled ? 'Activé' : 'Désactivé'}</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={config.maintenanceEnabled}
                    onChange={(e) => handleToggle(e.target.checked)}
                  />
                  <div className={`block w-11 h-6 rounded-full ${config.maintenanceEnabled ? 'bg-amber-500' : 'bg-gray-600'}`} />
                  <div
                    className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      config.maintenanceEnabled ? 'translate-x-5' : ''
                    }`}
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-white">
                Message affiché sur la page de maintenance
              </label>
              <span className="text-xs text-gray-500">
                Ce texte sera visible par tous les utilisateurs.
              </span>
            </div>
            <textarea
              value={config.maintenanceMessage}
              onChange={handleMessageChange}
              rows={4}
              className="input-field w-full resize-none"
              placeholder="Ex: Le site est temporairement en maintenance pour une mise à jour. Merci de revenir plus tard."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              <FiSave className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

