import * as cheerio from 'cheerio';
import Logger from '@/base/Logger';
import ZTUrl from '@/models/ZTUrl';

// URL par défaut
const DEFAULT_URL = 'https://zone-telechargement.energy/';

// Variable pour stocker l'URL actuelle
let baseUrl: string = DEFAULT_URL;

// Fonction pour obtenir l'URL actuelle de Zone Téléchargement
const getCurrentUrl = async (): Promise<string> => {
  try {
    const ztConfig = await ZTUrl.findOne();
    if (ztConfig && ztConfig.currentUrl) {
      return ztConfig.currentUrl.endsWith('/') ? ztConfig.currentUrl : `${ztConfig.currentUrl}/`;
    }
  } catch (error) {
    Logger.error(`Erreur lors de la récupération de l'URL Zone Téléchargement: ${error}`);
  }
  
  return DEFAULT_URL;
};

// Fonction pour mettre à jour l'URL actuelle
const updateCurrentUrl = async (): Promise<void> => {
  const newUrl = await getCurrentUrl();
  baseUrl = newUrl;
  Logger.info(`URL Zone Téléchargement mise à jour: ${baseUrl}`);
};

// Types pour la nouvelle architecture
interface RawSearchItem {
  title: string;
  link: string;
  image?: string;
  date?: string;
  version?: string;
}

interface FilmDetails {
  title: string;
  link: string;
  image?: string;
  description?: string;
  release_date?: string;
  details: { [language: string]: { [quality: string]: { link: string } } };
  relevanceScore: number;
}

interface ConsolidatedFilm {
  title: string;
  image?: string;
  description?: string;
  release_date?: string;
  details?: { [language: string]: { [quality: string]: { link: string } } };
  relevanceScore: number;
  similarTitles: string[]; // Titres similaires trouvés
}

interface SeriesDetails {
  title: string;
  link: string;
  image?: string;
  description?: string;
  release_date?: string;
  details: { [season: string]: { episodes?: number; versions: { [lang: string]: { [qual: string]: { link: string; fileSize?: string } } } } };
  relevanceScore: number;
}

interface ConsolidatedSeries {
  title: string;
  image?: string;
  description?: string;
  release_date?: string;
  details?: { [season: string]: { episodes?: number; versions: { [lang: string]: { [qual: string]: { link: string; fileSize?: string } } } } };
  relevanceScore: number;
  similarTitles: string[]; // Titres similaires trouvés
}

interface SearchResult {
  type: string;
  results: ConsolidatedFilm[] | ConsolidatedSeries[];
}

