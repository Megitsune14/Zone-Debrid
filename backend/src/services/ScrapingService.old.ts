import * as cheerio from 'cheerio';
import Logger from '@/base/Logger';

const baseUrl = 'https://www.zone-telechargement.diy/';

const normalizeString = (input: string): string => {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\[\]{}.:,'"_!?#/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const stripSeason = (title: string): string => {
  // Remove season patterns like " - Saison 1", " - Saison 2", etc.
  return title.replace(/\s*-\s*Saison\s*\d+.*$/i, '').trim();
};

const extractSeasonFromLink = (link: string): string | null => {
  const match = link.match(/saison(\d+)/i);
  return match ? match[1] : null;
};

const extractSlugFromLink = (link: string): string => {
  const match = link?.match(/id=([^&]+)/i);
  if (!match) return '';
  const slug = decodeURIComponent(match[1]).replace(/-/g, ' ');
  return normalizeString(slug);
};

// Fonction de similarité de chaînes (algorithme de Levenshtein simplifié)
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

// Nouvelle fonction pour gérer les caractères tronqués dans les slugs
const normalizeSlug = (slug: string): string => {
  return slug
    .toLowerCase()
    .replace(/[()\[\]{}.:,'"_!?#/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const calculateRelevanceScore = (query: string, title: string, slug: string): number => {
  const queryTokens = normalizeString(query).split(' ').filter(t => t.length > 0);
  const titleTokens = stripSeason(title).toLowerCase().split(' ').filter(t => t.length > 0);
  const slugTokens = normalizeSlug(slug).split(' ').filter(t => t.length > 0);
  
  if (queryTokens.length === 0) return 0;
  
  // Vérification de correspondance exacte de phrase
  const queryLower = normalizeString(query);
  const titleLower = stripSeason(title).toLowerCase();
  const slugLower = normalizeSlug(slug);
  
  // Score de correspondance exacte
  let exactMatchScore = 0;
  if (titleLower.includes(queryLower) || slugLower.includes(queryLower)) {
    exactMatchScore = 1.0;
  }
  
  // Score par tokens avec tolérance pour les caractères manquants
  let allTokensFound = true;
  let totalScore = 0;
  let matchedTokens = 0;
  
  for (const queryToken of queryTokens) {
    let tokenFound = false;
    let bestScore = 0;
    
    // Chercher dans le titre
    for (const titleToken of titleTokens) {
      // Correspondance exacte
      if (titleToken === queryToken) {
        tokenFound = true;
        bestScore = 1.0;
        break;
      }
      
      // Correspondance avec tolérance pour les accents
      const normalizedTitleToken = normalizeString(titleToken);
      if (normalizedTitleToken === queryToken) {
        tokenFound = true;
        bestScore = 0.95;
        break;
      }
      
      // Correspondance partielle (début ou fin)
      if (titleToken.startsWith(queryToken) || queryToken.startsWith(titleToken)) {
        if (titleToken.length >= queryToken.length * 0.7) {
          tokenFound = true;
          bestScore = Math.max(bestScore, 0.8);
        }
      }
      
      // Correspondance avec caractères manquants (pour les slugs tronqués)
      if (queryToken.length >= 4 && titleToken.length >= 3) {
        const similarity = calculateStringSimilarity(queryToken, titleToken);
        if (similarity >= 0.7) {
          tokenFound = true;
          bestScore = Math.max(bestScore, similarity * 0.8);
        }
      }
    }
    
    // Chercher dans le slug si pas trouvé dans le titre
    if (!tokenFound) {
      for (const slugToken of slugTokens) {
        // Correspondance exacte
        if (slugToken === queryToken) {
          tokenFound = true;
          bestScore = 0.8;
          break;
        }
        
        // Correspondance avec tolérance
        const normalizedSlugToken = normalizeString(slugToken);
        if (normalizedSlugToken === queryToken) {
          tokenFound = true;
          bestScore = 0.75;
          break;
        }
        
        // Correspondance partielle
        if (slugToken.startsWith(queryToken) || queryToken.startsWith(slugToken)) {
          if (slugToken.length >= queryToken.length * 0.7) {
            tokenFound = true;
            bestScore = Math.max(bestScore, 0.7);
          }
        }
        
        // Correspondance avec caractères manquants
        if (queryToken.length >= 4 && slugToken.length >= 3) {
          const similarity = calculateStringSimilarity(queryToken, slugToken);
          if (similarity >= 0.6) {
            tokenFound = true;
            bestScore = Math.max(bestScore, similarity * 0.7);
          }
        }
      }
    }
    
    if (tokenFound) {
      totalScore += bestScore;
      matchedTokens++;
    } else {
      allTokensFound = false;
    }
  }
  
  // Si aucun token n'est trouvé, score très bas
  if (matchedTokens === 0) {
    return 0.01;
  }
  
  // Score de base basé sur le pourcentage de tokens trouvés
  let finalScore = totalScore / queryTokens.length;
  
  // Bonus pour correspondance exacte de phrase
  if (exactMatchScore > 0) {
    finalScore = Math.max(finalScore, exactMatchScore);
  }
  
  // Bonus pour tous les tokens trouvés
  if (allTokensFound) {
    finalScore += 0.2;
  }
  
  // Bonus pour correspondance en début de titre
  if (titleLower.startsWith(queryLower)) {
    finalScore += 0.3;
  }
  
  return Math.min(1.0, finalScore);
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

const getParam = (href: string, name: string): string | null => {
  const m = href.match(new RegExp(`[?&]${name}=([^&]+)`, 'i'));
  return m ? decodeURIComponent(m[1]) : null;
};

const toAbsolute = (maybe: string | undefined): string | undefined => {
  if (!maybe) return undefined;
  if (maybe.startsWith('http')) return maybe;
  return `${baseUrl}${maybe.replace(/^\//, '')}`;
};

const scrapeSearchResults = async (url: string, type: string, query: string): Promise<SearchItem[]> => {
  try {
    Logger.debug(`Scraping ${type} from: ${url}`);
    
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
    
    const results: SearchItem[] = [];
    const seen = new Set<string>();

    // 1) Robust scan: anchors that look like content items
    $('a[href*="?p="][href*="id="]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href');
      if (!href) return;

      const pParam = getParam(href, 'p');
      if (!pParam || !isTypeMatch(pParam, type)) return;

      if (seen.has(href)) return;

      const title = $a.text().trim();
      if (!title || title.length <= 1) return;

      // try to enrich from container if present
      const $container = $a.closest('.cover_global');
      const image = toAbsolute($container.find('img.mainimg').attr('src')) || toAbsolute($a.find('img').attr('src'));
      const date = $container.find('time').first().text().trim();
      const version = $container.find('.detail_release').first().text().trim();

      const slug = extractSlugFromLink(href);
      const relevanceScore = calculateRelevanceScore(query, title, slug);

      const queryTokens = normalizeString(query).split(' ').filter(t => t.length > 0);
              const minScore = queryTokens.length >= 2 ? 0.8 : 0.95;

      if (relevanceScore >= minScore) {
        let description = '';
        if (date) description += `Publié le ${date}`;
        if (version) description += description ? ` - ${version}` : version;

        results.push({
          title,
          link: toAbsolute(href)!,
          description: description || undefined,
          image,
          relevanceScore
        });
        seen.add(href);
      }
    });

    // 2) Fallback: scan visible cover cards if no result yet
    if (results.length === 0) {
      $('.cover_global').each((_, element) => {
        const $element = $(element);
        const $link = $element.find('a[href*="?p="][href*="id="]').first();
        const link = $link.attr('href');
        const title = $link.text().trim();
        if (!link || !title) return;
        const pParam = getParam(link, 'p');
        if (!pParam || !isTypeMatch(pParam, type)) return;
        if (seen.has(link)) return;

        const image = toAbsolute($element.find('img.mainimg').attr('src')) || toAbsolute($element.find('img').attr('src'));
        const date = $element.find('time').first().text().trim();
        const version = $element.find('.detail_release').first().text().trim();

        const slug = extractSlugFromLink(link);
        const relevanceScore = calculateRelevanceScore(query, title, slug);
        const queryTokens = normalizeString(query).split(' ').filter(t => t.length > 0);
        const minScore = queryTokens.length >= 2 ? 0.8 : 0.95;
        if (relevanceScore >= minScore) {
          let description = '';
          if (date) description += `Publié le ${date}`;
          if (version) description += description ? ` - ${version}` : version;

          results.push({
            title,
            link: toAbsolute(link)!,
            description: description || undefined,
            image,
            relevanceScore
          });
          seen.add(link);
        }
      });
    }

    // Sort by relevance desc and return
    results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    Logger.debug(`Found ${results.length} relevant results for ${type}`);
    return results;
  } catch (error) {
    Logger.error(`Error scraping ${type}: ${error}`);
    return [];
  }
};

const scrapeDetails = async (link: string, type: string): Promise<{ [key: string]: any }> => {
  try {
    Logger.debug(`Scraping details from: ${link}`);
    
    const response = await fetch(link, {
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
    
    if (type === 'films') {
      // Films: language -> quality -> link
      const versions: { [key: string]: { [key: string]: { link: string } } } = {};
      
      // Films: capture current version and other versions
      const currentQuality = $('div[style*="color:red"][style*="font-weight:bold"]').text().trim();
      if (currentQuality) {
        const qualityMatch = currentQuality.match(/([A-Z0-9\-\s]+)\s*\|\s*([A-Z]+)/i);
        if (qualityMatch) {
          const quality = qualityMatch[1].trim().replace(/\s+/g, '_').toUpperCase();
          const language = qualityMatch[2].trim().toUpperCase();
          
          if (!versions[language]) {
            versions[language] = {};
          }
          
          versions[language][quality] = { link: toAbsolute(link)! } as { link: string };
        }
      }
      
      // Other versions for films
      $('.otherversions a').each((index, element) => {
        const $element = $(element);
        const link = $element.attr('href');
        const $quality = $element.find('.otherquality');
        
        if (link && $quality.length > 0) {
          const qualityText = $quality.text().replace(/\s+/g, ' ').trim();
          
          const qualityMatch = qualityText.match(/([A-Z0-9\-\s]+)\s*\(([A-Z]+)\)/i);
          if (qualityMatch) {
            const quality = qualityMatch[1].trim().replace(/\s+/g, '_').toUpperCase();
            const language = qualityMatch[2].trim().toUpperCase();
            
            if (!versions[language]) {
              versions[language] = {};
            }
            
            const fullLink = toAbsolute(link)!;
            versions[language][quality] = { link: fullLink } as { link: string };
          }
        }
      });
      
      // Extract other qualities/languages from .otherversions for films
      $('.otherversions a').each((_, el) => {
        const link = $(el).attr('href');
        if (link) {
          // Extract quality and language from the otherquality spans
          const qualitySpan = $(el).find('.otherquality span[style*="color:#FE8903"] b');
          const languageSpan = $(el).find('.otherquality span[style*="color:#03AAFE"] b');
          
          if (qualitySpan.length > 0 && languageSpan.length > 0) {
            const quality = qualitySpan.text().trim();
            const language = languageSpan.text().trim();
            
            // Normalize language names - remove parentheses and extra spaces
            let normalizedLang = language.replace(/[()]/g, '').trim();
            if (normalizedLang.includes('MULTI')) {
              // Extract the actual language from MULTI (LANG) format
              const match = normalizedLang.match(/MULTI\s*\(([^)]+)\)/i);
              if (match) {
                normalizedLang = match[1].trim();
              } else {
                normalizedLang = 'MULTI';
              }
            }
            
            // Normalize quality names - standardize format
            let normalizedQuality = quality
              .replace(/\s+/g, '_')  // Replace spaces with underscores
              .toUpperCase();        // Convert to uppercase
            
            // Check if this language already exists to avoid duplicates
            if (!versions[normalizedLang]) {
              versions[normalizedLang] = {};
            }
            
            // Check if this quality already exists for this language
            if (!versions[normalizedLang][normalizedQuality]) {
              const fullLink = toAbsolute(link)!;
              versions[normalizedLang][normalizedQuality] = { link: fullLink } as { link: string };
            }
          }
        }
      });
      
      Logger.debug(`Found ${Object.keys(versions).length} languages with ${Object.values(versions).reduce((acc, lang) => acc + Object.keys(lang).length, 0)} total qualities`);
      return versions;
    } else {
      // Series and anime: season -> { episodes, versions{ language -> quality -> { link, fileSize } } }
      const seasons: { [key: string]: { episodes?: number; versions: { [lang: string]: { [qual: string]: { link: string; fileSize?: string } } } } } = {};
      
      // Series and anime: capture seasons and qualities
      const currentSeason = extractSeasonFromLink(link);
      const currentLanguage = $('div[style*="color:red"][style*="font-weight:bold"]').text().trim();
      
      // Extract current language and quality (VOSTFR HD, VF, etc.)
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
        // Store with the actual detected quality instead of defaulting to "NORMAL"
        seasons[seasonKey].versions[currentLang][currentQuality] = { link: toAbsolute(link)! } as { link: string };
      }
      
      // Other seasons and qualities
      $('.otherversions a').each((index, element) => {
        const $element = $(element);
        const link = $element.attr('href');
        const $quality = $element.find('.otherquality');

        if (link && $quality.length > 0) {
          const qualityText = $quality.text().replace(/\s+/g, ' ').trim();
          
          // Check if it's a season link
          const seasonMatch = qualityText.match(/Saison\s*(\d+)\s*\(([A-Z\s]+)\)/i);
          if (seasonMatch) {
            const season = seasonMatch[1];
            const languageQuality = seasonMatch[2].trim();
            
            // Parse language and quality from "VF HD" or "VOSTFR HD"
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
              seasons[seasonKey].versions[language][quality] = { link: fullLink } as { link: string };
            }
          } else {
            // Check if it's a quality link for current season
            const qualityMatch = qualityText.match(/\(([A-Z\s]+)\)/i);
            if (qualityMatch && currentSeason) {
              const languageQuality = qualityMatch[1].trim();
              
              // Parse language and quality from "VF HD" or "VOSTFR HD"
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
                seasons[seasonKey].versions[language][quality] = { link: fullLink } as { link: string };
              }
            }
          }
        }
      });
      
      // Now extract episodes and fileSize for each season and each quality in parallel
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
                // Set episodes once per season (prefer highest detected)
                if (details.episodes) {
                  if (!season.episodes || details.episodes > season.episodes) {
                    season.episodes = details.episodes;
                  }
                }
                // Set file size per quality
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
      
      // Wait for all season detail extractions to complete
      await Promise.all(seasonDetailPromises);
      
      // Sort seasons by number (SAISON_1, SAISON_2, SAISON_3, etc.)
      const sortedSeasons: { [key: string]: { episodes?: number; versions: { [lang: string]: { [qual: string]: { link: string; fileSize?: string } } } } } = {};
      const seasonKeys = Object.keys(seasons).sort((a, b) => {
        const seasonA = parseInt(a.replace('SAISON_', ''), 10);
        const seasonB = parseInt(b.replace('SAISON_', ''), 10);
        return seasonA - seasonB;
      });
      
      for (const seasonKey of seasonKeys) {
        sortedSeasons[seasonKey] = seasons[seasonKey];
      }
      
      Logger.debug(`Found ${Object.keys(sortedSeasons).length} seasons with episodes and fileSize information`);
      return sortedSeasons;
    }
  } catch (error) {
    Logger.error(`Error scraping details: ${error}`);
    return {};
  }
};

