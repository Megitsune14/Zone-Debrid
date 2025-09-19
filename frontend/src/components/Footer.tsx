import { FiDownload } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-dark-800 border-t border-dark-700 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Logo et liens légaux */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <FiDownload className="h-5 w-5 text-primary-500" />
              <span className="text-lg font-bold text-white">Zone-Debrid</span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm">
              <Link 
                to="/privacy" 
                className="text-gray-400 hover:text-primary-400 transition-colors"
              >
                Politique de confidentialité
              </Link>
              <span className="text-gray-600">•</span>
              <Link 
                to="/terms" 
                className="text-gray-400 hover:text-primary-400 transition-colors"
              >
                Conditions d'utilisation
              </Link>
            </div>
          </div>
          
          {/* Signature et GitHub */}
          <div className="flex items-center space-x-4">
            <p className="text-gray-400 text-sm">
              Made with ❤️ by{' '}
              <a 
                href="https://github.com/Megitsune14" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 transition-colors font-medium"
              >
                Megitsune
              </a>
            </p>
            
            <a 
              href="https://github.com/Megitsune14/Zone-Debrid" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-primary-400 transition-colors"
              title="Voir le code source"
            >
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
