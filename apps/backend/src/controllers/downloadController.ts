import { Request, Response } from 'express';
import downloadService from '@/services/downloadService';
import allDebridService from '@/services/allDebridService';
import Logger from '@/base/Logger';

/**
 * Check download availability for links using AllDebrid service
 * @param {Request} req - Express request object containing downloadLink, type, episodes, and optional sessionId
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with availability check result or error message
 */
export const checkDownloadAvailability = async (req: Request, res: Response) => {
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

  } catch (error: any) {
    Logger.error(`Download controller error: ${error}`);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification de disponibilité',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Proxy endpoint to download files through AllDebrid service
 * @param {Request} req - Express request object with URL query parameter
 * @param {Response} res - Express response object
 * @returns {Promise<void>} File stream or error message
 */
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    const user = req.user;

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

    Logger.info(`Download proxy requested for: ${url}`);

    // Télécharger le fichier via AllDebrid
    const fileStream = await allDebridService.downloadFile(url, user.getDecryptedAllDebridApiKey());

    // Définir les headers pour le téléchargement
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    // Stream le fichier vers le client
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      Logger.error(`Download stream error: ${error}`);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Erreur lors du téléchargement du fichier'
        });
      }
    });

    fileStream.on('end', () => {
      Logger.info(`Download completed for: ${url}`);
    });

  } catch (error: any) {
    Logger.error(`Download proxy error: ${error}`);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Erreur lors du téléchargement du fichier',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

/**
 * Cancel an ongoing download availability check
 * @param {Request} req - Express request object containing sessionId
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with cancellation result or error message
 */
export const cancelDownloadCheck = async (req: Request, res: Response) => {
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

  } catch (error: any) {
    Logger.error(`Cancel download check error: ${error}`);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'annulation de la vérification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