const normalizeString = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[\u00AE\u00A9\u2122\u2120\u2117]/gu, ' ') // ® © ™ ℠ ℗
    .replace(/\((?:tm|sm|r|c|p)\)/gi, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\[\]{}.:,'"_!?#/\\-]+/g, ' ')
    .replace(/\b(?:tm|sm|r|c|p)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const stripSeason = (title: string): string => {
  return title.replace(/\s*-\s*Saison\s*\d+.*$/i, '').trim();
};

const extractSeasonFromLink = (link: string): string | null => {
  const match = link.match(/saison(\d+)/i);
  return match ? match[1] : null;
};

// Algorithme de similarité amélioré
const calculateStringSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

const levenshteinDistance = (str1: string, str2: string): number => {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

// Calcul de pertinence pour la recherche initiale
const calculateRelevanceScore = (query: string, title: string): number => {
  const queryTokens = normalizeString(query).split(' ').filter(t => t.length > 0);
  const titleTokens = normalizeString(title).split(' ').filter(t => t.length > 0);
  
  if (queryTokens.length === 0) return 0;
  
  // Correspondance exacte de phrase
  const queryLower = normalizeString(query);
  const titleLower = normalizeString(title);
  
  if (titleLower.includes(queryLower)) {
    return 1.0;
  }
  
  // Score par tokens - plus strict
  let matchedTokens = 0;
  let totalScore = 0;
  
  for (const queryToken of queryTokens) {
    let bestScore = 0;
    
    for (const titleToken of titleTokens) {
      // Correspondance exacte
      if (titleToken === queryToken) {
        bestScore = 1.0;
        break;
      }
      
      // Correspondance partielle seulement pour les mots courts (articles, prépositions)
      if (queryToken.length <= 3) {
        const similarity = calculateStringSimilarity(queryToken, titleToken);
        if (similarity >= 0.9) { // Très strict pour les mots courts
          bestScore = Math.max(bestScore, similarity * 0.8);
        }
      } else {
        // Pour les mots plus longs, correspondance plus stricte
        const similarity = calculateStringSimilarity(queryToken, titleToken);
        if (similarity >= 0.85) { // Plus strict que 0.7
          bestScore = Math.max(bestScore, similarity);
        }
      }
    }
    
    if (bestScore > 0) {
      totalScore += bestScore;
      matchedTokens++;
    }
  }
  
  if (matchedTokens === 0) return 0.01;
  
  // Pénalité si pas tous les tokens sont trouvés
  const tokenMatchRatio = matchedTokens / queryTokens.length;
  let finalScore = totalScore / queryTokens.length;
  
  // Pénalité sévère si moins de 80% des tokens sont trouvés
  if (tokenMatchRatio < 0.8) {
    finalScore *= 0.3;
  }
  
  // Bonus pour correspondance en début
  if (titleLower.startsWith(queryLower)) {
    finalScore += 0.2;
  }
  
  return Math.min(1.0, finalScore);
};

// Comparaison de similarité entre séries (pour le regroupement)
const areSeriesSimilar = (series1: SeriesDetails, series2: SeriesDetails): boolean => {
  // Pour les séries/mangas, on ne compare que les titres
  // Puisqu'on ne garde que la saison 1, les titres doivent être identiques
  const titleSimilarity = calculateStringSimilarity(
    normalizeString(series1.title),
    normalizeString(series2.title)
  );
  
  // Seuil plus strict pour les séries (0.9 au lieu de 0.8)
  return titleSimilarity >= 0.9;
};

// Comparaison de similarité entre films (pour le regroupement)
const areFilmsSimilar = (film1: FilmDetails, film2: FilmDetails): boolean => {
  // 1. Comparaison des titres
  const titleSimilarity = calculateStringSimilarity(
    normalizeString(film1.title),
    normalizeString(film2.title)
  );
  
  if (titleSimilarity < 0.8) return false;
  
  // 2. Comparaison des années (tolérance de 2 ans)
  if (film1.release_date && film2.release_date) {
    const year1 = parseInt(film1.release_date);
    const year2 = parseInt(film2.release_date);
    
    if (!isNaN(year1) && !isNaN(year2)) {
      const yearDiff = Math.abs(year1 - year2);
      if (yearDiff > 2) return false;
    }
  }
  
  // 3. Comparaison des synopsis (si disponibles)
  if (film1.description && film2.description) {
    const descSimilarity = calculateStringSimilarity(
      normalizeString(film1.description),
      normalizeString(film2.description)
    );
    
    if (descSimilarity < 0.6) return false;
  }
  
  return true;
};

// Utilitaires de scraping
const getParam = (href: string, name: string): string | null => {
  const m = href.match(new RegExp(`[?&]${name}=([^&]+)`, 'i'));
  return m ? decodeURIComponent(m[1]) : null;
};

const toAbsolute = (maybe: string | undefined): string | undefined => {
  if (!maybe) return undefined;
  if (maybe.startsWith('http')) return maybe;
  return `${baseUrl}${maybe.replace(/^\//, '')}`;
};

const isTypeMatch = (hrefType: string, targetType: string): boolean => {
  const map: Record<string, string[]> = {
    films: ['film', 'films'],
    series: ['serie', 'series'],
    mangas: ['manga', 'mangas']
  };
  const accepted = map[targetType] || [];
  return accepted.includes(hrefType.toLowerCase());
};

// Extraction du nombre total de pages
const extractTotalPages = async (url: string): Promise<number> => {
  try {
    Logger.debug(`Extracting total pages from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': baseUrl
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const $navigation = $('.navigation[align="center"]');
    if ($navigation.length === 0) {
      Logger.debug('No pagination found, assuming single page');
      return 1;
    }

    let maxPage = 1;
    
    $navigation.find('a[href*="page="]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const pageMatch = href.match(/page=(\d+)/);
        if (pageMatch) {
          const pageNum = parseInt(pageMatch[1], 10);
          if (pageNum > maxPage) {
            maxPage = pageNum;
          }
        }
      }
    });

    Logger.debug(`Found ${maxPage} total pages`);
    return maxPage;
  } catch (error) {
    Logger.error(`Error extracting total pages: ${error}`);
    return 1;
  }
};

// Scraping d'une page de résultats
const scrapePageResults = async (url: string, type: string, query: string): Promise<RawSearchItem[]> => {
  try {
    Logger.debug(`Scraping page: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': baseUrl
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const results: RawSearchItem[] = [];
    const seen = new Set<string>();

    // Extraction des liens de contenu
    $('a[href*="?p="][href*="id="]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href');
      if (!href) return;

      const pParam = getParam(href, 'p');
      if (!pParam || !isTypeMatch(pParam, type)) return;

      if (seen.has(href)) return;

      const title = $a.text().trim();
      if (!title || title.length <= 1) return;

      // Pour les séries et mangas, ne garder que la saison 1
      if (type === 'series' || type === 'mangas') {
        const seasonFromLink = extractSeasonFromLink(href);
        if (seasonFromLink && seasonFromLink !== '1') {
          // Ignorer les saisons autres que la saison 1
          return;
        }
      }

      // Enrichissement depuis le conteneur
      const $container = $a.closest('.cover_global');
      const image = toAbsolute($container.find('img.mainimg').attr('src')) || toAbsolute($a.find('img').attr('src'));
      const date = $container.find('time').first().text().trim();
      const version = $container.find('.detail_release').first().text().trim();

      const relevanceScore = calculateRelevanceScore(query, title);
      const queryTokens = normalizeString(query).split(' ').filter(t => t.length > 0);
      const minScore = queryTokens.length >= 3 ? 0.85 : queryTokens.length >= 2 ? 0.8 : 0.9; // Score plus strict

      if (relevanceScore >= minScore) {
        results.push({
          title,
          link: toAbsolute(href)!,
          image,
          date,
          version
        });
        seen.add(href);
      }
    });

    Logger.debug(`Found ${results.length} results on page`);
    return results;
  } catch (error) {
    Logger.error(`Error scraping page: ${error}`);
    return [];
  }
};

// Scraping de tous les détails d'un film
const scrapeFilmDetails = async (item: RawSearchItem, query: string): Promise<FilmDetails> => {
  try {
    Logger.debug(`Scraping details for: ${item.title}`);
    
    const response = await fetch(item.link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': baseUrl
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extraction des versions (langue -> qualité -> lien)
    const details: { [language: string]: { [quality: string]: { link: string } } } = {};
    
    // Version actuelle (en rouge)
    const currentQuality = $('div[style*="color:red"][style*="font-weight:bold"]').text().trim();
    if (currentQuality) {
      const qualityMatch = currentQuality.match(/([A-Z0-9\-\s]+)\s*\|\s*([A-Z]+)/i);
      if (qualityMatch) {
        const quality = qualityMatch[1].trim().replace(/\s+/g, '_').toUpperCase();
        const language = qualityMatch[2].trim().toUpperCase();
        
        if (!details[language]) {
          details[language] = {};
        }
        
        details[language][quality] = { link: item.link };
      }
    }
    
    // Autres versions
    $('.otherversions a').each((_, el) => {
      const link = $(el).attr('href');
      if (link) {
        const qualitySpan = $(el).find('.otherquality span[style*="color:#FE8903"] b');
        const languageSpan = $(el).find('.otherquality span[style*="color:#03AAFE"] b');
        
        if (qualitySpan.length > 0 && languageSpan.length > 0) {
          const quality = qualitySpan.text().trim().replace(/\s+/g, '_').toUpperCase();
          let language = languageSpan.text().trim().replace(/[()]/g, '').trim();
          
          if (language.includes('MULTI')) {
            const match = language.match(/MULTI\s*\(([^)]+)\)/i);
            if (match) {
              language = match[1].trim();
            } else {
              language = 'MULTI';
            }
          }
          
          if (!details[language]) {
            details[language] = {};
          }
          
          if (!details[language][quality]) {
            details[language][quality] = { link: toAbsolute(link)! };
          }
        }
      }
    });
    
    // Extraction du synopsis
    let description: string | undefined;
    const synopsisImg = $('img[src*="synopsis.png"]');
    if (synopsisImg.length > 0) {
      description = synopsisImg.parent().find('em').first().text().trim() || undefined;
    }
    
    // Extraction de l'année de production
    let release_date: string | undefined;
    $('strong').each((_, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text.includes('année de production')) {
        const parentHtml = $(el).parent().html() || '';
        const match = parentHtml.match(/Année de production\s*:<\/strong>\s*([^<]+)/i);
        if (match) {
          release_date = match[1].trim();
        }
      }
    });
    
    // Fallback pour l'année
    if (!release_date) {
      const whole = $.root().text();
      const m = whole.match(/Année de production\s*:\s*(\d{4})/i);
      if (m) release_date = m[1];
    }
    
    return {
      title: item.title,
      link: item.link,
      image: item.image,
      description,
      release_date,
      details,
      relevanceScore: calculateRelevanceScore(query, item.title)
    };
  } catch (error) {
    Logger.error(`Error scraping film details: ${error}`);
    return {
      title: item.title,
      link: item.link,
      image: item.image,
      details: {},
      relevanceScore: calculateRelevanceScore(query, item.title)
    };
  }
};

// Regroupement intelligent des films similaires
const consolidateSimilarFilms = (films: FilmDetails[]): ConsolidatedFilm[] => {
  const consolidated: ConsolidatedFilm[] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < films.length; i++) {
    if (processed.has(i)) continue;
    
    const currentFilm = films[i];
    const similarFilms: FilmDetails[] = [currentFilm];
    const similarTitles: string[] = [];
    
    // Chercher des films similaires
    for (let j = i + 1; j < films.length; j++) {
      if (processed.has(j)) continue;
      
      if (areFilmsSimilar(currentFilm, films[j])) {
        similarFilms.push(films[j]);
        processed.add(j);
      }
    }
    
    // Collecter les titres uniques des films similaires
    const uniqueTitles = new Set<string>();
    for (const film of similarFilms) {
      uniqueTitles.add(film.title);
    }
    similarTitles.push(...Array.from(uniqueTitles));
    
    // Consolider les versions
    const consolidatedDetails: { [language: string]: { [quality: string]: { link: string } } } = {};
    
    for (const film of similarFilms) {
      for (const [language, qualities] of Object.entries(film.details)) {
        if (!consolidatedDetails[language]) {
          consolidatedDetails[language] = {};
        }
        
        for (const [quality, linkData] of Object.entries(qualities)) {
          consolidatedDetails[language][quality] = linkData;
        }
      }
    }
    
    // Prendre le film avec le meilleur score comme représentant
    const bestFilm = similarFilms.reduce((best, current) => 
      current.relevanceScore > best.relevanceScore ? current : best
    );
    
    consolidated.push({
      title: bestFilm.title,
      image: bestFilm.image,
      description: bestFilm.description,
      release_date: bestFilm.release_date,
      details: Object.keys(consolidatedDetails).length > 0 ? consolidatedDetails : undefined,
      relevanceScore: bestFilm.relevanceScore,
      similarTitles
    });
    
    processed.add(i);
  }
  
  return consolidated;
};

