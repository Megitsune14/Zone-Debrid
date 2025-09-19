import * as cheerio from 'cheerio';
import Logger from '@/base/Logger';
import allDebridService from './allDebridService';

/**
 * Host priority order (from most reliable to least reliable)
 */
const HOST_PRIORITY = [
  '1fichier',
  'Uptobox', 
  'Mega',
  'Rapidgator',
  'Nitroflare',
  'Turbobit',
  'Xubster',
  'DailyUploads',
  'Uploady',
  'Darkibox',
  'GoFile',
];

/**
 * Types for scraped links
 */
interface ScrapedLink {
  host: string;
  episodes?: string[];
  link: string;
}

interface ScrapedHosts {
  [host: string]: {
    [episode: string]: { link: string };
  } | {
    link: string; // Pour les films
  };
}

interface DownloadAvailability {
  type: 'films' | 'series' | 'mangas';
  episodes?: string[];
  availability: {
    [episode: string]: {
      host: string | null;
      link?: string;
      available: boolean;
      error?: string;
    };
  };
}

interface ProgressUpdate {
  type: 'progress' | 'status' | 'error' | 'complete';
  message: string;
  progress?: number;
  data?: any;
}

interface EpisodeAvailability {
  host: string | null;
  link?: string;
  available: boolean;
  error?: string;
  filesize?: string;
}


const activeSessions: Map<string, { cancelled: boolean }> = new Map();

/**
 * Convert episode key to readable format
 * @param {string} episodeKey - Episode key (e.g., 'episode_1', 'film')
 * @returns {string} Formatted episode name
 */
const formatEpisodeName = (episodeKey: string): string => {
  if (episodeKey === 'film') {
    return 'Film';
  }
  if (episodeKey.startsWith('episode_')) {
    const episodeNumber = episodeKey.replace('episode_', '');
    return `Épisode ${episodeNumber}`;
  }
  return episodeKey;
};

/**
 * Send progress update via WebSocket to client
 * @param {string} sessionId - Session ID for the download check
 * @param {ProgressUpdate} update - Progress update data
 */
const sendProgressUpdate = (sessionId: string, update: ProgressUpdate) => {
  try {
    const io = global.io;
    if (io) {
      io.emit(`download-progress-${sessionId}`, update);
      Logger.debug(`Progress update sent for session ${sessionId}: ${update.type} - ${update.message}`);
    }
  } catch (error) {
    Logger.error(`Error sending progress update: ${error}`);
  }
};

/**
 * Scrape download links from a Zone-Téléchargement page
 * @param {string} downloadLink - URL of the download page to scrape
 * @param {string} [targetEpisode] - Optional specific episode to target
 * @param {string} [sessionId] - Optional session ID for progress updates
 * @returns {Promise<ScrapedHosts>} Scraped hosts with their download links
 * @throws {Error} When scraping fails
 */
