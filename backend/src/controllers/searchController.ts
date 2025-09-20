import { Request, Response } from 'express';
import scrapingService from '@/services/ScrapingService';
import Logger from '@/base/Logger';
import ZTUrl from '@/models/ZTUrl';
import allDebridService from '@/services/allDebridService';
import * as cheerio from 'cheerio';

/**
 * Check and update Zone Téléchargement site URL by scraping the main page
 * @returns {Promise<void>} Updates the current URL in database if a new one is found
 */
const checkAndUpdateSiteUrl = async (): Promise<void> => {
  try {
    const startTime = Date.now();
    
    // Récupérer la configuration actuelle
    let ztConfig = await ZTUrl.findOne();
    if (!ztConfig) {
      ztConfig = new ZTUrl();
      await ztConfig.save();
    }

    // Scraper la page principale de Zone Téléchargement
    const response = await fetch(ztConfig.currentUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Chercher l'élément h2 avec le style spécifique (font-weight:bold;color:red;font-size: 110%)
    const domainElement = $('h2 span[style*="font-weight:bold"][style*="color:red"][style*="font-size: 110%"]');
    let newUrl = '';
    
    if (domainElement.length > 0) {
      const text = domainElement.text().trim();
      
      // Chercher une URL qui commence par http dans ce texte
      const urlMatch = text.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        newUrl = urlMatch[0];
      } else {
        // Si pas d'URL complète, chercher un domaine zone-telechargement
        const domainMatch = text.match(/zone-telechargement\.[a-zA-Z0-9.-]+/);
        if (domainMatch) {
          newUrl = `https://${domainMatch[0]}`;
        }
      }
    }

    const responseTime = Date.now() - startTime;

    // Si une nouvelle URL est trouvée et différente de l'actuelle
    if (newUrl && newUrl !== ztConfig.currentUrl) {
      Logger.info(`Nouvelle URL Zone Téléchargement détectée: ${newUrl} (ancienne: ${ztConfig.currentUrl})`);
      
      // Ajouter l'ancienne URL à l'historique
      ztConfig.urlHistory.push(ztConfig.currentUrl);
      
      // Mettre à jour l'URL actuelle
      ztConfig.currentUrl = newUrl;
    }

    // Mettre à jour les métadonnées
    ztConfig.lastChecked = new Date();
    ztConfig.responseTime = responseTime;
    
    await ztConfig.save();
    
    // Mettre à jour l'URL dans le ScrapingService
    await scrapingService.updateCurrentUrl();
    
    Logger.info(`Vérification Zone Téléchargement terminée - URL: ${ztConfig.currentUrl}, Temps de réponse: ${responseTime}ms`);

  } catch (error: any) {
    Logger.error(`Erreur lors de la vérification de l'URL Zone Téléchargement: ${error.message}`);
    // Ne pas faire échouer la recherche si la vérification échoue
  }
};

/**
 * Search for content (films, series, mangas) on Zone Téléchargement
 * @param {Request} req - Express request object with query, type, and year parameters
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with search results or error message
 */
