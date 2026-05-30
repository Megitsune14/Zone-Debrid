import Logger from '@/base/Logger';
import https from 'https';
import http from 'http';
import zlib from 'zlib';
import { URL } from 'url';
import { ProxyAgent } from 'undici';
import { HttpsProxyAgent } from 'https-proxy-agent';

const API_BASE = "https://api.alldebrid.com/v4";
const VALIDATION_TIMEOUT_MS = 4000;
const LOG_BODY_MAX_LENGTH = 2000;
const MAX_API_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 307, 308]);

const downloadAgent = process.env.PROXY_URL && process.env.NODE_ENV === 'production'
  ? new HttpsProxyAgent(process.env.PROXY_URL)
  : undefined;

const apiDispatcher = process.env.PROXY_URL && process.env.NODE_ENV === 'production'
  ? new ProxyAgent(process.env.PROXY_URL)
  : undefined;

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

interface FetchApiInit extends RequestInit {
  timeoutMs?: number;
  logContext?: string;
}

const maskAuthorization = (headers?: HeadersInit): Record<string, string> => {
  const normalized: Record<string, string> = {};

  if (!headers) return normalized;

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = key.toLowerCase() === 'authorization'
        ? maskBearerToken(value)
        : value;
    });
    return normalized;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      normalized[key] = key.toLowerCase() === 'authorization'
        ? maskBearerToken(value)
        : value;
    }
    return normalized;
  }

  for (const [key, value] of Object.entries(headers)) {
    normalized[key] = key.toLowerCase() === 'authorization'
      ? maskBearerToken(String(value))
      : String(value);
  }

  return normalized;
};

const maskBearerToken = (authorization: string): string => {
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (token.length <= 4) return 'Bearer ****';
  return `Bearer ****${token.slice(-4)}`;
};

