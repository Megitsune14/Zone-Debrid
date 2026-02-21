import { FiDownload, FiSearch, FiZap, FiShield, FiGlobe } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const HomePage = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const features = [
    {
      icon: <FiShield className="h-6 w-6" />,
      title: "Interface Moderne",
      description: "Interface React moderne avec design responsive et expérience utilisateur optimisée"
    },
    {
      icon: <FiZap className="h-6 w-6" />,
      title: "Scraping Temps Réel",
      description: "Recherche en temps réel avec extraction parallèle des données"
    },
    {
      icon: <FiSearch className="h-6 w-6" />,
      title: "Recherche Intelligente",
      description: "Algorithme de pertinence avancé pour des résultats précis et pertinents"
    }
  ]

  const handleStartSearch = () => {
    if (isAuthenticated) {
      navigate('/search')
    } else {
      navigate('/auth')
    }
  }

  return (
    <div className="space-y-8 sm:space-y-12 lg:space-y-16">
      {/* Hero Section */}
      <section className="text-center py-8 sm:py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <FiDownload className="h-12 w-12 sm:h-16 sm:w-16 text-brand-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            Zone-Debrid
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-300 mb-6 sm:mb-8 max-w-3xl mx-auto">
            Votre plateforme de recherche et téléchargement de contenu multimédia. 
            Recherchez des films, séries TV et animes en temps réel avec des informations détaillées sur les langues et qualités disponibles.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
            <button 
              onClick={handleStartSearch}
              className="btn-primary flex items-center justify-center space-x-2 text-base sm:text-lg px-6 sm:px-8 py-3"
            >
              <FiSearch className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>
                {isAuthenticated ? 'Commencer la recherche' : 'Se connecter pour rechercher'}
              </span>
            </button>
            {!isAuthenticated && (
              <button 
                onClick={() => navigate('/auth?mode=register')}
                className="btn-secondary flex items-center justify-center space-x-2 text-base sm:text-lg px-6 sm:px-8 py-3"
              >
                <FiGlobe className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Créer un compte</span>
              </button>
            )}
          </div>
          {!isAuthenticated && (
            <p className="text-xs sm:text-sm text-gray-400 mt-3 sm:mt-4">
              🔐 Créez un compte gratuit pour accéder à toutes les fonctionnalités de recherche
            </p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Pourquoi choisir Zone-Debrid ?
            </h2>
            <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
              Une plateforme moderne et intuitive pour rechercher et découvrir du contenu sans limite
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:bg-brand-surface-hover transition-colors duration-200">
                <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-4">
                  <div className="p-2 sm:p-3 bg-brand-primary/20 rounded-lg text-brand-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-sm sm:text-base text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Comment ça fonctionne ?
            </h2>
            <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto">
              Trois étapes simples pour accéder à votre contenu préféré
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-brand rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-lg sm:text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
                {isAuthenticated ? 'Recherchez' : 'Créez un compte'}
              </h3>
              <p className="text-sm sm:text-base text-gray-300">
                {isAuthenticated 
                  ? 'Tapez le nom de votre film, série ou anime dans la barre de recherche'
                  : 'Inscrivez-vous gratuitement avec votre clé API AllDebrid'
                }
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-brand rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-lg sm:text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
                {isAuthenticated ? 'Sélectionnez' : 'Recherchez'}
              </h3>
              <p className="text-sm sm:text-base text-gray-300">
                {isAuthenticated 
                  ? 'Choisissez la langue et la qualité qui vous conviennent'
                  : 'Tapez le nom de votre film, série ou anime dans la barre de recherche'
                }
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-brand rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <span className="text-lg sm:text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">
                {isAuthenticated ? 'Téléchargez' : 'Sélectionnez'}
              </h3>
              <p className="text-sm sm:text-base text-gray-300">
                {isAuthenticated 
                  ? 'Lancez le téléchargement et profitez de votre contenu'
                  : 'Choisissez la langue et la qualité qui vous conviennent'
                }
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage
