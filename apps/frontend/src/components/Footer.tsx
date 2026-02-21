import { FiDownload } from 'react-icons/fi'
import { Link } from 'react-router-dom'

const Footer = () => {
  return (
    <footer className="bg-brand-surface border-t border-brand-border mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Logo et liens légaux */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
            <div className="flex items-center space-x-2">
              <FiDownload className="h-4 w-4 sm:h-5 sm:w-5 text-brand-primary" />
              <span className="text-base sm:text-lg font-bold text-white">Zone-Debrid</span>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm">
              <Link 
                to="/faq" 
                className="text-gray-400 hover:text-brand-primary transition-colors"
              >
                FAQ
              </Link>
              <span className="text-gray-500 hidden sm:inline">•</span>
              <Link 
                to="/privacy" 
                className="text-gray-400 hover:text-brand-primary transition-colors"
              >
                Politique de confidentialité
              </Link>
              <span className="text-gray-500 hidden sm:inline">•</span>
              <Link 
                to="/terms" 
                className="text-gray-400 hover:text-brand-primary transition-colors"
              >
                Conditions d'utilisation
              </Link>
            </div>
          </div>
          
          {/* Signature et GitHub */}
          <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4">
            <p className="text-gray-400 text-xs sm:text-sm">
              Made with ❤️ by{' '}
              <a 
                href="https://github.com/Megitsune14" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-brand-primary hover:text-brand-variant transition-colors font-medium"
              >
                Megitsune
              </a>
            </p>
            
            <a 
              href="https://github.com/Megitsune14/Zone-Debrid" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-brand-primary transition-colors"
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
