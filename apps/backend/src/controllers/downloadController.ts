import { Request, Response, NextFunction } from 'express';
import { Readable } from 'stream';
import { Transform } from 'stream';
import archiver from 'archiver';
import downloadService from '@/services/downloadService';
import allDebridService from '@/services/allDebridService';
import downloadSessionService from '@/services/downloadSessionService';
import downloadHistoryService from '@/services/downloadHistoryService';
import aria2Service from '@/services/aria2Service';
import { buildMediaPath } from '@/utils/mediaPathBuilder';
import User from '@/models/User';
import type { IDownloadSession } from '@/models/DownloadSession';
import Logger from '@/base/Logger';
import { AppError } from '@/middleware/errorHandler';

const FORWARD_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges'];

/** Protocole effectif pour la génération d’URL (HTTPS derrière reverse proxy). */
function getEffectiveProtocol(req: Request): string {
  const forwarded = req.get('x-forwarded-proto');
  if (forwarded === 'https' || forwarded === 'http') return forwarded;
  return req.protocol;
}

/**
 * Check download availability for links using AllDebrid service
 * @param {Request} req - Express request object containing downloadLink, type, episodes, and optional sessionId
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with availability check result or error message
 */
export const checkDownloadAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { downloadLink, type, episodes, sessionId } = req.body;
    const user = req.user;

    // Validation des données
    if (!downloadLink || !type) {
      return res.status(400).json({
        success: false,
        message: 'downloadLink et type sont requis'
      });
    }

    if (!['films', 'series', 'mangas'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type doit être films, series ou mangas'
      });
    }

    if (!user?.allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Clé API AllDebrid requise'
      });
    }

    Logger.info(`Download availability check requested for: ${downloadLink}${sessionId ? ` (session: ${sessionId})` : ''}`);

    // Si un sessionId est fourni, on lance la vérification en arrière-plan avec WebSocket
    if (sessionId) {
      // Répondre immédiatement pour confirmer le début du processus
      res.json({
        success: true,
        message: 'Vérification démarrée en arrière-plan',
        sessionId
      });

      // Lancer la vérification en arrière-plan (sans await pour ne pas bloquer)
      downloadService.checkAvailability(
        downloadLink,
        type,
        user.getDecryptedAllDebridApiKey(),
        episodes,
        sessionId
      ).catch(error => {
        Logger.error(`Background download check failed for session ${sessionId}: ${error}`);
      });

      return;
    }

  } catch (error: unknown) {
    Logger.error(`Download controller error: ${error instanceof Error ? error.message : error}`);
    next(error instanceof Error ? error : new AppError('Erreur lors de la vérification de disponibilité', 500, 'CHECK_AVAILABILITY'));
  }
};

/**
 * GET /api/downloads/signed-proxy?url=...&filename=...&totalBytes=...
 * Authentifié. Crée une DownloadSession (file), retourne une URL signée pour téléchargement natif.
 */
export const getSignedProxy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { url, filename, totalBytes } = req.query;

    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    if (!user?.allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Clé API AllDebrid requise'
      });
    }
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, message: 'url requise' });
    }

    const safeFilename = typeof filename === 'string' && filename.trim()
      ? filename.trim().replace(/[^\w\s\-\.]/g, '_')
      : 'download';
    const total = totalBytes != null && totalBytes !== '' ? parseInt(String(totalBytes), 10) : undefined;
    const historyId = typeof req.query.historyId === 'string' ? req.query.historyId : undefined;
    const session = await downloadSessionService.createFileSession(
      user.id,
      url,
      safeFilename,
      Number.isFinite(total) ? total : null,
      historyId
    );

    const baseUrl = `${getEffectiveProtocol(req)}://${req.get('host') || ''}`;
    const { url: downloadUrl } = downloadSessionService.getSignedDownloadUrl(baseUrl, session._id.toString());

    res.json({
      success: true,
      downloadUrl,
      downloadSessionId: session._id.toString()
    });
  } catch (error: unknown) {
    Logger.error(`getSignedProxy error: ${error instanceof Error ? error.message : error}`);
    next(error instanceof Error ? error : new AppError('Erreur lors de la création de l\'URL de téléchargement', 500, 'PROXY'));
  }
};