const extractSynopsis = async (link: string): Promise<string | undefined> => {
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
    
    // Find synopsis after the synopsis.png image
    const synopsisImg = $('img[src*="synopsis.png"]');
    if (synopsisImg.length > 0) {
      const synopsis = synopsisImg.parent().find('em').first().text().trim();
      return synopsis || undefined;
    }
    
    return undefined;
  } catch (error) {
    Logger.error(`Error extracting synopsis: ${error}`);
    return undefined;
  }
};

// Extract season details (number of episodes and file size)
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
    
    // Extract number of episodes from text like "10 Episodes | Saison 3"
    $('div').each((_, el) => {
      const text = $(el).text().trim();
      const episodeMatch = text.match(/(\d+)\s*Episodes?\s*\|\s*Saison\s*\d+/i);
      if (episodeMatch) {
        episodes = parseInt(episodeMatch[1], 10);
      }
    });
    
    // Extract file size from text like "Taille d'un episode : ~545 Mo"
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
    
    // Fallback: count episode links if we couldn't find the episode count
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

const groupResultsByTitle = (results: SearchItem[], type: string): SearchItem[] => {
  const grouped = new Map<string, SearchItem>();

  for (const result of results) {
    let normalizedTitle: string;
    
    if (type === 'films') {
      // For films, just strip any version info
      normalizedTitle = stripSeason(result.title);
    } else {
      // For series/anime, strip season info and normalize
      normalizedTitle = stripSeason(result.title);
    }

    if (grouped.has(normalizedTitle)) {
      // If we already have a result with this title, keep the one with the best score
      const existing = grouped.get(normalizedTitle)!;
      if ((result.relevanceScore || 0) > (existing.relevanceScore || 0)) {
        grouped.set(normalizedTitle, result);
      }
    } else {
      grouped.set(normalizedTitle, result);
    }
  }

  return Array.from(grouped.values());
};

