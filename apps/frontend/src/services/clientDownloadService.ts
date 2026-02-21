/**
 * Service de téléchargement côté client (V2).
 * Téléchargement natif navigateur via URL signée ; pas de fetch/stream/Blob côté client.
 * Support HTTP Range conservé côté backend. Fichiers 50 Go+ supportés.
 */

import { API_CONFIG } from '../config/api'

export interface DownloadFileItem {
  url: string
  filename: string
  fileSize?: number
}

const sanitizeFilename = (s: string) =>
  s.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()

export function formatFilmFilename(title: string, language: string, quality: string): string {
  return `${sanitizeFilename(title)} - ${language} - ${quality}.mkv`
}

export function formatSingleEpisodeFilename(
  title: string,
  season: string,
  episodeNumber: string,
  language: string,
  quality: string
): string {
  return `${sanitizeFilename(title)} - Saison ${season} - Episode ${episodeNumber} - ${language} - ${quality}.mkv`
}

/**
 * Nom de ZIP intelligent : titre_saison.zip (séries/mangas) ou titre.zip (films)
 */
export function buildZipFilename(
  title: string,
  type: 'films' | 'series' | 'mangas',
  season?: string
): string {
  const base = sanitizeFilename(title)
  if ((type === 'series' || type === 'mangas') && season) {
    const s = String(season).replace(/\D/g, '') || '1'
    return `${base}_S${s.padStart(2, '0')}.zip`
  }
  return `${base}.zip`
}

/**
 * URL du proxy legacy (auth par header). Conservé pour compatibilité.
 */
export function getProxyDownloadUrl(url: string, filename: string): string {
  const params = new URLSearchParams()
  params.set('url', url)
  params.set('filename', filename)
  return `${API_CONFIG.DOWNLOADS_URL}/proxy?${params.toString()}`
}

/**
 * Lance un téléchargement natif en redirigeant vers l'URL signée (pas de buffering mémoire).
 */
export function startNativeDownload(downloadUrl: string): void {
  window.location.href = downloadUrl
}

export interface ZipFileItem {
  url: string
  filename: string
  fileSize?: number
}

const ClientDownloadService = {
  getProxyDownloadUrl,
  startNativeDownload,
  buildZipFilename,
  formatFilmFilename,
  formatSingleEpisodeFilename
}

export default ClientDownloadService