/**
 * POST /api/downloads/signed-proxy/zip
 * Body: { files: [{ url, filename, fileSize? }], zipFilename }
 * Authentifié. Crée une DownloadSession (zip), retourne une URL signée.
 */
export const getSignedProxyZip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { files, zipFilename } = req.body;

    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    if (!user?.allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Clé API AllDebrid requise'
      });
    }
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: 'files (tableau) requis' });
    }

    const name = typeof zipFilename === 'string' && zipFilename.trim()
      ? zipFilename.trim().replace(/[^\w\s\-\.]/g, '_')
      : 'download';
    const safeZipName = name.endsWith('.zip') ? name : `${name}.zip`;
    const totalEstimated = files.reduce(
      (sum: number, f: { fileSize?: number }) => sum + (Number(f?.fileSize) > 0 ? Number(f.fileSize) : 0),
      0
    );

    const historyId = typeof req.body.historyId === 'string' ? req.body.historyId : undefined;
    const session = await downloadSessionService.createZipSession(
      user.id,
      safeZipName,
      files.map((f: { url: string; filename: string; fileSize?: number }) => ({
        url: f.url,
        filename: f.filename,
        fileSize: f.fileSize
      })),
      totalEstimated > 0 ? totalEstimated : null,
      historyId
    );

    const baseUrl = `${getEffectiveProtocol(req)}://${req.get('host') || ''}`;
    const { url: downloadUrl } = downloadSessionService.getSignedZipDownloadUrl(baseUrl, session._id.toString());

    res.json({
      success: true,
      downloadUrl,
      downloadSessionId: session._id.toString()
    });
  } catch (error: unknown) {
    Logger.error(`getSignedProxyZip error: ${error instanceof Error ? error.message : error}`);
    next(error instanceof Error ? error : new AppError('Erreur lors de la création de l\'URL de téléchargement ZIP', 500, 'PROXY_ZIP'));
  }
};

/**
 * GET /api/downloads/stream/:sessionId?expires=...&signature=...
 * Pas d'auth. Valide la signature, stream le fichier et met à jour la session (bytesSent, status).
 */
function paramString (value: string | string[] | undefined): string | undefined {
  return value === undefined ? undefined : Array.isArray(value) ? value[0] : value;
}