// Extraction des détails d'une saison (nombre d'épisodes et taille des fichiers)
const extractSeasonDetails = async (link: string): Promise<{ episodes?: number; fileSize?: string }> => {
  try {
    const response = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': baseUrl
      }
    });

    if (!response.ok) {
      return {};
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    let episodes: number | undefined;
    let fileSize: string | undefined;
    
    // Extraction du nombre d'épisodes depuis le texte comme "10 Episodes | Saison 3"
    $('div').each((_, el) => {
      const text = $(el).text().trim();
      const episodeMatch = text.match(/(\d+)\s*Episodes?\s*\|\s*Saison\s*\d+/i);
      if (episodeMatch) {
        episodes = parseInt(episodeMatch[1], 10);
      }
    });
    
    // Extraction de la taille des fichiers depuis le texte comme "Taille d'un episode : ~545 Mo"
    $('strong').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('Taille d\'un episode') || text.includes('Taille d\'un épisode')) {
        const parentText = $(el).parent().text().trim();
        const sizeMatch = parentText.match(/Taille d'[^:]*:\s*(~?\d+(?:\.\d+)?\s*[KMG]o)/i);
        if (sizeMatch) {
          fileSize = sizeMatch[1].trim();
        }
      }
    });
    
    // Fallback: compter les liens d'épisodes si on n'a pas trouvé le nombre d'épisodes
    if (!episodes) {
      const episodeLinks = $('a[href*="dl-protect.link"][href*="Episode"]').length;
      if (episodeLinks > 0) {
        episodes = episodeLinks;
      }
    }
    
    return { episodes, fileSize };
  } catch (error) {
    Logger.error(`Error extracting season details: ${error}`);
    return {};
  }
};

