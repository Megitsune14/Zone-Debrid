interface MediaPathInput {
  /** Chemin de base (utilisé si pathFilms/pathSeries non renseignés) */
  basePath: string
  type: 'films' | 'series' | 'mangas'
  title: string
  year?: number | string
  season?: number | string
  episodeNumber?: number | string
  originalFilename?: string
  /** Chemin de téléchargement pour les films (ex. /media/films). Prioritaire sur basePath. */
  pathFilms?: string
  /** Chemin de téléchargement pour les séries (ex. /media/series). Prioritaire sur basePath. */
  pathSeries?: string
  /** Chemin de téléchargement pour les animes (ex. /media/animes). Prioritaire sur basePath. */
  pathAnimes?: string
  /** Modèle du dossier de saison : {season} est remplacé par le numéro (ex. Saison {season} → Saison 01). */
  pathSeriesSeason?: string
}

interface MediaPathResult {
  dir: string
  out: string
}

const sanitizeSegment = (value: string): string => {
  return value
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const normalizeBasePath = (basePath: string): string => {
  const trimmed = basePath.trim()
  if (!trimmed) return '/media'
  return trimmed.replace(/[\\/]+$/, '')
}

const parseIntSafe = (value?: number | string): number | undefined => {
  if (value === undefined) return undefined
  const n = typeof value === 'number' ? value : parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const extractSeasonEpisodeFromFilename = (filename?: string): { season?: number; episode?: number } => {
  if (!filename) return {}
  const sxeMatch = filename.match(/S(\d{1,2})E(\d{1,3})/i)
  if (sxeMatch) {
    const season = parseInt(sxeMatch[1], 10)
    const episode = parseInt(sxeMatch[2], 10)
    return {
      season: Number.isFinite(season) ? season : undefined,
      episode: Number.isFinite(episode) ? episode : undefined
    }
  }

  const seMatch = filename.match(/Saison\s+(\d+)\D+Episode\s+(\d+)/i)
  if (seMatch) {
    const season = parseInt(seMatch[1], 10)
    const episode = parseInt(seMatch[2], 10)
    return {
      season: Number.isFinite(season) ? season : undefined,
      episode: Number.isFinite(episode) ? episode : undefined
    }
  }

  return {}
}

export function buildMediaPath(input: MediaPathInput): MediaPathResult {
  const base = normalizeBasePath(input.basePath)
  const safeTitle = sanitizeSegment(input.title)

  const yearNumber = typeof input.year === 'string'
    ? parseInt(input.year, 10)
    : input.year
  const yearSuffix = Number.isFinite(yearNumber as number)
    ? ` (${yearNumber})`
    : ''

  if (input.type === 'films') {
    const filmsBase = input.pathFilms?.trim()
      ? normalizeBasePath(input.pathFilms)
      : `${base}/films`
    const dir = `${filmsBase}/${safeTitle}${yearSuffix}`
    const out = `${safeTitle}${yearSuffix}.mkv`
    return { dir, out }
  }

  const fromFilename = extractSeasonEpisodeFromFilename(input.originalFilename)
  const seasonNumber =
    parseIntSafe(input.season) ??
    fromFilename.season ??
    1
  const episodeNumber =
    parseIntSafe(input.episodeNumber) ??
    fromFilename.episode ??
    1

  const paddedSeason = String(seasonNumber).padStart(2, '0')
  const seasonLabel = input.pathSeriesSeason?.trim()
    ? input.pathSeriesSeason.replace(/\{season\}/gi, paddedSeason)
    : `Saison ${paddedSeason}`
  const sCode = `S${paddedSeason}E${String(episodeNumber).padStart(2, '0')}`

  const isMangas = input.type === 'mangas'
  const seriesBase = isMangas
    ? (input.pathAnimes?.trim() ? normalizeBasePath(input.pathAnimes) : `${base}/animes`)
    : (input.pathSeries?.trim() ? normalizeBasePath(input.pathSeries) : `${base}/series`)
  const dir = `${seriesBase}/${safeTitle}${yearSuffix}/${seasonLabel}`
  const out = `${safeTitle} - ${sCode}.mkv`

  return { dir, out }
}

