import { FiFileText, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi'

const TermsOfServicePage = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-green-500/20 rounded-lg">
            <FiFileText className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Conditions d'Utilisation</h1>
            {/* <p className="text-gray-400">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p> */}
            <p className="text-gray-400">Dernière mise à jour : 19/09/2025</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Introduction */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Introduction</h2>
          <p className="text-gray-300 leading-relaxed">
            En utilisant Zone-Debrid, vous acceptez d'être lié par ces conditions d'utilisation. 
            Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service. 
            Ces conditions s'appliquent à tous les utilisateurs du service, qu'ils soient visiteurs ou membres inscrits.
          </p>
        </div>

        {/* Acceptation des conditions */}
        <div className="card">
          <div className="flex items-center space-x-3 mb-4">
            <FiCheckCircle className="h-5 w-5 text-green-400" />
            <h2 className="text-xl font-semibold text-white">Acceptation des conditions</h2>
          </div>
          <p className="text-gray-300 leading-relaxed">
            En créant un compte ou en utilisant notre service, vous confirmez que vous avez lu, 
            compris et accepté ces conditions d'utilisation.
          </p>
        </div>

        {/* Comptes utilisateur et authentification */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Comptes utilisateur et authentification</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Création de compte</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Vous devez fournir un nom d'utilisateur unique (3-30 caractères)</li>
                <li>• Vous devez choisir un mot de passe sécurisé (minimum 6 caractères)</li>
                <li>• Vous devez posséder une clé API AllDebrid valide et active</li>
                <li>• Toutes les informations fournies doivent être exactes et à jour</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Responsabilité du compte</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Vous êtes responsable de la sécurité de vos identifiants de connexion</li>
                <li>• Vous devez notifier immédiatement toute utilisation non autorisée</li>
                <li>• Vous êtes responsable de toutes les activités effectuées via votre compte</li>
                <li>• Vous devez maintenir votre clé API AllDebrid valide et active</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Utilisation des données et métriques */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Utilisation des données et métriques</h2>
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-400 mb-2">ℹ️ Consentement aux métriques</h3>
              <p className="text-gray-300 leading-relaxed">
                En utilisant notre service, vous consentez explicitement à la collecte et à l'utilisation 
                de vos données de téléchargement pour générer des statistiques et métriques d'utilisation.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Conservation des données</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Vos données de téléchargement sont conservées même après "suppression" de l'historique</li>
                <li>• Ces données sont utilisées pour l'amélioration du service et les analyses</li>
                <li>• Le droit à l'effacement complet est limité pour les besoins de métriques</li>
                <li>• Consultez notre politique de confidentialité pour plus de détails</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Utilisation des métriques</h3>
              <p className="text-gray-300 leading-relaxed">
                Les données collectées sont utilisées pour analyser les tendances d'utilisation, 
                optimiser les performances du service, diagnostiquer les problèmes et développer 
                de nouvelles fonctionnalités.
              </p>
            </div>
          </div>
        </div>

        {/* Utilisation acceptable et interdictions */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Utilisation acceptable et interdictions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Usage autorisé</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Utilisation personnelle et non commerciale uniquement</li>
                <li>• Respect des droits d'auteur et de la propriété intellectuelle</li>
                <li>• Utilisation conforme aux conditions d'AllDebrid</li>
                <li>• Respect des lois et réglementations applicables</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Interdictions</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Utilisation commerciale ou à des fins lucratives</li>
                <li>• Contournement des mesures de protection des contenus</li>
                <li>• Téléchargement de contenu illégal ou protégé par le droit d'auteur</li>
                <li>• Tentatives d'abus, de spam ou d'exploitation de vulnérabilités</li>
                <li>• Utilisation du service pour des activités illégales</li>
                <li>• Interférence avec le fonctionnement normal du service</li>
              </ul>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-red-400 mb-2">⚠️ Responsabilité de l'utilisateur</h3>
              <p className="text-gray-300 leading-relaxed">
                Vous êtes entièrement responsable du contenu que vous téléchargez et de son utilisation. 
                Zone-Debrid n'est pas responsable de l'utilisation que vous faites du contenu téléchargé.
              </p>
            </div>
          </div>
        </div>

        {/* Responsabilités et limitations */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Responsabilités et limitations</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Responsabilité de l'utilisateur</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Vérifier la légalité du contenu avant téléchargement</li>
                <li>• Respecter les droits d'auteur et la propriété intellectuelle</li>
                <li>• Maintenir la sécurité de votre compte et de vos données</li>
                <li>• Utiliser le service de manière responsable et légale</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Limitations de responsabilité</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Zone-Debrid agit uniquement comme intermédiaire technique</li>
                <li>• Aucune garantie de disponibilité continue du service</li>
                <li>• Pas de responsabilité pour les dommages indirects ou consécutifs</li>
                <li>• Limitation de responsabilité aux montants payés pour le service (gratuit)</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Force majeure</h3>
              <p className="text-gray-300 leading-relaxed">
                Zone-Debrid ne peut être tenu responsable des interruptions de service dues à des 
                événements de force majeure, des pannes techniques, des maintenances ou des 
                problèmes liés aux services tiers (AllDebrid, hébergeurs, etc.).
              </p>
            </div>
          </div>
        </div>

        {/* Fonctionnalités techniques */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Fonctionnalités techniques</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Limites d'utilisation</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Des limites de taux (rate limiting) peuvent être appliquées</li>
                <li>• Quotas d'utilisation peuvent être mis en place</li>
                <li>• Priorité donnée aux utilisateurs respectant les conditions</li>
                <li>• Limites techniques liées aux capacités des serveurs</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Maintenance et évolution</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Interruptions programmées pour maintenance</li>
                <li>• Mises à jour et améliorations du service</li>
                <li>• Modifications des fonctionnalités sans préavis</li>
                <li>• Efforts raisonnables pour maintenir la compatibilité</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Compatibilité</h3>
              <p className="text-gray-300 leading-relaxed">
                Vous êtes responsable de la configuration de votre environnement technique. 
                Zone-Debrid s'efforce de maintenir la compatibilité mais ne garantit pas 
                le fonctionnement sur toutes les configurations.
              </p>
            </div>
          </div>
        </div>

        {/* Aspects financiers */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Aspects financiers</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Service gratuit</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Zone-Debrid est actuellement un service gratuit</li>
                <li>• Aucun frais caché ou abonnement requis</li>
                <li>• Pas de remboursement applicable (service gratuit)</li>
                <li>• Évolution possible vers un modèle freemium ou payant</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Coûts tiers</h3>
              <p className="text-gray-300 leading-relaxed">
                Vous êtes responsable des coûts liés à votre abonnement AllDebrid. 
                Zone-Debrid n'est pas responsable des frais, limitations ou problèmes 
                liés aux services AllDebrid.
              </p>
            </div>
          </div>
        </div>

        {/* Sécurité et confidentialité */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Sécurité et confidentialité</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Protection des données</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Chiffrement des données sensibles (clés API, mots de passe)</li>
                <li>• Mesures de sécurité techniques et organisationnelles</li>
                <li>• Accès restreint aux données personnelles</li>
                <li>• Monitoring et audit de sécurité</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Confidentialité</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Non-divulgation des informations personnelles</li>
                <li>• Utilisation des données uniquement pour les fins déclarées</li>
                <li>• Respect de la politique de confidentialité</li>
                <li>• Notification en cas d'incident de sécurité</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Propriété intellectuelle */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Propriété intellectuelle</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Zone-Debrid Open Source</h3>
              <p className="text-gray-300 leading-relaxed mb-2">
                Zone-Debrid est un projet open source. Le code source est disponible publiquement 
                et peut être consulté, modifié et distribué selon les termes de la licence open source.
              </p>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• Code source disponible et modifiable</li>
                <li>• Contribution à l'amélioration du projet encouragée</li>
                <li>• Respect de la licence open source applicable</li>
                <li>• Transparence totale sur le fonctionnement</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Marque et contenu</h3>
              <ul className="text-gray-300 space-y-1 ml-4">
                <li>• La marque "Zone-Debrid" reste protégée</li>
                <li>• Respect des droits de propriété intellectuelle des tiers</li>
                <li>• Contenu utilisateur : vous conservez vos droits</li>
                <li>• Interdiction d'utilisation commerciale non autorisée</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Services tiers</h3>
              <p className="text-gray-300 leading-relaxed">
                Zone-Debrid intègre des services tiers (notamment AllDebrid). 
                Vous devez respecter les conditions d'utilisation de ces services 
                et nous ne sommes pas responsables de leurs politiques ou limitations.
              </p>
            </div>
          </div>
        </div>

        {/* Modifications */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Modifications des conditions</h2>
          <p className="text-gray-300 leading-relaxed">
            Nous nous réservons le droit de modifier ces conditions d'utilisation à tout moment. 
            Votre utilisation continue du service après les modifications constitue votre acceptation 
            des nouvelles conditions.
          </p>
        </div>

        {/* Contact */}
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Contact</h2>
          <p className="text-gray-300 leading-relaxed">
            Si vous avez des questions concernant ces conditions d'utilisation, 
            contactez-nous à l'adresse suivante :{' '}
            <a href="mailto:megitsune14.pro@gmail.com" className="text-primary-400 hover:text-primary-300">
              megitsune14.pro@gmail.com
            </a>
          </p>
        </div>

        {/* Clause de non-responsabilité */}
        <div className="card bg-yellow-500/10 border-yellow-500/20">
          <div className="flex items-start space-x-3">
            <FiAlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Clause de non-responsabilité</h2>
              <p className="text-gray-300 leading-relaxed">
                Zone-Debrid agit uniquement comme intermédiaire technique et n'héberge aucun contenu. 
                Nous ne sommes pas responsables du contenu trouvé via notre service, de son utilisation 
                ou de sa légalité. L'utilisateur assume l'entière responsabilité de ses actions et 
                doit respecter toutes les lois applicables concernant le droit d'auteur et la propriété intellectuelle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TermsOfServicePage
