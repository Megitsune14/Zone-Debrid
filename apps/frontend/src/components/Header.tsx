import { FiDownload, FiSearch, FiSettings, FiHome, FiUser, FiLogOut, FiLogIn, FiChevronDown, FiBarChart } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useRef, useEffect } from 'react'

const Header = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAuthenticated } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isHomePage = location.pathname === '/'
  const isSearchPage = location.pathname === '/search'
  const isDownloadsPage = location.pathname === '/downloads'
  const isSettingsPage = location.pathname === '/settings'
  const isMetricsPage = location.pathname === '/metrics'

  // Fonction pour capitaliser la première lettre
  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsDropdownOpen(false)
  }

  const handleLogin = () => {
    navigate('/auth')
  }

  const handleSettings = () => {
    navigate('/settings')
    setIsDropdownOpen(false)
  }

  const handleMetrics = () => {
    navigate('/metrics')
    setIsDropdownOpen(false)
  }

  const handleDownloads = () => {
    navigate('/downloads')
    setIsDropdownOpen(false)
  }

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="panel-glass border-b border-brand-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div 
              className="flex items-center space-x-1 sm:space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
              <FiDownload className="h-6 w-6 sm:h-8 sm:w-8 text-brand-primary" />
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Zone-Debrid</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <nav className="flex items-center space-x-2 lg:space-x-4">
              <button 
                onClick={() => navigate('/')}
                className={`btn-secondary flex items-center space-x-1 lg:space-x-2 text-sm lg:text-base ${isHomePage ? 'bg-gradient-brand text-white border-brand-primary' : ''}`}
              >
                <FiHome className="h-4 w-4" />
                <span className="hidden lg:inline">Accueil</span>
              </button>
              {isAuthenticated && (
                <>
                  <button 
                    onClick={() => navigate('/search')}
                    className={`btn-secondary flex items-center space-x-1 lg:space-x-2 text-sm lg:text-base ${isSearchPage ? 'bg-gradient-brand text-white border-brand-primary' : ''}`}
                  >
                    <FiSearch className="h-4 w-4" />
                    <span className="hidden lg:inline">Recherche</span>
                  </button>
                  <button 
                    onClick={handleDownloads}
                    className={`btn-secondary flex items-center space-x-1 lg:space-x-2 text-sm lg:text-base ${isDownloadsPage ? 'bg-gradient-brand text-white border-brand-primary' : ''}`}
                  >
                    <FiDownload className="h-4 w-4" />
                    <span className="hidden lg:inline">Téléchargements</span>
                  </button>
                </>
              )}
            </nav>

            {/* Section utilisateur */}
            <div className="flex items-center space-x-2 sm:space-x-3 border-l border-brand-border pl-2 sm:pl-4">
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-2 sm:space-x-3 bg-brand-surface px-2 sm:px-3 py-2 rounded-lg hover:bg-brand-surface-hover border border-brand-border hover:border-brand-border-hover transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <FiUser className="h-4 w-4 sm:h-5 sm:w-5 text-brand-primary" />
                      <span className="text-sm sm:text-base font-medium text-white hidden sm:inline">
                        {user?.username ? capitalizeFirstLetter(user.username) : ''}
                      </span>
                    </div>
                    <FiChevronDown 
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        isDropdownOpen ? 'rotate-180' : ''
                      }`} 
                    />
                  </button>

                  {/* Menu déroulant */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-40 sm:w-48 panel-glass shadow-xl z-50">
                      <div className="py-1">
                        <button
                          onClick={handleSettings}
                          className={`flex items-center space-x-2 sm:space-x-3 w-full px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors duration-200 text-sm sm:text-base ${
                            isSettingsPage 
                              ? 'bg-gradient-brand text-white' 
                              : 'text-gray-300 hover:bg-brand-surface-hover hover:text-white'
                          }`}
                        >
                          <FiSettings className="h-4 w-4" />
                          <span>Paramètres</span>
                        </button>
                        {user?.username === 'megitsune' && (
                          <button
                            onClick={handleMetrics}
                            className={`flex items-center space-x-2 sm:space-x-3 w-full px-3 sm:px-4 py-2 sm:py-3 text-left transition-colors duration-200 text-sm sm:text-base ${
                              isMetricsPage 
                                ? 'bg-gradient-brand text-white' 
                                : 'text-gray-300 hover:bg-brand-surface-hover hover:text-white'
                            }`}
                          >
                            <FiBarChart className="h-4 w-4" />
                            <span>Métriques</span>
                          </button>
                        )}
                        <div className="border-t border-brand-border my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 sm:space-x-3 w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-red-400 hover:bg-brand-surface-hover hover:text-red-300 transition-colors duration-200 text-sm sm:text-base"
                        >
                          <FiLogOut className="h-4 w-4" />
                          <span>Déconnexion</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="btn-primary flex items-center space-x-2"
                >
                  <FiLogIn className="h-4 w-4" />
                  <span>Se connecter</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