const truncateForLog = (value: string, maxLength: number = LOG_BODY_MAX_LENGTH): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}… [truncated ${value.length - maxLength} chars]`;
};

const serializeRequestBody = (body: BodyInit | null | undefined): string => {
  if (body == null) return '[empty]';
  if (typeof body === 'string') return truncateForLog(body);
  if (body instanceof URLSearchParams) return truncateForLog(body.toString());
  return `[${body.constructor.name}]`;
};

const getProxyLogContext = (): string => {
  const viaProxy = Boolean(apiDispatcher || downloadAgent);
  const proxyUrl = process.env.PROXY_URL ?? 'undefined';
  return `proxy=${viaProxy ? 'enabled' : 'disabled'} env=${process.env.NODE_ENV ?? 'unknown'} proxyUrl=${proxyUrl}`;
};

const headersToObject = (headers: Headers): Record<string, string> => {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

const logAllDebridRequest = (
  kind: 'api' | 'download',
  method: string,
  url: string,
  details: Record<string, unknown>
): void => {
  Logger.info(`[AllDebrid][${kind}] → REQUEST ${method} ${url}`);
  Logger.info(`[AllDebrid][${kind}] ${getProxyLogContext()}`);
  for (const [key, value] of Object.entries(details)) {
    Logger.info(`[AllDebrid][${kind}] req.${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`);
  }
};

const logAllDebridResponse = (
  kind: 'api' | 'download',
  method: string,
  url: string,
  details: Record<string, unknown>
): void => {
  Logger.info(`[AllDebrid][${kind}] ← RESPONSE ${method} ${url}`);
  for (const [key, value] of Object.entries(details)) {
    Logger.info(`[AllDebrid][${kind}] res.${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`);
  }
};

const logAllDebridError = (
  kind: 'api' | 'download',
  method: string,
  url: string,
  error: unknown,
  details: Record<string, unknown> = {}
): void => {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  Logger.error(`[AllDebrid][${kind}] ✗ ERROR ${method} ${url}: ${message}`);
  for (const [key, value] of Object.entries(details)) {
    Logger.error(`[AllDebrid][${kind}] err.${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`);
  }
  if (stack) Logger.error(`[AllDebrid][${kind}] stack=${stack}`);
};

const isGzipBuffer = (buffer: Buffer): boolean =>
  buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;

/**
 * Décode le corps HTTP : le proxy VPN peut renvoyer du gzip/br sans header Content-Encoding.
 */
const decodeResponseBody = (buffer: Buffer, contentEncoding?: string | null): string => {
  const encoding = contentEncoding?.toLowerCase();

  const tryDecode = (label: string, fn: (input: Buffer) => Buffer): string | null => {
    try {
      const decoded = fn(buffer).toString('utf8');
      if (decoded.trim().startsWith('{') || decoded.trim().startsWith('[')) {
        Logger.info(`[AllDebrid][api] body decoded as ${label}`);
        return decoded;
      }
    } catch {
      // format non compatible, on essaie le suivant
    }
    return null;
  };

  if (encoding === 'gzip' || encoding === 'x-gzip' || isGzipBuffer(buffer)) {
    const decoded = tryDecode('gzip', zlib.gunzipSync);
    if (decoded) return decoded;
  }
  if (encoding === 'deflate') {
    const decoded = tryDecode('deflate', zlib.inflateSync);
    if (decoded) return decoded;
  }
  if (encoding === 'br') {
    const decoded = tryDecode('br', zlib.brotliDecompressSync);
    if (decoded) return decoded;
  }

  const plain = buffer.toString('utf8');
  if (plain.trim().startsWith('{') || plain.trim().startsWith('[')) {
    return plain;
  }

  // Fallback : proxy sans Content-Encoding mais corps compressé
  for (const [label, fn] of [
    ['gzip', zlib.gunzipSync],
    ['brotli', zlib.brotliDecompressSync],
    ['deflate', zlib.inflateSync]
  ] as const) {
    const decoded = tryDecode(label, fn);
    if (decoded) return decoded;
  }

  return plain;
};

const readResponseBody = async (response: Response): Promise<string> => {
  const buffer = Buffer.from(await response.arrayBuffer());
  return decodeResponseBody(buffer, response.headers.get('content-encoding'));
};

const parseAllDebridJson = async (
  response: Response,
  url: string,
  context: string
): Promise<AllDebridResponse> => {
  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const contentEncoding = response.headers.get('content-encoding');
  const rawBody = decodeResponseBody(rawBuffer, contentEncoding);

  logAllDebridResponse('api', context, url, {
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? 'none',
    contentEncoding: contentEncoding ?? 'none',
    contentLength: response.headers.get('content-length') ?? 'unknown',
    rawBodyLength: rawBuffer.length,
    decodedBodyLength: rawBody.length,
    bodyPreview: truncateForLog(rawBody || '[empty body]')
  });

  if (!rawBody.trim()) {
    throw new Error(`AllDebrid API empty response (HTTP ${response.status}) [${context}]`);
  }

  try {
    return JSON.parse(rawBody) as AllDebridResponse;
  } catch {
    throw new Error(
      `AllDebrid API invalid JSON (HTTP ${response.status}) [${context}]: ${truncateForLog(rawBody, 300)}`
    );
  }
};

/**
 * fetch vers l'API AllDebrid, avec proxy VPN en production (undici ProxyAgent).
 * Redirects suivis manuellement : le proxy ne propage pas toujours les 301 POST automatiquement.
 */
const fetchApi = async (path: string, init: FetchApiInit = {}): Promise<Response> => {
  const { timeoutMs, logContext, ...fetchInit } = init;
  const method = (fetchInit.method ?? 'GET').toUpperCase();
  let url = `${API_BASE}${path}`;
  const context = logContext ?? path;
  const startedAt = Date.now();
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  logAllDebridRequest('api', method, url, {
    context,
    headers: maskAuthorization(fetchInit.headers),
    body: serializeRequestBody(fetchInit.body),
    timeoutMs: timeoutMs ?? 'none'
  });

  if (timeoutMs !== undefined) {
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  const requestInit: RequestInit = {
    ...fetchInit,
    method,
    signal: controller.signal,
    redirect: 'manual',
    headers: {
      'User-Agent': 'Zone-Debrid/1.0',
      'Accept-Encoding': 'identity',
      ...fetchInit.headers
    },
    ...(apiDispatcher && { dispatcher: apiDispatcher })
  };

  try {
    for (let redirectAttempt = 0; redirectAttempt <= MAX_API_REDIRECTS; redirectAttempt++) {
      const response = await fetch(url, requestInit);

      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get('location');
        Logger.info(`[AllDebrid][api] redirect ${response.status} attempt=${redirectAttempt + 1} from=${url} location=${location ?? 'missing'}`);

        if (!location) {
          throw new Error(`AllDebrid redirect without Location header (HTTP ${response.status})`);
        }

        url = new URL(location, url).toString();
        continue;
      }

      logAllDebridResponse('api', method, url, {
        context,
        status: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - startedAt,
        redirectAttempts: redirectAttempt,
        headers: headersToObject(response.headers)
      });

      return response;
    }

    throw new Error('AllDebrid API: too many redirects');
  } catch (error) {
    logAllDebridError('api', method, url, error, {
      context,
      durationMs: Date.now() - startedAt
    });
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

/**
 * Send POST form data to AllDebrid API
 */
const postForm = async (path: string, formData: Record<string, string>, apiKey: string): Promise<any> => {
  const response = await fetchApi(path, {
    method: 'POST',
    logContext: path,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(formData)
  });

  const data = await parseAllDebridJson(response, `${API_BASE}${path}`, path);

  if (data.status !== 'success') {
    throw new Error(`${data.error?.code}: ${data.error?.message}`);
  }

  Logger.info(`[AllDebrid][api] postForm success path=${path}`);
  return data.data;
};

/**
 * Check if a dl-protect link is available through AllDebrid
 */
const checkLinkAvailability = async (dlProtectUrl: string, apiKey: string, isCancelled?: () => boolean): Promise<LinkAvailability> => {
  let retryCount = 0;

  while (true) {
    try {
      if (isCancelled && isCancelled()) {
        throw new Error('Vérification annulée par l\'utilisateur');
      }

      Logger.info(`[AllDebrid][api] checkLinkAvailability start attempt=${retryCount + 1} url=${dlProtectUrl}`);

      const redirectorData = await postForm('/link/redirector', {
        link: dlProtectUrl
      }, apiKey);

      Logger.info(`[AllDebrid][api] redirector links count=${redirectorData.links?.length ?? 0}`);

      if (!redirectorData.links || redirectorData.links.length === 0) {
        return {
          available: false,
          error: 'Aucun lien trouvé dans le redirector'
        };
      }

      for (const redirectLink of redirectorData.links) {
        if (isCancelled && isCancelled()) {
          throw new Error('Vérification annulée par l\'utilisateur');
        }

        Logger.info(`[AllDebrid][api] unlock attempt link=${redirectLink}`);

        try {
          const unlockedData = await postForm('/link/unlock', {
            link: redirectLink
          }, apiKey);

          if (unlockedData.link) {
            Logger.info(`[AllDebrid][api] unlock success filename=${unlockedData.filename ?? 'unknown'}`);
            return {
              available: true,
              debridedLink: unlockedData.link,
              filename: unlockedData.filename,
              filesize: unlockedData.filesize
            };
          }
        } catch (error) {
          Logger.info(`[AllDebrid][api] unlock failed link=${redirectLink} error=${error instanceof Error ? error.message : error}`);
          continue;
        }
      }

      return {
        available: false,
        error: 'Aucun lien n\'a pu être débridé'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';

      if (errorMessage === 'Vérification annulée par l\'utilisateur') {
        throw error;
      }

      Logger.error(`[AllDebrid][api] checkLinkAvailability error attempt=${retryCount + 1}: ${errorMessage}`);

      if (errorMessage.includes('Could not extract links')) {
        retryCount++;
        Logger.info(`[AllDebrid][api] retry Could not extract links attempt=${retryCount}`);

        if (isCancelled && isCancelled()) {
          throw new Error('Vérification annulée par l\'utilisateur');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      return {
        available: false,
        error: errorMessage
      };
    }
  }
};

/**
 * Vérifie si l'API AllDebrid est joignable (sans valider de clé).
 */
export const isAvailable = async (): Promise<boolean> => {
  try {
    Logger.info('[AllDebrid][api] isAvailable start');
    const response = await fetchApi('/', {
      method: 'GET',
      logContext: 'healthcheck',
      timeoutMs: VALIDATION_TIMEOUT_MS
    });
    const rawBody = await readResponseBody(response);

    logAllDebridResponse('api', 'GET', `${API_BASE}/`, {
      context: 'healthcheck',
      status: response.status,
      decodedBodyLength: rawBody.length,
      bodyPreview: truncateForLog(rawBody || '[empty body]')
    });

    const available = response.status < 500;
    Logger.info(`[AllDebrid][api] isAvailable result=${available ? 'up' : 'down'}`);
    return available;
  } catch (error) {
    logAllDebridError('api', 'GET', `${API_BASE}/`, error, { context: 'healthcheck' });
    return false;
  }
};

/**
 * Validate an AllDebrid API key by making a test request.
 */
const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    Logger.info('[AllDebrid][api] validateApiKey start');
    const response = await fetchApi('/user', {
      method: 'POST',
      logContext: 'validateApiKey',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({}),
      timeoutMs: VALIDATION_TIMEOUT_MS
    });

    const data = await parseAllDebridJson(response, `${API_BASE}/user`, 'validateApiKey');

    if (data.status === 'success') {
      Logger.info('[AllDebrid][api] validateApiKey success');
      return true;
    }

    Logger.error(`[AllDebrid][api] validateApiKey invalid code=${data.error?.code ?? response.status} message=${data.error?.message ?? 'unknown'}`);
    return false;
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TypeError')) {
      logAllDebridError('api', 'POST', `${API_BASE}/user`, error, { context: 'validateApiKey-network' });
      throw error;
    }

    logAllDebridError('api', 'POST', `${API_BASE}/user`, error, { context: 'validateApiKey' });
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
 */
const proxyDownloadWithRange = async (
  url: string,
  apiKey: string,
  range?: string
): Promise<ProxyDownloadResponse> => {
  const startedAt = Date.now();

  logAllDebridRequest('download', 'GET', url, {
    range: range ?? 'none',
    authorization: maskBearerToken(`Bearer ${apiKey}`)
  });

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
        agent: downloadAgent
      };

      const req = httpModule.request(options, (res) => {
        logAllDebridResponse('download', 'GET', url, {
          statusCode: res.statusCode ?? 0,
          statusMessage: res.statusMessage ?? '',
          durationMs: Date.now() - startedAt,
          headers: res.headers
        });

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

        Logger.info(`[AllDebrid][download] stream opened status=${res.statusCode ?? 200}`);
        resolve({
          statusCode: res.statusCode || 200,
          headers: forwardHeaders,
          stream: res
        });
      });

      req.on('error', (error) => {
        logAllDebridError('download', 'GET', url, error, { durationMs: Date.now() - startedAt });
        reject(error);
      });

      req.end();
    } catch (error) {
      logAllDebridError('download', 'GET', url, error, { durationMs: Date.now() - startedAt });
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
