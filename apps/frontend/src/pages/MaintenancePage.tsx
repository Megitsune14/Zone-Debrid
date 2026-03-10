import { FiAlertTriangle } from 'react-icons/fi'

interface MaintenancePageProps {
  message?: string
}

export default function MaintenancePage ({ message }: MaintenancePageProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="card max-w-xl w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-amber-500/20">
            <FiAlertTriangle className="h-8 w-8 text-amber-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Site en maintenance
        </h1>
        <p className="text-gray-300 mb-4">
          Nous effectuons actuellement une maintenance sur le service.
        </p>
        <p className="text-sm text-gray-400 whitespace-pre-line">
          {message ?? 'Le site est temporairement indisponible. Merci de revenir dans quelques minutes.'}
        </p>
      </div>
    </div>
  )
}

