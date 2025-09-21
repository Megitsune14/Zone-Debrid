import Logger from '@/base/Logger';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';

const API_BASE = "https://api.alldebrid.com/v4";

const agent = new HttpsProxyAgent(process.env.PROXY_URL);

interface AllDebridResponse {
  status: string;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

interface LinkAvailability {
  available: boolean;
  debridedLink?: string;
  filename?: string;
  filesize?: string;
  error?: string;
}

/**
 * Send POST form data to AllDebrid API
 * @param {string} path - API endpoint path
 * @param {Record<string, string>} formData - Form data to send
 * @param {string} apiKey - AllDebrid API key
 * @returns {Promise<any>} API response data
 * @throws {Error} When API returns error status
 */
const postForm = async (path: string, formData: Record<string, string>, apiKey: string): Promise<any> => {
  const body = new URLSearchParams(formData);
  
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  const data: AllDebridResponse = await response.json();
  
  if (data.status !== "success") {
    throw new Error(`${data.error?.code}: ${data.error?.message}`);
  }
  
  return data.data;
};

/**
 * Check if a dl-protect link is available through AllDebrid
 * @param {string} dlProtectUrl - The dl-protect URL to check
 * @param {string} apiKey - AllDebrid API key
 * @param {() => boolean} [isCancelled] - Optional cancellation check function
 * @returns {Promise<LinkAvailability>} Link availability information
 * @throws {Error} When verification is cancelled by user
 */
const checkLinkAvailability = async (dlProtectUrl: string, apiKey: string, isCancelled?: () => boolean): Promise<LinkAvailability> => {
  let retryCount = 0;

  while (true) {
    try {
      // Vérifier si la vérification a été annulée
      if (isCancelled && isCancelled()) {
        throw new Error('Vérification annulée par l\'utilisateur');
      }

      Logger.debug(`Checking link availability: ${dlProtectUrl} (attempt ${retryCount + 1})`);
      
      // 1) Extraire les liens depuis dl-protect (redirector)
      Logger.debug(`Processing dl-protect URL: ${dlProtectUrl}`)
      const redirectorData = await postForm("/link/redirector", { 
        link: dlProtectUrl 
      }, apiKey);
      
      if (!redirectorData.links || redirectorData.links.length === 0) {
        return {
          available: false,
          error: "Aucun lien trouvé dans le redirector"
        };
      }

      // 2) Débrider chaque lien "redirect.alldebrid.com/..."
      for (const redirectLink of redirectorData.links) {
        // Vérifier si la vérification a été annulée avant chaque lien
        if (isCancelled && isCancelled()) {
          throw new Error('Vérification annulée par l\'utilisateur');
        }

        try {
          const unlockedData = await postForm("/link/unlock", { 
            link: redirectLink 
          }, apiKey);
          
          if (unlockedData.link) {
            Logger.debug(`Link unlocked successfully: ${unlockedData.filename}`);
            return {
              available: true,
              debridedLink: unlockedData.link,
              filename: unlockedData.filename,
              filesize: unlockedData.filesize
            };
          }
        } catch (error) {
          Logger.debug(`Failed to unlock link ${redirectLink}: ${error}`);
          continue; // Essayer le lien suivant
        }
      }

      // Aucun lien n'a pu être débridé
      return {
        available: false,
        error: "Aucun lien n'a pu être débridé"
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      
      // Si c'est une annulation, la propager
      if (errorMessage === 'Vérification annulée par l\'utilisateur') {
        throw error;
      }
      
      Logger.error(`Error checking link availability (attempt ${retryCount + 1}): ${errorMessage}`);
      
                // Si c'est "Could not extract links", on réessaie indéfiniment
        if (errorMessage.includes('Could not extract links')) {
          retryCount++;
          Logger.info(`Could not extract links, retrying... (attempt ${retryCount})`);
          
          // Vérifier si la vérification a été annulée avant de réessayer
          if (isCancelled && isCancelled()) {
            throw new Error('Vérification annulée par l\'utilisateur');
          }
          
          // Attendre un peu avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      
      // Pour les autres erreurs, on arrête
      return {
        available: false,
        error: errorMessage
      };
    }
  }
};

/**
 * Validate an AllDebrid API key by making a test request
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<boolean>} True if API key is valid, false otherwise
 */
const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    await postForm("/user", {}, apiKey);
    return true;
  } catch (error) {
    Logger.error(`Invalid AllDebrid API key: ${error}`);
    return false;
  }
};

/**
 * Download a file from AllDebrid as a readable stream
 * @param {string} url - The AllDebrid download URL
 * @param {string} apiKey - AllDebrid API key for authentication
 * @returns {Promise<NodeJS.ReadableStream>} Readable stream of the file
 * @throws {Error} When download fails or HTTP error occurs
 */
const downloadFile = async (url: string, apiKey: string): Promise<NodeJS.ReadableStream> => {
  return new Promise((resolve, reject) => {
    try {
      Logger.info(`Downloading file from AllDebrid: ${url}`);
      
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'User-Agent': 'Zone-Debrid/1.0'
        },
        agent
      };

      const req = httpModule.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        
        resolve(res);
      });

      req.on('error', (error) => {
        Logger.error(`Error downloading file from AllDebrid: ${error}`);
        reject(error);
      });

      req.end();
    } catch (error) {
      Logger.error(`Error setting up download from AllDebrid: ${error}`);
      reject(error);
    }
  });
};

const AllDebridService = {
  checkLinkAvailability,
  validateApiKey,
  downloadFile
};

export default AllDebridService;