const searchFilms = async (query: string, year?: number): Promise<SearchResult> => {
  let url = `${baseUrl}?p=films&search=${encodeURIComponent(query)}`;
  if (year) {
    url += `&year=${year}`;
  }
  const results = await scrapeSearchResults(url, 'films', query);
  const groupedResults = groupResultsByTitle(results, 'films');
  const detailedResults = await Promise.all(
    groupedResults.map(async (result) => {
      try {
        const cleanTitle = stripSeason(result.title);
        
        // Parallelize all extractions for better performance
        const [details, synopsis, release_date] = await Promise.all([
          scrapeDetails(result.link!, 'films'),
          extractSynopsis(result.link!),
          extractFilmReleaseYear(result.link!)
        ]);
        
        return { 
          ...result, 
          title: cleanTitle,
          description: synopsis,
          release_date,
          details: (details && Object.keys(details as any).length > 0) ? details : undefined 
        };
      } catch (error) {
        Logger.error(`Error getting details for ${result.title}: ${error}`);
        return result;
      }
    })
  );

  return { type: 'films', results: detailedResults };
};

const searchSeries = async (query: string, year?: number): Promise<SearchResult> => {
  let url = `${baseUrl}?p=series&search=${encodeURIComponent(query)}`;
  if (year) {
    url += `&year=${year}`;
  }
  const results = await scrapeSearchResults(url, 'series', query);
  const groupedResults = groupResultsByTitle(results, 'series');
  const detailedResults = await Promise.all(
    groupedResults.map(async (result) => {
      try {
        const cleanTitle = stripSeason(result.title);
        
        // Get details first to determine season link, then parallelize other extractions
        const details = await scrapeDetails(result.link!, 'series');
        const seasonOneLink = pickSeasonOneLink(details);
        
        // Parallelize synopsis and release date extraction
        const [synopsis, release_date] = await Promise.all([
          extractSynopsis(result.link!),
          seasonOneLink ? extractReleaseDateFromDetailPage(seasonOneLink) : Promise.resolve(undefined)
        ]);
        
        return { 
          ...result, 
          title: cleanTitle,
          description: synopsis,
          release_date,
          details: (details && Object.keys(details as any).length > 0) ? details : undefined 
        };
      } catch (error) {
        Logger.error(`Error getting details for ${result.title}: ${error}`);
        return result;
      }
    })
  );

  return { type: 'series', results: detailedResults };
};

