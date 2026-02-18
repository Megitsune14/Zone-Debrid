import { useEffect } from 'react'
import { FiAlertTriangle, FiX, FiSettings } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

interface InvalidApiKeyModalProps {
    isOpen: boolean
    onClose: () => void
    message?: string
}

const InvalidApiKeyModal = ({ isOpen, onClose, message }: InvalidApiKeyModalProps) => {
    const navigate = useNavigate()

    // Fermer la modal avec Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            // Empêcher le scroll du body
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    const handleGoToSettings = () => {
        onClose()
        navigate('/settings')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-dark-800 border border-red-500/20 rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
                {/* Bouton de fermeture */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 transition-colors"
                >
                    <FiX className="h-5 w-5" />
                </button>

                {/* Icône d'alerte */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-500/20 rounded-full">
                        <FiAlertTriangle className="h-12 w-12 text-red-400" />
                    </div>
                </div>

                {/* Titre */}
                <h2 className="text-2xl font-bold text-white text-center mb-4">
                    Clé AllDebrid Invalide
                </h2>

                {/* Message */}
                <p className="text-gray-300 text-center mb-8 leading-relaxed">
                    {message || 'Votre clé API AllDebrid n\'est pas valide ou a expiré. Veuillez la mettre à jour dans vos paramètres pour continuer à utiliser le service.'}
                </p>

                {/* Boutons d'action */}
                <div className="flex flex-col space-y-3">
                    <button
                        onClick={handleGoToSettings}
                        className="btn-primary w-full flex items-center justify-center space-x-2 py-3"
                    >
                        <FiSettings className="h-5 w-5" />
                        <span>Aller aux Paramètres</span>
                    </button>

                    <button
                        onClick={onClose}
                        className="btn-secondary w-full py-3"
                    >
                        Fermer
                    </button>
                </div>

                {/* Lien d'aide */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Besoin d'aide ?{' '}
                        <a
                            href="https://alldebrid.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-400 hover:text-primary-300 underline"
                        >
                            Obtenez votre clé sur AllDebrid
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default InvalidApiKeyModal