// Extraction de l'année de production depuis une page de détail de saison
const extractReleaseDateFromDetailPage = async (link: string): Promise<string | undefined> => {
  try {
    const response = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': baseUrl
      }
    });

    if (!response.ok) {
      return undefined;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Chercher "Année de production" spécifiquement
    let year: string | undefined;
    $('strong').each((_, el) => {
      const text = $(el).text().trim();
      if (text.includes('Année de production')) {
        // Obtenir le texte après la balise strong
        const nextText = $(el).parent().text().trim();
        const match = nextText.match(/Année de production\s*:\s*(\d{4})/i);
        if (match) {
          year = match[1];
        }
      }
    });
    
    // Fallback: chercher dans tout le contenu de la page
    if (!year) {
      const wholeText = $.root().text();
      const match = wholeText.match(/Année de production\s*:\s*(\d{4})/i);
      if (match) {
        year = match[1];
      }
    }
    
    return year;
  } catch (error) {
    Logger.error(`extractReleaseDateFromDetailPage error: ${error}`);
    return undefined;
  }
};

// Choisir un lien de la saison 1 (ou saison la plus basse) pour extraire la date de sortie
const pickSeasonOneLink = (details: any): string | undefined => {
  if (!details || typeof details !== 'object') return undefined;
  let seasonKeys = Object.keys(details).filter(k => /^SAISON_\d+$/i.test(k));
  if (seasonKeys.length === 0) return undefined;
  seasonKeys.sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10));
  const seasonKey = seasonKeys[0];
  const season = details[seasonKey];
  if (!season) return undefined;
  const versions = season.versions || season; // compatibilité arrière
  const langKeys = Object.keys(versions);
  if (langKeys.length === 0) return undefined;
  const lang = langKeys[0];
  const qualities = versions[lang];
  const qualKeys = qualities ? Object.keys(qualities) : [];
  if (qualKeys.length === 0) return undefined;
  const qual = qualKeys[0];
  const entry = qualities[qual];
  return entry?.link;
};

