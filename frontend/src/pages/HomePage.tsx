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
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <FiDownload className="h-16 w-16 text-primary-500" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-6">
            Zone-Debrid
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Votre plateforme de recherche et téléchargement de contenu multimédia. 
            Recherchez des films, séries TV et animes en temps réel avec des informations détaillées sur les langues et qualités disponibles.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={handleStartSearch}
              className="btn-primary flex items-center space-x-2 text-lg px-8 py-3"
            >
              <FiSearch className="h-5 w-5" />
              <span>
                {isAuthenticated ? 'Commencer la recherche' : 'Se connecter pour rechercher'}
              </span>
            </button>
            {!isAuthenticated && (
              <button 
                onClick={() => navigate('/auth?mode=register')}
                className="btn-secondary flex items-center space-x-2 text-lg px-8 py-3"
              >
                <FiGlobe className="h-5 w-5" />
                <span>Créer un compte</span>
              </button>
            )}
          </div>
          {!isAuthenticated && (
            <p className="text-sm text-gray-400 mt-4">
              🔐 Créez un compte gratuit pour accéder à toutes les fonctionnalités de recherche
            </p>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pourquoi choisir Zone-Debrid ?
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Une plateforme moderne et intuitive pour rechercher et découvrir du contenu sans limite
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card hover:bg-dark-700 transition-colors duration-200">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="p-3 bg-primary-500/20 rounded-lg text-primary-400">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                </div>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Comment ça fonctionne ?
            </h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Trois étapes simples pour accéder à votre contenu préféré
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {isAuthenticated ? 'Recherchez' : 'Créez un compte'}
              </h3>
              <p className="text-gray-300">
                {isAuthenticated 
                  ? 'Tapez le nom de votre film, série ou anime dans la barre de recherche'
                  : 'Inscrivez-vous gratuitement avec votre clé API AllDebrid'
                }
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {isAuthenticated ? 'Sélectionnez' : 'Recherchez'}
              </h3>
              <p className="text-gray-300">
                {isAuthenticated 
                  ? 'Choisissez la langue et la qualité qui vous conviennent'
                  : 'Tapez le nom de votre film, série ou anime dans la barre de recherche'
                }
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {isAuthenticated ? 'Téléchargez' : 'Sélectionnez'}
              </h3>
              <p className="text-gray-300">
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