export const streamProxy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = paramString(req.params.sessionId);
    const { expires, signature } = req.query;
    const range = req.headers.range;
    const rangeHeader = typeof range === 'string' ? range : undefined;

    if (!sessionId || !expires || !signature) {
      return res.status(403).json({ success: false, message: 'Paramètres manquants' });
    }
    const exp = parseInt(String(expires), 10);
    if (!downloadSessionService.verifySignature(sessionId, exp, String(signature))) {
      return res.status(403).json({ success: false, message: 'Lien invalide ou expiré' });
    }

    const session = await downloadSessionService.getSessionById(sessionId);
    if (!session || session.type !== 'file' || !session.sourceUrl) {
      return res.status(404).json({ success: false, message: 'Session non trouvée' });
    }
    const user = await User.findById(session.userId).exec();
    if (!user?.allDebridApiKey) {
      return res.status(403).json({ success: false, message: 'Utilisateur ou clé API invalide' });
    }
    const apiKey = user.getDecryptedAllDebridApiKey();

    const { statusCode, headers, stream } = await allDebridService.proxyDownloadWithRange(
      session.sourceUrl,
      apiKey,
      rangeHeader
    );

    res.status(statusCode);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(session.filename)}`
    );
    for (const [name, value] of Object.entries(headers)) {
      const lower = name.toLowerCase();
      if (FORWARD_HEADERS.includes(lower)) {
        res.setHeader(name, value);
      }
    }

    const UPDATE_INTERVAL = 512 * 1024;
    let bytesSent = 0;
    let lastUpdate = 0;

    const countStream = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        bytesSent += chunk.length;
        if (bytesSent - lastUpdate >= UPDATE_INTERVAL) {
          lastUpdate = bytesSent;
          downloadSessionService.updateBytesSent(sessionId, bytesSent).catch(() => {});
        }
        cb(null, chunk);
      },
      flush(cb) {
        downloadSessionService.updateBytesSent(sessionId, bytesSent).then(() => cb()).catch(() => cb());
      }
    });

    stream.pipe(countStream).pipe(res);

    const updateHistoryFromSession = async (status: 'completed' | 'error' | 'cancelled', errorMessage?: string) => {
      if (session.historyId) {
        await downloadHistoryService.updateDownloadHistory(
          session.historyId,
          String(session.userId),
          { status, endTime: new Date(), errorMessage, fileSize: session.totalBytes ?? undefined }
        ).catch(() => {});
      }
    };

    stream.on('error', async (err) => {
      Logger.error(`Download stream error (session): ${err}`);
      await downloadSessionService.setSessionStatus(sessionId, 'error', err?.message);
      await updateHistoryFromSession('error', err?.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Erreur lors du téléchargement' });
      } else {
        try { res.destroy(); } catch { /* ignore */ }
      }
    });

    res.on('close', async () => {
      if (!res.writableEnded) {
        await downloadSessionService.setSessionStatus(sessionId, 'aborted');
        await updateHistoryFromSession('cancelled');
      }
    });

    countStream.on('finish', async () => {
      await downloadSessionService.setSessionStatus(sessionId, 'completed');
      await updateHistoryFromSession('completed');
      Logger.info(`Download stream completed (session ${sessionId})`);
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    Logger.error(`Stream proxy error: ${message}`);
    if (!res.headersSent) {
      next(error instanceof Error ? error : new AppError('Erreur lors du téléchargement', 500, 'PROXY_STREAM'));
    }
  }
};

/**
 * Proxy de téléchargement avec support HTTP Range Request (206 Partial Content).
 * Requiert Authorization. Utilisé en fallback / legacy.
 */
export const downloadProxy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, filename } = req.query;
    const user = req.user;
    const range = req.headers.range;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'URL requise'
      });
    }

    if (!user?.allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Clé API AllDebrid requise'
      });
    }

    const apiKey = user.getDecryptedAllDebridApiKey();
    const rangeHeader = typeof range === 'string' ? range : undefined;

    Logger.info(`Download proxy requested (Range: ${rangeHeader || 'none'})`);

    const { statusCode, headers, stream } = await allDebridService.proxyDownloadWithRange(
      url,
      apiKey,
      rangeHeader
    );

    res.status(statusCode);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    const dispositionFilename = typeof filename === 'string' && filename.trim()
      ? filename.trim().replace(/[^\w\s\-\.]/g, '_')
      : 'download';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(dispositionFilename)}`
    );

    for (const [name, value] of Object.entries(headers)) {
      const lower = name.toLowerCase();
      if (FORWARD_HEADERS.includes(lower)) {
        res.setHeader(name, value);
      }
    }

    stream.pipe(res);

    stream.on('error', (error) => {
      Logger.error(`Download stream error: ${error}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors du téléchargement du fichier'
        });
      } else {
        try { res.destroy(); } catch { /* ignore */ }
      }
    });

    stream.on('end', () => {
      Logger.info(`Download proxy completed (${statusCode})`);
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    Logger.error(`Download proxy error: ${message}`);
    if (!res.headersSent) {
      const isNetwork = /ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED/i.test(message);
      next(new AppError(
        isNetwork ? 'Erreur réseau lors du téléchargement. Réessayez plus tard.' : 'Erreur lors du téléchargement du fichier',
        isNetwork ? 502 : 500,
        'PROXY'
      ));
    }
  }
};

/**
 * Génère et stream un ZIP des fichiers demandés.
 * Les fichiers sont récupérés via le proxy AllDebrid un par un (stream), sans tout charger en mémoire.
 * Body: { files: [{ url, filename, fileSize?: number }], zipFilename: string }
 * Si fileSize est fourni par fichier, la somme est envoyée en X-Estimated-Size pour la progression.
 */
export const downloadZip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { files, zipFilename } = req.body;
    const user = req.user;

    if (!user?.allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Clé API AllDebrid requise'
      });
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'files (tableau) est requis et ne doit pas être vide'
      });
    }

    const totalEstimated = files.reduce(
      (sum: number, f: { fileSize?: number }) => sum + (Number(f?.fileSize) > 0 ? Number(f.fileSize) : 0),
      0
    );

    const name =
      typeof zipFilename === 'string' && zipFilename.trim()
        ? zipFilename.trim().replace(/[^\w\s\-\.]/g, '_')
        : 'download';
    const safeZipName = name.endsWith('.zip') ? name : `${name}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(safeZipName)}`
    );
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'X-Estimated-Size');
    if (totalEstimated > 0) {
      res.setHeader('X-Estimated-Size', String(totalEstimated));
    }

    const apiKey = user.getDecryptedAllDebridApiKey();
    const archive = archiver('zip', { zlib: { level: 0 } });

    archive.on('error', (err) => {
      Logger.error(`Zip archive error: ${err}`);
      if (!res.headersSent) res.status(500).json({ success: false, message: 'Erreur ZIP' });
      else try { res.destroy(); } catch { /* ignore */ }
    });

    archive.pipe(res);

    for (const f of files) {
      if (!f?.url || !f?.filename) continue;
      const { stream } = await allDebridService.proxyDownloadWithRange(f.url, apiKey);
      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', reject);
        archive.append(stream as Readable, { name: String(f.filename) });
      });
    }

    await archive.finalize();
    Logger.info(`Zip stream completed: ${safeZipName} (${files.length} file(s))`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    Logger.error(`Download zip error: ${message}`);
    if (!res.headersSent) {
      next(error instanceof Error ? error : new AppError('Erreur lors de la création du ZIP', 500, 'ZIP'));
    }
  }
};

/**
 * GET /api/downloads/stream/zip/:sessionId?expires=...&signature=...
 * Pas d'auth. Valide la signature, stream le ZIP depuis la session et met à jour bytesSent/status.
 */
export const streamZip = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = paramString(req.params.sessionId);
    const { expires, signature } = req.query;

    if (!sessionId || !expires || !signature) {
      return res.status(403).json({ success: false, message: 'Paramètres manquants' });
    }
    const exp = parseInt(String(expires), 10);
    if (!downloadSessionService.verifySignature(sessionId, exp, String(signature))) {
      return res.status(403).json({ success: false, message: 'Lien invalide ou expiré' });
    }

    const session = await downloadSessionService.getSessionById(sessionId);
    if (!session || session.type !== 'zip' || !session.zipFiles?.length) {
      return res.status(404).json({ success: false, message: 'Session non trouvée' });
    }
    const user = await User.findById(session.userId).exec();
    if (!user?.allDebridApiKey) {
      return res.status(403).json({ success: false, message: 'Utilisateur ou clé API invalide' });
    }
    const apiKey = user.getDecryptedAllDebridApiKey();

    const safeZipName = session.zipFilename || session.filename || 'download.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(safeZipName)}`
    );
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (session.totalBytes && session.totalBytes > 0) {
      res.setHeader('X-Estimated-Size', String(session.totalBytes));
    }

    const UPDATE_INTERVAL = 512 * 1024;
    let bytesSent = 0;
    let lastUpdate = 0;

    const countStream = new Transform({
      transform(chunk: Buffer, _enc, cb) {
        bytesSent += chunk.length;
        if (bytesSent - lastUpdate >= UPDATE_INTERVAL) {
          lastUpdate = bytesSent;
          downloadSessionService.updateBytesSent(sessionId, bytesSent).catch(() => {});
        }
        cb(null, chunk);
      },
      flush(cb) {
        downloadSessionService.updateBytesSent(sessionId, bytesSent).then(() => cb()).catch(() => cb());
      }
    });

    const archive = archiver('zip', { zlib: { level: 0 } });

    const updateHistoryFromSession = async (status: 'completed' | 'error' | 'cancelled', errorMessage?: string) => {
      if (session.historyId) {
        await downloadHistoryService.updateDownloadHistory(
          session.historyId,
          String(session.userId),
          { status, endTime: new Date(), errorMessage, fileSize: session.totalBytes ?? undefined }
        ).catch(() => {});
      }
    };

    archive.on('error', async (err) => {
      Logger.error(`Zip archive error (session): ${err}`);
      await downloadSessionService.setSessionStatus(sessionId, 'error', err?.message);
      await updateHistoryFromSession('error', err?.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Erreur ZIP' });
      } else {
        try { res.destroy(); } catch { /* ignore */ }
      }
    });

    res.on('close', async () => {
      if (!res.writableEnded) {
        await downloadSessionService.setSessionStatus(sessionId, 'aborted');
        await updateHistoryFromSession('cancelled');
      }
    });

    countStream.on('finish', async () => {
      await downloadSessionService.setSessionStatus(sessionId, 'completed');
      await updateHistoryFromSession('completed');
      Logger.info(`Zip stream completed (session ${sessionId})`);
    });

    archive.pipe(countStream).pipe(res);

    for (const f of session.zipFiles) {
      if (!f?.url || !f?.filename) continue;
      const { stream } = await allDebridService.proxyDownloadWithRange(f.url, apiKey);
      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', reject);
        archive.append(stream as Readable, { name: String(f.filename) });
      });
    }

    await archive.finalize();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    Logger.error(`Stream zip error: ${message}`);
    if (!res.headersSent) {
      next(error instanceof Error ? error : new AppError('Erreur lors du téléchargement ZIP', 500, 'ZIP_STREAM'));
    }
  }
};

