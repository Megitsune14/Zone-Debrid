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
    <header className="bg-dark-800 border-b border-dark-700">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate('/')}
            >
              <FiDownload className="h-8 w-8 text-primary-500" />
              <h1 className="text-2xl font-bold text-white">Zone-Debrid</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <nav className="flex items-center space-x-4">
              <button 
                onClick={() => navigate('/')}
                className={`btn-secondary flex items-center space-x-2 ${isHomePage ? 'bg-primary-600 text-white' : ''}`}
              >
                <FiHome className="h-4 w-4" />
                <span>Accueil</span>
              </button>
              {isAuthenticated && (
                <button 
                  onClick={() => navigate('/search')}
                  className={`btn-secondary flex items-center space-x-2 ${isSearchPage ? 'bg-primary-600 text-white' : ''}`}
                >
                  <FiSearch className="h-4 w-4" />
                  <span>Recherche</span>
                </button>
              )}
            </nav>

            {/* Section utilisateur */}
            <div className="flex items-center space-x-3 border-l border-dark-600 pl-4">
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center space-x-3 bg-dark-700 px-3 py-2 rounded-lg hover:bg-dark-600 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <FiUser className="h-5 w-5 text-primary-400" />
                      <span className="text-base font-medium text-white">
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
                    <div className="absolute right-0 mt-2 w-48 bg-dark-700 border border-dark-600 rounded-lg shadow-lg z-50">
                      <div className="py-1">
                        <button
                          onClick={handleSettings}
                          className={`flex items-center space-x-3 w-full px-4 py-3 text-left transition-colors duration-200 ${
                            isSettingsPage 
                              ? 'bg-primary-600 text-white' 
                              : 'text-gray-300 hover:bg-dark-600 hover:text-white'
                          }`}
                        >
                          <FiSettings className="h-4 w-4" />
                          <span>Paramètres</span>
                        </button>
                        {user?.username === 'megitsune' && (
                          <button
                            onClick={handleMetrics}
                            className={`flex items-center space-x-3 w-full px-4 py-3 text-left transition-colors duration-200 ${
                              isMetricsPage 
                                ? 'bg-primary-600 text-white' 
                                : 'text-gray-300 hover:bg-dark-600 hover:text-white'
                            }`}
                          >
                            <FiBarChart className="h-4 w-4" />
                            <span>Métriques</span>
                          </button>
                        )}
                        <div className="border-t border-dark-600 my-1"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-3 w-full px-4 py-3 text-left text-red-400 hover:bg-dark-600 hover:text-red-300 transition-colors duration-200"
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