// Scraping des détails pour les séries et mangas
const scrapeSeriesDetails = async (item: RawSearchItem, query: string): Promise<SeriesDetails> => {
  try {
    Logger.debug(`Scraping series details for: ${item.title}`);
    
    const response = await fetch(item.link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': baseUrl
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Structure pour les séries: saison -> { episodes, versions{ langue -> qualité -> { link, fileSize } } }
    const seasons: { [key: string]: { episodes?: number; versions: { [lang: string]: { [qual: string]: { link: string; fileSize?: string } } } } } = {};
    
    // Capturer la saison actuelle et les qualités
    const currentSeason = extractSeasonFromLink(item.link);
    const currentLanguage = $('div[style*="color:red"][style*="font-weight:bold"]').text().trim();
    
    // Extraire la langue et qualité actuelles (VOSTFR HD, VF, etc.)
    const currentLangQualMatch = currentLanguage.match(/^([A-Z]+)(?:\s*HD\d*)?/i);
    const currentLang = currentLangQualMatch ? currentLangQualMatch[1].toUpperCase() : 'UNKNOWN';
    const currentQuality = currentLanguage.includes('HD') ? 'HD' : 'NORMAL';
    
    if (currentSeason && currentLang) {
      const seasonKey = `SAISON_${currentSeason}`;
      if (!seasons[seasonKey]) {
        seasons[seasonKey] = { episodes: undefined, versions: {} };
      }
      if (!seasons[seasonKey].versions[currentLang]) {
        seasons[seasonKey].versions[currentLang] = {};
      }
      seasons[seasonKey].versions[currentLang][currentQuality] = { link: item.link };
    }
    
    // Autres saisons et qualités
    $('.otherversions a').each((_, element) => {
      const $element = $(element);
      const link = $element.attr('href');
      const $quality = $element.find('.otherquality');

      if (link && $quality.length > 0) {
        const qualityText = $quality.text().replace(/\s+/g, ' ').trim();
        
        // Vérifier si c'est un lien de saison
        const seasonMatch = qualityText.match(/Saison\s*(\d+)\s*\(([A-Z\s]+)\)/i);
        if (seasonMatch) {
          const season = seasonMatch[1];
          const languageQuality = seasonMatch[2].trim();
          
          // Parser la langue et qualité depuis "VF HD" ou "VOSTFR HD"
          const langQualMatch = languageQuality.match(/^([A-Z]+)(?:\s+(HD))?$/i);
          if (langQualMatch) {
            const language = langQualMatch[1].toUpperCase();
            const quality = langQualMatch[2] ? langQualMatch[2].toUpperCase() : 'NORMAL';
            const seasonKey = `SAISON_${season}`;
            
            if (!seasons[seasonKey]) {
              seasons[seasonKey] = { episodes: undefined, versions: {} };
            }
            if (!seasons[seasonKey].versions[language]) {
              seasons[seasonKey].versions[language] = {};
            }
            const fullLink = toAbsolute(link)!;
            seasons[seasonKey].versions[language][quality] = { link: fullLink };
          }
        } else {
          // Vérifier si c'est un lien de qualité pour la saison actuelle
          const qualityMatch = qualityText.match(/\(([A-Z\s]+)\)/i);
          if (qualityMatch && currentSeason) {
            const languageQuality = qualityMatch[1].trim();
            
            // Parser la langue et qualité depuis "VF HD" ou "VOSTFR HD"
            const langQualMatch = languageQuality.match(/^([A-Z]+)(?:\s+(HD))?$/i);
            if (langQualMatch) {
              const language = langQualMatch[1].toUpperCase();
              const quality = langQualMatch[2] ? langQualMatch[2].toUpperCase() : 'NORMAL';
              const seasonKey = `SAISON_${currentSeason}`;
              
              if (!seasons[seasonKey]) {
                seasons[seasonKey] = { episodes: undefined, versions: {} };
              }
              if (!seasons[seasonKey].versions[language]) {
                seasons[seasonKey].versions[language] = {};
              }
              const fullLink = toAbsolute(link)!;
              seasons[seasonKey].versions[language][quality] = { link: fullLink };
            }
          }
        }
      }
    });
    
    // Maintenant extraire les épisodes et fileSize pour chaque saison et chaque qualité en parallèle
    const seasonDetailPromises: Promise<void>[] = [];
    
    for (const seasonKey of Object.keys(seasons)) {
      const season = seasons[seasonKey];
      const languages = Object.keys(season.versions);
      
      for (const lang of languages) {
        const qualities = Object.keys(season.versions[lang]);
        
        for (const qual of qualities) {
          const entry = season.versions[lang][qual];
          const promise = extractSeasonDetails(entry.link)
            .then(details => {
              // Définir les épisodes une fois par saison (préférer le plus élevé détecté)
              if (details.episodes) {
                if (!season.episodes || details.episodes > season.episodes) {
                  season.episodes = details.episodes;
                }
              }
              // Définir la taille de fichier par qualité
              if (details.fileSize) {
                season.versions[lang][qual].fileSize = details.fileSize;
              }
            })
            .catch(e => {
              Logger.error(`extractSeasonDetails failed for ${seasonKey} ${lang} ${qual}: ${e}`);
            });
          
          seasonDetailPromises.push(promise);
        }
      }
    }
    
    // Attendre que toutes les extractions de détails de saison se terminent
    await Promise.all(seasonDetailPromises);
    
    // Trier les saisons par numéro (SAISON_1, SAISON_2, SAISON_3, etc.)
    const sortedSeasons: { [key: string]: { episodes?: number; versions: { [lang: string]: { [qual: string]: { link: string; fileSize?: string } } } } } = {};
    const seasonKeys = Object.keys(seasons).sort((a, b) => {
      const seasonA = parseInt(a.replace('SAISON_', ''), 10);
      const seasonB = parseInt(b.replace('SAISON_', ''), 10);
      return seasonA - seasonB;
    });
    
    for (const seasonKey of seasonKeys) {
      sortedSeasons[seasonKey] = seasons[seasonKey];
    }
    
    // Extraction du synopsis
    let description: string | undefined;
    const synopsisImg = $('img[src*="synopsis.png"]');
    if (synopsisImg.length > 0) {
      description = synopsisImg.parent().find('em').first().text().trim() || undefined;
    }
    
    // Extraction de l'année de production depuis la saison 1
    let release_date: string | undefined;
    const seasonOneLink = pickSeasonOneLink(sortedSeasons);
    if (seasonOneLink) {
      release_date = await extractReleaseDateFromDetailPage(seasonOneLink);
    }
    
    const cleanTitle = stripSeason(item.title);
    Logger.debug(`Series title: "${item.title}" -> "${cleanTitle}"`);
    
    return {
      title: cleanTitle, // Tronquer le titre pour retirer " - Saison X"
      link: item.link,
      image: item.image,
      description,
      release_date,
      details: sortedSeasons,
      relevanceScore: calculateRelevanceScore(query, cleanTitle)
    };
  } catch (error) {
    Logger.error(`Error scraping series details: ${error}`);
    return {
      title: stripSeason(item.title), // Tronquer le titre pour retirer " - Saison X"
      link: item.link,
      image: item.image,
      details: {},
      relevanceScore: calculateRelevanceScore(query, stripSeason(item.title))
    };
  }
};

// Regroupement intelligent des séries similaires
const consolidateSimilarSeries = (series: SeriesDetails[]): ConsolidatedSeries[] => {
  const consolidated: ConsolidatedSeries[] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < series.length; i++) {
    if (processed.has(i)) continue;
    
    const currentSeries = series[i];
    const similarSeries: SeriesDetails[] = [currentSeries];
    const similarTitles: string[] = [];
    
    // Chercher des séries similaires
    for (let j = i + 1; j < series.length; j++) {
      if (processed.has(j)) continue;
      
      if (areSeriesSimilar(currentSeries, series[j])) {
        similarSeries.push(series[j]);
        processed.add(j);
      }
    }
    
    // Collecter les titres uniques des séries similaires
    const uniqueTitles = new Set<string>();
    for (const serie of similarSeries) {
      uniqueTitles.add(serie.title);
    }
    similarTitles.push(...Array.from(uniqueTitles));
    
    // Consolider les détails (saisons)
    const consolidatedDetails: { [season: string]: { episodes?: number; versions: { [lang: string]: { [qual: string]: { link: string; fileSize?: string } } } } } = {};
    
    for (const serie of similarSeries) {
      for (const [season, seasonData] of Object.entries(serie.details)) {
        if (!consolidatedDetails[season]) {
          consolidatedDetails[season] = { episodes: seasonData.episodes, versions: {} };
        }
        
        // Fusionner les versions de cette saison
        for (const [language, qualities] of Object.entries(seasonData.versions)) {
          if (!consolidatedDetails[season].versions[language]) {
            consolidatedDetails[season].versions[language] = {};
          }
          
          for (const [quality, linkData] of Object.entries(qualities)) {
            consolidatedDetails[season].versions[language][quality] = linkData;
          }
        }
      }
    }
    
    // Prendre la série avec le meilleur score comme représentant
    const bestSeries = similarSeries.reduce((best, current) => 
      current.relevanceScore > best.relevanceScore ? current : best
    );
    
    consolidated.push({
      title: bestSeries.title,
      image: bestSeries.image,
      description: bestSeries.description,
      release_date: bestSeries.release_date,
      details: Object.keys(consolidatedDetails).length > 0 ? consolidatedDetails : undefined,
      relevanceScore: bestSeries.relevanceScore,
      similarTitles
    });
    
    processed.add(i);
  }
  
  return consolidated;
};

