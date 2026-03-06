import { useEffect } from 'react'
import { FiServer, FiDownloadCloud, FiTerminal, FiFolder, FiInfo, FiSettings } from 'react-icons/fi'

const Aria2HelpPage = () => {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Téléchargement vers NAS (Aria2) — Zone-Debrid'
    let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    const prevDesc = metaDesc?.content ?? null
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    metaDesc.content = 'Guide pas à pas pour installer et configurer Aria2 avec Zone-Debrid afin d\'envoyer vos téléchargements directement vers votre NAS.'
    return () => {
      document.title = prevTitle
      if (metaDesc) metaDesc.content = prevDesc ?? ''
    }
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      {/* Titre */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-brand-primary/20 rounded-lg">
            <FiDownloadCloud className="h-8 w-8 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Télécharger vers NAS avec Aria2</h1>
            <p className="text-gray-400">
              Configurez Aria2 une fois, puis envoyez vos téléchargements Zone-Debrid directement vers votre NAS.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 1 — Présentation */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiInfo className="h-5 w-5 text-blue-400" />
            1. Qu&apos;est-ce qu&apos;Aria2 et pourquoi l&apos;utiliser ?
          </h2>
          <div className="space-y-3 text-gray-300 leading-relaxed">
            <p>
              <strong className="text-white">Aria2</strong> est un gestionnaire de téléchargement léger qui tourne en arrière-plan
              (sur un NAS, un serveur ou un PC) et expose une <strong className="text-white">API JSON‑RPC</strong>.
            </p>
            <p>
              <strong className="text-white">Zone-Debrid</strong> utilise cette API pour envoyer vos téléchargements débridés
              directement vers votre espace de stockage, sans passer par le navigateur.
            </p>
            <p>Concrètement, vous pouvez installer Aria2 sur&nbsp;:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>votre <strong>NAS</strong> (ex&nbsp;: TrueNAS, Unraid, Synology via Docker),</li>
              <li>un <strong>serveur à la maison</strong> (mini‑PC, VM, etc.),</li>
              <li>ou toute <strong>machine accessible</strong> depuis Internet ou votre réseau local.</li>
            </ul>
          </div>
        </section>

        {/* Section 2 — Informations nécessaires */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiSettings className="h-5 w-5 text-purple-400" />
            2. Informations à renseigner dans Zone-Debrid
          </h2>
          <p className="text-gray-300 mb-3">
            Pour activer la fonctionnalité <strong className="text-white">Télécharger vers NAS</strong>, vous devez connaître&nbsp;:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li><strong className="text-white">URL RPC Aria2</strong> — l&apos;adresse de l&apos;API JSON‑RPC.</li>
            <li><strong className="text-white">RPC Secret</strong> — le mot de passe/API key d&apos;Aria2.</li>
            <li><strong className="text-white">Chemin de téléchargement de base</strong> — le dossier racine sur votre NAS.</li>
          </ul>

          <div className="mt-4 p-4 rounded-lg bg-brand-surface border border-brand-border text-sm text-gray-200 space-y-3">
            <p className="font-semibold text-white">Exemple de configuration&nbsp;:</p>
            <div>
              <p className="text-gray-400">URL RPC Aria2</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                http://192.168.1.10:6800/jsonrpc
              </code>
            </div>
            <div>
              <p className="text-gray-400">RPC Secret</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                monSecretAria2
              </code>
            </div>
            <div>
              <p className="text-gray-400">Chemin de téléchargement de base</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                /media
              </code>
            </div>
          </div>
        </section>

        {/* Section 3 — Installation avec Docker */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiServer className="h-5 w-5 text-emerald-400" />
            3. Installation avec Docker (recommandé)
          </h2>

          <div className="space-y-3 text-gray-300 leading-relaxed">
            <p>
              Cette méthode est la plus simple si votre NAS ou serveur supporte <strong className="text-white">Docker</strong>.
            </p>
            <p>Prérequis&nbsp;:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Docker ou Docker Compose installé.</li>
              <li>Un dossier de stockage (ex&nbsp;: <code className="font-mono text-gray-200">/media</code>).</li>
            </ul>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-400 mb-2">Exemple de <code className="font-mono text-gray-200">docker-compose.yml</code>&nbsp;:</p>
            <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
{`version: "3"

services:
  aria2:
    image: p3terx/aria2-pro
    container_name: aria2
    restart: unless-stopped
    ports:
      - "6800:6800"
    volumes:
      - /media:/downloads
      - ./aria2-config:/config
    environment:
      - RPC_SECRET=monSecretAria2`}
            </pre>
          </div>

          <div className="mt-4 space-y-2 text-gray-300 text-sm">
            <p><strong className="text-white">Étapes&nbsp;:</strong></p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Créez un dossier pour votre configuration (ex&nbsp;: <code className="font-mono text-gray-200">aria2-config</code>).</li>
              <li>Créez un fichier <code className="font-mono text-gray-200">docker-compose.yml</code> avec le contenu ci‑dessus.</li>
              <li>Adaptez le chemin <code className="font-mono text-gray-200">/media</code> vers le dossier de votre NAS.</li>
              <li>Choisissez un secret sécurisé pour <code className="font-mono text-gray-200">RPC_SECRET</code>.</li>
              <li>Lancez&nbsp;:
                <pre className="bg-black/60 text-gray-100 text-xs rounded mt-1 p-2 inline-block">
docker compose up -d
                </pre>
              </li>
            </ol>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-gray-200 space-y-1">
            <p className="font-semibold text-white">Après démarrage</p>
            <p>
              L&apos;API RPC sera accessible à l&apos;adresse&nbsp;:
              <br />
              <code className="font-mono text-gray-100">http://IP_DU_SERVEUR:6800/jsonrpc</code>
            </p>
          </div>
        </section>

        {/* Section 4 — Installation via SSH */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiTerminal className="h-5 w-5 text-amber-400" />
            4. Installation via SSH (sans Docker)
          </h2>

          <div className="space-y-3 text-gray-300 leading-relaxed">
            <p>Cette méthode s&apos;applique sur un serveur Linux classique (Ubuntu / Debian).</p>

            <div>
              <p className="font-semibold text-white mb-1">1) Installer Aria2</p>
              <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
{`sudo apt update
sudo apt install aria2`}
              </pre>
            </div>

            <div>
              <p className="font-semibold text-white mb-1">2) Créer le fichier de configuration</p>
              <p className="text-sm text-gray-300 mb-1">
                Fichier&nbsp;: <code className="font-mono text-gray-200">/etc/aria2/aria2.conf</code>
              </p>
              <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
{`enable-rpc=true
rpc-listen-all=true
rpc-allow-origin-all=true
rpc-secret=monSecretAria2
rpc-listen-port=6800
dir=/media
continue=true
max-concurrent-downloads=5`}
              </pre>
            </div>

            <div>
              <p className="font-semibold text-white mb-1">3) Créer le dossier de téléchargement</p>
              <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
{`sudo mkdir -p /media
sudo chmod 777 /media`}
              </pre>
              <p className="text-xs text-gray-400 mt-1">
                Adaptez le chemin et les permissions à votre environnement (permissions plus strictes recommandées en production).
              </p>
            </div>

            <div>
              <p className="font-semibold text-white mb-1">4) Lancer Aria2</p>
              <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
{`aria2c --conf-path=/etc/aria2/aria2.conf`}
              </pre>
              <p className="text-xs text-gray-400 mt-1">
                Optionnel&nbsp;: créez un service <code className="font-mono text-gray-200">systemd</code> pour démarrer Aria2 automatiquement au boot.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5 — Vérifier qu'Aria2 fonctionne */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiServer className="h-5 w-5 text-sky-400" />
            5. Vérifier que Aria2 fonctionne
          </h2>
          <p className="text-gray-300 mb-3">
            Depuis votre machine ou un terminal sur le même réseau&nbsp;:
          </p>
          <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto">
{`curl http://IP_DU_SERVEUR:6800/jsonrpc`}
          </pre>
          <p className="text-sm text-gray-300 mt-3">
            Si vous obtenez une réponse JSON (même une erreur JSON‑RPC), le service Aria2 est bien joignable.
          </p>
        </section>

        {/* Section 6 — Configuration dans Zone-Debrid */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiSettings className="h-5 w-5 text-pink-400" />
            6. Configuration dans Zone-Debrid
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300 leading-relaxed">
            <li>Ouvrez la page <strong className="text-white">Paramètres</strong> dans Zone-Debrid.</li>
            <li>Dans la section <strong className="text-white">Téléchargement vers NAS (Aria2)</strong>, activez le switch.</li>
            <li>Renseignez&nbsp;:
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                <li><strong>Aria2 RPC URL</strong> — ex&nbsp;: <code className="font-mono text-gray-200">http://IP_DU_SERVEUR:6800/jsonrpc</code></li>
                <li><strong>RPC Secret</strong> — ex&nbsp;: <code className="font-mono text-gray-200">monSecretAria2</code></li>
                <li><strong>Chemin de téléchargement</strong> — ex&nbsp;: <code className="font-mono text-gray-200">/media</code></li>
              </ul>
            </li>
            <li>Cliquez sur <strong className="text-white">Mettre à jour la configuration Aria2</strong>.</li>
          </ol>
        </section>

        {/* Section 7 — Utilisation */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiFolder className="h-5 w-5 text-lime-400" />
            7. Utilisation au quotidien
          </h2>
          <div className="space-y-3 text-gray-300 leading-relaxed">
            <p>
              Une fois Aria2 configuré, la fenêtre de téléchargement de Zone-Debrid propose deux actions&nbsp;:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong className="text-white">Télécharger</strong> — comportement actuel, téléchargement via votre navigateur.</li>
              <li><strong className="text-white">Télécharger vers NAS</strong> — envoie le ou les fichiers vers Aria2.</li>
            </ul>

            <p className="mt-2">
              Aria2 télécharge alors les fichiers directement sur votre NAS. Zone-Debrid propose une organisation compatible
              Plex / Jellyfin&nbsp;:
            </p>

            <div className="mt-3 space-y-2 text-sm">
              <div>
                <p className="font-semibold text-white">Films</p>
                <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-3 overflow-x-auto">
{`/media/films/NomFilm (année)/NomFilm (année).mkv`}
                </pre>
              </div>
              <div>
                <p className="font-semibold text-white">Séries</p>
                <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-3 overflow-x-auto">
{`/media/series/NomSerie (année)/Saison XX/NomSerie - SxxExx.mkv`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Aria2HelpPage

