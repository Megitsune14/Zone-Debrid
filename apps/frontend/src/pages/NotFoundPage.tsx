import { Link } from 'react-router-dom'
import { FiHome, FiAlertCircle } from 'react-icons/fi'

const NotFoundPage = () => {
  return (
    <div className="max-w-xl mx-auto text-center">
      <div className="card flex flex-col items-center gap-6 py-12">
          <div className="p-4 bg-amber-500/20 rounded-full">
            <FiAlertCircle className="h-16 w-16 text-amber-400" />
          </div>
          <div>
            <h1 className="text-6xl font-bold text-white mb-2">404</h1>
            <p className="text-gray-400 text-lg">
              Cette page n&apos;existe pas ou a été déplacée.
            </p>
          </div>
          <Link
            to="/"
            className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3"
          >
            <FiHome className="h-5 w-5" />
            Retour à l&apos;accueil
          </Link>
        </div>
    </div>
  )
}

export default NotFoundPage