const searchMangas = async (query: string, year?: number): Promise<SearchResult> => {
  let url = `${baseUrl}?p=mangas&search=${encodeURIComponent(query)}`;
  if (year) {
    url += `&year=${year}`;
  }
  const results = await scrapeSearchResults(url, 'mangas', query);
  const groupedResults = groupResultsByTitle(results, 'mangas');
  const detailedResults = await Promise.all(
    groupedResults.map(async (result) => {
      try {
        const cleanTitle = stripSeason(result.title);
        
        // Get details first to determine season link, then parallelize other extractions
        const details = await scrapeDetails(result.link!, 'mangas');
        const seasonOneLink = pickSeasonOneLink(details);
        
        // Parallelize synopsis and release date extraction
        const [synopsis, release_date] = await Promise.all([
          extractSynopsis(result.link!),
          seasonOneLink ? extractReleaseDateFromDetailPage(seasonOneLink) : Promise.resolve(undefined)
        ]);
        
        return { 
          ...result, 
          title: cleanTitle,
          description: synopsis,
          release_date,
          details: (details && Object.keys(details as any).length > 0) ? details : undefined 
        };
      } catch (error) {
        Logger.error(`Error getting details for ${result.title}: ${error}`);
        return result;
      }
    })
  );

  return { type: 'mangas', results: detailedResults };
};