// Fonction principale de recherche de films
const searchFilms = async (query: string, year?: number): Promise<SearchResult> => {
  Logger.info(`Starting comprehensive film search for: "${query}"${year ? ` (year: ${year})` : ''}`);
  
  try {
    // 1. Construire l'URL de base
    let baseSearchUrl = `${baseUrl}?p=films&search=${encodeURIComponent(query)}`;
    if (year) {
      baseSearchUrl += `&year=${year}`;
    }
    
    // 2. Obtenir le nombre total de pages
    const totalPages = await extractTotalPages(baseSearchUrl);
    Logger.info(`Found ${totalPages} pages to scrape`);
    
    // 3. Scraper toutes les pages en parallèle
    const pagePromises: Promise<RawSearchItem[]>[] = [];
    for (let page = 1; page <= totalPages; page++) {
      const pageUrl = page === 1 ? baseSearchUrl : `${baseSearchUrl}&page=${page}`;
      pagePromises.push(scrapePageResults(pageUrl, 'films', query));
    }
    
    const pageResults = await Promise.all(pagePromises);
    const allRawResults = pageResults.flat();
    
    Logger.info(`Found ${allRawResults.length} total raw results across all pages`);
    
    // 4. Scraper les détails de tous les films en parallèle
    const detailPromises = allRawResults.map(item => scrapeFilmDetails(item, query));
    const filmDetails = await Promise.all(detailPromises);
    
    Logger.info(`Scraped details for ${filmDetails.length} films`);
    
    // 5. Regrouper les films similaires
    const consolidatedFilms = consolidateSimilarFilms(filmDetails);
    
    Logger.info(`Consolidated into ${consolidatedFilms.length} unique films`);
    
    // 6. Trier par pertinence
    consolidatedFilms.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return {
      type: 'films',
      results: consolidatedFilms
    };
  } catch (error) {
    Logger.error(`Error during film search: ${error}`);
    throw error;
  }
};

