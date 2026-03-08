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

        {/* Section 2 — Installation avec Docker */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiServer className="h-5 w-5 text-emerald-400" />
            2. Installation avec Docker (recommandé)
          </h2>

          <div className="space-y-3 text-gray-300 leading-relaxed">
            <p>
              Cette méthode est la plus simple si votre NAS ou serveur supporte <strong className="text-white">Docker</strong>.
            </p>
            <p>Prérequis&nbsp;:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Docker installé.</li>
              <li>Un dossier pour la configuration Aria2 et un dossier pour les téléchargements (ex&nbsp;: <code className="font-mono text-gray-200">/media</code>).</li>
            </ul>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-gray-200 space-y-1">
            <p className="font-semibold text-white">Conseil avant de lancer la commande</p>
            <p>
              Il est conseillé de créer au préalable le dossier des téléchargements (et éventuellement le dossier de configuration) pour éviter tout problème au démarrage du conteneur&nbsp;:
            </p>
            <pre className="bg-black/40 text-gray-100 text-xs rounded p-2 mt-2 overflow-x-auto">
{`mkdir -p /home/Megitsune/media
mkdir -p /home/Megitsune/aria2-config`}
            </pre>
            <p className="text-xs text-gray-400 mt-2">
              Adaptez les chemins à votre système (utilisateur, disque, etc.).
            </p>
          </div>

          <div className="mt-4">
            <p className="text-sm font-semibold text-white mb-2">Commande exemple (à copier-coller puis adapter)</p>
            <p className="text-sm text-gray-400 mb-2">
              Remplacez <code className="font-mono text-gray-200">TonDossier</code> par le chemin de votre choix (ex. <code className="font-mono text-gray-200">/home/Megitsune</code>) et <code className="font-mono text-gray-200">TonSecret</code> par votre secret RPC.
            </p>
            <pre className="bg-black/60 text-gray-100 text-sm rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all">
{`docker run -d --name aria2 -p 6800:6800 -p 6888:6888 -p 6888:6888/udp -v TonDossier/aria2-config:/config -v TonDossier:/media -e RPC_SECRET=TonSecret --restart unless-stopped p3terx/aria2-pro`}
            </pre>

            <p className="text-sm font-semibold text-white mt-6 mb-2">Détail des options</p>
            <div className="space-y-4 text-sm text-gray-300">
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">-d</code>
                <p>Permet de lancer le conteneur en arrière-plan (mode détaché), sans bloquer le terminal.</p>
              </div>
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">--name aria2</code>
                <p>Donne un nom au conteneur pour pouvoir le gérer facilement (ex. <code className="font-mono text-gray-200">docker stop aria2</code>).</p>
              </div>
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">-p 6800:6800</code>
                <p>Expose le port de l&apos;API RPC. Obligatoire pour que Zone-Debrid puisse envoyer les téléchargements à Aria2.</p>
              </div>
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">-p 6888:6888 -p 6888:6888/udp</code>
                <p>Expose le port du protocole BitTorrent (TCP et UDP) pour les téléchargements en peer-to-peer.</p>
              </div>
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">-v TonDossier/aria2-config:/config</code>
                <p>Monte un dossier de l&apos;hôte dans le conteneur pour la configuration Aria2. Les réglages sont ainsi conservés après redémarrage.</p>
              </div>
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">-v TonDossier:/media</code>
                <p>Monte le dossier où seront enregistrés les fichiers téléchargés. C&apos;est ce chemin (<code className="font-mono text-gray-200">/media</code> dans le conteneur) que vous pourrez utiliser comme base dans Zone-Debrid.</p>
              </div>
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">-e RPC_SECRET=TonSecret</code>
                <p>Définit le secret RPC. À garder confidentiel et à renseigner dans Zone-Debrid pour s&apos;authentifier auprès d&apos;Aria2.</p>
              </div>
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">--restart unless-stopped</code>
                <p>Redémarre automatiquement le conteneur après un reboot de la machine ou en cas de crash.</p>
              </div>
              <div>
                <code className="block bg-black/40 text-gray-100 rounded px-2 py-1 font-mono text-xs mb-1">p3terx/aria2-pro</code>
                <p>Image Docker utilisée (Aria2 avec interface WebUI et fonctionnalités étendues).</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-gray-200 space-y-1">
            <p className="font-semibold text-white">Après démarrage</p>
            <p>
              L&apos;API RPC sera accessible à l&apos;adresse&nbsp;:
              <br />
              <code className="font-mono text-gray-100">http://IP_DU_SERVEUR:6800/jsonrpc</code>
            </p>
            <p className="mt-2">
              Dans Zone-Debrid, le <strong className="text-white">chemin de base</strong> à renseigner pour les téléchargements correspond au chemin <strong>à l&apos;intérieur du conteneur</strong>, par exemple <code className="font-mono text-gray-100">/media</code> (comme dans le volume <code className="font-mono text-gray-100">-v ... :/media</code>).
            </p>
          </div>
        </section>

        {/* Section 3 — Installation via SSH */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiTerminal className="h-5 w-5 text-amber-400" />
            3. Installation via SSH (sans Docker)
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

        {/* Section 4 — Vérifier qu'Aria2 fonctionne */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiServer className="h-5 w-5 text-sky-400" />
            4. Vérifier que Aria2 fonctionne
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

        {/* Section 5 — Informations à renseigner dans Zone-Debrid */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiSettings className="h-5 w-5 text-purple-400" />
            5. Informations à renseigner dans Zone-Debrid
          </h2>
          <p className="text-gray-300 mb-3">
            Pour activer la fonctionnalité <strong className="text-white">Télécharger vers NAS</strong>, ouvrez <strong className="text-white">Paramètres</strong>, activez la section Aria2, puis renseignez&nbsp;:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-300">
            <li><strong className="text-white">URL RPC Aria2</strong> — l&apos;adresse de l&apos;API JSON‑RPC (ex. <code className="font-mono text-gray-200">http://IP:6800/jsonrpc</code>).</li>
            <li><strong className="text-white">Secret RPC Aria2</strong> — le secret défini avec <code className="font-mono text-gray-200">RPC_SECRET</code> au lancement du conteneur.</li>
            <li><strong className="text-white">Chemin de base des téléchargements</strong> — point de départ utilisé pour tous les chemins (ex. <code className="font-mono text-gray-200">/media</code>). Obligatoire.</li>
            <li><strong className="text-white">Chemin de téléchargement pour films</strong> — optionnel. Si vide, Zone-Debrid utilise <code className="font-mono text-gray-200">&#123;chemin de base&#125;/films</code>. Sous-dossiers titre (année) créés automatiquement.</li>
            <li><strong className="text-white">Chemin de téléchargement pour séries</strong> — optionnel. Si vide, Zone-Debrid utilise <code className="font-mono text-gray-200">&#123;chemin de base&#125;/series</code>. Sous-dossiers série puis saison créés automatiquement.</li>
            <li><strong className="text-white">Chemin de téléchargement pour saison de série</strong> — optionnel. Si vide, Zone-Debrid utilise <code className="font-mono text-gray-200">Saison 01</code>, <code className="font-mono text-gray-200">Saison 02</code>, etc. Vous pouvez personnaliser avec <code className="font-mono text-gray-200">{'{season}'}</code> (ex. <code className="font-mono text-gray-200">Saison {'{season}'}</code>).</li>
          </ul>

          <div className="mt-4 p-4 rounded-lg bg-brand-surface border border-brand-border text-sm text-gray-200 space-y-3">
            <p className="font-semibold text-white">Exemple de configuration (les 3 derniers champs sont optionnels, les valeurs ci-dessous correspondent aux valeurs par défaut)&nbsp;:</p>
            <div>
              <p className="text-gray-400">URL RPC Aria2</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                http://192.168.1.10:6800/jsonrpc
              </code>
            </div>
            <div>
              <p className="text-gray-400">Secret RPC Aria2</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                monSecretAria2
              </code>
            </div>
            <div>
              <p className="text-gray-400">Chemin de base des téléchargements</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                /media
              </code>
            </div>
            <div>
              <p className="text-gray-400">Chemin de téléchargement pour films</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                /media/films
              </code>
            </div>
            <div>
              <p className="text-gray-400">Chemin de téléchargement pour séries</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                /media/series
              </code>
            </div>
            <div>
              <p className="text-gray-400">Chemin de téléchargement pour saison de série</p>
              <code className="block bg-black/40 px-3 py-2 rounded text-sm text-gray-100">
                Saison {'{season}'}
              </code>
            </div>
          </div>
          <p className="text-gray-300 mt-4">
            Cliquez sur <strong className="text-white">Mettre à jour la configuration Aria2</strong> pour enregistrer et vérifier la connexion.
          </p>
        </section>

        {/* Section 6 — Utilisation */}
        <section className="card">
          <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
            <FiFolder className="h-5 w-5 text-lime-400" />
            6. Utilisation au quotidien
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