// Extract total number of pages from pagination
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
    
    // Find pagination container
    const $navigation = $('.navigation[align="center"]');
    if ($navigation.length === 0) {
      Logger.debug('No pagination found, assuming single page');
      return 1;
    }

    let maxPage = 1;
    
    // Extract page numbers from all links in pagination
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

    // Also check span elements (current page might be in a span)
    $navigation.find('span[href*="page="]').each((_, el) => {
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
    return 1; // Fallback to single page
  }
};

// Get page count for all content types in parallel
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

const searchAll = async (query: string, year?: number): Promise<SearchResult[]> => {
  Logger.info(`Starting search for: "${query}"${year ? ` (year: ${year})` : ''}`);
  try {
    const results = await Promise.all([
      searchFilms(query, year),
      searchSeries(query, year),
      searchMangas(query, year)
    ]);
    Logger.success(`Search completed for: "${query}"${year ? ` (year: ${year})` : ''}`);
    return results;
  } catch (error) {
    Logger.error(`Error during search: ${error}`);
    throw error;
  }
};

// Helper to fetch HTML text with common headers
const fetchPageHtml = async (url: string): Promise<string> => {
	const response = await fetch(url, {
		headers: {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
			'Referer': baseUrl
		}
	});
	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
	return await response.text();
};