// Fonctions de recherche pour les séries et mangas
const searchSeries = async (query: string, year?: number): Promise<SearchResult> => {
  Logger.info(`Starting comprehensive series search for: "${query}"${year ? ` (year: ${year})` : ''}`);
  
  try {
    // 1. Construire l'URL de base
    let baseSearchUrl = `${baseUrl}?p=series&search=${encodeURIComponent(query)}`;
    if (year) {
      baseSearchUrl += `&year=${year}`;
    }
    
    // 2. Obtenir le nombre total de pages
    const totalPages = await extractTotalPages(baseSearchUrl);
    Logger.info(`Found ${totalPages} pages to scrape for series`);
    
    // 3. Scraper toutes les pages en parallèle
    const pagePromises: Promise<RawSearchItem[]>[] = [];
    for (let page = 1; page <= totalPages; page++) {
      const pageUrl = page === 1 ? baseSearchUrl : `${baseSearchUrl}&page=${page}`;
      pagePromises.push(scrapePageResults(pageUrl, 'series', query));
    }
    
    const pageResults = await Promise.all(pagePromises);
    const allRawResults = pageResults.flat();
    
    Logger.info(`Found ${allRawResults.length} total raw results across all pages for series`);
    
    // 4. Scraper les détails de toutes les séries en parallèle
    const detailPromises = allRawResults.map(item => scrapeSeriesDetails(item, query));
    const seriesDetails = await Promise.all(detailPromises);
    
    Logger.info(`Scraped details for ${seriesDetails.length} series`);
    
    // 5. Regrouper les séries similaires
    const consolidatedSeries = consolidateSimilarSeries(seriesDetails);
    
    Logger.info(`Consolidated into ${consolidatedSeries.length} unique series`);
    
    // 6. Trier par pertinence
    consolidatedSeries.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return {
      type: 'series',
      results: consolidatedSeries
    };
  } catch (error) {
    Logger.error(`Error during series search: ${error}`);
    throw error;
  }
};