/**
 * GET /api/downloads/sessions?status=active
 * Retourne les sessions de téléchargement actives pour l'utilisateur.
 */
export const getSessions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const { status } = req.query;

    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    if (status === 'active') {
      const sessions = await downloadSessionService.getActiveSessionsByUserId(user.id);
      return res.json({
        success: true,
        data: sessions.map((s: IDownloadSession) => ({
          id: s._id.toString(),
          filename: s.filename,
          totalBytes: s.totalBytes,
          bytesSent: s.bytesSent,
          status: s.status,
          startedAt: s.startedAt,
          type: s.type,
          downloadSpeed: (s as any).downloadSpeed ?? undefined,
          errorMessage: s.errorMessage
        }))
      });
    }

    return res.status(400).json({ success: false, message: 'status=active attendu' });
  } catch (error: unknown) {
    Logger.error(`getSessions error: ${error instanceof Error ? error.message : error}`);
    next(error instanceof Error ? error : new AppError('Erreur serveur', 500));
  }
};

/**
 * POST /api/downloads/sessions/:sessionId/cancel
 * Marque la session comme annulée (et interrompt le stream si possible côté client).
 */
export const cancelSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    const sessionId = paramString(req.params.sessionId);
    const userId = typeof user?.id === 'string' ? user.id : String(user?.id ?? '');

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }
    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'sessionId requis' });
    }

    const session = await downloadSessionService.getSessionByIdAndUser(sessionId, userId);
    if (session && (session.status === 'started' || session.status === 'queued') && session.type === 'aria2' && session.aria2Gid) {
      try {
        const fullUser = await User.findById(userId).select('+aria2RpcSecret').exec();
        const rpcUrl = fullUser?.getDecryptedAria2RpcUrl?.();
        if (rpcUrl) {
          await aria2Service.remove(rpcUrl, fullUser!.getDecryptedAria2RpcSecret?.(), session.aria2Gid);
        }
      } catch (err) {
        Logger.debug(`Aria2 remove failed for session ${sessionId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const cancelled = await downloadSessionService.cancelSession(sessionId, userId);
    if (cancelled) {
      const updatedSession = await downloadSessionService.getSessionByIdAndUser(sessionId, userId);
      if (updatedSession?.historyId) {
        await downloadHistoryService.updateDownloadHistory(
          updatedSession.historyId,
          userId,
          { status: 'cancelled', endTime: new Date() }
        ).catch(() => {});
      }
      return res.json({ success: true, message: 'Téléchargement annulé' });
    }
    return res.status(404).json({ success: false, message: 'Session non trouvée ou déjà terminée' });
  } catch (error: unknown) {
    Logger.error(`cancelSession error: ${error instanceof Error ? error.message : error}`);
    next(error instanceof Error ? error : new AppError('Erreur serveur', 500));
  }
};

/**
 * Cancel an ongoing download availability check
 * @param {Request} req - Express request object containing sessionId
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with cancellation result or error message
 */
export const cancelDownloadCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.body;
    const user = req.user;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'sessionId est requis'
      });
    }

    if (!user?.allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Clé API AllDebrid requise'
      });
    }

    Logger.info(`Cancelling download check for session: ${sessionId}`);

    // Annuler la vérification via le service
    const cancelled = await downloadService.cancelAvailabilityCheck(sessionId);

    if (cancelled) {
      res.json({
        success: true,
        message: 'Vérification annulée avec succès'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Session non trouvée ou déjà terminée'
      });
    }

  } catch (error: unknown) {
    Logger.error(`Cancel download check error: ${error instanceof Error ? error.message : error}`);
    next(error instanceof Error ? error : new AppError('Erreur lors de l\'annulation de la vérification', 500));
  }
};

interface Aria2DownloadItem {
  url: string;
  filename: string;
}

interface Aria2DownloadRequestBody {
  type: 'films' | 'series' | 'mangas';
  title: string;
  year?: number;
  season?: string | number;
  items: Aria2DownloadItem[];
}

/**
 * Envoyer un ou plusieurs téléchargements vers Aria2 (NAS utilisateur).
 */
export const sendToAria2 = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = req.user;
    if (!authUser?.id) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { type, title, year, season, items } = req.body as Aria2DownloadRequestBody;

    if (!type || !title || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'type, title et items sont requis'
      });
    }

    if (!['films', 'series', 'mangas'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type doit être films, series ou mangas'
      });
    }

    // Recharger l'utilisateur complet avec le secret Aria2
    const user = await User.findById(authUser._id).select('+aria2RpcSecret').exec();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    if (!user.aria2Enabled) {
      return res.status(400).json({
        success: false,
        message: 'La fonctionnalité Aria2 n\'est pas activée pour cet utilisateur'
      });
    }

    const aria2RpcUrl = user.getDecryptedAria2RpcUrl();
    if (!aria2RpcUrl) {
      return res.status(400).json({
        success: false,
        message: 'Configuration Aria2 incomplète (URL RPC manquante)'
      });
    }
    const hasBasePath = Boolean(user.aria2DownloadBasePath?.trim());
    const hasPathFilms = Boolean(user.aria2PathFilms?.trim());
    const hasPathSeries = Boolean(user.aria2PathSeries?.trim());
    const hasPathAnimes = Boolean(user.aria2PathAnimes?.trim());
    if (!hasBasePath && !hasPathFilms && !hasPathSeries && !hasPathAnimes) {
      return res.status(400).json({
        success: false,
        message: 'Configurez au moins un chemin : chemin de base ou chemins films/séries/animes dans les paramètres Aria2'
      });
    }

    const results: Array<{ filename: string; gid: string; sessionId: string }> = [];
    const historyFiles = items.filter((i): i is { url: string; filename: string } => !!i?.url).map((i) => ({
      url: i.url,
      filename: i.filename
    }));

    const history = await downloadHistoryService.createDownloadHistory({
      userId: user._id.toString(),
      title,
      type,
      files: historyFiles
    });
    const historyId = history._id.toString();

    for (const item of items) {
      if (!item?.url) continue;
      const path = buildMediaPath({
        basePath: user.aria2DownloadBasePath ?? '',
        type,
        title,
        year,
        season,
        originalFilename: item.filename,
        pathFilms: user.aria2PathFilms,
        pathSeries: user.aria2PathSeries,
        pathAnimes: user.aria2PathAnimes,
        pathSeriesSeason: user.aria2PathSeriesSeason
      });

      let gid: string;
      try {
        gid = await aria2Service.addDownload(
          aria2RpcUrl,
          user.getDecryptedAria2RpcSecret?.(),
          item.url,
          { dir: path.dir, out: path.out }
        );
      } catch (err) {
        Logger.error(`Aria2 addDownload failed for ${item.filename}: ${err instanceof Error ? err.message : String(err)}`);
        await downloadHistoryService.updateDownloadHistory(historyId, user._id.toString(), {
          status: 'error',
          endTime: new Date(),
          errorMessage: err instanceof Error ? err.message : 'Erreur Aria2'
        });
        throw err;
      }

      const session = await downloadSessionService.createAria2Session(
        user._id.toString(),
        gid,
        item.filename,
        historyId
      );

      results.push({
        filename: item.filename,
        gid,
        sessionId: session._id.toString()
      });
    }

    if (results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun élément valide à envoyer à Aria2'
      });
    }

    res.json({
      success: true,
      message: 'Téléchargements envoyés à Aria2',
      data: {
        items: results,
        sessions: results.map((r) => ({ id: r.sessionId, filename: r.filename, gid: r.gid }))
      }
    });
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    Logger.error(`sendToAria2 error: ${rawMessage}`);
    next(error instanceof Error ? new AppError(rawMessage, 502, 'ARIA2_ERROR') : new AppError(rawMessage, 502, 'ARIA2_ERROR'));
  }
};

