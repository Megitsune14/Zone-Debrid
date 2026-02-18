import { FiShield } from 'react-icons/fi'

const PrivacyPolicyPage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-blue-500/20 rounded-lg">
            <FiShield className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Politique de Confidentialité</h1>
            {/* <p className="text-gray-400">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p> */}
            <p className="text-gray-400">Dernière mise à jour : 19/09/2025</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">

        {/* Collecte des données */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Données collectées</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Données d'authentification</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Nom d'utilisateur (unique, 3-30 caractères)</li>
                <li>• Mot de passe (haché avec bcrypt avant stockage)</li>
                <li>• Clé API AllDebrid (chiffrée avec AES-256-CBC)</li>
                <li>• Dates de création et de modification du compte</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Données de téléchargement</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Titre et type de contenu (films, séries, mangas)</li>
                <li>• Métadonnées (langue, qualité, saison, épisodes)</li>
                <li>• URLs de téléchargement et noms de fichiers</li>
                <li>• Tailles de fichiers et durées de téléchargement</li>
                <li>• Statuts et messages d'erreur</li>
                <li>• Horodatage de toutes les activités</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Données techniques</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Logs d'activité et de connexion</li>
                <li>• Identifiants de session Socket.IO</li>
                <li>• Métriques d'utilisation du service</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Utilisation des données */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Utilisation des données</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Fonctionnalités du service</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Authentification et gestion des comptes utilisateur</li>
                <li>• Traitement et suivi des téléchargements</li>
                <li>• Intégration avec les services AllDebrid</li>
                <li>• Historique personnel des téléchargements</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Métriques et analyses</h3>
              <p className="text-gray-300 leading-relaxed mb-2">
                Nous utilisons vos données de téléchargement pour générer des statistiques et métriques, notamment :
              </p>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Nombre total de téléchargements par utilisateur</li>
                <li>• Taux de réussite des téléchargements</li>
                <li>• Types de contenu les plus téléchargés</li>
                <li>• Tailles moyennes des fichiers</li>
                <li>• Temps de traitement des téléchargements</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Amélioration du service</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Diagnostic et résolution des erreurs</li>
                <li>• Optimisation des performances</li>
                <li>• Développement de nouvelles fonctionnalités</li>
                <li>• Monitoring de la santé du système</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Conservation des données */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Conservation des données</h2>
          <div className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-400 mb-2">⚠️ Important : Données conservées pour les métriques</h3>
              <p className="text-gray-300 leading-relaxed">
                <strong>Vos données de téléchargement ne sont pas supprimées de nos serveurs.</strong> 
                Lorsque vous "effacez" votre historique, les données sont marquées comme masquées visuellement 
                mais restent stockées en base de données pour être utilisées dans nos analyses et métriques.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Durées de conservation</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• <strong>Données d'authentification</strong> : Conservées tant que votre compte existe</li>
                <li>• <strong>Historique de téléchargements</strong> : Conservé indéfiniment pour les métriques</li>
                <li>• <strong>Logs système</strong> : Conservés indéfiniment pour le monitoring</li>
                <li>• <strong>Métriques agrégées</strong> : Conservées indéfiniment</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sécurité */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Sécurité des données</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Mesures de protection</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Chiffrement AES-256-CBC pour les clés API sensibles</li>
                <li>• Hachage bcrypt avec salt pour les mots de passe</li>
                <li>• Authentification JWT pour les sessions</li>
                <li>• Base de données MongoDB sécurisée</li>
                <li>• Logs de sécurité et monitoring</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Accès aux données</h3>
              <p className="text-gray-300 leading-relaxed">
                Seuls les administrateurs autorisés ont accès aux données utilisateur, 
                uniquement dans le cadre de la maintenance du service et de l'analyse des métriques.
              </p>
            </div>
          </div>
        </div>

        {/* Droits des utilisateurs */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Vos droits</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Droits disponibles</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• <strong>Accès</strong> : Consulter vos données personnelles</li>
                <li>• <strong>Rectification</strong> : Modifier vos informations de profil</li>
                <li>• <strong>Portabilité</strong> : Exporter vos données</li>
                <li>• <strong>Opposition</strong> : Vous désinscrire du service</li>
              </ul>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-red-400 mb-2">⚠️ Limitation : Droit à l'effacement</h3>
              <p className="text-gray-300 leading-relaxed">
                <strong>Le droit à l'effacement complet n'est pas applicable</strong> car vos données 
                de téléchargement sont nécessaires à la génération de nos métriques et analyses. 
                La suppression de votre compte entraînera la suppression de vos données d'authentification 
                mais pas de votre historique de téléchargements.
              </p>
            </div>
          </div>
        </div>

        {/* Consentement */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Consentement</h2>
          <div className="space-y-4">
            <p className="text-gray-300 leading-relaxed">
              En créant un compte sur Zone-Debrid, vous acceptez automatiquement cette politique de confidentialité 
              et consentez à la collecte, au traitement et à la conservation de vos données personnelles 
              dans les conditions décrites ci-dessus.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Ce consentement est également couvert par nos conditions d'utilisation générales. 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
          <p className="text-gray-300 leading-relaxed">
            Pour toute question concernant cette politique de confidentialité ou l'utilisation de vos données, 
            vous pouvez me contacter à l'adresse suivante : megitsune14.pro@gmail.com
          </p>
        </div>

        {/* Modifications */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Modifications de cette politique</h2>
          <p className="text-gray-300 leading-relaxed">
            Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
            Nous vous encourageons à consulter régulièrement cette page pour rester informé de nos pratiques.
            Les modifications importantes vous seront notifiées via l'interface utilisateur.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicyPage
