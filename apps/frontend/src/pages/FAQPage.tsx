import { useEffect } from 'react'
import { FiHelpCircle, FiZap, FiAlertTriangle, FiKey, FiShield } from 'react-icons/fi'

const FAQPage = () => {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'FAQ — Zone-Debrid'
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    const prevDesc = metaDesc?.content ?? null
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = 'Questions fréquentes : AllDebrid, clé API, problèmes courants et tutoriel pour utiliser Zone-Debrid.'
    return () => {
      document.title = prevTitle
      if (metaDesc) metaDesc.content = prevDesc ?? ''
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-brand-primary/20 rounded-lg">
            <FiHelpCircle className="h-8 w-8 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Foire aux questions</h1>
            <p className="text-gray-400">AllDebrid, clé API et utilisation de Zone-Debrid</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* 1. Qu'est-ce qu'AllDebrid ? */}
        <section className="card" id="all-debrid">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FiZap className="h-5 w-5 text-amber-400" />
            Qu'est-ce qu'AllDebrid ?
          </h2>
          <div className="space-y-3 text-gray-300 leading-relaxed">
            <p>
              AllDebrid est un service en ligne qui permet d'accéder plus rapidement à des liens premium (hébergeurs de fichiers). 
              Au lieu d'attendre des délais ou de payer chaque hébergeur, vous avez un abonnement AllDebrid et vous débloquez vos liens en un clic.
            </p>
            <p>
              <strong className="text-white">Zone-Debrid</strong> utilise <strong className="text-white">votre propre clé API AllDebrid</strong>. 
              C'est une clé personnelle, propre à votre compte AllDebrid. Chaque utilisateur utilise sa clé, et Zone-Debrid ne stocke pas votre mot de passe AllDebrid — uniquement cette clé, de façon sécurisée.
            </p>
          </div>
        </section>

        {/* 2. Comment fonctionne Zone-Debrid ? */}
        <section className="card" id="fonctionnement">
          <h2 className="text-xl font-semibold text-white mb-4">Comment fonctionne Zone-Debrid ?</h2>
          <ul className="space-y-2 text-gray-300 list-disc list-inside leading-relaxed">
            <li>Vous fournissez votre clé API AllDebrid dans vos paramètres.</li>
            <li>Lors d'une recherche, Zone-Debrid interroge AllDebrid en votre nom pour débloquer les liens.</li>
            <li>Les fichiers sont récupérés via le serveur : votre adresse IP n'est pas exposée au site source.</li>
            <li>Les téléchargements peuvent être repris en cas d'interruption.</li>
          </ul>
        </section>

        {/* 3. Problèmes courants */}
        <section className="card" id="problemes">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FiAlertTriangle className="h-5 w-5 text-amber-400" />
            Problèmes courants
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Service temporairement indisponible</h3>
              <p className="text-gray-300 leading-relaxed">
                AllDebrid peut être en maintenance de temps en temps. Les sites sources (hébergeurs) peuvent aussi être indisponibles. 
                Si un service est down, un message s'affiche pour vous prévenir et l'équipe est automatiquement notifiée. Il suffit de réessayer plus tard.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">Blocage lié au serveur (Allemagne)</h3>
              <p className="text-gray-300 leading-relaxed mb-2">
                Le serveur Zone-Debrid est hébergé en Allemagne. Certains CDN ou sites peuvent bloquer les adresses IP de datacenter. 
                Si vous rencontrez des blocages :
              </p>
              <ul className="text-gray-300 list-disc list-inside space-y-1 ml-2">
                <li>Autoriser l'accès côté AllDebrid si le service vous le demande.</li>
                <li>Attendre quelques minutes et réessayer.</li>
                <li>En dernier recours, utiliser un VPN compatible avec votre utilisation (vérifier les conditions AllDebrid).</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-2">Clé API invalide</h3>
              <p className="text-gray-300 leading-relaxed">
                Vérifiez que la clé est bien copiée sans espace avant/après, qu'elle n'est pas expirée, et recréez une nouvelle clé sur AllDebrid si besoin (voir le tutoriel ci-dessous).
              </p>
            </div>
          </div>
        </section>

        {/* 4. Tutoriel clé API */}
        <section className="card" id="tutoriel">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FiKey className="h-5 w-5 text-brand-primary" />
            Comment créer sa clé API AllDebrid ?
          </h2>
          <ol className="space-y-3 text-gray-300 list-decimal list-inside leading-relaxed">
            <li>Connectez-vous à votre compte sur <a href="https://alldebrid.com" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">alldebrid.com</a>.</li>
            <li>Allez dans <strong className="text-white">Mon Compte</strong>.</li>
            <li>Cliquez sur <strong className="text-white">API Key Manager</strong> (gestionnaire de clé API).</li>
            <li>Cliquez sur <strong className="text-white">Créer une nouvelle clé</strong>.</li>
            <li>Donnez un nom à la clé (par exemple &laquo; Zone-Debrid &raquo;).</li>
            <li>Copiez la clé générée.</li>
            <li>Collez la clé dans Zone-Debrid (inscription ou paramètres).</li>
          </ol>
          <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-200 text-sm font-medium mb-1">À retenir</p>
            <p className="text-gray-300 text-sm">
              Ne partagez jamais votre clé API. Elle donne accès à votre compte AllDebrid. Gardez-la comme un mot de passe.
            </p>
          </div>
        </section>

        {/* 5. Sécurité & Confidentialité */}
        <section className="card" id="securite">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FiShield className="h-5 w-5 text-green-400" />
            Sécurité & Confidentialité
          </h2>
          <ul className="space-y-2 text-gray-300 list-disc list-inside leading-relaxed">
            <li>La clé API est chiffrée côté serveur.</li>
            <li>Zone-Debrid n'accède pas à votre mot de passe AllDebrid.</li>
            <li>Aucune adresse IP utilisateur n'est transmise au site source.</li>
            <li>Les erreurs critiques sont monitorées automatiquement pour améliorer le service.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

export default FAQPage