const searchAll = async (req: Request, res: Response) => {
  try {
    // Vérifier la clé API AllDebrid de l'utilisateur
    const user = req.user;
    if (!user?.allDebridApiKey) {
      return res.status(400).json({
        success: false,
        message: 'Clé API AllDebrid requise pour effectuer une recherche',
        code: 'MISSING_API_KEY'
      });
    }

    // Valider la clé API AllDebrid
    const isApiKeyValid = await allDebridService.validateApiKey(user.getDecryptedAllDebridApiKey());
    if (!isApiKeyValid) {
      Logger.error(`Recherche bloquée - Clé API AllDebrid invalide pour l'utilisateur: ${user.username}`);
      return res.status(400).json({
        success: false,
        message: 'Votre clé API AllDebrid n\'est pas valide. Veuillez la mettre à jour dans vos paramètres.',
        code: 'INVALID_API_KEY'
      });
    }

    // Vérifier et mettre à jour l'URL Zone Téléchargement
    await checkAndUpdateSiteUrl();
    
    const { query, type, year } = req.query;

    if (!query || typeof query !== 'string') {
      const errorResponse: SearchErrorResponse = {
        success: false,
        message: 'Query parameter is required'
      };
      return res.status(400).json(errorResponse);
    }

    if (query.trim().length === 0) {
      const errorResponse: SearchErrorResponse = {
        success: false,
        message: 'Query cannot be empty'
      };
      return res.status(400).json(errorResponse);
    }

    // Validate type parameter if provided
    const validTypes = ['films', 'series', 'mangas'];
    let contentType: string | undefined;
    
    if (type && typeof type === 'string') {
      if (validTypes.includes(type.toLowerCase())) {
        contentType = type.toLowerCase();
      } else {
        const errorResponse: SearchErrorResponse = {
          success: false,
          message: `Invalid type parameter. Must be one of: ${validTypes.join(', ')}`
        };
        return res.status(400).json(errorResponse);
      }
    }

    // Validate year parameter if provided
    let filterYear: number | undefined;
    if (year && typeof year === 'string') {
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 1950 || yearNum > new Date().getFullYear()) {
        const errorResponse: SearchErrorResponse = {
          success: false,
          message: 'Invalid year parameter. Must be a valid year between 1950 and current year'
        };
        return res.status(400).json(errorResponse);
      }
      filterYear = yearNum;
    }

    Logger.info(`Search request received for: "${query}"${contentType ? ` (type: ${contentType})` : ''}${filterYear ? ` (year: ${filterYear})` : ''}`);
    
    let results;
    
    if (contentType) {
      // Search specific content type
      switch (contentType) {
        case 'films':
          results = [await scrapingService.searchFilms(query.trim(), filterYear)];
          break;
        case 'series':
          results = [await scrapingService.searchSeries(query.trim(), filterYear)];
          break;
        case 'mangas':
          results = [await scrapingService.searchMangas(query.trim(), filterYear)];
          break;
        default:
          results = await scrapingService.searchAll(query.trim(), filterYear);
      }
    } else {
      // Search all content types
      results = await scrapingService.searchAll(query.trim(), filterYear);
    }
    
    Logger.success(`Search completed successfully for: "${query}"${contentType ? ` (type: ${contentType})` : ''}${filterYear ? ` (year: ${filterYear})` : ''}`);
    
    const response: SearchResponse = {
      success: true,
      query: query.trim(),
      data: results as SearchResult[],
      timestamp: new Date().toISOString()
    };
    
    return res.json(response);

  } catch (error: any) {
    Logger.error(`Search controller error: ${error}`);
    
    const errorResponse: SearchErrorResponse = {
      success: false,
      message: 'Internal server error during search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    
    return res.status(500).json(errorResponse);
  }
};

/**
 * Health check endpoint to verify API status
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with API status
 */
const healthCheck = async (req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    success: true,
    message: 'Zone Debrid est en ligne',
    timestamp: new Date().toISOString()
  };
  
  return res.json(response);
};

/**
 * Get Zone Téléchargement site status and URL information
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with site status data or error message
 */
const getSiteStatus = async (req: Request, res: Response) => {
  try {
    const ztConfig = await ZTUrl.findOne();
    
    if (!ztConfig) {
      const errorResponse: SiteErrorResponse = {
        success: false,
        message: 'L\'URL de Zone Téléchargement est inconnue'
      };
      return res.status(404).json(errorResponse);
    }

    const response: SiteStatusResponse = {
      success: true,
      data: {
        currentUrl: ztConfig.currentUrl,
        urlHistory: ztConfig.urlHistory,
        lastChecked: ztConfig.lastChecked.toISOString(),
        responseTime: ztConfig.responseTime,
        isHealthy: ztConfig.responseTime > 0 && ztConfig.responseTime < 10000 // Considéré comme sain si < 10s
      },
      timestamp: new Date().toISOString()
    };
    
    return res.json(response);
  } catch (error: any) {
    Logger.error(`Site status error: ${error.message}`);
    
    const errorResponse: SiteErrorResponse = {
      success: false,
      message: 'Impossible de récupérer le statut de Zone Téléchargement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    
    return res.status(500).json(errorResponse);
  }
};

export default {
  searchAll,
  healthCheck,
  getSiteStatus
};
