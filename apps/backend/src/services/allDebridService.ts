import Logger from '@/base/Logger';
import https from 'https';
import http from 'http';
import zlib from 'zlib';
import { URL } from 'url';
import { HttpsProxyAgent } from 'https-proxy-agent';

const API_BASE = "https://api.alldebrid.com/v4";
const VALIDATION_TIMEOUT_MS = 4000;

const agent = process.env.PROXY_URL && process.env.NODE_ENV === 'production' ? new HttpsProxyAgent(process.env.PROXY_URL) : undefined;
const apiAgent = process.env.NODE_ENV === 'production' ? agent : undefined;

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

interface HttpsRequestOptions {
  method: 'GET' | 'POST';
  path: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

const decompressResponseBody = (body: Buffer, contentEncoding?: string): Buffer => {
  switch (contentEncoding) {
    case 'gzip':
      return zlib.gunzipSync(body);
    case 'deflate':
      return zlib.inflateSync(body);
    case 'br':
      return zlib.brotliDecompressSync(body);
    default:
      return body;
  }
};

const parseAllDebridResponse = (statusCode: number, responseBody: string): AllDebridResponse => {
  if (!responseBody.trim()) {
    throw new Error(`AllDebrid API returned empty response (HTTP ${statusCode})`);
  }

  try {
    return JSON.parse(responseBody) as AllDebridResponse;
  } catch {
    throw new Error(`AllDebrid API returned invalid JSON (HTTP ${statusCode})`);
  }
};

/**
 * Requête HTTPS vers l'API AllDebrid, avec proxy VPN en production.
 */
const requestHttps = (options: HttpsRequestOptions): Promise<{ statusCode: number; body: string }> => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(`${API_BASE}${options.path}`);
    const headers: Record<string, string> = {
      'User-Agent': 'Zone-Debrid/1.0',
      'Accept-Encoding': 'identity',
      ...options.headers
    };
    if (options.body !== undefined) {
      headers['Content-Length'] = String(Buffer.byteLength(options.body));
    }

    const req = https.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method,
        headers,
        agent: apiAgent
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          clearRequestTimeout();
          try {
            const rawBody = Buffer.concat(chunks);
            const contentEncoding = typeof res.headers['content-encoding'] === 'string'
              ? res.headers['content-encoding']
              : undefined;
            const body = decompressResponseBody(rawBody, contentEncoding).toString('utf8');
            resolve({ statusCode: res.statusCode ?? 0, body });
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const clearRequestTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
    };

    if (options.timeoutMs !== undefined) {
      timeoutId = setTimeout(() => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        req.destroy(err);
      }, options.timeoutMs);
    }

    req.on('error', (error) => {
      clearRequestTimeout();
      reject(error);
    });

    if (options.body !== undefined) req.write(options.body);
    req.end();
  });
};

/**
 * Send POST form data to AllDebrid API
 * @param {string} path - API endpoint path
 * @param {Record<string, string>} formData - Form data to send
 * @param {string} apiKey - AllDebrid API key
 * @returns {Promise<any>} API response data
 * @throws {Error} When API returns error status
 */
const postForm = async (path: string, formData: Record<string, string>, apiKey: string): Promise<any> => {
  const body = new URLSearchParams(formData).toString();
  const { statusCode, body: responseBody } = await requestHttps({
    method: 'POST',
    path,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (statusCode >= 400) {
    throw new Error(`AllDebrid API HTTP ${statusCode}`);
  }

  const data = parseAllDebridResponse(statusCode, responseBody);

  if (data.status !== 'success') {
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

      const isRetryableError =
        errorMessage.includes('Could not extract links') ||
        errorMessage.includes('empty response') ||
        errorMessage.includes('invalid JSON');

      if (isRetryableError) {
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
 * Vérifie si l'API AllDebrid est joignable (sans valider de clé).
 * Timeout court pour ne pas bloquer.
 */
export const isAvailable = async (): Promise<boolean> => {
  try {
    const { statusCode } = await requestHttps({
      method: 'GET',
      path: '/',
      timeoutMs: VALIDATION_TIMEOUT_MS
    });
    return statusCode < 500;
  } catch {
    return false;
  }
};

/**
 * Validate an AllDebrid API key by making a test request.
 * Returns false only for invalid key; throws on network/timeout so caller can return 502.
 */
const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    const { statusCode, body } = await requestHttps({
      method: 'POST',
      path: '/user',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: '',
      timeoutMs: VALIDATION_TIMEOUT_MS
    });
    if (statusCode >= 400) {
      Logger.error(`AllDebrid API key validation HTTP error: ${statusCode}`);
      return false;
    }
    const data = parseAllDebridResponse(statusCode, body);
    if (data.status === 'success') return true;
    Logger.error(`AllDebrid API key invalid: ${data.error?.code ?? statusCode}`);
    return false;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TypeError')) {
      throw error;
    }
    Logger.error(`AllDebrid API key validation error: ${error}`);
    return false;
  }
};

export interface ProxyDownloadResponse {
  statusCode: number
  headers: Record<string, string>
  stream: NodeJS.ReadableStream
}

/**
 * Proxy download with HTTP Range support (206 Partial Content).
 * All requests go through the server so client IP is never sent to the provider.
 * @param url - The AllDebrid download URL
 * @param apiKey - AllDebrid API key
 * @param range - Optional Range header value (e.g. "bytes=0-1023")
 * @returns Response with statusCode, headers to forward, and body stream
 */
const proxyDownloadWithRange = async (
  url: string,
  apiKey: string,
  range?: string
): Promise<ProxyDownloadResponse> => {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const requestHeaders: Record<string, string> = {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Zone-Debrid/1.0'
      };
      if (range) {
        requestHeaders['Range'] = range;
      }

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: requestHeaders,
        agent: apiAgent
      };

      const req = httpModule.request(options, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        const forwardHeaders: Record<string, string> = {};
        const safeHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
        for (const name of safeHeaders) {
          const value = res.headers[name];
          if (typeof value === 'string') forwardHeaders[name] = value;
        }
        resolve({
          statusCode: res.statusCode || 200,
          headers: forwardHeaders,
          stream: res
        });
      });

      req.on('error', (error) => {
        Logger.error(`Error proxying download from AllDebrid: ${error}`);
        reject(error);
      });

      req.end();
    } catch (error) {
      Logger.error(`Error setting up proxy download: ${error}`);
      reject(error);
    }
  });
};

const AllDebridService = {
  isAvailable,
  checkLinkAvailability,
  validateApiKey,
  proxyDownloadWithRange
};

export default AllDebridService;