const scrapeDownloadLinks = async (downloadLink: string, targetEpisode?: string, sessionId?: string): Promise<ScrapedHosts> => {
  try {
    if (sessionId) {
      sendProgressUpdate(sessionId, {
        type: 'status',
        message: 'Scraping des liens de téléchargement...',
        progress: 10
      });
    }

    Logger.info(`Scraping download links from: ${downloadLink}`);
    
    const response = await fetch(downloadLink, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.zone-telechargement.diy/'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const scrapedHosts: ScrapedHosts = {};
    
    // Chercher les divs avec la classe "postinfo" qui contiennent les liens d'hébergeurs
    $('.postinfo').each((_, element) => {
      const $element = $(element);
      
      // Parcourir tous les éléments de manière séquentielle (pas seulement les enfants directs)
      let currentHost: string | null = null;
      
      // Utiliser find() pour parcourir tous les éléments descendants
      $element.find('*').each((_, childElement) => {
        const $child = $(childElement);
        
        // Si c'est un div d'hébergeur (dans une balise <b>)
        if ($child.is('div[style*="font-weight:bold"]')) {
          const hostName = $child.text().trim();
          Logger.debug(`Found potential host: "${hostName}"`);
          if (HOST_PRIORITY.includes(hostName)) {
            currentHost = hostName;
            if (!scrapedHosts[hostName]) {
              scrapedHosts[hostName] = {};
            }
            Logger.debug(`Accepted host: ${hostName}`);
          } else {
            Logger.debug(`Rejected host: "${hostName}" (not in priority list)`);
          }
        }
        // Si c'est un lien et qu'on a un hébergeur actuel
        else if ($child.is('a[href*="dl-protect.link"]') && currentHost) {
          const linkText = $child.text().trim();
          const linkHref = $child.attr('href');
          
          if (linkHref && !linkText.toLowerCase().includes('partie')) {
            Logger.debug(`Found link for ${currentHost}: ${linkText} -> ${linkHref}`);
            
            // Déterminer si c'est un film ou une série
            if (linkText.toLowerCase().includes('télécharger') || 
                linkText.toLowerCase().includes('telecharger')) {
              // C'est un film
              (scrapedHosts[currentHost] as any).link = linkHref;
            } else if (linkText.toLowerCase().includes('episode')) {
              // C'est une série
              const episodeMatch = linkText.match(/episode\s*(\d+)/i);
              if (episodeMatch) {
                const episodeNum = episodeMatch[1];
                
                // Si on a spécifié un épisode cible, ne traiter que celui-ci
                if (!targetEpisode || episodeNum === targetEpisode) {
                  const episodeKey = `episode_${episodeNum}`;
                  (scrapedHosts[currentHost] as any)[episodeKey] = { link: linkHref };
                  Logger.debug(`Assigned episode ${episodeNum} to ${currentHost}`);
                }
              }
            }
          }
        }
      });
    });
    
    if (sessionId) {
      sendProgressUpdate(sessionId, {
        type: 'status',
        message: `Scraping terminé - ${Object.keys(scrapedHosts).length} hébergeurs trouvés`,
        progress: 30
      });
    }

    Logger.success(`Scraped ${Object.keys(scrapedHosts).length} hosts with download links`);
    Logger.debug(`Scraped hosts: ${JSON.stringify(scrapedHosts, null, 2)}`);
    
    return scrapedHosts;

  } catch (error) {
    if (sessionId) {
      sendProgressUpdate(sessionId, {
        type: 'error',
        message: `Erreur lors du scraping: ${error}`,
        progress: 0
      });
    }
    Logger.error(`Error scraping download links: ${error}`);
    throw error;
  }
};

/**
 * Check availability of a single episode across all scraped hosts
 * @param {string} episodeKey - Episode key to check (e.g., 'episode_1', 'film')
 * @param {ScrapedHosts} scrapedHosts - Scraped hosts with their links
 * @param {string} allDebridApiKey - AllDebrid API key for checking links
 * @param {'films' | 'series' | 'mangas'} type - Content type
 * @param {string} [sessionId] - Optional session ID for progress updates
 * @returns {Promise<EpisodeAvailability>} Episode availability information
 * @throws {Error} When verification is cancelled by user
 */
const checkEpisodeAvailability = async (
  episodeKey: string,
  scrapedHosts: ScrapedHosts,
  allDebridApiKey: string,
  type: 'films' | 'series' | 'mangas',
  sessionId?: string
): Promise<EpisodeAvailability> => {
  // Vérifier si la session a été annulée avant de commencer
  if (sessionId && activeSessions.get(sessionId)?.cancelled) {
    throw new Error('Vérification annulée par l\'utilisateur');
  }

  let episodeAvailable = false;
  let bestHost: string | null = null;
  let bestLink: string | undefined;
  let error: string | undefined;
  let bestFilesize: string | undefined;
  // Tester les hébergeurs dans l'ordre de priorité
  for (const host of HOST_PRIORITY) {
    // Vérifier si la session a été annulée à chaque itération
    if (sessionId && activeSessions.get(sessionId)?.cancelled) {
      throw new Error('Vérification annulée par l\'utilisateur');
    }
    if (scrapedHosts[host]) {
      const hostData = scrapedHosts[host];
      let link: string | undefined;

      if (type === 'films') {
        link = (hostData as any).link;
      } else {
        // Pour les séries, la structure est { episode_X: { link: "..." } }
        const episodeData = (hostData as any)[episodeKey];
        link = episodeData?.link;
      }

      if (link) {
        try {
          if (sessionId) {
            sendProgressUpdate(sessionId, {
              type: 'status',
              message: `Test de ${host} pour ${formatEpisodeName(episodeKey)}...`,
              progress: undefined // Progression gérée au niveau supérieur
            });
          }

          Logger.debug(`Testing ${host} for ${episodeKey}`);
          
          // Vérifier avec AllDebrid
          const isAvailable = await allDebridService.checkLinkAvailability(
            link, 
            allDebridApiKey,
            sessionId ? () => activeSessions.get(sessionId)?.cancelled || false : undefined
          );
          
          if (isAvailable.available) {
            episodeAvailable = true;
            bestHost = host;
            bestLink = isAvailable.debridedLink;
            bestFilesize = isAvailable.filesize;
            
            if (sessionId) {
              sendProgressUpdate(sessionId, {
                type: 'status',
                message: `✅ ${formatEpisodeName(episodeKey)} disponible sur ${host}`,
                progress: undefined
              });
            }
            
            Logger.success(`${episodeKey} available on ${host}`);
            break; // Passer à l'épisode suivant
          } else {
            if (sessionId) {
              sendProgressUpdate(sessionId, {
                type: 'status',
                message: `❌ ${host} non disponible pour ${formatEpisodeName(episodeKey)}`,
                progress: undefined
              });
            }
          }
        } catch (error) {
          if (sessionId) {
            sendProgressUpdate(sessionId, {
              type: 'status',
              message: `⚠️ Erreur avec ${host} pour ${formatEpisodeName(episodeKey)}`,
              progress: undefined
            });
          }
          Logger.info(`Error checking ${host} for ${episodeKey}: ${error}`);
          continue;
        }
      }
    }
  }

  return {
    host: bestHost,
    link: bestLink,
    available: episodeAvailable,
    error: episodeAvailable ? undefined : 'Aucun hébergeur disponible',
    filesize: bestFilesize
  };
};

/**
 * Check download availability for links using AllDebrid service (parallelized)
 * @param {string} downloadLink - URL of the download page to check
 * @param {'films' | 'series' | 'mangas'} type - Content type
 * @param {string} allDebridApiKey - AllDebrid API key
 * @param {string[]} [episodes] - Optional specific episodes to check
 * @param {string} [sessionId] - Optional session ID for progress updates
 * @returns {Promise<DownloadAvailability>} Download availability information
 * @throws {Error} When verification is cancelled by user or fails
 */
const checkAvailability = async (
  downloadLink: string, 
  type: 'films' | 'series' | 'mangas',
  allDebridApiKey: string,
  episodes?: string[],
  sessionId?: string
): Promise<DownloadAvailability> => {
  try {
    if (sessionId) {
      // Enregistrer la session comme active
      activeSessions.set(sessionId, { cancelled: false });
      
      sendProgressUpdate(sessionId, {
        type: 'status',
        message: 'Début de la vérification de disponibilité...',
        progress: 0
      });
    }

    Logger.info(`Checking availability for ${type}${episodes ? ` episodes ${episodes.join(', ')}` : ''}`);
    
    // Scraper les liens (pour tous les épisodes sélectionnés)
    const scrapedHosts = await scrapeDownloadLinks(downloadLink, undefined, sessionId);
    
    const availability: DownloadAvailability = {
      type,
      episodes,
      availability: {}
    };

    // Déterminer les épisodes à vérifier
    let episodesToCheck: string[] = [];
    
    if (type === 'films') {
      // Pour les films, pas d'épisodes
      episodesToCheck = ['film'];
    } else {
      // Pour les séries/mangas
      if (episodes && episodes.length > 0) {
        // Épisodes spécifiques
        episodesToCheck = episodes.map(ep => `episode_${ep}`);
      } else {
        // Tous les épisodes disponibles
        const allEpisodes = new Set<string>();
        Object.values(scrapedHosts).forEach(host => {
          Object.keys(host).forEach(key => {
            if (key.startsWith('episode_')) {
              allEpisodes.add(key);
            }
          });
        });
        // Tri numérique des épisodes (episode_1, episode_2, ..., episode_10)
        episodesToCheck = Array.from(allEpisodes).sort((a, b) => {
          const numA = parseInt(a.replace('episode_', ''));
          const numB = parseInt(b.replace('episode_', ''));
          return numA - numB;
        });
      }
    }

    if (sessionId) {
      sendProgressUpdate(sessionId, {
        type: 'status',
        message: `Vérification de ${episodesToCheck.length} épisode(s) sur ${Object.keys(scrapedHosts).length} hébergeur(s)...`,
        progress: 40
      });
    }

    // PARALLÉLISATION : Vérifier tous les épisodes en même temps
    Logger.info(`Starting parallel verification of ${episodesToCheck.length} episodes`);
    
    if (sessionId) {
      sendProgressUpdate(sessionId, {
        type: 'status',
        message: `Démarrage de la vérification parallèle de ${episodesToCheck.length} épisode(s)...`,
        progress: 40
      });
    }

    // Créer les promesses pour chaque épisode avec suivi de progression
    let completedCount = 0;
    const updateProgress = (episodeKey: string, success: boolean) => {
      completedCount++;
      if (sessionId) {
        const status = success ? '✅' : '❌';
        const message = success ? 'terminé' : 'échoué';
        sendProgressUpdate(sessionId, {
          type: 'status',
          message: `${status} ${formatEpisodeName(episodeKey)} ${message} (${completedCount}/${episodesToCheck.length})`,
          progress: 40 + (completedCount / episodesToCheck.length) * 50
        });
      }
    };

    const episodePromises = episodesToCheck.map(async (episodeKey) => {
      // Vérifier si la session a été annulée avant de commencer cette promesse
      if (sessionId && activeSessions.get(sessionId)?.cancelled) {
        throw new Error('Vérification annulée par l\'utilisateur');
      }

      Logger.info(`Starting verification of ${episodeKey}...`);
      
      try {
        const result = await checkEpisodeAvailability(
          episodeKey, 
          scrapedHosts, 
          allDebridApiKey, 
          type, 
          sessionId
        );
        
        // Vérifier à nouveau si la session a été annulée après la vérification
        if (sessionId && activeSessions.get(sessionId)?.cancelled) {
          throw new Error('Vérification annulée par l\'utilisateur');
        }
        
        // Mettre à jour la progression dès qu'un épisode est terminé
        updateProgress(episodeKey, true);
        
        return { episodeKey, result, success: true };
      } catch (error) {
        // Si c'est une annulation, la propager
        if (error instanceof Error && error.message === 'Vérification annulée par l\'utilisateur') {
          throw error;
        }
        
        Logger.error(`Error verifying ${episodeKey}: ${error}`);
        
        // Mettre à jour la progression même en cas d'erreur
        updateProgress(episodeKey, false);
        
        return { 
          episodeKey, 
          result: {
            host: null,
            available: false,
            error: `Erreur lors de la vérification: ${error}`
          }, 
          success: false 
        };
      }
    });

    // Vérifier si la session a été annulée
    if (sessionId && activeSessions.get(sessionId)?.cancelled) {
      throw new Error('Vérification annulée par l\'utilisateur');
    }

    // Attendre que tous les épisodes soient vérifiés
    const episodeResults = await Promise.allSettled(episodePromises);
    
    // Vérifier si la session a été annulée après Promise.allSettled
    if (sessionId && activeSessions.get(sessionId)?.cancelled) {
      throw new Error('Vérification annulée par l\'utilisateur');
    }
    
    // Vérifier si une des promesses a été annulée
    const hasCancellation = episodeResults.some(result => 
      result.status === 'rejected' && 
      result.reason instanceof Error && 
      result.reason.message === 'Vérification annulée par l\'utilisateur'
    );
    
    if (hasCancellation) {
      throw new Error('Vérification annulée par l\'utilisateur');
    }
    
    // Traiter les résultats (la progression est déjà mise à jour dans les promesses)
    episodeResults.forEach((result, index) => {
      const episodeKey = episodesToCheck[index];
      
      if (result.status === 'fulfilled') {
        const { result: episodeResult } = result.value;
        availability.availability[episodeKey] = episodeResult;
      } else {
        // Gérer l'erreur pour cet épisode
        availability.availability[episodeKey] = {
          host: null,
          available: false,
          error: `Erreur lors de la vérification: ${result.reason}`
        };
      }
    });

    if (sessionId) {
      sendProgressUpdate(sessionId, {
        type: 'complete',
        message: 'Vérification terminée !',
        progress: 100,
        data: availability
      });
      
      // Nettoyer la session
      activeSessions.delete(sessionId);
    }

    Logger.success(`Availability check completed for ${episodesToCheck.length} episodes`);
    return availability;

  } catch (error) {
    if (sessionId) {
      sendProgressUpdate(sessionId, {
        type: 'error',
        message: `Erreur lors de la vérification: ${error}`,
        progress: 0
      });
      
      // Nettoyer la session même en cas d'erreur
      activeSessions.delete(sessionId);
    }
    Logger.error(`Error checking availability: ${error}`);
    throw error;
  }
};

/**
 * Cancel an ongoing availability check session
 * @param {string} sessionId - Session ID to cancel
 * @returns {Promise<boolean>} True if session was cancelled, false if not found
 */
const cancelAvailabilityCheck = async (sessionId: string): Promise<boolean> => {
  try {
    if (activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, { cancelled: true });
      
      // Envoyer une notification d'annulation via WebSocket
      sendProgressUpdate(sessionId, {
        type: 'error',
        message: 'Vérification annulée par l\'utilisateur',
        progress: 0
      });

      Logger.info(`Availability check cancelled for session: ${sessionId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    Logger.error(`Error cancelling availability check: ${error}`);
    return false;
  }
};

const DownloadService = {
  checkAvailability,
  cancelAvailabilityCheck
};

export default DownloadService;