const searchMangas = async (query: string, year?: number): Promise<SearchResult> => {
  Logger.info(`Starting comprehensive mangas search for: "${query}"${year ? ` (year: ${year})` : ''}`);
  
  try {
    // 1. Construire l'URL de base
    let baseSearchUrl = `${baseUrl}?p=mangas&search=${encodeURIComponent(query)}`;
    if (year) {
      baseSearchUrl += `&year=${year}`;
    }
    
    // 2. Obtenir le nombre total de pages
    const totalPages = await extractTotalPages(baseSearchUrl);
    Logger.info(`Found ${totalPages} pages to scrape for mangas`);
    
    // 3. Scraper toutes les pages en parallèle
    const pagePromises: Promise<RawSearchItem[]>[] = [];
    for (let page = 1; page <= totalPages; page++) {
      const pageUrl = page === 1 ? baseSearchUrl : `${baseSearchUrl}&page=${page}`;
      pagePromises.push(scrapePageResults(pageUrl, 'mangas', query));
    }
    
    const pageResults = await Promise.all(pagePromises);
    const allRawResults = pageResults.flat();
    
    Logger.info(`Found ${allRawResults.length} total raw results across all pages for mangas`);
    
    // 4. Scraper les détails de tous les mangas en parallèle (même logique que les séries)
    const detailPromises = allRawResults.map(item => scrapeSeriesDetails(item, query));
    const mangaDetails = await Promise.all(detailPromises);
    
    Logger.info(`Scraped details for ${mangaDetails.length} mangas`);
    
    // 5. Regrouper les mangas similaires
    const consolidatedMangas = consolidateSimilarSeries(mangaDetails);
    
    Logger.info(`Consolidated into ${consolidatedMangas.length} unique mangas`);
    
    // 6. Trier par pertinence
    consolidatedMangas.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    return {
      type: 'mangas',
      results: consolidatedMangas
    };
  } catch (error) {
    Logger.error(`Error during mangas search: ${error}`);
    throw error;
  }
};

const searchAll = async (query: string, year?: number): Promise<SearchResult[]> => {
  Logger.info(`Starting comprehensive search for: "${query}"${year ? ` (year: ${year})` : ''}`);
  
  const results = await Promise.all([
    searchFilms(query, year),
    searchSeries(query, year),
    searchMangas(query, year)
  ]);
  
  Logger.success(`Search completed for: "${query}"${year ? ` (year: ${year})` : ''}`);
  return results;
};

const getPageCounts = async (query: string, year?: number): Promise<{ films: number; series: number; mangas: number }> => {
  Logger.info(`Getting page counts for: "${query}"${year ? ` (year: ${year})` : ''}`);
  
  const buildUrl = (type: string) => {
    let url = `${baseUrl}?p=${type}&search=${encodeURIComponent(query)}`;
    if (year) {
      url += `&year=${year}`;
    }
    return url;
  };
  
  const urls = {
    films: buildUrl('films'),
    series: buildUrl('series'),
    mangas: buildUrl('mangas')
  };

  try {
    const [filmsPages, seriesPages, mangasPages] = await Promise.all([
      extractTotalPages(urls.films),
      extractTotalPages(urls.series),
      extractTotalPages(urls.mangas)
    ]);

    const counts = { films: filmsPages, series: seriesPages, mangas: mangasPages };
    Logger.success(`Page counts - Films: ${filmsPages}, Series: ${seriesPages}, Mangas: ${mangasPages}`);
    
    return counts;
  } catch (error) {
    Logger.error(`Error getting page counts: ${error}`);
    return { films: 1, series: 1, mangas: 1 };
  }
};

export default { searchAll, searchFilms, searchSeries, searchMangas, getPageCounts, updateCurrentUrl };