// Extract year for films from "Année de production"
const extractFilmReleaseYear = async (link: string): Promise<string | undefined> => {
	try {
		const html = await fetchPageHtml(link);
		const $ = cheerio.load(html);
		// Try to directly find the label
		let year: string | undefined;
		$('strong').each((_, el) => {
			const text = $(el).text().trim().toLowerCase();
			if (text.includes('année de production')) {
				const parentHtml = $(el).parent().html() || '';
				const match = parentHtml.match(/Année de production\s*:<\/strong>\s*([^<]+)/i);
				if (match) {
					year = match[1].trim();
				}
			}
		});
		// Fallback: search anywhere
		if (!year) {
			const whole = $.root().text();
			const m = whole.match(/Année de production\s*:\s*(\d{4})/i);
			if (m) year = m[1];
		}
		return year;
	} catch (e) {
		Logger.error(`extractFilmReleaseYear error: ${e}`);
		return undefined;
	}
};

// Extract year of production from a series/season detail page
const extractReleaseDateFromDetailPage = async (link: string): Promise<string | undefined> => {
	try {
		const html = await fetchPageHtml(link);
		const $ = cheerio.load(html);
		
		// Look for "Année de production" specifically
		let year: string | undefined;
		$('strong').each((_, el) => {
			const text = $(el).text().trim();
			if (text.includes('Année de production')) {
				// Get the text after the strong tag
				const nextText = $(el).parent().text().trim();
				const match = nextText.match(/Année de production\s*:\s*(\d{4})/i);
				if (match) {
					year = match[1];
				}
			}
		});
		
		// Fallback: search in the entire page content
		if (!year) {
			const wholeText = $.root().text();
			const match = wholeText.match(/Année de production\s*:\s*(\d{4})/i);
			if (match) {
				year = match[1];
			}
		}
		
		return year;
	} catch (e) {
		Logger.error(`extractReleaseDateFromDetailPage error: ${e}`);
		return undefined;
	}
};

// Pick a link from season 1 (or lowest season) to extract release date (supports new seasons.versions structure)
const pickSeasonOneLink = (details: any): string | undefined => {
	if (!details || typeof details !== 'object') return undefined;
	let seasonKeys = Object.keys(details).filter(k => /^SAISON_\d+$/i.test(k));
	if (seasonKeys.length === 0) return undefined;
	seasonKeys.sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10));
	const seasonKey = seasonKeys[0];
	const season = details[seasonKey];
	if (!season) return undefined;
	const versions = season.versions || season; // backward compatibility
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

export default { searchAll, searchFilms, searchSeries, searchMangas, getPageCounts };